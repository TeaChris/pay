import type { Context } from "hono";

// ─── Hono Environment Type ─────────────────────────────────────
// Extends the Hono context with typed variables available via c.get()

export interface AppVariables {
      correlationId: string;
      sessionId: string;
      requestId: string;
      clientIp: string;
      userRole: string;
      userId: string;
}

export interface AppEnv {
      Variables: AppVariables;
}

export type AppContext = Context<AppEnv>;

// ─── JWT Claims ─────────────────────────────────────────────────

export interface AccessTokenPayload {
      sub: string;
      sid: string;
      role: string;
      jti: string;
      iss: string;
      aud: string;
      iat: number;
      exp: number;
}

export interface MfaChallengePayload {
      sub: string;
      purpose: "mfa_challenge";
      jti: string;
      iss: string;
      iat: number;
      exp: number;
}

// ─── Audit ──────────────────────────────────────────────────────

export type AuditAction =
      | "auth.register"
      | "auth.login.success"
      | "auth.login.failed"
      | "auth.logout"
      | "auth.refresh"
      | "auth.email_verification.requested"
      | "auth.email_verification.completed"
      | "auth.password_reset.requested"
      | "auth.password_reset.completed"
      | "auth.password.changed"
      | "auth.mfa.setup_initiated"
      | "auth.mfa.enabled"
      | "auth.mfa.disabled"
      | "auth.mfa.verified"
      | "auth.mfa.failed"
      | "auth.mfa.recovery_used"
      | "auth.session.revoked"
      | "auth.session.revoked_all"
      | "auth.refresh_replay_detected"
      | "auth.account.locked"
      | "auth.account.unlocked"
      | "rbac.role.changed"
      | "rbac.permission.changed";

export type AuditSeverity = "info" | "warn" | "critical";

// ─── Session / Device ───────────────────────────────────────────

export interface DeviceInfo {
      deviceName: string | null;
      deviceType: string | null;
      userAgent: string | null;
}

export interface SessionInfo {
      id: string;
      deviceName: string | null;
      deviceType: string | null;
      ipAddress: string | null;
      userAgent: string | null;
      lastActiveAt: Date;
      createdAt: Date;
      current: boolean;
}

// ─── API Response Envelope ──────────────────────────────────────

export interface ApiSuccessResponse<T> {
      success: true;
      data: T;
}

export interface ApiErrorResponse {
      success: false;
      error: {
            code: string;
            message: string;
      };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── User Profile ───────────────────────────────────────────────

export interface UserProfile {
      displayName: string | null;
      emailVerified: boolean;
      mfaEnabled: boolean;
      createdAt: Date;
      email: string;
      role: string;
      id: string;
}
