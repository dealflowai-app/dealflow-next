/**
 * Auto-Match Service
 *
 * Runs matching for a deal, persists DealMatch records, creates
 * in-app notifications for both the wholesaler and matched buyers
 * (if they have alertsEnabled), and optionally triggers outreach.
 *
 * Used by:
 *  - POST /api/deals (on creation, fire-and-forget)
 *  - POST /api/deals/[id]/auto-match (manual trigger with notify)
 */

import { prisma } from '@/lib/prisma'
import {
  rankBuyersForDeal,
  type DealForMatching,
  type BuyerForMatching,
  type PropertyType,
  type InvestorStrategy,
  type ConditionPreference,
  type BuyerStatus,
} from '@/lib/matching'
import { createNotification } from '@/lib/notifications'
import { logBulkActivity } from '@/lib/activity'
import { logger } from '@/lib/logger'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AutoMatchOptions {
  /** Minimum score to consider a match (default: 40) */
  minScore?: number
  /** Maximum matches to persist (default: 50) */
  limit?: number
  /** Create in-app notifications for matched buyers with alertsEnabled (default: true) */
  notifyBuyers?: boolean
  /** Create a summary notification for the wholesaler (default: true) */
  notifyWholesaler?: boolean
}

export interface AutoMatchResult {
  dealId: string
  total: number
  matched: number
  notified: number
}

// ─── Buyer select fields ────────────────────────────────────────────────────

const BUYER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  entityName: true,
  phone: true,
  email: true,
  preferredMarkets: true,
  preferredTypes: true,
  preferredZips: true,
  strategy: true,
  conditionPreference: true,
  minPrice: true,
  maxPrice: true,
  closeSpeedDays: true,
  proofOfFundsVerified: true,
  buyerScore: true,
  status: true,
  lastContactedAt: true,
  cashPurchaseCount: true,
  alertsEnabled: true,
  alertFrequency: true,
  profileId: true,
} as const

// ─── Main function ──────────────────────────────────────────────────────────

export async function autoMatchDeal(
  dealId: string,
  profileId: string,
  options?: AutoMatchOptions,
): Promise<AutoMatchResult> {
  const minScore = options?.minScore ?? 40
  const limit = options?.limit ?? 50
  const notifyBuyers = options?.notifyBuyers ?? true
  const notifyWholesaler = options?.notifyWholesaler ?? true

  // Fetch deal
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, profileId },
  })
  if (!deal) throw new Error('Deal not found')

  // Fetch eligible buyers (pre-filter by price proximity)
  const priceThreshold = deal.askingPrice ? Math.round(deal.askingPrice * 0.8) : 0
  const buyers = await prisma.cashBuyer.findMany({
    where: {
      profileId,
      isOptedOut: false,
      status: { not: 'DO_NOT_CALL' },
      contactType: { in: ['BUYER', 'BOTH'] },
      OR: [
        { maxPrice: null },
        { maxPrice: { gte: priceThreshold } },
      ],
    },
    select: BUYER_SELECT,
  })

  // Map to matching engine types
  const dealInput: DealForMatching = {
    id: deal.id,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
    propertyType: deal.propertyType as PropertyType,
    askingPrice: deal.askingPrice,
    arv: deal.arv,
    repairCost: deal.repairCost,
    condition: deal.condition,
    beds: deal.beds,
    baths: deal.baths != null ? Math.floor(deal.baths) : null,
    sqft: deal.sqft,
    yearBuilt: deal.yearBuilt,
  }

  const buyerInputs: BuyerForMatching[] = buyers.map((b) => ({
    id: b.id,
    preferredMarkets: b.preferredMarkets,
    preferredTypes: b.preferredTypes as PropertyType[],
    preferredZips: b.preferredZips,
    strategy: b.strategy as InvestorStrategy | null,
    conditionPreference: b.conditionPreference as ConditionPreference | null,
    minPrice: b.minPrice,
    maxPrice: b.maxPrice,
    closeSpeedDays: b.closeSpeedDays,
    proofOfFundsVerified: b.proofOfFundsVerified,
    buyerScore: b.buyerScore,
    status: b.status as BuyerStatus,
    lastContactedAt: b.lastContactedAt,
    cashPurchaseCount: b.cashPurchaseCount,
  }))

  // Run matching engine
  const results = rankBuyersForDeal(dealInput, buyerInputs, undefined, { minScore, limit })

  // Persist: delete old + create new matches
  await prisma.$transaction([
    prisma.dealMatch.deleteMany({ where: { dealId: deal.id } }),
    prisma.dealMatch.createMany({
      data: results.map((r) => ({
        dealId: deal.id,
        buyerId: r.buyerId,
        matchScore: r.matchScore,
        buyBoxScore: r.buyBoxScore,
        priceScore: r.priceScore,
        strategyScore: r.strategyScore,
        timingScore: r.timingScore,
        closeProbScore: r.closeProbScore,
      })),
    }),
  ])

  // Build buyer lookup
  const buyerMap = new Map(buyers.map((b) => [b.id, b]))
  const dealAddress = [deal.address, deal.city, deal.state].filter(Boolean).join(', ')

  // Log activity for matched buyers
  logBulkActivity(
    results.map((r) => ({
      buyerId: r.buyerId,
      profileId,
      type: 'deal_matched',
      title: `Matched to deal at ${dealAddress}`,
      metadata: {
        dealId: deal.id,
        matchScore: r.matchScore,
      },
    })),
  )

  // Notify buyers with alertsEnabled (batched to avoid N+1 DB calls)
  let notifiedCount = 0
  if (notifyBuyers && results.length > 0) {
    const buyersToNotify = results.filter((r) => {
      const buyer = buyerMap.get(r.buyerId)
      return buyer?.alertsEnabled && buyer.alertFrequency === 'realtime'
    })

    if (buyersToNotify.length > 0) {
      const notificationPromises = buyersToNotify.map((match) => {
        const buyer = buyerMap.get(match.buyerId)
        if (!buyer) return null
        return createNotification(
          profileId,
          'deal_match',
          `New match: ${buyerName(buyer)} (${match.matchScore}pts)`,
          `${buyerName(buyer)} matches your deal at ${dealAddress}`,
          {
            dealId: deal.id,
            buyerId: match.buyerId,
            matchScore: match.matchScore,
          },
        )
      }).filter(Boolean)

      await Promise.allSettled(notificationPromises)
      notifiedCount = buyersToNotify.length
    }
  }

  // Notify wholesaler with summary
  if (notifyWholesaler && results.length > 0) {
    const topScore = results[0]?.matchScore ?? 0
    const topBuyer = buyerMap.get(results[0]?.buyerId ?? '')
    const topName = topBuyer ? buyerName(topBuyer) : 'Unknown'

    createNotification(
      profileId,
      'deal_match',
      `${results.length} buyer${results.length === 1 ? '' : 's'} matched`,
      `Best match: ${topName} (${topScore}pts) for ${dealAddress}`,
      {
        dealId: deal.id,
        matchCount: results.length,
        topMatchScore: topScore,
      },
    )
  }

  logger.info('Auto-match completed', {
    dealId,
    total: buyers.length,
    matched: results.length,
    notified: notifiedCount,
  })

  return {
    dealId: deal.id,
    total: buyers.length,
    matched: results.length,
    notified: notifiedCount,
  }
}

function buyerName(b: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  return [b.firstName, b.lastName].filter(Boolean).join(' ') || b.entityName || 'Unknown'
}
