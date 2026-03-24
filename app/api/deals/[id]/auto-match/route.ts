import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { autoMatchDeal } from '@/lib/auto-match'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/deals/[id]/auto-match
 *
 * Runs the 5-factor matching engine, persists DealMatch records,
 * creates in-app notifications for the wholesaler and eligible buyers,
 * and returns a summary.
 *
 * Body (all optional):
 *   { minScore?: number, limit?: number, notifyBuyers?: boolean }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const rl = rateLimit(`auto-match:${profile.id}`, 10, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { id } = await params

    // Parse optional body with validation
    let minScore: number | undefined
    let limit: number | undefined
    let notifyBuyers: boolean | undefined
    try {
      const body = await req.json()
      if (body.minScore != null) {
        minScore = Number(body.minScore)
        if (isNaN(minScore) || minScore < 0 || minScore > 100) minScore = 40
      }
      if (body.limit != null) {
        limit = Number(body.limit)
        if (isNaN(limit) || limit < 1 || limit > 500) limit = 50
      }
      notifyBuyers = body.notifyBuyers != null ? Boolean(body.notifyBuyers) : undefined
    } catch {
      // No body — use defaults
    }

    const result = await autoMatchDeal(id, profile.id, {
      minScore,
      limit,
      notifyBuyers,
      notifyWholesaler: true,
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'Deal not found') {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }
    logger.error('POST /api/deals/[id]/auto-match failed', {
      route: '/api/deals/[id]/auto-match',
      method: 'POST',
      error: message,
    })
    return NextResponse.json(
      { error: 'Auto-match failed', detail: message },
      { status: 500 },
    )
  }
}
