import React, { useState } from 'react';
import { Bot, Activity, BarChart3, Settings, Database, X, Play, Square, RotateCcw, Trash2, Send } from 'lucide-react';
import { cn } from '../App';

interface BotDetailsWindowProps {
  bot: any;
  onClose: () => void;
  onToggle: (id: string, status: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
  onSendCommand: (id: string, command: string) => void;
}

export default function BotDetailsWindow({ bot, onClose, onToggle, onRestart, onDelete, onSendCommand }: BotDetailsWindowProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'metrics' | 'config' | 'state'>('overview');
  const [command, setCommand] = useState('');

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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">{bot.name} Details</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onToggle(bot.id, bot.status)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  bot.status === 'running' ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                )}
              >
                {bot.status === 'running' ? <><Square className="w-3.5 h-3.5 fill-current" /> Stop</> : <><Play className="w-3.5 h-3.5 fill-current" /> Start</>}
              </button>
              <button 
                onClick={() => onRestart(bot.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-blue-500 transition-all text-xs font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restart
              </button>
              <button 
                onClick={() => onDelete(bot.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-zinc-400 hover:bg-red-500/20 hover:text-red-500 transition-all text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex border-b border-white/10">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2",
                activeTab === tab.id ? "border-emerald-500 text-emerald-500" : "border-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <p><span className="text-zinc-500">ID:</span> {bot.id}</p>
              <p><span className="text-zinc-500">Type:</span> {bot.type}</p>
              <p><span className="text-zinc-500">Status:</span> {bot.status}</p>
            </div>
          )}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              {bot.metrics.last_decisions.map((d: any) => (
                <div key={d.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex gap-4 items-start">
                  <div className={cn(
                    "w-2 h-2 mt-1.5 rounded-full",
                    d.confidence > 0.8 ? "bg-emerald-500" : d.confidence > 0.5 ? "bg-yellow-500" : "bg-red-500"
                  )} />
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-white">{d.action}</span>
                      <span className="text-xs font-mono text-zinc-500">{(d.confidence * 100).toFixed(0)}% Confidence</span>
                    </div>
                    <p className="text-xs text-zinc-400">{d.reasoning}</p>
                    <span className="text-[10px] font-mono text-zinc-600">{new Date(d.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <p><span className="text-zinc-500">Total Decisions:</span> {bot.metrics.total_decisions}</p>
            </div>
          )}
          {activeTab === 'config' && (
            <pre className="bg-black/40 p-4 rounded-lg text-xs font-mono overflow-auto">{JSON.stringify(bot.config, null, 2)}</pre>
          )}
          {activeTab === 'state' && (
            <pre className="bg-black/40 p-4 rounded-lg text-xs font-mono overflow-auto">{JSON.stringify(bot.state, null, 2)}</pre>
          )}
        </div>

        <div className="p-6 border-t border-white/10">
          <div className="relative">
            <input
              type="text"
              placeholder="Send command to bot..."
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendCommand()}
            />
            <button 
              onClick={handleSendCommand}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-emerald-500 hover:text-emerald-400"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
