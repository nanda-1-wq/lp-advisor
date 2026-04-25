import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import './index.css';
import App from './App.tsx';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string;

if (!PRIVY_APP_ID) {
  console.warn(
    '[Privy] VITE_PRIVY_APP_ID is not set. ' +
    'Get a free App ID at dashboard.privy.io and add it to .env'
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
);
