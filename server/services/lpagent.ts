/**
 * LP Agent API client.
 * Set USE_MOCK=false and provide LPAGENT_API_KEY to use the real API.
 */

import * as mock from './mock.js';

// Lazy getter — reads process.env at call time, NOT at module-load time.
// In ESM, module-level code runs before the entry-point body (incl. dotenv.config()),
// so a module-level const would always capture undefined → true (mock mode).
const useMock = () => process.env.USE_MOCK !== 'false';
const BASE_URL = 'https://api.lpagent.io/open-api/v1';

async function lpRequest<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.LPAGENT_API_KEY ?? '',
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`LP Agent API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ─── Pools ────────────────────────────────────────────────────────────────────

export async function discoverPools(params: {
  chain?: string;
  sortBy?: string;
  sortOrder?: string;
  pageSize?: string | number;
  tokenPair?: string;
  min_tvl?: number;
  min_liquidity?: number;
}) {
  if (useMock()) {
    let pools = [...mock.MOCK_POOLS];
    if (params.tokenPair) {
      const pair = params.tokenPair.toUpperCase();
      pools = pools.filter(
        (p) =>
          p.name.toUpperCase().includes(pair) ||
          p.tokenX.symbol.toUpperCase().includes(pair) ||
          p.tokenY.symbol.toUpperCase().includes(pair)
      );
    }
    if (params.sortBy === 'apr') {
      pools.sort((a, b) => b.apr - a.apr);
    } else if (params.sortBy === 'tvl') {
      pools.sort((a, b) => b.tvl - a.tvl);
    } else {
      pools.sort((a, b) => b.volume24h - a.volume24h);
    }
    const size = Number(params.pageSize ?? 10);
    return { data: pools.slice(0, size) };
  }
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries({ chain: 'SOL', ...params }).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    )
  ).toString();
  return lpRequest<{ data: unknown[] }>(`/pools/discover?${qs}`);
}

export async function getPoolInfo(poolId: string) {
  if (useMock()) {
    const info =
      mock.MOCK_POOL_INFO[poolId] ??
      // Fallback for unknown poolIds in demo mode
      {
        ...mock.MOCK_POOLS[0],
        address: poolId,
        activeBin: 8388,
        currentPrice: 174.5,
        liquidityViz: {
          activeBin: { binId: 8388, price: 174.5 },
          bins: [],
        },
      };
    return { data: info };
  }
  return lpRequest<{ data: unknown }>(`/pools/${poolId}/info`);
}

export async function getPoolStats(poolId: string) {
  if (useMock()) {
    return {
      data: {
        poolAddress: poolId,
        positionCount: 142,
        uniqueUsers: 89,
        totalInputValueUSD: 1_200_000,
      },
    };
  }
  return lpRequest<{ data: unknown }>(`/pools/${poolId}/onchain-stats`);
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function getOpenPositions(owner: string) {
  if (useMock()) {
    return { data: mock.MOCK_POSITIONS };
  }
  const url = `/lp-positions/opening?owner=${owner}`;
  console.log(`[lpagent] GET ${BASE_URL}${url}`);
  const result = await lpRequest<unknown>(url);
  console.log(`[lpagent] opening response:`, JSON.stringify(result).slice(0, 300));
  return result;
}

export async function getPortfolioOverview(owner: string) {
  if (useMock()) {
    return { data: mock.MOCK_OVERVIEW };
  }
  const url = `/lp-positions/overview?owner=${owner}`;
  console.log(`[lpagent] GET ${BASE_URL}${url}`);
  const result = await lpRequest<unknown>(url);
  console.log(`[lpagent] overview response:`, JSON.stringify(result).slice(0, 300));
  return result;
}

export async function getHistoricalPositions(owner: string) {
  if (useMock()) {
    return { data: mock.MOCK_HISTORY };
  }
  const url = `/lp-positions/historical?owner=${owner}`;
  console.log(`[lpagent] GET ${BASE_URL}${url}`);
  const result = await lpRequest<unknown>(url);
  console.log(`[lpagent] historical response:`, JSON.stringify(result).slice(0, 300));
  return result;
}

export async function getRevenue(owner: string) {
  if (useMock()) {
    return {
      data: {
        fees7d: 22.4,
        fees30d: 76.1,
        pnl7d: 34.5,
        pnl30d: 101.1,
      },
    };
  }
  return lpRequest<{ data: unknown }>(`/lp-positions/revenue/${owner}`);
}

export async function getWalletBalances(owner: string) {
  if (useMock()) {
    return {
      data: [
        { symbol: 'SOL', amount: 4.2, valueUSD: 733.5 },
        { symbol: 'USDC', amount: 215.0, valueUSD: 215.0 },
        { symbol: 'WIF', amount: 850, valueUSD: 297.5 },
      ],
    };
  }
  return lpRequest<{ data: unknown[] }>(`/token/balance?owner=${owner}`);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function generateZapInTx(body: {
  stratergy: string; // NOTE: intentional API typo
  inputSOL: number;
  percentX: number;
  fromBinId: number;
  toBinId: number;
  owner: string;
  slippage_bps?: number;
  mode?: string;
}) {
  if (useMock()) {
    return {
      data: {
        ...mock.MOCK_ZAP_IN_TX,
        meta: {
          ...mock.MOCK_ZAP_IN_TX.meta,
          positionPubKey: 'MockPos' + Math.random().toString(36).slice(2, 10).toUpperCase(),
          inputSOL: body.inputSOL,
          stratergy: body.stratergy,
        },
        lastValidBlockHeight: 280_000_000 + Math.floor(Math.random() * 1000),
      },
    };
  }
  // Placeholder for real poolId — in real usage, poolId comes from the calling route
  throw new Error('Real API not yet wired for generateZapInTx');
}

export async function generateZapInTxForPool(
  poolId: string,
  body: Parameters<typeof generateZapInTx>[0]
) {
  if (useMock()) {
    return {
      data: {
        ...mock.MOCK_ZAP_IN_TX,
        meta: {
          ...mock.MOCK_ZAP_IN_TX.meta,
          positionPubKey: 'MockPos' + Math.random().toString(36).slice(2, 10).toUpperCase(),
          poolAddress: poolId,
          inputSOL: body.inputSOL,
          stratergy: body.stratergy,
        },
        lastValidBlockHeight: 280_000_000 + Math.floor(Math.random() * 1000),
      },
    };
  }
  return lpRequest<{ data: unknown }>(`/pools/${poolId}/add-tx`, {
    method: 'POST',
    body: JSON.stringify({ ...body, mode: body.mode ?? 'zap-in' }),
  });
}

export async function submitZapIn(body: {
  lastValidBlockHeight: number;
  swapTxsWithJito: string[];
  addLiquidityTxsWithJito: string[];
  meta: Record<string, unknown>;
}) {
  if (useMock()) {
    await new Promise((r) => setTimeout(r, 1500)); // Simulate Jito submission
    return {
      data: {
        signature: 'MockSig' + Math.random().toString(36).slice(2, 18).toUpperCase(),
        solscan: 'https://solscan.io/tx/mock',
      },
    };
  }
  return lpRequest<{ data: unknown }>('/pools/landing-add-tx', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getZapOutQuotes(body: {
  positionAddress: string;
  owner: string;
  bps: number;
  outputType: string;
}) {
  if (useMock()) {
    return { data: mock.MOCK_ZAP_OUT_QUOTE };
  }
  return lpRequest<{ data: unknown }>('/position/decrease-quotes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function generateZapOutTx(body: {
  positionAddress: string;
  owner: string;
  bps: number;
  outputType: string;
}) {
  if (useMock()) {
    return {
      data: {
        ...mock.MOCK_ZAP_OUT_TX,
        lastValidBlockHeight: 280_000_000 + Math.floor(Math.random() * 1000),
      },
    };
  }
  return lpRequest<{ data: unknown }>('/position/decrease-tx', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function submitZapOut(body: {
  lastValidBlockHeight: number;
  txsWithJito: string[];
  meta: Record<string, unknown>;
}) {
  if (useMock()) {
    await new Promise((r) => setTimeout(r, 1500));
    return {
      data: {
        signature: 'MockSig' + Math.random().toString(36).slice(2, 18).toUpperCase(),
        solscan: 'https://solscan.io/tx/mock',
      },
    };
  }
  return lpRequest<{ data: unknown }>('/position/landing-decrease-tx', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
