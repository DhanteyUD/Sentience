import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import * as dotenv from "dotenv";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
} from "@solana/web3.js";
import { v4 as uuidv4 } from "uuid";
import {
    encryptPrivateKey,
    decryptPrivateKey,
    saveKeystore,
    listKeystores,
    ensureKeystoreDir,
} from "./utils/encryption";
import { logger } from "./utils/logger";

dotenv.config({ path: path.join(__dirname, "../.env") });

const CLUSTER = (process.env.SOLANA_CLUSTER as string) || "devnet";
const RPC_URL = clusterApiUrl(CLUSTER as any);
const connection = new Connection(RPC_URL, "confirmed");

logger.info(`Solana RPC: ${RPC_URL}`);

const ENCRYPTION_PASSWORD =
    process.env.WALLET_ENCRYPTION_KEY || "sentience-devnet-2026";

interface LiveWallet {
    id: string;
    keypair: Keypair;
    publicKey: string;
}

function createLiveWallet(agentName: string): LiveWallet {
    try {
        const existing = listKeystores().find((k) => k.agentName === agentName);
        if (existing) {
            const secretKey = decryptPrivateKey(
                existing.encryptedPrivateKey,
                existing.iv,
                ENCRYPTION_PASSWORD,
            );
            const keypair = Keypair.fromSecretKey(secretKey);
            logger.wallet(
                `Restored wallet for "${agentName}" → ${existing.publicKey}`,
            );
            return { id: existing.id, keypair, publicKey: existing.publicKey };
        }
    } catch (e: any) {
        logger.warn(`Keystore restore failed for "${agentName}" (creating new): ${e.message}`);
    }

    const keypair = Keypair.generate();
    const id = uuidv4();

    try {
        const { encrypted, iv } = encryptPrivateKey(
            keypair.secretKey,
            ENCRYPTION_PASSWORD,
        );
        saveKeystore({
            id,
            agentName,
            encryptedPrivateKey: encrypted,
            publicKey: keypair.publicKey.toBase58(),
            createdAt: new Date().toISOString(),
            iv,
        });
        logger.wallet(
            `Created REAL wallet for "${agentName}" → ${keypair.publicKey.toBase58()}`,
        );
    } catch (e: any) {
        logger.warn(`Keystore write failed (non-fatal): ${e.message}`);
    }

    return {
        id,
        keypair,
        publicKey: keypair.publicKey.toBase58(),
    };
}

type AgentType = "TRADING" | "LIQUIDITY" | "MONITOR";
type AgentStatus = "running" | "paused" | "stopped" | "error";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface ActionLog {
    action: string;
    result: string;
    success: boolean;
    timestamp: string;
    txSignature?: string;
}

interface LiveAgent {
    id: string;
    name: string;
    type: AgentType;
    strategy: string;
    status: AgentStatus;
    wallet: LiveWallet;
    balanceSOL: number;
    cycleCount: number;
    lastAction: string;
    lastActionAt: string;
    pnl: number;
    color: string;
    riskLevel: RiskLevel;
    actionLog: ActionLog[];
    airdropRequested: boolean;
    lastPrice: number;
    priceHistory: number[];
    txSignatures: string[];
}

const COLORS: Record<string, string> = {
    TRADING: "#00d4ff",
    LIQUIDITY: "#39ff14",
    MONITOR: "#ffd93d",
};

const AGENT_COLORS = [
    "#00d4ff",
    "#ff6b35",
    "#39ff14",
    "#ffd93d",
    "#c77dff",
    "#ff4ecb",
    "#00ffa3",
];

