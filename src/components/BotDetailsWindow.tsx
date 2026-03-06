import React, { useState } from 'react';
import { Bot, Activity, BarChart3, Settings, Database, X, Play, Square, RotateCcw, Trash2, Send } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../App';

interface BotDetailsWindowProps {
  bot: any;
  onClose: () => void;
  onToggle: (id: string, status: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
  onSendCommand: (id: string, command: string) => void;
  onUpdateConfig: (id: string, config: any) => void;
}

export default function BotDetailsWindow({ bot, onClose, onToggle, onRestart, onDelete, onSendCommand, onUpdateConfig }: BotDetailsWindowProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'metrics' | 'config' | 'state'>('overview');
  const [command, setCommand] = useState('');
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editableConfig, setEditableConfig] = useState(JSON.stringify(bot.config, null, 2));
  const [configError, setConfigError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isEditingConfig) {
      setEditableConfig(JSON.stringify(bot.config, null, 2));
      setConfigError(null);
    }
  }, [bot.config, isEditingConfig]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Bot },
    { id: 'logs', label: 'Logs', icon: Activity },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
    { id: 'config', label: 'Config', icon: Settings },
    { id: 'state', label: 'State', icon: Database },
  ] as const;

  const handleSendCommand = () => {
    if (!command) return;
    onSendCommand(bot.id, command);
    setCommand('');
  };

  const handleSaveConfig = () => {
    try {
      const parsed = JSON.parse(editableConfig);
      onUpdateConfig(bot.id, parsed);
      setIsEditingConfig(false);
      setConfigError(null);
    } catch (e) {
      setConfigError('Invalid JSON configuration');
      console.error('Invalid JSON configuration:', e);
    }
  };

  // Mock historical data if not present
  const history = bot.metrics.history || [
    { timestamp: '10:00', decisions: 10, successRate: 0.8 },
    { timestamp: '11:00', decisions: 15, successRate: 0.85 },
    { timestamp: '12:00', decisions: 12, successRate: 0.82 },
    { timestamp: '13:00', decisions: 20, successRate: 0.9 },
    { timestamp: '14:00', decisions: 18, successRate: 0.88 },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[700px] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl bg-emerald-500/10 text-emerald-500",
                bot.status === 'running' ? "animate-pulse" : "opacity-50"
              )}>
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{bot.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    bot.status === 'running' ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
                  )} />
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{bot.status}</span>
                </div>
              </div>
            </div>
            
            <div className="h-8 w-px bg-white/10 mx-2" />

            <div className="flex items-center gap-2">
              <button 
                onClick={() => onToggle(bot.id, bot.status)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-tight transition-all",
                  bot.status === 'running' 
                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" 
                    : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
                )}
              >
                {bot.status === 'running' ? <><Square className="w-3.5 h-3.5 fill-current" /> Stop</> : <><Play className="w-3.5 h-3.5 fill-current" /> Start</>}
              </button>
              <button 
                onClick={() => onRestart(bot.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-blue-500 transition-all text-xs font-bold uppercase tracking-tight border border-white/5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restart
              </button>
              <button 
                onClick={() => onDelete(bot.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500/20 hover:text-red-500 transition-all text-xs font-bold uppercase tracking-tight border border-white/5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-900/30 border-b border-white/10 px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                activeTab === tab.id ? "text-emerald-500" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-zinc-950/50">
          <div className="p-8">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Bot Identity</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Unique ID</span>
                        <span className="text-sm font-mono text-white bg-black/40 px-2 py-1 rounded">{bot.id}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Bot Type</span>
                        <span className="text-sm font-bold text-emerald-500 uppercase tracking-wider">{bot.type}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-400">Current Status</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            bot.status === 'running' ? "bg-emerald-500" : "bg-zinc-600"
                          )} />
                          <span className="text-sm font-bold text-white uppercase">{bot.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Performance Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="text-2xl font-bold text-white">{bot.metrics.total_decisions}</div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">Total Decisions</div>
                      </div>
                      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <div className="text-2xl font-bold text-blue-500">92%</div>
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">Success Rate</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5 h-full">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {bot.metrics.last_decisions.slice(0, 5).map((d: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            d.confidence > 0.8 ? "bg-emerald-500" : "bg-yellow-500"
                          )} />
                          <div className="flex-1">
                            <div className="text-xs font-bold text-white uppercase">{d.action}</div>
                            <div className="text-[10px] text-zinc-500">{(d.confidence * 100).toFixed(0)}% confidence</div>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-600">
                            {new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-3">
                {bot.metrics.last_decisions.map((d: any, idx: number) => (
                  <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 flex gap-4 items-start hover:bg-white/10 transition-all">
                    <div className={cn(
                      "w-2 h-2 mt-1.5 rounded-full shadow-[0_0_8px_rgba(var(--color),0.5)]",
                      d.confidence > 0.8 ? "bg-emerald-500" : d.confidence > 0.5 ? "bg-yellow-500" : "bg-red-500"
                    )} />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm text-white uppercase tracking-wider">{d.action}</span>
                          <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-zinc-400">
                            ID: {d.id || idx}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                          {(d.confidence * 100).toFixed(0)}% Confidence
                        </span>
                      </div>
                      <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {typeof d.reasoning === 'string' ? d.reasoning : d.reasoning?.summary || JSON.stringify(d.reasoning)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <div className="flex gap-2">
                          {d.reasoning?.reasons?.map((r: string, i: number) => (
                            <span key={i} className="text-[10px] text-zinc-500 bg-white/5 px-2 py-0.5 rounded italic">
                              # {r}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">
                          {new Date(d.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'metrics' && (
              <div className="space-y-8">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Decisions Activity</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <defs>
                          <linearGradient id="colorDecisions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px', fontSize: '12px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="decisions" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#18181b' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Success Rate Trend</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="timestamp" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} domain={[0, 1]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '12px', fontSize: '12px' }}
                          itemStyle={{ color: '#3b82f6' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="successRate" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#18181b' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Configuration Settings</h3>
                  {!isEditingConfig ? (
                    <button 
                      onClick={() => setIsEditingConfig(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      <Settings className="w-4 h-4" /> Edit Config
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsEditingConfig(false)}
                        className="px-4 py-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveConfig}
                        className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative group">
                  {configError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-wider">
                      {configError}
                    </div>
                  )}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative">
                    {isEditingConfig ? (
                      <textarea
                        className="w-full h-[400px] bg-black/60 p-6 rounded-2xl text-sm font-mono text-emerald-400 border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none"
                        value={editableConfig}
                        onChange={e => setEditableConfig(e.target.value)}
                      />
                    ) : (
                      <pre className="w-full h-[400px] bg-black/60 p-6 rounded-2xl text-sm font-mono text-zinc-400 border border-white/10 overflow-auto">
                        {JSON.stringify(bot.config, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
                
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <div className="flex gap-3">
                    <Activity className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      <span className="text-blue-500 font-bold uppercase tracking-tight">Pro Tip:</span> Dynamic adjustments to the bot's configuration will take effect immediately upon the next execution cycle. Ensure JSON syntax is valid before saving.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'state' && (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Internal State Data</h3>
                <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                  <pre className="text-sm font-mono text-blue-400 overflow-auto max-h-[400px]">
                    {JSON.stringify(bot.state, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer / Command Input */}
        <div className="p-6 border-t border-white/10 bg-zinc-900/50">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-emerald-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Direct command override (e.g., 'force_buy', 'pause_all')..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-600"
                  value={command}
                  onChange={e => setCommand(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendCommand()}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded border border-white/5">Enter ↵</span>
                </div>
              </div>
              <button 
                onClick={handleSendCommand}
                className="bg-emerald-500 hover:bg-emerald-400 text-black p-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
