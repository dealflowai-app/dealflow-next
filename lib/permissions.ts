// ─── Role-based permissions for team members ────────────────────────────────

export const ROLES = ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as const
export type TeamRole = (typeof ROLES)[number]

export const PERMISSIONS: Record<TeamRole, string[]> = {
  ADMIN: ['*'],
  MANAGER: [
    'deals:read',
    'deals:write',
    'buyers:read',
    'buyers:write',
    'campaigns:read',
    'campaigns:write',
    'contracts:read',
    'team:read',
    'analytics:read',
  ],
  MEMBER: [
    'deals:read',
    'deals:write',
    'buyers:read',
    'buyers:write',
    'campaigns:read',
    'analytics:read',
  ],
  VIEWER: [
    'deals:read',
    'buyers:read',
    'analytics:read',
  ],
}

/**
 * Check whether a role grants a specific permission.
 * ADMIN has wildcard ('*') access to everything.
 */
export function hasPermission(role: string, permission: string): boolean {
  const perms = PERMISSIONS[role as TeamRole]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.includes(permission)
}

/**
 * Return the full list of permissions for a role.
 * Returns an empty array for unknown roles.
 */
export function getPermissions(role: string): string[] {
  return PERMISSIONS[role as TeamRole] ?? []
}

/**
 * Role display configuration for UI badges.
 */
export const ROLE_BADGE_STYLES: Record<TeamRole, { bg: string; text: string }> = {
  ADMIN:   { bg: 'bg-purple-100', text: 'text-purple-700' },
  MANAGER: { bg: 'bg-blue-100',   text: 'text-blue-700' },
  MEMBER:  { bg: 'bg-gray-100',   text: 'text-gray-700' },
  VIEWER:  { bg: 'bg-gray-50',    text: 'text-gray-500' },
}