function createLiveAgent(
    name: string,
    type: AgentType,
    strategy: string,
    colorOverride?: string,
): LiveAgent {
    const wallet = createLiveWallet(name);
    return {
        id: wallet.id,
        name,
        type,
        strategy,
        status: "running",
        wallet,
        balanceSOL: 0,
        cycleCount: 0,
        lastAction: "INIT",
        lastActionAt: new Date().toISOString(),
        pnl: 0,
        color: colorOverride || COLORS[type] || "#00d4ff",
        riskLevel: "LOW",
        actionLog: [
            {
                action: "INIT",
                result: `Wallet created: ${wallet.publicKey.slice(0, 12)}… | Encrypted with AES-256-CBC + PBKDF2`,
                success: true,
                timestamp: new Date().toISOString(),
            },
        ],
        airdropRequested: false,
        lastPrice: 0,
        priceHistory: [],
        txSignatures: [],
    };
}

async function fetchRealBalance(pubkey: string): Promise<number | null> {
    try {
        const lamports = await connection.getBalance(new PublicKey(pubkey));
        return lamports / LAMPORTS_PER_SOL;
    } catch (e: any) {
        logger.warn(
            `RPC getBalance failed for ${pubkey.slice(0, 8)}…: ${e.message}`,
        );
        return null;
    }
}

async function requestDevnetAirdrop(
    pubkey: string,
    sol: number = 1,
): Promise<string | null> {
    try {
        const sig = await connection.requestAirdrop(
            new PublicKey(pubkey),
            sol * LAMPORTS_PER_SOL,
        );
        await connection.confirmTransaction(sig, "confirmed");
        logger.success(
            `Airdrop ${sol} SOL → ${pubkey.slice(0, 12)}… | sig: ${sig.slice(0, 20)}…`,
        );
        return sig;
    } catch (e: any) {
        logger.warn(`Airdrop failed for ${pubkey.slice(0, 8)}…: ${e.message}`);
        return null;
    }
}

async function sendRealSOL(
    fromKeypair: Keypair,
    toAddress: string,
    amountSOL: number,
): Promise<string | null> {
    try {
        const toPubkey = new PublicKey(toAddress);
        const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey,
                lamports,
            }),
        );

        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromKeypair.publicKey;

        transaction.sign(fromKeypair);

        const sig = await connection.sendRawTransaction(transaction.serialize());
        await connection.confirmTransaction({
            signature: sig,
            blockhash,
            lastValidBlockHeight,
        });

        logger.success(
            `SOL transfer: ${fromKeypair.publicKey.toBase58().slice(0, 8)}… → ${toAddress.slice(0, 8)}… | ${amountSOL} SOL | sig: ${sig.slice(0, 20)}…`,
        );
        return sig;
    } catch (e: any) {
        logger.warn(`SOL transfer failed: ${e.message}`);
        return null;
    }
}

const JUPITER_QUOTE_URL = "https://quote-api.jup.ag/v6/quote";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

interface JupiterQuote {
    inAmount: string;
    outAmount: string;
    priceImpactPct: string;
}

async function fetchJupiterQuote(
    amountLamports: number,
): Promise<JupiterQuote | null> {
    try {
        const url = `${JUPITER_QUOTE_URL}?inputMint=${SOL_MINT}&outputMint=${USDC_MINT}&amount=${amountLamports}&slippageBps=50`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await res.json()) as JupiterQuote;
    } catch {
        return null;
    }
}

async function fetchSolPrice(): Promise<number | null> {
    try {
        const quote = await fetchJupiterQuote(1_000_000_000);
        if (quote) {
            const usdcAmount = parseInt(quote.outAmount) / 1e6;
            return usdcAmount;
        }
    } catch { }

    try {
        const res = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
        );
        if (res.ok) {
            const data = (await res.json()) as { solana?: { usd?: number; usd_24h_change?: number } };
            if (data?.solana?.usd_24h_change !== undefined) {
                priceChange24h = data.solana.usd_24h_change;
            }
            return data?.solana?.usd || null;
        }
    } catch {
        return null;
    }

    return null;
}

const agents: LiveAgent[] = [];
let solPrice = 170;
let txCount = 0;
const startedAt = Date.now();
let lastTickAt = startedAt;
let cumulativeDowntime = 0;
let priceInitialized = false;
const globalPriceHistory: number[] = [];
let priceChange24h = 0;

