import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

// ─── POST /api/feed/groups/[id]/join — toggle join/leave ────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id: groupId } = await params

  const group = await prisma.communityGroup.findUnique({ where: { id: groupId }, select: { id: true, name: true, createdById: true } })
  if (!group) return errorResponse(404, 'Group not found')

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_profileId: { groupId, profileId: profile.id } },
  })

  if (existing) {
    await prisma.groupMember.delete({ where: { id: existing.id } })
    const count = await prisma.groupMember.count({ where: { groupId } })
    return successResponse({ joined: false, memberCount: count })
  } else {
    await prisma.groupMember.create({ data: { groupId, profileId: profile.id } })
    const count = await prisma.groupMember.count({ where: { groupId } })

    // Notify group creator (don't notify yourself)
    if (group.createdById !== profile.id) {
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Someone'
      createNotification(
        group.createdById,
        'group_join',
        `${name} joined ${group.name}`,
        'Your group is growing!',
        { groupId },
      )
    }

    return successResponse({ joined: true, memberCount: count })
  }
}
