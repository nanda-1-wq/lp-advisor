import { Outlet, NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Home', exact: true },
  { to: '/chat', label: 'AI Advisor' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/history', label: 'History' },
];


export default function Layout() {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)', borderColor: '#1e1e1e' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <img src="/logo.svg" alt="LP Agent" className="h-9 w-9" />
            <span className="text-2xl font-black text-white tracking-tight">
              LP <span style={{ color: '#00ff85' }}>Advisor</span>
            </span>
          </NavLink>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? 'text-[#00ff85] bg-[#00ff85]/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Wallet button */}
          <button
            onClick={() => alert('Wallet connection available in full version')}
            className="px-5 py-2 rounded-full text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: '#00ff85', color: '#000000' }}
          >
            Connect Wallet
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className={`flex-1 ${isChatPage ? '' : 'max-w-7xl mx-auto w-full px-6 py-8'}`}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer
        className="border-t py-3 text-center"
        style={{ borderColor: '#1e1e1e', background: '#0a0a0a' }}
      >
        <span className="text-xs" style={{ color: '#555555' }}>
          Demo mode — mock data active · Built on{' '}
          <span style={{ color: '#00ff85' }}>LP Agent API</span>
        </span>
      </footer>

      {/* Mobile bottom nav */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 border-t flex"
        style={{ background: '#0a0a0a', borderColor: '#1e1e1e' }}
      >
        {NAV.map(({ to, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-xs font-medium transition-colors ${
                isActive ? 'text-[#00ff85]' : 'text-gray-500'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