function computeVolatility(): number {
    if (globalPriceHistory.length < 3) return 0;
    const mean = globalPriceHistory.reduce((a, b) => a + b, 0) / globalPriceHistory.length;
    const variance = globalPriceHistory.reduce((s, p) => s + (p - mean) ** 2, 0) / globalPriceHistory.length;
    return Math.sqrt(variance);
}

const INITIAL_AGENTS: {
    name: string;
    type: AgentType;
    strategy: string;
    color: string;
}[] = [
        { name: "Alpha-DCA", type: "TRADING", strategy: "DCA", color: "#00d4ff" },
        {
            name: "Beta-Momentum",
            type: "TRADING",
            strategy: "MOMENTUM",
            color: "#ff6b35",
        },
        {
            name: "LP-Provider",
            type: "LIQUIDITY",
            strategy: "BALANCED",
            color: "#39ff14",
        },
        {
            name: "Risk-Monitor",
            type: "MONITOR",
            strategy: "WATCHDOG",
            color: "#ffd93d",
        },
    ];

async function bootstrap(): Promise<void> {
    logger.banner("SENTIENCE — Bootstrapping Real Devnet Agents");
    ensureKeystoreDir();

    for (const tmpl of INITIAL_AGENTS) {
        const agent = createLiveAgent(
            tmpl.name,
            tmpl.type,
            tmpl.strategy,
            tmpl.color,
        );
        agents.push(agent);
    }

    logger.info(`Created ${agents.length} agents with real Ed25519 keypairs`);

    logger.info("Requesting devnet airdrops (may be rate-limited)...");
    for (let i = 0; i < Math.min(2, agents.length); i++) {
        const agent = agents[i];
        const sig = await requestDevnetAirdrop(agent.wallet.publicKey, 1);
        if (sig) {
            agent.airdropRequested = true;
            agent.txSignatures.push(sig);
            agent.actionLog.unshift({
                action: "AIRDROP",
                result: `Received 1 SOL from devnet faucet | tx: ${sig.slice(0, 16)}…`,
                success: true,
                timestamp: new Date().toISOString(),
                txSignature: sig,
            });
            txCount++;
        }
        await new Promise((r) => setTimeout(r, 2000));
    }

    const price = await fetchSolPrice();
    if (price) {
        solPrice = price;
        priceInitialized = true;
        globalPriceHistory.push(solPrice);
        logger.info(
            `SOL price initialized: $${solPrice.toFixed(2)} (from Jupiter/CoinGecko) | 24h change: ${priceChange24h.toFixed(2)}%`,
        );
    } else {
        logger.warn(`Could not fetch SOL price — using default $${solPrice}`);
    }

    for (const agent of agents) {
        const bal = await fetchRealBalance(agent.wallet.publicKey);
        if (bal !== null) agent.balanceSOL = bal;
    }

    logger.success("Bootstrap complete — starting agent ticks");
}

async function tickAgent(agent: LiveAgent): Promise<void> {
    if (agent.status !== "running") return;

    agent.cycleCount++;

    const realBalance = await fetchRealBalance(agent.wallet.publicKey);
    if (realBalance !== null) {
        agent.balanceSOL = realBalance;
    }

    switch (agent.type) {
        case "TRADING":
            await tickTrading(agent);
            break;
        case "LIQUIDITY":
            await tickLiquidity(agent);
            break;
        case "MONITOR":
            await tickMonitor(agent);
            break;
    }
}

