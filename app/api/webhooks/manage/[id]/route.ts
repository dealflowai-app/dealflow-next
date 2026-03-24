import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { logger } from '@/lib/logger'
import { WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/webhooks'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/webhooks/manage/[id]
 * Get a single webhook with its last 20 deliveries.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const webhook = await prisma.webhook.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!webhook || webhook.profileId !== profile.id) {
      return errorResponse(404, 'Webhook not found')
    }

    return successResponse({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        description: webhook.description,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
        deliveries: webhook.deliveries,
      },
    })
  } catch (err) {
    logger.error('GET /api/webhooks/manage/[id] error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(500, 'Failed to fetch webhook')
  }
}

/**
 * PATCH /api/webhooks/manage/[id]
 * Update a webhook's url, events, active status, or description.
 * Body: { url?: string, events?: string[], active?: boolean, description?: string }
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const existing = await prisma.webhook.findUnique({ where: { id } })
    if (!existing || existing.profileId !== profile.id) {
      return errorResponse(404, 'Webhook not found')
    }

    const { body, error: parseError } = await parseBody(req)
    if (parseError || !body) return errorResponse(400, parseError || 'Invalid body')

    const { url, events, active, description } = body as {
      url?: string
      events?: string[]
      active?: boolean
      description?: string
    }

    // Build update payload
    const updateData: Record<string, unknown> = {}

    if (url !== undefined) {
      if (typeof url !== 'string') {
        return errorResponse(400, 'url must be a string')
      }
      try {
        const parsed = new URL(url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return errorResponse(400, 'URL must use http or https protocol')
        }
      } catch {
        return errorResponse(400, 'Invalid URL format')
      }
      updateData.url = url
    }

    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return errorResponse(400, 'At least one event is required')
      }
      const invalidEvents = events.filter((e) => !WEBHOOK_EVENTS.includes(e as WebhookEvent))
      if (invalidEvents.length > 0) {
        return errorResponse(400, `Invalid events: ${invalidEvents.join(', ')}`, {
          validEvents: WEBHOOK_EVENTS,
        })
      }
      updateData.events = events
    }

    if (active !== undefined) {
      if (typeof active !== 'boolean') {
        return errorResponse(400, 'active must be a boolean')
      }
      updateData.active = active
    }

    if (description !== undefined) {
      updateData.description = description || null
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse(400, 'No valid fields to update')
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: updateData,
    })

    return successResponse({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        description: webhook.description,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
    })
  } catch (err) {
    logger.error('PATCH /api/webhooks/manage/[id] error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(500, 'Failed to update webhook')
  }
}

/**
 * DELETE /api/webhooks/manage/[id]
 * Delete a webhook and all its delivery records.
 */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const existing = await prisma.webhook.findUnique({ where: { id } })
    if (!existing || existing.profileId !== profile.id) {
      return errorResponse(404, 'Webhook not found')
    }

    await prisma.webhook.delete({ where: { id } })

    return successResponse({ deleted: true })
  } catch (err) {
    logger.error('DELETE /api/webhooks/manage/[id] error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(500, 'Failed to delete webhook')
  }
}
