# Sentience — Autonomous AI Agent Wallets for Solana

> **Hackathon Submission**: A full-stack system where AI agents autonomously create, manage, and transact from their own encrypted Solana wallets — no human in the loop.

<p align="center">
  <img src="https://img.shields.io/badge/Solana-Devnet-cyan?style=flat-square" />
  <img src="https://img.shields.io/badge/Encryption-AES--256--CBC-green?style=flat-square" />
  <img src="https://img.shields.io/badge/Key%20Derivation-PBKDF2-green?style=flat-square" />
  <img src="https://img.shields.io/badge/Signing-Ed25519-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/DEX-Jupiter%20V6-violet?style=flat-square" />
</p>

---

## What is Sentience?

Sentience is a prototype **agentic wallet system** for Solana. Each AI agent gets its own isolated, encrypted wallet and can autonomously:

- **Create keypairs** — Ed25519 key generation with encrypted-at-rest storage
- **Sign transactions** — autonomous SOL and SPL token transfers without human approval
- **Interact with DeFi** — Jupiter V6 quotes and swaps, LP provisioning
- **Monitor risk** — real-time portfolio risk scoring and alerting
- **Coordinate** — multi-agent orchestration with event-driven communication

The system demonstrates the core primitive needed for AI × crypto: **programmatic wallets that agents control end-to-end**.

---

## Architecture

```
sentience/
├── client/                  React + Vite + Tailwind (real-time dashboard)
│   ├── src/
│   │   ├── components/      AgentCard, PriceChart, ActivityFeed, etc.
│   │   ├── hooks/           useWebSocket (live state updates)
│   │   ├── lib/             Utilities, config maps
│   │   └── types/           TypeScript interfaces
│   └── vite.config.ts       Dev proxy → localhost:3000
│
├── server/                  TypeScript + Node.js (agent runtime)
│   ├── src/
│   │   ├── wallet/
│   │   │   ├── AgentWallet.ts      Core: create, sign, send, load
│   │   │   └── WalletManager.ts    Multi-wallet registry
│   │   ├── agent/
│   │   │   ├── BaseAgent.ts        Abstract agent with tick loop
│   │   │   ├── TradingAgent.ts     DCA, Momentum, Mean Reversion
│   │   │   ├── LiquidityAgent.ts   LP management & rebalancing
│   │   │   ├── MonitorAgent.ts     Risk scoring & alerts
│   │   │   └── AgentOrchestrator.ts Spawn, coordinate, lifecycle
│   │   ├── protocols/
│   │   │   └── JupiterProtocol.ts  Jupiter V6 quotes + swap execution
│   │   └── utils/
│   │       ├── encryption.ts       AES-256-CBC + PBKDF2
│   │       └── logger.ts           Colored terminal output
│   ├── dashboard/
│   │   └── server.js              Express + WebSocket API
│   └── SKILLS.md                  Technical capability reference
│
└── package.json             Root: runs everything together
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- npm ≥ 8

### 1. Install all dependencies

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
```

### 3. Run in development (both client + server)

```bash
npm run dev
```

- **API + WebSocket** → `http://localhost:3000`
- **React Dashboard** → `http://localhost:5173` ← open this

### 4. Run the agent demo (CLI)

```bash
npm run demo
```

Spawns 4 agents, funds them via devnet airdrop, runs autonomous trading for 30 seconds, and prints a system report.

### 5. Run the test suite

```bash
npm test
```

### 6. Production build

```bash
npm start
```

Builds React and serves everything from `http://localhost:3000`.

---

## Design Decisions

### Security — Why This Approach

