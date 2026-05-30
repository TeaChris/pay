export const DEFAULT_ROLES = ['user', 'admin', 'support', 'compliance'] as const;

export const DEFAULT_PERMISSIONS = [
  { name: 'users:read:self', resource: 'users', action: 'read:self', description: 'Read own user profile' },
  { name: 'users:read:any', resource: 'users', action: 'read:any', description: 'Read any user profile' },
  { name: 'users:read:all', resource: 'users', action: 'read:all', description: 'List all users' },
  { name: 'users:update:self', resource: 'users', action: 'update:self', description: 'Update own profile' },
  { name: 'users:delete:any', resource: 'users', action: 'delete:any', description: 'Delete any user' },
  { name: 'sessions:read:self', resource: 'sessions', action: 'read:self', description: 'Read own sessions' },
  { name: 'sessions:delete:self', resource: 'sessions', action: 'delete:self', description: 'Revoke own sessions' },
  { name: 'sessions:read:any', resource: 'sessions', action: 'read:any', description: 'Read any sessions' },
  { name: 'mfa:manage:self', resource: 'mfa', action: 'manage:self', description: 'Manage own MFA settings' },
  { name: 'audit:read', resource: 'audit', action: 'read', description: 'Read audit logs' },
  { name: 'audit:read:all', resource: 'audit', action: 'read:all', description: 'Read all audit logs' },
  { name: 'rbac:manage', resource: 'rbac', action: 'manage', description: 'Manage roles and permissions' },
] as const;

export const ROLE_PERMISSION_MAP: Record<string, readonly string[]> = {
  user: [
    'users:read:self',
    'users:update:self',
    'sessions:read:self',
    'sessions:delete:self',
    'mfa:manage:self',
  ],
  support: [
    'users:read:self',
    'users:update:self',
    'sessions:read:self',
    'sessions:delete:self',
    'mfa:manage:self',
    'users:read:any',
    'sessions:read:any',
    'audit:read',
  ],
  compliance: [
    'users:read:self',
    'users:update:self',
    'sessions:read:self',
    'sessions:delete:self',
    'mfa:manage:self',
    'users:read:any',
    'sessions:read:any',
    'audit:read',
    'audit:read:all',
    'users:read:all',
  ],
  admin: DEFAULT_PERMISSIONS.map((p) => p.name),
};
