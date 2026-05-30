export { roles } from './roles.js'
export { users } from './users.js'
export { sessions } from './sessions.js'
export { auditLogs } from './audit-logs.js'
export { mfaSecrets } from './mfa-secrets.js'
export { permissions } from './permissions.js'
export { refreshTokens } from './refresh-tokens.js'
export { passwordResets } from './password-resets.js'
export { rolePermissions } from './role-permissions.js'
export { emailVerifications } from './email-verifications.js'
export { failedLoginAttempts } from './failed-login-attempts.js'

// ─── Inferred Types ─────────────────────────────────────────────
import type { users } from './users.js'
import type { roles } from './roles.js'
import type { sessions } from './sessions.js'
import type { auditLogs } from './audit-logs.js'
import type { mfaSecrets } from './mfa-secrets.js'
import type { permissions } from './permissions.js'
import type { refreshTokens } from './refresh-tokens.js'
import type { passwordResets } from './password-resets.js'
import type { rolePermissions } from './role-permissions.js'
import type { emailVerifications } from './email-verifications.js'
import type { failedLoginAttempts } from './failed-login-attempts.js'

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
