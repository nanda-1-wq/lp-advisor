import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QUICK_PROMPTS = [
  'I want to LP $500 on SOL/USDC with moderate risk',
  'Find me the highest APR pools on Solana right now',
  'What strategy should I use for volatile meme coins?',
  'Explain the difference between Spot, Curve, and BidAsk',
];

const FEATURES = [
  {
    icon: '🔍',
    title: 'Pool Discovery',
    desc: 'AI scans hundreds of Meteora pools to find the best match for your capital and risk tolerance.',
  },
  {
    icon: '🧠',
    title: 'Smart Strategy',
    desc: 'Get personalized Spot, Curve, or BidAsk recommendations with exact price ranges.',
  },
  {
    icon: '📊',
    title: 'Portfolio Analysis',
    desc: 'Paste your wallet — AI gives you a plain-English health report on every open position.',
  },
  {
    icon: '⚡',
    title: 'One-Click Execution',
    desc: 'Zap In or Zap Out with a single click. Signed and submitted via Jito for maximum success.',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState('');
  const [walletInput, setWalletInput] = useState('');

  function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q) return;
    navigate(`/chat?q=${encodeURIComponent(q)}`);
  }

  function handleWalletSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = walletInput.trim();
    if (!w) return;
    navigate(`/portfolio?wallet=${encodeURIComponent(w)}`);
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center pt-12 pb-10">
        <div
          className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border mb-6"
          style={{ color: '#10b981', borderColor: '#10b98130', background: '#10b98110' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Powered by Meteora · LPAgent.io API
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Your AI-Powered{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #10b981, #6366f1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            LP Advisor
          </span>
        </h1>

        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
          Describe your goals in plain English. AI discovers pools, recommends strategy &amp; price
          ranges, and executes — all in one conversation.
        </p>

        {/* Main CTA: Chat input */}
        <form onSubmit={handleChatSubmit} className="max-w-2xl mx-auto mb-4">
          <div
            className="flex items-center gap-2 p-2 rounded-xl border"
            style={{ background: '#12131a', borderColor: '#2a2d38' }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="I want to LP $500 on SOL/USDC with moderate risk…"
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm px-3 py-2 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              Ask AI →
            </button>
          </div>
        </form>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => navigate(`/chat?q=${encodeURIComponent(p)}`)}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-emerald-400/50 hover:text-white"
              style={{ color: '#9ca3af', borderColor: '#2a2d38', background: '#12131a' }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 max-w-xs mx-auto mb-8">
          <div className="flex-1 h-px" style={{ background: '#2a2d38' }} />
          <span className="text-xs text-gray-500">or check your portfolio</span>
          <div className="flex-1 h-px" style={{ background: '#2a2d38' }} />
        </div>

        {/* Wallet input */}
        <form onSubmit={handleWalletSubmit} className="max-w-xl mx-auto">
          <div
            className="flex items-center gap-2 p-2 rounded-xl border"
            style={{ background: '#12131a', borderColor: '#2a2d38' }}
          >
            <input
              type="text"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="Paste wallet address…"
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm px-3 py-2 outline-none font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: '#1e2228', color: '#9ca3af' }}
            >
              View Portfolio →
            </button>
          </div>
        </form>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-16">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="p-5 rounded-xl border"
            style={{ background: '#12131a', borderColor: '#1e2228' }}
          >
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="text-white font-medium mb-1">{f.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
