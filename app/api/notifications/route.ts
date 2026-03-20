import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// ─── GET /api/notifications — list notifications (paginated) ────────────────

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const searchParams = req.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const unreadOnly = searchParams.get('unread') === 'true'

  const where = {
    profileId: profile.id,
    ...(unreadOnly ? { read: false } : {}),
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { profileId: profile.id, read: false },
    }),
  ])

  return successResponse({
    notifications,
    total,
    unreadCount,
    hasMore: offset + limit < total,
  })
}

// ─── POST /api/notifications/mark-all-read ──────────────────────────────────

export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  // Check if this is a mark-all-read request via query param
  if (url.searchParams.get('action') === 'mark-all-read') {
    await prisma.notification.updateMany({
      where: { profileId: profile.id, read: false },
      data: { read: true },
    })
    return successResponse({ success: true })
  }

  return errorResponse(400, 'Unknown action')
}
