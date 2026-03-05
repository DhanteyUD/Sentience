import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  TransactionSignature,
  clusterApiUrl,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  transfer as splTransfer,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { v4 as uuidv4 } from "uuid";
import bs58 from "bs58";
import {
  encryptPrivateKey,
  decryptPrivateKey,
  saveKeystore,
  loadKeystore,
  EncryptedKeystore,
} from "../utils/encryption";
import { logger } from "../utils/logger";

export interface WalletInfo {
  id: string;
  agentName: string;
  publicKey: string;
  balanceSOL: number;
  createdAt: string;
}

export interface TransactionRecord {
  signature: string;
  type: "SOL_TRANSFER" | "SPL_TRANSFER" | "AIRDROP" | "PROGRAM_CALL";
  amount: number;
  token: string;
  to?: string;
  from?: string;
  timestamp: string;
  status: "confirmed" | "failed" | "pending";
  slot?: number;
}

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
}

const DEVNET_URL = clusterApiUrl("devnet");
const DEFAULT_PASSWORD =
  process.env.WALLET_ENCRYPTION_KEY || "agent-wallet-secure-key-2024";

export class AgentWallet {
  private keypair: Keypair;
  private connection: Connection;
  public readonly id: string;
  public readonly agentName: string;
  public readonly publicKey: PublicKey;
  private txHistory: TransactionRecord[] = [];

  constructor(keypair: Keypair, id: string, agentName: string) {
    this.keypair = keypair;
    this.id = id;
    this.agentName = agentName;
    this.publicKey = keypair.publicKey;
    this.connection = new Connection(DEVNET_URL, "confirmed");
  }

  static create(
    agentName: string,
    password: string = DEFAULT_PASSWORD,
  ): AgentWallet {
    const keypair = Keypair.generate();
    const id = uuidv4();
    const { encrypted, iv } = encryptPrivateKey(keypair.secretKey, password);

    const keystore: EncryptedKeystore = {
      id,
      agentName,
      encryptedPrivateKey: encrypted,
      publicKey: keypair.publicKey.toBase58(),
      createdAt: new Date().toISOString(),
      iv,
    };

    saveKeystore(keystore);
    logger.wallet(
      `Created wallet for agent "${agentName}" → ${keypair.publicKey.toBase58()}`,
    );
    return new AgentWallet(keypair, id, agentName);
  }

  static load(
    agentId: string,
    password: string = DEFAULT_PASSWORD,
  ): AgentWallet | null {
    const keystore = loadKeystore(agentId);
    if (!keystore) {
      logger.error(`No keystore found for agent ${agentId}`);
      return null;
    }
    try {
      const secretKey = decryptPrivateKey(
        keystore.encryptedPrivateKey,
        keystore.iv,
        password,
      );
      const keypair = Keypair.fromSecretKey(secretKey);
      logger.wallet(
        `Loaded wallet for agent "${keystore.agentName}" → ${keypair.publicKey.toBase58()}`,
      );
      return new AgentWallet(keypair, keystore.id, keystore.agentName);
    } catch (e) {
      logger.error("Failed to decrypt wallet - invalid password");
      return null;
    }
  }

  static fromPrivateKey(
    privateKeyBase58: string,
    agentName: string,
  ): AgentWallet {
    const secretKey = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    return new AgentWallet(keypair, uuidv4(), agentName);
  }

  async getSOLBalance(): Promise<number> {
    const lamports = await this.connection.getBalance(this.publicKey);
    return lamports / LAMPORTS_PER_SOL;
  }

  async getTokenBalances(): Promise<TokenBalance[]> {
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
      this.publicKey,
      { programId: TOKEN_PROGRAM_ID },
    );

