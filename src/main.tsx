// Fix for "Cannot set property fetch of #<Window> which has only a getter"
// This must be at the absolute top before any other imports
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    if (originalFetch) {
      // Try to redefine fetch as a writable property so libraries can overwrite it without crashing
      Object.defineProperty(window, 'fetch', {
        value: originalFetch,
        writable: true,
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {
    // If we can't make it writable, try to define a setter that ignores assignments
    try {
      const originalFetch = window.fetch;
      Object.defineProperty(window, 'fetch', {
        get: () => originalFetch,
        set: () => { console.warn('Attempt to overwrite window.fetch ignored'); },
        configurable: true,
        enumerable: true
      });
    } catch (e2) {
      // If it's not configurable, we can't do anything to window.fetch
    }
  }
}

import { createRoot } from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import * as solanaWeb3 from '@solana/web3.js';
import App from './App.tsx';
import './index.css';
import '@solana/wallet-adapter-react-ui/styles.css';

// Define configuration outside the component to ensure absolute stability
const wallets = [new PhantomWalletAdapter()];
const endpoint = solanaWeb3.clusterApiUrl('devnet');

function Root() {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
