import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { isWithinCallingHours, getRecipientTimezone } from '@/lib/outreach/timezone-map'

const VALID_SOURCES = ['buyer_request', 'ai_detected', 'manual', 'auto_retry']
const VALID_STATUSES = ['scheduled', 'completed', 'missed', 'cancelled']

// GET /api/outreach/callbacks — List scheduled callbacks
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const filterStatus = url.searchParams.get('status') || undefined
  const buyerId = url.searchParams.get('buyerId') || undefined
  const campaignId = url.searchParams.get('campaignId') || undefined
  const upcoming = url.searchParams.get('upcoming') === 'true'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const where: Record<string, unknown> = { profileId: profile.id }

  if (filterStatus) {
    if (!VALID_STATUSES.includes(filterStatus)) {
      return errorResponse(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }
    where.status = filterStatus
  }

  if (buyerId) where.buyerId = buyerId
  if (campaignId) where.campaignId = campaignId

  if (upcoming) {
    where.status = 'scheduled'
    where.scheduledAt = { gte: new Date() }
  }

  const [callbacks, total] = await Promise.all([
    prisma.scheduledCallback.findMany({
      where,
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entityName: true,
            phone: true,
            email: true,
            state: true,
            buyerScore: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.scheduledCallback.count({ where }),
  ])

  // Annotate each callback with whether it's currently within calling hours
  const annotated = callbacks.map(cb => {
    let withinCallingHours = false
    if (cb.buyer?.phone && cb.buyer?.state) {
      try {
        const tz = getRecipientTimezone(cb.buyer.phone, cb.buyer.state)
        const result = isWithinCallingHours(tz, undefined, undefined, cb.buyer.state)
        withinCallingHours = result.allowed
      } catch { /* default false */ }
    }
    return { ...cb, withinCallingHours }
  })

  return successResponse({ callbacks: annotated, total, limit, offset })
}

// POST /api/outreach/callbacks — Manually schedule a callback
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
    .require('buyerId', body.buyerId, 'Buyer ID')
    .require('scheduledAt', body.scheduledAt, 'Scheduled time')

  if (body.source !== undefined) {
    v.enumValue('source', body.source, VALID_SOURCES, 'Source')
  }
  if (body.reason !== undefined) {
    v.string('reason', body.reason, { maxLength: 500, label: 'Reason' })
  }
  if (body.notes !== undefined) {
    v.string('notes', body.notes, { maxLength: 1000, label: 'Notes' })
  }

  if (!v.isValid()) return v.toResponse()

  // Verify buyer belongs to this user
  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: body.buyerId as string, profileId: profile.id },
  })
  if (!buyer) return errorResponse(404, 'Buyer not found')

  const scheduledAt = new Date(body.scheduledAt as string)
  if (isNaN(scheduledAt.getTime())) return errorResponse(400, 'Invalid scheduled time')
  if (scheduledAt < new Date()) return errorResponse(400, 'Scheduled time must be in the future')

  const callback = await prisma.scheduledCallback.create({
    data: {
      profileId: profile.id,
      buyerId: body.buyerId as string,
      campaignId: (body.campaignId as string) || null,
      scheduledAt,
      reason: (body.reason as string) || 'Manual callback',
      source: (body.source as string) || 'manual',
      notes: (body.notes as string) || null,
      previousCallId: (body.previousCallId as string) || null,
    },
  })

  return successResponse({ callback }, 201)
}
