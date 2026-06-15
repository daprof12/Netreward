import { Buffer } from 'buffer';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const isElectron = window.navigator.userAgent.toLowerCase().includes('electron') || window.location.protocol === 'file:';
const Router = isElectron ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <App />
      </Router>
    </QueryClientProvider>
  </StrictMode>
);
