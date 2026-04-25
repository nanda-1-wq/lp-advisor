import Groq from 'groq-sdk';
import * as lp from './lpagent.js';

const MODEL = 'llama-3.3-70b-versatile';

// Lazy client — created on first call so dotenv has already populated process.env.
let _groqClient: Groq | null = null;

function getClient(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error('GROQ_API_KEY is not set. Add it to your .env file.');
  }
  if (!_groqClient) {
    _groqClient = new Groq({ apiKey: key });
    console.log(`  [groq] client initialised`);
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

Remember: percentX of 0.5 means 50/50 split. slippage_bps of 500 = 5% slippage.

IMPORTANT: Only mention specific pool data (APR, TVL, pool names) when the user explicitly asks about pools, liquidity, or LP strategies. For general crypto questions, answer generally without listing pool data. Never volunteer pool recommendations unless asked.`;

// Regex for a Solana base58 public key (32–44 chars, no 0/O/I/l)
const WALLET_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

// Keywords that trigger pool cards — "invest" alone does NOT qualify
const POOL_QUERY_RE = /\bpool\b|\blp\b|liquidity|zap|add liquidity|invest in pool|deposit|highest apr|top pools|best pools|find me|recommend|which pool/i;

// Known pool names — if the AI response mentions any of these, show pool cards
const KNOWN_POOL_NAMES = ['BONK-SOL', 'WIF-USDC', 'SOL-USDC', 'SOL-USDT', 'USDC-USDT', 'JUP-USDC'];

// Normalize pool name for comparison: "BONK/SOL" or "bonk-sol" → "BONK-SOL"
function normalizeName(n: string): string {
  return n.toUpperCase().replace('/', '-');
}

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
  const poolsRes = await lp.discoverPools({ sortBy: 'vol_24h', sortOrder: 'desc', pageSize: 5 });
  // Real API may return { data: [...] } or just [...] — normalise to array
  const poolsRaw = poolsRes as unknown;
  const pools: unknown[] = Array.isArray(poolsRaw)
    ? poolsRaw
    : Array.isArray((poolsRaw as Record<string, unknown>)?.data)
      ? ((poolsRaw as Record<string, unknown>).data as unknown[])
      : [];

  // Enrich each pool with activeBin + currentPrice from pool info.
  // Guard against: missing address field, API 500s for unknown IDs.
  const richPools = await Promise.all(
    (pools as Array<Record<string, unknown>>).map(async (pool) => {
      // Real API may use 'address', 'poolAddress', or 'id'
      const poolAddr = (pool.address ?? pool.poolAddress ?? pool.id) as string | undefined;
      if (!poolAddr) return pool; // no address — skip enrichment
      try {
        const infoRes = await lp.getPoolInfo(poolAddr);
        const info = ((infoRes as Record<string, unknown>)?.data ?? infoRes) as Record<string, unknown>;
        return { ...pool, activeBin: info.activeBin, currentPrice: info.currentPrice };
      } catch (err) {
        console.warn(`[claude] getPoolInfo(${poolAddr}) failed — using base pool data:`, (err as Error).message);
        return pool; // enrichment failed; keep base pool data, don't crash
      }
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
  const queryWantsPool = POOL_QUERY_RE.test(lastUserMsg);

  // Which known pool names appear in the AI response text?
  const mentionedNames = KNOWN_POOL_NAMES.filter((name) =>
    text.toUpperCase().includes(name.toUpperCase())
  );

  const showPools = queryWantsPool || mentionedNames.length > 0;

  // Prefer the specific pools the AI actually mentioned; fall back to top 3 by APR
  let poolsToReturn: unknown[] = [];
  if (showPools) {
    if (mentionedNames.length > 0) {
      poolsToReturn = (richPools as PoolRaw[]).filter((pool) => {
        const poolName = normalizeName((pool.pairName ?? pool.name ?? '') as string);
        return mentionedNames.some((mn) => poolName.includes(mn));
      });
    }
    // Fall back to top 3 by APR when no specific match is found
    if (poolsToReturn.length === 0) {
      poolsToReturn = [...(richPools as PoolRaw[])]
        .sort((a, b) => ((b.apr as number) ?? 0) - ((a.apr as number) ?? 0))
        .slice(0, 3);
    }
  }

  return {
    text,
    toolData: {
      ...(showPools && { pools: poolsToReturn }),
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
    binStep: pool.binStep,
    activeBin: pool.activeBin,
    protocol: pool.protocol,
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
