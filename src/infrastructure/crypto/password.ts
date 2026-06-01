import argon2 from 'argon2';
import { getEnv } from '../../config/env.js';

/**
 * Hash a password using Argon2id with env-configured parameters.
 * Returns the full encoded hash string (includes salt + params).
 */
export async function hashPassword(password: string): Promise<string> {
  const env = getEnv();
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  });
}

/**
 * Verify a password against an Argon2id hash.
 * Returns false on any error (timing-safe via argon2 internals).
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let _dummyHash: string | undefined;

/**
 * Initialize the dummy hash with a real Argon2id hash.
 * Must be called during application startup before handling requests.
 */
export async function initDummyHash(): Promise<void> {
  if (!_dummyHash) {
    _dummyHash = await hashPassword('__dummy_password_never_used__');
  }
}

/**
 * Get the pre-computed dummy hash for timing-safe comparison.
 * Ensures login always performs a full Argon2id hash computation
 * regardless of whether the user exists, preventing enumeration.
 */
export function getDummyHash(): string {
  if (!_dummyHash) {
    throw new Error('Dummy hash not initialized. Call initDummyHash() during startup.');
  }
  return _dummyHash;
}
