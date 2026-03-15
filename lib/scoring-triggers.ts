/**
 * Scoring Triggers — Auto-refresh a buyer's score after state changes.
 *
 * Call refreshBuyerScore() from any route that modifies buyer-related data
 * (call completed, deal matched, offer received, etc).
 */

import { prisma } from '@/lib/prisma'
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
 * Fetch a buyer and all related data, recalculate their score, and persist it.
 * Loads the owning user's ScoringConfig for custom weights/thresholds.
 * Respects scorePinned — if pinned, returns current score without recalculating.
 * Returns the new score breakdown, or null if the buyer was not found.
 */
export async function refreshBuyerScore(buyerId: string) {
  const buyer = await prisma.cashBuyer.findUnique({
    where: { id: buyerId },
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

  if (!buyer) return null

  // If score is pinned, don't recalculate
  if (buyer.scorePinned) {
    return {
      total: buyer.buyerScore,
      isPinned: true,
      status: buyer.status,
    }
  }

  // Load per-user scoring config if this buyer belongs to a profile
  let config = undefined
  if (buyer.profileId) {
    const dbConfig = await prisma.scoringConfig.findUnique({
      where: { profileId: buyer.profileId },
    })
    config = dbConfigToScoringConfig(dbConfig)
  }

  const breakdown = calculateBuyerScore(
    buyer as unknown as BuyerForScoring,
    buyer.campaignCalls as CallForScoring[],
    buyer.dealMatches as MatchForScoring[],
    buyer.offers as OfferForScoring[],
    config,
  )

  const status = determineBuyerStatus(
    breakdown.total,
    buyer.lastContactedAt,
    buyer.lastVerifiedAt,
    config,
  )

  await prisma.cashBuyer.update({
    where: { id: buyerId },
    data: {
      buyerScore: breakdown.total,
      status,
    },
  })

  return { ...breakdown, status }
}
