// ─── Token & Pool ──────────────────────────────────────────────────────────────

export interface Token {
  symbol: string;
  mint: string;
  decimals: number;
}

export interface Pool {
  address: string;
  name: string;
  tokenX: Token;
  tokenY: Token;
  tvl: number;
  volume24h: number;
  feeRate: number;
  binStep: number;
  apr: number;
  protocol: 'DLMM' | 'DAMM V2';
}

export interface PoolInfo extends Pool {
  liquidityViz: {
    activeBin: { binId: number; price: number };
    bins: { binId: number; liquidity: number }[];
  };
}

// ─── Positions ─────────────────────────────────────────────────────────────────

export interface Position {
  positionAddress: string;
  poolAddress: string;
  poolName: string;
  tokenX: { symbol: string; amount: number };
  tokenY: { symbol: string; amount: number };
  totalValueUSD: number;
  pnlPercent: number;
  pnlUSD: number;
  feesEarned: number;
  isInRange: boolean;
  lowerBin: number;
  upperBin: number;
  activeBin: number;
  strategy: 'Spot' | 'Curve' | 'BidAsk';
  openedAt: string;
}

export interface HistoricalPosition extends Position {
  closedAt: string;
  totalReturnUSD: number;
  totalReturnPercent: number;
  durationDays: number;
}

export interface PortfolioOverview {
  totalValueUSD: number;
  totalPnlUSD: number;
  totalPnlPercent: number;
  totalFeesEarned: number;
  positionCount: number;
  inRangeCount: number;
  outOfRangeCount: number;
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolData?: {
    pools?: Pool[];
    positions?: Position[];
    overview?: PortfolioOverview;
    recommendation?: LiquidityRecommendation;
  };
  isLoading?: boolean;
}

export interface LiquidityRecommendation {
  pool: Pool;
  strategy: 'Spot' | 'Curve' | 'BidAsk';
  fromBinId: number;
  toBinId: number;
  activeBinId: number;
  activeBinPrice: number;
  rationale: string;
}

// ─── Transactions ──────────────────────────────────────────────────────────────

export interface ZapInRequest {
  poolId: string;
  /** NOTE: intentional API typo — must be "stratergy" */
  stratergy: 'Spot' | 'Curve' | 'BidAsk';
  inputSOL: number;
  percentX: number;
  fromBinId: number;
  toBinId: number;
  owner: string;
  slippage_bps?: number;
  mode?: 'zap-in' | 'normal';
}

export interface ZapInTxResponse {
  swapTxsWithJito: string[];
  addLiquidityTxsWithJito: string[];
  meta: {
    positionPubKey: string;
    [key: string]: unknown;
  };
  lastValidBlockHeight: number;
}

export interface ZapOutQuoteRequest {
  positionAddress: string;
  owner: string;
  bps: number; // 0-10000
  outputType: 'allToken0' | 'allToken1' | 'both' | 'allBaseToken';
}

export interface ZapOutQuote {
  token0Amount: number;
  token1Amount: number;
  estimatedUSD: number;
}

export interface ZapOutTxResponse {
  txsWithJito: string[];
  meta: { [key: string]: unknown };
  lastValidBlockHeight: number;
}

// ─── API Response Wrapper ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export interface ChatApiRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatApiResponse {
  message: string;
  toolData?: {
    pools?: Pool[];
    positions?: Position[];
    overview?: PortfolioOverview;
    recommendation?: LiquidityRecommendation;
  };
}
