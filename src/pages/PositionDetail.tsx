import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getOpenPositions, getZapOutQuote, generateZapOutTx, submitZapOut } from '../lib/api';
import type { Position } from '../lib/types';

const OUTPUT_TYPES = [
  { id: 'allToken0', label: 'All Token X (SOL)' },
  { id: 'allToken1', label: 'All Token Y (USDC)' },
  { id: 'both', label: 'Both tokens' },
  { id: 'allBaseToken', label: 'All Base Token' },
] as const;

type OutputType = (typeof OUTPUT_TYPES)[number]['id'];

function RangeBadge({ isInRange }: { isInRange: boolean }) {
  return (
    <span
      className="text-sm px-3 py-1 rounded-full font-medium"
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

export default function PositionDetail() {
  const { positionId } = useParams<{ positionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [position, setPosition] = useState<Position | null>(
    (location.state as { position?: Position })?.position ?? null
  );
  const [loading, setLoading] = useState(!position);

  // Zap-out state
  const [bps, setBps] = useState(10000); // 100%
  const [outputType, setOutputType] = useState<OutputType>('both');
  const [quote, setQuote] = useState<{ token0Amount: number; token1Amount: number; estimatedUSD: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'idle' | 'generating' | 'signing' | 'submitting' | 'done' | 'error'>('idle');
  const [withdrawResult, setWithdrawResult] = useState<{ signature?: string; error?: string } | null>(null);
  const [wallet, setWallet] = useState('');

  useEffect(() => {
    if (!position && positionId) {
      // Try to load from API (demo: load all and find by address)
      getOpenPositions('demo')
        .then((res) => {
          if (res.success && res.data) {
            const found = res.data.find((p) => p.positionAddress === positionId);
            if (found) setPosition(found);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [positionId, position]);

  async function fetchQuote() {
    if (!position) return;
    setQuoteLoading(true);
    try {
      const res = await getZapOutQuote({
        positionAddress: position.positionAddress,
        owner: wallet || 'DemoWallet11111111111111111111111111111111',
        bps,
        outputType,
      });
      if (res.success && res.data) setQuote(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setQuoteLoading(false);
    }
  }

  // Fetch quote whenever params change
  useEffect(() => {
    if (position) fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bps, outputType, position]);

  async function handleZapOut() {
    if (!position) return;
    setWithdrawStep('generating');
    setWithdrawResult(null);
    try {
      const txRes = await generateZapOutTx({
        positionAddress: position.positionAddress,
        owner: wallet || 'DemoWallet11111111111111111111111111111111',
        bps,
        outputType,
      });
      if (!txRes.success || !txRes.data) throw new Error(txRes.error ?? 'Failed to generate tx');

      setWithdrawStep('signing');
      await new Promise((r) => setTimeout(r, 800)); // Demo: simulate signing

      setWithdrawStep('submitting');
      const submitRes = await submitZapOut({
        lastValidBlockHeight: txRes.data.lastValidBlockHeight,
        txsWithJito: txRes.data.txsWithJito,
        meta: txRes.data.meta,
      });
      if (!submitRes.success) throw new Error(submitRes.error ?? 'Submission failed');

      setWithdrawResult({ signature: submitRes.data?.signature });
      setWithdrawStep('done');
    } catch (err) {
      setWithdrawResult({ error: err instanceof Error ? err.message : 'Unknown error' });
      setWithdrawStep('error');
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="text-center py-16 text-gray-400">
        Position not found.{' '}
        <button onClick={() => navigate('/portfolio')} className="text-emerald-400 hover:underline">
          Back to portfolio
        </button>
      </div>
    );
  }

  const openDate = new Date(position.openedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const rangeWidth = position.upperBin - position.lowerBin;
  const progress = rangeWidth > 0
    ? Math.max(0, Math.min(1, (position.activeBin - position.lowerBin) / rangeWidth))
    : 0.5;
  const pnlPos = position.pnlPercent >= 0;
  const isWithdrawing = ['generating', 'signing', 'submitting'].includes(withdrawStep);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        ← Back to Portfolio
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold"
            style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}
          >
            {position.tokenX.symbol[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{position.poolName}</h1>
            <div className="text-gray-400 text-sm">{position.strategy} · Opened {openDate}</div>
          </div>
        </div>
        <RangeBadge isInRange={position.isInRange} />
      </div>

      {/* Out of range alert */}
      {!position.isInRange && (
        <div
          className="rounded-xl border p-4 mb-6 flex gap-3"
          style={{ background: '#ef444410', borderColor: '#ef444430' }}
        >
          <span className="text-red-400 text-xl">⚠</span>
          <div>
            <p className="text-white font-medium">Position is out of range</p>
            <p className="text-gray-400 text-sm mt-0.5">
              Active bin {position.activeBin} is outside your range ({position.lowerBin}–{position.upperBin}).
              You are earning zero fees. Consider withdrawing and rebalancing.
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Value', value: `$${position.totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { label: 'P&L', value: `${pnlPos ? '+' : ''}${position.pnlPercent.toFixed(1)}%`, accent: pnlPos, negative: !pnlPos },
          { label: 'P&L (USD)', value: `${pnlPos ? '+' : ''}$${position.pnlUSD.toFixed(2)}`, accent: pnlPos, negative: !pnlPos },
          { label: 'Fees Earned', value: `$${position.feesEarned.toFixed(2)}`, accent: true },
          { label: `${position.tokenX.symbol} Amount`, value: position.tokenX.amount.toLocaleString() },
          { label: `${position.tokenY.symbol} Amount`, value: position.tokenY.amount.toLocaleString() },
        ].map(({ label, value, accent, negative }) => (
          <div key={label} className="rounded-xl border p-4" style={{ background: '#12131a', borderColor: '#1e2228' }}>
            <div className="text-gray-400 text-xs mb-1">{label}</div>
            <div className={`text-lg font-semibold ${accent ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-white'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Range visualization */}
      <div className="rounded-xl border p-5 mb-6" style={{ background: '#12131a', borderColor: '#1e2228' }}>
        <h3 className="text-white font-medium mb-4">Price Range</h3>
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Lower: {position.lowerBin}</span>
          <span>Active: <span className="text-white">{position.activeBin}</span></span>
          <span>Upper: {position.upperBin}</span>
        </div>
        <div className="relative h-3 rounded-full" style={{ background: '#1e2228' }}>
          <div
            className="absolute h-full rounded-full"
            style={{
              background: position.isInRange
                ? 'linear-gradient(90deg, #10b98150, #10b981, #10b98150)'
                : '#ef444440',
              width: '100%',
            }}
          />
          {/* Active bin marker */}
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1.5 border-2"
            style={{
              left: `${progress * 100}%`,
              background: position.isInRange ? '#10b981' : '#ef4444',
              borderColor: '#0a0b0e',
              boxShadow: `0 0 8px ${position.isInRange ? '#10b981' : '#ef4444'}`,
            }}
          />
        </div>
        <p className="text-gray-500 text-xs mt-3">
          Position address:{' '}
          <span className="font-mono text-gray-400">{position.positionAddress}</span>
        </p>
      </div>

      {/* Zap-Out section */}
      <div className="rounded-xl border p-5" style={{ background: '#12131a', borderColor: '#1e2228' }}>
        <h3 className="text-white font-medium mb-4">Withdraw Liquidity (Zap-Out)</h3>

        {withdrawStep === 'idle' || withdrawStep === 'error' ? (
          <div className="space-y-4">
            {/* Wallet */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Wallet Address (optional for demo)</label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Leave blank for demo"
                className="w-full rounded-lg border px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 font-mono"
                style={{ background: '#0e0f14', borderColor: '#2a2d38' }}
              />
            </div>

            {/* Percentage slider */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <label>Withdraw Amount</label>
                <span className="text-white font-medium">{(bps / 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={100}
                max={10000}
                step={100}
                value={bps}
                onChange={(e) => setBps(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>1%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>

            {/* Output type */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Receive as</label>
              <div className="grid grid-cols-2 gap-2">
                {OUTPUT_TYPES.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOutputType(o.id)}
                    className="text-xs py-2 px-3 rounded-lg border text-left transition-colors"
                    style={
                      outputType === o.id
                        ? { background: '#10b98120', borderColor: '#10b981', color: '#10b981' }
                        : { background: '#0e0f14', borderColor: '#2a2d38', color: '#9ca3af' }
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quote */}
            {quoteLoading && (
              <div className="text-center py-2">
                <div className="w-4 h-4 border border-emerald-400 border-t-transparent rounded-full animate-spin inline-block" />
                <span className="text-gray-500 text-xs ml-2">Fetching quote…</span>
              </div>
            )}
            {quote && !quoteLoading && (
              <div
                className="rounded-lg p-3 text-sm space-y-1"
                style={{ background: '#0e0f14', border: '1px solid #2a2d38' }}
              >
                <div className="flex justify-between">
                  <span className="text-gray-400">You receive</span>
                  <span className="text-emerald-400 font-medium">≈ ${quote.estimatedUSD.toFixed(2)}</span>
                </div>
                {quote.token0Amount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{position.tokenX.symbol}</span>
                    <span className="text-white">{quote.token0Amount.toFixed(4)}</span>
                  </div>
                )}
                {quote.token1Amount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{position.tokenY.symbol}</span>
                    <span className="text-white">{quote.token1Amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {withdrawStep === 'error' && withdrawResult?.error && (
              <div className="text-red-400 text-sm">{withdrawResult.error}</div>
            )}

            <button
              onClick={handleZapOut}
              disabled={isWithdrawing}
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
            >
              Withdraw {(bps / 100).toFixed(0)}% Liquidity
            </button>
          </div>
        ) : isWithdrawing ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">
              {withdrawStep === 'generating' && 'Generating transaction…'}
              {withdrawStep === 'signing' && 'Signing with wallet…'}
              {withdrawStep === 'submitting' && 'Submitting via Jito…'}
            </p>
          </div>
        ) : withdrawStep === 'done' ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <p className="text-white font-semibold mb-1">Liquidity Withdrawn!</p>
            <p className="text-gray-400 text-sm mb-3">Your position has been closed.</p>
            {withdrawResult?.signature && (
              <p className="text-xs text-gray-500 font-mono break-all mb-4">{withdrawResult.signature}</p>
            )}
            <button
              onClick={() => navigate('/portfolio')}
              className="px-6 py-2 rounded-lg text-sm text-white"
              style={{ background: '#1e2228' }}
            >
              Back to Portfolio
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