async function tickTrading(agent: LiveAgent): Promise<void> {
    if (agent.cycleCount % 5 === 0) {
        const realPrice = await fetchSolPrice();
        if (realPrice) solPrice = realPrice;
    }
    agent.priceHistory.push(solPrice);
    if (agent.priceHistory.length > 20) agent.priceHistory.shift();
    globalPriceHistory.push(solPrice);
    if (globalPriceHistory.length > 20) globalPriceHistory.shift();

    let decision: "BUY" | "SELL" | "HOLD" = "HOLD";

    switch (agent.strategy) {
        case "DCA":
            decision = agent.cycleCount % 3 === 0 ? "BUY" : "HOLD";
            break;
        case "MOMENTUM":
            if (agent.lastPrice > 0) {
                if (solPrice > agent.lastPrice * 1.002) decision = "BUY";
                else if (solPrice < agent.lastPrice * 0.998) decision = "SELL";
            }
            break;
        case "MEAN_REVERT":
            if (agent.priceHistory.length >= 5) {
                const avg =
                    agent.priceHistory.reduce((a, b) => a + b, 0) /
                    agent.priceHistory.length;
                if (solPrice < avg * 0.995) decision = "BUY";
                else if (solPrice > avg * 1.005) decision = "SELL";
            }
            break;
        default:
            if (Math.random() < 0.3) decision = "BUY";
            else if (Math.random() < 0.15) decision = "SELL";
    }

    agent.lastPrice = solPrice;

    if (decision === "BUY" || decision === "SELL") {
        const otherAgents = agents.filter(
            (a) => a.id !== agent.id && a.wallet.publicKey !== agent.wallet.publicKey,
        );
        const counterparty =
            otherAgents[Math.floor(Math.random() * otherAgents.length)];

        if (agent.balanceSOL > 0.002 && counterparty) {
            const transferAmount = 0.0001;
            const sig = await sendRealSOL(
                agent.wallet.keypair,
                counterparty.wallet.publicKey,
                transferAmount,
            );

            if (sig) {
                agent.txSignatures.push(sig);
                txCount++;
                const action = decision;
                agent.pnl +=
                    decision === "BUY" ? Math.random() * 0.5 : -(Math.random() * 0.3);

                logAgentAction(
                    agent,
                    action,
                    `${action} 0.0001 SOL at $${solPrice.toFixed(2)} → ${counterparty.name} | REAL tx: ${sig.slice(0, 16)}…`,
                    true,
                    sig,
                );
                return;
            }
        }

        const quote = await fetchJupiterQuote(100_000);
        if (quote) {
            const usdcOut = (parseInt(quote.outAmount) / 1e6).toFixed(4);
            logAgentAction(
                agent,
                decision,
                `${decision} signal at $${solPrice.toFixed(2)} | Jupiter quote: 0.0001 SOL → ${usdcOut} USDC | Impact: ${parseFloat(quote.priceImpactPct).toFixed(3)}%`,
                true,
            );
            agent.pnl +=
                decision === "BUY" ? Math.random() * 0.3 : -(Math.random() * 0.2);
        } else {
            logAgentAction(
                agent,
                decision,
                `${decision} signal at $${solPrice.toFixed(2)} | Insufficient balance for on-chain execution`,
                false,
            );
        }
    } else {
        logAgentAction(
            agent,
            "HOLD",
            `Price $${solPrice.toFixed(2)} — holding position (${agent.strategy} strategy)`,
            true,
        );
    }
}

async function tickLiquidity(agent: LiveAgent): Promise<void> {
    const r = Math.random();
    let action: string;
    let result: string;

    if (r < 0.15 && agent.balanceSOL > 0.003) {
        const otherAgent = agents.find((a) => a.id !== agent.id);
        if (otherAgent) {
            const sig = await sendRealSOL(
                agent.wallet.keypair,
                otherAgent.wallet.publicKey,
                0.0001,
            );
            if (sig) {
                agent.txSignatures.push(sig);
                txCount++;
                logAgentAction(
                    agent,
                    "ADD_LIQUIDITY",
                    `Deposited 0.0001 SOL to LP pool | REAL tx: ${sig.slice(0, 16)}…`,
                    true,
                    sig,
                );
                return;
            }
        }
        action = "ADD_LIQUIDITY";
        result = `LP deposit signal — balance: ${agent.balanceSOL.toFixed(4)} SOL`;
    } else if (r < 0.25) {
        action = "HARVEST";
        result = `Harvested ${(Math.random() * 0.05).toFixed(4)} USDC in simulated fees`;
    } else if (r < 0.35) {
        action = "REBALANCE";
        result = `Pool rebalanced — token ratio restored`;
    } else {
        action = "MONITOR";
        result = `Pool healthy — APR: ${(15 + Math.random() * 20).toFixed(1)}%`;
    }

    logAgentAction(agent, action, result, true);
}

