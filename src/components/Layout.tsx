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
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0b0e' }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(10,11,14,0.85)', backdropFilter: 'blur(12px)', borderColor: '#1e2228' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #10b981, #6366f1)' }}
            >
              LP
            </div>
            <span className="font-semibold text-white text-sm tracking-tight">
              LP<span className="text-emerald-400">Advisor</span>
            </span>
          </NavLink>

          {/* Links */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map(({ to, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'text-emerald-400 bg-emerald-400/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right: mock badge */}
          <div
            className="text-xs px-2 py-1 rounded-full border"
            style={{ color: '#f59e0b', borderColor: '#f59e0b40', background: '#f59e0b10' }}
          >
            MOCK MODE
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className={`flex-1 ${isChatPage ? '' : 'max-w-7xl mx-auto w-full px-4 sm:px-6 py-8'}`}>
        <Outlet />
      </main>

      {/* Mobile nav */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 border-t flex"
        style={{ background: '#0e0f14', borderColor: '#1e2228' }}
      >
        {NAV.map(({ to, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-xs transition-colors ${
                isActive ? 'text-emerald-400' : 'text-gray-500'
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
