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

/**
 * Pre-computed dummy hash for timing-safe comparison when user does not exist.
 * Prevents enumeration by ensuring login always performs a hash comparison.
 */
export const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRoZXJl$dummyhashvaluefortimingenumeration';
