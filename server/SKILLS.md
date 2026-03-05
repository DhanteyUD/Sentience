# SKILLS.md — Solana Agentic Wallet System

> This file describes the capabilities of this agent wallet system so that AI agents can understand how to invoke it.

## Overview

This system provides autonomous wallet management for AI agents on Solana. Each agent gets its own isolated, encrypted wallet that can sign transactions, hold SOL/SPL tokens, and interact with DeFi protocols — all without human intervention.

---

## Core Capabilities

### 1. Wallet Creation
```
AgentWallet.create(agentName: string, password?: string) → AgentWallet
```
Creates a new Solana keypair, encrypts it with AES-256-CBC + PBKDF2, and saves it to disk.
- **Output**: A wallet with a unique ID, ed25519 keypair, and devnet-ready connection
- **Security**: Private key never stored in plaintext

### 2. Transaction Signing (Autonomous)
```
wallet.sendSOL(toAddress: string, amount: number) → Promise<TransactionSignature>
wallet.sendSPLToken(mint: string, to: string, amount: number) → Promise<TransactionSignature>
wallet.signTransaction(tx: Transaction) → Transaction
```
Signs and broadcasts transactions without any human input. Uses `@solana/web3.js` under the hood.

### 3. Token Holdings
```
wallet.getSOLBalance() → Promise<number>
wallet.getTokenBalances() → Promise<TokenBalance[]>
```
Query SOL and SPL token balances for any agent wallet.

### 4. Devnet Airdrop
```
wallet.requestAirdrop(solAmount: number) → Promise<TransactionSignature>
```
Fund agent wallets automatically on devnet for testing.

### 5. DEX Interaction (Jupiter)
```
const jupiter = new JupiterProtocol(wallet)
jupiter.getQuote(inputMint, outputMint, amountLamports) → SwapQuote
jupiter.swap(inputMint, outputMint, amountLamports) → SwapResult
```
Connects to Jupiter V6 for best-route quotes and autonomous swaps.

---

## Agent Types

### TradingAgent
Executes buy/sell decisions based on a strategy:
- **DCA**: Buys at regular intervals regardless of price
- **MOMENTUM**: Buys if price rising, sells if falling
- **MEAN_REVERT**: Buys below moving average, sells above
- **RANDOM**: Random position changes (testing only)

```typescript
const agent = orchestrator.spawnTradingAgent('MyTrader', {
  strategy: 'DCA',
  tradeAmountSOL: 0.001,
  tickIntervalMs: 5000,
})
```

### LiquidityAgent
Manages LP position autonomously:
- Adds liquidity when balance exceeds threshold
- Harvests fees when accumulated
- Rebalances when pool becomes imbalanced
- Emergency withdrawal when balance drops critically low

```typescript
const agent = orchestrator.spawnLiquidityAgent('LP-Bot', {
  minBalanceThreshold: 0.05,
  tickIntervalMs: 8000,
})
```

### MonitorAgent
Monitors portfolio risk and fires alerts:
- Tracks balance history and volatility
- Detects unusual on-chain patterns
- Risk scoring: LOW / MEDIUM / HIGH / CRITICAL
- Emits `alert` events for downstream agents

```typescript
const agent = orchestrator.spawnMonitorAgent('Watchdog', {
  riskTolerance: 'MEDIUM',
  alertThresholdSOL: 0.1,
})
```

---

## Orchestration

The `AgentOrchestrator` manages the full agent fleet:

```typescript
const orch = AgentOrchestrator.getInstance()
orch.startAll()       // Start all agents
orch.stopAll()        // Stop all agents gracefully
orch.pauseAgent(id)   // Pause specific agent
orch.resumeAgent(id)  // Resume specific agent
orch.getSystemStatus() // Get full state snapshot
```

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Key Storage | PBKDF2 (10,000 iterations) + AES-256-CBC |
| File Permissions | Keystore files set to mode 0600 |
| Key Isolation | Each agent has its own keypair, never shared |
| Signing | Ed25519 via `@solana/web3.js` |
| Network | Devnet only by default; mainnet via env config |
| Password | Per-wallet encryption password, default from env |

---

## Environment Variables

```bash
WALLET_ENCRYPTION_KEY=your-master-password   # Default encryption key
SOLANA_CLUSTER=devnet                        # devnet | mainnet-beta | testnet
PORT=3000                                    # Dashboard server port
```

---

## Events

Agents emit these events you can subscribe to:

```typescript
agent.on('started', (state) => {})     // Agent started
agent.on('stopped', (state) => {})     // Agent stopped
agent.on('action', (log) => {})        // Any autonomous action taken
agent.on('alert', (alert) => {})       // Risk alert fired (MonitorAgent)
agent.on('error', (err) => {})         // Agent errored
```

---

## File Structure

```
.keystore/           ← Encrypted keystores (git-ignored, mode 0700)
  {uuid}.json        ← Per-agent encrypted keypair
src/
  wallet/
    AgentWallet.ts   ← Core wallet: create, sign, send, load
    WalletManager.ts ← Multi-wallet registry
  agent/
    BaseAgent.ts     ← Abstract agent with tick loop
    TradingAgent.ts  ← DeFi trading strategies
    LiquidityAgent.ts← LP management
    MonitorAgent.ts  ← Risk monitoring
    AgentOrchestrator.ts ← Spawn, coordinate, stop all agents
  protocols/
    JupiterProtocol.ts ← DEX quotes and swaps
  utils/
    encryption.ts    ← AES/PBKDF2 key management
    logger.ts        ← Colored terminal logging
dashboard/
  server.js          ← Express + WebSocket API
  index.html         ← Real-time monitoring UI
tests/
  test-suite.ts      ← Full test coverage
```

---

## Quick Start for Agents

```typescript
import { AgentWallet, AgentOrchestrator } from './src'

// 1. Spawn an agent (creates wallet automatically)
const orch = AgentOrchestrator.getInstance()
const trader = orch.spawnTradingAgent('MyAgent', { strategy: 'DCA' })

// 2. Fund it
await trader.getWallet().requestAirdrop(1)

// 3. Start autonomous execution
await trader.start()

// 4. Agent now makes decisions and signs transactions on its own
trader.on('action', log => console.log(log))
```
