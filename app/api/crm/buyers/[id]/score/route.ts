import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { logger } from '@/lib/logger'
import {
  calculateBuyerScore,
  determineBuyerStatus,
  dbConfigToScoringConfig,
  type BuyerForScoring,
  type CallForScoring,
  type MatchForScoring,
  type OfferForScoring,
} from '@/lib/scoring'

/**
 * POST /api/crm/buyers/[id]/score
 *
 * Recalculate a single buyer's score and persist it.
 * Respects scorePinned (skips recalc) and scoreOverride (uses override as base).
 * Loads the user's ScoringConfig for custom weights/thresholds.
 *
 * Optional body params for manual overrides:
 * - scoreOverride: number | null   — set a manual score (null to clear)
 * - scoreAdjustment: number        — +/- adjustment on top of calculated score
 * - scorePinned: boolean           — lock score from auto-recalculation
 * - overrideReason: string         — why the override was set
 * - customTags: string[]           — tags applied to this buyer
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params
    const body = await req.json().catch(() => ({}))

    // Apply manual override fields if provided
    const overrideData: Record<string, unknown> = {}
    if ('scoreOverride' in body) {
      overrideData.scoreOverride = body.scoreOverride
      overrideData.overrideSetAt = body.scoreOverride != null ? new Date() : null
    }
    if ('scoreAdjustment' in body) overrideData.scoreAdjustment = body.scoreAdjustment
    if ('scorePinned' in body) overrideData.scorePinned = body.scorePinned
    if ('overrideReason' in body) overrideData.overrideReason = body.overrideReason
    if ('customTags' in body) overrideData.customTags = body.customTags

    // If overrides were sent, apply them first
    if (Object.keys(overrideData).length > 0) {
      await prisma.cashBuyer.update({
        where: { id },
        data: overrideData,
      })
    }

    // Fetch buyer with updated fields
    const buyer = await prisma.cashBuyer.findFirst({
      where: { id, profileId: profile.id },
      include: {
        campaignCalls: { select: { outcome: true } },
        dealMatches: {
          select: { outreachSent: true, viewed: true, dealId: true, buyerId: true },
        },
        offers: {
          select: { status: true, dealId: true, buyerId: true },
        },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // If pinned and no overrides were sent, return current score
    if (buyer.scorePinned && Object.keys(overrideData).length === 0) {
      return NextResponse.json({
        buyerId: id,
        total: buyer.buyerScore,
        isPinned: true,
        status: buyer.status,
        message: 'Score is pinned. Send scorePinned: false to unlock.',
      })
    }

    // Load user's scoring config
    const dbConfig = await prisma.scoringConfig.findUnique({
      where: { profileId: profile.id },
    })
    const config = dbConfigToScoringConfig(dbConfig)

    const breakdown = calculateBuyerScore(
      buyer as unknown as BuyerForScoring,
      buyer.campaignCalls as CallForScoring[],
      buyer.dealMatches as MatchForScoring[],
      buyer.offers as OfferForScoring[],
      config,
    )

    const newStatus = determineBuyerStatus(
      breakdown.total,
      buyer.lastContactedAt,
      buyer.lastVerifiedAt,
      config,
    )

    await prisma.cashBuyer.update({
      where: { id },
      data: {
        buyerScore: breakdown.total,
        status: newStatus,
      },
    })

    logActivity({
      buyerId: id,
      profileId: profile.id,
      type: 'score_updated',
      title: `Score updated from ${buyer.buyerScore} to ${breakdown.total}`,
      metadata: {
        oldScore: buyer.buyerScore,
        newScore: breakdown.total,
        oldStatus: buyer.status,
        newStatus,
        breakdown,
      },
    })

    return NextResponse.json({
      buyerId: id,
      previousScore: buyer.buyerScore,
      ...breakdown,
      status: newStatus,
    })
  } catch (err) {
    logger.error('POST /api/crm/buyers/[id]/score error', { route: '/api/crm/buyers/[id]/score', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to recalculate score' }, { status: 500 })
  }
}
