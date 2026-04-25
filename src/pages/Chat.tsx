import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Bot, CheckCircle, AlertTriangle, ArrowRight, Send, Paperclip, Copy, Pencil, X } from 'lucide-react';
import { sendChatMessage } from '../lib/api';
import type { ChatMessage, Pool } from '../lib/types';
import { savePendingPosition } from '../lib/pendingPositions';

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
  const c = colors[s] ?? '#6b7280';
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}
    >
      {s}
    </span>
  );
}

function PoolCard({ pool, onAddLiquidity }: { pool: Pool; onAddLiquidity: (pool: Pool) => void }) {
  return (
    <div
      className="rounded-xl border p-4 mt-2"
      style={{ background: '#111111', borderColor: '#1e1e1e' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: '#00ff8520', color: '#00ff85', border: '1px solid #00ff8540' }}
          >
            {pool.tokenX.symbol[0]}
          </div>
          <div>
            <div className="text-white font-bold text-sm">{pool.name}</div>
            <div className="text-xs" style={{ color: '#888888' }}>{pool.protocol}</div>
          </div>
        </div>
        <StrategyBadge s="Spot" />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-xs mb-0.5" style={{ color: '#888888' }}>TVL</div>
          <div className="text-white text-sm font-medium">{formatMoney(pool.tvl)}</div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: '#888888' }}>24h Vol</div>
          <div className="text-white text-sm font-medium">{formatMoney(pool.volume24h)}</div>
        </div>
        <div>
          <div className="text-xs mb-0.5" style={{ color: '#888888' }}>APR</div>
          <div className="text-sm font-bold" style={{ color: '#00ff85' }}>{pool.apr.toFixed(1)}%</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: '#555555' }}>
          Fee {(pool.feeRate * 100).toFixed(2)}% · Bin step {pool.binStep}
        </span>
        <button
          onClick={() => onAddLiquidity(pool)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold transition-opacity hover:opacity-90 flex items-center gap-1"
          style={{ background: '#00ff85', color: '#000000' }}
        >
          Add Liquidity <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function AddLiquidityModal({ pool, onClose }: { pool: Pool; onClose: () => void }) {
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
      await new Promise((r) => setTimeout(r, 800));

      setStep('submitting');
      const submitRes = await submitZapIn({
        lastValidBlockHeight: res.data.lastValidBlockHeight,
        swapTxsWithJito: res.data.swapTxsWithJito,
        addLiquidityTxsWithJito: res.data.addLiquidityTxsWithJito,
        meta: res.data.meta,
      });

      if (!submitRes.success) throw new Error(submitRes.error ?? 'Submission failed');

      // Persist the new position so Portfolio can show it immediately
      const positionAddress = res.data.meta.positionPubKey ?? `zap-${Date.now()}`;
      savePendingPosition({
        positionAddress,
        poolAddress: pool.address,
        poolName: pool.name,
        tokenX: { symbol: pool.tokenX.symbol, amount: parseFloat(amount) * 0.5 },
        tokenY: { symbol: pool.tokenY.symbol, amount: 0 },
        totalValueUSD: parseFloat(amount) * 150,
        pnlPercent: 0,
        pnlUSD: 0,
        feesEarned: 0,
        isInRange: true,
        lowerBin: 8354,
        upperBin: 8422,
        activeBin: 8388,
        strategy: 'Spot',
        openedAt: new Date().toISOString(),
      });

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
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ background: '#111111', borderColor: '#1e1e1e' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold">Add Liquidity · {pool.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#888888' }}>Amount (SOL)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-white text-sm outline-none border focus:border-[#00ff85]"
                style={{ background: '#0a0a0a', borderColor: '#1e1e1e' }}
              />
              <p className="text-xs mt-1" style={{ color: '#555555' }}>
                Zap-in mode: auto-splits into {pool.tokenX.symbol}/{pool.tokenY.symbol}
              </p>
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#888888' }}>Wallet Address (optional for demo)</label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Leave blank for demo wallet"
                className="w-full rounded-lg px-3 py-2.5 text-white text-sm outline-none border focus:border-[#00ff85] font-mono"
                style={{ background: '#0a0a0a', borderColor: '#1e1e1e' }}
              />
            </div>

            <div
              className="rounded-lg p-3 text-xs space-y-1"
              style={{ background: '#0a0a0a', borderLeft: '3px solid #00ff85' }}
            >
              <div className="flex justify-between" style={{ color: '#888888' }}>
                <span>Strategy</span><span className="text-white">Spot</span>
              </div>
              <div className="flex justify-between" style={{ color: '#888888' }}>
                <span>Bin range</span><span className="text-white">8354 → 8422 (±34)</span>
              </div>
              <div className="flex justify-between" style={{ color: '#888888' }}>
                <span>Slippage</span><span className="text-white">5%</span>
              </div>
              <div className="flex justify-between" style={{ color: '#888888' }}>
                <span>Est. APR</span><span style={{ color: '#00ff85' }}>{pool.apr.toFixed(1)}%</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: '#00ff85', color: '#000000' }}
            >
              Generate Transaction
            </button>
          </form>
        )}

        {(step === 'generating' || step === 'signing' || step === 'submitting') && (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#00ff85', borderTopColor: 'transparent' }} />
            <p className="text-white font-medium">
              {step === 'generating' && 'Generating transaction…'}
              {step === 'signing' && 'Signing with wallet…'}
              {step === 'submitting' && 'Submitting via Jito…'}
            </p>
            <p className="text-sm mt-1" style={{ color: '#555555' }}>
              {step === 'generating' && 'Building swap + add-liquidity txs'}
              {step === 'signing' && 'Demo: auto-signing for preview'}
              {step === 'submitting' && 'Broadcasting to Solana validators'}
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#00ff85' }} />
            <p className="text-white font-bold mb-1">Position Opened!</p>
            <p className="text-sm mb-4" style={{ color: '#888888' }}>
              Your liquidity has been added to {pool.name}
            </p>
            {txData?.signature && (
              <p className="text-xs font-mono break-all" style={{ color: '#555555' }}>{txData.signature}</p>
            )}
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 rounded-lg text-sm font-bold border"
              style={{ borderColor: '#1e1e1e', color: '#888888', background: 'transparent' }}
            >
              Close
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-6">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: '#ff4444' }} />
            <p className="text-white font-bold mb-1">Transaction Failed</p>
            <p className="text-sm mb-4" style={{ color: '#888888' }}>{txData?.error}</p>
            <button
              onClick={() => setStep('form')}
              className="px-6 py-2 rounded-lg text-sm font-bold border"
              style={{ borderColor: '#1e1e1e', color: '#888888', background: 'transparent' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Message bubble with hover actions ────────────────────────────────────────

function MessageBubble({
  msg,
  onAddLiquidity,
  onEdit,
}: {
  msg: ChatMessage;
  onAddLiquidity: (pool: Pool) => void;
  onEdit: (text: string) => void;
}) {
  const isUser = msg.role === 'user';
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (msg.isLoading) {
    return (
      <div className="flex gap-3 items-start">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
          style={{ background: '#00ff85', color: '#000000' }}
        >
          AI
        </div>
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm"
          style={{ background: '#1a1a1a', border: '1px solid #1e1e1e' }}
        >
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#00ff85', animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#00ff85', animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#00ff85', animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
        style={
          isUser
            ? { background: '#222222', color: '#ffffff' }
            : { background: '#00ff85', color: '#000000' }
        }
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser ? 'rounded-tr-sm whitespace-pre-wrap' : 'rounded-tl-sm'
          }`}
          style={
            isUser
              ? { background: '#00ff85', color: '#000000' }
              : msg.isRateLimit
              ? { background: '#2a1f0a', border: '1px solid #f59e0b40', color: '#f59e0b' }
              : { background: '#1a1a1a', border: '1px solid #1e1e1e', color: '#e5e7eb' }
          }
        >
          {isUser ? msg.content : (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-3 mb-1 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 first:mt-0" style={{ color: '#00ff85' }}>{children}</h3>,
                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-2 pl-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-2 pl-1">{children}</ol>,
                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                code: ({ children }) => (
                  <code
                    className="px-1 py-0.5 rounded text-xs font-mono"
                    style={{ background: '#0a0a0a', color: '#00ff85' }}
                  >
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="border-l-2 pl-3 text-gray-400 my-2"
                    style={{ borderColor: '#00ff8550' }}
                  >
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="border-none border-t my-3" style={{ borderColor: '#1e1e1e' }} />,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Pool cards */}
        {!isUser && msg.toolData?.pools && msg.toolData.pools.length > 0 && (
          <div className="w-full space-y-2">
            {msg.toolData.pools.map((pool) => (
              <PoolCard key={pool.address} pool={pool} onAddLiquidity={onAddLiquidity} />
            ))}
          </div>
        )}

        {/* Hover action buttons */}
        <div
          className={`flex items-center gap-1 transition-opacity duration-150 ${
            hovered ? 'opacity-100' : 'opacity-0'
          } ${isUser ? 'flex-row-reverse' : ''}`}
        >
          <button
            onClick={handleCopy}
            title="Copy"
            className="p-1 rounded transition-colors hover:bg-white/10"
          >
            <Copy
              className="w-3.5 h-3.5 transition-colors"
              style={{ color: copied ? '#00ff85' : '#555555' }}
            />
          </button>
          {isUser && (
            <button
              onClick={() => onEdit(msg.content)}
              title="Edit"
              className="p-1 rounded transition-colors hover:bg-white/10"
            >
              <Pencil className="w-3.5 h-3.5" style={{ color: '#555555' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const QUICK_CHIPS = [
  'Find highest APR pools',
  'Analyze my portfolio',
  'Best strategy for $500',
  'Explain impermanent loss',
];

// Solana base58 public key: 32–44 chars, no 0/O/I/l
const SOLANA_WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Chat() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const initialSentRef = useRef(false);

  useEffect(() => {
    const toSave = messages.filter((m) => !m.isLoading);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function clearChat() {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loadingRef.current) return;

    // Append attachment info to text if a file is selected
    const fileName = attachedFile?.name;
    const fullText = fileName ? `${trimmed}\n[Attached: ${fileName}]` : trimmed;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: fullText,
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
    setAttachedFile(null);
    setLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const history = [
      ...messagesRef.current
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: fullText },
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
      const raw = err instanceof Error ? err.message : String(err);
      const isRateLimit = raw.includes('429') || raw.includes('rate_limit') || raw.toLowerCase().includes('rate limit');
      const errMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: isRateLimit
          ? 'AI is taking a short break due to high usage. Please try again in a few minutes.'
          : `Sorry, I ran into an error: ${raw}. Please check that the backend is running on port 3001.`,
        timestamp: new Date(),
        isRateLimit,
      };
      setMessages((prev) => {
        const without = prev.filter((m) => !m.isLoading);
        return [...without, errMsg];
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachedFile]);

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

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAttachedFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function handleEdit(text: string) {
    setInput(text);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        autoResize(inputRef.current);
      }
    });
  }

  const isEmpty = messages.length === 0;
  const hasEverSent = messages.length > 0;
  const walletMatch = SOLANA_WALLET_RE.test(input.trim()) ? input.trim() : null;
  const canSend = !loading && (input.trim().length > 0 || attachedFile !== null);

  return (
    <>
      <div className="flex flex-col h-[calc(100svh-5rem)]" style={{ maxWidth: '100%' }}>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 relative">
          {!isEmpty && (
            <div className="sticky top-0 z-10 flex justify-end max-w-3xl mx-auto mb-2">
              <button
                onClick={clearChat}
                className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:border-red-400/50 hover:text-red-400"
                style={{ color: '#555555', borderColor: '#1e1e1e', background: '#0a0a0a' }}
              >
                Clear Chat
              </button>
            </div>
          )}
          <div className="max-w-3xl mx-auto space-y-5">
            {isEmpty && (
              <div className="text-center pt-16 pb-8">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#00ff85' }}
                >
                  <Bot className="w-8 h-8" style={{ color: '#000000' }} />
                </div>
                <h2 className="text-white text-xl font-bold mb-2">LP Advisor</h2>
                <p className="text-sm max-w-sm mx-auto" style={{ color: '#888888' }}>
                  Ask me about pools, strategies, or paste your wallet to analyze positions.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-2 rounded-xl border transition-colors hover:border-[#00ff85]/50 hover:text-white"
                      style={{ color: '#888888', borderColor: '#1e1e1e', background: '#111111' }}
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
                onEdit={handleEdit}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Input bar ─────────────────────────────────────────────────────── */}
        <div
          className="border-t px-4 pt-3 pb-4"
          style={{ background: '#0a0a0a', borderColor: '#1e1e1e' }}
        >
          <div className="max-w-3xl mx-auto">

            {/* Quick chips — disappear after first message */}
            {!hasEverSent && (
              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setInput(chip);
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:bg-[#00ff85]/10 hover:border-[#00ff85]/60 hover:text-white"
                    style={{ color: '#888888', borderColor: '#00ff8540', background: '#00ff8508' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Attached file chip */}
              {attachedFile && (
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border"
                    style={{ background: '#1a1a1a', borderColor: '#333333', color: '#aaaaaa' }}
                  >
                    <Paperclip className="w-3 h-3" style={{ color: '#00ff85' }} />
                    <span className="max-w-[200px] truncate">{attachedFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="ml-0.5 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input box: [paperclip] [textarea] [send] in a single flex row */}
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors focus-within:border-[#00ff85]/60"
                style={{ background: '#111111', borderColor: '#1e1e1e' }}
              >
                {/* Paperclip / attach */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  className="shrink-0 p-1 rounded transition-colors hover:text-[#00ff85]"
                  style={{ color: '#555555' }}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Textarea */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResize(e.target);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about pools, strategies, or paste a wallet address…"
                  disabled={loading}
                  className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none resize-none leading-relaxed py-1.5"
                  style={{ minHeight: '56px', maxHeight: '200px' }}
                />

                {/* Send button — right side, vertically centered */}
                <button
                  type="submit"
                  disabled={!canSend}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all self-center"
                  style={{
                    background: canSend ? '#00ff85' : '#222222',
                    cursor: canSend ? 'pointer' : 'not-allowed',
                  }}
                >
                  {loading ? (
                    <div
                      className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                      style={{ borderColor: '#555555', borderTopColor: 'transparent' }}
                    />
                  ) : (
                    <Send
                      className="w-3.5 h-3.5"
                      style={{ color: canSend ? '#000000' : '#555555' }}
                    />
                  )}
                </button>
              </div>
            </form>

            {/* Wallet detection hint */}
            {walletMatch && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs" style={{ color: '#888888' }}>
                  Looks like a wallet address —
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/portfolio?wallet=${encodeURIComponent(walletMatch)}`)}
                  className="text-xs font-medium underline underline-offset-2 transition-colors hover:text-white"
                  style={{ color: '#00ff85' }}
                >
                  View Portfolio instead?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPool && (
        <AddLiquidityModal pool={selectedPool} onClose={() => setSelectedPool(null)} />
      )}
    </>
  );
}
