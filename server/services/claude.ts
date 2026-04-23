import Groq from 'groq-sdk';
import * as lp from './lpagent.js';

const MODEL = 'llama-3.1-8b-instant';

// Lazy client — created on first call so dotenv has already populated process.env.
let _groqClient: Groq | null = null;

function getClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY is not set. Add it to your .env file.');
  }
  if (!_groqClient) {
    _groqClient = new Groq({ apiKey: key });
    console.log(`  [groq] client initialised with key ${key.slice(0, 10)}…`);
  }
  return _groqClient;
}

const SYSTEM_PROMPT = `You are LP Advisor, an expert AI assistant for Meteora DLMM and DAMM V2 liquidity providers on Solana.

Your role:
- Help users find optimal liquidity pools based on their investment goals and risk tolerance
- Analyze existing LP positions and provide plain-English portfolio health reports
- Recommend specific strategies and price ranges
- Explain complex DeFi concepts simply and actionably

STRATEGY GUIDE:
- Spot: Uniform distribution, best for stable pairs (USDC/USDT) or when you want steady fee collection without active management
- Curve: Concentrated around the current price, best for range-bound assets. Higher fees but more IL risk
- BidAsk: Two-sided liquidity, wider range, best for volatile assets (meme coins). Captures big moves at the cost of lower capital efficiency

WHEN RECOMMENDING A POOL:
1. Pick the best match from the POOLS data provided below
2. Use the pool's activeBin and binStep to calculate the range: fromBinId = activeBin - 34, toBinId = activeBin + 34 (use ±70 for BidAsk)
3. State: pool name, TVL, APR, fee rate, recommended strategy, exact fromBinId/toBinId, and why
4. End with "Shall I proceed with this recommendation?"

WHEN ANALYZING A PORTFOLIO:
1. Use the POSITIONS and OVERVIEW data provided below
2. Highlight out-of-range positions urgently — they collect zero fees
3. Give specific dollar amounts for P&L and fees earned

RESPONSE STYLE:
- Concise but complete. Use markdown for structure.
- Always cite specific numbers (APR%, TVL in $M, fee %, bin IDs)
- Flag out-of-range positions prominently

Remember: percentX of 0.5 means 50/50 split. slippage_bps of 500 = 5% slippage.`;

// Regex for a Solana base58 public key (32–44 chars, no 0/O/I/l)
const WALLET_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

// Keywords that suggest the user wants pool recommendations shown as cards
const POOL_QUERY_RE = /pool|lp\b|liquidity|invest|add|deposit|stake|yield|apr|farm|sol|usdc|usdt|jup|bonk|wif|meme/i;

export interface AdvisorResult {
  text: string;
  toolData: {
    pools?: unknown[];
    positions?: unknown[];
    overview?: unknown;
  };
}

export async function runAdvisor(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AdvisorResult> {
  const client = getClient();

  // ── 1. Pre-fetch pool data ────────────────────────────────────────────────
  const poolsRes = await lp.discoverPools({ sortBy: 'vol_24h', sortOrder: 'desc', pageSize: 10 });
  const pools = (poolsRes as { data?: unknown[] }).data ?? [];

  // Enrich each pool with activeBin + currentPrice from pool info
  const richPools = await Promise.all(
    (pools as Array<{ address: string }>).map(async (pool) => {
      const infoRes = await lp.getPoolInfo(pool.address);
      const info = (infoRes as { data?: Record<string, unknown> }).data ?? {};
      return { ...pool, activeBin: info.activeBin, currentPrice: info.currentPrice };
    })
  );

  // ── 2. Detect wallet address anywhere in the conversation ─────────────────
  const allText = messages.map((m) => m.content).join(' ');
  const walletMatches = allText.match(WALLET_RE) ?? [];
  // Take the longest match (full public keys are 44 chars; filter out short words)
  const wallet = walletMatches.find((m) => m.length >= 32) ?? null;

  // ── 3. Pre-fetch position data if a wallet was found ─────────────────────
  let positions: unknown[] = [];
  let overview: unknown = null;
  if (wallet) {
    const [posRes, ovRes] = await Promise.all([
      lp.getOpenPositions(wallet),
      lp.getPortfolioOverview(wallet),
    ]);
    positions = (posRes as { data?: unknown[] }).data ?? [];
    overview = (ovRes as { data?: unknown }).data ?? null;
  }

  // ── 4. Build context-injected system prompt ───────────────────────────────
  const systemWithContext = buildSystemPrompt(richPools, wallet, positions, overview);

  // ── 5. Single LLM call — no tools, no retry loop ─────────────────────────
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemWithContext },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  const text = response.choices[0].message.content ?? '';

  // ── 6. Attach pool cards only when the query is pool-related ──────────────
  const lastUserMsg = messages.findLast((m) => m.role === 'user')?.content ?? '';
  const showPools = POOL_QUERY_RE.test(lastUserMsg);

  return {
    text,
    toolData: {
      ...(showPools && { pools: richPools }),
      ...(positions.length > 0 && { positions }),
      ...(overview && { overview }),
    },
  };
}

type PoolRaw = Record<string, unknown>;

function slimPool(pool: PoolRaw) {
  return {
    id: pool.id ?? pool.address,
    pairName: pool.pairName ?? pool.name,
    apr: pool.apr,
    tvl: pool.tvl,
    volume24h: pool.volume24h,
    strategy: pool.strategy,
    activeBin: pool.activeBin,
    binStep: pool.binStep,
  };
}

function buildSystemPrompt(
  pools: unknown[],
  wallet: string | null,
  positions: unknown[],
  overview: unknown
): string {
  const lines: string[] = [SYSTEM_PROMPT, '', '---', 'Here is the current live data you have access to:', ''];

  const top5 = [...(pools as PoolRaw[])]
    .sort((a, b) => ((b.apr as number) ?? 0) - ((a.apr as number) ?? 0))
    .slice(0, 5)
    .map(slimPool);

  lines.push(`POOLS (top 5 by APR):`);
  lines.push(JSON.stringify(top5, null, 2));

  if (wallet) {
    lines.push('', `WALLET: ${wallet}`);
    if (positions.length > 0) {
      lines.push('', `OPEN POSITIONS (${positions.length}):`);
      lines.push(JSON.stringify(positions, null, 2));
    } else {
      lines.push('', 'OPEN POSITIONS: None found for this wallet.');
    }
    if (overview) {
      lines.push('', 'PORTFOLIO OVERVIEW:');
      lines.push(JSON.stringify(overview, null, 2));
    }
  } else {
    lines.push('', 'POSITIONS: No wallet address detected in this conversation. If the user provides one, positions will appear here.');
  }

  lines.push('', '---');
  lines.push('Use the activeBin and binStep values above to give exact fromBinId/toBinId in every liquidity recommendation.');

  return lines.join('\n');
}
