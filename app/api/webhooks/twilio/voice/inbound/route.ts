import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateTwilioSignature } from '@/lib/outreach/sms-service'
import { routeInboundCall, DEFAULT_INBOUND_CONFIG, type InboundRoutingConfig } from '@/lib/outreach/inbound-router'
import { getBlandClient, toE164 } from '@/lib/outreach/bland-client'

const BLAND_INBOUND_ENABLED = process.env.BLAND_INBOUND_ENABLED === 'true'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.dealflow.ai'

// ─── Twilio Inbound Voice Webhook ───────────────────────────────────────────
// Called by Twilio when someone dials your Twilio phone number.
// Identifies the caller, routes to AI/wholesaler/voicemail, returns TwiML.

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const callSid = formData.get('CallSid') as string || ''
    const from = formData.get('From') as string || ''
    const to = formData.get('To') as string || ''
    const callStatus = formData.get('CallStatus') as string || 'ringing'

    if (!callSid || !from) {
      return twimlResponse('<Response><Say>An error occurred.</Say></Response>')
    }

    // Look up which profile owns this Twilio number
    // For MVP: use TWILIO_PROFILE_ID env or find by inbound settings
    const profileId = await resolveProfileForNumber(to)
    if (!profileId) {
      logger.warn('No profile found for inbound number', { route: '/api/webhooks/twilio/voice/inbound', to })
      return twimlResponse('<Response><Say>This number is not configured. Goodbye.</Say></Response>')
    }

    // Load routing config from profile settings
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, settings: true, company: true },
    })
    const settings = (profile?.settings as Record<string, unknown>) || {}
    const config: InboundRoutingConfig = {
      ...DEFAULT_INBOUND_CONFIG,
      ...(settings.inboundConfig as Partial<InboundRoutingConfig> || {}),
      companyName: (settings.inboundConfig as any)?.companyName || profile?.company || DEFAULT_INBOUND_CONFIG.companyName,
    }

    // Route the call
    const decision = await routeInboundCall(from, profileId, config)

    // Create InboundCall record
    const inboundCall = await prisma.inboundCall.create({
      data: {
        profileId,
        callSid,
        fromPhone: from,
        toPhone: to,
        buyerId: decision.callerInfo.buyer?.id || null,
        buyerName: decision.callerInfo.buyer?.name || null,
        identified: decision.callerInfo.identified,
        routedTo: decision.action === 'ai_answer' ? 'ai' : decision.action === 'forward_to_wholesaler' ? 'wholesaler' : 'voicemail',
        status: 'ringing',
        relatedCampaignId: decision.callerInfo.previousCalls[0]?.id ? null : null,
        scheduledCallbackId: decision.callerInfo.scheduledCallback?.id || null,
        startedAt: new Date(),
      },
    })

    // If there was a scheduled callback, mark it as completed
    if (decision.callerInfo.scheduledCallback) {
      await prisma.scheduledCallback.update({
        where: { id: decision.callerInfo.scheduledCallback.id },
        data: { status: 'completed', completedAt: new Date() },
      }).catch(() => {}) // non-critical
    }

    logger.info('Inbound call received', {
      route: '/api/webhooks/twilio/voice/inbound',
      callSid,
      from: `***${from.slice(-4)}`,
      identified: decision.callerInfo.identified,
      buyerName: decision.callerInfo.buyer?.name,
      action: decision.action,
      reason: decision.reason,
    })

    // Generate TwiML based on routing decision
    switch (decision.action) {
      case 'ai_answer':
        return handleAIRoute(decision, inboundCall.id, callSid, from, profileId, config)

      case 'forward_to_wholesaler':
        return handleForwardRoute(decision, callSid, from, config)

      case 'voicemail':
        return handleVoicemailRoute(decision, callSid, config)

      default:
        return twimlResponse(`<Response><Say>Thank you for calling. Goodbye.</Say></Response>`)
    }
  } catch (error) {
    logger.error('Inbound voice webhook failed', {
      route: '/api/webhooks/twilio/voice/inbound',
      error: error instanceof Error ? error.message : String(error),
    })
    return twimlResponse(`<Response><Say>We're experiencing a technical issue. Please try again later.</Say></Response>`)
  }
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

