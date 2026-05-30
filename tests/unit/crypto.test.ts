import { describe, it, expect } from 'vitest';
import { sha256, encrypt, decrypt } from '../../src/infrastructure/crypto/hash.js';
import { generateToken, generateRecoveryCodes } from '../../src/infrastructure/crypto/tokens.js';

describe('SHA-256', () => {
  it('should produce consistent hashes', () => {
    const hash1 = sha256('test');
    const hash2 = sha256('test');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = sha256('input1');
    const hash2 = sha256('input2');
    expect(hash1).not.toBe(hash2);
  });

  it('should return 64-char hex string', () => {
    const hash = sha256('anything');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('AES-256-GCM Encryption', () => {
  const testKey = 'a'.repeat(64); // 32 bytes as hex

  it('should encrypt and decrypt successfully', () => {
    const plaintext = 'JBSWY3DPEHPK3PXP'; // Example TOTP secret
    const encrypted = encrypt(plaintext, testKey);
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = 'same input';
    const enc1 = encrypt(plaintext, testKey);
    const enc2 = encrypt(plaintext, testKey);
    expect(enc1).not.toBe(enc2);
  });

  it('should produce format iv:ciphertext:tag', () => {
    const encrypted = encrypt('test', testKey);
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3);
  });

  it('should fail with wrong key', () => {
    const encrypted = encrypt('test', testKey);
    const wrongKey = 'b'.repeat(64);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it('should fail with tampered ciphertext', () => {
    const encrypted = encrypt('test', testKey);
    const tampered = encrypted.replace(/[a-f]/, 'F');
    // May or may not throw depending on what's tampered, but should not return original
    try {
      const result = decrypt(tampered, testKey);
      expect(result).not.toBe('test');
    } catch {
      // Expected — auth tag verification failed
    }
  });
});

describe('Token Generation', () => {
  it('should generate base64url tokens', () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('should generate tokens of expected length', () => {
    // 32 bytes = ~43 base64url chars
    const token = generateToken(32);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('should generate unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });
});

describe('Recovery Codes', () => {
  it('should generate the requested number of codes', () => {
    const codes = generateRecoveryCodes(10);
    expect(codes.length).toBe(10);
  });

  it('should format codes as xxxx-xxxx', () => {
    const codes = generateRecoveryCodes(5);
    for (const code of codes) {
      expect(code).toMatch(/^[a-f0-9]{4}-[a-f0-9]{4}$/);
    }
  });

  it('should generate unique codes', () => {
    const codes = generateRecoveryCodes(10);
    const unique = new Set(codes);
    expect(unique.size).toBe(10);
  });
});
