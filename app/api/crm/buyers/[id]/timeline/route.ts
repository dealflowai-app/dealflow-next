import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'

/**
 * GET /api/crm/buyers/[id]/timeline
 *
 * Paginated activity timeline for a single buyer.
 * Query params:
 *   - cursor: string  — id of last event (cursor-based pagination)
 *   - limit: number   — events per page (default 25, max 100)
 *   - type: string    — filter by event type (e.g. "edited", "score_updated")
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params
    const searchParams = req.nextUrl.searchParams
    const cursor = searchParams.get('cursor') || undefined
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')))
    const typeFilter = searchParams.get('type') || undefined

    // Verify buyer belongs to user
    const buyer = await prisma.cashBuyer.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true },
    })
    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const where = {
      buyerId: id,
      profileId: profile.id,
      ...(typeFilter ? { type: typeFilter } : {}),
    }

    const events = await prisma.activityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // fetch one extra to detect hasMore
      ...(cursor
        ? { skip: 1, cursor: { id: cursor } }
        : {}),
    })

    const hasMore = events.length > limit
    if (hasMore) events.pop()

    const nextCursor = events.length > 0 ? events[events.length - 1].id : null

    return NextResponse.json({
      events,
      pagination: {
        nextCursor: hasMore ? nextCursor : null,
        hasMore,
        count: events.length,
      },
    })
  } catch (err) {
    logger.error('GET /api/crm/buyers/[id]/timeline error', { route: '/api/crm/buyers/[id]/timeline', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 })
  }
}
