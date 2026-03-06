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
  Terminal,
  Trash2,
  RotateCcw,
  Send
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { ethers } from 'ethers';
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
import BotTerminal from './components/BotTerminal';
import BotDetailsWindow from './components/BotDetailsWindow';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BotData {
  id: string;
  name: string;
  type: 'trading' | 'social' | 'monitor';
  status: 'running' | 'stopped';
  config: any;
  state: any;
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
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ qrCodeUrl: string, secret: string } | null>(null);
  const [bots, setBots] = useState<BotData[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'trading' | 'social' | 'monitor' | 'whale_watcher'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'stopped'>('all');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', type: 'trading', interval: 60 });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wallet'>('dashboard');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [detailsBot, setDetailsBot] = useState<any | null>(null);
  const [commandInputs, setCommandInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('bot_update', (data) => {
      setBots(prev => {
        const updatedBots = prev.map(bot => {
          if (bot.id === data.bot_id) {
            // Update state based on bot type and result
            let newState = bot.state;
            if (bot.type === 'trading' && data.result?.portfolio) {
              newState = data.result.portfolio;
            } else if (data.result?.state) {
              newState = data.result.state;
            } else if (data.result) {
              newState = { ...bot.state, ...data.result };
            }

            const updatedBot = {
              ...bot,
              status: data.status || bot.status,
              state: newState,
              metrics: {
                ...bot.metrics,
                total_decisions: bot.metrics.total_decisions + 1,
                last_decisions: [data, ...bot.metrics.last_decisions].slice(0, 10)
              }
            };

            // Sync detailsBot if it's the one being updated
            setDetailsBot(current => {
              if (current?.id === data.bot_id) {
                return updatedBot;
              }
              return current;
            });

            return updatedBot;
          }
          return bot;
        });
        return updatedBots;
      });
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

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setBots([]);
    setAnalytics(null);
  };

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bots');
      if (res.ok) {
        const data = await res.json();
        setBots(data);
      }
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const toggleBot = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'running' ? 'stop' : 'start';
    await fetch(`/api/bots/${id}/${action}`, { method: 'POST' });
    
    const res = await fetch('/api/bots');
    if (res.ok) {
      const data = await res.json();
      setBots(data);
      
      const bot = data.find((b: any) => b.id === id);
      if (bot && detailsBot?.id === id) {
        setDetailsBot(bot);
      }
    }
  };

  const restartBot = async (id: string) => {
    await fetch(`/api/bots/${id}/restart`, { method: 'POST' });
    const res = await fetch('/api/bots');
    if (res.ok) {
      const data = await res.json();
      setBots(data);
      const updatedBot = data.find((b: any) => b.id === id);
      if (updatedBot) {
        setDetailsBot(updatedBot);
      }
    }
  };

  const deleteBot = async (id: string) => {
    await fetch(`/api/bots/${id}`, { method: 'DELETE' });
    setDetailsBot(null);
    fetchBots();
  };

  const updateBotConfig = async (id: string, config: any) => {
    await fetch(`/api/bots/${id}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    
    const res = await fetch('/api/bots');
    if (res.ok) {
      const data = await res.json();
      setBots(data);
      const updatedBot = data.find((b: any) => b.id === id);
      if (updatedBot) {
        setDetailsBot(updatedBot);
      }
    }
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

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setLoginError('Please install MetaMask or another crypto wallet extension.');
      return;
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
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      if (error.code === 4001) {
        alert('Connection request was rejected. Please try again if you wish to connect your wallet.');
      } else {
        alert('Wallet connection failed. Please try again.');
      }
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const fetchTransactions = async (address: string) => {
    // Simulated transactions for demo
    setTransactions([
      { id: '1', type: 'receive', amount: '0.05', from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', date: new Date(Date.now() - 86400000).toISOString(), status: 'confirmed' },
      { id: '2', type: 'send', amount: '0.01', to: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7', date: new Date(Date.now() - 172800000).toISOString(), status: 'confirmed' },
      { id: '3', type: 'receive', amount: '0.12', from: '0x250E76987d838a9531D854de95959fcF4866bc29', date: new Date(Date.now() - 259200000).toISOString(), status: 'confirmed' },
    ]);
  };

  const handleDeposit = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const amount = "0.001";
      const tx = await signer.sendTransaction({
        to: walletAddress,
        value: ethers.parseEther(amount)
      });

      setTransactions(prev => [{
        id: tx.hash,
        type: 'receive',
        amount: amount,
        from: walletAddress,
        date: new Date().toISOString(),
        status: 'pending'
      }, ...prev]);

      alert(`Deposit transaction sent! Hash: ${tx.hash}`);
      
      // Update balance after a delay
      setTimeout(async () => {
        const balance = await provider.getBalance(walletAddress);
        setWalletBalance(ethers.formatEther(balance));
        setTransactions(prev => prev.map(t => t.id === tx.hash ? { ...t, status: 'confirmed' } : t));
      }, 5000);

    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Transaction failed. Check console for details.');
    }
  };

  const handleSend = async (to: string, amount: string) => {
    if (!walletAddress) return;
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

      alert(`Send transaction sent! Hash: ${tx.hash}`);
      
      setTimeout(async () => {
        const balance = await provider.getBalance(walletAddress);
        setWalletBalance(ethers.formatEther(balance));
        setTransactions(prev => prev.map(t => t.id === tx.hash ? { ...t, status: 'confirmed' } : t));
      }, 5000);
    } catch (error) {
      console.error('Send failed:', error);
      alert('Send failed.');
    }
  };

  const sendBotCommand = async (id: string, command: string): Promise<string> => {
    const res = await fetch(`/api/bots/${id}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const data = await res.json();
    fetchBots();
    return data.response || 'Command executed.';
  };

  const handleInlineCommand = async (botId: string) => {
    const command = commandInputs[botId];
    if (!command) return;
    await sendBotCommand(botId, command);
    setCommandInputs(prev => ({ ...prev, [botId]: '' }));
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
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bot className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">BotEngine<span className="text-emerald-500">.ai</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
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
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-400">System Live</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Wallet</span>
                  <span className="text-xs font-mono text-zinc-300">
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not Connected'}
                  </span>
                </div>
                {walletAddress ? (
                  <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                    <span className="text-xs font-bold text-emerald-500">{parseFloat(walletBalance || '0').toFixed(4)} ETH</span>
                    <button 
                      onClick={handleDeposit}
                      className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors"
                      title="Deposit Funds"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={connectWallet}
                    disabled={isWalletConnecting}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    {isWalletConnecting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-zinc-100">{user.username}</span>
                <div className="flex gap-2">
                  <button onClick={() => setIsSecurityModalOpen(true)} className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">Security</button>
                  <span className="text-zinc-700">|</span>
                  <button onClick={handleLogout} className="text-[10px] font-bold text-zinc-500 hover:text-red-400 uppercase tracking-widest transition-colors">Sign Out</button>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                New Bot
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Bot Status', value: `${analytics?.active_bots || 0} Running / ${(analytics?.total_bots || 0) - (analytics?.active_bots || 0)} Stopped`, icon: Activity, color: 'text-emerald-500' },
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

            {/* Filter Controls */}
            <div className="flex items-center gap-4 mb-6">
              <select 
                className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
              >
                <option value="all">All Types</option>
                <option value="trading">Trading</option>
                <option value="social">Social</option>
                <option value="monitor">Monitor</option>
                <option value="whale_watcher">Whale Watcher</option>
              </select>
              <select 
                className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped</option>
              </select>
            </div>

            {/* Details Window */}
            {detailsBot && (
              <BotDetailsWindow 
                bot={detailsBot} 
                onClose={() => setDetailsBot(null)} 
                onToggle={toggleBot}
                onRestart={restartBot}
                onDelete={deleteBot}
                onSendCommand={sendBotCommand}
                onUpdateConfig={updateBotConfig}
              />
            )}

            {/* Terminal Modal */}
            {selectedBotId && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                <div className="w-full max-w-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Bot Terminal</h2>
                    <button onClick={() => setSelectedBotId(null)} className="text-zinc-500 hover:text-white">Close</button>
                  </div>
                  <BotTerminal 
                    botId={selectedBotId} 
                    onSendCommand={(cmd) => sendBotCommand(selectedBotId, cmd)} 
                  />
                </div>
              </div>
            )}

            {/* Bots Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {bots.filter(bot => (filterType === 'all' || bot.type === filterType) && (filterStatus === 'all' || bot.status === filterStatus)).map((bot, i) => (
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
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-widest transition-colors",
                                bot.status === 'running' 
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                  : "bg-red-500/10 border-red-500/20 text-red-500"
                              )}>
                                <span className={cn(
                                  "relative flex h-1.5 w-1.5",
                                  bot.status === 'running' ? "animate-pulse" : ""
                                )}>
                                  <span className={cn(
                                    "absolute inline-flex h-full w-full rounded-full opacity-75",
                                    bot.status === 'running' ? "animate-ping bg-emerald-400" : "bg-red-500"
                                  )}></span>
                                  <span className={cn(
                                    "relative inline-flex rounded-full h-1.5 w-1.5",
                                    bot.status === 'running' ? "bg-emerald-500" : "bg-red-500"
                                  )}></span>
                                </span>
                                {bot.status}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleBot(bot.id, bot.status)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all active:scale-90 text-xs font-medium",
                              bot.status === 'running' ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                            )}
                          >
                            {bot.status === 'running' ? <><Square className="w-3.5 h-3.5 fill-current" /> Stop</> : <><Play className="w-3.5 h-3.5 fill-current" /> Start</>}
                          </button>
                          <button 
                            onClick={() => restartBot(bot.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-blue-500 transition-all text-xs font-medium"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restart
                          </button>
                          <button 
                            onClick={() => setSelectedBotId(bot.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-emerald-500 transition-all text-xs font-medium"
                          >
                            <Terminal className="w-3.5 h-3.5" /> Terminal
                          </button>
                          <button 
                            onClick={() => setDetailsBot(bot)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-blue-500 transition-all text-xs font-medium"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" /> Details
                          </button>
                          <button 
                            onClick={() => deleteBot(bot.id)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500/20 hover:text-red-500 transition-all text-xs font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Custom command..."
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                            value={commandInputs[bot.id] || ''}
                            onChange={e => setCommandInputs({ ...commandInputs, [bot.id]: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && sendBotCommand(bot.id, commandInputs[bot.id])}
                          />
                          <button
                            onClick={() => sendBotCommand(bot.id, commandInputs[bot.id])}
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Command Input */}
                      <div className="px-6 pb-6 pt-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Send command..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                            value={commandInputs[bot.id] || ''}
                            onChange={e => setCommandInputs({ ...commandInputs, [bot.id]: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleInlineCommand(bot.id)}
                          />
                          <button 
                            onClick={() => handleInlineCommand(bot.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-emerald-500 hover:text-emerald-400"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bot Metrics */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                          <div className="text-xs text-zinc-500 font-medium mb-1">Total Decisions</div>
                          <div className="text-xl font-bold">{bot.metrics.total_decisions}</div>
                        </div>
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                          <div className="text-xs text-zinc-500 font-medium mb-1">Success Rate</div>
                          <div className="text-xl font-bold">94.2%</div>
                        </div>
                      </div>

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
        ) : (
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
                        {walletBalance ? parseFloat(walletBalance).toFixed(4) : '0.0000'} <span className="text-emerald-500">ETH</span>
                      </div>
                      <div className="text-sm text-zinc-500 mt-1 font-medium">≈ ${(parseFloat(walletBalance || '0') * 2400).toLocaleString()} USD</div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Wallet Address</span>
                      <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-4 py-3">
                        <span className="text-xs font-mono text-zinc-400 truncate mr-4">
                          {walletAddress || 'Not Connected'}
                        </span>
                        {walletAddress && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(walletAddress)}
                            className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>

                    {!walletAddress ? (
                      <button 
                        onClick={connectWallet}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-4 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                      >
                        Connect Wallet
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={handleDeposit}
                          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                          <ArrowDownLeft className="w-4 h-4" />
                          Deposit
                        </button>
                        <button 
                          onClick={() => {
                            const to = prompt("Enter recipient address:");
                            const amount = prompt("Enter amount (ETH):");
                            if (to && amount) handleSend(to, amount);
                          }}
                          className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 border border-white/10"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          Send
                        </button>
                      </div>
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
                  {transactions.length > 0 ? (
                    <div className="space-y-2">
                      {transactions.map((tx, idx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl hover:bg-black/30 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              tx.type === 'receive' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500"
                            )}>
                              {tx.type === 'receive' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold capitalize">{tx.type} ETH</div>
                              <div className="text-[10px] text-zinc-500 font-medium">
                                {tx.type === 'receive' ? `From: ${tx.from.slice(0, 6)}...${tx.from.slice(-4)}` : `To: ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              "text-sm font-bold",
                              tx.type === 'receive' ? "text-emerald-500" : "text-zinc-100"
                            )}>
                              {tx.type === 'receive' ? '+' : '-'}{tx.amount} ETH
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-[10px] text-zinc-500">{new Date(tx.date).toLocaleDateString()}</span>
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                tx.status === 'confirmed' ? "bg-emerald-500" : "bg-yellow-500 animate-pulse"
                              )} />
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
                      value={newBot.interval?.toString() || ''}
                      onChange={e => setNewBot({ ...newBot, interval: parseInt(e.target.value) || 0 })}
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
