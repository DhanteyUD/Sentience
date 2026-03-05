import { AgentOrchestrator } from './agent/AgentOrchestrator';
import { JupiterProtocol, TOKENS } from './protocols/JupiterProtocol';
import { logger } from './utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function main(): Promise<void> {
  logger.banner('SOLANA AGENTIC WALLET SYSTEM — DEMO');

  const orchestrator = AgentOrchestrator.getInstance();

  // ── Step 1: Spawn agents with isolated wallets ────────────────────────────
  logger.info('Step 1: Spawning autonomous agents...');
  logger.separator();

  const trader1 = orchestrator.spawnTradingAgent('Alpha-DCA', {
    strategy: 'DCA',
    tickIntervalMs: 4000,
    tradeAmountSOL: 0.001,
  });

  const trader2 = orchestrator.spawnTradingAgent('Beta-Momentum', {
    strategy: 'MOMENTUM',
    tickIntervalMs: 5000,
    tradeAmountSOL: 0.001,
  });

  const lpAgent = orchestrator.spawnLiquidityAgent('LP-Provider', {
    tickIntervalMs: 7000,
    minBalanceThreshold: 0.05,
  });

  const monitor = orchestrator.spawnMonitorAgent('Risk-Monitor', {
    tickIntervalMs: 5000,
    riskTolerance: 'MEDIUM',
    alertThresholdSOL: 0.1,
  });

  logger.success(`Spawned ${orchestrator.count} agents with isolated wallets`);

  // ── Step 2: Fund wallets via airdrop ─────────────────────────────────────
  logger.separator();
  logger.info('Step 2: Funding agent wallets via devnet airdrop...');

  for (const [, agent] of orchestrator.getAgents()) {
    const wallet = agent.getWallet();
    logger.wallet(`  ${agent.name}: ${wallet.getPublicKeyBase58()}`);
    try {
      await wallet.requestAirdrop(1);
      await sleep(1500);
    } catch (e: any) {
      logger.warn(`  Airdrop failed for ${agent.name}: ${e.message} (rate limited — continuing)`);
    }
  }

  // ── Step 3: Demonstrate raw wallet capabilities ───────────────────────────
  logger.separator();
  logger.info('Step 3: Demonstrating autonomous wallet operations...');

  const traderWallet = trader1.getWallet();
  const balance = await traderWallet.getSOLBalance();
  logger.wallet(`Alpha-DCA balance: ${balance.toFixed(4)} SOL`);
  logger.wallet(`Explorer: ${traderWallet.getExplorerUrl()}`);

  // Demonstrate Jupiter quote
  logger.separator();
  logger.info('Step 4: Getting Jupiter DEX quote (autonomous)...');
  const jupiter = new JupiterProtocol(traderWallet);
  const route = await jupiter.getBestRoute(TOKENS.SOL, TOKENS.USDC, 0.1);
  logger.tx(route);

  // SOL transfer between agents (real devnet tx)
  if (balance > 0.002) {
    logger.separator();
    logger.info('Step 5: Autonomous SOL transfer between agents...');
    try {
      const sig = await traderWallet.sendSOL(trader2.getWallet().getPublicKeyBase58(), 0.001);
      logger.success(`Transfer complete!`);
      logger.tx(`Signature: ${sig}`);
      logger.tx(`Explorer: ${traderWallet.getExplorerUrl(sig)}`);
    } catch (e: any) {
      logger.warn(`Transfer skipped: ${e.message}`);
    }
  }

  // ── Step 4: Start all agents ─────────────────────────────────────────────
  logger.separator();
  logger.info('Step 6: Starting all agents autonomously...');
  await orchestrator.startAll();

  // ── Step 5: Monitor for 30 seconds ───────────────────────────────────────
  logger.separator();
  logger.info('Running agents for 30 seconds — watch the autonomous decisions...');
  logger.separator();

  await sleep(30000);

  // ── Step 6: Print system status ──────────────────────────────────────────
  logger.separator();
  logger.banner('SYSTEM STATUS REPORT');

  const status = await orchestrator.getSystemStatus();
  logger.info(`Total agents: ${status.agents.length}`);
  logger.info(`Total wallets: ${status.totalWallets}`);
  logger.info(`Total balance: ${status.totalBalance.toFixed(4)} SOL`);
  logger.separator();

  for (const agentState of status.agents) {
    logger.agent(`${agentState.name} [${agentState.status}]`);
    logger.info(`  Wallet: ${agentState.walletAddress}`);
    logger.info(`  Balance: ${agentState.balanceSOL.toFixed(4)} SOL`);
    logger.info(`  Cycles: ${agentState.cycleCount}`);
    logger.info(`  Last action: ${agentState.lastAction}`);
    if (agentState.actionLog.length > 0) {
      logger.info(`  Recent actions:`);
      agentState.actionLog.slice(0, 3).forEach(a => {
        const icon = a.success ? '✓' : '✗';
        logger.info(`    ${icon} ${a.action}: ${a.result.slice(0, 60)}`);
      });
    }
    logger.separator();
  }

  // ── Step 7: Graceful shutdown ─────────────────────────────────────────────
  logger.info('Stopping all agents gracefully...');
  await orchestrator.stopAll();
  logger.success('All agents stopped. Demo complete!');
  logger.info('');
  logger.info('To start the dashboard: npm run dashboard');
  logger.info('To run tests: npm test');

  process.exit(0);
}

main().catch(err => {
  logger.error('Fatal error:', err);
  process.exit(1);
});
