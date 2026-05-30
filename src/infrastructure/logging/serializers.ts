const REDACTED_FIELDS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'secret',
  'secretEncrypted',
  'secret_encrypted',
  'authorization',
  'cookie',
  'mfaChallengeToken',
  'recoveryCodes',
  'recovery_codes',
]);

const REDACTED = '[REDACTED]';

/**
 * Recursively redact sensitive fields from objects being logged.
 * Works as a pino serializer.
 */
export function redactSerializer(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSerializer(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACTED_FIELDS.has(key)) {
      result[key] = REDACTED;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSerializer(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
