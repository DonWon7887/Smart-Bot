import { TradingBot, SocialBot, MonitorBot, WhaleWatcherBot } from './bots/implementations';
import db from './db';
import { Server as SocketServer } from 'socket.io';

export class BotManager {
  private activeBots: Map<string, any> = new Map();
  private io: SocketServer | null = null;

  constructor() {
    // Load bots from DB and initialize
    const bots = db.prepare('SELECT * FROM bots').all() as any[];
    bots.forEach(botData => {
      this.initializeBot(botData);
    });
  }

  setSocketIO(io: SocketServer) {
    this.io = io;
  }

  private initializeBot(botData: any) {
    const config = JSON.parse(botData.config);
    let bot;

    const onDecision = (data: any) => {
      // Save decision to DB
      const stmt = db.prepare(`
        INSERT INTO decisions (bot_id, action, confidence, reasoning, result)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        data.bot_id,
        data.decision.action,
        data.decision.confidence,
        JSON.stringify(data.decision.reasoning),
        JSON.stringify(data.result)
      );

      // Broadcast to clients
      if (this.io) {
        this.io.emit('bot_update', {
          bot_id: data.bot_id,
          decision: data.decision,
          result: data.result
        });
      }
    };

    switch (botData.type) {
      case 'trading':
        bot = new TradingBot(botData.id, botData.name, config, onDecision, !!botData.frozen);
        break;
      case 'social':
        bot = new SocialBot(botData.id, botData.name, config, onDecision, !!botData.frozen);
        break;
      case 'monitor':
        bot = new MonitorBot(botData.id, botData.name, config, onDecision, !!botData.frozen);
        break;
      case 'whale_watcher':
        bot = new WhaleWatcherBot(botData.id, botData.name, config, onDecision, !!botData.frozen);
        break;
      default:
        return;
    }

    this.activeBots.set(botData.id, bot);
    if (botData.status === 'running') {
      bot.start();
    }
  }

  createBot(name: string, type: string, config: any) {
    const id = Math.random().toString(36).substring(2, 10);
    const stmt = db.prepare('INSERT INTO bots (id, name, type, status, config) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, name, type, 'stopped', JSON.stringify(config));
    
    const botData = { id, name, type, config: JSON.stringify(config), status: 'stopped' };
    this.initializeBot(botData);
    return id;
  }

  startBot(id: string) {
    const bot = this.activeBots.get(id);
    if (bot) {
      bot.start();
      db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('running', id);
      return true;
    }
    return false;
  }

  stopBot(id: string) {
    const bot = this.activeBots.get(id);
    if (bot) {
      bot.stop();
      db.prepare('UPDATE bots SET status = ? WHERE id = ?').run('stopped', id);
      return true;
    }
    return false;
  }

  async executeCommand(id: string, command: string, args: any) {
    const bot = this.activeBots.get(id);
    if (!bot) return { success: false, message: 'Bot not found' };
    
    if (command === 'freeze') {
      bot.freeze();
      db.prepare('UPDATE bots SET frozen = 1 WHERE id = ?').run(id);
      return { success: true, message: 'Bot frozen' };
    }
    
    if (command === 'unfreeze') {
      bot.unfreeze();
      db.prepare('UPDATE bots SET frozen = 0 WHERE id = ?').run(id);
      return { success: true, message: 'Bot unfrozen' };
    }
    
    const result = await bot.handleCommand(command, args);
    
    // Broadcast command result
    if (this.io) {
      this.io.emit('bot_command_result', {
        bot_id: id,
        command,
        result
      });
    }
    
    return result;
  }

  getBots() {
    const bots = db.prepare('SELECT * FROM bots').all() as any[];
    return bots.map(b => {
      const metrics = this.getBotMetrics(b.id);
      const botInstance = this.activeBots.get(b.id);
      return {
        ...b,
        frozen: !!b.frozen,
        config: JSON.parse(b.config),
        metrics,
        decisions: metrics.last_decisions,
        state: botInstance ? botInstance.getState() : null
      };
    });
  }

  private getBotMetrics(id: string) {
    const decisions = db.prepare('SELECT * FROM decisions WHERE bot_id = ? ORDER BY timestamp DESC LIMIT 10').all(id);
    const total = db.prepare('SELECT COUNT(*) as count FROM decisions WHERE bot_id = ?').get(id) as any;
    return {
      total_decisions: total.count,
      last_decisions: decisions.map((d: any) => ({
        ...d,
        reasoning: JSON.parse(d.reasoning),
        result: JSON.parse(d.result)
      }))
    };
  }

  getAnalytics() {
    const totalBots = db.prepare('SELECT COUNT(*) as count FROM bots').get() as any;
    const activeBots = db.prepare("SELECT COUNT(*) as count FROM bots WHERE status = 'running'").get() as any;
    const totalDecisions = db.prepare('SELECT COUNT(*) as count FROM decisions').get() as any;
    
    return {
      total_bots: totalBots.count,
      active_bots: activeBots.count,
      total_decisions: totalDecisions.count
    };
  }
}
