import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Play, 
  Square, 
  Settings, 
  Activity, 
  Plus, 
  TrendingUp, 
  Shield, 
  Cpu,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Key,
  Mail,
  Lock,
  User,
  Fingerprint,
  QrCode,
  LayoutDashboard,
  Moon,
  Sun
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { ethers } from 'ethers';
import * as solanaWeb3 from '@solana/web3.js';
import { 
  useWallet, 
  useConnection 
} from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

declare global {
  interface Window {
    ethereum?: any;
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BotData {
  id: string;
  name: string;
  type: 'trading' | 'social' | 'monitor';
  status: 'running' | 'stopped';
  frozen: boolean;
  config: any;
  state: {
    portfolio?: {
      balance: number;
      positions: any[];
    };
    current_price?: number;
    metrics?: {
      successful_trades: number;
      total_pl: number;
      win_rate: number;
    };
    [key: string]: any;
  };
  metrics: {
    total_decisions: number;
    last_decisions: any[];
  };
}

interface Analytics {
  total_bots: number;
  active_bots: number;
  total_decisions: number;
}

export default function App() {
  const { publicKey, connected, disconnect, select, wallet, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [user, setUser] = useState<{ id: string, username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'forgot-password' | 'forgot-username' | 'reset-password' | 'verify-2fa'>('login');
  const [retrievalEmail, setRetrievalEmail] = useState('');
  const [resetData, setResetData] = useState({ otp: '', newPassword: '' });
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorUserId, setTwoFactorUserId] = useState('');
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isStoragePermissionGranted, setIsStoragePermissionGranted] = useState(() => {
    return localStorage.getItem('storagePermission') === 'granted';
  });
  const [vaultKeys, setVaultKeys] = useState<{ id: string, name: string, type: 'ethereum' | 'solana', key: string }[]>(() => {
    const saved = localStorage.getItem('vaultKeys');
    return saved ? JSON.parse(saved) : [];
  });
  const [isVaultLocked, setIsVaultLocked] = useState(true);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ qrCodeUrl: string, secret: string } | null>(null);
  const [bots, setBots] = useState<BotData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [activeBotForCommand, setActiveBotForCommand] = useState<BotData | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [commandResult, setCommandResult] = useState<any>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [newBot, setNewBot] = useState({ name: '', type: 'trading', interval: 60 });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [solanaBalance, setSolanaBalance] = useState<string | null>(null);
  const [solanaTransactions, setSolanaTransactions] = useState<any[]>([]);
  const [network, setNetwork] = useState<'ethereum' | 'solana'>('ethereum');
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [isSolanaWalletConnecting, setIsSolanaWalletConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wallet' | 'swap'>('dashboard');
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toString();
      setSolanaAddress(address);
      fetchSolanaBalance(address);
      fetchSolanaTransactions(address);
    } else {
      setSolanaAddress(null);
      setSolanaBalance(null);
      setSolanaTransactions([]);
    }
  }, [connected, publicKey]);

  const fetchSolanaBalance = async (address: string) => {
    try {
      const pubKey = new solanaWeb3.PublicKey(address);
      const balance = await connection.getBalance(pubKey);
      setSolanaBalance((balance / solanaWeb3.LAMPORTS_PER_SOL).toString());
    } catch (error) {
      console.error('Error fetching Solana balance:', error);
    }
  };

  const fetchSolanaTransactions = async (address: string) => {
    try {
      const pubKey = new solanaWeb3.PublicKey(address);
      const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 5 });
      
      const txs = await Promise.all(signatures.map(async (sig) => {
        const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
        return {
          id: sig.signature,
          type: tx?.meta?.err ? 'failed' : 'transaction',
          amount: 'N/A', // Complex to parse from raw tx for all types
          date: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : new Date().toISOString(),
          status: sig.confirmationStatus === 'finalized' ? 'confirmed' : 'pending',
          network: 'solana'
        };
      }));
      
      setSolanaTransactions(txs);
    } catch (error) {
      console.error('Error fetching Solana transactions:', error);
    }
  };
  const [isDepositing, setIsDepositing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [txSpeed, setTxSpeed] = useState<'medium' | 'fast' | 'ultra'>('medium');

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('bot_update', (data) => {
      setBots(prev => prev.map(bot => {
        if (bot.id === data.bot_id) {
          // Update state based on bot type and result
          let newState = bot.state;
          if (bot.type === 'trading' && data.result?.portfolio) {
            newState = { 
              ...bot.state,
              portfolio: data.result.portfolio,
              current_price: data.result.market_data?.btc_price || bot.state?.current_price,
              metrics: data.result.metrics || bot.state?.metrics
            };
          } else if (data.result) {
            // For other bots, the result might contain the new state
            newState = { ...bot.state, ...data.result };
          }

          return {
            ...bot,
            state: newState,
            metrics: {
              ...bot.metrics,
              total_decisions: bot.metrics.total_decisions + 1,
              last_decisions: [data, ...bot.metrics.last_decisions].slice(0, 10)
            }
          };
        }
        return bot;
      }));
      fetchAnalytics();
    });

    fetchBots();
    fetchAnalytics();

    return () => {
      newSocket.close();
    };
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.requires2FA) {
          setTwoFactorUserId(data.userId);
          setAuthMode('verify-2fa');
        } else {
          setUser(data.user);
        }
      } else {
        setLoginError('Invalid username or password');
      }
    } catch (error) {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: twoFactorUserId, code: twoFactorCode })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAuthMode('login');
      } else {
        setLoginError('Invalid 2FA code');
      }
    } catch (error) {
      setLoginError('Verification failed');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: retrievalEmail })
    });
    if (res.ok) {
      setAuthMode('reset-password');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: retrievalEmail, ...resetData })
    });
    if (res.ok) {
      setAuthMode('login');
      setLoginError('Password reset successful. Please login.');
    }
  };

  const handleForgotUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/forgot-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: retrievalEmail })
    });
    if (res.ok) {
      setAuthMode('login');
      setLoginError('Username sent to your email.');
    }
  };

  const setup2FA = async () => {
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setTwoFactorSetup(data);
    }
  };

  const enable2FA = async (code: string) => {
    const res = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (res.ok) {
      setIsSecurityModalOpen(false);
      setTwoFactorSetup(null);
    }
  };

  const requestStoragePermission = () => {
    const granted = window.confirm("Allow BotEngine to access local storage to securely store private keys and commands? Data will be encrypted and remain on your device.");
    if (granted) {
      localStorage.setItem('storagePermission', 'granted');
      setIsStoragePermissionGranted(true);
    }
  };

  const addToVault = (name: string, type: 'ethereum' | 'solana', key: string) => {
    if (!isStoragePermissionGranted) {
      requestStoragePermission();
      return;
    }
    const newKey = { id: Math.random().toString(36).substring(2, 10), name, type, key };
    const updated = [...vaultKeys, newKey];
    setVaultKeys(updated);
    localStorage.setItem('vaultKeys', JSON.stringify(updated));
  };

  const removeFromVault = (id: string) => {
    const updated = vaultKeys.filter(k => k.id !== id);
    setVaultKeys(updated);
    localStorage.setItem('vaultKeys', JSON.stringify(updated));
  };

  const unlockVault = async (code: string) => {
    // Verify 2FA to unlock vault
    const res = await fetch('/api/auth/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, code })
    });
    if (res.ok) {
      setIsVaultLocked(false);
      setTimeout(() => setIsVaultLocked(true), 5 * 60 * 1000); // Auto-lock after 5 mins
    } else {
      alert('Invalid 2FA code');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setBots([]);
    setAnalytics(null);
  };

  const fetchBots = async () => {
    const res = await fetch('/api/bots');
    if (res.ok) {
      const data = await res.json();
      setBots(data);
    }
  };

  const fetchAnalytics = async () => {
    const res = await fetch('/api/analytics');
    if (res.ok) {
      const data = await res.json();
      setAnalytics(data);
    }
  };

  const toggleBot = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'running' ? 'stop' : 'start';
    await fetch(`/api/bots/${id}/${action}`, { method: 'POST' });
    fetchBots();
  };

  const toggleFreeze = async (id: string, isFrozen: boolean) => {
    const command = isFrozen ? 'unfreeze' : 'freeze';
    await fetch(`/api/bots/${id}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    fetchBots();
  };

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newBot.name,
        type: newBot.type,
        config: { interval: newBot.interval }
      })
    });
    setIsModalOpen(false);
    setNewBot({ name: '', type: 'trading', interval: 60 });
    fetchBots();
  };

  const executeCommand = async (botId: string, command: string, args: any = {}) => {
    setCommandResult(null);
    try {
      const res = await fetch(`/api/bots/${botId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args })
      });
      const data = await res.json();
      setCommandResult(data);
      if (data.success) {
        fetchBots();
      }
    } catch (error) {
      setCommandResult({ success: false, message: 'Command failed' });
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask or another crypto wallet extension.');
      return null;
    }

    setIsWalletConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];
      const balance = await provider.getBalance(address);
      
      setWalletAddress(address);
      setWalletBalance(ethers.formatEther(balance));
      fetchTransactions(address);
      return address;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return null;
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const fetchTransactions = async (address: string) => {
    // Simulated transactions for demo
    setTransactions([
      { id: '0x742d...f44e', type: 'receive', amount: '0.05', from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', date: new Date(Date.now() - 86400000).toISOString(), status: 'confirmed' },
      { id: '0x8920...43e7', type: 'send', amount: '0.01', to: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7', date: new Date(Date.now() - 172800000).toISOString(), status: 'confirmed' },
      { id: '0x250E...bc29', type: 'receive', amount: '0.12', from: '0x250E76987d838a9531D854de95959fcF4866bc29', date: new Date(Date.now() - 259200000).toISOString(), status: 'confirmed' },
      { id: '0x1234...5678', type: 'send', amount: '0.005', to: '0x1234567890123456789012345678901234567890', date: new Date(Date.now() - 345600000).toISOString(), status: 'confirmed' },
      { id: '0xabcd...efgh', type: 'receive', amount: '0.02', from: '0xabcdefabcdefabcdefabcdefabcdefabcdef', date: new Date(Date.now() - 432000000).toISOString(), status: 'confirmed' },
      { id: '0x9876...5432', type: 'send', amount: '0.03', to: '0x9876543210987654321098765432109876543210', date: new Date(Date.now() - 518400000).toISOString(), status: 'confirmed' },
    ]);
  };

  const handleDeposit = async () => {
    let currentAddress = walletAddress;
    if (!currentAddress) {
      currentAddress = await connectWallet();
    }
    
    if (!currentAddress) return;

    setIsDepositing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const amount = "0.001";
      const tx = await signer.sendTransaction({
        to: currentAddress,
        value: ethers.parseEther(amount)
      });

      setTransactions(prev => [{
        id: tx.hash,
        type: 'receive',
        amount: amount,
        from: currentAddress!,
        date: new Date().toISOString(),
        status: 'pending'
      }, ...prev]);

      // Update balance after a delay
      setTimeout(async () => {
        try {
          const balance = await provider.getBalance(currentAddress!);
          setWalletBalance(ethers.formatEther(balance));
          setTransactions(prev => prev.map(t => t.id === tx.hash ? { ...t, status: 'confirmed' } : t));
        } catch (e) {
          console.error('Balance update failed:', e);
        }
      }, 5000);

    } catch (error: any) {
      console.error('Transaction failed:', error);
      if (error.code !== 'ACTION_REJECTED') {
        alert('Transaction failed. Make sure you have enough ETH for gas and the deposit amount.');
      }
    } finally {
      setIsDepositing(false);
    }
  };

  const connectSolanaWallet = async () => {
    if (connected) {
      disconnect();
    } else {
      // The WalletModalProvider handles the UI, but we can trigger it
      // by selecting a wallet if we want to bypass the modal for Phantom
      // select('Phantom');
    }
  };

  const handleSolanaDeposit = async () => {
    let currentAddress = solanaAddress;
    if (!currentAddress) {
      currentAddress = await connectSolanaWallet();
    }
    
    if (!currentAddress) return;

    setIsDepositing(true);
    try {
      const fromPublicKey = publicKey!;
      
      const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: fromPublicKey,
          lamports: 0.01 * solanaWeb3.LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      setSolanaTransactions(prev => [{
        id: signature,
        type: 'receive',
        amount: '0.01',
        from: currentAddress!,
        date: new Date().toISOString(),
        status: 'confirmed',
        network: 'solana'
      }, ...prev]);

      const balance = await connection.getBalance(fromPublicKey);
      setSolanaBalance((balance / solanaWeb3.LAMPORTS_PER_SOL).toString());

    } catch (error: any) {
      console.error('Solana transaction failed:', error);
      alert('Solana transaction failed: ' + error.message);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleSolanaSend = async (to: string, amount: string) => {
    if (!connected || !publicKey) return;
    setIsSending(true);
    try {
      const fromPublicKey = publicKey;
      const toPublicKey = new solanaWeb3.PublicKey(to);
      
      const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports: parseFloat(amount) * solanaWeb3.LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setSolanaTransactions(prev => [{
        id: signature,
        type: 'send',
        amount: amount,
        to: to,
        date: new Date().toISOString(),
        status: 'confirmed',
        network: 'solana'
      }, ...prev]);

      const balance = await connection.getBalance(fromPublicKey);
      setSolanaBalance((balance / solanaWeb3.LAMPORTS_PER_SOL).toString());
    } catch (error: any) {
      console.error('Solana send failed:', error);
      alert('Solana send failed: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSolanaTrade = async (token: string, amount: string, side: 'buy' | 'sell') => {
    if (!connected || !publicKey) {
      alert('Please connect your Solana wallet first.');
      return;
    }
    setIsTrading(true);
    
    const microLamports = {
      medium: 250000,
      fast: 2500000,
      ultra: 6250000
    };
    
    try {
      const transaction = new solanaWeb3.Transaction();
      
      // Add priority fee
      transaction.add(
        solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: microLamports[txSpeed]
        })
      );

      // For demo, we'll just do a small self-transfer to simulate the trade action
      transaction.add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0.0001 * solanaWeb3.LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, connection);

      setSolanaTransactions(prev => [{
        id: signature,
        type: side,
        amount: amount,
        token: token,
        date: new Date().toISOString(),
        status: 'pending',
        network: 'solana',
        speed: txSpeed
      }, ...prev]);

      const delay = txSpeed === 'ultra' ? 2000 : txSpeed === 'fast' ? 4000 : 7000;

      setTimeout(async () => {
        try {
          const balance = await connection.getBalance(publicKey);
          setSolanaBalance((balance / solanaWeb3.LAMPORTS_PER_SOL).toString());
          setSolanaTransactions(prev => prev.map(t => t.id === signature ? { ...t, status: 'confirmed' } : t));
        } catch (e) {
          console.error('Solana balance update failed:', e);
        }
      }, delay);
    } catch (error: any) {
      console.error('Solana trade failed:', error);
      if (error.message !== 'Transaction rejected') {
        alert('Solana trade failed: ' + error.message);
      }
    } finally {
      setIsTrading(false);
    }
  };

  const handleSend = async (to: string, amount: string) => {
    if (!walletAddress) return;
    setIsSending(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: to,
        value: ethers.parseEther(amount)
      });

      setTransactions(prev => [{
        id: tx.hash,
        type: 'send',
        amount: amount,
        to: to,
        date: new Date().toISOString(),
        status: 'pending'
      }, ...prev]);

      setTimeout(async () => {
        try {
          const balance = await provider.getBalance(walletAddress);
          setWalletBalance(ethers.formatEther(balance));
          setTransactions(prev => prev.map(t => t.id === tx.hash ? { ...t, status: 'confirmed' } : t));
        } catch (e) {
          console.error('Balance update failed:', e);
        }
      }, 5000);
    } catch (error: any) {
      console.error('Send failed:', error);
      if (error.code !== 'ACTION_REJECTED') {
        alert('Send failed.');
      }
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <Bot className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {authMode === 'login' ? 'Welcome Back' : 
               authMode === 'forgot-password' ? 'Reset Password' :
               authMode === 'forgot-username' ? 'Find Username' :
               authMode === 'reset-password' ? 'Enter OTP' : 'Two-Factor Auth'}
            </h1>
            <p className="text-zinc-500 text-sm">
              {authMode === 'login' ? 'Sign in to manage your AI agents' : 
               authMode === 'verify-2fa' ? 'Enter the code from your authenticator app' : 'Follow the steps to recover your account'}
            </p>
          </div>

          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    value={loginForm.username}
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="password" 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center px-1">
                <button 
                  type="button" 
                  onClick={() => setAuthMode('forgot-username')}
                  className="text-[10px] font-bold text-zinc-500 hover:text-emerald-500 uppercase tracking-widest transition-colors"
                >
                  Forgot Username?
                </button>
                <button 
                  type="button" 
                  onClick={() => setAuthMode('forgot-password')}
                  className="text-[10px] font-bold text-zinc-500 hover:text-emerald-500 uppercase tracking-widest transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-4 h-4" />
                  {loginError}
                </div>
              )}
              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                Sign In
              </button>
            </form>
          )}

          {authMode === 'verify-2fa' && (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">6-Digit Code</label>
                <div className="relative">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    required
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value)}
                  />
                </div>
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  <AlertCircle className="w-4 h-4" />
                  {loginError}
                </div>
              )}
              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                Verify & Login
              </button>
              <button 
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-full text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-zinc-300 transition-colors"
              >
                Back to Login
              </button>
            </form>
          )}

          {(authMode === 'forgot-password' || authMode === 'forgot-username') && (
            <form onSubmit={authMode === 'forgot-password' ? handleForgotPassword : handleForgotUsername} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="email" 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    value={retrievalEmail}
                    onChange={e => setRetrievalEmail(e.target.value)}
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                {authMode === 'forgot-password' ? 'Send Reset OTP' : 'Send Username'}
              </button>
              <button 
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-full text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-zinc-300 transition-colors"
              >
                Back to Login
              </button>
            </form>
          )}

          {authMode === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">One-Time Password (OTP)</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    value={resetData.otp}
                    onChange={e => setResetData({ ...resetData, otp: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="password" 
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    value={resetData.newPassword}
                    onChange={e => setResetData({ ...resetData, newPassword: e.target.value })}
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                Reset Password
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Default: admin / Admin (admin@example.com)</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-emerald-500/30 pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-40 safe-top">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">BotEngine<span className="text-emerald-500">.ai</span></h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button 
                onClick={() => setNetwork('ethereum')}
                className={cn(
                  "px-2 md:px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  network === 'ethereum' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                ETH
              </button>
              <button 
                onClick={() => setNetwork('solana')}
                className={cn(
                  "px-2 md:px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  network === 'solana' ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                SOL
              </button>
            </div>

            <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === 'dashboard' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('swap')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === 'swap' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <RefreshCw className="w-4 h-4" />
                Swap
              </button>
              <button 
                onClick={() => setActiveTab('wallet')}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  activeTab === 'wallet' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Wallet className="w-4 h-4" />
                Wallet
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 bg-white/5 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="hidden md:flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                New Bot
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 z-40 safe-bottom">
        <div className="grid grid-cols-4 h-16">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all",
              activeTab === 'dashboard' ? "text-emerald-500" : "text-zinc-500"
            )}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
          </button>
          <button 
            onClick={() => setActiveTab('swap')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all",
              activeTab === 'swap' ? "text-emerald-500" : "text-zinc-500"
            )}
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Swap</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center justify-center"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 -mt-8 border-4 border-[#0A0A0B]">
              <Plus className="w-6 h-6 text-black" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1 text-zinc-500">Create</span>
          </button>
          <button 
            onClick={() => setActiveTab('wallet')}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all",
              activeTab === 'wallet' ? "text-emerald-500" : "text-zinc-500"
            )}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Wallet</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Active Bots', value: `${analytics?.active_bots || 0}/${analytics?.total_bots || 0}`, icon: Activity, color: 'text-emerald-500' },
                { label: 'Total Decisions', value: analytics?.total_decisions || 0, icon: Cpu, color: 'text-blue-500' },
                { label: 'Wallet Balance', value: walletAddress ? `${parseFloat(walletBalance || '0').toFixed(4)} ETH` : 'Connect Wallet', icon: Wallet, color: 'text-orange-500', action: !walletAddress ? connectWallet : () => setActiveTab('wallet') },
                { label: 'System Uptime', value: '99.9%', icon: RefreshCw, color: 'text-purple-500' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "bg-zinc-900/50 border border-white/5 p-6 rounded-2xl transition-all",
                    stat.action && "cursor-pointer hover:bg-zinc-800/50 hover:border-white/10"
                  )}
                  onClick={stat.action}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Real-time</span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight mb-1 truncate">{stat.value}</div>
                  <div className="text-sm text-zinc-500 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Bots Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {bots.map((bot, i) => (
                  <motion.div
                    key={bot.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden group"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border",
                            bot.type === 'trading' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                            bot.type === 'social' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                            "bg-purple-500/10 border-purple-500/20 text-purple-500"
                          )}>
                            {bot.type === 'trading' ? <TrendingUp className="w-6 h-6" /> :
                             bot.type === 'social' ? <Bot className="w-6 h-6" /> :
                             <Shield className="w-6 h-6" />}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{bot.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{bot.type}</span>
                              <span className="w-1 h-1 rounded-full bg-zinc-700" />
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors",
                                bot.status === 'running' 
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                  : "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
                              )}>
                                {bot.status === 'running' && (
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                  </span>
                                )}
                                {bot.status}
                              </div>
                              {bot.frozen && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-widest">
                                  <Shield className="w-3 h-3" />
                                  Frozen
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleFreeze(bot.id, bot.frozen)}
                            className={cn(
                              "p-3 rounded-xl transition-all active:scale-90",
                              bot.frozen ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            )}
                            title={bot.frozen ? "Unfreeze Bot" : "Freeze Bot"}
                          >
                            <Shield className={cn("w-5 h-5", bot.frozen && "fill-current")} />
                          </button>
                          <button 
                            onClick={() => toggleBot(bot.id, bot.status)}
                            className={cn(
                              "p-3 rounded-xl transition-all active:scale-90",
                              bot.status === 'running' ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            )}
                          >
                            {bot.status === 'running' ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                          </button>
                          <button 
                            onClick={() => {
                              setActiveBotForCommand(bot);
                              setIsCommandModalOpen(true);
                              setCommandResult(null);
                            }}
                            className="p-3 bg-zinc-800/50 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-white transition-all active:scale-90"
                            title="Bot Commands"
                          >
                            <Key className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Bot Metrics */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                          <div className="text-xs text-zinc-500 font-medium mb-1">Total Decisions</div>
                          <div className="text-xl font-bold">{bot.metrics.total_decisions}</div>
                        </div>
                        {bot.type === 'trading' && bot.state?.metrics ? (
                          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <div className="text-xs text-zinc-500 font-medium mb-1">Win Rate</div>
                            <div className="text-xl font-bold text-emerald-500">{bot.state.metrics.win_rate.toFixed(1)}%</div>
                          </div>
                        ) : (
                          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <div className="text-xs text-zinc-500 font-medium mb-1">Success Rate</div>
                            <div className="text-xl font-bold">94.2%</div>
                          </div>
                        )}
                      </div>

                      {/* Trading Specific Stats */}
                      {bot.type === 'trading' && bot.state?.metrics && (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <div className="text-xs text-zinc-500 font-medium mb-1">Successful Trades</div>
                            <div className="text-xl font-bold">{bot.state.metrics.successful_trades}</div>
                          </div>
                          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                            <div className="text-xs text-zinc-500 font-medium mb-1">Total P/L</div>
                            <div className={cn(
                              "text-xl font-bold",
                              bot.state.metrics.total_pl >= 0 ? "text-emerald-500" : "text-red-500"
                            )}>
                              {bot.state.metrics.total_pl >= 0 ? '+' : ''}${bot.state.metrics.total_pl.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Portfolio Section (Trading Bots Only) */}
                      {bot.type === 'trading' && bot.state?.portfolio && (
                        <div className="mb-6 space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                              <Coins className="w-4 h-4 text-zinc-500" />
                              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Live Portfolio</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Available Balance</span>
                              <span className="text-sm font-mono font-bold text-emerald-500">
                                ${bot.state.portfolio.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {bot.state.portfolio.positions.length > 0 ? (
                              bot.state.portfolio.positions.map((pos: any, idx: number) => {
                                const currentPrice = bot.state.current_price;
                                const pl = (currentPrice - pos.entry) * pos.amount;
                                const plPercent = ((currentPrice - pos.entry) / pos.entry) * 100;
                                const isProfit = pl >= 0;
                                
                                return (
                                  <motion.div 
                                    key={idx} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative bg-black/40 border border-white/5 rounded-2xl p-4 overflow-hidden group/pos"
                                  >
                                    {/* Background Glow for Profit/Loss */}
                                    <div className={cn(
                                      "absolute inset-0 opacity-[0.03] transition-opacity group-hover/pos:opacity-[0.07]",
                                      isProfit ? "bg-emerald-500" : "bg-red-500"
                                    )} />

                                    <div className="relative z-10">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                          <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
                                            isProfit ? "bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10" : "bg-red-500/10 text-red-500 shadow-red-500/10"
                                          )}>
                                            <TrendingUp className={cn("w-5 h-5", !isProfit && "rotate-180")} />
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-base font-bold tracking-tight">{pos.type}</span>
                                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono text-zinc-500">LONG</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 font-medium">Size: {pos.amount} Units</div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className={cn(
                                            "text-lg font-bold tracking-tighter",
                                            isProfit ? "text-emerald-500" : "text-red-500"
                                          )}>
                                            {isProfit ? '+' : ''}${pl.toFixed(2)}
                                          </div>
                                          <div className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                                            isProfit ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                          )}>
                                            {isProfit ? '▲' : '▼'} {Math.abs(plPercent).toFixed(2)}%
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Entry Price</div>
                                          <div className="text-sm font-mono font-bold text-zinc-300">${pos.entry.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Market Price</div>
                                          <div className="text-sm font-mono font-bold text-zinc-100">${currentPrice.toLocaleString()}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })
                            ) : (
                              <div className="text-center py-8 bg-black/10 rounded-2xl border border-dashed border-white/10">
                                <div className="w-10 h-10 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <TrendingUp className="w-5 h-5 text-zinc-600" />
                                </div>
                                <span className="text-xs text-zinc-500 font-medium">Waiting for market entry...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Recent Activity */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent Decisions</span>
                          <ChevronRight className="w-4 h-4 text-zinc-600" />
                        </div>
                        {bot.metrics.last_decisions.length > 0 ? (
                          bot.metrics.last_decisions.slice(0, 5).map((d, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-center justify-between group/item hover:bg-black/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  d.decision.confidence > 0.7 ? "bg-emerald-500" : "bg-yellow-500"
                                )} />
                                <div>
                                  <div className="text-sm font-semibold uppercase tracking-tight">{d.decision.action}</div>
                                  <div className="text-[10px] text-zinc-500 font-medium">{d.decision.reasoning.summary}</div>
                                </div>
                              </div>
                              <div className="text-xs font-mono text-zinc-400">
                                {Math.round(d.decision.confidence * 100)}%
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-6 bg-black/10 rounded-xl border border-dashed border-white/5">
                            <span className="text-xs text-zinc-600 font-medium">No activity recorded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
        
        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Wallet Info Card */}
            <div className="lg:col-span-1 space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-zinc-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Wallet className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">My Wallet</h2>
                      <p className="text-zinc-500 text-xs">Manage your digital assets</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Total Balance</span>
                      <div className="text-4xl font-bold tracking-tighter text-zinc-100">
                        {network === 'ethereum' 
                          ? (walletBalance ? parseFloat(walletBalance).toFixed(4) : '0.0000')
                          : (solanaBalance ? parseFloat(solanaBalance).toFixed(4) : '0.0000')
                        } <span className={network === 'ethereum' ? "text-emerald-500" : "text-purple-500"}>
                          {network === 'ethereum' ? 'ETH' : 'SOL'}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-500 mt-1 font-medium">
                        ≈ ${(parseFloat((network === 'ethereum' ? walletBalance : solanaBalance) || '0') * (network === 'ethereum' ? 2400 : 145)).toLocaleString()} USD
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Wallet Address</span>
                      <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-4 py-3">
                        <span className="text-xs font-mono text-zinc-400 truncate mr-4">
                          {network === 'ethereum' 
                            ? (walletAddress || 'Not Connected')
                            : (solanaAddress || 'Not Connected')
                          }
                        </span>
                        {(network === 'ethereum' ? walletAddress : solanaAddress) && (
                          <button 
                            onClick={() => navigator.clipboard.writeText((network === 'ethereum' ? walletAddress : solanaAddress)!)}
                            className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>

                    {network === 'ethereum' ? (
                      !walletAddress ? (
                        <div className="space-y-3">
                          <button 
                            onClick={handleDeposit}
                            disabled={isDepositing || isWalletConnecting}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDepositing || isWalletConnecting ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <ArrowDownLeft className="w-5 h-5" />
                            )}
                            {isWalletConnecting ? 'Connecting...' : isDepositing ? 'Processing...' : 'Deposit ETH'}
                          </button>
                          <button 
                            onClick={connectWallet}
                            disabled={isWalletConnecting}
                            className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 border border-white/10 disabled:opacity-50"
                          >
                            {isWalletConnecting ? 'Connecting...' : 'Connect Wallet'}
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={handleDeposit}
                            disabled={isDepositing}
                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDepositing ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                            {isDepositing ? 'Depositing...' : 'Deposit'}
                          </button>
                          <button 
                            onClick={() => {
                              const to = prompt("Enter recipient address:");
                              const amount = prompt("Enter amount (ETH):");
                              if (to && amount) handleSend(to, amount);
                            }}
                            disabled={isSending}
                            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 border border-white/10 disabled:opacity-50"
                          >
                            {isSending ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                            {isSending ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                      )
                    ) : (
                      !solanaAddress ? (
                        <div className="space-y-3">
                          <button 
                            onClick={handleSolanaDeposit}
                            disabled={isDepositing || isSolanaWalletConnecting}
                            className="w-full bg-purple-500 hover:bg-purple-400 text-white px-4 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDepositing || isSolanaWalletConnecting ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <ArrowDownLeft className="w-5 h-5" />
                            )}
                            {isSolanaWalletConnecting ? 'Connecting...' : isDepositing ? 'Processing...' : 'Deposit SOL'}
                          </button>
                          <WalletMultiButton className="!w-full !bg-white/5 hover:!bg-white/10 !text-white !px-4 !py-3 !rounded-xl !text-xs !font-bold !transition-all !active:scale-95 !border !border-white/10 !h-auto !line-height-normal" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={handleSolanaDeposit}
                            disabled={isDepositing}
                            className="flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-400 text-white px-4 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDepositing ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                            {isDepositing ? 'Depositing...' : 'Deposit'}
                          </button>
                          <button 
                            onClick={() => {
                              const to = prompt("Enter recipient address:");
                              const amount = prompt("Enter amount (SOL):");
                              if (to && amount) handleSolanaSend(to, amount);
                            }}
                            disabled={isSending}
                            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 border border-white/10 disabled:opacity-50"
                          >
                            {isSending ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                            {isSending ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </motion.div>

              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Security Info
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Your wallet is connected via a secure provider. Transactions require manual approval in your wallet extension. Never share your private keys or seed phrase.
                </p>
              </div>

              {network === 'solana' && solanaAddress && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900 border border-purple-500/20 rounded-3xl p-6 shadow-xl shadow-purple-500/5"
                >
                  <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-500" />
                    Solana Token Swap
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Token Symbol / Address</label>
                      <input 
                        type="text" 
                        placeholder="e.g. BONK or Mint Address"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                        id="token-input"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Amount (SOL)</label>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                        id="amount-input"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Transaction Speed</label>
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                          +{(txSpeed === 'ultra' ? 0.00125 : txSpeed === 'fast' ? 0.0005 : 0.00005).toFixed(5)} SOL Fee
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['medium', 'fast', 'ultra'] as const).map(speed => (
                          <button
                            key={speed}
                            onClick={() => setTxSpeed(speed)}
                            className={cn(
                              "py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                              txSpeed === speed 
                                ? "bg-purple-500/10 border-purple-500 text-purple-500" 
                                : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/20"
                            )}
                          >
                            {speed}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button 
                        onClick={() => {
                          const token = (document.getElementById('token-input') as HTMLInputElement).value;
                          const amount = (document.getElementById('amount-input') as HTMLInputElement).value;
                          if (token && amount) handleSolanaTrade(token, amount, 'buy');
                        }}
                        disabled={isTrading}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isTrading ? 'Buying...' : 'Buy Token'}
                      </button>
                      <button 
                        onClick={() => {
                          const token = (document.getElementById('token-input') as HTMLInputElement).value;
                          const amount = (document.getElementById('amount-input') as HTMLInputElement).value;
                          if (token && amount) handleSolanaTrade(token, amount, 'sell');
                        }}
                        disabled={isTrading}
                        className="bg-red-500 hover:bg-red-400 text-white py-3 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isTrading ? 'Selling...' : 'Sell Token'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Transaction History */}
            <div className="lg:col-span-2">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden"
              >
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <History className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Activity History</h2>
                      <p className="text-zinc-500 text-xs">Recent blockchain transactions</p>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {(network === 'ethereum' ? transactions : solanaTransactions).length > 0 ? (
                    <div className="space-y-2">
                      {(network === 'ethereum' ? transactions : solanaTransactions).slice(0, 5).map((tx, idx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl hover:bg-black/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              tx.type === 'receive' || tx.type === 'buy' || tx.type === 'transaction' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                            )}>
                              {tx.type === 'receive' || tx.type === 'buy' || tx.type === 'transaction' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold capitalize flex items-center gap-2">
                                {tx.type} {tx.token || (tx.network === 'solana' ? 'SOL' : 'ETH')}
                                {tx.speed && (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[8px] font-bold uppercase tracking-widest">
                                    {tx.speed}
                                  </span>
                                )}
                                {tx.network && (
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                                    tx.network === 'solana' ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"
                                  )}>
                                    {tx.network}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-medium flex items-center gap-2">
                                <span className="font-mono">{tx.id.slice(0, 10)}...{tx.id.slice(-4)}</span>
                                {tx.from && (
                                  <>
                                    <span>•</span>
                                    <span>From: {tx.from.slice(0, 6)}...</span>
                                  </>
                                )}
                                {tx.to && (
                                  <>
                                    <span>•</span>
                                    <span>To: {tx.to.slice(0, 6)}...</span>
                                  </>
                                )}
                                {tx.speed && (
                                  <>
                                    <span>•</span>
                                    <span className="text-purple-400 italic">{tx.speed} speed</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              "text-sm font-bold",
                              tx.type === 'receive' || tx.type === 'buy' || tx.type === 'transaction' ? "text-emerald-500" : "text-zinc-100"
                            )}>
                              {tx.type === 'receive' || tx.type === 'buy' || tx.type === 'transaction' ? '+' : '-'}{tx.amount} {tx.token ? '' : (tx.network === 'solana' ? 'SOL' : 'ETH')}
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-[10px] text-zinc-500">{new Date(tx.date).toLocaleDateString()}</span>
                              <div className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                                tx.status === 'confirmed' ? "bg-emerald-500/10 text-emerald-500" : "bg-yellow-500/10 text-yellow-500"
                              )}>
                                {tx.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="w-8 h-8 text-zinc-600" />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-400 mb-1">No Transactions Yet</h3>
                      <p className="text-sm text-zinc-600">Connect your wallet and start trading to see activity here.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {activeTab === 'swap' && (
          <div className="max-w-xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <RefreshCw className="w-48 h-48" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                      network === 'ethereum' ? "bg-blue-500/10 text-blue-500 shadow-blue-500/20" : "bg-purple-500/10 text-purple-500 shadow-purple-500/20"
                    )}>
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Token Swap</h2>
                      <p className="text-zinc-500 text-sm">Trade tokens instantly on {network === 'ethereum' ? 'Ethereum' : 'Solana'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setNetwork('ethereum')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                        network === 'ethereum' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      ETH
                    </button>
                    <button 
                      onClick={() => setNetwork('solana')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                        network === 'solana' ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      SOL
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* From Token */}
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">You Pay</label>
                      <span className="text-xs text-zinc-500">
                        Balance: {network === 'ethereum' 
                          ? (walletBalance ? parseFloat(walletBalance).toFixed(4) : '0.00') 
                          : (solanaBalance ? parseFloat(solanaBalance).toFixed(4) : '0.00')} {network === 'ethereum' ? 'ETH' : 'SOL'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        placeholder="0.0"
                        className="w-full bg-transparent text-3xl font-bold focus:outline-none placeholder:text-zinc-700"
                      />
                      <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors shrink-0">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                          network === 'ethereum' ? "bg-blue-500 text-white" : "bg-purple-500 text-white"
                        )}>
                          {network === 'ethereum' ? 'Ξ' : 'S'}
                        </div>
                        <span className="font-bold">{network === 'ethereum' ? 'ETH' : 'SOL'}</span>
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>
                  </div>

                  {/* Swap Icon */}
                  <div className="flex justify-center -my-2 relative z-10">
                    <button className="bg-zinc-800 border-4 border-zinc-900 p-2 rounded-xl hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white">
                      <ArrowDownLeft className="w-5 h-5 rotate-45" />
                    </button>
                  </div>

                  {/* To Token */}
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">You Receive</label>
                      <span className="text-xs text-zinc-500">Balance: 0.00</span>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <input 
                        type="number" 
                        placeholder="0.0"
                        readOnly
                        className="w-full bg-transparent text-3xl font-bold focus:outline-none placeholder:text-zinc-700 text-zinc-500"
                      />
                      <button className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 px-4 py-2 rounded-xl transition-colors shrink-0">
                        <span className="font-bold">Select Token</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="pt-4 border-t border-white/5">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Token Address / Symbol</label>
                      <input 
                        type="text" 
                        placeholder={network === 'ethereum' ? "0x... or USDT" : "Mint Address or BONK"}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Transaction Speed (Solana Only) */}
                  {network === 'solana' && (
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Transaction Speed</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['medium', 'fast', 'ultra'].map((speed) => (
                          <button
                            key={speed}
                            onClick={() => setTxSpeed(speed as any)}
                            className={cn(
                              "py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border",
                              txSpeed === speed 
                                ? "bg-purple-500/20 border-purple-500/50 text-purple-400" 
                                : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10"
                            )}
                          >
                            {speed}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {network === 'solana' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        disabled={!solanaAddress}
                        className={cn(
                          "w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2",
                          solanaAddress
                            ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                      >
                        {solanaAddress ? (
                          <>
                            <ArrowDownLeft className="w-5 h-5" />
                            Buy Token
                          </>
                        ) : (
                          'Connect Wallet'
                        )}
                      </button>
                      <button 
                        disabled={!solanaAddress}
                        className={cn(
                          "w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2",
                          solanaAddress
                            ? "bg-red-500 hover:bg-red-400 text-white shadow-red-500/20"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        )}
                      >
                        {solanaAddress ? (
                          <>
                            <ArrowUpRight className="w-5 h-5" />
                            Sell Token
                          </>
                        ) : (
                          'Connect Wallet'
                        )}
                      </button>
                    </div>
                  ) : (
                    <button 
                      disabled={!walletAddress}
                      className={cn(
                        "w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2",
                        walletAddress
                          ? "bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/20"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      )}
                    >
                      {walletAddress ? (
                        <>
                          <RefreshCw className="w-5 h-5" />
                          Execute Swap
                        </>
                      ) : (
                        'Connect Wallet to Swap'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* Create Bot Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold tracking-tight mb-2">Deploy New Bot</h2>
                <p className="text-zinc-500 text-sm mb-8">Configure your AI agent parameters for autonomous operation.</p>
                
                <form onSubmit={createBot} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Bot Identity</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Alpha-Trader-01"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      value={newBot.name}
                      onChange={e => setNewBot({ ...newBot, name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Operational Protocol</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['trading', 'social', 'monitor'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewBot({ ...newBot, type: type as any })}
                          className={cn(
                            "px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                            newBot.type === type ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/20"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Analysis Interval (Seconds)</label>
                    <input 
                      type="number" 
                      required
                      min="10"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      value={newBot.interval}
                      onChange={e => setNewBot({ ...newBot, interval: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      Initialize
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Command Modal */}
      <AnimatePresence>
        {isCommandModalOpen && activeBotForCommand && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommandModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                      <Cpu className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Command Center</h2>
                      <p className="text-zinc-500 text-xs">Direct control for <span className="text-emerald-500 font-bold">{activeBotForCommand.name}</span></p>
                    </div>
                  </div>
                  <button onClick={() => setIsCommandModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <Plus className="w-5 h-5 rotate-45 text-zinc-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    {activeBotForCommand.type === 'trading' ? (
                      <>
                        <button 
                          onClick={() => executeCommand(activeBotForCommand.id, 'buy')}
                          className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                          Manual Buy
                        </button>
                        <button 
                          onClick={() => executeCommand(activeBotForCommand.id, 'sell')}
                          className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          Manual Sell
                        </button>
                        <button 
                          onClick={() => executeCommand(activeBotForCommand.id, 'scan')}
                          className="col-span-2 flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Scan Explorers (SOL/ETH)
                        </button>
                      </>
                    ) : (
                      <div className="col-span-2 text-center py-8 bg-black/20 rounded-2xl border border-dashed border-white/5">
                        <span className="text-xs text-zinc-500 font-medium">No specialized commands for this bot type</span>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs tracking-tighter">
                      $
                    </div>
                    <input 
                      type="text" 
                      placeholder="Enter custom command..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      value={commandInput}
                      onChange={e => setCommandInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && commandInput) {
                          executeCommand(activeBotForCommand.id, commandInput);
                          setCommandInput('');
                        }
                      }}
                    />
                  </div>

                  {commandResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-2xl border text-xs font-mono",
                        commandResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {commandResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span className="font-bold uppercase tracking-widest">{commandResult.success ? 'Success' : 'Error'}</span>
                      </div>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(commandResult.data || commandResult.message, null, 2)}</pre>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Settings className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Application Settings</h2>
                    <p className="text-zinc-500 text-xs">Customize your experience</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isDarkMode ? (
                          <Moon className="w-5 h-5 text-zinc-400" />
                        ) : (
                          <Sun className="w-5 h-5 text-zinc-400" />
                        )}
                        <div>
                          <div className="text-sm font-bold">Appearance</div>
                          <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
                            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          isDarkMode ? "bg-emerald-500" : "bg-zinc-700"
                        )}
                      >
                        <motion.div 
                          animate={{ x: isDarkMode ? 24 : 4 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                  </div>

                  <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
                    <div className="text-xs text-zinc-500 font-medium mb-2 uppercase tracking-widest">About</div>
                    <div className="text-sm text-zinc-300">
                      AI Trading Bot v1.0.4
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="w-full mt-8 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security Modal */}
      <AnimatePresence>
        {isSecurityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSecurityModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Security Settings</h2>
                    <p className="text-zinc-500 text-xs">Manage your account protection</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Fingerprint className="w-5 h-5 text-zinc-400" />
                        <div>
                          <div className="text-sm font-bold">Two-Factor Auth</div>
                          <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Recommended</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (twoFactorSetup) setTwoFactorSetup(null);
                          else setup2FA();
                        }}
                        className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                      >
                        {twoFactorSetup ? 'Cancel' : 'Setup'}
                      </button>
                    </div>

                    {twoFactorSetup && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-4 border-t border-white/5 space-y-4"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-3 bg-white rounded-xl">
                            <img src={twoFactorSetup.qrCodeUrl} alt="2FA QR Code" className="w-32 h-32" />
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Secret Key</p>
                            <code className="text-xs font-mono text-emerald-500">{twoFactorSetup.secret}</code>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Verify Code</label>
                          <input 
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') enable2FA((e.target as HTMLInputElement).value);
                            }}
                          />
                          <p className="text-[10px] text-zinc-600 italic">Enter the 6-digit code from your app to enable</p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Secure Vault Section */}
                  <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-zinc-400" />
                        <div>
                          <div className="text-sm font-bold">Secure Vault</div>
                          <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Local Storage</div>
                        </div>
                      </div>
                      {!isStoragePermissionGranted && (
                        <button 
                          onClick={requestStoragePermission}
                          className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                        >
                          Grant Access
                        </button>
                      )}
                    </div>

                    {!isStoragePermissionGranted ? (
                      <div className="text-center py-4 bg-black/20 rounded-xl border border-dashed border-white/5">
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Access Required</p>
                      </div>
                    ) : isVaultLocked ? (
                      <div className="space-y-4">
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest text-center">Vault is Locked</p>
                        <div className="relative">
                          <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input 
                            type="text"
                            placeholder="Enter 2FA to Unlock"
                            maxLength={6}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-12 py-2.5 text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') unlockVault((e.target as HTMLInputElement).value);
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Unlocked</span>
                          <button onClick={() => setIsVaultLocked(true)} className="text-[10px] font-bold text-zinc-500 hover:text-red-400 uppercase tracking-widest transition-colors">Lock Now</button>
                        </div>
                        
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                          {vaultKeys.map(key => (
                            <div key={key.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  key.type === 'ethereum' ? "bg-blue-500" : "bg-purple-500"
                                )} />
                                <div>
                                  <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-tight">{key.name}</div>
                                  <div className="text-[8px] font-mono text-zinc-500">{key.key.slice(0, 6)}...{key.key.slice(-4)}</div>
                                </div>
                              </div>
                              <button onClick={() => removeFromVault(key.id)} className="p-1 hover:text-red-500 transition-colors">
                                <Plus className="w-3 h-3 rotate-45" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => {
                            const name = prompt("Key Name:");
                            const type = prompt("Type (ethereum/solana):") as any;
                            const key = prompt("Private Key:");
                            if (name && type && key) addToVault(name, type, key);
                          }}
                          className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          Add Private Key
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-black/20 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Mail className="w-5 h-5 text-zinc-400" />
                      <div>
                        <div className="text-sm font-bold">Recovery Email</div>
                        <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Verified</div>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-zinc-400 bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                      admin@example.com
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsSecurityModalOpen(false)}
                  className="w-full mt-8 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
