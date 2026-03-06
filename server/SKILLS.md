# SKILLS.md — Sentience: Autonomous AI Agent Wallet System

> Technical capability reference for AI agents and human developers.
> This document describes what the system can do and how to invoke each capability.

---

## Technical Skills Used

### Cryptography & Key Management

- **Ed25519 Key Generation** — Solana-native keypair generation via `@solana/web3.js`
- **AES-256-CBC Encryption** — Symmetric encryption of private keys at rest
- **PBKDF2 Key Derivation** — 10,000-iteration password-to-key derivation preventing brute-force
- **Secure Storage** — Keystore files with UNIX mode 0600 (owner-only read/write)

### Blockchain Interaction (Solana)

- **JSON RPC API** — Direct Solana RPC calls: `getBalance`, `getLatestBlockhash`, `sendRawTransaction`, `confirmTransaction`
- **Transaction Construction** — Building `SystemProgram.transfer` instructions programmatically
- **Transaction Signing** — Ed25519 signatures via `Keypair.sign()` without human intervention
- **SPL Token Operations** — Associated token account creation, SPL transfers
- **Devnet Airdrop** — Programmatic faucet requests via `requestAirdrop`

### DeFi Protocol Integration

- **Jupiter V6 API** — Quote fetching, route optimization, swap execution
- **Liquidity Pool Simulation** — LP provisioning, fee harvesting, rebalancing logic
- **Price Feed Simulation** — Bounded random walk with configurable volatility

### Agent Architecture

- **Event-Driven Design** — Node.js EventEmitter for decoupled agent communication
- **Tick-Based Execution** — Configurable interval loops with cycle counting
- **Strategy Pattern** — Pluggable trading strategies (DCA, Momentum, Mean Reversion)
- **Multi-Factor Risk Scoring** — Balance, volatility, network, and anomaly factors
- **Orchestration** — Centralized spawn, lifecycle, and coordination manager

### Full-Stack Development

- **TypeScript** — Strict typing across wallet, agent, and protocol layers
- **React 19** — Functional components with hooks for real-time dashboard
- **Tailwind CSS v4** — Utility-first styling with custom theme tokens
- **Framer Motion** — Entry animations, presence transitions, layout animations
- **Recharts** — Real-time area charts with gradient fills
- **Vite 7** — Fast HMR dev server with proxy configuration
- **Express** — REST API with WebSocket upgrade
- **WebSocket (ws)** — Real-time bidirectional state streaming

---

## Core Capabilities

### 1. Wallet Creation

```typescript
AgentWallet.create(agentName: string, password?: string) → AgentWallet
```

Creates a new Solana keypair, encrypts it with AES-256-CBC + PBKDF2, and persists to disk.

**Flow:**

1. `Keypair.generate()` → Ed25519 keypair
2. `encryptPrivateKey(secretKey, password)` → AES-256-CBC ciphertext + IV
3. `saveKeystore({ id, agentName, encryptedPrivateKey, publicKey, iv })` → `.keystore/{uuid}.json`
4. Return `AgentWallet` instance with in-memory keypair

### 2. Wallet Loading

```typescript
AgentWallet.load(agentId: string, password?: string) → AgentWallet | null
```

Loads an encrypted keystore from disk and decrypts the private key in memory.

### 3. Autonomous SOL Transfer

```typescript
wallet.sendSOL(toAddress: string, amount: number) → Promise<TransactionSignature>
```

Builds, signs, and broadcasts a SOL transfer — fully autonomous:

1. Construct `SystemProgram.transfer` instruction
2. Fetch `getLatestBlockhash` for transaction metadata
3. Sign with agent's keypair (in-memory, never exposed)
4. `sendRawTransaction` → broadcast to Solana network
5. `confirmTransaction` → wait for finality
6. Return transaction signature (viewable on Explorer)

### 4. Autonomous SPL Token Transfer

```typescript
wallet.sendSPLToken(mintAddress: string, toAddress: string, amount: number) → Promise<TransactionSignature>
```

Handles associated token account creation and SPL transfers.

### 5. Balance Queries

