import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { getOpenPositions, getZapOutQuote, generateZapOutTx, submitZapOut } from '../lib/api';
import type { Position } from '../lib/types';
import { removePendingPosition, saveClosedPosition } from '../lib/pendingPositions';

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
          ? { background: '#00ff8520', color: '#00ff85', border: '1px solid #00ff8540' }
          : { background: '#ff444420', color: '#ff4444', border: '1px solid #ff444440' }
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

  const [bps, setBps] = useState(10000);
  const [outputType, setOutputType] = useState<OutputType>('both');
  const [quote, setQuote] = useState<{ token0Amount: number; token1Amount: number; estimatedUSD: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<'idle' | 'generating' | 'signing' | 'submitting' | 'done' | 'error'>('idle');
  const [withdrawResult, setWithdrawResult] = useState<{ signature?: string; error?: string } | null>(null);
  const [wallet, setWallet] = useState('');

  useEffect(() => {
    if (!position && positionId) {
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
      await new Promise((r) => setTimeout(r, 800));

      setWithdrawStep('submitting');
      const submitRes = await submitZapOut({
        lastValidBlockHeight: txRes.data.lastValidBlockHeight,
        txsWithJito: txRes.data.txsWithJito,
        meta: txRes.data.meta,
      });
      if (!submitRes.success) throw new Error(submitRes.error ?? 'Submission failed');

      // Archive to closed positions, then remove from pending
      const durationDays = Math.max(
        1,
        Math.floor((Date.now() - new Date(position.openedAt).getTime()) / (1000 * 60 * 60 * 24))
      );
      saveClosedPosition({
        ...position,
        closedAt: new Date().toISOString(),
        totalReturnUSD: position.pnlUSD,
        totalReturnPercent: position.pnlPercent,
        durationDays,
      });
      removePendingPosition(position.positionAddress);

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
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto"
          style={{ borderColor: '#00ff85', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="text-center py-16" style={{ color: '#888888' }}>
        Position not found.{' '}
        <button onClick={() => navigate('/portfolio')} className="hover:underline" style={{ color: '#00ff85' }}>
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
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-white"
        style={{ color: '#888888' }}
      >
        ← Back to Portfolio
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold"
            style={{ background: '#00ff8520', color: '#00ff85', border: '1px solid #00ff8540' }}
          >
            {position.tokenX.symbol[0]}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{position.poolName}</h1>
            <div className="text-sm" style={{ color: '#888888' }}>{position.strategy} · Opened {openDate}</div>
          </div>
        </div>
        <RangeBadge isInRange={position.isInRange} />
      </div>

      {/* Out of range alert */}
      {!position.isInRange && (
        <div
          className="rounded-xl border p-4 mb-6 flex gap-3"
          style={{ background: '#ff444410', borderColor: '#ff444430' }}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#ff4444' }} />
          <div>
            <p className="text-white font-bold">Position is out of range</p>
            <p className="text-sm mt-0.5" style={{ color: '#888888' }}>
              Active bin {position.activeBin} is outside your range ({position.lowerBin}–{position.upperBin}).
              You are earning zero fees. Consider withdrawing and rebalancing.
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Value', value: `$${position.totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, accent: false, negative: false },
          { label: 'P&L', value: `${pnlPos ? '+' : ''}${position.pnlPercent.toFixed(1)}%`, accent: pnlPos, negative: !pnlPos },
          { label: 'P&L (USD)', value: `${pnlPos ? '+' : ''}$${position.pnlUSD.toFixed(2)}`, accent: pnlPos, negative: !pnlPos },
          { label: 'Fees Earned', value: `$${position.feesEarned.toFixed(2)}`, accent: true, negative: false },
          { label: `${position.tokenX.symbol} Amount`, value: position.tokenX.amount.toLocaleString(), accent: false, negative: false },
          { label: `${position.tokenY.symbol} Amount`, value: position.tokenY.amount.toLocaleString(), accent: false, negative: false },
        ].map(({ label, value, accent, negative }) => (
          <div key={label} className="rounded-xl border p-4" style={{ background: '#111111', borderColor: '#1e1e1e' }}>
            <div className="text-xs mb-1" style={{ color: '#888888' }}>{label}</div>
            <div
              className="text-lg font-bold"
              style={{ color: accent ? '#00ff85' : negative ? '#ff4444' : '#ffffff' }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Range visualization */}
      <div className="rounded-xl border p-5 mb-6" style={{ background: '#111111', borderColor: '#1e1e1e' }}>
        <h3 className="text-white font-bold mb-4">Price Range</h3>
        <div className="flex justify-between text-xs mb-2" style={{ color: '#555555' }}>
          <span>Lower: {position.lowerBin}</span>
          <span>Active: <span className="text-white">{position.activeBin}</span></span>
          <span>Upper: {position.upperBin}</span>
        </div>
        <div className="relative h-3 rounded-full" style={{ background: '#1e1e1e' }}>
          <div
            className="absolute h-full rounded-full"
            style={{
              background: position.isInRange
                ? 'linear-gradient(90deg, #00ff8550, #00ff85, #00ff8550)'
                : '#ff444440',
              width: '100%',
            }}
          />
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1.5 border-2"
            style={{
              left: `${progress * 100}%`,
              background: position.isInRange ? '#00ff85' : '#ff4444',
              borderColor: '#0a0a0a',
              boxShadow: `0 0 8px ${position.isInRange ? '#00ff85' : '#ff4444'}`,
            }}
          />
        </div>
        <p className="text-xs mt-3" style={{ color: '#555555' }}>
          Position address:{' '}
          <span className="font-mono" style={{ color: '#888888' }}>{position.positionAddress}</span>
        </p>
      </div>

      {/* Zap-Out section */}
      <div className="rounded-xl border p-5" style={{ background: '#111111', borderColor: '#1e1e1e' }}>
        <h3 className="text-white font-bold mb-4">Withdraw Liquidity (Zap-Out)</h3>

        {withdrawStep === 'idle' || withdrawStep === 'error' ? (
          <div className="space-y-4">
            {/* Wallet */}
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#888888' }}>Wallet Address (optional for demo)</label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Leave blank for demo"
                className="w-full rounded-lg border px-3 py-2.5 text-white text-sm outline-none focus:border-[#00ff85] font-mono transition-colors"
                style={{ background: '#0a0a0a', borderColor: '#1e1e1e' }}
              />
            </div>

            {/* Slider */}
            <div>
              <div className="flex justify-between text-xs mb-2" style={{ color: '#888888' }}>
                <label>Withdraw Amount</label>
                <span className="text-white font-bold">{(bps / 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={100}
                max={10000}
                step={100}
                value={bps}
                onChange={(e) => setBps(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: '#00ff85' }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: '#444444' }}>
                <span>1%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>

            {/* Output type */}
            <div>
              <label className="block text-xs mb-2" style={{ color: '#888888' }}>Receive as</label>
              <div className="grid grid-cols-2 gap-2">
                {OUTPUT_TYPES.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOutputType(o.id)}
                    className="text-xs py-2 px-3 rounded-lg border text-left transition-colors"
                    style={
                      outputType === o.id
                        ? { background: '#00ff8520', borderColor: '#00ff85', color: '#00ff85' }
                        : { background: '#0a0a0a', borderColor: '#1e1e1e', color: '#888888' }
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
                <div
                  className="w-4 h-4 border border-t-transparent rounded-full animate-spin inline-block"
                  style={{ borderColor: '#00ff85', borderTopColor: 'transparent' }}
                />
                <span className="text-xs ml-2" style={{ color: '#555555' }}>Fetching quote…</span>
              </div>
            )}
            {quote && !quoteLoading && (
              <div
                className="rounded-lg p-3 text-sm space-y-1"
                style={{ background: '#0a0a0a', border: '1px solid #1e1e1e' }}
              >
                <div className="flex justify-between">
                  <span style={{ color: '#888888' }}>You receive</span>
                  <span className="font-bold" style={{ color: '#00ff85' }}>≈ ${quote.estimatedUSD.toFixed(2)}</span>
                </div>
                {quote.token0Amount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#555555' }}>{position.tokenX.symbol}</span>
                    <span className="text-white">{quote.token0Amount.toFixed(4)}</span>
                  </div>
                )}
                {quote.token1Amount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#555555' }}>{position.tokenY.symbol}</span>
                    <span className="text-white">{quote.token1Amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {withdrawStep === 'error' && withdrawResult?.error && (
              <div className="text-sm" style={{ color: '#ff4444' }}>{withdrawResult.error}</div>
            )}

            <button
              onClick={handleZapOut}
              disabled={isWithdrawing}
              className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#ff4444', color: '#ffffff' }}
            >
              Withdraw {(bps / 100).toFixed(0)}% Liquidity
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : isWithdrawing ? (
          <div className="text-center py-8">
            <div
              className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: '#00ff85', borderTopColor: 'transparent' }}
            />
            <p className="text-white font-medium">
              {withdrawStep === 'generating' && 'Generating transaction…'}
              {withdrawStep === 'signing' && 'Signing with wallet…'}
              {withdrawStep === 'submitting' && 'Submitting via Jito…'}
            </p>
          </div>
        ) : withdrawStep === 'done' ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#00ff85' }} />
            <p className="text-white font-bold mb-1">Liquidity Withdrawn!</p>
            <p className="text-sm mb-3" style={{ color: '#888888' }}>Your position has been closed.</p>
            {withdrawResult?.signature && (
              <p className="text-xs font-mono break-all mb-4" style={{ color: '#555555' }}>{withdrawResult.signature}</p>
            )}
            <button
              onClick={() => navigate('/portfolio')}
              className="px-6 py-2 rounded-lg text-sm font-bold border transition-colors"
              style={{ borderColor: '#1e1e1e', color: '#888888', background: 'transparent' }}
            >
              Back to Portfolio
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
