import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getHistoricalPositions } from '../lib/api';
import type { HistoricalPosition } from '../lib/types';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function ReturnCell({ pct, usd }: { pct: number; usd: number }) {
  const pos = pct >= 0;
  return (
    <div>
      <div className={`font-medium text-sm ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
        {pos ? '+' : ''}{pct.toFixed(1)}%
      </div>
      <div className={`text-xs ${pos ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
        {pos ? '+' : ''}${fmt(usd)}
      </div>
    </div>
  );
}

export default function History() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState(searchParams.get('wallet') ?? '');
  const [inputWallet, setInputWallet] = useState(wallet);
  const [positions, setPositions] = useState<HistoricalPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'closedAt' | 'totalReturnUSD' | 'durationDays'>('closedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  async function loadHistory(w: string) {
    if (!w.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await getHistoricalPositions(w);
      if (res.success) setPositions(res.data ?? []);
      else setError(res.error ?? 'Failed to load history');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (wallet) loadHistory(wallet);
  }, [wallet]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = inputWallet.trim();
    setWallet(w);
    navigate(`/history?wallet=${encodeURIComponent(w)}`, { replace: true });
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  const sorted = [...positions].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'closedAt') diff = new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime();
    else if (sortBy === 'totalReturnUSD') diff = a.totalReturnUSD - b.totalReturnUSD;
    else if (sortBy === 'durationDays') diff = a.durationDays - b.durationDays;
    return sortDir === 'asc' ? diff : -diff;
  });

  // Summary stats
  const totalReturn = positions.reduce((s, p) => s + p.totalReturnUSD, 0);
  const totalFees = positions.reduce((s, p) => s + p.feesEarned, 0);
  const winners = positions.filter((p) => p.totalReturnPercent >= 0).length;

  const SortHeader = ({
    col,
    label,
  }: {
    col: typeof sortBy;
    label: string;
  }) => (
    <th
      className="px-4 py-3 text-left text-xs text-gray-400 cursor-pointer hover:text-white select-none"
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="text-gray-600">
          {sortBy === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
        </span>
      </span>
    </th>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Position History</h1>
        <p className="text-gray-400 text-sm mb-4">All closed LP positions for a wallet.</p>
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
        </form>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading history…</p>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border p-4 text-red-400 text-sm"
          style={{ borderColor: '#ef444430', background: '#ef444415' }}
        >
          {error}
        </div>
      )}

      {!loading && positions.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Closed Positions', value: String(positions.length) },
              {
                label: 'Total Return',
                value: `${totalReturn >= 0 ? '+' : ''}$${fmt(totalReturn)}`,
                accent: totalReturn >= 0,
                negative: totalReturn < 0,
              },
              { label: 'Total Fees Earned', value: `$${fmt(totalFees)}`, accent: true },
              { label: 'Win Rate', value: `${((winners / positions.length) * 100).toFixed(0)}%` },
            ].map(({ label, value, accent, negative }) => (
              <div
                key={label}
                className="rounded-xl border p-4"
                style={{ background: '#12131a', borderColor: '#1e2228' }}
              >
                <div className="text-gray-400 text-xs mb-1">{label}</div>
                <div
                  className={`text-xl font-semibold ${accent ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-white'}`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden" style={{ borderColor: '#1e2228' }}>
            <table className="w-full">
              <thead style={{ background: '#0e0f14' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Pool</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Strategy</th>
                  <SortHeader col="durationDays" label="Duration" />
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Value</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-400">Fees</th>
                  <SortHeader col="totalReturnUSD" label="Total Return" />
                  <SortHeader col="closedAt" label="Closed" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#1e2228' }}>
                {sorted.map((pos) => {
                  const closedDate = new Date(pos.closedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  });
                  return (
                    <tr
                      key={pos.positionAddress}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}
                          >
                            {pos.tokenX.symbol[0]}
                          </div>
                          <div>
                            <div className="text-white text-sm">{pos.poolName}</div>
                            <div className="text-gray-500 text-xs font-mono">
                              {pos.positionAddress.slice(0, 8)}…
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StrategyBadge s={pos.strategy} />
                      </td>
                      <td className="px-4 py-3 text-white text-sm">{pos.durationDays}d</td>
                      <td className="px-4 py-3 text-white text-sm">${fmt(pos.totalValueUSD)}</td>
                      <td className="px-4 py-3 text-emerald-400 text-sm">+${fmt(pos.feesEarned)}</td>
                      <td className="px-4 py-3">
                        <ReturnCell pct={pos.totalReturnPercent} usd={pos.totalReturnUSD} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{closedDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sorted.map((pos) => {
              const closedDate = new Date(pos.closedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: '2-digit',
              });
              return (
                <div
                  key={pos.positionAddress}
                  className="rounded-xl border p-4"
                  style={{ background: '#12131a', borderColor: '#1e2228' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}
                      >
                        {pos.tokenX.symbol[0]}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">{pos.poolName}</div>
                        <div className="text-gray-500 text-xs">{closedDate} · {pos.durationDays}d</div>
                      </div>
                    </div>
                    <StrategyBadge s={pos.strategy} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-gray-500 text-xs">Value</div>
                      <div className="text-white text-sm">${fmt(pos.totalValueUSD)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Fees</div>
                      <div className="text-emerald-400 text-sm">+${fmt(pos.feesEarned)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Return</div>
                      <ReturnCell pct={pos.totalReturnPercent} usd={pos.totalReturnUSD} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && !error && positions.length === 0 && wallet && (
        <div className="text-center py-12 text-gray-500">
          No closed positions found for this wallet.
        </div>
      )}

      {!loading && !error && !wallet && (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ background: '#12131a', borderColor: '#1e2228' }}
        >
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-400">Enter a wallet address to view closed position history.</p>
          <p className="text-gray-600 text-sm mt-1">Demo mode returns 3 sample closed positions.</p>
        </div>
      )}
    </div>
  );
}