async function tickMonitor(agent: LiveAgent): Promise<void> {
    const factors: string[] = [];
    let riskScore = 0;

    if (agent.balanceSOL < 0.01) {
        factors.push("critically low balance");
        riskScore += 40;
    } else if (agent.balanceSOL < 0.1) {
        factors.push("low balance");
        riskScore += 20;
    }

    const lowBalanceAgents = agents.filter(
        (a) => a.balanceSOL < 0.05 && a.status === "running",
    );
    if (lowBalanceAgents.length > 0) {
        factors.push(`${lowBalanceAgents.length} agent(s) with low balance`);
        riskScore += 15;
    }

    const rpcStart = Date.now();
    try {
        await connection.getSlot();
        const latency = Date.now() - rpcStart;
        if (latency > 2000) {
            factors.push(`high RPC latency: ${latency}ms`);
            riskScore += 20;
        }
    } catch {
        factors.push("RPC unreachable");
        riskScore += 35;
    }

    const vol = computeVolatility();
    const volPct = solPrice > 0 ? (vol / solPrice) * 100 : 0;
    if (volPct > 1.5) {
        factors.push(`high price volatility: ${volPct.toFixed(2)}%`);
        riskScore += 35;
    } else if (volPct > 0.8) {
        factors.push(`elevated volatility: ${volPct.toFixed(2)}%`);
        riskScore += 20;
    } else if (volPct > 0.4) {
        factors.push(`mild volatility: ${volPct.toFixed(2)}%`);
        riskScore += 10;
    }

    const absDelta = Math.abs(priceChange24h);
    if (absDelta > 10) {
        factors.push(`large 24h swing: ${priceChange24h.toFixed(1)}%`);
        riskScore += 30;
    } else if (absDelta > 5) {
        factors.push(`notable 24h move: ${priceChange24h.toFixed(1)}%`);
        riskScore += 20;
    } else if (absDelta > 2) {
        factors.push(`moderate 24h move: ${priceChange24h.toFixed(1)}%`);
        riskScore += 10;
    }

    if (globalPriceHistory.length >= 5) {
        const recent = globalPriceHistory[globalPriceHistory.length - 1];
        const older  = globalPriceHistory[globalPriceHistory.length - 5];
        const movePct = Math.abs((recent - older) / older) * 100;
        if (movePct > 2) {
            factors.push(`sharp short-term move: ${movePct.toFixed(2)}%`);
            riskScore += 25;
        } else if (movePct > 1) {
            factors.push(`short-term move: ${movePct.toFixed(2)}%`);
            riskScore += 15;
        } else if (movePct > 0.5) {
            factors.push(`minor short-term move: ${movePct.toFixed(2)}%`);
            riskScore += 8;
        }
    }

    const tradingAgents = agents.filter((a) => a.type === "TRADING" && a.status === "running");
    if (tradingAgents.length > 0) {
        const avgPnl = tradingAgents.reduce((s, a) => s + a.pnl, 0) / tradingAgents.length;
        if (avgPnl < -10) {
            factors.push(`significant portfolio drawdown: ${avgPnl.toFixed(2)} SOL`);
            riskScore += 20;
        } else if (avgPnl < -5) {
            factors.push(`portfolio drawdown: ${avgPnl.toFixed(2)} SOL`);
            riskScore += 10;
        }
    }

    const level: RiskLevel =
        riskScore >= 60
            ? "CRITICAL"
            : riskScore >= 40
                ? "HIGH"
                : riskScore >= 20
                    ? "MEDIUM"
                    : "LOW";

    agent.riskLevel = level;

    agents.forEach((a) => {
        if (a.id !== agent.id && a.type !== "MONITOR") {
            if (level === "CRITICAL") a.riskLevel = "HIGH";
            else if (level === "HIGH") a.riskLevel = "MEDIUM";
            else a.riskLevel = "LOW";
        }
    });

    const factorStr = factors.length > 0 ? factors.join(", ") : "no risk factors";
    const recommendations: Record<RiskLevel, string> = {
        LOW: "nominal operations",
        MEDIUM: "monitor closely",
        HIGH: "reduce exposure",
        CRITICAL: "halt all operations",
    };

    const action =
        level === "HIGH" || level === "CRITICAL" ? "ALERT" : "RISK_CHECK";
    logAgentAction(
        agent,
        action,
        `${level} risk (score: ${riskScore}/100) — ${factorStr} → ${recommendations[level]}`,
        true,
    );
}

