import { BaseAgent, AgentConfig } from './BaseAgent';
import { AgentWallet } from '../wallet/AgentWallet';
import { logger } from '../utils/logger';

export interface MonitorConfig extends AgentConfig {
  alertThresholdSOL?: number;
  riskTolerance?: 'LOW' | 'MEDIUM' | 'HIGH';
  watchAddresses?: string[];
}

interface RiskAssessment {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  factors: string[];
  recommendation: string;
}

export class MonitorAgent extends BaseAgent {
  private config: MonitorConfig;
  private alerts: { level: string; message: string; timestamp: string }[] = [];
  private lastBalance: number = 0;
  private balanceHistory: number[] = [];

  constructor(wallet: AgentWallet, config: MonitorConfig) {
    super(wallet, { ...config, description: 'Portfolio risk monitoring and alert agent (DeFiGuard-style)' });
    this.config = {
      alertThresholdSOL: 0.05,
      riskTolerance: 'MEDIUM',
      watchAddresses: [],
      ...config,
    };
  }

  async onStart(): Promise<void> {
    this.lastBalance = await this.wallet.getSOLBalance();
    logger.agent(`${this.name}: Monitoring wallet ${this.wallet.getPublicKeyBase58().slice(0, 12)}...`);
    logger.agent(`${this.name}: Risk tolerance: ${this.config.riskTolerance}`);
  }

  async tick(): Promise<void> {
    const balance = await this.wallet.getSOLBalance();
    this.balanceHistory.push(balance);
    if (this.balanceHistory.length > 30) this.balanceHistory.shift();

    const risk = this.assessRisk(balance);

    logger.agent(
      `${this.name}: Balance=${balance.toFixed(4)} SOL | Risk=${risk.level} (${risk.score}/100) | ${risk.recommendation}`
    );

    // Fire alerts for significant risk events
    if (risk.level === 'HIGH' || risk.level === 'CRITICAL') {
      this.fireAlert(risk.level, `Risk factors: ${risk.factors.join(', ')}`);
    }

    // Check balance drop
    const balanceDrop = this.lastBalance - balance;
    if (balanceDrop > (this.config.alertThresholdSOL || 0.05)) {
      this.fireAlert('HIGH', `Balance dropped ${balanceDrop.toFixed(4)} SOL in one cycle`);
    }

    this.lastBalance = balance;
    this.logAction('RISK_CHECK', `${risk.level} risk (score: ${risk.score}) — ${risk.recommendation}`, true);
  }

  private assessRisk(currentBalance: number): RiskAssessment {
    const factors: string[] = [];
    let score = 0;

    // Factor 1: Balance level
    if (currentBalance < 0.01) {
      factors.push('critically low balance');
      score += 40;
    } else if (currentBalance < 0.05) {
      factors.push('low balance');
      score += 20;
    }

    // Factor 2: Balance volatility
    if (this.balanceHistory.length >= 3) {
      const recent = this.balanceHistory.slice(-3);
      const maxDrop = Math.max(...recent) - Math.min(...recent);
      if (maxDrop > 0.1) {
        factors.push('high balance volatility');
        score += 30;
      }
    }

    // Factor 3: Simulated on-chain conditions
    const networkCongestion = Math.random();
    if (networkCongestion > 0.8) {
      factors.push('network congestion detected');
      score += 15;
    }

    const suspiciousActivity = Math.random() > 0.95;
    if (suspiciousActivity) {
      factors.push('unusual transaction pattern');
      score += 25;
    }

    const level: RiskAssessment['level'] =
      score >= 70 ? 'CRITICAL' :
      score >= 50 ? 'HIGH' :
      score >= 25 ? 'MEDIUM' : 'LOW';

    const recommendations: Record<string, string> = {
      LOW: 'Position healthy — continue normal operations',
      MEDIUM: 'Monitor closely — consider reducing exposure',
      HIGH: 'Reduce position — move funds to safe wallet',
      CRITICAL: 'EMERGENCY — halt all operations immediately',
    };

    return { level, score, factors: factors.length ? factors : ['no risk factors'], recommendation: recommendations[level] };
  }

  private fireAlert(level: string, message: string): void {
    const alert = { level, message, timestamp: new Date().toISOString() };
    this.alerts.unshift(alert);
    if (this.alerts.length > 20) this.alerts.pop();

    if (level === 'CRITICAL') {
      logger.error(`🚨 CRITICAL ALERT [${this.name}]: ${message}`);
    } else {
      logger.warn(`⚠️  ALERT [${this.name}]: ${message}`);
    }

    this.emit('alert', alert);
  }

  getAlerts(): typeof this.alerts {
    return [...this.alerts];
  }

  getBalanceHistory(): number[] {
    return [...this.balanceHistory];
  }
}
