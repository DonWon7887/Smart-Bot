import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import authRouter from "./server/auth";

// Mock data for initial bots
interface Bot {
  id: string;
  name: string;
  strategy: string;
  riskLevel: string;
  maxDrawdown: number;
  leverage: number;
  tradingPair: string;
  status: string;
  performance: { date: string; value: number }[];
  terminalHistory: { type: 'input' | 'output'; content: string; timestamp: string }[];
  socialData: { 
    id: string; 
    platform: string; 
    content: string; 
    timestamp: string; 
    sentiment: 'Positive' | 'Negative' | 'Neutral'; 
    author?: string;
    authorAvatar?: string;
    metrics: {
      likes: number;
      shares: number;
      comments: number;
    };
    engagement: number; // Total engagement
    url?: string;
    hashtags?: string[];
    mentions?: string[];
    summary?: string;
    topPosts?: { author: string; text: string; engagement: number }[];
  }[];
  connectedSocials: string[];
  socialCredentials?: { platform: string; email?: string; phone?: string; password?: string }[];
  description?: string;
  strategyDetails?: {
    parameters: Record<string, string | number>;
    backtesting: {
      winRate: number;
      profitFactor: number;
      sharpeRatio: number;
      totalTrades: number;
    };
    optimizationHistory: { date: string; change: string }[];
  };
}