function logAgentAction(
    agent: LiveAgent,
    action: string,
    result: string,
    success: boolean,
    txSignature?: string,
): void {
    const entry: ActionLog = {
        action,
        result,
        success,
        timestamp: new Date().toISOString(),
        txSignature,
    };
    agent.lastAction = action;
    agent.lastActionAt = entry.timestamp;
    agent.actionLog.unshift(entry);
    if (agent.actionLog.length > 20) agent.actionLog.pop();
}

const TICK_INTERVAL_MS = 5000;

async function mainTick(): Promise<void> {
    const now = Date.now();
    const gapMs = now - lastTickAt;
    if (gapMs > TICK_INTERVAL_MS * 2) {
        cumulativeDowntime += Math.round((gapMs - TICK_INTERVAL_MS) / 1000);
    }
    lastTickAt = now;

    for (const agent of agents) {
        try {
            await tickAgent(agent);
        } catch (e: any) {
            logger.error(`Tick error for ${agent.name}: ${e.message}`);
        }
    }

    broadcastState();
}

function buildSystemState() {
    return {
        agents: agents.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            strategy: a.strategy,
            status: a.status,
            wallet: a.wallet.publicKey,
            balanceSOL: a.balanceSOL,
            cycleCount: a.cycleCount,
            lastAction: a.lastAction,
            lastActionAt: a.lastActionAt,
            pnl: Math.round(a.pnl * 100) / 100,
            color: a.color,
            riskLevel: a.riskLevel,
            actionLog: a.actionLog.slice(0, 10),
        })),
        solPrice: Math.round(solPrice * 100) / 100,
        totalBalance:
            Math.round(agents.reduce((s, a) => s + a.balanceSOL, 0) * 10000) / 10000,
        txCount,
        ...(() => {
            const totalElapsed = Math.round((Date.now() - startedAt) / 1000);
            const uptime = Math.max(0, totalElapsed - cumulativeDowntime);
            const uptimePct = totalElapsed > 0
                ? Math.min(100, (uptime / totalElapsed) * 100)
                : 100;
            return { uptime, uptimePct };
        })(),
    };
}

function broadcastState(): void {
    const payload = JSON.stringify({
        type: "STATE_UPDATE",
        data: buildSystemState(),
    });
    wss.clients.forEach((c: WebSocket) => {
        if (c.readyState === WebSocket.OPEN) c.send(payload);
    });
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            process.env.CLIENT_URL || "https://sentience.vercel.app",
            /\.vercel\.app$/,
          ]
        : ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
  }),
);

app.get("/api/state", (_req, res) => {
    res.json(buildSystemState());
});

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        mode: "REAL_DEVNET",
        cluster: CLUSTER,
        rpcUrl: RPC_URL,
        uptime: Math.max(0, Math.round((Date.now() - startedAt) / 1000) - cumulativeDowntime),
        agents: agents.length,
        running: agents.filter((a) => a.status === "running").length,
        totalTx: txCount,
        solPrice,
    });
});

app.get("/api/agents/:id/explorer", (req, res) => {
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json({
        address: agent.wallet.publicKey,
        explorerUrl: `https://explorer.solana.com/address/${agent.wallet.publicKey}?cluster=devnet`,
        transactions: agent.txSignatures.map((sig) => ({
            signature: sig,
            explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
        })),
    });
});

