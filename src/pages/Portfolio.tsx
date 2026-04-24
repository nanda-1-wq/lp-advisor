import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Wallet, AlertTriangle, Copy, RefreshCw, Check,
  LayoutGrid, Table2,
} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { getOpenPositions, getPortfolioOverview, getHistoricalPositions } from '../lib/api';
import type { Position, HistoricalPosition, PortfolioOverview } from '../lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConnectedWallet(user: ReturnType<typeof usePrivy>['user']): string | null {
  if (!user) return null;
  const solana = user.linkedAccounts?.find(
    (a) => a.type === 'wallet' && (a as { chainType?: string }).chainType === 'solana'
  ) as { address?: string } | undefined;
  if (solana?.address) return solana.address;
  const any = user.linkedAccounts?.find((a) => a.type === 'wallet') as { address?: string } | undefined;
  if (any?.address) return any.address;
  return user.wallet?.address ?? null;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function relativeTime(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent, negative,
}: {
  label: string; value: string; sub?: string; accent?: boolean; negative?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ background: '#111111', borderColor: '#1e1e1e' }}>
      <div className="text-xs mb-1" style={{ color: '#888888' }}>{label}</div>
      <div
        className="text-xl font-bold"
        style={{ color: accent ? '#00ff85' : negative ? '#ff4444' : '#ffffff' }}
      >
        {value}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: '#555555' }}>{sub}</div>}
    </div>
  );
}

function RangeBadge({ isInRange }: { isInRange: boolean }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={
        isInRange
          ? { background: '#00ff8520', color: '#00ff85', border: '1px solid #00ff8540' }
          : { background: '#ff444420', color: '#ff4444', border: '1px solid #ff444440' }
      }
    >
      {isInRange ? '● In Range' : '● Out of Range'}
    </span>
  );
}

function StrategyBadge({ s }: { s: string }) {
  const colors: Record<string, string> = { Spot: '#3b82f6', Curve: '#8b5cf6', BidAsk: '#f59e0b' };
  const c = colors[s] ?? '#6b7280';
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}
    >
      {s}
    </span>
  );
}

