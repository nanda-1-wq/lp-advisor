import type { Pool, PoolInfo, Position, HistoricalPosition, PortfolioOverview } from '../../src/lib/types.js';

// ─── Pools ────────────────────────────────────────────────────────────────────

export const MOCK_POOLS: Pool[] = [
  {
    address: 'FoSDw2L5DmTuQTFe55gWPDXf88euaxAEKFre74CnvQbX',
    name: 'SOL-USDC',
    tokenX: { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
    tokenY: { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    tvl: 8_500_000,
    volume24h: 3_200_000,
    feeRate: 0.0025,
    binStep: 10,
    apr: 42.5,
    protocol: 'DLMM',
  },
  {
    address: '2sf5NYcGSBW7ScNwJa2rSBG9JcNwHn24K3N8VAQzAa4z',
    name: 'SOL-USDT',
    tokenX: { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
    tokenY: { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
    tvl: 4_200_000,
    volume24h: 1_800_000,
    feeRate: 0.002,
    binStep: 5,
    apr: 38.2,
    protocol: 'DLMM',
  },
  {
    address: '7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcV3FPDAI8KAXKF',
    name: 'JUP-USDC',
    tokenX: { symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VutC452mimCqMWgC5tsA', decimals: 6 },
    tokenY: { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    tvl: 2_100_000,
    volume24h: 950_000,
    feeRate: 0.003,
    binStep: 20,
    apr: 65.8,
    protocol: 'DLMM',
  },
  {
    address: '3AMhFKqHVxSJMpzPNFWRVoiKCcmEfqPTEhRKFvU9MbJF',
    name: 'BONK-SOL',
    tokenX: { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 },
    tokenY: { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
    tvl: 1_800_000,
    volume24h: 2_400_000,
    feeRate: 0.005,
    binStep: 80,
    apr: 112.3,
    protocol: 'DLMM',
  },
  {
    address: '5BtRAQvXCbqmFjbJG9YqJn6gFuN6Hk7H1B4q2xQ4jKH',
    name: 'WIF-USDC',
    tokenX: { symbol: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', decimals: 6 },
    tokenY: { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    tvl: 3_400_000,
    volume24h: 4_100_000,
    feeRate: 0.004,
    binStep: 100,
    apr: 98.7,
    protocol: 'DLMM',
  },
  {
    address: 'HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ',
    name: 'USDC-USDT',
    tokenX: { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    tokenY: { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
    tvl: 12_000_000,
    volume24h: 8_500_000,
    feeRate: 0.0001,
    binStep: 1,
    apr: 22.1,
    protocol: 'DAMM V2',
  },
];

// ─── Pool Info ────────────────────────────────────────────────────────────────

export const MOCK_POOL_INFO: Record<string, PoolInfo> = {
  // SOL-USDC  (binStep 10 → each bin ≈ 0.1% price move)
  'FoSDw2L5DmTuQTFe55gWPDXf88euaxAEKFre74CnvQbX': {
    ...MOCK_POOLS[0],
    activeBin: 8388,
    currentPrice: 174.50,
    liquidityViz: {
      activeBin: { binId: 8388, price: 174.50 },
      bins: Array.from({ length: 60 }, (_, i) => ({
        binId: 8360 + i,
        liquidity: i >= 20 && i <= 40 ? 1_000_000 + Math.random() * 500_000 : 200_000 + Math.random() * 100_000,
      })),
    },
  },
  // SOL-USDT  (binStep 5 → tighter range than SOL-USDC)
  '2sf5NYcGSBW7ScNwJa2rSBG9JcNwHn24K3N8VAQzAa4z': {
    ...MOCK_POOLS[1],
    activeBin: 8390,
    currentPrice: 173.80,
    liquidityViz: {
      activeBin: { binId: 8390, price: 173.80 },
      bins: Array.from({ length: 60 }, (_, i) => ({
        binId: 8362 + i,
        liquidity: 500_000 + Math.random() * 200_000,
      })),
    },
  },
  // JUP-USDC  (binStep 20 → each bin ≈ 0.2% price move)
  '7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcV3FPDAI8KAXKF': {
    ...MOCK_POOLS[2],
    activeBin: 5148,
    currentPrice: 0.840,
    liquidityViz: {
      activeBin: { binId: 5148, price: 0.840 },
      bins: Array.from({ length: 60 }, (_, i) => ({
        binId: 5120 + i,
        liquidity: 300_000 + Math.random() * 150_000,
      })),
    },
  },
  // BONK-SOL  (binStep 80 → wide bins for volatile meme coin)
  '3AMhFKqHVxSJMpzPNFWRVoiKCcmEfqPTEhRKFvU9MbJF': {
    ...MOCK_POOLS[3],
    activeBin: 450,
    currentPrice: 0.0000215,
    liquidityViz: {
      activeBin: { binId: 450, price: 0.0000215 },
      bins: Array.from({ length: 60 }, (_, i) => ({
        binId: 422 + i,
        liquidity: 250_000 + Math.random() * 120_000,
      })),
    },
  },
  // WIF-USDC  (binStep 100 → very wide bins for volatile asset)
  '5BtRAQvXCbqmFjbJG9YqJn6gFuN6Hk7H1B4q2xQ4jKH': {
    ...MOCK_POOLS[4],
    activeBin: 7380,
    currentPrice: 0.350,
    liquidityViz: {
      activeBin: { binId: 7380, price: 0.350 },
      bins: Array.from({ length: 60 }, (_, i) => ({
        binId: 7352 + i,
        liquidity: 400_000 + Math.random() * 200_000,
      })),
    },
  },
  // USDC-USDT  (binStep 1 → extremely tight stable-pair range)
  'HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ': {
    ...MOCK_POOLS[5],
    activeBin: 8000,
    currentPrice: 1.0002,
    liquidityViz: {
      activeBin: { binId: 8000, price: 1.0002 },
      bins: Array.from({ length: 60 }, (_, i) => ({
        binId: 7972 + i,
        liquidity: 2_000_000 + Math.random() * 500_000,
      })),
    },
  },
};

// ─── Positions ────────────────────────────────────────────────────────────────

export const MOCK_POSITIONS: Position[] = [
  {
    positionAddress: '8xRt2QMxRKGKuWLbNJGYKbT9koPnfQ4RJqnP2q1BPRQ',
    poolAddress: 'FoSDw2L5DmTuQTFe55gWPDXf88euaxAEKFre74CnvQbX',
    poolName: 'SOL-USDC',
    tokenX: { symbol: 'SOL', amount: 1.5 },
    tokenY: { symbol: 'USDC', amount: 262.5 },
    totalValueUSD: 525.0,
    pnlPercent: 4.8,
    pnlUSD: 24.0,
    feesEarned: 8.50,
    isInRange: true,
    lowerBin: 8354,
    upperBin: 8422,
    activeBin: 8388,
    strategy: 'Spot',
    openedAt: '2024-01-10T12:00:00Z',
  },
  {
    positionAddress: '2mN5QTKfGzpXkJmHuV7K8PbW3x9CdYnT1RsL6eF4vBX',
    poolAddress: '7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcV3FPDAI8KAXKF',
    poolName: 'JUP-USDC',
    tokenX: { symbol: 'JUP', amount: 450 },
    tokenY: { symbol: 'USDC', amount: 378 },
    totalValueUSD: 756.0,
    pnlPercent: -2.1,
    pnlUSD: -16.2,
    feesEarned: 22.40,
    isInRange: false,
    lowerBin: 5100,
    upperBin: 5220,
    activeBin: 5080,
    strategy: 'Curve',
    openedAt: '2024-01-08T09:30:00Z',
  },
  {
    positionAddress: '9kL4TYpR7mQ2nX8ZvH3W6u5AqBf1g0JdNc2eEiMsOKP',
    poolAddress: '5BtRAQvXCbqmFjbJG9YqJn6gFuN6Hk7H1B4q2xQ4jKH',
    poolName: 'WIF-USDC',
    tokenX: { symbol: 'WIF', amount: 1200 },
    tokenY: { symbol: 'USDC', amount: 420 },
    totalValueUSD: 840.0,
    pnlPercent: 12.5,
    pnlUSD: 93.3,
    feesEarned: 45.20,
    isInRange: true,
    lowerBin: 7200,
    upperBin: 7600,
    activeBin: 7380,
    strategy: 'BidAsk',
    openedAt: '2024-01-05T15:45:00Z',
  },
];

export const MOCK_OVERVIEW: PortfolioOverview = {
  totalValueUSD: 2121.0,
  totalPnlUSD: 101.1,
  totalPnlPercent: 5.0,
  totalFeesEarned: 76.10,
  positionCount: 3,
  inRangeCount: 2,
  outOfRangeCount: 1,
};

// ─── Historical Positions ─────────────────────────────────────────────────────

export const MOCK_HISTORY: HistoricalPosition[] = [
  {
    positionAddress: 'Ck2B7GuVzrpXnVm9KuP3hFq1wYnD4MtBcN8eAiXoLsRZ',
    poolAddress: 'FoSDw2L5DmTuQTFe55gWPDXf88euaxAEKFre74CnvQbX',
    poolName: 'SOL-USDC',
    tokenX: { symbol: 'SOL', amount: 2.0 },
    tokenY: { symbol: 'USDC', amount: 350.0 },
    totalValueUSD: 700.0,
    pnlPercent: 8.2,
    pnlUSD: 53.2,
    feesEarned: 31.50,
    isInRange: false,
    lowerBin: 7900,
    upperBin: 8100,
    activeBin: 8388,
    strategy: 'Spot',
    openedAt: '2023-12-15T10:00:00Z',
    closedAt: '2024-01-03T14:30:00Z',
    totalReturnUSD: 84.70,
    totalReturnPercent: 13.7,
    durationDays: 19,
  },
  {
    positionAddress: 'DkRt4NmcBQ2nX9YvH7W8uP3AqCe1g2JdNa4bEiMtPKLZ',
    poolAddress: '3AMhFKqHVxSJMpzPNFWRVoiKCcmEfqPTEhRKFvU9MbJF',
    poolName: 'BONK-SOL',
    tokenX: { symbol: 'BONK', amount: 15_000_000 },
    tokenY: { symbol: 'SOL', amount: 1.2 },
    totalValueUSD: 420.0,
    pnlPercent: -5.8,
    pnlUSD: -25.8,
    feesEarned: 18.90,
    isInRange: false,
    lowerBin: 3000,
    upperBin: 3400,
    activeBin: 2900,
    strategy: 'BidAsk',
    openedAt: '2023-11-20T08:00:00Z',
    closedAt: '2023-12-10T11:15:00Z',
    totalReturnUSD: -6.90,
    totalReturnPercent: -1.6,
    durationDays: 20,
  },
  {
    positionAddress: 'EjSu5OndCR3oY0ZwI8X9vQ4BrDf2h3KeOb5cFjNuQLAW',
    poolAddress: '7qbRF6YsyGuLUVs6Y1q64bdVrfe4ZcV3FPDAI8KAXKF',
    poolName: 'JUP-USDC',
    tokenX: { symbol: 'JUP', amount: 800 },
    tokenY: { symbol: 'USDC', amount: 680 },
    totalValueUSD: 1360.0,
    pnlPercent: 22.4,
    pnlUSD: 248.8,
    feesEarned: 67.20,
    isInRange: false,
    lowerBin: 4800,
    upperBin: 5000,
    activeBin: 5148,
    strategy: 'Curve',
    openedAt: '2023-10-01T09:00:00Z',
    closedAt: '2023-11-15T16:00:00Z',
    totalReturnUSD: 316.0,
    totalReturnPercent: 30.2,
    durationDays: 45,
  },
];

// ─── Mock Transaction Data ────────────────────────────────────────────────────

export const MOCK_ZAP_IN_TX = {
  swapTxsWithJito: [
    'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAED...',
  ],
  addLiquidityTxsWithJito: [
    'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAQgD...',
  ],
  meta: {
    positionPubKey: 'NewPos' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    poolAddress: 'FoSDw2L5DmTuQTFe55gWPDXf88euaxAEKFre74CnvQbX',
    inputSOL: 0.5,
    stratergy: 'Spot',
  },
  lastValidBlockHeight: 280_000_000 + Math.floor(Math.random() * 1000),
};

export const MOCK_ZAP_OUT_QUOTE = {
  token0Amount: 1.48,
  token1Amount: 0,
  estimatedUSD: 258.40,
};

export const MOCK_ZAP_OUT_TX = {
  txsWithJito: [
    'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAQcC...',
  ],
  meta: {
    positionAddress: '8xRt2QMxRKGKuWLbNJGYKbT9koPnfQ4RJqnP2q1BPRQ',
  },
  lastValidBlockHeight: 280_000_000 + Math.floor(Math.random() * 1000),
};
