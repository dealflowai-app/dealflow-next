import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import {
  rankBuyersForDeal,
  type DealForMatching,
  type BuyerForMatching,
  type PropertyType,
  type InvestorStrategy,
  type ConditionPreference,
  type BuyerStatus,
} from '@/lib/matching'
import { logger } from '@/lib/logger'

// Fields selected from CashBuyer — BuyerForMatching fields + display fields
const BUYER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  entityName: true,
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
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(v: number | null): string {
  if (v == null) return 'N/A'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`
  return `$${v}`
}

function relativeTime(date: Date | null): string {
  if (!date) return 'Never'
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

// ─── POST /api/analysis/buyer-preview ────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const {
    city, state, zip, propertyType, askingPrice, arv,
    condition, beds, baths, sqft, yearBuilt,
  } = body as {
    city?: string
    state?: string
    zip?: string
    propertyType?: string
    askingPrice?: number
    arv?: number
    condition?: string
    beds?: number
    baths?: number
    sqft?: number
    yearBuilt?: number
  }

  if (!city || !state) {
    return errorResponse(400, 'city and state are required')
  }

  try {
    // Build a virtual DealForMatching (no saved deal needed)
    const dealInput: DealForMatching = {
      id: 'preview',
      city,
      state,
      zip: zip ?? null,
      propertyType: (propertyType as PropertyType) ?? null,
      askingPrice: askingPrice ?? null,
      arv: arv ?? null,
      repairCost: null,
      condition: condition ?? null,
      beds: beds ?? null,
      baths: baths != null ? Math.floor(baths) : null,
      sqft: sqft ?? null,
      yearBuilt: yearBuilt ?? null,
    }

    // Pre-filter buyers: same logic as the deal matching endpoint
    const priceThreshold = askingPrice ? Math.round(askingPrice * 0.8) : 0
    const buyers = await prisma.cashBuyer.findMany({
      where: {
        profileId: profile.id,
        isOptedOut: false,
        status: { not: 'DO_NOT_CALL' },
        ...(askingPrice ? {
          OR: [
            { maxPrice: null },
            { maxPrice: { gte: priceThreshold } },
          ],
        } : {}),
      },
      select: BUYER_SELECT,
    })

    // Map to matching engine types
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

    // Run matching with minScore 30, limit 10
    const results = rankBuyersForDeal(dealInput, buyerInputs, undefined, {
      minScore: 30,
      limit: 10,
    })

    // Build response with display info
    const buyerMap = new Map(buyers.map((b) => [b.id, b]))

    const matches = results.map((r) => {
      const b = buyerMap.get(r.buyerId)!
      const name = [b.firstName, b.lastName].filter(Boolean).join(' ') || b.entityName || 'Unknown'
      return {
        buyerId: b.id,
        name,
        matchScore: r.matchScore,
        buyBoxScore: r.buyBoxScore,
        priceScore: r.priceScore,
        strategyScore: r.strategyScore,
        timingScore: r.timingScore,
        closeProbScore: r.closeProbScore,
        status: b.status ?? 'ACTIVE',
        buyerScore: b.buyerScore,
        strategy: b.strategy,
        preferredTypes: b.preferredTypes,
        priceRange: `${formatPrice(b.minPrice)} - ${formatPrice(b.maxPrice)}`,
        closeSpeed: b.closeSpeedDays != null ? `${b.closeSpeedDays} days` : null,
        proofOfFunds: b.proofOfFundsVerified,
        lastContacted: relativeTime(b.lastContactedAt),
      }
    })

    return successResponse({
      matches,
      totalBuyers: buyers.length,
      matchedCount: results.length,
      topScore: results[0]?.matchScore ?? 0,
    })
  } catch (err) {
    logger.error('Buyer preview failed', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
    })
    return errorResponse(500, 'Internal server error')
  }
}
