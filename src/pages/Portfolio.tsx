import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getOpenPositions, getPortfolioOverview } from '../lib/api';
import type { Position, PortfolioOverview } from '../lib/types';

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: '#12131a', borderColor: '#1e2228' }}
    >
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className={`text-xl font-semibold ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-gray-500 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function RangeBadge({ isInRange }: { isInRange: boolean }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={
        isInRange
          ? { background: '#10b98120', color: '#10b981', border: '1px solid #10b98140' }
          : { background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }
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
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}>
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
      className="rounded-xl border p-5 hover:border-emerald-400/30 transition-colors cursor-pointer"
      style={{ background: '#12131a', borderColor: pos.isInRange ? '#1e2228' : '#ef444430' }}
      onClick={() => onView(pos)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}
          >
            {pos.tokenX.symbol[0]}
          </div>
          <div>
            <div className="text-white font-medium">{pos.poolName}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StrategyBadge s={pos.strategy} />
              <span className="text-gray-600 text-xs">·</span>
              <span className="text-gray-400 text-xs">opened {openDate}</span>
            </div>
          </div>
        </div>
        <RangeBadge isInRange={pos.isInRange} />
      </div>

      {!pos.isInRange && (
        <div
          className="text-xs px-3 py-2 rounded-lg mb-3 flex items-center gap-2"
          style={{ background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430' }}
        >
          <span>⚠</span>
          Out of range — collecting zero fees. Consider rebalancing.
        </div>
      )}

      {/* Values */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className="text-gray-500 text-xs">Total Value</div>
          <div className="text-white font-semibold">${pos.totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">P&amp;L</div>
          <div className={`font-semibold ${pnlPos ? 'text-emerald-400' : 'text-red-400'}`}>
            {pnlPos ? '+' : ''}{pos.pnlPercent.toFixed(1)}%
            <span className="text-xs ml-1 opacity-75">
              ({pnlPos ? '+' : ''}${pos.pnlUSD.toFixed(2)})
            </span>
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Fees Earned</div>
          <div className="text-emerald-400 font-semibold">+${pos.feesEarned.toFixed(2)}</div>
        </div>
      </div>

      {/* Range bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Bin {pos.lowerBin}</span>
          <span className="text-gray-400">Active: {pos.activeBin}</span>
          <span>Bin {pos.upperBin}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e2228' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: '100%',
              background: pos.isInRange
                ? 'linear-gradient(90deg, #10b98140, #10b981, #10b98140)'
                : '#ef444440',
            }}
          />
        </div>
        {pos.isInRange && (
          <div
            className="w-2 h-2 rounded-full mt-1 -translate-y-3.5"
            style={{
              background: '#10b981',
              marginLeft: `calc(${progress * 100}% - 4px)`,
              boxShadow: '0 0 6px #10b981',
            }}
          />
        )}
      </div>

      {/* Holdings */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {pos.tokenX.amount.toLocaleString()} {pos.tokenX.symbol} · {pos.tokenY.amount.toLocaleString()} {pos.tokenY.symbol}
        </div>
        <span className="text-emerald-400 text-xs">View →</span>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(searchParams.get('wallet') ?? '');
  const [inputWallet, setInputWallet] = useState(wallet);
  const [positions, setPositions] = useState<Position[]>([]);
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadPortfolio(w: string) {
    if (!w.trim()) return;
    setLoading(true);
    setError('');
    try {
      const [posRes, ovRes] = await Promise.all([
        getOpenPositions(w),
        getPortfolioOverview(w),
      ]);
      if (posRes.success) setPositions(posRes.data ?? []);
      if (ovRes.success) setOverview(ovRes.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (wallet) loadPortfolio(wallet);
  }, [wallet]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = inputWallet.trim();
    setWallet(w);
    navigate(`/portfolio?wallet=${encodeURIComponent(w)}`, { replace: true });
  }

  const outOfRange = positions.filter((p) => !p.isInRange);

  return (
    <div>
      {/* Wallet input */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Portfolio</h1>
        <p className="text-gray-400 text-sm mb-4">Enter a Solana wallet to view open LP positions.</p>
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl">
          <input
            type="text"
            value={inputWallet}
            onChange={(e) => setInputWallet(e.target.value)}
            placeholder="Solana wallet address…"
            className="flex-1 rounded-xl border px-4 py-2.5 text-white text-sm outline-none focus:border-emerald-500 font-mono"
            style={{ background: '#12131a', borderColor: '#2a2d38' }}
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            Load
          </button>
          {wallet && (
            <button
              type="button"
              onClick={() => navigate('/chat?q=' + encodeURIComponent(`Analyze portfolio for wallet ${wallet}`))}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ background: '#1e2228', color: '#9ca3af' }}
            >
              Ask AI →
            </button>
          )}
        </form>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading portfolio…</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border p-4 text-red-400 text-sm" style={{ borderColor: '#ef444430', background: '#ef444415' }}>
          {error}
        </div>
      )}

      {!loading && overview && (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Total Value"
              value={`$${overview.totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <StatCard
              label="Total P&L"
              value={`${overview.totalPnlPercent >= 0 ? '+' : ''}${overview.totalPnlPercent.toFixed(1)}%`}
              sub={`$${overview.totalPnlUSD.toFixed(2)}`}
              accent={overview.totalPnlPercent >= 0}
            />
            <StatCard
              label="Fees Earned"
              value={`$${overview.totalFeesEarned.toFixed(2)}`}
              accent
            />
            <StatCard
              label="Positions"
              value={String(overview.positionCount)}
              sub={`${overview.inRangeCount} in range · ${overview.outOfRangeCount} out`}
            />
          </div>

          {/* Alerts */}
          {outOfRange.length > 0 && (
            <div
              className="rounded-xl border p-4 mb-6 flex items-start gap-3"
              style={{ background: '#ef444410', borderColor: '#ef444430' }}
            >
              <span className="text-red-400 text-lg">⚠</span>
              <div>
                <p className="text-white font-medium text-sm">
                  {outOfRange.length} position{outOfRange.length > 1 ? 's' : ''} out of range
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {outOfRange.map((p) => p.poolName).join(', ')} — collecting zero fees. Consider closing or rebalancing.
                </p>
              </div>
            </div>
          )}

          {/* Position cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {positions.map((pos) => (
              <PositionCard
                key={pos.positionAddress}
                pos={pos}
                onView={(p) => navigate(`/portfolio/${p.positionAddress}`, { state: { position: p } })}
              />
            ))}
          </div>

          {positions.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">No open positions found for this wallet.</div>
          )}
        </>
      )}

      {!loading && !overview && !error && !wallet && (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ background: '#12131a', borderColor: '#1e2228' }}
        >
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-400">Enter a wallet address above to view open LP positions.</p>
          <p className="text-gray-600 text-sm mt-1">Using mock data in demo mode — any address works.</p>
        </div>
      )}
    </div>
  );
}
