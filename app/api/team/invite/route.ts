import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { hasPermission, ROLES, type TeamRole } from '@/lib/permissions'
import { logger } from '@/lib/logger'

/**
 * POST /api/team/invite
 * Invite a member to the team by email.
 * Body: { email: string, role?: string }
 * Requires ADMIN role.
 */
export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    // Find the team the user owns
    const team = await prisma.team.findFirst({ where: { ownerId: profile.id } })
    if (!team) {
      // Check if user is an ADMIN member
      const membership = await prisma.teamMember.findFirst({
        where: { profileId: profile.id },
        include: { team: true },
      })
      if (!membership || !hasPermission(membership.role, 'team:read')) {
        return errorResponse(403, 'Only team admins can invite members')
      }
    }

    const teamId = team?.id ?? (
      await prisma.teamMember.findFirst({
        where: { profileId: profile.id },
      })
    )?.teamId

    if (!teamId) return errorResponse(404, 'No team found')

    // Verify caller is ADMIN
    const callerMembership = await prisma.teamMember.findUnique({
      where: { teamId_profileId: { teamId, profileId: profile.id } },
    })
    const callerIsOwner = team?.ownerId === profile.id
    if (!callerIsOwner && callerMembership?.role !== 'ADMIN') {
      return errorResponse(403, 'Only admins can invite members')
    }

    const { body, error: parseError } = await parseBody(req)
    if (!body) return errorResponse(400, parseError!)

    const { email, role = 'MEMBER' } = body as { email?: string; role?: string }

    if (!email || typeof email !== 'string') {
      return errorResponse(400, 'Email is required')
    }

    if (!ROLES.includes(role as TeamRole)) {
      return errorResponse(400, `Invalid role. Must be one of: ${ROLES.join(', ')}`)
    }

    // Find the profile by email
    const invitee = await prisma.profile.findFirst({ where: { email: email.toLowerCase().trim() } })
    if (!invitee) {
      return errorResponse(404, 'No user found with that email address. They must sign up first.')
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_profileId: { teamId, profileId: invitee.id } },
    })
    if (existingMember) {
      return errorResponse(409, 'This user is already a team member')
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        profileId: invitee.id,
        role,
      },
      include: {
        profile: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    return successResponse({ member }, 201)
  } catch (err) {
    logger.error('POST /api/team/invite error', { route: '/api/team/invite', error: err instanceof Error ? err.message : String(err) })
    return errorResponse(500, 'Failed to invite member')
  }
}
