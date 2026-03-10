import * as CryptoJS from 'crypto-js';
import * as fs from 'fs';
import * as path from 'path';

const KEYSTORE_DIR = process.env.KEYSTORE_PATH || path.join(process.cwd(), '.keystore');

export interface EncryptedKeystore {
  id: string;
  agentName: string;
  encryptedPrivateKey: string;
  publicKey: string;
  createdAt: string;
  iv: string;
}

export function ensureKeystoreDir(): void {
  if (!fs.existsSync(KEYSTORE_DIR)) {
    fs.mkdirSync(KEYSTORE_DIR, { recursive: true, mode: 0o700 });
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function seedKeystoresFromEnv(): void {
  ensureKeystoreDir();

  const envIds = new Set<string>();
  for (const key of Object.keys(process.env)) {
    if (!key.startsWith('KEYSTORE_')) continue;
    const id = key.slice('KEYSTORE_'.length).replace(/_/g, '-');
    if (UUID_PATTERN.test(id)) envIds.add(id);
  }

  for (const file of fs.readdirSync(KEYSTORE_DIR)) {
    if (!file.endsWith('.json')) continue;
    const id = file.slice(0, -5);
    if (!envIds.has(id)) {
      fs.unlinkSync(path.join(KEYSTORE_DIR, file));
    }
  }

  let seeded = 0;
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('KEYSTORE_') || !value) continue;
    const id = key.slice('KEYSTORE_'.length).replace(/_/g, '-');
    if (!UUID_PATTERN.test(id)) continue;
    const filePath = path.join(KEYSTORE_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      try {
        JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        continue; // valid, skip
      } catch {
        // corrupted — overwrite
      }
    }
    const json = Buffer.from(value, 'base64').toString('utf-8');
    fs.writeFileSync(filePath, json, { mode: 0o600 });
    seeded++;
  }
  console.log(`[seedKeystoresFromEnv] seeded=${seeded} keystoreDir=${KEYSTORE_DIR}`);
}

export function encryptPrivateKey(privateKeyBytes: Uint8Array, password: string): { encrypted: string; iv: string } {
  const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.PBKDF2(password, iv, { keySize: 256 / 32, iterations: 10000 });
  const encrypted = CryptoJS.AES.encrypt(privateKeyHex, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return {
    encrypted: encrypted.toString(),
    iv: iv.toString(),
  };
}

export function decryptPrivateKey(encrypted: string, iv: string, password: string): Uint8Array {
  const ivWords = CryptoJS.enc.Hex.parse(iv);
  const key = CryptoJS.PBKDF2(password, ivWords, { keySize: 256 / 32, iterations: 10000 });
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: ivWords,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const privateKeyHex = decrypted.toString(CryptoJS.enc.Utf8);
  return Buffer.from(privateKeyHex, 'hex');
}

export function saveKeystore(keystore: EncryptedKeystore): void {
  ensureKeystoreDir();
  const filePath = path.join(KEYSTORE_DIR, `${keystore.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(keystore, null, 2), { mode: 0o600 });
}

export function loadKeystore(agentId: string): EncryptedKeystore | null {
  const filePath = path.join(KEYSTORE_DIR, `${agentId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function listKeystores(): EncryptedKeystore[] {
  ensureKeystoreDir();
  const files = fs.readdirSync(KEYSTORE_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(KEYSTORE_DIR, f), 'utf-8')));
}

export function deleteKeystore(agentId: string): boolean {
  const filePath = path.join(KEYSTORE_DIR, `${agentId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}
