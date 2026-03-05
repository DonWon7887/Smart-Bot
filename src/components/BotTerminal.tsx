import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Bot } from 'lucide-react';
import { cn } from '../App';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: number;
}

interface BotTerminalProps {
  botId: string;
  onSendCommand: (command: string) => Promise<string>;
}

export default function BotTerminal({ botId, onSendCommand }: BotTerminalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await onSendCommand(input);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: response,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: 'Error processing command.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/20">
        <Terminal className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Bot Terminal</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600">
            <Bot className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs font-medium">Enter a command to interact with the bot</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex gap-3", msg.sender === 'user' ? "justify-end" : "justify-start")}>
            {msg.sender === 'bot' && <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><Bot className="w-3 h-3 text-emerald-500" /></div>}
            <div className={cn(
              "px-3 py-2 rounded-xl text-sm max-w-[80%]",
              msg.sender === 'user' ? "bg-emerald-500 text-black" : "bg-white/5 text-zinc-300"
            )}>
              {msg.text}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-3 justify-start">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><Bot className="w-3 h-3 text-emerald-500" /></div>
            <div className="px-3 py-2 rounded-xl text-sm bg-white/5 text-zinc-500 animate-pulse">Processing...</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-black/20">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a command..."
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
          <button 
            type="submit"
            disabled={isProcessing}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
