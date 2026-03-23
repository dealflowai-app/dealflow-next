import { NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permissions'

type Profile = Awaited<ReturnType<typeof getAuthProfile>>['profile']

type PermissionSuccess = { profile: NonNullable<Profile>; teamRole: string; error?: never }
type PermissionError   = { profile?: never; teamRole?: never; error: NextResponse }

/**
 * Middleware helper that:
 * 1. Authenticates the user (via existing getAuthProfile)
 * 2. Looks up their team membership
 * 3. Checks if their team role grants the required permission
 *
 * Team owners are always treated as ADMIN.
 * Users with no team are treated as ADMIN of their own data (solo user).
 */
export async function requirePermission(
  permission: string,
): Promise<PermissionSuccess | PermissionError> {
  const { profile, error, status } = await getAuthProfile()

  if (!profile) {
    return {
      error: NextResponse.json({ error: error ?? 'Unauthorized' }, { status: status ?? 401 }),
    }
  }

  // Find the user's team membership (first team they belong to)
  const membership = await prisma.teamMember.findFirst({
    where: { profileId: profile.id },
    include: { team: true },
  })

  // If the user owns a team, they're always ADMIN
  const ownedTeam = await prisma.team.findFirst({
    where: { ownerId: profile.id },
  })

  let teamRole = 'ADMIN' // default for solo users / owners

  if (membership) {
    // Check if they own this team
    if (ownedTeam && ownedTeam.id === membership.teamId) {
      teamRole = 'ADMIN'
    } else {
      teamRole = membership.role
    }
  }

  if (!hasPermission(teamRole, permission)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden', message: `Missing permission: ${permission}` },
        { status: 403 },
      ),
    }
  }

  return { profile, teamRole }
}
