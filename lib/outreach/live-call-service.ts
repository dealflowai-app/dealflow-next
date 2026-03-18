// ─── Live Call Monitoring Service ───────────────────────────────────────────
// Real-time call monitoring, whisper instructions, and barge-in for active
// Bland AI calls. Features degrade gracefully based on Bland plan tier.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getBlandClient, toE164 } from './bland-client'
import { getBlandCapabilities } from './bland-capabilities'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LiveCallInfo {
  id: string
  callId: string
  blandCallId: string
  buyerName: string
  buyerPhone: string
  buyerScore: number
  campaignName: string
  campaignId: string
  status: string
  duration: number
  startedAt: string
  monitoredBy: string | null
  transcript: string | null
}

export interface MonitoringSession {
  sessionId: string
  audioStreamUrl: string | null
  transcriptStreamUrl: string | null
  canWhisper: boolean
  canBargeIn: boolean
}

export interface WhisperResult {
  success: boolean
  delivered: boolean
  message: string
}

export interface BargeInResult {
  success: boolean
  transferSid: string | null
  method: 'transfer' | 'redial' | 'failed'
  message: string
}

// ─── Get Active Calls ──────────────────────────────────────────────────────

export async function getActiveCalls(profileId: string): Promise<LiveCallInfo[]> {
  // Find all active calls (started but not ended, with a Bland call ID)
  const activeCalls = await prisma.campaignCall.findMany({
    where: {
      campaign: { profileId },
      startedAt: { not: null },
      endedAt: null,
      blandCallId: { not: null },
      channel: 'voice',
    },
    include: {
      buyer: {
        select: {
          id: true, firstName: true, lastName: true, entityName: true,
          phone: true, buyerScore: true,
        },
      },
      campaign: {
        select: { id: true, name: true },
      },
    },
    orderBy: { startedAt: 'desc' },
  })

  // Get monitoring sessions for these calls
  const callIds = activeCalls.map(c => c.id)
  const sessions = callIds.length > 0
    ? await prisma.liveCallSession.findMany({
        where: { callId: { in: callIds }, status: { not: 'completed' } },
      })
    : []
  const sessionMap = new Map(sessions.map(s => [s.callId, s]))

  return activeCalls.map(call => {
    const session = sessionMap.get(call.id)
    const buyerName = call.buyer.entityName
      || [call.buyer.firstName, call.buyer.lastName].filter(Boolean).join(' ')
      || 'Unknown Buyer'

    const durationSecs = call.startedAt
      ? Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000)
      : 0

    return {
      id: session?.id || call.id,
      callId: call.id,
      blandCallId: call.blandCallId!,
      buyerName,
      buyerPhone: call.phoneNumber,
      buyerScore: call.buyer.buyerScore,
      campaignName: call.campaign?.name || 'Manual Call',
      campaignId: call.campaign?.id || '',
      status: session?.status || 'active',
      duration: session?.currentDuration || durationSecs,
      startedAt: call.startedAt!.toISOString(),
      monitoredBy: session?.monitoredBy || null,
      transcript: session?.currentTranscript || null,
    }
  })
}

// ─── Start Monitoring ──────────────────────────────────────────────────────

export async function startMonitoring(
  callId: string,
  profileId: string,
): Promise<MonitoringSession> {
  // Verify ownership
  const call = await prisma.campaignCall.findUnique({
    where: { id: callId },
    include: { campaign: { select: { profileId: true } } },
  })

  if (!call || call.campaign?.profileId !== profileId) {
    throw new Error('Call not found or access denied')
  }
  if (call.endedAt) throw new Error('Call has already ended')
  if (!call.blandCallId) throw new Error('No Bland call ID for this call')

  // Create or update live session
  const session = await prisma.liveCallSession.upsert({
    where: { callId },
    create: {
      profileId,
      callId,
      blandCallId: call.blandCallId,
      status: 'monitoring',
      monitoringStartedAt: new Date(),
      monitoredBy: profileId,
    },
    update: {
      status: 'monitoring',
      monitoringStartedAt: new Date(),
      monitoredBy: profileId,
    },
  })

  const caps = getBlandCapabilities()

  // Build stream URLs based on capabilities
  let audioStreamUrl: string | null = null
  let transcriptStreamUrl: string | null = null

  if (caps.liveAudioStream) {
    // Enterprise: WebSocket URL for live audio
    audioStreamUrl = `wss://api.bland.ai/v1/calls/${call.blandCallId}/stream`
  }

  if (caps.liveTranscript) {
    // Polling-based transcript — return the polling endpoint
    transcriptStreamUrl = `/api/outreach/live/${callId}/transcript`
  }

  logger.info('Call monitoring started', {
    route: 'live-call-service', callId, sessionId: session.id,
    hasAudio: !!audioStreamUrl, hasTranscript: !!transcriptStreamUrl,
  })

  return {
    sessionId: session.id,
    audioStreamUrl,
    transcriptStreamUrl,
    canWhisper: caps.whisperInjection,
    canBargeIn: caps.callTransfer,
  }
}