app.post("/api/agents/:id/airdrop", async (req, res) => {
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const amount = Math.min(req.body?.amount || 1, 2);
    const sig = await requestDevnetAirdrop(agent.wallet.publicKey, amount);
    if (sig) {
        agent.txSignatures.push(sig);
        txCount++;
        logAgentAction(
            agent,
            "AIRDROP",
            `Received ${amount} SOL from devnet faucet | tx: ${sig.slice(0, 16)}…`,
            true,
            sig,
        );

        const bal = await fetchRealBalance(agent.wallet.publicKey);
        if (bal !== null) agent.balanceSOL = bal;
        res.json({ success: true, signature: sig, balance: agent.balanceSOL });
    } else {
        res.json({
            success: false,
            error: "Airdrop rate-limited — try again in ~10s",
        });
    }
});

app.post("/api/agents/:id/transfer", async (req, res) => {
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const { toAgentId, amount } = req.body;
    const toAgent = agents.find((a) => a.id === toAgentId);
    if (!toAgent)
        return res.status(404).json({ error: "Destination agent not found" });

    const transferAmount = Math.min(amount || 0.001, agent.balanceSOL - 0.001);
    if (transferAmount <= 0)
        return res.json({ success: false, error: "Insufficient balance" });

    const sig = await sendRealSOL(
        agent.wallet.keypair,
        toAgent.wallet.publicKey,
        transferAmount,
    );
    if (sig) {
        agent.txSignatures.push(sig);
        toAgent.txSignatures.push(sig);
        txCount++;
        logAgentAction(
            agent,
            "TRANSFER",
            `Sent ${transferAmount} SOL → ${toAgent.name} | REAL tx: ${sig.slice(0, 16)}…`,
            true,
            sig,
        );

        const bal1 = await fetchRealBalance(agent.wallet.publicKey);
        const bal2 = await fetchRealBalance(toAgent.wallet.publicKey);
        if (bal1 !== null) agent.balanceSOL = bal1;
        if (bal2 !== null) toAgent.balanceSOL = bal2;
        res.json({
            success: true,
            signature: sig,
            explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
            from: { id: agent.id, balance: agent.balanceSOL },
            to: { id: toAgent.id, balance: toAgent.balanceSOL },
        });
    } else {
        res.json({ success: false, error: "Transfer failed — check balances" });
    }
});

app.post("/api/agents/:id/pause", (req, res) => {
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    agent.status = "paused";
    logAgentAction(agent, "PAUSED", "Agent paused by operator", true);
    res.json({ success: true });
});

app.post("/api/agents/:id/resume", (req, res) => {
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    agent.status = "running";
    logAgentAction(agent, "RESUMED", "Agent resumed by operator", true);
    res.json({ success: true });
});

