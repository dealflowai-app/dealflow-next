import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { parseTranscript } from '@/lib/outreach/transcript-processor'

type Params = { params: Promise<{ id: string }> }

// ── Helper: fetch call with ownership check ─────────────────────────────────

async function getCallWithAuth(callId: string, profileId: string) {
  const call = await prisma.campaignCall.findUnique({
    where: { id: callId },
    include: {
      campaign: {
        select: {
          id: true,
          profileId: true,
          name: true,
          market: true,
          channel: true,
          mode: true,
          scriptTemplate: true,
          companyName: true,
          agentName: true,
        },
      },
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
          strategy: true,
          preferredTypes: true,
          minPrice: true,
          maxPrice: true,
          closeSpeedDays: true,
          preferredMarkets: true,
          lastContactedAt: true,
        },
      },
    },
  })

  if (!call) return { call: null, error: 'Call not found', status: 404 }
  if (call.campaign?.profileId !== profileId) return { call: null, error: 'Call not found', status: 404 }
  return { call, error: null, status: 200 }
}

// GET /api/outreach/calls/[id] — Full call detail with parsed transcript
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { call, error: callError, status: callStatus } = await getCallWithAuth(id, profile.id)
  if (!call) return errorResponse(callStatus, callError!)

  // Parse transcript into structured segments
  const parsedTranscript = call.transcript
    ? parseTranscript(call.transcript, {
        agentName: call.campaign?.agentName || 'AI Agent',
        buyerName: call.buyer.entityName
          || [call.buyer.firstName, call.buyer.lastName].filter(Boolean).join(' ')
          || 'Buyer',
      })
    : null

  // Build buyer display name
  const buyerName = call.buyer.entityName
    || [call.buyer.firstName, call.buyer.lastName].filter(Boolean).join(' ')
    || 'Unknown'

  return successResponse({
    call: {
      id: call.id,
      campaignId: call.campaignId,
      buyerId: call.buyerId,
      channel: call.channel,
      blandCallId: call.blandCallId,
      phoneNumber: call.phoneNumber,
      outcome: call.outcome,
      durationSecs: call.durationSecs,
      recordingUrl: call.recordingUrl,
      aiSummary: call.aiSummary,
      extractedData: call.extractedData,
      attemptNumber: call.attemptNumber,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      createdAt: call.createdAt,
      // SMS/email fields
      messageId: call.messageId,
      messageSent: call.messageSent,
      messageDelivered: call.messageDelivered,
      responseText: call.responseText,
      responseAt: call.responseAt,
    },
    // Parsed transcript with segments, key moments, speaker stats
    transcript: parsedTranscript,
    // Raw transcript for fallback
    rawTranscript: call.transcript || null,
    // Related entities
    buyer: {
      ...call.buyer,
      displayName: buyerName,
    },
    campaign: call.campaign,
  })
}

// PATCH /api/outreach/calls/[id] — Manual annotations (notes, outcome override)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { call, error: callError, status: callStatus } = await getCallWithAuth(id, profile.id)
  if (!call) return errorResponse(callStatus, callError!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const updateData: Record<string, unknown> = {}

  // Allow overriding outcome manually
  if (body.outcome !== undefined) {
    const validOutcomes = ['QUALIFIED', 'NOT_BUYING', 'NO_ANSWER', 'VOICEMAIL', 'WRONG_NUMBER', 'DO_NOT_CALL', 'CALLBACK_REQUESTED']
    if (typeof body.outcome !== 'string' || !validOutcomes.includes(body.outcome)) {
      return errorResponse(400, `outcome must be one of: ${validOutcomes.join(', ')}`)
    }
    updateData.outcome = body.outcome
  }

  // Allow adding/editing AI summary (manual notes)
  if (body.aiSummary !== undefined) {
    if (typeof body.aiSummary !== 'string' || body.aiSummary.length > 5000) {
      return errorResponse(400, 'aiSummary must be a string under 5000 characters')
    }
    updateData.aiSummary = body.aiSummary
  }

  // Allow updating extracted data (manual corrections)
  if (body.extractedData !== undefined) {
    if (typeof body.extractedData !== 'object' || body.extractedData === null) {
      return errorResponse(400, 'extractedData must be an object')
    }
    // Merge with existing extracted data
    const existing = (call.extractedData as Record<string, unknown>) || {}
    updateData.extractedData = { ...existing, ...body.extractedData, _manuallyEdited: true }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse(400, 'No valid fields to update')
  }

  const updated = await prisma.campaignCall.update({
    where: { id },
    data: updateData,
  })

  // Log the annotation
  if (call.buyer) {
    await prisma.activityEvent.create({
      data: {
        buyerId: call.buyerId,
        profileId: profile.id,
        type: 'call_annotated',
        title: 'Call manually annotated',
        detail: `Fields updated: ${Object.keys(updateData).join(', ')}`,
        metadata: { callId: id, fields: Object.keys(updateData) },
      },
    })
  }

  logger.info('Call annotated', {
    route: `/api/outreach/calls/${id}`,
    userId: profile.id,
    callId: id,
    fields: Object.keys(updateData),
  })

  return successResponse({ call: updated })
}
