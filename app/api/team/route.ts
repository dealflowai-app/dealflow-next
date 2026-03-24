import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

/**
 * GET /api/team
 * Returns the current user's team, members, and current user's role.
 */
export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    // Find a team the user owns or belongs to
    let team = await prisma.team.findFirst({
      where: { ownerId: profile.id },
      include: {
        members: {
          include: {
            profile: {
              select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    if (!team) {
      // Check if user is a member of any team
      const membership = await prisma.teamMember.findFirst({
        where: { profileId: profile.id },
        include: {
          team: {
            include: {
              members: {
                include: {
                  profile: {
                    select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
                  },
                },
                orderBy: { joinedAt: 'asc' },
              },
              owner: {
                select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
        },
      })
      if (membership) team = membership.team
    }

    if (!team) {
      return successResponse({ team: null, currentUserRole: 'ADMIN', isOwner: true })
    }

    const isOwner = team.ownerId === profile.id
    const currentMembership = team.members.find(m => m.profileId === profile.id)
    const currentUserRole = isOwner ? 'ADMIN' : (currentMembership?.role ?? 'MEMBER')

    return successResponse({ team, currentUserRole, isOwner })
  } catch (err) {
    logger.error('GET /api/team error', { route: '/api/team', error: err instanceof Error ? err.message : String(err) })
    return errorResponse(500, 'Failed to fetch team')
  }
}

/**
 * POST /api/team
 * Create a new team. The current user becomes the owner.
 * Body: { name: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const { body, error: parseError } = await parseBody(req)
    if (!body) return errorResponse(400, parseError!)

    const { name } = body as { name?: string }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse(400, 'Team name is required')
    }

    // Check if user already owns a team
    const existing = await prisma.team.findFirst({ where: { ownerId: profile.id } })
    if (existing) {
      return errorResponse(409, 'You already own a team')
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        ownerId: profile.id,
        members: {
          create: {
            profileId: profile.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: {
            profile: {
              select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    })

    return successResponse({ team }, 201)
  } catch (err) {
    logger.error('POST /api/team error', { route: '/api/team', error: err instanceof Error ? err.message : String(err) })
    return errorResponse(500, 'Failed to create team')
  }
}
