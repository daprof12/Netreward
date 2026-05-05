import { useMemo, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

// Error boundary to prevent Solana adapter crashes from breaking the app
class WalletErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Solana Wallet] Provider failed to initialize:', error.message, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.children;
    }
    return this.props.children;
  }
}

// Lazy-loaded Solana providers to avoid blocking initial render
let SolanaProviders: React.ComponentType<{ children: ReactNode }> | null = null;

try {
  // Dynamic requires at module level — if any of these fail,
  // SolanaProviders stays null and we skip wallet features gracefully
  const { ConnectionProvider, WalletProvider } = await import('@solana/wallet-adapter-react');
  const { WalletModalProvider } = await import('@solana/wallet-adapter-react-ui');
  const { PhantomWalletAdapter, SolflareWalletAdapter } = await import('@solana/wallet-adapter-wallets');
  const { clusterApiUrl } = await import('@solana/web3.js');
  await import('@solana/wallet-adapter-react-ui/styles.css');

  function InnerSolanaProvider({ children }: { children: ReactNode }) {
    const network = 'mainnet-beta';
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);
    const wallets = useMemo(
      () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
      []
    );

    return (
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    );
  }

  SolanaProviders = InnerSolanaProvider;
} catch (e) {
  console.warn('[Solana Wallet] Failed to load wallet adapters:', e);
}

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  if (!SolanaProviders) {
    // Gracefully skip wallet features if adapters failed to load
    return <>{children}</>;
  }

  return (
    <WalletErrorBoundary>
      <SolanaProviders>{children}</SolanaProviders>
    </WalletErrorBoundary>
  );
}
