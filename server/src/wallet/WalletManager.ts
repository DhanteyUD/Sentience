import { AgentWallet, WalletInfo } from './AgentWallet';
import { listKeystores, deleteKeystore } from '../utils/encryption';
import { logger } from '../utils/logger';

export class WalletManager {
  private wallets: Map<string, AgentWallet> = new Map();
  private static instance: WalletManager;

  static getInstance(): WalletManager {
    if (!WalletManager.instance) {
      WalletManager.instance = new WalletManager();
    }
    return WalletManager.instance;
  }

  createWallet(agentName: string, password?: string): AgentWallet {
    const wallet = AgentWallet.create(agentName, password);
    this.wallets.set(wallet.id, wallet);
    logger.wallet(`Wallet registered in manager: ${agentName} (${wallet.id})`);
    return wallet;
  }

  loadWallet(agentId: string, password?: string): AgentWallet | null {
    if (this.wallets.has(agentId)) {
      return this.wallets.get(agentId)!;
    }
    const wallet = AgentWallet.load(agentId, password);
    if (wallet) {
      this.wallets.set(wallet.id, wallet);
    }
    return wallet;
  }

  getWallet(agentId: string): AgentWallet | undefined {
    return this.wallets.get(agentId);
  }

  getAllWallets(): AgentWallet[] {
    return Array.from(this.wallets.values());
  }

  async loadAllFromDisk(password?: string): Promise<void> {
    const keystores = listKeystores();
    for (const ks of keystores) {
      if (!this.wallets.has(ks.id)) {
        this.loadWallet(ks.id, password);
      }
    }
    logger.info(`Loaded ${this.wallets.size} wallets from disk`);
  }

  async getAllWalletInfos(): Promise<WalletInfo[]> {
    const infos: WalletInfo[] = [];
    for (const wallet of this.wallets.values()) {
      try {
        infos.push(await wallet.getWalletInfo());
      } catch (e) {
        logger.warn(`Failed to fetch info for wallet ${wallet.id}`);
      }
    }
    return infos;
  }

  removeWallet(agentId: string): boolean {
    const deleted = deleteKeystore(agentId);
    this.wallets.delete(agentId);
    return deleted;
  }

  get count(): number {
    return this.wallets.size;
  }
}
