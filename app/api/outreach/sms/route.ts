import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// GET /api/outreach/sms — List SMS conversations
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') || undefined
  const search = url.searchParams.get('search') || undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const where: Record<string, unknown> = { profileId: profile.id }
  if (statusFilter) where.status = statusFilter
  if (search) {
    where.OR = [
      { phone: { contains: search } },
      { lastMessageBody: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [conversations, total] = await Promise.all([
    prisma.sMSConversation.findMany({
      where: where as any,
      include: {
        buyer: {
          select: {
            id: true, firstName: true, lastName: true, entityName: true,
            phone: true, status: true, buyerScore: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.sMSConversation.count({ where: where as any }),
  ])

  const totalUnread = await prisma.sMSConversation.aggregate({
    where: { profileId: profile.id, unreadCount: { gt: 0 } },
    _sum: { unreadCount: true },
  })

  return successResponse({
    conversations,
    total,
    totalUnread: totalUnread._sum.unreadCount || 0,
    limit,
    offset,
  })
}
