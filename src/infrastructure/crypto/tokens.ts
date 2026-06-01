import { randomBytes } from 'node:crypto';

/**
 * Generate a cryptographically secure random token, base64url-encoded.
 * Default 32 bytes = 256 bits of entropy.
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Generate MFA recovery codes in `xxxx-xxxx-xxxx-xxxx` format.
 * Each code has 64 bits of entropy (8 bytes).
 */
export function generateRecoveryCodes(count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = randomBytes(8).toString('hex');
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`);
  }
  return codes;
}
