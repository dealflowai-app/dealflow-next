import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// GET /api/outreach/campaigns/[id]/calls — Paginated call log for a campaign
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  // Verify campaign ownership
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { profileId: true },
  })
  if (!campaign || campaign.profileId !== profile.id) {
    return errorResponse(404, 'Campaign not found')
  }

  const url = new URL(req.url)
  const outcome = url.searchParams.get('outcome') || undefined
  const sort = url.searchParams.get('sort') || 'newest'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const where: any = { campaignId: id }
  if (outcome) {
    where.outcome = outcome
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
        phoneNumber: true,
        outcome: true,
        durationSecs: true,
        recordingUrl: true,
        transcript: true,
        aiSummary: true,
        extractedData: true,
        attemptNumber: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
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
  }))

  return successResponse({ calls: enriched, total, limit, offset })
}
