import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Compute SHA-256 hex digest of an input string.
 * Used for hashing refresh tokens, email verification tokens, etc.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns `iv:ciphertext:tag` all hex-encoded.
 */
export function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${encrypted}:${tag}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Expects format `iv:ciphertext:tag` all hex-encoded.
 */
export function decrypt(encrypted: string, keyHex: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  const [ivHex, ciphertextHex, tagHex] = parts as [string, string, string];

  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
