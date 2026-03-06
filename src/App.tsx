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
  ChevronRight
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BotData {
  id: string;
  name: string;
  type: 'trading' | 'social' | 'monitor';
  status: 'running' | 'stopped';
  config: any;
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
  const [bots, setBots] = useState<BotData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', type: 'trading', interval: 60 });
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('bot_update', (data) => {
      setBots(prev => prev.map(bot => {
        if (bot.id === data.bot_id) {
          return {
            ...bot,
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
  }, []);

  const fetchBots = async () => {
    const res = await fetch('/api/bots');
    const data = await res.json();
    setBots(data);
  };

  const fetchAnalytics = async () => {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    setAnalytics(data);
  };

  const toggleBot = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'running' ? 'stop' : 'start';
    await fetch(`/api/bots/${id}/${action}`, { method: 'POST' });
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-400">System Live</span>
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
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Active Bots', value: `${analytics?.active_bots || 0}/${analytics?.total_bots || 0}`, icon: Activity, color: 'text-emerald-500' },
            { label: 'Total Decisions', value: analytics?.total_decisions || 0, icon: Cpu, color: 'text-blue-500' },
            { label: 'System Uptime', value: '99.9%', icon: RefreshCw, color: 'text-purple-500' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Real-time</span>
              </div>
              <div className="text-3xl font-bold tracking-tight mb-1">{stat.value}</div>
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
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-widest",
                            bot.status === 'running' ? "text-emerald-500" : "text-zinc-500"
                          )}>
                            {bot.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleBot(bot.id, bot.status)}
                      className={cn(
                        "p-3 rounded-xl transition-all active:scale-90",
                        bot.status === 'running' ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                      )}
                    >
                      {bot.status === 'running' ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
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

                  {/* Recent Activity */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent Decisions</span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                    {bot.metrics.last_decisions.length > 0 ? (
                      bot.metrics.last_decisions.slice(0, 3).map((d, idx) => (
                        <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-center justify-between">
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
                        </div>
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
    </div>
  );
}
