import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { compareFromCampaignStats } from '@/lib/outreach/ab-stats'

type Params = { params: Promise<{ id: string }> }

async function getTestWithAuth(testId: string, profileId: string) {
  const test = await prisma.aBTest.findUnique({ where: { id: testId } })
  if (!test) return { test: null, error: 'A/B test not found', status: 404 }
  if (test.profileId !== profileId) return { test: null, error: 'A/B test not found', status: 404 }
  return { test, error: null, status: 200 }
}

// GET /api/outreach/ab-tests/[id] — Full A/B test detail with live stats
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { test, error: testError, status: testStatus } = await getTestWithAuth(id, profile.id)
  if (!test) return errorResponse(testStatus, testError!)

  // Fetch both campaigns with their call stats
  const [campA, campB] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: test.campaignIdA },
      select: {
        id: true, name: true, status: true, channel: true, mode: true, market: true,
        scriptTemplate: true, customScript: true, companyName: true, agentName: true,
        totalBuyers: true, callsCompleted: true, qualified: true, notBuying: true,
        noAnswer: true, totalTalkTime: true, estimatedCost: true, actualCost: true,
        startedAt: true, completedAt: true, createdAt: true,
      },
    }),
    prisma.campaign.findUnique({
      where: { id: test.campaignIdB },
      select: {
        id: true, name: true, status: true, channel: true, mode: true, market: true,
        scriptTemplate: true, customScript: true, companyName: true, agentName: true,
        totalBuyers: true, callsCompleted: true, qualified: true, notBuying: true,
        noAnswer: true, totalTalkTime: true, estimatedCost: true, actualCost: true,
        startedAt: true, completedAt: true, createdAt: true,
      },
    }),
  ])

  if (!campA || !campB) {
    return errorResponse(404, 'One or both campaigns no longer exist')
  }

  // Run significance test
  const stats = compareFromCampaignStats(
    { qualified: campA.qualified, callsCompleted: campA.callsCompleted },
    { qualified: campB.qualified, callsCompleted: campB.callsCompleted },
  )

  // Compute per-campaign derived stats
  const deriveStats = (c: typeof campA) => {
    const connected = c.qualified + c.notBuying
    return {
      connectionRate: c.callsCompleted > 0 ? Math.round((connected / c.callsCompleted) * 100) : 0,
      qualificationRate: connected > 0 ? Math.round((c.qualified / connected) * 100) : 0,
      avgTalkTime: c.callsCompleted > 0 ? Math.round((c.totalTalkTime || 0) / c.callsCompleted) : 0,
      costPerQualified: c.qualified > 0
        ? Math.round(((c.actualCost || c.estimatedCost || 0) / c.qualified) * 100) / 100
        : 0,
    }
  }

  // Fetch outcome distributions for both
  const [callsA, callsB] = await Promise.all([
    prisma.campaignCall.findMany({
      where: { campaignId: test.campaignIdA, outcome: { not: null } },
      select: { outcome: true },
    }),
    prisma.campaignCall.findMany({
      where: { campaignId: test.campaignIdB, outcome: { not: null } },
      select: { outcome: true },
    }),
  ])

  const buildOutcomeDist = (calls: { outcome: string | null }[]) => {
    const dist: Record<string, number> = {}
    for (const c of calls) {
      const key = c.outcome || 'PENDING'
      dist[key] = (dist[key] || 0) + 1
    }
    return dist
  }

  return successResponse({
    test,
    campaignA: { ...campA, ...deriveStats(campA), outcomeDistribution: buildOutcomeDist(callsA) },
    campaignB: { ...campB, ...deriveStats(campB), outcomeDistribution: buildOutcomeDist(callsB) },
    significance: stats,
  })
}

// PATCH /api/outreach/ab-tests/[id] — Update test (declare winner, cancel)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { test, error: testError, status: testStatus } = await getTestWithAuth(id, profile.id)
  if (!test) return errorResponse(testStatus, testError!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const updateData: Record<string, unknown> = {}

  // Status update (RUNNING → COMPLETED or CANCELLED)
  if (body.status !== undefined) {
    const validStatuses = ['COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(body.status as string)) {
      return errorResponse(400, `Status must be one of: ${validStatuses.join(', ')}`)
    }
    if (test.status !== 'RUNNING') {
      return errorResponse(400, `Test is already ${test.status}`)
    }
    updateData.status = body.status
  }

  // Declare winner
  if (body.winnerId !== undefined) {
    if (body.winnerId !== test.campaignIdA && body.winnerId !== test.campaignIdB && body.winnerId !== null) {
      return errorResponse(400, 'winnerId must be one of the test campaign IDs or null')
    }
    updateData.winnerId = body.winnerId
    updateData.winnerDeclaredAt = body.winnerId ? new Date() : null
    updateData.status = 'COMPLETED'
  }

  // Confidence level override
  if (body.confidenceLevel !== undefined) {
    if (typeof body.confidenceLevel !== 'number' || body.confidenceLevel < 0 || body.confidenceLevel > 100) {
      return errorResponse(400, 'confidenceLevel must be a number between 0 and 100')
    }
    updateData.confidenceLevel = body.confidenceLevel
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse(400, 'No valid fields to update')
  }

  const updated = await prisma.aBTest.update({
    where: { id },
    data: updateData,
  })

  return successResponse({ test: updated })
}

// DELETE /api/outreach/ab-tests/[id] — Delete a test
export async function DELETE(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { test, error: testError, status: testStatus } = await getTestWithAuth(id, profile.id)
  if (!test) return errorResponse(testStatus, testError!)

  await prisma.aBTest.delete({ where: { id } })

  return successResponse({ success: true })
}
