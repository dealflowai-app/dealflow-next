import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// GET /api/outreach/inbound — List inbound calls
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const filterStatus = url.searchParams.get('status') || undefined
  const identified = url.searchParams.get('identified')
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const where: Record<string, unknown> = { profileId: profile.id }

  if (filterStatus) where.status = filterStatus
  if (identified === 'true') where.identified = true
  if (identified === 'false') where.identified = false
  if (dateFrom) where.createdAt = { ...(where.createdAt as any || {}), gte: new Date(dateFrom) }
  if (dateTo) where.createdAt = { ...(where.createdAt as any || {}), lte: new Date(dateTo) }

  const [calls, total] = await Promise.all([
    prisma.inboundCall.findMany({
      where,
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entityName: true,
            phone: true,
            buyerScore: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.inboundCall.count({ where }),
  ])

  // Count missed calls (for badge)
  const missedCount = await prisma.inboundCall.count({
    where: { profileId: profile.id, status: 'missed', routedTo: 'missed' },
  })

  return successResponse({ calls, total, missedCount, limit, offset })
}
