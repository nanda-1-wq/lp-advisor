import Anthropic from '@anthropic-ai/sdk';
import * as lp from './lpagent.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

WHEN ADDING LIQUIDITY:
1. Call discover_pools to find matching pools for the user's token pair preference
2. For the top result, call get_pool_info to get the active bin (current price)
3. Calculate a range: ±34 bins for Spot/Curve, ±70 bins for BidAsk (from the active bin)
4. Present: pool name, TVL, APR, fee rate, your recommended strategy + range, and clear rationale
5. End with "Shall I proceed with this recommendation?"

WHEN ANALYZING PORTFOLIO:
1. Call get_positions with the wallet address
2. Call get_portfolio_overview for totals
3. Highlight: out-of-range positions (urgent — collecting zero fees), best/worst performers, total fees earned
4. Be specific with dollar amounts

RESPONSE STYLE:
- Concise but complete. Use markdown for structure where helpful.
- Always include specific numbers (APR%, TVL in $M, fee %)
- Flag out-of-range positions prominently — they're costing the user money
- When recommending a pool, always state WHY it's the best choice

Remember: percentX of 0.5 means 50% SOL / 50% USDC in the zap-in. slippage_bps of 500 = 5%.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'discover_pools',
    description:
      'Find Meteora liquidity pools filtered by token pair, TVL, and volume. Use this to find pools matching the user\'s desired token pair or risk profile.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tokenPair: {
          type: 'string',
          description: 'Token pair to search for, e.g. "SOL-USDC", "SOL", "USDC". Optional.',
        },
        sortBy: {
          type: 'string',
          enum: ['vol_24h', 'tvl', 'apr'],
          description: 'Sort pools by this metric. Default: vol_24h',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort direction. Default: desc',
        },
        pageSize: {
          type: 'number',
          description: 'Number of pools to return (max 20). Default: 5',
        },
      },
    },
  },
  {
    name: 'get_pool_info',
    description:
      'Get detailed info for a specific pool including the active bin (current price point). Required before generating a liquidity range recommendation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        poolId: {
          type: 'string',
          description: 'The pool address (from discover_pools results)',
        },
      },
      required: ['poolId'],
    },
  },
  {
    name: 'get_positions',
    description: "Fetch all currently open LP positions for a wallet address.",
    input_schema: {
      type: 'object' as const,
      properties: {
        owner: {
          type: 'string',
          description: 'Solana wallet address (base58)',
        },
      },
      required: ['owner'],
    },
  },
  {
    name: 'get_portfolio_overview',
    description:
      'Get aggregate portfolio metrics for a wallet: total value, total P&L, total fees earned, position count.',
    input_schema: {
      type: 'object' as const,
      properties: {
        owner: {
          type: 'string',
          description: 'Solana wallet address (base58)',
        },
      },
      required: ['owner'],
    },
  },
];

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
  const result: AdvisorResult = { text: '', toolData: {} };

  let currentMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Agentic loop — keeps going until Claude returns end_turn
  for (let iterations = 0; iterations < 8; iterations++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: currentMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(
        (b): b is Anthropic.TextBlock => b.type === 'text'
      );
      result.text = textBlock?.text ?? '';
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );

      // Run all tool calls in parallel
      const toolResults = await Promise.all(
        toolUses.map(async (tu) => {
          const content = await processToolCall(
            tu.name,
            tu.input as Record<string, unknown>,
            result
          );
          return {
            type: 'tool_result' as const,
            tool_use_id: tu.id,
            content: JSON.stringify(content),
          };
        })
      );

      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, content: response.content },
        { role: 'user' as const, content: toolResults },
      ];
      continue;
    }

    // Unexpected stop reason
    break;
  }

  return result;
}

async function processToolCall(
  name: string,
  input: Record<string, unknown>,
  result: AdvisorResult
): Promise<unknown> {
  switch (name) {
    case 'discover_pools': {
      const res = await lp.discoverPools(input as Parameters<typeof lp.discoverPools>[0]);
      const pools = (res as { data?: unknown[] }).data ?? [];
      result.toolData.pools = pools;
      return res;
    }
    case 'get_pool_info': {
      const res = await lp.getPoolInfo(input.poolId as string);
      return res;
    }
    case 'get_positions': {
      const res = await lp.getOpenPositions(input.owner as string);
      const positions = (res as { data?: unknown[] }).data ?? [];
      result.toolData.positions = positions;
      return res;
    }
    case 'get_portfolio_overview': {
      const res = await lp.getPortfolioOverview(input.owner as string);
      result.toolData.overview = (res as { data?: unknown }).data;
      return res;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
