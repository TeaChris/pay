export {
  roles,
  users,
  sessions,
  auditLogs,
  mfaSecrets,
  permissions,
  refreshTokens,
  passwordResets,
  rolePermissions,
  emailVerifications,
  failedLoginAttempts,
} from './tables.js'

// ─── Inferred Types ─────────────────────────────────────────────
import type {
  roles,
  users,
  sessions,
  auditLogs,
  mfaSecrets,
  permissions,
  refreshTokens,
  passwordResets,
  rolePermissions,
  emailVerifications,
  failedLoginAttempts,
} from './tables.js'

export type User = typeof users.$inferSelect
export type Role = typeof roles.$inferSelect
export type NewUser = typeof users.$inferInsert
export type NewRole = typeof roles.$inferInsert
export type Session = typeof sessions.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type MfaSecret = typeof mfaSecrets.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
export type Permission = typeof permissions.$inferSelect
export type NewMfaSecret = typeof mfaSecrets.$inferInsert
export type NewPermission = typeof permissions.$inferInsert
export type RefreshToken = typeof refreshTokens.$inferSelect
export type PasswordReset = typeof passwordResets.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert
export type RolePermission = typeof rolePermissions.$inferSelect
export type NewPasswordReset = typeof passwordResets.$inferInsert
export type EmailVerification = typeof emailVerifications.$inferSelect
export type FailedLoginAttempt = typeof failedLoginAttempts.$inferSelect
export type NewEmailVerification = typeof emailVerifications.$inferInsert