function PositionCard({ pos, onView }: { pos: Position; onView: (p: Position) => void }) {
  const pnlPos = pos.pnlPercent >= 0;
  const openDate = new Date(pos.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const rangeWidth = pos.upperBin - pos.lowerBin;
  const progress = Math.max(0, Math.min(1, (pos.activeBin - pos.lowerBin) / rangeWidth));

  return (
    <div
      className="rounded-xl border p-5 transition-colors cursor-pointer"
      style={{ background: '#111111', borderColor: pos.isInRange ? '#1e1e1e' : '#ff444430' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = pos.isInRange ? '#00ff8530' : '#ff444460')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = pos.isInRange ? '#1e1e1e' : '#ff444430')}
      onClick={() => onView(pos)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: '#00ff8520', color: '#00ff85', border: '1px solid #00ff8540' }}
          >
            {pos.tokenX.symbol[0]}
          </div>
          <div>
            <div className="text-white font-bold">{pos.poolName}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StrategyBadge s={pos.strategy} />
              <span style={{ color: '#333333' }} className="text-xs">·</span>
              <span className="text-xs" style={{ color: '#888888' }}>opened {openDate}</span>
            </div>
          </div>
        </div>
        <RangeBadge isInRange={pos.isInRange} />
      </div>

      {!pos.isInRange && (
        <div
          className="text-xs px-3 py-2 rounded-lg mb-3 flex items-center gap-2"
          style={{ background: '#ff444415', color: '#ff4444', border: '1px solid #ff444430' }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Out of range — collecting zero fees. Consider rebalancing.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-xs mb-0.5" style={{ color: '#888888' }}>Total Value</div>
          <div className="text-white font-bold">${fmt(pos.totalValueUSD)}</div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: '#888888' }}>P&amp;L</div>
          <div className="font-bold" style={{ color: pnlPos ? '#00ff85' : '#ff4444' }}>
            {pnlPos ? '+' : ''}{pos.pnlPercent.toFixed(1)}%
            <span className="text-xs ml-1 opacity-75">
              ({pnlPos ? '+' : ''}${pos.pnlUSD.toFixed(2)})
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: '#888888' }}>Fees Earned</div>
          <div className="font-bold" style={{ color: '#00ff85' }}>+${pos.feesEarned.toFixed(2)}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1" style={{ color: '#555555' }}>
          <span>Bin {pos.lowerBin}</span>
          <span style={{ color: '#888888' }}>Active: {pos.activeBin}</span>
          <span>Bin {pos.upperBin}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: '100%',
              background: pos.isInRange
                ? 'linear-gradient(90deg, #00ff8540, #00ff85, #00ff8540)'
                : '#ff444440',
            }}
          />
        </div>
        {pos.isInRange && (
          <div
            className="w-2 h-2 rounded-full mt-1 -translate-y-3.5"
            style={{
              background: '#00ff85',
              marginLeft: `calc(${progress * 100}% - 4px)`,
              boxShadow: '0 0 6px #00ff85',
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs" style={{ color: '#555555' }}>
          {pos.tokenX.amount.toLocaleString()} {pos.tokenX.symbol} · {pos.tokenY.amount.toLocaleString()} {pos.tokenY.symbol}
        </div>
        <span className="text-xs font-medium" style={{ color: '#00ff85' }}>View →</span>
      </div>
    </div>
  );
}

function OpenPositionsTable({ positions, onView }: { positions: Position[]; onView: (p: Position) => void }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e1e1e' }}>
      <table className="w-full">
        <thead style={{ background: '#0a0a0a' }}>
          <tr>
            {['Pool', 'Strategy', 'Value', 'Fees', 'P&L', 'Range', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs" style={{ color: '#888888' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const pnlPos = pos.pnlPercent >= 0;
            return (
              <tr
                key={pos.positionAddress}
                className="border-t transition-colors cursor-pointer"
                style={{ borderColor: '#1e1e1e' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#ffffff05')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => onView(pos)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: '#00ff8520', color: '#00ff85', border: '1px solid #00ff8540' }}
                    >
                      {pos.tokenX.symbol[0]}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{pos.poolName}</div>
                      <div className="text-xs font-mono" style={{ color: '#555555' }}>
                        {pos.positionAddress.slice(0, 8)}…
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><StrategyBadge s={pos.strategy} /></td>
                <td className="px-4 py-3 text-white text-sm font-medium">${fmt(pos.totalValueUSD)}</td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: '#00ff85' }}>+${pos.feesEarned.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <div className="font-bold text-sm" style={{ color: pnlPos ? '#00ff85' : '#ff4444' }}>
                    {pnlPos ? '+' : ''}{pos.pnlPercent.toFixed(1)}%
                  </div>
                  <div className="text-xs" style={{ color: pnlPos ? '#00ff8570' : '#ff444470' }}>
                    {pnlPos ? '+' : ''}${pos.pnlUSD.toFixed(2)}
                  </div>
                </td>
                <td className="px-4 py-3"><RangeBadge isInRange={pos.isInRange} /></td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-medium" style={{ color: '#00ff85' }}>View →</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistoricalTable({ positions }: { positions: HistoricalPosition[] }) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block rounded-xl border overflow-hidden" style={{ borderColor: '#1e1e1e' }}>
        <table className="w-full">
          <thead style={{ background: '#0a0a0a' }}>
            <tr>
              {['Pool', 'Strategy', 'Duration', 'Value', 'Fees', 'P&L', 'Closed At'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs" style={{ color: '#888888' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const pos_ = pos.totalReturnPercent >= 0;
              const closedDate = new Date(pos.closedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              });
              return (
                <tr
                  key={pos.positionAddress}
                  className="border-t transition-colors"
                  style={{ borderColor: '#1e1e1e' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#ffffff05')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: '#ffffff10', color: '#888888', border: '1px solid #ffffff20' }}
                      >
                        {pos.tokenX.symbol[0]}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">{pos.poolName}</div>
                        <div className="text-xs font-mono" style={{ color: '#555555' }}>
                          {pos.positionAddress.slice(0, 8)}…
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StrategyBadge s={pos.strategy} /></td>
                  <td className="px-4 py-3 text-white text-sm">{pos.durationDays}d</td>
                  <td className="px-4 py-3 text-white text-sm">${fmt(pos.totalValueUSD)}</td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: '#00ff85' }}>+${fmt(pos.feesEarned)}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-sm" style={{ color: pos_ ? '#00ff85' : '#ff4444' }}>
                      {pos_ ? '+' : ''}{pos.totalReturnPercent.toFixed(1)}%
                    </div>
                    <div className="text-xs" style={{ color: pos_ ? '#00ff8570' : '#ff444470' }}>
                      {pos_ ? '+' : ''}${fmt(pos.totalReturnUSD)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#888888' }}>{closedDate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {positions.map((pos) => {
          const pos_ = pos.totalReturnPercent >= 0;
          const closedDate = new Date(pos.closedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: '2-digit',
          });
          return (
            <div
              key={pos.positionAddress}
              className="rounded-xl border p-4"
              style={{ background: '#111111', borderColor: '#1e1e1e' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: '#ffffff10', color: '#888888', border: '1px solid #ffffff20' }}
                  >
                    {pos.tokenX.symbol[0]}
                  </div>
                  <div>
                    <div className="text-white text-sm font-bold">{pos.poolName}</div>
                    <div className="text-xs" style={{ color: '#555555' }}>{closedDate} · {pos.durationDays}d</div>
                  </div>
                </div>
                <StrategyBadge s={pos.strategy} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xs mb-0.5" style={{ color: '#888888' }}>Value</div>
                  <div className="text-white text-sm">${fmt(pos.totalValueUSD)}</div>
                </div>
                <div>
                  <div className="text-xs mb-0.5" style={{ color: '#888888' }}>Fees</div>
                  <div className="text-sm font-medium" style={{ color: '#00ff85' }}>+${fmt(pos.feesEarned)}</div>
                </div>
                <div>
                  <div className="text-xs mb-0.5" style={{ color: '#888888' }}>P&amp;L</div>
                  <div className="font-bold text-sm" style={{ color: pos_ ? '#00ff85' : '#ff4444' }}>
                    {pos_ ? '+' : ''}{pos.totalReturnPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, user } = usePrivy();
  const connectedWallet = getConnectedWallet(user);

  const [wallet, setWallet] = useState(searchParams.get('wallet') ?? '');
  const [inputWallet, setInputWallet] = useState(wallet);
  const [positions, setPositions] = useState<Position[]>([]);
  const [historicalPositions, setHistoricalPositions] = useState<HistoricalPosition[]>([]);
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-fill when wallet connects
  useEffect(() => {
    if (authenticated && connectedWallet && !wallet) {
      setInputWallet(connectedWallet);
      setWallet(connectedWallet);
      navigate(`/portfolio?wallet=${encodeURIComponent(connectedWallet)}`, { replace: true });
    }
  }, [authenticated, connectedWallet]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll(w: string) {
    if (!w.trim()) return;
    setLoading(true);
    setError('');
    try {
      const [posRes, ovRes, histRes] = await Promise.all([
        getOpenPositions(w),
        getPortfolioOverview(w),
        getHistoricalPositions(w),
      ]);
      console.log('[portfolio] open:', posRes);
      console.log('[portfolio] overview:', ovRes);
      console.log('[portfolio] history:', histRes);

      // Always coerce to array — real API shape may differ from mock
      if (posRes.success) {
        const d = posRes.data;
        setPositions(Array.isArray(d) ? d : []);
      }
      if (ovRes.success) setOverview(ovRes.data ?? null);
      if (histRes.success) {
        const d = histRes.data;
        setHistoricalPositions(Array.isArray(d) ? d : []);
      }
      setLastUpdated(new Date());
    } catch (e) {
      console.error('[portfolio] loadAll error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }

  useEffect(() => {
    if (wallet) loadAll(wallet);
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = inputWallet.trim();
    setWallet(w);
    navigate(`/portfolio?wallet=${encodeURIComponent(w)}`, { replace: true });
  }

  function handleCopy() {
    navigator.clipboard.writeText(wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Derived stats
  const openFees = positions.reduce((s, p) => s + p.feesEarned, 0);
  const histFees = historicalPositions.reduce((s, p) => s + p.feesEarned, 0);
  const allTimeFees = openFees + histFees;
  const histWinners = historicalPositions.filter((p) => p.totalReturnPercent >= 0).length;
  const winRate = historicalPositions.length > 0
    ? (histWinners / historicalPositions.length) * 100
    : null;
  const totalOpenValue = positions.reduce((s, p) => s + p.totalValueUSD, 0);
  const totalOpenPnl = positions.reduce((s, p) => s + p.pnlUSD, 0);
  const outOfRange = positions.filter((p) => !p.isInRange);

  // Show content once a fetch has completed — even if overview is null (empty wallet)
  const loaded = !loading && hasFetched;

  return (
    <div className="max-w-6xl mx-auto px-6">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black text-white">Portfolio</h1>
            {wallet && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="font-mono text-sm" style={{ color: '#aaaaaa' }}>
                  {wallet.slice(0, 6)}…{wallet.slice(-4)}
                </span>
                <button
                  onClick={handleCopy}
                  title="Copy address"
                  className="flex items-center transition-opacity hover:opacity-70"
                >
                  {copied
                    ? <Check className="w-3.5 h-3.5" style={{ color: '#00ff85' }} />
                    : <Copy className="w-3.5 h-3.5" style={{ color: '#666666' }} />}
                </button>
                {lastUpdated && (
                  <span className="text-xs" style={{ color: '#555555' }}>
                    · Last updated: {relativeTime(lastUpdated)}
                  </span>
                )}
                <button
                  onClick={() => loadAll(wallet)}
                  title="Refresh"
                  disabled={loading}
                  className="flex items-center transition-opacity hover:opacity-70 disabled:opacity-40"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                    style={{ color: '#666666' }}
                  />
                </button>
              </div>
            )}
          </div>
          {wallet && (
            <button
              onClick={() => navigate('/chat?q=' + encodeURIComponent(`Analyze portfolio for wallet ${wallet}`))}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-colors border shrink-0"
              style={{ borderColor: '#00ff85', color: '#00ff85', background: 'transparent' }}
            >
              Ask AI
            </button>
          )}
        </div>

        {/* Wallet input */}
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <input
            type="text"
            value={inputWallet}
            onChange={(e) => setInputWallet(e.target.value)}
            placeholder="Solana wallet address…"
            className="flex-1 rounded-xl border px-4 py-2.5 text-white text-sm outline-none font-mono focus:border-[#00ff85] transition-colors"
            style={{ background: '#111111', borderColor: '#1e1e1e' }}
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: '#00ff85', color: '#000000' }}
          >
            Load
          </button>
        </form>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-16">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: '#00ff85', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#888888' }}>Loading portfolio…</p>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="rounded-xl border p-4 text-sm flex items-center gap-2 mb-6"
          style={{ borderColor: '#ff444430', background: '#ff444415', color: '#ff4444' }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {!loading && !hasFetched && !error && !wallet && (
        <div
          className="rounded-xl border flex flex-col items-center justify-center min-h-[400px] text-center"
          style={{ background: '#111111', borderColor: '#1e1e1e' }}
        >
          <Wallet className="w-8 h-8 mx-auto mb-4" style={{ color: '#888888' }} />
          <p style={{ color: '#888888' }}>Enter a wallet address above to view your LP positions.</p>
          <p className="text-sm mt-1" style={{ color: '#444444' }}>Demo mode — any address works.</p>
        </div>
      )}

      {/* ── Loaded content ────────────────────────────────────────────────────── */}
      {loaded && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Total Net Worth"
              value={`$${fmt(totalOpenValue)}`}
              sub={`${positions.length} open position${positions.length !== 1 ? 's' : ''}`}
            />
            <StatCard
              label="Win Rate"
              value={winRate !== null ? `${winRate.toFixed(0)}%` : '—'}
              sub={
                historicalPositions.length > 0
                  ? `${histWinners}/${historicalPositions.length} closed positions`
                  : 'No closed positions yet'
              }
              accent={winRate !== null && winRate >= 50}
            />
            <StatCard
              label="Total Fees Earned"
              value={`$${fmt(allTimeFees)}`}
              sub={`$${fmt(openFees)} open · $${fmt(histFees)} closed`}
              accent
            />
            <StatCard
              label="Total P&L"
              value={`${totalOpenPnl >= 0 ? '+' : ''}$${fmt(totalOpenPnl)}`}
              sub={
                overview
                  ? `${overview.totalPnlPercent >= 0 ? '+' : ''}${overview.totalPnlPercent.toFixed(1)}% unrealized`
                  : undefined
              }
              accent={totalOpenPnl >= 0}
              negative={totalOpenPnl < 0}
            />
          </div>

          {/* Out-of-range alert */}
          {outOfRange.length > 0 && (
            <div
              className="rounded-xl border p-4 mb-6 flex items-start gap-3"
              style={{ background: '#ff444410', borderColor: '#ff444430' }}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#ff4444' }} />
              <div>
                <p className="text-white font-bold text-sm">
                  {outOfRange.length} position{outOfRange.length > 1 ? 's' : ''} out of range
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#888888' }}>
                  {outOfRange.map((p) => p.poolName).join(', ')} — collecting zero fees. Consider rebalancing.
                </p>
              </div>
            </div>
          )}

          {/* ── Open Positions ──────────────────────────────────────────────────── */}
          <div className="mb-8">
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">
                Open Positions
                <span className="text-sm font-normal ml-2" style={{ color: '#888888' }}>
                  ({positions.length})
                </span>
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('card')}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{
                    background: viewMode === 'card' ? '#00ff8520' : 'transparent',
                    color: viewMode === 'card' ? '#00ff85' : '#555555',
                    border: `1px solid ${viewMode === 'card' ? '#00ff8540' : '#1e1e1e'}`,
                  }}
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{
                    background: viewMode === 'table' ? '#00ff8520' : 'transparent',
                    color: viewMode === 'table' ? '#00ff85' : '#555555',
                    border: `1px solid ${viewMode === 'table' ? '#00ff8540' : '#1e1e1e'}`,
                  }}
                  title="Table view"
                >
                  <Table2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary bar */}
            {positions.length > 0 && (
              <div
                className="flex items-center gap-6 px-4 py-2.5 rounded-xl border mb-4 flex-wrap"
                style={{ background: '#0a0a0a', borderColor: '#1e1e1e' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: '#555555' }}>Total value</span>
                  <span className="text-sm font-bold text-white">${fmt(totalOpenValue)}</span>
                </div>
                <div className="w-px h-4 shrink-0" style={{ background: '#1e1e1e' }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: '#555555' }}>Total fees</span>
                  <span className="text-sm font-bold" style={{ color: '#00ff85' }}>${fmt(openFees)}</span>
                </div>
                <div className="w-px h-4 shrink-0" style={{ background: '#1e1e1e' }} />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: '#555555' }}>In range</span>
                  <span className="text-sm font-bold text-white">
                    {overview?.inRangeCount ?? positions.filter(p => p.isInRange).length}/
                    {overview?.positionCount ?? positions.length}
                  </span>
                  {(overview?.outOfRangeCount ?? outOfRange.length) > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#ff444420', color: '#ff4444' }}>
                      {overview?.outOfRangeCount ?? outOfRange.length} out
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Cards or Table */}
            {positions.length === 0 ? (
              <div
                className="rounded-xl border p-12 flex flex-col items-center justify-center min-h-[200px]"
                style={{ background: '#111111', borderColor: '#1e1e1e' }}
              >
                <Wallet className="w-8 h-8 mb-3" style={{ color: '#888888' }} />
                <p style={{ color: '#888888' }}>No open positions found for this wallet.</p>
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {positions.map((pos) => (
                  <PositionCard
                    key={pos.positionAddress}
                    pos={pos}
                    onView={(p) => navigate(`/portfolio/${p.positionAddress}`, { state: { position: p } })}
                  />
                ))}
              </div>
            ) : (
              <OpenPositionsTable
                positions={positions}
                onView={(p) => navigate(`/portfolio/${p.positionAddress}`, { state: { position: p } })}
              />
            )}
          </div>

          {/* ── Historical Positions ────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">
                Historical Positions
                <span className="text-sm font-normal ml-2" style={{ color: '#888888' }}>
                  ({historicalPositions.length})
                </span>
              </h2>
            </div>

            {historicalPositions.length === 0 ? (
              <div
                className="rounded-xl border p-10 flex flex-col items-center justify-center text-center"
                style={{ background: '#111111', borderColor: '#1e1e1e' }}
              >
                <p style={{ color: '#888888' }}>No closed positions found for this wallet.</p>
              </div>
            ) : (
              <HistoricalTable positions={historicalPositions} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
