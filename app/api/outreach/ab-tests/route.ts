import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { compareFromCampaignStats } from '@/lib/outreach/ab-stats'

const TEST_VARIABLES = ['script', 'time', 'channel', 'voicemail']

// GET /api/outreach/ab-tests — List A/B tests
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') || undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const where: Record<string, unknown> = { profileId: profile.id }
  if (statusFilter) where.status = statusFilter

  const [tests, total] = await Promise.all([
    prisma.aBTest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.aBTest.count({ where }),
  ])

  // Enrich each test with campaign names and live stats
  const enriched = await Promise.all(
    tests.map(async (test) => {
      const [campA, campB] = await Promise.all([
        prisma.campaign.findUnique({
          where: { id: test.campaignIdA },
          select: { id: true, name: true, callsCompleted: true, qualified: true, notBuying: true, status: true },
        }),
        prisma.campaign.findUnique({
          where: { id: test.campaignIdB },
          select: { id: true, name: true, callsCompleted: true, qualified: true, notBuying: true, status: true },
        }),
      ])

      // Run live significance test
      const stats = campA && campB
        ? compareFromCampaignStats(
            { qualified: campA.qualified, callsCompleted: campA.callsCompleted },
            { qualified: campB.qualified, callsCompleted: campB.callsCompleted },
          )
        : null

      return {
        ...test,
        campaignA: campA ? { id: campA.id, name: campA.name, status: campA.status, callsCompleted: campA.callsCompleted, qualified: campA.qualified } : null,
        campaignB: campB ? { id: campB.id, name: campB.name, status: campB.status, callsCompleted: campB.callsCompleted, qualified: campB.qualified } : null,
        liveStats: stats,
      }
    }),
  )

  return successResponse({ tests: enriched, total, limit, offset })
}

// POST /api/outreach/ab-tests — Create a new A/B test
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
    .require('name', body.name, 'Test name')
    .string('name', body.name, { maxLength: 200, label: 'Test name' })
    .require('campaignIdA', body.campaignIdA, 'Campaign A')
    .require('campaignIdB', body.campaignIdB, 'Campaign B')
    .require('testVariable', body.testVariable, 'Test variable')
    .enumValue('testVariable', body.testVariable, TEST_VARIABLES, 'Test variable')
    .require('variantALabel', body.variantALabel, 'Variant A label')
    .string('variantALabel', body.variantALabel, { maxLength: 100, label: 'Variant A label' })
    .require('variantBLabel', body.variantBLabel, 'Variant B label')
    .string('variantBLabel', body.variantBLabel, { maxLength: 100, label: 'Variant B label' })

  if (!v.isValid()) return v.toResponse()

  if (body.campaignIdA === body.campaignIdB) {
    return errorResponse(400, 'Campaign A and Campaign B must be different campaigns')
  }

  // Verify both campaigns belong to this user
  const [campA, campB] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: body.campaignIdA as string } }),
    prisma.campaign.findUnique({ where: { id: body.campaignIdB as string } }),
  ])

  if (!campA || campA.profileId !== profile.id) {
    return errorResponse(404, 'Campaign A not found')
  }
  if (!campB || campB.profileId !== profile.id) {
    return errorResponse(404, 'Campaign B not found')
  }

  const test = await prisma.aBTest.create({
    data: {
      profileId: profile.id,
      name: (body.name as string).trim(),
      campaignIdA: body.campaignIdA as string,
      campaignIdB: body.campaignIdB as string,
      testVariable: body.testVariable as string,
      variantALabel: (body.variantALabel as string).trim(),
      variantBLabel: (body.variantBLabel as string).trim(),
    },
  })

  return successResponse({ test }, 201)
}
