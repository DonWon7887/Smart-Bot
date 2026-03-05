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
  ChevronDown,
  Trash2,
  Terminal,
  Send,
  Search,
  Filter,
  X,
  Sun,
  Moon
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
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null);
  const [newBot, setNewBot] = useState({ name: '', type: 'trading', interval: 60 });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [botCommands, setBotCommands] = useState<Record<string, string>>({});
  const [isSendingCommand, setIsSendingCommand] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedDecisions, setExpandedDecisions] = useState<Record<string, boolean>>({});
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
              last_decisions: [{
                ...data,
                is_command: !!data.is_command
              }, ...bot.metrics.last_decisions].slice(0, 10)
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

  const restartBot = async (id: string) => {
    await fetch(`/api/bots/${id}/restart`, { method: 'POST' });
    fetchBots();
  };

  const deleteBot = async (id: string) => {
    await fetch(`/api/bots/${id}`, { method: 'DELETE' });
    setDeleteConfirmation(null);
    fetchBots();
  };

  const sendCommand = async (id: string) => {
    const command = botCommands[id];
    if (!command?.trim()) return;

    setIsSendingCommand(prev => ({ ...prev, [id]: true }));
    try {
      await fetch(`/api/bots/${id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      setBotCommands(prev => ({ ...prev, [id]: '' }));
    } catch (error) {
      console.error('Failed to send command:', error);
    } finally {
      setIsSendingCommand(prev => ({ ...prev, [id]: false }));
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

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || bot.type === filterType;
    const matchesStatus = filterStatus === 'all' || bot.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className={cn("min-h-screen font-sans selection:bg-emerald-500/30", isDarkMode ? "dark" : "")}>
      <div className="min-h-screen bg-app-bg text-app-text transition-colors duration-300">
        {/* Header */}
        <header className="border-b border-border-subtle bg-card-bg/20 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Bot className="w-5 h-5 text-black" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">BotEngine<span className="text-emerald-500">.ai</span></h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-zinc-400">System Live</span>
              </div>
              
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-100 transition-all"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Bot</span>
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
              className="bg-card-bg border border-border-subtle p-6 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg bg-emerald-500/10", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Real-time</span>
              </div>
              <div className="text-3xl font-bold tracking-tight mb-1">{stat.value}</div>
              <div className="text-sm text-zinc-500 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Bots Grid Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold tracking-tight">Active Agents</h2>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search bots..."
                className="bg-card-bg border border-border-subtle rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all w-full md:w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-card-bg border border-border-subtle rounded-xl p-1">
              {['all', 'trading', 'social', 'monitor'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    filterType === type ? "bg-emerald-500 text-black" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-card-bg border border-border-subtle rounded-xl p-1">
              {['all', 'running', 'stopped'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    filterStatus === status ? "bg-emerald-500 text-black" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bots Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredBots.map((bot, i) => (
              <motion.div
                key={bot.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card-bg border border-border-subtle rounded-2xl overflow-hidden group"
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
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {bot.status === 'stopped' ? (
                        <button 
                          onClick={() => toggleBot(bot.id, bot.status)}
                          title="Start Bot"
                          className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all active:scale-90"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleBot(bot.id, bot.status)}
                          title="Stop Bot"
                          className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all active:scale-90"
                        >
                          <Square className="w-4 h-4 fill-current" />
                        </button>
                      )}
                      <button 
                        onClick={() => restartBot(bot.id)}
                        title="Restart Bot"
                        className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all active:scale-90"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmation({ id: bot.id, name: bot.name })}
                        title="Delete Bot"
                        className="p-2.5 rounded-xl bg-zinc-500/10 text-zinc-500 hover:bg-red-500/20 hover:text-red-500 transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bot Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/5 dark:bg-black/20 rounded-xl p-4 border border-border-subtle">
                      <div className="text-xs text-zinc-500 font-medium mb-1">Total Decisions</div>
                      <div className="text-xl font-bold">{bot.metrics.total_decisions}</div>
                    </div>
                    <div className="bg-black/5 dark:bg-black/20 rounded-xl p-4 border border-border-subtle">
                      <div className="text-xs text-zinc-500 font-medium mb-1">Success Rate</div>
                      <div className="text-xl font-bold">94.2%</div>
                    </div>
                  </div>

                  {/* Command Input */}
                  <div className="mb-6">
                    <div className="relative group/command">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/command:text-emerald-500 transition-colors">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <input 
                        type="text"
                        placeholder="Send command (e.g. custom:scan_network, report_status)..."
                        className="w-full bg-black/5 dark:bg-black/40 border border-border-subtle rounded-xl pl-10 pr-12 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-700"
                        value={botCommands[bot.id] || ''}
                        onChange={e => setBotCommands(prev => ({ ...prev, [bot.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && sendCommand(bot.id)}
                      />
                      <button 
                        onClick={() => sendCommand(bot.id)}
                        disabled={!botCommands[bot.id]?.trim() || isSendingCommand[bot.id]}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-0 transition-all"
                      >
                        <Send className={cn("w-3.5 h-3.5", isSendingCommand[bot.id] && "animate-pulse")} />
                      </button>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent Decisions</span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                    {bot.metrics.last_decisions.length > 0 ? (
                      bot.metrics.last_decisions.slice(0, 5).map((d, idx) => {
                        if (!d || !d.decision) return null;
                        const isExpanded = expandedDecisions[`${bot.id}-${idx}`];
                        return (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-black/5 dark:bg-black/20 border border-border-subtle rounded-xl overflow-hidden group/item hover:bg-black/10 dark:hover:bg-black/30 transition-colors"
                          >
                            <button 
                              onClick={() => setExpandedDecisions(prev => ({ ...prev, [`${bot.id}-${idx}`]: !isExpanded }))}
                              className="w-full p-3 flex items-center justify-between text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  (d.decision?.confidence ?? 0) > 0.7 ? "bg-emerald-500" : "bg-yellow-500"
                                )} />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-semibold uppercase tracking-tight">{d.decision?.action}</div>
                                    {d.is_command && (
                                      <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold uppercase tracking-widest">CMD</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-medium truncate max-w-[180px]">
                                    {d.decision?.reasoning?.summary}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-xs font-mono text-zinc-400">
                                  {Math.round((d.decision?.confidence ?? 0) * 100)}%
                                </div>
                                <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-600 transition-transform duration-200", isExpanded && "rotate-180")} />
                              </div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="px-3 pb-3 border-t border-border-subtle"
                                >
                                  <div className="pt-3 space-y-3">
                                    {d.is_command && d.command && (
                                      <div className="space-y-1">
                                        <div className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">User Command</div>
                                        <div className="text-[10px] text-emerald-500/90 font-mono bg-emerald-500/5 rounded p-2 border border-emerald-500/10">
                                          &gt; {d.command}
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-1">
                                      <div className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">Reasoning</div>
                                      <div className="text-[10px] text-zinc-400 leading-relaxed">
                                        {d.decision?.reasoning?.summary}
                                      </div>
                                      {d.decision?.reasoning?.reasons?.length > 0 && (
                                        <ul className="mt-1.5 space-y-1">
                                          {d.decision.reasoning.reasons.map((reason: string, rIdx: number) => (
                                            <li key={rIdx} className="text-[9px] text-zinc-500 flex items-start gap-1.5">
                                              <span className="w-1 h-1 rounded-full bg-zinc-700 mt-1 flex-shrink-0" />
                                              {reason}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>

                                    {d.result?.message && (
                                      <div className="space-y-1">
                                        <div className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">Execution Result</div>
                                        <div className="text-[10px] text-zinc-300 bg-white/5 rounded p-2 border border-border-subtle">
                                          {d.result.message}
                                        </div>
                                      </div>
                                    )}

                                    {d.decision?.reasoning?.suggestions?.length > 0 && (
                                      <div className="space-y-1">
                                        <div className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">Suggestions</div>
                                        <div className="flex flex-wrap gap-1.5">
                                          {d.decision.reasoning.suggestions.map((s: string, sIdx: number) => (
                                            <span key={sIdx} className="text-[8px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/10">
                                              {s}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 bg-black/5 dark:bg-black/10 rounded-xl border border-dashed border-border-subtle">
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmation(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-card-bg border border-border-subtle rounded-3xl overflow-hidden shadow-2xl p-8"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">Delete Agent?</h2>
              <p className="text-zinc-500 text-sm mb-8">
                Are you sure you want to remove <span className="text-app-text font-semibold">{deleteConfirmation.name}</span>? 
                This action will permanently delete all associated decision history and cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteBot(deleteConfirmation.id)}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-black text-sm font-semibold transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Bot Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card-bg border border-border-subtle rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Settings className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold">System Settings</h2>
                  </div>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-black/20 rounded-2xl border border-border-subtle">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-black/10 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">Dark Mode</div>
                        <div className="text-[10px] text-zinc-500">Toggle between light and dark themes</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-all duration-300",
                        isDarkMode ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 bg-white rounded-full transition-all duration-300",
                        isDarkMode ? "translate-x-6" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  <div className="p-4 bg-black/5 dark:bg-black/20 rounded-2xl border border-border-subtle">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">System Info</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Version</span>
                        <span className="font-mono">2.4.0-stable</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Environment</span>
                        <span className="font-mono text-emerald-500">Production</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full mt-8 px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-all active:scale-95"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-md bg-card-bg border border-border-subtle rounded-3xl overflow-hidden shadow-2xl"
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
                      className="w-full bg-black/5 dark:bg-black/40 border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
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
                            newBot.type === type ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-black/5 dark:bg-black/20 border-border-subtle text-zinc-500 hover:border-black/20 dark:hover:border-white/20"
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
                      className="w-full bg-black/5 dark:bg-black/40 border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      value={newBot.interval}
                      onChange={e => setNewBot({ ...newBot, interval: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all"
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
    </div>
  );
}
