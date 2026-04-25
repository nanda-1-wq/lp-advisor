import { StrictMode, Component } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import './index.css';
import App from './App.tsx';

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});
window.onerror = (msg, src, line, col, err) => {
  console.error('Global error:', msg, err);
};

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#ff4444', fontFamily: 'monospace', background: '#0a0a0a', minHeight: '100vh' }}>
          <h2 style={{ color: '#ffffff' }}>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#ff8888' }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string;

if (!PRIVY_APP_ID) {
  console.warn(
    '[Privy] VITE_PRIVY_APP_ID is not set. ' +
    'Get a free App ID at dashboard.privy.io and add it to .env'
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PrivyProvider
        appId={PRIVY_APP_ID || 'placeholder-set-vite-privy-app-id'}
        config={{
          loginMethods: ['wallet', 'email'],
          appearance: {
            theme: 'dark',
            accentColor: '#00ff85',
            logo: `${window.location.origin}/logo.svg`,
            landingHeader: 'Connect to LP Advisor',
            loginMessage: 'Select a wallet or sign in with email to continue',
          },
        }}
      >
        <App />
      </PrivyProvider>
    </ErrorBoundary>
  </StrictMode>,
);
