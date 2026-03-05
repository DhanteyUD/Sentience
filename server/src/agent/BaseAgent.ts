import { AgentWallet } from '../wallet/AgentWallet';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export type AgentStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'error';

export interface AgentConfig {
  name: string;
  tickIntervalMs: number;
  maxCycles?: number;
  description?: string;
}

export interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  cycleCount: number;
  lastAction: string;
  lastActionAt: string | null;
  startedAt: string | null;
  walletAddress: string;
  balanceSOL: number;
  actionLog: ActionLog[];
}

export interface ActionLog {
  timestamp: string;
  action: string;
  result: string;
  success: boolean;
  txSignature?: string;
}

export abstract class BaseAgent extends EventEmitter {
  public readonly name: string;
  public readonly description: string;
  protected wallet: AgentWallet;
  protected status: AgentStatus = 'idle';
  protected cycleCount: number = 0;
  protected lastAction: string = 'none';
  protected lastActionAt: string | null = null;
  protected startedAt: string | null = null;
  protected tickInterval: number;
  protected maxCycles: number;
  protected actionLog: ActionLog[] = [];
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(wallet: AgentWallet, config: AgentConfig) {
    super();
    this.wallet = wallet;
    this.name = config.name;
    this.description = config.description || '';
    this.tickInterval = config.tickIntervalMs;
    this.maxCycles = config.maxCycles || Infinity;
  }

  abstract tick(): Promise<void>;

  async onStart(): Promise<void> {}

  async onStop(): Promise<void> {}

  async start(): Promise<void> {
    if (this.status === 'running') return;
    this.status = 'running';
    this.startedAt = new Date().toISOString();
    logger.agent(`Agent "${this.name}" starting...`);
    await this.onStart();
    this.emit('started', this.getState());

    this.intervalHandle = setInterval(async () => {
      if (this.status !== 'running') return;
      try {
        await this.tick();
        this.cycleCount++;
        if (this.cycleCount >= this.maxCycles) {
          await this.stop();
        }
      } catch (err: any) {
        this.status = 'error';
        logger.error(`Agent "${this.name}" error: ${err.message}`);
        this.logAction('ERROR', err.message, false);
        this.emit('error', err);
      }
    }, this.tickInterval);
  }

  async stop(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.status = 'stopped';
    logger.agent(`Agent "${this.name}" stopped after ${this.cycleCount} cycles`);
    await this.onStop();
    this.emit('stopped', this.getState());
  }

  pause(): void {
    this.status = 'paused';
    logger.agent(`Agent "${this.name}" paused`);
    this.emit('paused', this.getState());
  }

  resume(): void {
    this.status = 'running';
    logger.agent(`Agent "${this.name}" resumed`);
    this.emit('resumed', this.getState());
  }

  protected logAction(action: string, result: string, success: boolean, txSignature?: string): void {
    const entry: ActionLog = {
      timestamp: new Date().toISOString(),
      action,
      result,
      success,
      txSignature,
    };
    this.actionLog.unshift(entry);
    if (this.actionLog.length > 50) this.actionLog.pop();
    this.lastAction = action;
    this.lastActionAt = entry.timestamp;
    this.emit('action', entry);
  }

  getState(): AgentState {
    return {
      id: this.wallet.id,
      name: this.name,
      status: this.status,
      cycleCount: this.cycleCount,
      lastAction: this.lastAction,
      lastActionAt: this.lastActionAt,
      startedAt: this.startedAt,
      walletAddress: this.wallet.getPublicKeyBase58(),
      balanceSOL: 0,
      actionLog: this.actionLog.slice(0, 10),
    };
  }

  getWallet(): AgentWallet {
    return this.wallet;
  }

  getStatus(): AgentStatus {
    return this.status;
  }
}
