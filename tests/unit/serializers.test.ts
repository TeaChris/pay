import { describe, it, expect } from 'vitest';
import { redactSerializer } from '../../src/infrastructure/logging/serializers.js';

describe('Log Serializers', () => {
  it('should redact sensitive fields', () => {
    const input = {
      email: 'user@example.com',
      password: 'secret123',
      passwordHash: '$argon2id$...',
      token: 'abc123',
      name: 'visible',
    };

    const result = redactSerializer(input) as Record<string, unknown>;

    expect(result['email']).toBe('user@example.com'); // Not redacted
    expect(result['name']).toBe('visible'); // Not redacted
    expect(result['password']).toBe('[REDACTED]');
    expect(result['passwordHash']).toBe('[REDACTED]');
    expect(result['token']).toBe('[REDACTED]');
  });

  it('should handle nested objects', () => {
    const input = {
      user: {
        email: 'test@test.com',
        password: 'secret',
      },
    };

    const result = redactSerializer(input) as Record<string, Record<string, unknown>>;
    expect(result['user']!['password']).toBe('[REDACTED]');
    expect(result['user']!['email']).toBe('test@test.com');
  });

  it('should handle null and undefined', () => {
    expect(redactSerializer(null)).toBeNull();
    expect(redactSerializer(undefined)).toBeUndefined();
  });

  it('should handle arrays', () => {
    const input = [{ password: 'secret' }, { name: 'visible' }];
    const result = redactSerializer(input) as Record<string, unknown>[];
    expect(result[0]!['password']).toBe('[REDACTED]');
    expect(result[1]!['name']).toBe('visible');
  });

  it('should handle primitives', () => {
    expect(redactSerializer('string')).toBe('string');
    expect(redactSerializer(42)).toBe(42);
    expect(redactSerializer(true)).toBe(true);
  });
});
