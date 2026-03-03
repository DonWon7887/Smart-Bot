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