```typescript
wallet.getSOLBalance() → Promise<number>
wallet.getTokenBalances() → Promise<TokenBalance[]>
```

### 6. Devnet Airdrop

```typescript
wallet.requestAirdrop(solAmount: number) → Promise<TransactionSignature>
```

### 7. Transaction Signing (without sending)

```typescript
wallet.signTransaction(transaction: Transaction) → Transaction
wallet.signMessage(message: Uint8Array) → Uint8Array
```

### 8. Jupiter DEX Integration

```typescript
const jupiter = new JupiterProtocol(wallet)
jupiter.getQuote(inputMint, outputMint, amountLamports) → SwapQuote
jupiter.swap(inputMint, outputMint, amountLamports) → SwapResult
jupiter.getBestRoute(fromToken, toToken, amount) → string
```

---

## Agent Types

### TradingAgent

```typescript
const agent = orchestrator.spawnTradingAgent('MyTrader', {
  strategy: 'DCA',           // DCA | MOMENTUM | MEAN_REVERT | RANDOM
  tradeAmountSOL: 0.001,
  tickIntervalMs: 5000,
})
```

### LiquidityAgent

```typescript
const agent = orchestrator.spawnLiquidityAgent('LP-Bot', {
  minBalanceThreshold: 0.05,
  tickIntervalMs: 8000,
})
```

### MonitorAgent

```typescript
const agent = orchestrator.spawnMonitorAgent('Watchdog', {
  riskTolerance: 'MEDIUM',   // LOW | MEDIUM | HIGH
  alertThresholdSOL: 0.1,
  tickIntervalMs: 6000,
})
```

---

## Orchestration

```typescript
const orch = AgentOrchestrator.getInstance()

// Lifecycle
orch.startAll()              // Start all agents
orch.stopAll()               // Graceful shutdown
orch.pauseAgent(id)          // Pause specific agent
orch.resumeAgent(id)         // Resume specific agent

// Funding
orch.fundAllAgents(1)        // Airdrop 1 SOL to each

// Status
orch.getSystemStatus()       // Full state snapshot
orch.getAgents()             // Map<id, BaseAgent>
orch.count                   // Number of agents
```

---

## Security Model

| Layer | Mechanism | Detail |
| ------- | ----------- | ------ |
| Key Generation | Ed25519 | Solana-native, 32-byte private key |
| Encryption | AES-256-CBC | 256-bit symmetric encryption |
| Key Derivation | PBKDF2 | 10,000 iterations, random 16-byte salt (IV) |
| Storage | JSON keystore | Per-agent file, mode 0600 |
| Isolation | Per-agent keypair | No key sharing between agents |
| Network | Devnet default | Mainnet-beta via env config |

---

## Events

```typescript
agent.on('started', (state) => {})   // Agent started
agent.on('stopped', (state) => {})   // Agent stopped
agent.on('paused',  (state) => {})   // Agent paused
agent.on('resumed', (state) => {})   // Agent resumed
agent.on('action',  (log) => {})     // Any autonomous action
agent.on('alert',   (alert) => {})   // Risk alert (MonitorAgent)
agent.on('error',   (err) => {})     // Agent error

orchestrator.on('agentAction', (action) => {})  // Any agent action
orchestrator.on('alert', (alert) => {})          // Any agent alert
```

---

## Environment Variables

```bash
WALLET_ENCRYPTION_KEY=your-master-password    # Default encryption key
SOLANA_CLUSTER=devnet                         # devnet | mainnet-beta | testnet
PORT=3000                                     # Dashboard server port
```

---

## Quick Start for AI Agents

```typescript
import { AgentWallet, AgentOrchestrator } from './src'

// 1. Create orchestrator
const orch = AgentOrchestrator.getInstance()

// 2. Spawn agent (automatically creates encrypted wallet)
const trader = orch.spawnTradingAgent('MyAgent', { strategy: 'DCA' })

// 3. Fund wallet via devnet airdrop
await trader.getWallet().requestAirdrop(1)

// 4. Start autonomous execution
await trader.start()

// 5. Agent now makes decisions and signs transactions independently
trader.on('action', log => console.log(log))
```
