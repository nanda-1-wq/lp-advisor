import type {
  Pool,
  PoolInfo,
  Position,
  HistoricalPosition,
  PortfolioOverview,
  ChatApiRequest,
  ChatApiResponse,
  ZapInRequest,
  ZapInTxResponse,
  ZapOutQuoteRequest,
  ZapOutQuote,
  ZapOutTxResponse,
  ApiResponse,
} from './types';
import { API_BASE } from './apiBase';

const BASE = `${API_BASE}/api`;

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export async function sendChatMessage(
  messages: ChatApiRequest['messages']
): Promise<ChatApiResponse> {
  return request<ChatApiResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

// ─── Pools ────────────────────────────────────────────────────────────────────

export async function discoverPools(params?: {
  tokenPair?: string;
  sortBy?: string;
  pageSize?: number;
}): Promise<ApiResponse<Pool[]>> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request<ApiResponse<Pool[]>>(`/pools/discover${qs ? `?${qs}` : ''}`);
}

export async function getPoolInfo(poolId: string): Promise<ApiResponse<PoolInfo>> {
  return request<ApiResponse<PoolInfo>>(`/pools/${poolId}/info`);
}

export async function getPoolStats(poolId: string): Promise<ApiResponse<unknown>> {
  return request<ApiResponse<unknown>>(`/pools/${poolId}/stats`);
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function getOpenPositions(owner: string): Promise<ApiResponse<Position[]>> {
  return request<ApiResponse<Position[]>>(`/positions/open?owner=${owner}`);
}

export async function getPortfolioOverview(owner: string): Promise<ApiResponse<PortfolioOverview>> {
  return request<ApiResponse<PortfolioOverview>>(`/positions/overview?owner=${owner}`);
}

export async function getHistoricalPositions(
  owner: string
): Promise<ApiResponse<HistoricalPosition[]>> {
  return request<ApiResponse<HistoricalPosition[]>>(`/positions/history?owner=${owner}`);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function generateZapInTx(
  data: ZapInRequest
): Promise<ApiResponse<ZapInTxResponse>> {
  return request<ApiResponse<ZapInTxResponse>>('/tx/zap-in', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitZapIn(data: {
  lastValidBlockHeight: number;
  swapTxsWithJito: string[];
  addLiquidityTxsWithJito: string[];
  meta: ZapInTxResponse['meta'];
}): Promise<ApiResponse<{ signature: string }>> {
  return request<ApiResponse<{ signature: string }>>('/tx/submit-zap-in', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getZapOutQuote(
  data: ZapOutQuoteRequest
): Promise<ApiResponse<ZapOutQuote>> {
  return request<ApiResponse<ZapOutQuote>>('/tx/zap-out-quote', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateZapOutTx(data: {
  positionAddress: string;
  owner: string;
  bps: number;
  outputType: ZapOutQuoteRequest['outputType'];
}): Promise<ApiResponse<ZapOutTxResponse>> {
  return request<ApiResponse<ZapOutTxResponse>>('/tx/zap-out', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitZapOut(data: {
  lastValidBlockHeight: number;
  txsWithJito: string[];
  meta: ZapOutTxResponse['meta'];
}): Promise<ApiResponse<{ signature: string }>> {
  return request<ApiResponse<{ signature: string }>>('/tx/submit-zap-out', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
