import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// ─── Twilio Voice Webhook (TwiML App) ───────────────────────────────────────
// Called by Twilio when a browser-initiated call connects via the TwiML App.
// Returns TwiML that dials the buyer's phone number.
//
// The browser call flow:
// 1. Browser → Twilio Client SDK → Twilio cloud
// 2. Twilio → POST /api/webhooks/twilio/voice (this endpoint)
// 3. We return TwiML: <Response><Dial><Number>+1XXXXXXXXXX</Number></Dial></Response>
// 4. Twilio connects the browser to the buyer's phone

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const to = formData.get('To') as string || ''
    const from = formData.get('From') as string || ''
    const callSid = formData.get('CallSid') as string || ''

    // The 'To' parameter contains the buyer's phone number (passed from the browser SDK)
    // The 'From' will be the Twilio number or 'client:identity'

    if (!to) {
      logger.warn('Twilio voice webhook: no To number', { route: '/api/webhooks/twilio/voice' })
      return twimlResponse('<Response><Say>No phone number provided.</Say></Response>')
    }

    // Get caller ID from env or use the Twilio number
    const callerId = process.env.TWILIO_PHONE_NUMBER || from

    logger.info('Browser call initiated', {
      route: '/api/webhooks/twilio/voice',
      callSid,
      to: `***${to.slice(-4)}`,
    })

    // Build recording callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const recordingCallback = `${baseUrl}/api/webhooks/twilio/recording`

    // Return TwiML to dial the buyer with recording enabled
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(callerId)}" record="record-from-answer-dual" recordingStatusCallback="${escapeXml(recordingCallback)}" recordingStatusCallbackEvent="completed">
    <Number>${escapeXml(to)}</Number>
  </Dial>
</Response>`

    return twimlResponse(twiml)
  } catch (error) {
    logger.error('Twilio voice webhook failed', {
      route: '/api/webhooks/twilio/voice',
      error: error instanceof Error ? error.message : String(error),
    })
    return twimlResponse('<Response><Say>An error occurred. Please try again.</Say></Response>')
  }
}

function twimlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    status: 200,
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
