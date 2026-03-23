import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// ─── GET /api/feed/groups — list groups ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const searchParams = req.nextUrl.searchParams
  const search = searchParams.get('q')?.trim()

  try {
    const groups = await prisma.communityGroup.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { profileId: profile.id },
          select: { id: true },
          take: 1,
        },
      },
    })

    return successResponse({
      groups: groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: g._count.members,
        joined: g.members.length > 0,
        isOwn: g.createdById === profile.id,
        createdAt: g.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('Groups fetch error:', err)
    return errorResponse(500, 'Failed to load groups')
  }
}

// ─── POST /api/feed/groups — create a group ─────────────────────────────────

export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  let body: { name?: string; description?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const name = body.name?.trim()
  const description = body.description?.trim()
  if (!name) return errorResponse(400, 'Group name is required')
  if (name.length > 100) return errorResponse(400, 'Group name must be under 100 characters')
  if (!description) return errorResponse(400, 'Group description is required')
  if (description.length > 500) return errorResponse(400, 'Description must be under 500 characters')

  try {
    const group = await prisma.communityGroup.create({
      data: {
        name,
        description,
        createdById: profile.id,
        members: { create: { profileId: profile.id } }, // auto-join creator
      },
      include: { _count: { select: { members: true } } },
    })

    return successResponse({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        memberCount: group._count.members,
        joined: true,
        isOwn: true,
        createdAt: group.createdAt.toISOString(),
      },
    }, 201)
  } catch (err) {
    console.error('Group create error:', err)
    return errorResponse(500, 'Failed to create group')
  }
}
