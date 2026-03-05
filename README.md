# Sentience — Autonomous AI Agent Wallets for Solana

> A full-stack monorepo: TypeScript agent wallet backend + React dashboard frontend.

```
sentience/
├── client/        React + Vite + Tailwind CSS (dashboard UI)
├── server/        TypeScript + Node.js (agent wallets, WebSocket API)
└── package.json   Root scripts to run everything together
```

---

## Quick Start

### 1. Install all dependencies
```bash
npm run install:all
```

### 2. Development (runs both together)
```bash
npm run dev
```
- API + WebSocket → `http://localhost:3000`
- React dashboard → `http://localhost:5173` ← open this

### 3. Production (single server)
```bash
npm start
```
Builds React and serves everything from `http://localhost:3000`

---

## Individual Commands

```bash
npm run dev:server   # start API server only
npm run dev:client   # start React dev server only
npm run build        # build React for production
npm run demo         # run the agent demo (spawns 4 agents, runs 30s)
npm test             # run the test suite
```

---

## Environment Setup

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```
WALLET_ENCRYPTION_KEY=your-strong-password
PORT=3000
```

---

## How It Works

**Server** (`/server`) runs the agent simulation:
- Spawns `TradingAgent`, `LiquidityAgent`, `MonitorAgent` — each with an isolated encrypted wallet
- Broadcasts state updates over WebSocket every 3 seconds
- Exposes REST API for agent control

**Client** (`/client`) is the React dashboard:
- Connects via WebSocket for real-time updates
- Displays agent cards, price chart, activity feed, wallet registry
- Lets you spawn, pause, resume, and stop agents
- In dev: Vite proxies `/api` and `/ws` to `localhost:3000`
- In prod: served directly from the same Express server

---

## Stack

| Layer    | Tech                                          |
|----------|-----------------------------------------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4 |
| Motions  | Framer Motion                                 |
| Charts   | Recharts                                      |
| Backend  | Node.js, Express, WebSocket (ws)              |
| Wallets  | @solana/web3.js, AES-256-CBC, PBKDF2          |
| DEX      | Jupiter V6 API                                |
| Network  | Solana Devnet                                 |
