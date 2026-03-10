# ⬡ Sentience — Autonomous AI Agent Wallets for Solana

> A full-stack system where AI agents autonomously create, manage, and transact from their own encrypted Solana wallets — no human in the loop.

![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-cyan?style=flat-square)
![Encryption AES-256-CBC](https://img.shields.io/badge/Encryption-AES--256--CBC-green?style=flat-square)
![Key Derivation PBKDF2](https://img.shields.io/badge/Key%20Derivation-PBKDF2-green?style=flat-square)
![Signing Ed25519](https://img.shields.io/badge/Signing-Ed25519-blue?style=flat-square)
![DEX Jupiter V6](https://img.shields.io/badge/DEX-Jupiter%20V6-violet?style=flat-square)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Agent Types](#agent-types)
- [Quick Start](#quick-start)
- [What Happens On-Chain](#what-happens-on-chain)
- [Dashboard](#dashboard)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Design Decisions](#design-decisions)
- [License](#license)

---

## Overview

Sentience is a prototype **agentic wallet system** for Solana. Each AI agent gets its own isolated, encrypted wallet and can autonomously:

- **Create real Ed25519 keypairs** — encrypted at rest with AES-256-CBC + PBKDF2
- **Sign real transactions** — autonomous SOL transfers on Solana devnet, no human approval
- **Hold real SOL** — balances funded via devnet airdrop, queryable via RPC
- **Interact with Jupiter V6** — real DEX quotes for `SOL → USDC` pricing
- **Monitor risk** — multi-factor portfolio scoring with real balance and network data
- **Coordinate** — multi-agent orchestration with event-driven communication

**Every wallet address and transaction is verifiable on [Solana Explorer (devnet)](https://explorer.solana.com/?cluster=devnet).**

---

## Tech Stack

| Layer      | Technology                                                               |
|------------|--------------------------------------------------------------------------|
| Frontend   | React 19, TypeScript, Vite 7, Tailwind CSS v4, Framer Motion, Recharts   |
| Backend    | Node.js, Express, WebSocket (ws), ts-node                                |
| Blockchain | @solana/web3.js, @solana/spl-token                                       |
| Encryption | AES-256-CBC, PBKDF2 (crypto-js)                                          |
| DEX        | Jupiter V6 Quote API                                                     |
| Network    | Solana Devnet                                                            |

---

## Architecture

```text
sentience/
├── client/                                React + Vite + Tailwind (real-time dashboard)
│   ├── src/
│   │   ├── components/                    AgentCard, PriceChart, ActivityFeed, etc.
│   │   ├── hooks/                         useWebSocket (live state updates)
│   │   ├── lib/                           Utilities, config maps
│   │   └── types/                         TypeScript interfaces
│   └── vite.config.ts                     Dev proxy → localhost:3000, port: 5173
│
├── server/                                TypeScript + Node.js (agent runtime)
│   ├── dashboard/
│   │   └── server.js                      Simulation fallback (Express + WebSocket)
│   ├── src/
│   │   ├── agent/
│   │   │   ├── AgentOrchestrator.ts       Spawn & lifecycle management
│   │   │   ├── BaseAgent.ts               Abstract agent with tick loop
│   │   │   ├── LiquidityAgent.ts          LP management & rebalancing
│   │   │   ├── MonitorAgent.ts            Risk scoring & alerts
│   │   │   └── TradingAgent.ts            DCA, Momentum, Mean Reversion
│   │   ├── protocols/
│   │   │   └── JupiterProtocol.ts         Jupiter V6 quotes + swap execution
│   │   ├── utils/
│   │   │   ├── encryption.ts              AES-256-CBC + PBKDF2
│   │   │   └── logger.ts                  Colored terminal output
│   │   ├── wallet/
│   │   │   ├── AgentWallet.ts             Core: create, sign, send, load
│   │   │   └── WalletManager.ts           Multi-wallet registry
│   │   └── dashboard.ts                 ★ Real devnet server (Express + WebSocket)
│   │
│   └── SKILLS.md                          Agent capability reference
│
├── SECURITY.md                            Security deep dive & threat model
│
└── package.json                           Root: runs everything together
```

---

## Agent Types

### TradingAgent

Executes buy/sell decisions based on configurable strategies:

| Strategy        | Logic                                                       |
|-----------------|-------------------------------------------------------------|
| **DCA**         | Buys at regular intervals regardless of price               |
| **MOMENTUM**    | Buys if price rising (+0.5%), sells if falling (-0.5%)      |
| **MEAN_REVERT** | Buys below moving average (-1%), sells above (+1%)          |
| **RANDOM**      | Random position changes (testing/benchmarking)              |

### LiquidityAgent

Autonomous LP management:

- Adds liquidity when balance exceeds 3× threshold
- Harvests accumulated fees when > 0.1 USDC
- Rebalances when pool ratio drifts > 15% from 50/50
- Emergency withdrawal when balance drops below threshold

### MonitorAgent

Portfolio risk monitoring with multi-factor scoring:

- **Balance level** — critically low balance triggers alerts
- **Volatility** — tracks 3-cycle rolling window
- **Network conditions** — simulated congestion detection
- **Anomaly detection** — unusual transaction pattern flagging
- Emits `alert` events that other agents can subscribe to

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm ≥ 8

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env:
#   WALLET_ENCRYPTION_KEY=your-strong-password
#   SOLANA_CLUSTER=devnet
#   PORT=3000
#   NODE_ENV=production
```

### 3. Start the app

```bash
npm run dev
```

- **API + WebSocket** → `http://localhost:3000`
- **React Dashboard** → `http://localhost:5173` ← open this in browser

On startup the server creates **real keypairs**, requests **devnet airdrops**, and starts agents that execute **real signed SOL transfers**. Click any wallet address in the dashboard to verify on Solana Explorer.

### 4. Other commands

```bash
npm run demo              # CLI: spawn → fund → trade → report (30s)
npm test                  # Full test suite
npm run dev:server:sim    # Simulation fallback (no devnet needed)
npm start                 # Production build with real devnet
```

---

## What Happens On-Chain

| Step | Operation              | Devnet Call                                     |
|------|------------------------|-------------------------------------------------|
| 1    | Agent wallets created  | `Keypair.generate()` → Ed25519                  |
| 2    | Private keys encrypted | AES-256-CBC + PBKDF2 → `.keystore/`             |
| 3    | Agents funded          | `connection.requestAirdrop()`                   |
| 4    | Balances queried       | `connection.getBalance()`                       |
| 5    | Agents transfer SOL    | `SystemProgram.transfer` → signed & broadcast   |
| 6    | Monitor checks health  | `connection.getSlot()` → real latency           |
| 7    | Price from Jupiter     | `quote-api.jup.ag/v6/quote` → `1 SOL → USDC`    |

The private key **never** exists in plaintext on disk. It's encrypted immediately after generation and only decrypted in-memory for signing operations.

---

## Dashboard

The React dashboard connects via WebSocket for real-time updates:

- **Agent Cards** — status, balance, PnL, last action, controls
- **Live Feed** — streaming transaction/action log
- **Price Chart** — SOL/USD with gradient area chart
- **Wallet Registry** — all agent wallets with explorer links
- **System Info** — encryption, network, signing details
- **Spawn Modal** — deploy new agents on the fly

---

## API Reference

### Core

| Endpoint      | Method | Description                    |
|---------------|--------|--------------------------------|
| `/api/state`  | GET    | Full system state              |
| `/api/health` | GET    | Health check with cluster info |

### Agent Control

| Endpoint                  | Method | Description                                  |
|---------------------------|--------|----------------------------------------------|
| `/api/agents/spawn`       | POST   | Deploy new agent with real wallet + airdrop  |
| `/api/agents/:id/pause`   | POST   | Pause agent                                  |
| `/api/agents/:id/resume`  | POST   | Resume agent                                 |
| `/api/agents/:id/stop`    | POST   | Stop agent                                   |

### Devnet Operations

| Endpoint                   | Method | Description                              |
|----------------------------|--------|------------------------------------------|
| `/api/agents/:id/airdrop`  | POST   | Request devnet SOL                       |
| `/api/agents/:id/transfer` | POST   | Real SOL transfer between agents         |
| `/api/agents/:id/explorer` | GET    | Explorer URLs for wallet + transactions  |
| `/api/jupiter/quote`       | GET    | Real Jupiter V6 SOL → USDC quote         |

### WebSocket

`/ws` — emits `STATE_UPDATE` every 5s with real balances and agent actions.

---

## Security Model

| Layer           | Implementation                                              |
|-----------------|-------------------------------------------------------------|
| Key Generation  | `Keypair.generate()` — Ed25519                              |
| Encryption      | AES-256-CBC (private key never stored in plaintext)         |
| Key Derivation  | PBKDF2, 10,000 iterations                                   |
| Storage         | `.keystore/{uuid}.json`, mode 0600                          |
| Isolation       | One keypair per agent, no shared secrets                    |
| Signing         | `transaction.sign(keypair)` — fully autonomous              |

See [SECURITY.md](./SECURITY.md) for the full deep dive.

---

## Design Decisions

**Separate wallet and agent layers** — agents decide *what* to do, wallets handle *how*. An agent calls `wallet.sendSOL()` without touching private keys.

**Per-agent keypairs (not HD wallet)** — if one agent is compromised, others are unaffected. No master seed exposure risk.

**5-second tick interval** — keeps RPC calls under devnet rate limits while showing real-time activity.

**Simulation fallback** — `npm run dev:server:sim` works without devnet. Primary mode is always real.

---

## License

MIT
