/** Redis key namespace helpers. All keys prefixed with `pay:` to avoid collisions. */

export const RedisKeys = {
  rateLimit: (scope: string, id: string): string => `pay:rl:${scope}:${id}`,
  mfaChallenge: (jti: string): string => `pay:mfa:challenge:${jti}`,
  permissions: (role: string): string => `pay:perms:${role}`,
  lockout: (identifier: string): string => `pay:lockout:${identifier}`,
  sessionCount: (userId: string): string => `pay:session:count:${userId}`,
} as const;
