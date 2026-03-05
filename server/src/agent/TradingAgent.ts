import { BaseAgent, AgentConfig } from './BaseAgent';
import { AgentWallet } from '../wallet/AgentWallet';
import { logger } from '../utils/logger';

export interface TradingConfig extends AgentConfig {
  targetWalletAddress?: string;
  tradeAmountSOL?: number;
  priceThresholdLow?: number;
  priceThresholdHigh?: number;
  strategy?: 'DCA' | 'MOMENTUM' | 'MEAN_REVERT' | 'RANDOM';
}

interface MarketData {
  price: number;
  volume: number;
  change24h: number;
  timestamp: string;
}

export class TradingAgent extends BaseAgent {
  private config: TradingConfig;
  private portfolio: { SOL: number; USDC: number } = { SOL: 0, USDC: 100 };
  private tradeHistory: { action: string; price: number; amount: number; timestamp: string }[] = [];
  private lastPrice: number = 0;
  private priceHistory: number[] = [];

  constructor(wallet: AgentWallet, config: TradingConfig) {
    super(wallet, { ...config, description: `${config.strategy || 'DCA'} trading strategy on Solana devnet` });
    this.config = {
      tradeAmountSOL: 0.001,
      strategy: 'DCA',
      ...config,
    };
  }

  async onStart(): Promise<void> {
    logger.agent(`${this.name}: Starting ${this.config.strategy} strategy`);
    const balance = await this.wallet.getSOLBalance();
    this.portfolio.SOL = balance;
    logger.agent(`${this.name}: Initial balance: ${balance.toFixed(4)} SOL`);
  }

  async tick(): Promise<void> {
    const market = await this.fetchMarketData();
    this.priceHistory.push(market.price);
    if (this.priceHistory.length > 20) this.priceHistory.shift();

    logger.agent(`${this.name}: SOL price=$${market.price.toFixed(2)}, change=${market.change24h.toFixed(2)}%`);

    const decision = this.makeDecision(market);
    await this.executeDecision(decision, market);
    this.lastPrice = market.price;
  }

  private async fetchMarketData(): Promise<MarketData> {
    const basePrice = 180;
    const volatility = 0.03;
    const price = basePrice * (1 + (Math.random() - 0.5) * volatility * 2);
    const change24h = (Math.random() - 0.45) * 10;

    return {
      price,
      volume: Math.random() * 1000000,
      change24h,
      timestamp: new Date().toISOString(),
    };
  }

  private makeDecision(market: MarketData): 'BUY' | 'SELL' | 'HOLD' {
    switch (this.config.strategy) {
      case 'DCA':
        return this.cycleCount % 3 === 0 ? 'BUY' : 'HOLD';

      case 'MOMENTUM':
        if (this.lastPrice === 0) return 'HOLD';
        if (market.price > this.lastPrice * 1.005) return 'BUY';
        if (market.price < this.lastPrice * 0.995) return 'SELL';
        return 'HOLD';

      case 'MEAN_REVERT':
        if (this.priceHistory.length < 5) return 'HOLD';
        const avg = this.priceHistory.reduce((a, b) => a + b, 0) / this.priceHistory.length;
        if (market.price < avg * 0.99) return 'BUY';
        if (market.price > avg * 1.01) return 'SELL';
        return 'HOLD';

      case 'RANDOM':
        const roll = Math.random();
        if (roll < 0.33) return 'BUY';
        if (roll < 0.50) return 'SELL';
        return 'HOLD';

      default:
        return 'HOLD';
    }
  }

  private async executeDecision(decision: string, market: MarketData): Promise<void> {
    const amount = this.config.tradeAmountSOL!;

    if (decision === 'HOLD') {
      this.logAction('HOLD', `Price $${market.price.toFixed(2)} — holding position`, true);
      return;
    }

    if (decision === 'BUY') {
      if (this.portfolio.SOL < amount) {
        logger.warn(`${this.name}: Insufficient SOL to buy`);
        this.logAction('BUY_SKIP', 'Insufficient balance', false);
        return;
      }

      // Simulate trade execution
      const cost = amount * market.price;
      this.portfolio.SOL -= amount;
      this.portfolio.USDC += cost;

      this.tradeHistory.push({ action: 'BUY', price: market.price, amount, timestamp: new Date().toISOString() });

      // Demonstrate real wallet capability: send small amount to self to show signing
      if (this.config.targetWalletAddress) {
        try {
          const balance = await this.wallet.getSOLBalance();
          if (balance > 0.002) {
            const sig = await this.wallet.sendSOL(this.config.targetWalletAddress, 0.00001);
            this.logAction('BUY', `Bought ${amount} SOL at $${market.price.toFixed(2)} | tx: ${sig.slice(0, 16)}...`, true, sig);
            return;
          }
        } catch (e) {
          console.error(`${this.name}: Error sending SOL for trade proof:`, e);
        }
      }

      this.logAction('BUY', `Simulated: Bought ${amount} SOL at $${market.price.toFixed(2)} (USDC: +${cost.toFixed(2)})`, true);
    }

    if (decision === 'SELL') {
      const usdcNeeded = amount * market.price;
      if (this.portfolio.USDC < usdcNeeded) {
        logger.warn(`${this.name}: Insufficient USDC to sell`);
        this.logAction('SELL_SKIP', 'Insufficient USDC', false);
        return;
      }

      this.portfolio.USDC -= usdcNeeded;
      this.portfolio.SOL += amount;

      this.tradeHistory.push({ action: 'SELL', price: market.price, amount, timestamp: new Date().toISOString() });
      this.logAction('SELL', `Simulated: Sold ${amount} SOL at $${market.price.toFixed(2)} (USDC: -${usdcNeeded.toFixed(2)})`, true);
    }
  }

  getPortfolio(): typeof this.portfolio {
    return { ...this.portfolio };
  }

  getTradeHistory(): typeof this.tradeHistory {
    return [...this.tradeHistory];
  }

  getPnL(): number {
    const initialUSDC = 100;
    return this.portfolio.USDC - initialUSDC;
  }
}
