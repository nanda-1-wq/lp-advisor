import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bot, Wallet, Zap, ArrowRight } from 'lucide-react';

const QUICK_PROMPTS = [
  'I want to LP $500 on SOL/USDC with moderate risk',
  'Find me the highest APR pools on Solana right now',
  'What strategy should I use for volatile meme coins?',
  'Explain the difference between Spot, Curve, and BidAsk',
];

const FEATURES = [
  {
    Icon: Search,
    title: 'Pool Discovery',
    desc: 'AI scans hundreds of Meteora pools to find the best match for your capital and risk tolerance.',
  },
  {
    Icon: Bot,
    title: 'Smart Strategy',
    desc: 'Get personalized Spot, Curve, or BidAsk recommendations with exact price ranges.',
  },
  {
    Icon: Wallet,
    title: 'Portfolio Analysis',
    desc: 'Paste your wallet — AI gives you a plain-English health report on every open position.',
  },
  {
    Icon: Zap,
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
          style={{ color: '#00ff85', borderColor: '#00ff8530', background: '#00ff8510' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00ff85' }} />
          Powered by Meteora · LPAgent.io API
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-white mb-3 leading-tight">
          Your AI-Powered LP Advisor
        </h1>
        <h2 className="text-3xl sm:text-4xl font-bold mb-6" style={{ color: '#00ff85' }}>
          Built on LP Agent API
        </h2>

        <p className="text-xl max-w-2xl mx-auto mb-10" style={{ color: '#888888' }}>
          Describe your goals in plain English. AI discovers pools, recommends strategy &amp; price
          ranges, and executes — all in one conversation.
        </p>

        {/* Chat input */}
        <form onSubmit={handleChatSubmit} className="max-w-2xl mx-auto mb-4">
          <div className="flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#111111] focus-within:border-[#00ff85] focus-within:ring-1 focus-within:ring-[#00ff85] transition-all p-1.5">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="I want to LP $500 on SOL/USDC with moderate risk…"
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm px-3 py-2.5 outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 flex items-center gap-1.5 shrink-0"
              style={{ background: '#00ff85', color: '#000000' }}
            >
              Ask AI <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => navigate(`/chat?q=${encodeURIComponent(p)}`)}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-[#00ff85]/50 hover:text-white"
              style={{ color: '#888888', borderColor: '#1e1e1e', background: '#111111' }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 max-w-xs mx-auto mb-8">
          <div className="flex-1 h-px" style={{ background: '#1e1e1e' }} />
          <span className="text-xs" style={{ color: '#555555' }}>or check your portfolio</span>
          <div className="flex-1 h-px" style={{ background: '#1e1e1e' }} />
        </div>

        {/* Wallet input */}
        <form onSubmit={handleWalletSubmit} className="max-w-xl mx-auto">
          <div className="flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#111111] focus-within:border-[#00ff85] focus-within:ring-1 focus-within:ring-[#00ff85] transition-all p-1.5">
            <input
              type="text"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="Paste wallet address…"
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm px-3 py-2.5 outline-none font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-bold transition-colors border shrink-0"
              style={{ borderColor: '#00ff85', color: '#00ff85', background: 'transparent' }}
            >
              View Portfolio
            </button>
          </div>
        </form>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-16">
        {FEATURES.map(({ Icon, title, desc }) => (
          <div
            key={title}
            className="p-5 rounded-xl border border-[#1e1e1e] bg-[#111111] hover:border-[#00ff85] transition-colors cursor-default"
          >
            <Icon className="w-6 h-6 mb-3" style={{ color: '#00ff85' }} />
            <h3 className="text-white font-bold mb-1">{title}</h3>
            <p className="text-sm leading-relaxed text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
