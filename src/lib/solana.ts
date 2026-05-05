import { Keypair } from '@solana/web3.js';
import { Buffer } from 'buffer';

// This would typically be a secure environment variable
const MASTER_ENCRYPTION_KEY = import.meta.env.VITE_WALLET_ENCRYPTION_KEY || 'default-secure-key-32-chars-length!!';

/**
 * Generates a new Solana Keypair and returns it along with encrypted private key data.
 */
export async function generateSecureWallet() {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKey = keypair.secretKey;

  // Encryption setup
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedKey = new TextEncoder().encode(MASTER_ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encodedKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    privateKey
  );

  return {
    publicKey,
    encryptedPrivateKey: Buffer.from(encryptedContent).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
  };
}

/**
 * Decrypts a private key using the master key and IV.
 */
export async function decryptWallet(encryptedBase64: string, ivBase64: string) {
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const encodedKey = new TextEncoder().encode(MASTER_ENCRYPTION_KEY.padEnd(32).slice(0, 32));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encodedKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );
    return new Uint8Array(decrypted);
  } catch (e) {
    throw new Error('Failed to decrypt wallet. Invalid key or corrupted data.');
  }
}
