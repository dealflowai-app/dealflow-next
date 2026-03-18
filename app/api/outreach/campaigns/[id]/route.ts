import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { triggerNextBatch } from '@/lib/outreach/campaign-executor'

type Params = { params: Promise<{ id: string }> }

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['RUNNING', 'CANCELLED'],
  RUNNING: ['PAUSED', 'CANCELLED'],
  PAUSED: ['RUNNING', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

// ── Helper: fetch campaign with ownership check ──────────────────────────────

async function getCampaignWithAuth(campaignId: string, profileId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
  if (!campaign) return { campaign: null, error: 'Campaign not found', status: 404 }
  if (campaign.profileId !== profileId) return { campaign: null, error: 'Campaign not found', status: 404 }
  return { campaign, error: null, status: 200 }
}

// GET /api/outreach/campaigns/[id] — Full campaign detail
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { campaign, error: campError, status: campStatus } = await getCampaignWithAuth(id, profile.id)
  if (!campaign) return errorResponse(campStatus, campError!)

  // Fetch calls with buyer info, grouped by outcome
  const calls = await prisma.campaignCall.findMany({
    where: { campaignId: id },
    select: {
      id: true,
      phoneNumber: true,
      outcome: true,
      durationSecs: true,
      aiSummary: true,
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
    orderBy: { createdAt: 'desc' },
  })

  // Compute live stats
  const completedCalls = calls.filter(c => c.outcome !== null)
  const qualifiedCalls = calls.filter(c => c.outcome === 'QUALIFIED')
  const connectedCalls = calls.filter(c =>
    c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED',
  )
  const totalDuration = completedCalls.reduce((sum, c) => sum + (c.durationSecs || 0), 0)
  const pendingCalls = calls.filter(c => c.outcome === null)

  const stats = {
    total: calls.length,
    completed: completedCalls.length,
    pending: pendingCalls.length,
    qualified: qualifiedCalls.length,
    connectionRate: completedCalls.length > 0
      ? Math.round((connectedCalls.length / completedCalls.length) * 100)
      : 0,
    qualificationRate: connectedCalls.length > 0
      ? Math.round((qualifiedCalls.length / connectedCalls.length) * 100)
      : 0,
    avgCallDuration: completedCalls.length > 0
      ? Math.round(totalDuration / completedCalls.length)
      : 0,
    totalTalkTime: totalDuration,
    costSoFar: campaign.actualCost || 0,
  }

  // Group calls by outcome for the summary
  const outcomeGroups: Record<string, number> = {}
  for (const call of calls) {
    const key = call.outcome || 'PENDING'
    outcomeGroups[key] = (outcomeGroups[key] || 0) + 1
  }

  return successResponse({ campaign, calls, stats, outcomeGroups })
}

// PATCH /api/outreach/campaigns/[id] — Update campaign / manage lifecycle
export async function PATCH(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { campaign, error: campError, status: campStatus } = await getCampaignWithAuth(id, profile.id)
  if (!campaign) return errorResponse(campStatus, campError!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  // ── Validate fields ─────────────────────────────────────────────────────
  const v = new Validator()
  if (body.name !== undefined) v.string('name', body.name, { maxLength: 200, label: 'Campaign name' })
  if (body.market !== undefined) v.string('market', body.market, { maxLength: 200, label: 'Market' })
  if (body.maxConcurrentCalls !== undefined) v.intRange('maxConcurrentCalls', body.maxConcurrentCalls, 1, 50)
  if (body.maxRetries !== undefined) v.intRange('maxRetries', body.maxRetries, 0, 10)
  if (body.customScript !== undefined) v.string('customScript', body.customScript, { maxLength: 5000 })
  if (!v.isValid()) return v.toResponse()

  // ── Status transition ───────────────────────────────────────────────────
  if (body.status && typeof body.status === 'string') {
    const newStatus = body.status
    const allowedTransitions = STATUS_TRANSITIONS[campaign.status] || []

    if (!allowedTransitions.includes(newStatus)) {
      return errorResponse(400,
        `Cannot transition from ${campaign.status} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`)
    }

    // Handle CANCELLED transition: cancel all pending calls
    if (newStatus === 'CANCELLED') {
      await prisma.campaignCall.updateMany({
        where: {
          campaignId: id,
          outcome: null, // Only pending calls
        },
        data: {
          outcome: 'NO_ANSWER', // Mark as no answer since they were never attempted
          endedAt: new Date(),
        },
      })
    }

    // Handle RUNNING transition: set startedAt if not already set
    if (newStatus === 'RUNNING' && !campaign.startedAt) {
      body._startedAt = new Date()
    }
  }

  // ── Build update data ──────────────────────────────────────────────────
  const updateData: any = {}
  const allowedFields = [
    'name', 'market', 'scriptTemplate', 'companyName', 'agentName', 'customScript',
    'maxConcurrentCalls', 'callingHoursStart', 'callingHoursEnd', 'timezone',
    'leaveVoicemail', 'maxRetries', 'retryDelayHours', 'status',
  ]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (body.scheduledAt !== undefined) {
    updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt as string) : null
  }

  if (body._startedAt) {
    updateData.startedAt = body._startedAt
  }

  if (body.status === 'COMPLETED') {
    updateData.completedAt = new Date()
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse(400, 'No valid fields to update')
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: updateData,
  })

  logger.info('Campaign updated', {
    route: `/api/outreach/campaigns/${id}`,
    userId: profile.id,
    campaignId: id,
    fields: Object.keys(updateData),
  })

  // Fire-and-forget: kick off the first batch when campaign starts running
  if (updated.status === 'RUNNING') {
    triggerNextBatch(id)
  }

  return successResponse({ campaign: updated })
}

// DELETE /api/outreach/campaigns/[id] — Delete a DRAFT campaign
export async function DELETE(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { campaign, error: campError, status: campStatus } = await getCampaignWithAuth(id, profile.id)
  if (!campaign) return errorResponse(campStatus, campError!)

  if (campaign.status !== 'DRAFT') {
    return errorResponse(400,
      'Only DRAFT campaigns can be deleted. Cancel the campaign first, then delete it.')
  }

  // Delete all calls first (foreign key), then the campaign
  await prisma.campaignCall.deleteMany({ where: { campaignId: id } })
  await prisma.campaign.delete({ where: { id } })

  logger.info('Campaign deleted', {
    route: `/api/outreach/campaigns/${id}`,
    userId: profile.id,
    campaignId: id,
  })

  return successResponse({ success: true })
}
