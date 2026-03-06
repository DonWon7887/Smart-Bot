import { DecisionEngine, Decision } from '../decisionEngine';

export abstract class BaseBot {
  public status: 'running' | 'stopped' = 'stopped';
  protected intervalId: NodeJS.Timeout | null = null;
  protected decisionEngine: DecisionEngine;

  constructor(
    public id: string,
    public name: string,
    public config: any,
    private onDecision: (decision: any) => void
  ) {
    this.decisionEngine = new DecisionEngine();
  }

  abstract getBotType(): string;
  abstract collectData(): Promise<any>;
  abstract executeDecision(decision: Decision): Promise<any>;

  async start() {
    if (this.status === 'running') return;
    this.status = 'running';
    
    const runLoop = async () => {
      if (this.status !== 'running') return;
      
      try {
        const data = await this.collectData();
        const decision = await this.decisionEngine.analyzeSituation(this.getBotType(), data);
        const result = await this.executeDecision(decision);
        
        this.onDecision({
          bot_id: this.id,
          decision,
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Bot ${this.name} error:`, error);
      }

      const interval = (this.config.interval || 60) * 1000;
      this.intervalId = setTimeout(runLoop, interval);
    };

    runLoop();
  }

  stop() {
    this.status = 'stopped';
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  updateConfig(newConfig: any) {
    this.config = { ...this.config, ...newConfig };
  }
}