function handleAIRoute(
  decision: Awaited<ReturnType<typeof routeInboundCall>>,
  inboundCallId: string,
  callSid: string,
  from: string,
  profileId: string,
  config: InboundRoutingConfig,
): NextResponse {
  // If Bland inbound is enabled, use Bland to handle the AI conversation
  if (BLAND_INBOUND_ENABLED && decision.aiScript) {
    // Initiate Bland inbound call handling asynchronously
    // Bland will call back to our webhook when done
    initiateBlandInbound(decision.aiScript, from, inboundCallId, profileId).catch(err => {
      logger.warn('Bland inbound initiation failed', {
        route: '/api/webhooks/twilio/voice/inbound',
        callSid,
        error: err instanceof Error ? err.message : String(err),
      })
    })

    // Tell Twilio to hold briefly then connect to Bland
    return twimlResponse(
      `<Response>` +
      `<Say voice="alice">Please hold for just a moment.</Say>` +
      `<Pause length="2"/>` +
      `<Say voice="alice">Connecting you now.</Say>` +
      `<Pause length="30"/>` +
      `</Response>`,
    )
  }

  // Fallback: forward to wholesaler if available, otherwise voicemail
  if (config.forwardNumber) {
    return handleForwardRoute(decision, callSid, from, config)
  }

  return handleVoicemailRoute(decision, callSid, config)
}

function handleForwardRoute(
  decision: Awaited<ReturnType<typeof routeInboundCall>>,
  callSid: string,
  from: string,
  config: InboundRoutingConfig,
): NextResponse {
  const statusCallback = `${APP_URL}/api/webhooks/twilio/voice/inbound/status`
  const recordingCallback = `${APP_URL}/api/webhooks/twilio/recording`

  return twimlResponse(
    `<Response>` +
    `<Dial callerId="${escapeXml(from)}" ` +
    `record="record-from-answer-dual" ` +
    `recordingStatusCallback="${escapeXml(recordingCallback)}" ` +
    `action="${escapeXml(statusCallback)}" ` +
    `timeout="${config.forwardAfterRings * 6}">` +
    `<Number>${escapeXml(decision.forwardNumber || config.forwardNumber || '')}</Number>` +
    `</Dial>` +
    `</Response>`,
  )
}

function handleVoicemailRoute(
  decision: Awaited<ReturnType<typeof routeInboundCall>>,
  callSid: string,
  config: InboundRoutingConfig,
): NextResponse {
  const statusCallback = `${APP_URL}/api/webhooks/twilio/voice/inbound/status`
  const recordingCallback = `${APP_URL}/api/webhooks/twilio/recording`
  const greeting = decision.voicemailGreeting || `Thank you for calling ${config.companyName}. Please leave a message after the beep.`

  return twimlResponse(
    `<Response>` +
    `<Say voice="alice">${escapeXml(greeting)}</Say>` +
    `<Record maxLength="120" ` +
    `recordingStatusCallback="${escapeXml(recordingCallback)}" ` +
    `action="${escapeXml(statusCallback)}" />` +
    `</Response>`,
  )
}

// ─── Bland Inbound (async) ──────────────────────────────────────────────────

async function initiateBlandInbound(
  script: string,
  callerPhone: string,
  inboundCallId: string,
  profileId: string,
): Promise<void> {
  const bland = getBlandClient()
  await bland.initiateCall({
    phone_number: toE164(callerPhone.replace(/\D/g, '').slice(-10)),
    task: script,
    max_duration: 10,
    record: true,
    wait_for_greeting: false,
    reduce_latency: true,
    metadata: {
      inboundCallId,
      profileId,
      type: 'inbound_ai',
    },
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function resolveProfileForNumber(twilioNumber: string): Promise<string | null> {
  // MVP: use env var for single-tenant
  if (process.env.TWILIO_PROFILE_ID) return process.env.TWILIO_PROFILE_ID

  // Try to find a profile that has this number in settings
  const profiles = await prisma.profile.findMany({
    where: {
      settings: { path: ['twilioNumber'], equals: twilioNumber },
    },
    select: { id: true },
    take: 1,
  })

  if (profiles.length > 0) return profiles[0].id

  // Fallback: return the first profile (dev/single-tenant)
  const first = await prisma.profile.findFirst({ select: { id: true } })
  return first?.id || null
}
