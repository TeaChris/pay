/** Security constants and rate-limit configurations. */
import { getEnv } from './env.js';

// ─── Token Lifetimes ────────────────────────────────────────────
export const ACCESS_TOKEN_TTL_SEC = 900; // 15 minutes (overridden by env)
export const REFRESH_TOKEN_TTL_SEC = 604_800; // 7 days (overridden by env)
export const MFA_CHALLENGE_TTL_SEC = 300; // 5 minutes
export const EMAIL_VERIFICATION_TTL_SEC = 86_400; // 24 hours
export const PASSWORD_RESET_TTL_SEC = 3_600; // 1 hour

// ─── Cookie Names ───────────────────────────────────────────────
export const ACCESS_COOKIE_NAME = "__Host-at";
export const REFRESH_COOKIE_NAME = "__Secure-rt";

/**
 * Get cookie names based on COOKIE_SECURE setting.
 * __Host- and __Secure- prefixes require Secure=true (HTTPS).
 * In development without HTTPS, use non-prefixed names.
 */
export function getCookieNames(): { access: string; refresh: string } {
  const env = getEnv();
  return env.COOKIE_SECURE
    ? { access: '__Host-at', refresh: '__Secure-rt' }
    : { access: 'at', refresh: 'rt' };
}

// ─── Rate Limiting ──────────────────────────────────────────────
export interface RateLimitConfig {
      readonly window: number; // milliseconds
      readonly max: number;
}

export const RATE_LIMITS = {
      login: { window: 60_000, max: 10 } as RateLimitConfig,
      register: { window: 60_000, max: 5 } as RateLimitConfig,
      refresh: { window: 60_000, max: 30 } as RateLimitConfig,
      mfaSetup: { window: 60_000, max: 5 } as RateLimitConfig,
      general: { window: 60_000, max: 60 } as RateLimitConfig,
      mfaAttempt: { window: 60_000, max: 5 } as RateLimitConfig,
      passwordReset: { window: 60_000, max: 3 } as RateLimitConfig,
      loginPerAccount: { window: 60_000, max: 5 } as RateLimitConfig,
      emailVerification: { window: 60_000, max: 5 } as RateLimitConfig,
} as const;

// ─── Lockout ────────────────────────────────────────────────────
export const LOCKOUT_THRESHOLDS = [
      { attempts: 3, delaySec: 0 },
      { attempts: 5, delaySec: 30 },
      { attempts: 8, delaySec: 300 },
      { attempts: 10, delaySec: 900 },
] as const;

export const ACCOUNT_LOCK_THRESHOLD = 10;

// ─── Session Limits ─────────────────────────────────────────────
export const MAX_SESSIONS_PER_USER = 10;
export const SESSION_IDLE_TIMEOUT_SEC = 86_400; // 24 hours of inactivity

// ─── Password Policy ────────────────────────────────────────────
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// ─── MFA ────────────────────────────────────────────────────────
export const MFA_RECOVERY_CODE_COUNT = 10;
export const MFA_TOTP_WINDOW = 1; // ±1 period (±30 seconds)

// ─── Misc ───────────────────────────────────────────────────────
export const REQUEST_BODY_MAX_SIZE = 1024 * 64; // 64 KB
export const PERMISSION_CACHE_TTL_SEC = 300; // 5 minutes