// ─── Stop Monitoring ───────────────────────────────────────────────────────

export async function stopMonitoring(
  sessionId: string,
  profileId: string,
): Promise<void> {
  const session = await prisma.liveCallSession.findUnique({
    where: { id: sessionId },
  })

  if (!session || session.profileId !== profileId) {
    throw new Error('Session not found or access denied')
  }

  await prisma.liveCallSession.update({
    where: { id: sessionId },
    data: {
      status: 'active',
      monitoredBy: null,
      monitoringStartedAt: null,
    },
  })

  logger.info('Call monitoring stopped', {
    route: 'live-call-service', sessionId,
  })
}

// ─── Send Whisper ──────────────────────────────────────────────────────────

export async function sendWhisper(
  sessionId: string,
  message: string,
  profileId: string,
): Promise<WhisperResult> {
  const session = await prisma.liveCallSession.findUnique({
    where: { id: sessionId },
  })

  if (!session || session.profileId !== profileId) {
    throw new Error('Session not found or access denied')
  }
  if (session.status === 'completed' || session.status === 'barged_in') {
    throw new Error('Cannot whisper — call is no longer active')
  }

  const caps = getBlandCapabilities()
  let delivered = false

  if (caps.whisperInjection) {
    // Enterprise: inject prompt mid-call via Bland API
    try {
      const bland = getBlandClient()
      const res = await fetch(`https://api.bland.ai/v1/calls/${session.blandCallId}/inject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BLAND_API_KEY}`,
        },
        body: JSON.stringify({
          task: `[INSTRUCTION FROM MANAGER]: ${message}. Work this naturally into the conversation.`,
        }),
      })
      delivered = res.ok
    } catch (err) {
      logger.warn('Bland whisper injection failed', {
        route: 'live-call-service', sessionId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Store whisper message regardless of delivery
  const existing = (session.whisperMessages as Array<{ message: string; sentAt: string }>) || []
  existing.push({ message, sentAt: new Date().toISOString() })

  await prisma.liveCallSession.update({
    where: { id: sessionId },
    data: {
      status: 'whisper',
      whisperMessages: existing as any,
      lastActivityAt: new Date(),
    },
  })

  logger.info('Whisper sent', {
    route: 'live-call-service', sessionId, delivered,
    messagePreview: message.slice(0, 50),
  })

  return {
    success: true,
    delivered,
    message: delivered
      ? 'Instruction delivered to AI agent'
      : 'Instruction saved. Live whisper requires Bland Enterprise — barge in to speak directly.',
  }
}

// ─── Barge In ──────────────────────────────────────────────────────────────

export async function bargeIn(
  sessionId: string,
  profileId: string,
): Promise<BargeInResult> {
  const session = await prisma.liveCallSession.findUnique({
    where: { id: sessionId },
  })

  if (!session || session.profileId !== profileId) {
    throw new Error('Session not found or access denied')
  }
  if (session.status === 'completed' || session.status === 'barged_in') {
    throw new Error('Cannot barge in — call is no longer active')
  }

  const caps = getBlandCapabilities()
  const bland = getBlandClient()

  // Get wholesaler's phone for transfer
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { phone: true, firstName: true },
  })
  const wholesalerPhone = profile?.phone
  const wholesalerName = profile?.firstName || 'my colleague'

  if (caps.callTransfer && wholesalerPhone) {
    // Enterprise: transfer call from AI to wholesaler
    try {
      const res = await fetch(`https://api.bland.ai/v1/calls/${session.blandCallId}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BLAND_API_KEY}`,
        },
        body: JSON.stringify({
          phone_number: toE164(wholesalerPhone),
          message: `Let me connect you with ${wholesalerName} who can help you directly.`,
        }),
      })

      if (res.ok) {
        const data = await res.json()

        await prisma.liveCallSession.update({
          where: { id: sessionId },
          data: {
            status: 'barged_in',
            bargedInAt: new Date(),
            bargedInBy: profileId,
            transferSid: data.transfer_id || null,
          },
        })

        // Note barge-in on the campaign call
        await prisma.campaignCall.update({
          where: { id: session.callId },
          data: { aiSummary: 'Call transferred to wholesaler (barge-in)' },
        })

        logger.info('Call transfer initiated (barge-in)', {
          route: 'live-call-service', sessionId, blandCallId: session.blandCallId,
        })

        return {
          success: true,
          transferSid: data.transfer_id || null,
          method: 'transfer',
          message: 'Call transfer initiated. You will be connected shortly.',
        }
      }
    } catch (err) {
      logger.warn('Bland call transfer failed, falling back to end+redial', {
        route: 'live-call-service', sessionId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Fallback: end Bland call so wholesaler can call buyer directly
  try {
    await bland.endCall(session.blandCallId)

    await prisma.liveCallSession.update({
      where: { id: sessionId },
      data: {
        status: 'barged_in',
        bargedInAt: new Date(),
        bargedInBy: profileId,
      },
    })

    await prisma.campaignCall.update({
      where: { id: session.callId },
      data: { aiSummary: 'AI call ended for wholesaler barge-in (manual redial)' },
    })

    // Get buyer phone for the UI to initiate a direct call
    const call = await prisma.campaignCall.findUnique({
      where: { id: session.callId },
      select: { phoneNumber: true },
    })

    logger.info('AI call ended for barge-in (redial method)', {
      route: 'live-call-service', sessionId,
    })

    return {
      success: true,
      transferSid: null,
      method: 'redial',
      message: `AI call ended. Call ${call?.phoneNumber || 'the buyer'} directly to continue the conversation.`,
    }
  } catch (err) {
    logger.error('Barge-in failed completely', {
      route: 'live-call-service', sessionId,
      error: err instanceof Error ? err.message : String(err),
    })

    return {
      success: false,
      transferSid: null,
      method: 'failed',
      message: 'Barge-in failed. Try ending the call and calling the buyer directly.',
    }
  }
}

// ─── End Call Remotely ─────────────────────────────────────────────────────

export async function endCallRemotely(
  callId: string,
  profileId: string,
): Promise<void> {
  const call = await prisma.campaignCall.findUnique({
    where: { id: callId },
    include: { campaign: { select: { profileId: true } } },
  })

  if (!call || call.campaign?.profileId !== profileId) {
    throw new Error('Call not found or access denied')
  }
  if (!call.blandCallId) throw new Error('No Bland call ID')

  const bland = getBlandClient()
  await bland.endCall(call.blandCallId)

  // Update session if exists
  await prisma.liveCallSession.updateMany({
    where: { callId, status: { not: 'completed' } },
    data: { status: 'completed' },
  })

  logger.info('Call ended remotely', {
    route: 'live-call-service', callId, blandCallId: call.blandCallId,
  })
}

// ─── Get Live Transcript ───────────────────────────────────────────────────

export async function getLiveTranscript(
  callId: string,
  profileId: string,
  since?: string,
): Promise<{ transcript: string | null; updatedAt: string | null }> {
  const call = await prisma.campaignCall.findUnique({
    where: { id: callId },
    include: { campaign: { select: { profileId: true } } },
  })

  if (!call || call.campaign?.profileId !== profileId) {
    throw new Error('Call not found or access denied')
  }

  if (!call.blandCallId) return { transcript: null, updatedAt: null }

  const caps = getBlandCapabilities()

  if (caps.liveTranscript) {
    // Fetch live transcript from Bland API
    try {
      const bland = getBlandClient()
      const transcript = await bland.getCallTranscript(call.blandCallId)

      if (transcript) {
        // Cache it in the session
        await prisma.liveCallSession.updateMany({
          where: { callId },
          data: {
            currentTranscript: transcript,
            lastActivityAt: new Date(),
          },
        })

        return {
          transcript,
          updatedAt: new Date().toISOString(),
        }
      }
    } catch {
      // Fall through to cached data
    }
  }

  // Return cached transcript from session
  const session = await prisma.liveCallSession.findUnique({
    where: { callId },
    select: { currentTranscript: true, lastActivityAt: true },
  })

  return {
    transcript: session?.currentTranscript || null,
    updatedAt: session?.lastActivityAt?.toISOString() || null,
  }
}

// ─── Get Call Detail for Monitoring ────────────────────────────────────────

export async function getCallDetail(callId: string, profileId: string) {
  const call = await prisma.campaignCall.findUnique({
    where: { id: callId },
    include: {
      campaign: { select: { id: true, profileId: true, name: true } },
      buyer: {
        select: {
          id: true, firstName: true, lastName: true, entityName: true,
          phone: true, buyerScore: true, motivation: true, status: true,
          preferredMarkets: true, preferredTypes: true, strategy: true,
          minPrice: true, maxPrice: true, closeSpeedDays: true,
          aiInsight: true, notes: true, lastContactedAt: true,
        },
      },
    },
  })

  if (!call || call.campaign?.profileId !== profileId) {
    return null
  }

  const session = await prisma.liveCallSession.findUnique({
    where: { callId },
  })

  // Get matched deals (top 3)
  const dealMatches = await prisma.dealMatch.findMany({
    where: { buyerId: call.buyerId },
    include: {
      deal: { select: { id: true, address: true, city: true, state: true, askingPrice: true, arv: true } },
    },
    orderBy: { matchScore: 'desc' },
    take: 3,
  })

  return {
    call,
    session,
    dealMatches,
    capabilities: getBlandCapabilities(),
  }
}

// ─── Create Session for New Call ───────────────────────────────────────────
// Called by campaign executor when a voice call is initiated.

export async function createLiveSession(
  profileId: string,
  callId: string,
  blandCallId: string,
): Promise<void> {
  await prisma.liveCallSession.create({
    data: {
      profileId,
      callId,
      blandCallId,
      status: 'active',
    },
  })
}

// ─── Complete Session ──────────────────────────────────────────────────────
// Called by Bland webhook when a call completes.

export async function completeLiveSession(blandCallId: string): Promise<void> {
  await prisma.liveCallSession.updateMany({
    where: { blandCallId, status: { not: 'completed' } },
    data: { status: 'completed' },
  })
}
