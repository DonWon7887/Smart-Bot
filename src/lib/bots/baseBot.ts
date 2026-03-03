import { DecisionEngine, Decision } from '../decisionEngine';

export abstract class BaseBot {
  public status: 'running' | 'stopped' = 'stopped';
  public frozen: boolean = false;
  protected intervalId: NodeJS.Timeout | null = null;
  protected decisionEngine: DecisionEngine;

  constructor(
    public id: string,
    public name: string,
    public config: any,
    private onDecision: (decision: any) => void,
    frozen: boolean = false
  ) {
    this.decisionEngine = new DecisionEngine();
    this.frozen = frozen;
  }

  abstract getBotType(): string;
  abstract collectData(): Promise<any>;
  abstract executeDecision(decision: Decision): Promise<any>;
  
  async handleCommand(command: string, args: any): Promise<any> {
    if (this.frozen && command !== 'unfreeze') {
      return { success: false, message: 'Bot is frozen. Unfreeze to execute commands.' };
    }
    return { success: false, message: `Command ${command} not implemented for ${this.getBotType()}` };
  }
  
  getState(): any {
    return { frozen: this.frozen };
  }

  async start() {
    if (this.status === 'running') return;
    this.status = 'running';
    
    const runLoop = async () => {
      if (this.status !== 'running') return;
      
      if (!this.frozen) {
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

  freeze() {
    this.frozen = true;
  }

  unfreeze() {
    this.frozen = false;
  }

  updateConfig(newConfig: any) {
    if (this.frozen) return;
    this.config = { ...this.config, ...newConfig };
  }
}