    return tokenAccounts.value.map(({ account }) => {
      const info = account.data.parsed.info;
      return {
        mint: info.mint,
        amount: info.tokenAmount.uiAmount || 0,
        decimals: info.tokenAmount.decimals,
      };
    });
  }

  async getWalletInfo(): Promise<WalletInfo> {
    const balance = await this.getSOLBalance();
    return {
      id: this.id,
      agentName: this.agentName,
      publicKey: this.publicKey.toBase58(),
      balanceSOL: balance,
      createdAt: new Date().toISOString(),
    };
  }

  async requestAirdrop(solAmount: number = 1): Promise<TransactionSignature> {
    logger.wallet(
      `Requesting ${solAmount} SOL airdrop for "${this.agentName}"...`,
    );
    const lamports = solAmount * LAMPORTS_PER_SOL;
    const sig = await this.connection.requestAirdrop(this.publicKey, lamports);
    await this.connection.confirmTransaction(sig, "confirmed");

    this.recordTx({
      signature: sig,
      type: "AIRDROP",
      amount: solAmount,
      token: "SOL",
      timestamp: new Date().toISOString(),
      status: "confirmed",
    });

    logger.success(`Airdrop confirmed: ${sig}`);
    return sig;
  }

  async sendSOL(
    toAddress: string,
    amount: number,
  ): Promise<TransactionSignature> {
    logger.tx(
      `${this.agentName} → sending ${amount} SOL to ${toAddress.slice(0, 8)}...`,
    );

    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.publicKey,
        toPubkey,
        lamports,
      }),
    );

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.publicKey;

    transaction.sign(this.keypair);

    const sig = await this.connection.sendRawTransaction(
      transaction.serialize(),
    );
    await this.connection.confirmTransaction({
      signature: sig,
      blockhash,
      lastValidBlockHeight,
    });

    this.recordTx({
      signature: sig,
      type: "SOL_TRANSFER",
      amount,
      token: "SOL",
      to: toAddress,
      from: this.publicKey.toBase58(),
      timestamp: new Date().toISOString(),
      status: "confirmed",
    });

    logger.success(`SOL transfer confirmed: ${sig}`);
    return sig;
  }

  async sendSPLToken(
    mintAddress: string,
    toAddress: string,
    amount: number,
  ): Promise<TransactionSignature> {
    logger.tx(
      `${this.agentName} → sending ${amount} SPL tokens (${mintAddress.slice(0, 8)}...) to ${toAddress.slice(0, 8)}...`,
    );

    const mint = new PublicKey(mintAddress);
    const toPubkey = new PublicKey(toAddress);

    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.keypair,
      mint,
      this.publicKey,
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.keypair,
      mint,
      toPubkey,
    );

    const mintInfo = await getMint(this.connection, mint);
    const adjustedAmount = BigInt(
      Math.floor(amount * Math.pow(10, mintInfo.decimals)),
    );

    const sig = await splTransfer(
      this.connection,
      this.keypair,
      fromTokenAccount.address,
      toTokenAccount.address,
      this.keypair,
      adjustedAmount,
    );

    this.recordTx({
      signature: sig,
      type: "SPL_TRANSFER",
      amount,
      token: mintAddress,
      to: toAddress,
      from: this.publicKey.toBase58(),
      timestamp: new Date().toISOString(),
      status: "confirmed",
    });

    logger.success(`SPL transfer confirmed: ${sig}`);
    return sig;
  }

  private recordTx(record: TransactionRecord): void {
    this.txHistory.unshift(record);
    if (this.txHistory.length > 100) this.txHistory.pop();
  }

  getTransactionHistory(): TransactionRecord[] {
    return [...this.txHistory];
  }

  signTransaction(transaction: Transaction): Transaction {
    transaction.sign(this.keypair);
    return transaction;
  }

  signMessage(message: Uint8Array): Uint8Array {
    const { sign } = require("tweetnacl");
    return sign.detached(message, this.keypair.secretKey);
  }

  getPublicKeyBase58(): string {
    return this.publicKey.toBase58();
  }

  getExplorerUrl(signature?: string): string {
    if (signature) {
      return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    }
    return `https://explorer.solana.com/address/${this.publicKey.toBase58()}?cluster=devnet`;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getKeypair(): Keypair {
    return this.keypair;
  }
}
