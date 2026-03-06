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

  getState() {
    return this.portfolio;
  }

  async executeDecision(decision: Decision) {
    const { action } = decision;
    let success = true;
    let message = `Executed ${action}`;

    // Get current market data for execution
    const data = await this.collectData();
    const currentPrice = data.market_data.btc_price;

    if (action === 'buy') {
      const amount = 100;
      if (this.portfolio.balance >= amount) {
        this.portfolio.balance -= amount;
        this.portfolio.positions.push({ 
          type: 'BTC', 
          amount: amount / currentPrice, 
          entry: currentPrice,
          timestamp: new Date().toISOString()
        });
      } else {
        success = false;
        message = "Insufficient funds";
      }
    } else if (action === 'sell') {
      if (this.portfolio.positions.length > 0) {
        const position = this.portfolio.positions.pop();
        const profit = (currentPrice - position.entry) * position.amount;
        this.portfolio.balance += (position.amount * currentPrice);
        message = `Sold position for ${profit >= 0 ? 'profit' : 'loss'} of $${Math.abs(profit).toFixed(2)}`;
      } else {
        success = false;
        message = "No positions to sell";
      }
    } else if (action === 'query') {
      message = `Current Portfolio: Balance $${this.portfolio.balance.toFixed(2)}, ${this.portfolio.positions.length} active positions.`;
    } else {
      message = `Trading Bot executed custom action: ${action}`;
    }

    return { success, message, portfolio: this.portfolio, market_data: data.market_data };
  }
}

export class SocialBot extends BaseBot {
  private state = {
    last_post: null as string | null,
    total_engagement: 0,
    posts_count: 0
  };

  getState() {
    return this.state;
  }

  getBotType() {
    return 'social';
  }

  async collectData() {
    return {
      trending_topics: ['AI', 'Web3', 'Sustainability', 'Gemini', 'Automation'],
      mentions: Math.floor(Math.random() * 100),
      engagement_rate: Math.random() * 0.1,
      state: this.state
    };
  }

  async executeDecision(decision: Decision) {
    let message = `Social action: ${decision.action}`;
    let success = true;

    if (decision.action === 'post' || decision.action === 'comment') {
      this.state.posts_count++;
      this.state.last_post = new Date().toISOString();
      this.state.total_engagement += Math.floor(Math.random() * 50);
      message = `Successfully performed ${decision.action}`;
    } else if (decision.action === 'query') {
      const data = await this.collectData();
      message = `Social Status: Trending [${data.trending_topics.join(', ')}], Mentions: ${data.mentions}, Engagement: ${(data.engagement_rate * 100).toFixed(2)}%`;
    } else if (decision.action !== 'wait' && decision.action !== 'hold') {
      message = `Social Bot processed custom request: ${decision.action}`;
    }

    return { success, action: decision.action, message, state: this.state };
  }
}

export class MonitorBot extends BaseBot {
  private alerts: any[] = [];

  getState() {
    return {
      alerts_count: this.alerts.length,
      recent_alerts: this.alerts.slice(-5)
    };
  }

  getBotType() {
    return 'monitor';
  }

  async collectData() {
    return {
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 100,
      uptime: process.uptime(),
      errors_last_hour: Math.floor(Math.random() * 5),
      alerts: this.alerts
    };
  }

  async executeDecision(decision: Decision) {
    let message = `Monitor action: ${decision.action}`;
    let success = true;

    if (decision.action === 'alert') {
      const alert = {
        type: 'SYSTEM_ALERT',
        message: decision.reasoning?.summary || 'Anomalous activity detected',
        timestamp: new Date().toISOString()
      };
      this.alerts.push(alert);
      message = `Alert triggered: ${alert.message}`;
    } else if (decision.action === 'query') {
      const data = await this.collectData();
      message = `System Status: CPU ${data.cpu_usage.toFixed(1)}%, Memory ${data.memory_usage.toFixed(1)}%, Uptime ${Math.floor(data.uptime)}s, Errors: ${data.errors_last_hour}`;
    } else if (decision.action !== 'wait' && decision.action !== 'hold') {
      message = `Monitor Bot performed system task: ${decision.action}`;
    }

    return { success, action: decision.action, message, state: this.getState() };
  }
}