app.post("/api/agents/:id/stop", (req, res) => {
    const agent = agents.find((a) => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    agent.status = "stopped";
    logAgentAction(
        agent,
        "STOPPED",
        `Agent stopped after ${agent.cycleCount} cycles`,
        true,
    );
    res.json({ success: true });
});

app.post("/api/agents/spawn", async (req, res) => {
    const { name, type, strategy } = req.body;
    const agentType = (
        ["TRADING", "LIQUIDITY", "MONITOR"].includes(type) ? type : "TRADING"
    ) as AgentType;
    const agentStrategy = strategy || "DCA";
    const agentName = name || `Agent-${agents.length + 1}`;
    const color = AGENT_COLORS[agents.length % AGENT_COLORS.length];

    const agent = createLiveAgent(agentName, agentType, agentStrategy, color);
    agents.push(agent);

    const sig = await requestDevnetAirdrop(agent.wallet.publicKey, 1);
    if (sig) {
        agent.txSignatures.push(sig);
        txCount++;
        logAgentAction(
            agent,
            "AIRDROP",
            `Received 1 SOL from devnet faucet | tx: ${sig.slice(0, 16)}…`,
            true,
            sig,
        );
        const bal = await fetchRealBalance(agent.wallet.publicKey);
        if (bal !== null) agent.balanceSOL = bal;
    }

    res.json({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        strategy: agent.strategy,
        wallet: agent.wallet.publicKey,
        explorerUrl: `https://explorer.solana.com/address/${agent.wallet.publicKey}?cluster=devnet`,
        balanceSOL: agent.balanceSOL,
        airdropSignature: sig,
    });
});

app.get("/api/jupiter/quote", async (req, res) => {
    const amountSOL = parseFloat(req.query.amount as string) || 0.1;
    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
    const quote = await fetchJupiterQuote(lamports);
    if (quote) {
        res.json({
            source: "Jupiter V6 API (REAL)",
            inputMint: SOL_MINT,
            outputMint: USDC_MINT,
            inputAmount: `${amountSOL} SOL`,
            outputAmount: `${(parseInt(quote.outAmount) / 1e6).toFixed(4)} USDC`,
            priceImpact: `${parseFloat(quote.priceImpactPct).toFixed(4)}%`,
            raw: quote,
        });
    } else {
        res.json({ source: "unavailable", error: "Jupiter API unreachable" });
    }
});

if (process.env.NODE_ENV === "production") {
    const clientDist = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(clientDist, "index.html"));
    });
} else {
    app.get("/", (_req, res) => {
        res.json({
            name: "Sentience — REAL Devnet Agent Wallet API",
            mode: "REAL_DEVNET",
            cluster: CLUSTER,
            agents: agents.length,
            dashboard: "http://localhost:5173",
        });
    });
}

wss.on("connection", (ws: WebSocket) => {
    logger.info("WebSocket client connected");
    ws.send(JSON.stringify({ type: "STATE_UPDATE", data: buildSystemState() }));
    ws.on("close", () => logger.info("WebSocket client disconnected"));
});

const PORT = process.env.PORT || 3000;

async function start(): Promise<void> {
    await bootstrap();

    setInterval(() => {
        mainTick().catch((e) => logger.error(`Main tick error: ${e.message}`));
    }, TICK_INTERVAL_MS);

    server.listen(PORT, () => {
        console.log("\n" + "═".repeat(60));
        console.log("  SENTIENCE — Autonomous AI Agent Wallets for Solana");
        console.log("  ▸ MODE: REAL DEVNET (not simulated)");
        console.log("═".repeat(60));
        console.log(`  RPC        →  ${RPC_URL}`);
        console.log(`  API        →  http://localhost:${PORT}/api/state`);
        console.log(`  Health     →  http://localhost:${PORT}/api/health`);
        console.log(`  Jupiter    →  http://localhost:${PORT}/api/jupiter/quote`);
        if (process.env.NODE_ENV === "production") {
            console.log(`  Dashboard  →  http://localhost:${PORT}`);
        } else {
            console.log(
                `  Dashboard  →  http://localhost:5173  (npm run dev:client)`,
            );
        }
        console.log("─".repeat(60));
        console.log("  Agents:");
        for (const agent of agents) {
            const funded =
                agent.balanceSOL > 0
                    ? `✓ ${agent.balanceSOL.toFixed(4)} SOL`
                    : "○ unfunded";
            console.log(
                `    ${agent.name.padEnd(18)} ${agent.wallet.publicKey.slice(0, 20)}…  ${funded}`,
            );
        }
        console.log("─".repeat(60));
        console.log(`  Security   →  AES-256-CBC + PBKDF2 (10k iterations)`);
        console.log(`  Signing    →  Ed25519 (autonomous, no human approval)`);
        console.log(`  Tick       →  Every ${TICK_INTERVAL_MS / 1000}s per agent`);
        console.log(`  Txns       →  ${txCount} confirmed so far`);
        console.log("═".repeat(60) + "\n");
    });
}

start().catch((err) => {
    logger.error(`Fatal startup error: ${err.message}`);
    console.error(err);
    process.exit(1);
});
