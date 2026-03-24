import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import * as crypto from 'crypto'

export type WebhookEvent =
  | 'deal.created'
  | 'deal.updated'
  | 'deal.closed'
  | 'buyer.added'
  | 'buyer.matched'
  | 'contract.created'
  | 'contract.signed'
  | 'campaign.completed'
  | 'listing.created'
  | 'offer.received'

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  'deal.created', 'deal.updated', 'deal.closed',
  'buyer.added', 'buyer.matched',
  'contract.created', 'contract.signed',
  'campaign.completed',
  'listing.created',
  'offer.received',
]

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export async function dispatchWebhookEvent(
  profileId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { profileId, active: true, events: { has: event } },
    })

    if (webhooks.length === 0) return

    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() })

    await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const signature = signPayload(payload, webhook.secret)

        const delivery = await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event,
            payload: JSON.parse(payload),
            attempts: 1,
          },
        })

        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 10_000)

          const res = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': `sha256=${signature}`,
              'X-Webhook-Event': event,
              'X-Webhook-Delivery': delivery.id,
            },
            body: payload,
            signal: controller.signal,
          })

          clearTimeout(timeout)

          await prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              statusCode: res.status,
              response: (await res.text()).slice(0, 1000),
              success: res.ok,
            },
          })
        } catch (err) {
          // Schedule retry with exponential backoff
          const nextRetry = new Date(Date.now() + 60_000 * Math.pow(2, delivery.attempts - 1))
          await prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              success: false,
              response: err instanceof Error ? err.message : 'Delivery failed',
              nextRetry: delivery.attempts < 5 ? nextRetry : null,
            },
          })
        }
      }),
    )
  } catch (err) {
    logger.error('Webhook dispatch error', { event, error: err instanceof Error ? err.message : String(err) })
  }
}
