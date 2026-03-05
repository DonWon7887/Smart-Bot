import express, { Request, Response, NextFunction } from "express";
import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { BotManager } from "./src/lib/botManager";
import { UserManager } from "./src/lib/userManager";
import cookieParser from "cookie-parser";
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
  const userManager = new UserManager();
  botManager.setSocketIO(io);

  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const user = userManager.verifyToken(token);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    (req as any).user = user;
    next();
  };

  // Auth Routes
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const result = await userManager.login(username, password);
    if (!result) return res.status(401).json({ error: "Invalid credentials" });

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ user: result.user });
  });

  app.post("/api/auth/verify-2fa", async (req, res) => {
    const { userId, code } = req.body;
    const result = await userManager.verify2FA(userId, code);
    if (!result) return res.status(401).json({ error: "Invalid 2FA code" });

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ user: result.user });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    const success = await userManager.requestOTP(email);
    res.json({ success });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const success = await userManager.resetPassword(email, otp, newPassword);
    res.json({ success });
  });

  app.post("/api/auth/forgot-username", async (req, res) => {
    const { email } = req.body;
    const username = await userManager.retrieveUsername(email);
    res.json({ success: !!username });
  });

  app.post("/api/auth/2fa/setup", authenticate, async (req, res) => {
    const result = await userManager.generate2FA((req as any).user.id);
    res.json(result);
  });

  app.post("/api/auth/2fa/enable", authenticate, async (req, res) => {
    const { code } = req.body;
    const success = await userManager.enable2FA((req as any).user.id, code);
    res.json({ success });
  });

  app.post("/api/auth/2fa/disable", authenticate, async (req, res) => {
    const success = await userManager.disable2FA((req as any).user.id);
    res.json({ success });
  });

  app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/me", (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const user = userManager.verifyToken(token);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    res.json({ user });
  });

  // API Routes
  app.get("/api/bots", authenticate, (req, res) => {
    res.json(botManager.getBots());
  });

  app.post("/api/bots", authenticate, (req, res) => {
    const { name, type, config } = req.body;
    const id = botManager.createBot(name, type, config);
    res.json({ id });
  });

  app.post("/api/bots/:id/start", authenticate, (req, res) => {
    const success = botManager.startBot(req.params.id);
    res.json({ success });
  });

  app.post("/api/bots/:id/stop", authenticate, (req, res) => {
    const success = botManager.stopBot(req.params.id);
    res.json({ success });
  });

  app.post("/api/bots/:id/command", authenticate, async (req, res) => {
    const response = await botManager.sendCommand(req.params.id, req.body.command);
    res.json({ response });
  });

  app.post("/api/bots/:id/restart", authenticate, (req, res) => {
    const success = botManager.restartBot(req.params.id);
    res.json({ success });
  });

  app.delete("/api/bots/:id", authenticate, (req, res) => {
    const success = botManager.deleteBot(req.params.id);
    res.json({ success });
  });

  app.get("/api/analytics", authenticate, (req, res) => {
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
