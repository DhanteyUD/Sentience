# Security Deep Dive — Sentience Agent Wallet System

## Overview

This document explains the security architecture of Sentience's agentic wallet system, covering key management, threat modeling, and design decisions.

---

## Key Lifecycle

### 1. Generation

Each agent wallet generates a fresh Ed25519 keypair using `@solana/web3.js`'s `Keypair.generate()`, which calls the system's cryptographically secure random number generator (`crypto.getRandomValues` or equivalent). This produces a 64-byte secret key (32 bytes private + 32 bytes public) and a 32-byte public key.

No keys are reused across agents. No keys are derived from a master seed. Each agent is cryptographically isolated.

### 2. Encryption (At Rest)

Immediately after generation, the private key is encrypted before touching disk:

```text
Input:  64-byte Ed25519 secret key
        User-provided password (or env WALLET_ENCRYPTION_KEY)

Step 1: Generate random 16-byte IV (initialization vector)
Step 2: Derive encryption key via PBKDF2
        - Input: password + IV (used as salt)
        - Iterations: 10,000
        - Output: 256-bit AES key
Step 3: Encrypt private key hex with AES-256-CBC
        - Mode: CBC (Cipher Block Chaining)
        - Padding: PKCS7
Step 4: Store as JSON keystore:
        {
          id: uuid,
          agentName: string,
          encryptedPrivateKey: base64(ciphertext),
          publicKey: base58(pubkey),
          iv: hex(iv),
          createdAt: ISO timestamp
        }
Step 5: Write to .keystore/{uuid}.json with mode 0600
```

The private key exists in plaintext **only in memory** during generation and during active signing operations.

### 3. Decryption (For Signing)

When an agent needs to sign a transaction:

```text
Step 1: Read keystore JSON from disk
Step 2: Parse IV from stored hex string
Step 3: Re-derive AES key via PBKDF2 (same password + IV + 10k iterations)
Step 4: Decrypt ciphertext with AES-256-CBC
Step 5: Reconstruct Keypair from decrypted secret key bytes
Step 6: Sign transaction in memory
Step 7: Keypair remains in memory for the agent's lifetime
```

### 4. Destruction

When an agent is removed:

- Keystore file is deleted from disk (`fs.unlinkSync`)
- In-memory keypair reference is released to garbage collection
- No backup copies are retained

---

## Threat Model

### What We Defend Against

| Threat | Mitigation |
| --- | --- |
| **Disk theft** | Private keys encrypted with AES-256-CBC; attacker needs password |
| **Brute-force on password** | PBKDF2 with 10,000 iterations makes each guess computationally expensive |
| **Cross-agent compromise** | Each agent has its own keypair; no shared secrets |
| **Network eavesdropping** | All Solana RPC calls use HTTPS; WebSocket can be upgraded to WSS |
| **Unauthorized file access** | Keystore files have mode 0600 (owner-only) |
| **Memory dump** | Out of scope for prototype; production would use HSM/enclave |

### Known Limitations (Prototype)

1. **Password in environment variable** — In production, use a secrets manager (HashiCorp Vault, AWS KMS, or Turnkey as referenced in Solana's Kora docs)
2. **PBKDF2 iteration count** — 10,000 is the minimum recommended; production should use 600,000+ or switch to Argon2id
3. **No HSM integration** — Production wallets should use hardware security modules for key signing
4. **In-memory key exposure** — Once loaded, the keypair exists in Node.js heap memory; a process memory dump could extract it
5. **No key rotation** — Agents use a single keypair for their lifetime; production should support key rotation
6. **CryptoJS vs native crypto** — We use `crypto-js` for portability; production should use Node.js native `crypto` module for better performance and security auditing

---

## Design Principles

### Principle 1: Key Isolation

Every agent gets a unique keypair. There is no HD wallet derivation, no master seed, no shared secret. If Agent A is compromised, Agent B's funds are unaffected.

### Principle 2: Separation of Concerns

The wallet layer (`AgentWallet`) handles all cryptographic operations. The agent layer (`BaseAgent`, `TradingAgent`, etc.) never touches private keys directly. An agent calls `wallet.sendSOL()` — it doesn't know how signing works internally.

### Principle 3: Encrypt by Default

Private keys are encrypted immediately upon generation. There is no code path where a plaintext private key is written to disk.

### Principle 4: Minimal Privilege

Each agent only has access to its own wallet. The orchestrator can coordinate agents but doesn't hold any agent's private key. The dashboard server doesn't have access to any private keys — it only receives public state data.

---

## Comparison with Existing Approaches

| Approach | Key Storage | Signing | Agent-Compatible |
| --- | --- | --- | --- |
| **Browser wallet (Phantom)** | Encrypted in browser | User-approved popups | No — requires human |
| **Custodial (Coinbase)** | Server-side HSM | API call to custodian | Partially — API-dependent |
| **MPC (Turnkey/Fireblocks)** | Distributed key shares | Threshold signatures | Yes — but complex setup |
| **Sentience (this project)** | Encrypted on disk per agent | Autonomous Ed25519 | Yes — fully autonomous |

Sentience occupies a unique position: **fully autonomous signing with per-agent key isolation**, without requiring custodial infrastructure or multi-party computation. This makes it ideal for AI agents that need to act independently.

---

## Solana-Specific Security Notes

- **Ed25519** is Solana's native signature scheme — we use it directly via `@solana/web3.js`
- **Transaction signing** includes the recent blockhash, which serves as a nonce preventing replay attacks
- **Devnet isolation** — all operations target `https://api.devnet.solana.com`, with no mainnet interaction
- **Explorer verification** — every transaction is viewable on Solana Explorer with the returned signature