let bots: Bot[] = [
  {
    id: "bot-1",
    name: "Alpha Momentum",
    strategy: "Momentum",
    riskLevel: "Medium",
    maxDrawdown: 15,
    leverage: 2,
    tradingPair: "BTC/USDT",
    status: "Active",
    performance: [
      { date: "2026-03-01", value: 1000 },
      { date: "2026-03-02", value: 1050 },
      { date: "2026-03-03", value: 1030 },
      { date: "2026-03-04", value: 1100 },
      { date: "2026-03-05", value: 1150 },
      { date: "2026-03-06", value: 1120 },
    ],
    terminalHistory: [
      { type: 'output', content: "System initialized. Social modules standby.", timestamp: new Date().toISOString() }
    ],
    socialData: [
      {
        id: "s1",
        platform: "X",
        content: "Bitcoin showing strong momentum above 60k. Bulls are in control.",
        timestamp: new Date().toISOString(),
        sentiment: "Positive",
        author: "CryptoWhale",
        authorAvatar: "https://picsum.photos/seed/whale/100/100",
        metrics: {
          likes: 1200,
          shares: 250,
          comments: 50
        },
        engagement: 1500,
        hashtags: ["#BTC", "#Crypto", "#Bullish"],
        mentions: ["@MicroStrategy"],
        summary: "Market sentiment is highly positive as BTC breaks resistance."
      }
    ],
    connectedSocials: ["twitter"],
    strategyDetails: {
      parameters: { "RSI Period": 14, "Overbought": 70, "Oversold": 30, "MA Fast": 20, "MA Slow": 50 },
      backtesting: { winRate: 64.5, profitFactor: 1.8, sharpeRatio: 2.1, totalTrades: 450 },
      optimizationHistory: [
        { date: "2026-02-15", change: "Adjusted RSI threshold from 75 to 70" },
        { date: "2026-01-20", change: "Increased leverage from 1x to 2x" }
      ]
    }
  },
  {
    id: "bot-2",
    name: "Beta Arbitrage",
    strategy: "Arbitrage",
    riskLevel: "Low",
    maxDrawdown: 5,
    leverage: 1,
    tradingPair: "ETH/USDT",
    status: "Paused",
    performance: [
      { date: "2026-03-01", value: 2000 },
      { date: "2026-03-02", value: 2010 },
      { date: "2026-03-03", value: 2015 },
      { date: "2026-03-04", value: 2020 },
      { date: "2026-03-05", value: 2025 },
      { date: "2026-03-06", value: 2030 },
    ],
    terminalHistory: [
      { type: 'output', content: "System initialized. Social modules standby.", timestamp: new Date().toISOString() }
    ],
    socialData: [],
    connectedSocials: [],
    strategyDetails: {
      parameters: { "Spread Threshold": 0.5, "Min Volume": 10000 },
      backtesting: { winRate: 88.2, profitFactor: 2.5, sharpeRatio: 3.2, totalTrades: 1200 },
      optimizationHistory: [
        { date: "2026-03-01", change: "Added liquidity provider filter" }
      ]
    }
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(authRouter);

  // API Routes
  app.get("/api/bots", (req, res) => {
    res.json(bots);
  });

  app.get("/api/bots/:id", (req, res) => {
    const bot = bots.find(b => b.id === req.params.id);
    if (bot) {
      res.json(bot);
    } else {
      res.status(404).json({ error: "Bot not found" });
    }
  });

  app.put("/api/bots/:id", (req, res) => {
    const index = bots.findIndex(b => b.id === req.params.id);
    if (index !== -1) {
      bots[index] = { ...bots[index], ...req.body };
      res.json(bots[index]);
    } else {
      res.status(404).json({ error: "Bot not found" });
    }
  });

  app.post("/api/bots", (req, res) => {
    const newBot: Bot = {
      id: `bot-${Date.now()}`,
      name: req.body.name || "New Bot",
      strategy: req.body.strategy || "Momentum",
      riskLevel: req.body.riskLevel || "Medium",
      maxDrawdown: req.body.maxDrawdown || 10,
      leverage: req.body.leverage || 1,
      tradingPair: req.body.tradingPair || "BTC/USDT",
      status: "Paused",
      performance: [
        { date: new Date().toISOString().split('T')[0], value: 1000 }
      ],
      terminalHistory: [
        { type: 'output', content: "System initialized. Social modules standby.", timestamp: new Date().toISOString() }
      ],
      socialData: [],
      connectedSocials: [],
      description: req.body.description || "",
      strategyDetails: {
        parameters: { "Default Param": 100 },
        backtesting: { winRate: 50, profitFactor: 1.0, sharpeRatio: 1.0, totalTrades: 0 },
        optimizationHistory: []
      }
    };
    bots.push(newBot);
    res.status(201).json(newBot);
  });

  app.delete("/api/bots/:id", (req, res) => {
    const index = bots.findIndex(b => b.id === req.params.id);
    if (index !== -1) {
      bots.splice(index, 1);
      res.status(204).send();
    } else {
      res.status(404).json({ error: "Bot not found" });
    }
  });

  app.post("/api/bots/:id/search/:platform", (req, res) => {
    const { id, platform } = req.params;
    const { query } = req.body;
    const bot = bots.find(b => b.id === id);
    
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    if (!bot.connectedSocials?.includes(platform)) {
      return res.status(400).json({ error: "Platform not connected" });
    }

    const credentials = bot.socialCredentials?.find(c => c.platform === platform);
    
    const likes = Math.floor(Math.random() * 3000);
    const shares = Math.floor(Math.random() * 1000);
    const comments = Math.floor(Math.random() * 500);
    const engagement = likes + shares + comments;
    const sentiments: ('Positive' | 'Negative' | 'Neutral')[] = ["Positive", "Negative", "Neutral"];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const authors = ["AlphaTrader", "MarketWhale", "BullishBot", "CryptoExpert", "TrendHunter"];
    const author = authors[Math.floor(Math.random() * authors.length)];
    
    const queryStr = query || "General search";
    const timestamp = new Date().toISOString();
    
    const newSocialItem = {
      id: Math.random().toString(36).substr(2, 9),
      platform,
      query: queryStr,
      author,
      authorAvatar: `https://picsum.photos/seed/${author}/100/100`,
      content: `Deep analysis on ${platform} for "${queryStr}" using account ${credentials?.email || credentials?.phone || "anonymous"}.`,
      sentiment,
      metrics: { likes, shares, comments },
      engagement,
      url: `https://${platform.toLowerCase()}.com/search?q=${encodeURIComponent(queryStr)}`,
      hashtags: [`#${queryStr.replace(/\s+/g, '')}`, '#MarketTrends', '#BotIntelligence'],
      mentions: ['@MarketLeader', '@CryptoWhale'],
      summary: `The overall sentiment for ${queryStr} is currently ${Math.random() > 0.5 ? 'bullish' : 'bearish'}. We observed a significant spike in engagement over the last 24 hours, primarily driven by discussions around recent volatility.`,
      topPosts: [
        { author: 'AlphaTrader', text: `Just saw some interesting movement in ${queryStr}. Might be a good time to look closer.`, engagement: 1200 },
        { author: 'MarketWatcher', text: `The latest data for ${queryStr} suggests a strong support level forming.`, engagement: 850 }
      ],
      timestamp
    };
    
    if (!bot.socialData) bot.socialData = [];
    bot.socialData.unshift(newSocialItem);

    const logEntry = { 
      type: 'output' as const, 
      content: `Keyword search performed on ${platform} for: "${query || "General search"}".`, 
      timestamp 
    };
    if (!bot.terminalHistory) bot.terminalHistory = [];
    bot.terminalHistory.push(logEntry);

    res.json(bot);
  });

  app.post("/api/bots/:id/command", (req, res) => {
    const { command } = req.body;
    const bot = bots.find(b => b.id === req.params.id);
    
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    let response = "";
    const timestamp = new Date().toISOString();

    if (command === "custom:scan_network") {
      response = `[${timestamp}] Network scan complete. Found 12 active nodes. Latency: 14ms.`;
    } else if (command === "custom:report_status") {
      response = `[${timestamp}] Status Report: ${bot.name} is ${bot.status}. Strategy: ${bot.strategy}. Current Risk: ${bot.riskLevel}.`;
    } else if (command === "custom:gather_social") {
      const platforms = ["X", "TikTok", "Instagram", "Facebook"];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const trends = ["#Crypto", "#Trading", "#AI", "#Market", "#Bullish", "#Bearish"];
      const trend = trends[Math.floor(Math.random() * trends.length)];
      const likes = Math.floor(Math.random() * 3000);
      const shares = Math.floor(Math.random() * 1000);
      const comments = Math.floor(Math.random() * 500);
      const engagement = likes + shares + comments;
      const sentiments: ('Positive' | 'Negative' | 'Neutral')[] = ["Positive", "Negative", "Neutral"];
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      const authors = ["TrendBot", "MarketAnalyst", "SocialSearcher", "IntelligenceHub"];
      const author = authors[Math.floor(Math.random() * authors.length)];
      
      const newSocialItem = {
        id: Math.random().toString(36).substr(2, 9),
        platform,
        query: trend,
        author,
        authorAvatar: `https://picsum.photos/seed/${author}/100/100`,
        content: `Automated intelligence gathering for trend: ${trend} on ${platform}.`,
        sentiment,
        metrics: { likes, shares, comments },
        engagement,
        url: `https://${platform.toLowerCase()}.com/search?q=${encodeURIComponent(trend)}`,
        hashtags: [trend, '#Trending', '#MarketWatch'],
        mentions: ['@TrendBot', '@MarketAnalyst'],
        summary: `The trend ${trend} is gaining significant traction on ${platform}. Sentiment is mostly ${sentiment.toLowerCase()}, with users discussing potential market implications.`,
        topPosts: [
          { author: 'TrendSetter', text: `Keep an eye on ${trend}. Something big is coming.`, engagement: 2100 },
          { author: 'DataGeek', text: `Analyzing ${trend} metrics... the growth is exponential.`, engagement: 1500 }
        ],
        timestamp: new Date().toISOString()
      };
      
      if (!bot.socialData) bot.socialData = [];
      bot.socialData.unshift(newSocialItem);
      response = `[${timestamp}] Social data gathered from ${platform}. Trend: ${trend}. Sentiment: ${sentiment}. Added to feed.`;
    } else if (command.startsWith("custom:")) {
      response = `[${timestamp}] Executed custom instruction: ${command.replace("custom:", "")}. Operation successful.`;
    } else {
      response = `[${timestamp}] Unknown command: ${command}. Type 'custom:' followed by a command.`;
    }

    res.json({ response, timestamp });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
