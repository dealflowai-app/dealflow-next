import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { checkCompliance, normalizePhone } from '@/lib/outreach'

// ─── Manual Call Logging API ────────────────────────────────────────────────
// POST /api/outreach/calls/manual
//
// Logs a manual call (browser or external phone). Creates a CampaignCall record,
// updates buyer contact timestamps, logs activity events. Runs compliance check
// for audit trail even though the call already happened.

const VALID_OUTCOMES = [
  'QUALIFIED', 'NOT_BUYING', 'NO_ANSWER', 'VOICEMAIL',
  'WRONG_NUMBER', 'DO_NOT_CALL', 'CALLBACK_REQUESTED',
]

export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  // ── Validate ────────────────────────────────────────────────────────────
  const buyerId = body.buyerId as string
  if (!buyerId) return errorResponse(400, 'buyerId is required')

  const outcome = body.outcome as string | undefined
  if (outcome && !VALID_OUTCOMES.includes(outcome)) {
    return errorResponse(400, `outcome must be one of: ${VALID_OUTCOMES.join(', ')}`)
  }

  // Verify the buyer belongs to this user
  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: buyerId, profileId: profile.id },
    select: { id: true, phone: true, state: true, status: true, profileId: true },
  })

  if (!buyer) return errorResponse(404, 'Buyer not found')

  const phoneNumber = (body.phoneNumber as string) || buyer.phone || ''
  if (!phoneNumber) return errorResponse(400, 'No phone number available for this buyer')

  // ── Compliance check (audit trail) ──────────────────────────────────────
  const normalized = normalizePhone(phoneNumber) || phoneNumber
  try {
    await checkCompliance(normalized, 'voice', profile.id, {
      buyerId,
      state: buyer.state,
    })
  } catch {
    // Log but don't block — the call already happened for manual logging
  }

  // ── Validate campaign if provided ───────────────────────────────────────
  const campaignId = body.campaignId as string | null | undefined
  if (campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, profileId: profile.id },
    })
    if (!campaign) return errorResponse(404, 'Campaign not found')
  }

  // ── Create the CampaignCall record ──────────────────────────────────────
  const call = await prisma.campaignCall.create({
    data: {
      campaignId: campaignId || undefined,
      buyerId,
      isManual: true,
      channel: 'manual_voice',
      phoneNumber,
      outcome: (outcome as any) || null,
      durationSecs: typeof body.durationSecs === 'number' ? body.durationSecs : null,
      aiSummary: typeof body.notes === 'string' ? body.notes : null,
      messageId: (body.callSid as string) || null,
      startedAt: new Date(),
      endedAt: outcome ? new Date() : null,
    },
  })

  // ── Update buyer ────────────────────────────────────────────────────────
  const buyerUpdate: Record<string, unknown> = {
    lastContactedAt: new Date(),
  }

  if (outcome === 'QUALIFIED') {
    buyerUpdate.status = 'RECENTLY_VERIFIED'
    buyerUpdate.lastVerifiedAt = new Date()
  } else if (outcome === 'NOT_BUYING') {
    buyerUpdate.status = 'DORMANT'
  } else if (outcome === 'DO_NOT_CALL') {
    buyerUpdate.status = 'DO_NOT_CALL'
    buyerUpdate.isOptedOut = true
    buyerUpdate.optedOutAt = new Date()
  }

  await prisma.cashBuyer.update({
    where: { id: buyerId },
    data: buyerUpdate,
  })

  // ── Update campaign stats if linked ─────────────────────────────────────
  if (campaignId && outcome) {
    const statUpdate: Record<string, unknown> = {
      callsCompleted: { increment: 1 },
      totalTalkTime: { increment: typeof body.durationSecs === 'number' ? body.durationSecs : 0 },
    }
    if (outcome === 'QUALIFIED') statUpdate.qualified = { increment: 1 }
    else if (outcome === 'NOT_BUYING') statUpdate.notBuying = { increment: 1 }
    else if (outcome === 'NO_ANSWER' || outcome === 'VOICEMAIL') statUpdate.noAnswer = { increment: 1 }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: statUpdate,
    })
  }

  // ── Log activity event ──────────────────────────────────────────────────
  await prisma.activityEvent.create({
    data: {
      buyerId,
      profileId: profile.id,
      type: 'call_completed',
      title: `Manual call — ${outcome ? outcome.replace(/_/g, ' ').toLowerCase() : 'in progress'}`,
      detail: typeof body.notes === 'string' ? body.notes : null,
      metadata: {
        callId: call.id,
        channel: 'manual_voice',
        outcome: outcome || null,
        durationSecs: typeof body.durationSecs === 'number' ? body.durationSecs : null,
        campaignId: campaignId || undefined,
      },
    },
  })

  logger.info('Manual call logged', {
    route: '/api/outreach/calls/manual',
    userId: profile.id,
    buyerId,
    callId: call.id,
    outcome,
  })

  return successResponse({ call }, 201)
}
