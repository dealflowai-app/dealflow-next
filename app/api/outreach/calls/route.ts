import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// GET /api/outreach/calls — Global call log across all campaigns
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const outcome = url.searchParams.get('outcome') || undefined
  const campaignId = url.searchParams.get('campaignId') || undefined
  const dateFrom = url.searchParams.get('dateFrom') || undefined
  const dateTo = url.searchParams.get('dateTo') || undefined
  const search = url.searchParams.get('search') || undefined
  const sort = url.searchParams.get('sort') || 'newest'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  // Build where clause — scope to user's campaigns
  const where: any = {
    campaign: { profileId: profile.id },
  }

  if (outcome) where.outcome = outcome
  if (campaignId) where.campaignId = campaignId

  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo)
  }

  // Search by buyer name — filter on the related buyer fields
  if (search) {
    where.buyer = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { entityName: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  const orderBy: any =
    sort === 'oldest' ? { createdAt: 'asc' } :
    sort === 'duration' ? { durationSecs: 'desc' } :
    { createdAt: 'desc' }

  const [calls, total] = await Promise.all([
    prisma.campaignCall.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        campaignId: true,
        channel: true,
        isManual: true,
        phoneNumber: true,
        outcome: true,
        durationSecs: true,
        recordingUrl: true,
        aiSummary: true,
        attemptNumber: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        campaign: {
          select: {
            id: true,
            name: true,
            market: true,
          },
        },
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entityName: true,
            phone: true,
            status: true,
            buyerScore: true,
          },
        },
      },
    }),
    prisma.campaignCall.count({ where }),
  ])

  const enriched = calls.map(c => ({
    ...c,
    buyerName: c.buyer.entityName
      || [c.buyer.firstName, c.buyer.lastName].filter(Boolean).join(' ')
      || 'Unknown',
    campaignName: c.campaign?.name ?? '',
  }))

  return successResponse({ calls: enriched, total, limit, offset })
}
