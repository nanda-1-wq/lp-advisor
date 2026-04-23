import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage } from '../lib/api';
import type { ChatMessage, Pool } from '../lib/types';

let idCounter = 0;
const uid = () => `msg-${++idCounter}-${Date.now()}`;

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(2)}`;
}

function StrategyBadge({ s }: { s: string }) {
  const colors: Record<string, string> = {
    Spot: '#3b82f6',
    Curve: '#8b5cf6',
    BidAsk: '#f59e0b',
  };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${colors[s] ?? '#6b7280'}20`, color: colors[s] ?? '#9ca3af', border: `1px solid ${colors[s] ?? '#6b7280'}40` }}
    >
      {s}
    </span>
  );
}

function PoolCard({ pool, onAddLiquidity }: { pool: Pool; onAddLiquidity: (pool: Pool) => void }) {
  return (
    <div
      className="rounded-xl border p-4 mt-2"
      style={{ background: '#0e0f14', borderColor: '#2a2d38' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}
          >
            {pool.tokenX.symbol[0]}
          </div>
          <div>
            <div className="text-white font-medium text-sm">{pool.name}</div>
            <div className="text-gray-500 text-xs">{pool.protocol}</div>
          </div>
        </div>
        <StrategyBadge s="Spot" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-gray-500 text-xs">TVL</div>
          <div className="text-white text-sm font-medium">{formatMoney(pool.tvl)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">24h Vol</div>
          <div className="text-white text-sm font-medium">{formatMoney(pool.volume24h)}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">APR</div>
          <div className="text-emerald-400 text-sm font-medium">{pool.apr.toFixed(1)}%</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">
          Fee {(pool.feeRate * 100).toFixed(2)}% · Bin step {pool.binStep}
        </span>
        <button
          onClick={() => onAddLiquidity(pool)}
          className="text-xs px-3 py-1.5 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          Add Liquidity →
        </button>
      </div>
    </div>
  );
}

// Add Liquidity Modal
function AddLiquidityModal({
  pool,
  onClose,
}: {
  pool: Pool;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('0.5');
  const [wallet, setWallet] = useState('');
  const [step, setStep] = useState<'form' | 'generating' | 'signing' | 'submitting' | 'done' | 'error'>('form');
  const [txData, setTxData] = useState<{ signature?: string; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sol = parseFloat(amount);
    if (!sol || sol <= 0) return;

    setStep('generating');
    try {
      const { generateZapInTx, submitZapIn } = await import('../lib/api');
      const res = await generateZapInTx({
        poolId: pool.address,
        stratergy: 'Spot',
        inputSOL: sol,
        percentX: 0.5,
        fromBinId: 8354,
        toBinId: 8422,
        owner: wallet || 'DemoWallet11111111111111111111111111111111',
        slippage_bps: 500,
      });

      if (!res.success || !res.data) throw new Error(res.error ?? 'Failed to generate tx');

      setStep('signing');
      // In production: sign with Phantom/Backpack wallet
      // For demo: pass unsigned transactions directly
      await new Promise((r) => setTimeout(r, 800));

      setStep('submitting');
      const submitRes = await submitZapIn({
        lastValidBlockHeight: res.data.lastValidBlockHeight,
        swapTxsWithJito: res.data.swapTxsWithJito,
        addLiquidityTxsWithJito: res.data.addLiquidityTxsWithJito,
        meta: res.data.meta,
      });

      if (!submitRes.success) throw new Error(submitRes.error ?? 'Submission failed');
      setTxData({ signature: submitRes.data?.signature });
      setStep('done');
    } catch (err) {
      setTxData({ error: err instanceof Error ? err.message : 'Unknown error' });
      setStep('error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: '#12131a', borderColor: '#2a2d38' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold">Add Liquidity · {pool.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Amount (SOL)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-white text-sm outline-none border focus:border-emerald-500"
                style={{ background: '#0e0f14', borderColor: '#2a2d38' }}
              />
              <p className="text-xs text-gray-500 mt-1">Zap-in mode: auto-splits into {pool.tokenX.symbol}/{pool.tokenY.symbol}</p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Wallet Address (optional for demo)</label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Leave blank for demo wallet"
                className="w-full rounded-lg px-3 py-2.5 text-white text-sm outline-none border focus:border-emerald-500 font-mono"
                style={{ background: '#0e0f14', borderColor: '#2a2d38' }}
              />
            </div>

            <div
              className="rounded-lg p-3 text-xs space-y-1"
              style={{ background: '#0e0f14', borderLeft: '3px solid #10b981' }}
            >
              <div className="flex justify-between text-gray-400">
                <span>Strategy</span><span className="text-white">Spot</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Bin range</span><span className="text-white">8354 → 8422 (±34)</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Slippage</span><span className="text-white">5%</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Est. APR</span><span className="text-emerald-400">{pool.apr.toFixed(1)}%</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              Generate Transaction
            </button>
          </form>
        )}

        {(step === 'generating' || step === 'signing' || step === 'submitting') && (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">
              {step === 'generating' && 'Generating transaction…'}
              {step === 'signing' && 'Signing with wallet…'}
              {step === 'submitting' && 'Submitting via Jito…'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {step === 'generating' && 'Building swap + add-liquidity txs'}
              {step === 'signing' && 'Demo: auto-signing for preview'}
              {step === 'submitting' && 'Broadcasting to Solana validators'}
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <p className="text-white font-semibold mb-1">Position Opened!</p>
            <p className="text-gray-400 text-sm mb-4">Your liquidity has been added to {pool.name}</p>
            {txData?.signature && (
              <p className="text-xs text-gray-500 font-mono break-all">{txData.signature}</p>
            )}
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 rounded-lg text-sm text-white"
              style={{ background: '#1e2228' }}
            >
              Close
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✗
            </div>
            <p className="text-white font-semibold mb-1">Transaction Failed</p>
            <p className="text-gray-400 text-sm mb-4">{txData?.error}</p>
            <button
              onClick={() => setStep('form')}
              className="px-6 py-2 rounded-lg text-sm text-white"
              style={{ background: '#1e2228' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Message bubble
function MessageBubble({
  msg,
  onAddLiquidity,
}: {
  msg: ChatMessage;
  onAddLiquidity: (pool: Pool) => void;
}) {
  const isUser = msg.role === 'user';

  if (msg.isLoading) {
    return (
      <div className="flex gap-3 items-start">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}
        >
          AI
        </div>
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm"
          style={{ background: '#12131a', border: '1px solid #1e2228' }}
        >
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={
          isUser
            ? { background: '#3b3f52' }
            : { background: 'linear-gradient(135deg, #10b981, #6366f1)' }
        }
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser ? 'rounded-tr-sm whitespace-pre-wrap' : 'rounded-tl-sm'
          }`}
          style={
            isUser
              ? { background: '#3730a3', color: 'white' }
              : { background: '#12131a', border: '1px solid #1e2228', color: '#e5e7eb' }
          }
        >
          {isUser ? msg.content : (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-semibold text-white mt-3 mb-1 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-emerald-400 mt-2 mb-1 first:mt-0">{children}</h3>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2 pl-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2 pl-1">{children}</ol>,
                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                code: ({ children }) => <code className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: '#0e0f14', color: '#10b981' }}>{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-emerald-400/50 pl-3 text-gray-400 my-2">{children}</blockquote>,
                hr: () => <hr className="border-none border-t my-3" style={{ borderColor: '#2a2d38' }} />,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Pool cards */}
        {!isUser && msg.toolData?.pools && msg.toolData.pools.length > 0 && (
          <div className="w-full space-y-2">
            {msg.toolData.pools.slice(0, 3).map((pool) => (
              <PoolCard key={pool.address} pool={pool} onAddLiquidity={onAddLiquidity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const STORAGE_KEY = 'lp_advisor_chat';

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((m: ChatMessage) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
}

const SUGGESTIONS = [
  'SOL/USDC with $200, low risk',
  'Best meme coin pools right now',
  'Analyze my portfolio',
  'What is impermanent loss?',
];

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Refs that always hold the current state values so sendMessage never
  // captures stale closures, regardless of when it was created.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  // Prevents the URL-query effect from firing twice in React 18 StrictMode.
  const initialSentRef = useRef(false);

  // Persist messages to localStorage (skip transient loading bubbles)
  useEffect(() => {
    const toSave = messages.filter((m) => !m.isLoading);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function clearChat() {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    // Read live values from refs — never stale, safe to call from any effect.
    if (!trimmed || loadingRef.current) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    const loadingMsg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    // Build history from the ref so we always get the current message list.
    const history = [
      ...messagesRef.current
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: trimmed },
    ];

    try {
      const res = await sendChatMessage(history);
      const aiMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: res.message,
        timestamp: new Date(),
        toolData: res.toolData,
      };
      setMessages((prev) => {
        const without = prev.filter((m) => !m.isLoading);
        return [...without, aiMsg];
      });
    } catch (err) {
      const errMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: `Sorry, I ran into an error: ${err instanceof Error ? err.message : 'unknown error'}. Please check that the backend is running on port 3001.`,
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const without = prev.filter((m) => !m.isLoading);
        return [...without, errMsg];
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  // No deps — reads live state via refs, never needs to be recreated.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle initial query from URL — guard with a ref so StrictMode's
  // double effect invocation doesn't send the message twice.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !initialSentRef.current) {
      initialSentRef.current = true;
      sendMessage(q);
      navigate('/chat', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      <div className="flex flex-col h-[calc(100svh-3.5rem)]" style={{ maxWidth: '100%' }}>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 relative">
          {!isEmpty && (
            <div className="sticky top-0 z-10 flex justify-end max-w-3xl mx-auto mb-2">
              <button
                onClick={clearChat}
                className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:border-red-400/50 hover:text-red-400"
                style={{ color: '#6b7280', borderColor: '#2a2d38', background: '#0a0b0e' }}
              >
                Clear Chat
              </button>
            </div>
          )}
          <div className="max-w-3xl mx-auto space-y-5">
            {isEmpty && (
              <div className="text-center pt-16 pb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}
                >
                  LP
                </div>
                <h2 className="text-white text-xl font-semibold mb-2">LP Advisor</h2>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                  Ask me about pools, strategies, or paste your wallet to analyze positions.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-2 rounded-xl border transition-colors hover:border-emerald-400/50 hover:text-white"
                      style={{ color: '#9ca3af', borderColor: '#2a2d38', background: '#12131a' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onAddLiquidity={(pool) => setSelectedPool(pool)}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div
          className="border-t px-4 py-3"
          style={{ background: '#0a0b0e', borderColor: '#1e2228' }}
        >
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-2 rounded-xl border p-2"
              style={{ background: '#12131a', borderColor: '#2a2d38' }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about pools, strategies, or paste a wallet address…"
                disabled={loading}
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm px-3 py-2 outline-none resize-none"
                style={{ minHeight: '36px' }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-gray-600 mt-1.5">
              Enter to send · Shift+Enter for new line · Mock mode active
            </p>
          </form>
        </div>
      </div>

      {selectedPool && (
        <AddLiquidityModal pool={selectedPool} onClose={() => setSelectedPool(null)} />
      )}
    </>
  );
}