| Layer | Implementation | Rationale |
|-------|---------------|-----------|
| **Key Generation** | `Keypair.generate()` via `@solana/web3.js` | Standard Ed25519, same as all Solana wallets |
| **Key Encryption** | AES-256-CBC | Industry standard symmetric encryption |
| **Key Derivation** | PBKDF2 with 10,000 iterations | Prevents brute-force attacks on encryption password |
| **Storage** | JSON keystores at `.keystore/`, mode 0600 | File-level isolation, restricted permissions |
| **Key Isolation** | One keypair per agent, never shared | Compromise of one agent doesn't affect others |
| **Signing** | Ed25519 via `@solana/web3.js` internals | Standard Solana signature scheme |

The private key **never** exists in plaintext on disk. It's encrypted immediately after generation and only decrypted in-memory for signing operations.

### Separation of Concerns

The wallet and agent layers are completely decoupled:

```
┌─────────────────────────────┐
│  Agent Layer (Decision)     │  TradingAgent, LiquidityAgent, MonitorAgent
│  "What should I do?"        │  Strategy logic, market analysis, risk scoring
├─────────────────────────────┤
│  Wallet Layer (Execution)   │  AgentWallet, WalletManager
│  "How do I do it?"          │  Key management, signing, RPC calls
├─────────────────────────────┤
│  Protocol Layer (Interface) │  JupiterProtocol
│  "What can I interact with?"│  DEX quotes, swap building, route optimization
└─────────────────────────────┘
```

An agent never touches cryptographic keys directly. It calls `wallet.sendSOL()` or `wallet.signTransaction()` — the wallet handles key decryption, signing, and broadcasting.

### Scalability

- **AgentOrchestrator** manages N agents from a single entry point
- Each agent runs on its own tick interval (configurable)
- Agents communicate via EventEmitter (decoupled, non-blocking)
- WebSocket broadcasts full system state to all dashboard clients
- Wallet manager supports loading all keystores from disk on restart

---

## Agent Types

### TradingAgent

Executes buy/sell decisions based on configurable strategies:

| Strategy | Logic |
|----------|-------|
| **DCA** | Buys at regular intervals regardless of price |
| **MOMENTUM** | Buys if price rising (+0.5%), sells if falling (-0.5%) |
| **MEAN_REVERT** | Buys below moving average (-1%), sells above (+1%) |
| **RANDOM** | Random position changes (testing/benchmarking) |

### LiquidityAgent

Autonomous LP management:

- Adds liquidity when balance exceeds 3× threshold
- Harvests accumulated fees when > 0.1 USDC
- Rebalances when pool ratio drifts > 15% from 50/50
- Emergency withdrawal when balance drops below threshold

### MonitorAgent (DeFiGuard-style)

Portfolio risk monitoring with multi-factor scoring:

- **Balance level** — critically low triggers alerts
- **Volatility** — tracks 3-cycle rolling window
- **Network conditions** — simulated congestion detection
- **Anomaly detection** — unusual transaction pattern flagging
- Emits `alert` events that other agents can subscribe to

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

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state` | GET | Full system state snapshot |
| `/api/health` | GET | Health check with uptime |
| `/api/agents/:id/pause` | POST | Pause an agent |
| `/api/agents/:id/resume` | POST | Resume a paused agent |
| `/api/agents/:id/stop` | POST | Stop an agent |
| `/api/agents/spawn` | POST | Deploy a new agent |

### WebSocket

Connect to `/ws` (dev) or same host (prod) for real-time `STATE_UPDATE` messages every 3 seconds.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4 |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Node.js, Express, WebSocket (ws) |
| Blockchain | @solana/web3.js, @solana/spl-token |
| Encryption | AES-256-CBC, PBKDF2 (via crypto-js) |
| DEX | Jupiter V6 API |
| Network | Solana Devnet |

---

## Running on Devnet

All operations target Solana Devnet by default. The demo script:

1. Generates real Ed25519 keypairs
2. Requests SOL from the devnet faucet
3. Executes real signed transactions (SOL transfers between agents)
4. Fetches Jupiter V6 quotes (with simulation fallback if API is down)
5. All transactions are viewable on [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)

---

## License

MIT
