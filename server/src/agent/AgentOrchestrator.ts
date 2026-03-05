import { BaseAgent, AgentState } from './BaseAgent';
import { WalletManager } from '../wallet/WalletManager';
import { TradingAgent, TradingConfig } from './TradingAgent';
import { LiquidityAgent, LiquidityConfig } from './LiquidityAgent';
import { MonitorAgent, MonitorConfig } from './MonitorAgent';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();
  private walletManager: WalletManager;
  private static instance: AgentOrchestrator;

  constructor() {
    super();
    this.walletManager = WalletManager.getInstance();
  }

  static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  spawnTradingAgent(name: string, config?: Partial<TradingConfig>): TradingAgent {
    const wallet = this.walletManager.createWallet(name);
    const agent = new TradingAgent(wallet, {
      name,
      tickIntervalMs: 5000,
      strategy: 'DCA',
      tradeAmountSOL: 0.001,
      ...config,
    });
    this.registerAgent(agent);
    return agent;
  }

  spawnLiquidityAgent(name: string, config?: Partial<LiquidityConfig>): LiquidityAgent {
    const wallet = this.walletManager.createWallet(name);
    const agent = new LiquidityAgent(wallet, {
      name,
      tickIntervalMs: 8000,
      ...config,
    });
    this.registerAgent(agent);
    return agent;
  }

  spawnMonitorAgent(name: string, config?: Partial<MonitorConfig>): MonitorAgent {
    const wallet = this.walletManager.createWallet(name);
    const agent = new MonitorAgent(wallet, {
      name,
      tickIntervalMs: 6000,
      riskTolerance: 'MEDIUM',
      ...config,
    });
    this.registerAgent(agent);
    return agent;
  }

  private registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.getWallet().id, agent);

    agent.on('action', (action) => {
      this.emit('agentAction', { agentName: agent.name, ...action });
    });

    agent.on('alert', (alert) => {
      this.emit('alert', { agentName: agent.name, ...alert });
    });

    agent.on('error', (err) => {
      logger.error(`Orchestrator: agent "${agent.name}" errored: ${err.message}`);
    });

    logger.agent(`Orchestrator: registered agent "${agent.name}"`);
  }

  async startAll(): Promise<void> {
    logger.banner(`Starting ${this.agents.size} agents`);
    for (const agent of this.agents.values()) {
      await agent.start();
      await new Promise(r => setTimeout(r, 300));
    }
  }

  async stopAll(): Promise<void> {
    logger.info('Stopping all agents...');
    for (const agent of this.agents.values()) {
      await agent.stop();
    }
  }

  async startAgent(id: string): Promise<void> {
    this.agents.get(id)?.start();
  }

  async stopAgent(id: string): Promise<void> {
    this.agents.get(id)?.stop();
  }

  pauseAgent(id: string): void {
    this.agents.get(id)?.pause();
  }

  resumeAgent(id: string): void {
    this.agents.get(id)?.resume();
  }

  async fundAllAgents(amountSOL: number = 1): Promise<void> {
    logger.info(`Funding ${this.agents.size} agents with ${amountSOL} SOL each...`);
    for (const agent of this.agents.values()) {
      try {
        await agent.getWallet().requestAirdrop(amountSOL);
        await new Promise(r => setTimeout(r, 1000));
      } catch (e: any) {
        logger.warn(`Could not airdrop to ${agent.name}: ${e.message}`);
      }
    }
  }

  async getSystemStatus(): Promise<{ agents: AgentState[]; totalWallets: number; totalBalance: number }> {
    const states: AgentState[] = [];
    let totalBalance = 0;

    for (const agent of this.agents.values()) {
      const state = agent.getState();
      try {
        state.balanceSOL = await agent.getWallet().getSOLBalance();
        totalBalance += state.balanceSOL;
      } catch (e) {}
      states.push(state);
    }

    return {
      agents: states,
      totalWallets: this.walletManager.count,
      totalBalance,
    };
  }

  getAgents(): Map<string, BaseAgent> {
    return this.agents;
  }

  getAgent(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  get count(): number {
    return this.agents.size;
  }
}
