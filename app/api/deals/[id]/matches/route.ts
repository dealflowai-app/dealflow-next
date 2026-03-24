import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { findMatchingBuyers } from '@/lib/buyer-matching'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * GET /api/deals/[id]/matches
 *
 * Returns the top 10 matching buyers for a deal using the smart
 * buyer matching algorithm (market 40pts, price 25pts, strategy 20pts,
 * buyer score 15pts).
 *
 * Auth required — scoped to the authenticated user's profile.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) {
      return NextResponse.json({ error }, { status })
    }

    const rl = rateLimit(`matches:${profile.id}`, 30, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { id } = await params

    // Verify deal ownership before returning matches
    const deal = await prisma.deal.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true },
    })
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const matches = await findMatchingBuyers(id, profile.id)

    return NextResponse.json({ matches })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (message === 'Deal not found') {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    logger.error('GET /api/deals/[id]/matches failed', {
      route: '/api/deals/[id]/matches',
      method: 'GET',
      error: message,
    })
    return NextResponse.json(
      { error: 'Failed to find matching buyers', detail: message },
      { status: 500 },
    )
  }
}
