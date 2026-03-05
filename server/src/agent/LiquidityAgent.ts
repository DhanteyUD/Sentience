import { BaseAgent, AgentConfig } from './BaseAgent';
import { AgentWallet } from '../wallet/AgentWallet';
import { logger } from '../utils/logger';

export interface LiquidityConfig extends AgentConfig {
  minBalanceThreshold?: number;
  rebalancePercent?: number;
  poolAddress?: string;
}

interface PoolState {
  tokenA: number;
  tokenB: number;
  totalLiquidity: number;
  apr: number;
  feesEarned: number;
}

export class LiquidityAgent extends BaseAgent {
  private config: LiquidityConfig;
  private poolState: PoolState = {
    tokenA: 0,
    tokenB: 0,
    totalLiquidity: 0,
    apr: 0,
    feesEarned: 0,
  };
  private depositedAmount: number = 0;

  constructor(wallet: AgentWallet, config: LiquidityConfig) {
    super(wallet, { ...config, description: 'Autonomous liquidity provision and rebalancing agent' });
    this.config = {
      minBalanceThreshold: 0.1,
      rebalancePercent: 50,
      ...config,
    };
  }

  async onStart(): Promise<void> {
    const balance = await this.wallet.getSOLBalance();
    logger.agent(`${this.name}: Balance: ${balance.toFixed(4)} SOL — initializing LP monitoring`);
    this.poolState = await this.fetchPoolState();
    logger.agent(`${this.name}: Pool APR: ${this.poolState.apr.toFixed(2)}%`);
  }

  async tick(): Promise<void> {
    const balance = await this.wallet.getSOLBalance();
    this.poolState = await this.fetchPoolState();

    logger.agent(
      `${this.name}: Balance=${balance.toFixed(4)} SOL | Pool APR=${this.poolState.apr.toFixed(1)}% | Fees=${this.poolState.feesEarned.toFixed(4)} USDC`
    );

    // Decision 1: Add liquidity if we have enough balance
    if (balance > (this.config.minBalanceThreshold! * 3) && this.depositedAmount === 0) {
      await this.addLiquidity(balance * 0.3);
      return;
    }

    // Decision 2: Harvest fees if significant
    if (this.poolState.feesEarned > 0.1) {
      await this.harvestFees();
      return;
    }

    // Decision 3: Rebalance if pool is imbalanced
    const ratio = this.poolState.tokenA / (this.poolState.tokenA + this.poolState.tokenB);
    if (Math.abs(ratio - 0.5) > 0.15) {
      await this.rebalancePool();
      return;
    }

    // Decision 4: Remove liquidity if balance critically low
    if (balance < this.config.minBalanceThreshold! && this.depositedAmount > 0) {
      await this.removeLiquidity();
      return;
    }

    this.logAction('MONITOR', `Pool healthy: APR ${this.poolState.apr.toFixed(1)}%, balance OK`, true);
  }

  private async fetchPoolState(): Promise<PoolState> {
    // Simulated pool data (in production, query Orca/Raydium pool accounts)
    const baseAPR = 15 + Math.random() * 20;
    const feeDrift = Math.random() * 0.05;
    return {
      tokenA: 1000 + Math.random() * 100,
      tokenB: 1000 + (Math.random() - 0.5) * 300, // can become imbalanced
      totalLiquidity: 50000 + Math.random() * 5000,
      apr: baseAPR,
      feesEarned: this.poolState.feesEarned + feeDrift,
    };
  }

  private async addLiquidity(amountSOL: number): Promise<void> {
    this.depositedAmount = amountSOL;
    this.logAction(
      'ADD_LIQUIDITY',
      `Added ${amountSOL.toFixed(4)} SOL to LP pool — expected APR: ${this.poolState.apr.toFixed(1)}%`,
      true
    );
    logger.success(`${this.name}: Added ${amountSOL.toFixed(4)} SOL to liquidity pool`);
  }

  private async harvestFees(): Promise<void> {
    const fees = this.poolState.feesEarned;
    this.poolState.feesEarned = 0;
    this.logAction('HARVEST', `Harvested ${fees.toFixed(4)} USDC in fees`, true);
    logger.success(`${this.name}: Harvested ${fees.toFixed(4)} USDC fees`);
  }

  private async rebalancePool(): Promise<void> {
    this.logAction(
      'REBALANCE',
      `Rebalancing pool: tokenA=${this.poolState.tokenA.toFixed(0)}, tokenB=${this.poolState.tokenB.toFixed(0)}`,
      true
    );
    logger.success(`${this.name}: Pool rebalanced`);
  }

  private async removeLiquidity(): Promise<void> {
    const withdrawn = this.depositedAmount;
    this.depositedAmount = 0;
    this.logAction('REMOVE_LIQUIDITY', `Withdrew ${withdrawn.toFixed(4)} SOL from LP (low balance protection)`, true);
    logger.warn(`${this.name}: Emergency LP withdrawal to preserve balance`);
  }

  getPoolState(): PoolState {
    return { ...this.poolState };
  }
}
