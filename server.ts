import express from "express";
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { BotManager } from "./src/lib/botManager";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const botManager = new BotManager();
  botManager.setSocketIO(io);

  app.use(express.json());

  // API Routes
  app.get("/api/bots", (req, res) => {
    res.json(botManager.getBots());
  });

  app.post("/api/bots", (req, res) => {
    const { name, type, config } = req.body;
    const id = botManager.createBot(name, type, config);
    res.json({ id });
  });

  app.post("/api/bots/:id/start", (req, res) => {
    const success = botManager.startBot(req.params.id);
    res.json({ success });
  });

  app.post("/api/bots/:id/stop", (req, res) => {
    const success = botManager.stopBot(req.params.id);
    res.json({ success });
  });

  app.post("/api/bots/:id/restart", (req, res) => {
    const success = botManager.restartBot(req.params.id);
    res.json({ success });
  });

  app.delete("/api/bots/:id", (req, res) => {
    const success = botManager.deleteBot(req.params.id);
    res.json({ success });
  });

  app.post("/api/bots/:id/command", async (req, res) => {
    try {
      const result = await botManager.sendCommand(req.params.id, req.body.command);
      res.json(result);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  app.get("/api/analytics", (req, res) => {
    res.json(botManager.getAnalytics());
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
