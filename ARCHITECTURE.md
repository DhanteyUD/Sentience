---
title: Sentience — System Architecture
---

graph TB
    subgraph Dashboard["React Dashboard (Port 5173)"]
        UI[Agent Cards / Price Chart / Activity Feed]
        WS_CLIENT[WebSocket Client]
        REST_CLIENT[REST Client]
    end

    subgraph API["Express Server (Port 3000)"]
        REST[REST API<br/>/api/state, /api/agents/*]
        WS_SERVER[WebSocket Server<br/>STATE_UPDATE every 3s]
    end

    subgraph Orchestrator["Agent Orchestrator"]
        ORCH[AgentOrchestrator<br/>spawn / start / stop / pause]
        
        subgraph Agents["Autonomous Agents"]
            TA[TradingAgent<br/>DCA / Momentum / Mean Revert]
            LA[LiquidityAgent<br/>LP Provision / Harvest / Rebalance]
            MA[MonitorAgent<br/>Risk Scoring / Alerts]
        end
    end

    subgraph Wallets["Wallet Layer"]
        WM[WalletManager<br/>Registry / Load / Create]
        
        subgraph AW["AgentWallet (per agent)"]
            KP[Ed25519 Keypair<br/>In-memory only]
            SIGN[signTransaction<br/>signMessage]
            SEND[sendSOL / sendSPLToken]
        end
    end

    subgraph Security["Encryption Layer"]
        ENC[AES-256-CBC Encrypt]
        DEC[AES-256-CBC Decrypt]
        KDF[PBKDF2<br/>10k iterations]
        KS[".keystore/{uuid}.json<br/>mode 0600"]
    end

    subgraph Protocols["Protocol Layer"]
        JUP[JupiterProtocol<br/>V6 Quote + Swap API]
    end

    subgraph Solana["Solana Devnet"]
        RPC[JSON RPC<br/>getBalance, sendTransaction]
        CHAIN[Blockchain<br/>Slots / Transactions]
        EXPLORER[Solana Explorer]
    end

    UI --> WS_CLIENT
    UI --> REST_CLIENT
    WS_CLIENT <-->|WebSocket| WS_SERVER
    REST_CLIENT -->|HTTP| REST

    REST --> ORCH
    WS_SERVER --> ORCH

    ORCH --> TA
    ORCH --> LA
    ORCH --> MA

    TA --> AW
    LA --> AW
    MA --> AW
    TA --> JUP

    JUP --> AW

    AW --> WM
    KP --> SIGN
    SIGN --> SEND

    WM --> ENC
    WM --> DEC
    ENC --> KDF
    DEC --> KDF
    ENC --> KS
    DEC --> KS

    SEND --> RPC
    RPC --> CHAIN
    CHAIN --> EXPLORER

    classDef agent fill:#1a1a2e,stroke:#00d4ff,stroke-width:2px,color:#fff
    classDef wallet fill:#1a1a2e,stroke:#39ff14,stroke-width:2px,color:#fff
    classDef security fill:#1a1a2e,stroke:#ff6b35,stroke-width:2px,color:#fff
    classDef solana fill:#1a1a2e,stroke:#9945FF,stroke-width:2px,color:#fff

    class TA,LA,MA agent
    class AW,KP,SIGN,SEND wallet
    class ENC,DEC,KDF,KS security
    class RPC,CHAIN,EXPLORER solana
