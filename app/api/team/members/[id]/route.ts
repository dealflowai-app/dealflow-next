import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { ROLES, type TeamRole } from '@/lib/permissions'
import { logger } from '@/lib/logger'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * PATCH /api/team/members/[id]
 * Update a team member's role.
 * Body: { role: string }
 * Requires ADMIN role.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: memberId } = await context.params
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { team: true },
    })
    if (!member) return errorResponse(404, 'Team member not found')

    // Verify caller is ADMIN or team owner
    const isOwner = member.team.ownerId === profile.id
    const callerMembership = await prisma.teamMember.findUnique({
      where: { teamId_profileId: { teamId: member.teamId, profileId: profile.id } },
    })
    if (!isOwner && callerMembership?.role !== 'ADMIN') {
      return errorResponse(403, 'Only admins can update member roles')
    }

    // Cannot change the owner's role
    if (member.profileId === member.team.ownerId) {
      return errorResponse(400, 'Cannot change the team owner\'s role')
    }

    const { body, error: parseError } = await parseBody(req)
    if (!body) return errorResponse(400, parseError!)

    const { role } = body as { role?: string }
    if (!role || !ROLES.includes(role as TeamRole)) {
      return errorResponse(400, `Invalid role. Must be one of: ${ROLES.join(', ')}`)
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        profile: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    return successResponse({ member: updated })
  } catch (err) {
    logger.error('PATCH /api/team/members/[id] error', { route: '/api/team/members/[id]', error: err instanceof Error ? err.message : String(err) })
    return errorResponse(500, 'Failed to update member')
  }
}

/**
 * DELETE /api/team/members/[id]
 * Remove a member from the team.
 * Requires ADMIN role. Cannot remove the team owner.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id: memberId } = await context.params
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { team: true },
    })
    if (!member) return errorResponse(404, 'Team member not found')

    // Verify caller is ADMIN or team owner
    const isOwner = member.team.ownerId === profile.id
    const callerMembership = await prisma.teamMember.findUnique({
      where: { teamId_profileId: { teamId: member.teamId, profileId: profile.id } },
    })
    if (!isOwner && callerMembership?.role !== 'ADMIN') {
      return errorResponse(403, 'Only admins can remove members')
    }

    // Cannot remove the owner
    if (member.profileId === member.team.ownerId) {
      return errorResponse(400, 'Cannot remove the team owner')
    }

    await prisma.teamMember.delete({ where: { id: memberId } })

    return successResponse({ removed: true })
  } catch (err) {
    logger.error('DELETE /api/team/members/[id] error', { route: '/api/team/members/[id]', error: err instanceof Error ? err.message : String(err) })
    return errorResponse(500, 'Failed to remove member')
  }
}
