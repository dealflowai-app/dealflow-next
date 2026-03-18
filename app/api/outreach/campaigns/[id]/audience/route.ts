import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { buildAudience, validateBuyerIds } from '@/lib/outreach/audience-builder'
import type { ComplianceChannel } from '@/lib/outreach'

type Params = { params: Promise<{ id: string }> }

async function getCampaignWithAuth(campaignId: string, profileId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return { campaign: null, error: 'Campaign not found', status: 404 }
  if (campaign.profileId !== profileId) return { campaign: null, error: 'Campaign not found', status: 404 }
  return { campaign, error: null, status: 200 }
}

// GET /api/outreach/campaigns/[id]/audience — List buyers in campaign
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { campaign, error: campError, status: campStatus } = await getCampaignWithAuth(id, profile.id)
  if (!campaign) return errorResponse(campStatus, campError!)

  const calls = await prisma.campaignCall.findMany({
    where: { campaignId: id },
    select: {
      id: true,
      buyerId: true,
      phoneNumber: true,
      outcome: true,
      durationSecs: true,
      aiSummary: true,
      attemptNumber: true,
      createdAt: true,
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          entityName: true,
          phone: true,
          email: true,
          status: true,
          buyerScore: true,
          state: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Compute summary stats
  const total = calls.length
  const completed = calls.filter(c => c.outcome !== null).length
  const qualified = calls.filter(c => c.outcome === 'QUALIFIED').length
  const noAnswer = calls.filter(c => c.outcome === 'NO_ANSWER' || c.outcome === 'VOICEMAIL').length
  const pending = calls.filter(c => c.outcome === null).length
  const doNotCall = calls.filter(c => c.outcome === 'DO_NOT_CALL').length

  const audience = calls.map(c => ({
    callId: c.id,
    buyerId: c.buyerId,
    name: c.buyer.entityName || [c.buyer.firstName, c.buyer.lastName].filter(Boolean).join(' ') || 'Unknown',
    phone: c.buyer.phone,
    email: c.buyer.email,
    state: c.buyer.state,
    buyerStatus: c.buyer.status,
    buyerScore: c.buyer.buyerScore,
    callOutcome: c.outcome,
    callDuration: c.durationSecs,
    callSummary: c.aiSummary,
    attemptNumber: c.attemptNumber,
  }))

  return successResponse({
    audience,
    stats: { total, completed, qualified, noAnswer, pending, doNotCall },
  })
}

// POST /api/outreach/campaigns/[id]/audience — Add buyers to campaign
export async function POST(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { campaign, error: campError, status: campStatus } = await getCampaignWithAuth(id, profile.id)
  if (!campaign) return errorResponse(campStatus, campError!)

  if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
    return errorResponse(400, 'Can only add buyers to DRAFT or PAUSED campaigns')
  }

  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  const channel: ComplianceChannel = 'voice' // Campaigns are voice-first

  // Get existing buyer IDs in this campaign to avoid duplicates
  const existingCalls = await prisma.campaignCall.findMany({
    where: { campaignId: id },
    select: { buyerId: true },
    distinct: ['buyerId'],
  })
  const existingBuyerIds = new Set(existingCalls.map(c => c.buyerId))

  let newBuyers: { id: string; phone: string | null; email: string | null }[] = []

  if (body.filter && typeof body.filter === 'object') {
    const result = await buildAudience(profile.id, body.filter as any, channel)
    newBuyers = result.buyers
      .filter(b => !existingBuyerIds.has(b.id))
      .map(b => ({ id: b.id, phone: b.phone, email: b.email }))
  } else if (body.buyerIds && Array.isArray(body.buyerIds)) {
    const v = new Validator().array('buyerIds', body.buyerIds, { maxItems: 10000 })
    if (!v.isValid()) return v.toResponse()

    const ids = (body.buyerIds as string[]).filter(id => !existingBuyerIds.has(id))
    const { valid } = await validateBuyerIds(ids, profile.id, channel)
    newBuyers = valid.map(b => ({ id: b.id, phone: b.phone, email: b.email }))
  } else {
    return errorResponse(400, 'Provide either "filter" or "buyerIds"')
  }

  if (newBuyers.length === 0) {
    return successResponse({ added: 0, skipped: 0, total: campaign.totalBuyers })
  }

  // Create CampaignCall records for the new buyers
  await prisma.campaignCall.createMany({
    data: newBuyers.map(buyer => ({
      campaignId: id,
      buyerId: buyer.id,
      phoneNumber: buyer.phone || '',
      attemptNumber: 1,
    })),
  })

  // Update totalBuyers
  const newTotal = campaign.totalBuyers + newBuyers.length
  await prisma.campaign.update({
    where: { id },
    data: { totalBuyers: newTotal },
  })

  return successResponse({
    added: newBuyers.length,
    skipped: existingBuyerIds.size,
    total: newTotal,
  })
}

// DELETE /api/outreach/campaigns/[id]/audience — Remove buyers from campaign
export async function DELETE(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { campaign, error: campError, status: campStatus } = await getCampaignWithAuth(id, profile.id)
  if (!campaign) return errorResponse(campStatus, campError!)

  if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
    return errorResponse(400, 'Can only remove buyers from DRAFT or PAUSED campaigns')
  }

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
    .require('buyerIds', body.buyerIds, 'Buyer IDs')
    .array('buyerIds', body.buyerIds, { maxItems: 10000 })
  if (!v.isValid()) return v.toResponse()

  const buyerIds = body.buyerIds as string[]

  // Only delete pending calls (outcome is null)
  const { count: removed } = await prisma.campaignCall.deleteMany({
    where: {
      campaignId: id,
      buyerId: { in: buyerIds },
      outcome: null,
    },
  })

  // Update totalBuyers
  const newTotal = Math.max(0, campaign.totalBuyers - removed)
  await prisma.campaign.update({
    where: { id },
    data: { totalBuyers: newTotal },
  })

  return successResponse({ removed, total: newTotal })
}
