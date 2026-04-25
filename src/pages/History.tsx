import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { History as HistoryIcon } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { getHistoricalPositions } from '../lib/api';
import type { HistoricalPosition } from '../lib/types';
import { getClosedPositions, getClosedAddresses } from '../lib/pendingPositions';

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
      <div className="font-bold text-sm" style={{ color: pos ? '#00ff85' : '#ff4444' }}>
        {pos ? '+' : ''}{pct.toFixed(1)}%
      </div>
      <div className="text-xs" style={{ color: pos ? '#00ff8570' : '#ff444470' }}>
        {pos ? '+' : ''}${fmt(usd)}
      </div>
    </div>
  );
}

export default function History() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { authenticated, user } = usePrivy();
  const connectedWallet = getConnectedWallet(user);

  const [wallet, setWallet] = useState(searchParams.get('wallet') ?? '');
  const [inputWallet, setInputWallet] = useState(wallet);
  const [positions, setPositions] = useState<HistoricalPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'closedAt' | 'totalReturnUSD' | 'durationDays'>('closedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Auto-fill when wallet connects
  useEffect(() => {
    if (authenticated && connectedWallet && !wallet) {
      setInputWallet(connectedWallet);
      setWallet(connectedWallet);
      navigate(`/history?wallet=${encodeURIComponent(connectedWallet)}`, { replace: true });
    }
  }, [authenticated, connectedWallet]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setHasFetched(true);
    }
  }

  // Auto-load only when arriving with a wallet in the URL (e.g. from Portfolio page)
  useEffect(() => {
    const urlWallet = searchParams.get('wallet');
    if (urlWallet) loadHistory(urlWallet);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = inputWallet.trim();
    setWallet(w);
    navigate(`/history?wallet=${encodeURIComponent(w)}`, { replace: true });
    loadHistory(w);
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  // Merge localStorage closed positions (from Zap-Out) with API results
  const closedFromStorage = hasFetched ? getClosedPositions() : [];
  const apiAddrs = new Set(positions.map((p) => p.positionAddress));
  const storageNew = closedFromStorage.filter((p) => !apiAddrs.has(p.positionAddress));
  const closedAddrs = hasFetched ? getClosedAddresses() : new Set<string>();
  // localStorage ones prepended so they appear at the top (most recent)
  const allHistory = [...storageNew, ...positions];

  const sorted = [...allHistory].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'closedAt') diff = new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime();
    else if (sortBy === 'totalReturnUSD') diff = a.totalReturnUSD - b.totalReturnUSD;
    else if (sortBy === 'durationDays') diff = a.durationDays - b.durationDays;
    return sortDir === 'asc' ? diff : -diff;
  });

  const totalReturn = allHistory.reduce((s, p) => s + p.totalReturnUSD, 0);
  const totalFees = allHistory.reduce((s, p) => s + p.feesEarned, 0);
  const winners = allHistory.filter((p) => p.totalReturnPercent >= 0).length;

  const SortHeader = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs cursor-pointer select-none transition-colors hover:text-white"
      style={{ color: '#888888' }}
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span style={{ color: '#444444' }}>
          {sortBy === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
        </span>
      </span>
    </th>
  );

  return (
    <div className="max-w-4xl mx-auto px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white mb-1">Position History</h1>
        <p className="text-sm mb-5" style={{ color: '#888888' }}>
          {authenticated && connectedWallet
            ? 'Showing closed positions for your connected wallet.'
            : 'All closed LP positions for a wallet.'}
        </p>
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

      {loading && (
        <div className="text-center py-16">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: '#00ff85', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#888888' }}>Loading history…</p>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ borderColor: '#ff444430', background: '#ff444415', color: '#ff4444' }}
        >
          {error}
        </div>
      )}

      {!loading && hasFetched && allHistory.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Closed Positions', value: String(allHistory.length), accent: false, negative: false },
              {
                label: 'Total Return',
                value: `${totalReturn >= 0 ? '+' : ''}$${fmt(totalReturn)}`,
                accent: totalReturn >= 0,
                negative: totalReturn < 0,
              },
              { label: 'Total Fees Earned', value: `$${fmt(totalFees)}`, accent: true, negative: false },
              { label: 'Win Rate', value: `${((winners / allHistory.length) * 100).toFixed(0)}%`, accent: false, negative: false },
            ].map(({ label, value, accent, negative }) => (
              <div
                key={label}
                className="rounded-xl border p-4"
                style={{ background: '#111111', borderColor: '#1e1e1e' }}
              >
                <div className="text-xs mb-1" style={{ color: '#888888' }}>{label}</div>
                <div
                  className="text-xl font-bold"
                  style={{ color: accent ? '#00ff85' : negative ? '#ff4444' : '#ffffff' }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border overflow-hidden" style={{ borderColor: '#1e1e1e' }}>
            <table className="w-full">
              <thead style={{ background: '#0a0a0a' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs" style={{ color: '#888888' }}>Pool</th>
                  <th className="px-4 py-3 text-left text-xs" style={{ color: '#888888' }}>Strategy</th>
                  <SortHeader col="durationDays" label="Duration" />
                  <th className="px-4 py-3 text-left text-xs" style={{ color: '#888888' }}>Value</th>
                  <th className="px-4 py-3 text-left text-xs" style={{ color: '#888888' }}>Fees</th>
                  <SortHeader col="totalReturnUSD" label="Total Return" />
                  <SortHeader col="closedAt" label="Closed" />
                </tr>
              </thead>
              <tbody style={{ borderColor: '#1e1e1e' }}>
                {sorted.map((pos) => {
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
                            style={{ background: '#00ff8520', color: '#00ff85', border: '1px solid #00ff8540' }}
                          >
                            {pos.tokenX.symbol[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white text-sm font-medium">{pos.poolName}</span>
                              {closedAddrs.has(pos.positionAddress) && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#00ff8530', color: '#00ff85', border: '1px solid #00ff8550' }}>
                                  New
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono" style={{ color: '#555555' }}>
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
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: '#00ff85' }}>+${fmt(pos.feesEarned)}</td>
                      <td className="px-4 py-3">
                        <ReturnCell pct={pos.totalReturnPercent} usd={pos.totalReturnUSD} />
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: '#888888' }}>{closedDate}</td>
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
                  style={{ background: '#111111', borderColor: '#1e1e1e' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: '#00ff8520', color: '#00ff85', border: '1px solid #00ff8540' }}
                      >
                        {pos.tokenX.symbol[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-sm font-bold">{pos.poolName}</span>
                          {closedAddrs.has(pos.positionAddress) && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#00ff8530', color: '#00ff85', border: '1px solid #00ff8550' }}>
                              New
                            </span>
                          )}
                        </div>
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
                      <div className="text-xs mb-0.5" style={{ color: '#888888' }}>Return</div>
                      <ReturnCell pct={pos.totalReturnPercent} usd={pos.totalReturnUSD} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && hasFetched && allHistory.length === 0 && wallet && (
        <div
          className="rounded-xl border flex flex-col items-center justify-center min-h-[400px] text-center"
          style={{ background: '#111111', borderColor: '#1e1e1e' }}
        >
          <HistoryIcon className="w-8 h-8 mx-auto mb-4" style={{ color: '#888888' }} />
          <p style={{ color: '#888888' }}>No closed positions found for this wallet.</p>
        </div>
      )}

      {!loading && !error && !wallet && (
        <div
          className="rounded-xl border flex flex-col items-center justify-center min-h-[400px] text-center"
          style={{ background: '#111111', borderColor: '#1e1e1e' }}
        >
          <HistoryIcon className="w-8 h-8 mx-auto mb-4" style={{ color: '#888888' }} />
          <p style={{ color: '#888888' }}>Enter a wallet address to view closed position history.</p>
          <p className="text-sm mt-1" style={{ color: '#444444' }}>Demo mode returns 3 sample closed positions.</p>
        </div>
      )}
    </div>
  );
}
