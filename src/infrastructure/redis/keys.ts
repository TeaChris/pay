/** Redis key namespace helpers. All keys prefixed with `pay:` to avoid collisions. */

export const RedisKeys = {
      permissions: (role: string): string => `pay:perms:${role}`,
      mfaChallenge: (jti: string): string => `pay:mfa:challenge:${jti}`,
      lockout: (identifier: string): string => `pay:lockout:${identifier}`,
      sessionCount: (userId: string): string => `pay:session:count:${userId}`,
      mfaChallengeAttempts: (jti: string): string => `pay:mfa:attempts:${jti}`,
      rateLimit: (scope: string, id: string): string => `pay:rl:${scope}:${id}`,
      revokedSession: (sessionId: string): string =>
            `pay:revoked:session:${sessionId}`,
} as const
