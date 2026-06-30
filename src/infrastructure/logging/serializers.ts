const REDACTED_FIELDS = new Set([
      'cookie',
      'token',
      'secret',
      'password',
      'accessToken',
      'passwordHash',
      'access_token',
      'refreshToken',
      'refresh_token',
      'password_hash',
      'recoveryCodes',
      'authorization',
      'recovery_codes',
      'secretEncrypted',
      'secret_encrypted',
      'mfaChallengeToken',
])

const REDACTED = '[REDACTED]'

/**
 * Recursively redact sensitive fields from objects being logged.
 * Works as a pino serializer.
 */
export function redactSerializer(obj: unknown): unknown {
      if (obj === null || obj === undefined) return obj
      if (typeof obj !== 'object') return obj

      if (Array.isArray(obj)) {
            return obj.map((item) => redactSerializer(item))
      }

      const result: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(
            obj as Record<string, unknown>,
      )) {
            if (REDACTED_FIELDS.has(key)) {
                  result[key] = REDACTED
            } else if (typeof value === 'object' && value !== null) {
                  result[key] = redactSerializer(value)
            } else {
                  result[key] = value
            }
      }
      return result
}
