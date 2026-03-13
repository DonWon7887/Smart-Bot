import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import authRouter from "./server/auth";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

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
    query?: string;
    type?: 'social' | 'webpage' | 'wallet' | 'keyword' | 'hashtag' | 'account';
    subject?: string;
    requestedContext?: string;
  }[];
  connectedSocials: string[];
  socialCredentials?: { platform: string; email?: string; phone?: string; password?: string }[];
  monitoringTargets?: { type: string; value: string; label: string; addedAt: string }[];
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

let bots: Bot[] = [];

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());
  app.use(authRouter);

  // WebSocket handling
  const clients = new Set<WebSocket>();
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Simulate real-time social activity
  setInterval(() => {
    const activeBots = bots.filter(b => b.status === 'Active');
    if (activeBots.length === 0) return;

    const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
    const platforms = ["X", "TikTok", "Instagram", "Facebook"];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const authors = ["AlphaTrader", "MarketWhale", "BullishBot", "CryptoExpert", "TrendHunter"];
    const author = authors[Math.floor(Math.random() * authors.length)];
    const sentiments: ('Positive' | 'Negative' | 'Neutral')[] = ["Positive", "Negative", "Neutral"];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    
    const content = `Real-time update for ${bot.tradingPair}: Market showing ${sentiment.toLowerCase()} signals on ${platform}.`;
    const newSocialItem = {
      id: Math.random().toString(36).substr(2, 9),
      platform,
      content,
      timestamp: new Date().toISOString(),
      sentiment,
      author,
      authorAvatar: `https://picsum.photos/seed/${author}/100/100`,
      metrics: {
        likes: Math.floor(Math.random() * 500),
        shares: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 50)
      },
      engagement: Math.floor(Math.random() * 1000),
      url: `https://${platform.toLowerCase()}.com/post/${Math.random().toString(36).substr(2, 9)}`,
      hashtags: [bot.tradingPair.replace('/', ''), '#MarketUpdate'],
      mentions: ['@BotIntelligence']
    };

    bot.socialData = [newSocialItem];

    broadcast({
      type: 'NOTIFICATION',
      payload: {
        id: newSocialItem.id,
        title: `New Social Activity: ${bot.name}`,
        message: content,
        platform,
        url: newSocialItem.url,
        timestamp: newSocialItem.timestamp,
        botId: bot.id
      }
    });
  }, 15000); // Every 15 seconds

  // Helper to sanitize bots before sending to client
  const sanitizeBot = (bot: Bot) => {
    const sanitized = { ...bot };
    if (sanitized.socialCredentials) {
      sanitized.socialCredentials = sanitized.socialCredentials.map(c => ({
        platform: c.platform,
        email: c.email,
        phone: c.phone
        // Intentionally omitting password for security
      }));
    }
    return sanitized;
  };

  // API Routes
  app.get("/api/bots", (req, res) => {
    res.json(bots.map(sanitizeBot));
  });

  app.get("/api/bots/:id", (req, res) => {
    const bot = bots.find(b => b.id === req.params.id);
    if (bot) {
      res.json(sanitizeBot(bot));
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
    const { query, generatedSummary, retrievedPosts, type } = req.body;
    const bot = bots.find(b => b.id === id);
    
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    // Only check for connected socials if it's a social search and not a generic monitoring scan
    if (type === 'social' && !bot.connectedSocials?.includes(platform)) {
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
      type: type || 'social',
      subject: queryStr,
      requestedContext: `Monitoring request for ${type || 'social'} target: ${queryStr}`,
      author,
      authorAvatar: `https://picsum.photos/seed/${author}/100/100`,
      content: generatedSummary || `Deep analysis on ${platform} for "${queryStr}" using account ${credentials?.email || credentials?.phone || "anonymous"}.`,
      sentiment,
      metrics: { likes, shares, comments },
      engagement,
      url: `https://${platform.toLowerCase()}.com/search?q=${encodeURIComponent(queryStr)}`,
      hashtags: [`#${queryStr.replace(/\s+/g, '')}`, '#MarketTrends', '#BotIntelligence'],
      mentions: ['@MarketLeader', '@CryptoWhale'],
      summary: generatedSummary || `The overall sentiment for ${queryStr} is currently ${Math.random() > 0.5 ? 'bullish' : 'bearish'}. We observed a significant spike in engagement over the last 24 hours, primarily driven by discussions around recent volatility.`,
      topPosts: retrievedPosts ? retrievedPosts.map((p: any) => ({ author: p.author, text: p.content, engagement: p.engagement })) : Array.from({ length: 10 }).map((_, i) => ({
        author: `User_${Math.floor(Math.random() * 1000)}`,
        text: `This is a simulated search result for ${queryStr} on ${platform}.`,
        engagement: Math.floor(Math.random() * 5000)
      })),
      timestamp
    };
    
    if (!bot.socialData) bot.socialData = [];
    bot.socialData = [newSocialItem, ...bot.socialData].slice(0, 50);

    const logEntry = { 
      type: 'output' as const, 
      content: `Intelligence gathering performed for ${type || 'social'} target: "${queryStr}" on ${platform}.`, 
      timestamp 
    };
    if (!bot.terminalHistory) bot.terminalHistory = [];
    bot.terminalHistory.push(logEntry);

    broadcast({
      type: 'NOTIFICATION',
      payload: {
        id: newSocialItem.id,
        title: `Intelligence Gathered: ${bot.name}`,
        message: `New data for ${type || 'social'} target "${queryStr}" on ${platform}.`,
        platform,
        url: newSocialItem.url,
        timestamp: newSocialItem.timestamp,
        botId: bot.id
      }
    });

    res.json(bot);
  });

  app.post("/api/bots/:id/monitoring-targets", (req, res) => {
    const { id } = req.params;
    const { type, value, label } = req.body;
    const bot = bots.find(b => b.id === id);
    
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    if (!bot.monitoringTargets) bot.monitoringTargets = [];
    
    const newTarget = {
      type,
      value,
      label,
      addedAt: new Date().toISOString()
    };

    bot.monitoringTargets.push(newTarget);
    res.json(bot);
  });

  app.delete("/api/bots/:id/monitoring-targets/:index", (req, res) => {
    const { id, index } = req.params;
    const bot = bots.find(b => b.id === id);
    
    if (!bot) {
      return res.status(404).json({ error: "Bot not found" });
    }

    if (bot.monitoringTargets) {
      bot.monitoringTargets.splice(parseInt(index), 1);
    }
    
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
        topPosts: Array.from({ length: 10 }).map((_, i) => ({
          author: `User_${Math.floor(Math.random() * 1000)}`,
          text: `This is a simulated intelligence post about ${trend} on ${platform}.`,
          engagement: Math.floor(Math.random() * 5000)
        })),
        timestamp: new Date().toISOString()
      };
      
      bot.socialData = [newSocialItem];
      response = `[${timestamp}] Social data gathered from ${platform}. Trend: ${trend}. Sentiment: ${sentiment}. Added to feed.`;

      broadcast({
        type: 'NOTIFICATION',
        payload: {
          id: newSocialItem.id,
          title: `Intelligence Gathered: ${bot.name}`,
          message: `New trend detected: ${trend} on ${platform}.`,
          platform,
          url: newSocialItem.url,
          timestamp: newSocialItem.timestamp,
          botId: bot.id
        }
      });
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
