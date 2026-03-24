import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  processWebhookEvent,
  type PandaDocWebhookPayload,
} from '@/lib/contracts/pandadoc'
import { logger } from '@/lib/logger'

/**
 * POST /api/webhooks/pandadoc
 * PandaDoc webhook handler.
 * Receives document status updates and auto-transitions contract status.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Verify signature if configured
    const signature = req.headers.get('x-pandadoc-signature') || ''
    if (signature) {
      const valid = verifyWebhookSignature(rawBody, signature)
      if (!valid) {
        logger.warn('PandaDoc webhook signature verification failed')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload: PandaDocWebhookPayload = JSON.parse(rawBody)

    // Process the event
    const result = await processWebhookEvent(payload)

    logger.info('PandaDoc webhook handled', {
      documentId: payload.data?.id,
      event: payload.event,
      contractId: result.contractId,
      action: result.action,
    })

    return NextResponse.json({ received: true, ...result })
  } catch (err) {
    logger.error('PandaDoc webhook processing failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    // Return 200 to prevent PandaDoc from retrying on app errors
    return NextResponse.json({ received: true, error: 'Processing failed' })
  }
}
