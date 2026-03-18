import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ─── Twilio Recording Webhook ───────────────────────────────────────────────
// Receives recording completion events from Twilio after a manual browser call.
// Updates the CampaignCall record with the recording URL and duration.
//
// Twilio sends form-encoded POST with:
//   CallSid, RecordingUrl, RecordingSid, RecordingDuration, etc.

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const callSid = formData.get('CallSid') as string || ''
    const recordingUrl = formData.get('RecordingUrl') as string || ''
    const recordingSid = formData.get('RecordingSid') as string || ''
    const recordingDuration = parseInt(formData.get('RecordingDuration') as string || '0', 10)

    if (!callSid || !recordingUrl) {
      return NextResponse.json({ ok: true })
    }

    // Twilio recording URLs don't include the file extension — append .mp3
    const fullRecordingUrl = recordingUrl.endsWith('.mp3')
      ? recordingUrl
      : `${recordingUrl}.mp3`

    // Find the CampaignCall with this CallSid stored in messageId
    const updated = await prisma.campaignCall.updateMany({
      where: { messageId: callSid },
      data: {
        recordingUrl: fullRecordingUrl,
        durationSecs: recordingDuration || undefined,
      },
    })

    if (updated.count > 0) {
      logger.info('Recording attached to call', {
        route: '/api/webhooks/twilio/recording',
        callSid,
        recordingSid,
        duration: recordingDuration,
      })
    } else {
      logger.info('Recording webhook — no matching call record', {
        route: '/api/webhooks/twilio/recording',
        callSid,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error('Twilio recording webhook failed', {
      route: '/api/webhooks/twilio/recording',
      error: error instanceof Error ? error.message : String(error),
    })
    // Always return 200 so Twilio doesn't retry
    return NextResponse.json({ ok: true })
  }
}
