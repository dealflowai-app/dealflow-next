import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import {
  calculateBuyerScore,
  determineBuyerStatus,
  applyScoreDecay,
  dbConfigToScoringConfig,
  type BuyerForScoring,
  type CallForScoring,
  type MatchForScoring,
  type OfferForScoring,
} from '@/lib/scoring'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const BATCH_SIZE = 50

/**
 * POST /api/crm/buyers/rescore
 *
 * NOTE: This endpoint is expensive — it rescores ALL buyers. In production,
 * add rate limiting (e.g., max 1 call per 5 minutes per user).
 *
 * Recalculate scores for all non-opted-out buyers belonging to the current user.
 * - Loads the user's ScoringConfig for custom weights/thresholds/decay
 * - Skips buyers with scorePinned = true
 * - Applies score decay automatically
 * - Processes in batches of 50 to avoid memory issues
 */
export async function POST() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Rate limit: 1 rescore per 5 minutes
    const rl = rateLimit(`rescore:${profile.id}`, 1, 300_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    // Load user's scoring config once
    const dbConfig = await prisma.scoringConfig.findUnique({
      where: { profileId: profile.id },
    })
    const config = dbConfigToScoringConfig(dbConfig)

    const totalBuyers = await prisma.cashBuyer.count({
      where: { profileId: profile.id, isOptedOut: false },
    })

    let totalProcessed = 0
    let totalSkipped = 0
    let scoreSum = 0
    const statusBreakdown: Record<string, number> = {}

    let cursor: string | undefined

    while (totalProcessed + totalSkipped < totalBuyers) {
      const buyers = await prisma.cashBuyer.findMany({
        where: { profileId: profile.id, isOptedOut: false },
        include: {
          campaignCalls: { select: { outcome: true } },
          dealMatches: {
            select: { outreachSent: true, viewed: true, dealId: true, buyerId: true },
          },
          offers: {
            select: { status: true, dealId: true, buyerId: true },
          },
        },
        take: BATCH_SIZE,
        ...(cursor
          ? { skip: 1, cursor: { id: cursor } }
          : {}),
        orderBy: { id: 'asc' },
      })

      if (buyers.length === 0) break

      for (const buyer of buyers) {
        // Skip pinned buyers
        if (buyer.scorePinned) {
          totalSkipped++
          scoreSum += buyer.buyerScore
          statusBreakdown[buyer.status] = (statusBreakdown[buyer.status] || 0) + 1
          continue
        }

        const breakdown = calculateBuyerScore(
          buyer as unknown as BuyerForScoring,
          buyer.campaignCalls as CallForScoring[],
          buyer.dealMatches as MatchForScoring[],
          buyer.offers as OfferForScoring[],
          config,
        )

        // Apply time-based decay with user's config
        const decayedScore = applyScoreDecay(breakdown.total, buyer.lastContactedAt, config)

        const newStatus = determineBuyerStatus(
          decayedScore,
          buyer.lastContactedAt,
          buyer.lastVerifiedAt,
          config,
        )

        await prisma.cashBuyer.update({
          where: { id: buyer.id },
          data: {
            buyerScore: decayedScore,
            status: newStatus,
          },
        })

        totalProcessed++
        scoreSum += decayedScore
        statusBreakdown[newStatus] = (statusBreakdown[newStatus] || 0) + 1
      }

      cursor = buyers[buyers.length - 1].id
    }

    const totalCounted = totalProcessed + totalSkipped

    return NextResponse.json({
      totalProcessed,
      totalSkipped,
      averageScore: totalCounted > 0 ? Math.round(scoreSum / totalCounted) : 0,
      statusBreakdown,
    })
  } catch (err) {
    console.error('POST /api/crm/buyers/rescore error:', err)
    return NextResponse.json({ error: 'Failed to rescore buyers' }, { status: 500 })
  }
}
