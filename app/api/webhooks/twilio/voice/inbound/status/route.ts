import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ─── Inbound Call Status Webhook ────────────────────────────────────────────
// Receives call status updates from Twilio when an inbound call completes.
// Updates InboundCall record and handles missed call follow-up.

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const callSid = formData.get('CallSid') as string || ''
    const callStatus = formData.get('CallStatus') as string || ''
    const callDuration = parseInt(formData.get('CallDuration') as string || '0', 10)
    const recordingUrl = formData.get('RecordingUrl') as string || ''
    const dialCallStatus = formData.get('DialCallStatus') as string || ''

    if (!callSid) return new NextResponse('<Response/>', { headers: { 'Content-Type': 'text/xml' } })

    // The effective status considers both the main call and the dial attempt
    const effectiveStatus = mapTwilioStatus(dialCallStatus || callStatus)

    // Find and update the inbound call record
    const inboundCall = await prisma.inboundCall.findUnique({
      where: { callSid },
      select: { id: true, buyerId: true, profileId: true, identified: true, buyerName: true, routedTo: true },
    })

    if (!inboundCall) {
      logger.warn('Inbound status webhook: no matching call', { route: '/api/webhooks/twilio/voice/inbound/status', callSid })
      return twimlResponse()
    }

    await prisma.inboundCall.update({
      where: { callSid },
      data: {
        status: effectiveStatus,
        duration: callDuration || undefined,
        recordingUrl: recordingUrl || undefined,
        endedAt: new Date(),
        ...(effectiveStatus === 'missed' ? { routedTo: 'missed' } : {}),
      },
    })

    // If the call was missed and caller is a known buyer, schedule a callback
    if (effectiveStatus === 'missed' && inboundCall.buyerId) {
      try {
        // Check if there's already a pending callback for this buyer
        const existingCallback = await prisma.scheduledCallback.findFirst({
          where: {
            buyerId: inboundCall.buyerId,
            profileId: inboundCall.profileId,
            status: 'scheduled',
          },
        })

        if (!existingCallback) {
          // Schedule a callback for 30 minutes from now
          await prisma.scheduledCallback.create({
            data: {
              profileId: inboundCall.profileId,
              buyerId: inboundCall.buyerId,
              scheduledAt: new Date(Date.now() + 30 * 60 * 1000),
              reason: `Missed inbound call from ${inboundCall.buyerName || 'buyer'}`,
              source: 'auto_retry',
            },
          })

          logger.info('Auto-scheduled callback for missed inbound call', {
            route: '/api/webhooks/twilio/voice/inbound/status',
            callSid,
            buyerId: inboundCall.buyerId,
            buyerName: inboundCall.buyerName,
          })
        }
      } catch (err) {
        logger.warn('Failed to schedule missed call callback', {
          route: '/api/webhooks/twilio/voice/inbound/status',
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Update buyer's lastContactedAt if the call was answered
    if (effectiveStatus === 'completed' && inboundCall.buyerId) {
      await prisma.cashBuyer.update({
        where: { id: inboundCall.buyerId },
        data: { lastContactedAt: new Date() },
      }).catch(() => {})
    }

    logger.info('Inbound call status updated', {
      route: '/api/webhooks/twilio/voice/inbound/status',
      callSid,
      status: effectiveStatus,
      duration: callDuration,
      identified: inboundCall.identified,
    })

    // If the dial to wholesaler failed, offer voicemail
    if (dialCallStatus && ['no-answer', 'busy', 'failed'].includes(dialCallStatus)) {
      return new NextResponse(
        `<Response>` +
        `<Say voice="alice">Sorry, we're unable to connect you right now. Please leave a message after the beep.</Say>` +
        `<Record maxLength="120" />` +
        `</Response>`,
        { headers: { 'Content-Type': 'text/xml' } },
      )
    }

    return twimlResponse()
  } catch (error) {
    logger.error('Inbound status webhook failed', {
      route: '/api/webhooks/twilio/voice/inbound/status',
      error: error instanceof Error ? error.message : String(error),
    })
    return twimlResponse()
  }
}

function mapTwilioStatus(status: string): string {
  const map: Record<string, string> = {
    completed: 'completed',
    busy: 'busy',
    'no-answer': 'missed',
    failed: 'missed',
    canceled: 'missed',
    ringing: 'ringing',
    'in-progress': 'in-progress',
    queued: 'ringing',
  }
  return map[status] || status
}

function twimlResponse(): NextResponse {
  return new NextResponse('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
}
