import { BaseBot } from './baseBot';
import { Decision } from '../decisionEngine';

export class TradingBot extends BaseBot {
  private portfolio = {
    balance: 10000,
    positions: [] as any[]
  };

  getBotType() {
    return 'trading';
  }

  async collectData() {
    // Simulate market data
    return {
      market_data: {
        btc_price: 45000 + (Math.random() * 1000 - 500),
        btc_price_change: (Math.random() * 10 - 5),
        volume_24h: 1200000000,
        sentiment: Math.random()
      },
      portfolio: this.portfolio
    };
  }

  async executeDecision(decision: Decision) {
    const { action } = decision;
    let success = true;
    let message = `Executed ${action}`;

    if (action === 'buy') {
      const amount = 100;
      if (this.portfolio.balance >= amount) {
        this.portfolio.balance -= amount;
        this.portfolio.positions.push({ type: 'BTC', amount: 0.002, entry: 45000 });
      } else {
        success = false;
        message = "Insufficient funds";
      }
    } else if (action === 'sell') {
      if (this.portfolio.positions.length > 0) {
        this.portfolio.positions.pop();
        this.portfolio.balance += 105; // Simulate profit
      } else {
        success = false;
        message = "No positions to sell";
      }
    } else if (action === 'query') {
      message = `Current Portfolio: Balance $${this.portfolio.balance.toFixed(2)}, ${this.portfolio.positions.length} active positions.`;
    } else {
      message = `Trading Bot executed custom action: ${action}`;
    }

    return { success, message, portfolio: this.portfolio };
  }
}

export class SocialBot extends BaseBot {
  getBotType() {
    return 'social';
  }

  async collectData() {
    return {
      trending_topics: ['AI', 'Web3', 'Sustainability'],
      mentions: Math.floor(Math.random() * 100),
      engagement_rate: Math.random() * 0.1
    };
  }

  async executeDecision(decision: Decision) {
    let message = `Social action: ${decision.action}`;
    if (decision.action === 'query') {
      const data = await this.collectData();
      message = `Social Status: Trending [${data.trending_topics.join(', ')}], Mentions: ${data.mentions}, Engagement: ${(data.engagement_rate * 100).toFixed(2)}%`;
    } else if (decision.action !== 'wait' && decision.action !== 'hold') {
      message = `Social Bot processed custom request: ${decision.action}`;
    }
    return { success: true, action: decision.action, message };
  }
}

export class MonitorBot extends BaseBot {
  getBotType() {
    return 'monitor';
  }

  async collectData() {
    return {
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 100,
      uptime: process.uptime(),
      errors_last_hour: Math.floor(Math.random() * 5)
    };
  }

  async executeDecision(decision: Decision) {
    let message = `Monitor action: ${decision.action}`;
    if (decision.action === 'query') {
      const data = await this.collectData();
      message = `System Status: CPU ${data.cpu_usage.toFixed(1)}%, Memory ${data.memory_usage.toFixed(1)}%, Uptime ${Math.floor(data.uptime)}s, Errors: ${data.errors_last_hour}`;
    } else if (decision.action !== 'wait' && decision.action !== 'hold') {
      message = `Monitor Bot performed system task: ${decision.action}`;
    }
    return { success: true, action: decision.action, message };
  }
}
