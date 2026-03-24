import { NextRequest } from 'next/server'
import * as crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { logger } from '@/lib/logger'
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/webhooks'

/**
 * GET /api/webhooks/manage
 * List the authenticated user's webhooks with recent delivery stats.
 */
export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const webhooks = await prisma.webhook.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { deliveries: true },
        },
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            event: true,
            statusCode: true,
            success: true,
            createdAt: true,
          },
        },
      },
    })

    // Compute success/failure counts for each webhook
    const results = await Promise.all(
      webhooks.map(async (wh) => {
        const [successCount, failureCount] = await Promise.all([
          prisma.webhookDelivery.count({ where: { webhookId: wh.id, success: true } }),
          prisma.webhookDelivery.count({ where: { webhookId: wh.id, success: false } }),
        ])

        return {
          id: wh.id,
          url: wh.url,
          events: wh.events,
          active: wh.active,
          description: wh.description,
          createdAt: wh.createdAt,
          updatedAt: wh.updatedAt,
          totalDeliveries: wh._count.deliveries,
          successCount,
          failureCount,
          recentDeliveries: wh.deliveries,
        }
      }),
    )

    return successResponse({ webhooks: results })
  } catch (err) {
    logger.error('GET /api/webhooks/manage error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(500, 'Failed to list webhooks')
  }
}

/**
 * POST /api/webhooks/manage
 * Create a new webhook endpoint.
 * Body: { url: string, events: string[], description?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const { body, error: parseError } = await parseBody(req)
    if (parseError || !body) return errorResponse(400, parseError || 'Invalid body')

    const { url, events, description } = body as {
      url?: string
      events?: string[]
      description?: string
    }

    // Validate URL
    if (!url || typeof url !== 'string') {
      return errorResponse(400, 'A valid url is required')
    }
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return errorResponse(400, 'URL must use http or https protocol')
      }
    } catch {
      return errorResponse(400, 'Invalid URL format')
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return errorResponse(400, 'At least one event is required')
    }
    const invalidEvents = events.filter((e) => !WEBHOOK_EVENTS.includes(e as WebhookEvent))
    if (invalidEvents.length > 0) {
      return errorResponse(400, `Invalid events: ${invalidEvents.join(', ')}`, {
        validEvents: WEBHOOK_EVENTS,
      })
    }

    // Generate signing secret
    const secret = crypto.randomBytes(32).toString('hex')

    const webhook = await prisma.webhook.create({
      data: {
        profileId: profile.id,
        url,
        secret,
        events,
        description: description || null,
      },
    })

    return successResponse(
      {
        webhook: {
          id: webhook.id,
          url: webhook.url,
          secret: webhook.secret, // Only returned on creation
          events: webhook.events,
          active: webhook.active,
          description: webhook.description,
          createdAt: webhook.createdAt,
        },
      },
      201,
    )
  } catch (err) {
    logger.error('POST /api/webhooks/manage error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(500, 'Failed to create webhook')
  }
}
