/**
 * Smart Buyer Matching Algorithm
 *
 * Scores buyers against a deal using four weighted factors:
 *   - Market match  (40 pts): buyer's preferredMarkets or city/state match
 *   - Price range   (25 pts): deal askingPrice within buyer's budget
 *   - Strategy match (20 pts): buyer strategy aligns with deal condition
 *   - Buyer score   (15 pts): linear scale of buyerScore 0-100 -> 0-15
 *
 * Returns top 10 matches sorted by total score with full breakdown.
 */

import { prisma } from '@/lib/prisma'

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  market: number       // 0-40
  priceRange: number   // 0-25
  strategy: number     // 0-20
  buyerScore: number   // 0-15
}

export interface MatchResult {
  buyerId: string
  buyerName: string
  phone: string | null
  email: string | null
  entityName: string | null
  status: string
  strategy: string | null
  totalScore: number   // 0-100
  breakdown: ScoreBreakdown
  reasons: string[]
}

interface DealData {
  id: string
  city: string
  state: string
  zip: string
  askingPrice: number
  condition: string | null
  propertyType: string
}

interface BuyerData {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  preferredMarkets: string[]
  preferredZips: string[]
  strategy: string | null
  minPrice: number | null
  maxPrice: number | null
  buyerScore: number
  status: string
  isOptedOut: boolean
}

// ─── SCORING FUNCTIONS ──────────────────────────────────────────────────────

/**
 * Market match (max 40 points).
 * Full points if buyer's preferredMarkets includes the deal's city/state,
 * or if buyer's city/state matches the deal's city/state.
 * Partial points for same-state match. Zero if no overlap.
 */
function scoreMarket(deal: DealData, buyer: BuyerData): { score: number; reasons: string[] } {
  const reasons: string[] = []

  // If buyer has no market preferences and no city/state, give neutral score
  if (buyer.preferredMarkets.length === 0 && !buyer.city && !buyer.state) {
    reasons.push('No market preference set — neutral (24/40)')
    return { score: 24, reasons }
  }

  const dealMarket = `${deal.city}, ${deal.state}`.toLowerCase()

  // Check preferredMarkets array
  if (buyer.preferredMarkets.length > 0) {
    const exactMatch = buyer.preferredMarkets.some(
      (m) => m.toLowerCase() === dealMarket
    )
    if (exactMatch) {
      // Check zip bonus too
      const zipBonus = buyer.preferredZips.length > 0 && buyer.preferredZips.includes(deal.zip) ? 5 : 0
      reasons.push(`Preferred market match: ${deal.city}, ${deal.state}`)
      if (zipBonus > 0) reasons.push(`Zip code ${deal.zip} also in preferred zips (+5)`)
      return { score: Math.min(35 + zipBonus, 40), reasons }
    }

    // Check state-only match from preferredMarkets
    const stateMatch = buyer.preferredMarkets.some(
      (m) => m.toLowerCase().endsWith(`, ${deal.state.toLowerCase()}`)
    )
    if (stateMatch) {
      reasons.push(`Same state (${deal.state}) but different city`)
      return { score: 20, reasons }
    }
  }

  // Fall back to buyer's own city/state
  if (buyer.city && buyer.state) {
    if (
      buyer.city.toLowerCase() === deal.city.toLowerCase() &&
      buyer.state.toLowerCase() === deal.state.toLowerCase()
    ) {
      reasons.push(`Buyer located in same market: ${deal.city}, ${deal.state}`)
      return { score: 35, reasons }
    }
    if (buyer.state.toLowerCase() === deal.state.toLowerCase()) {
      reasons.push(`Buyer in same state (${deal.state}) but different city`)
      return { score: 18, reasons }
    }
  }

  reasons.push(`No market overlap with ${deal.city}, ${deal.state}`)
  return { score: 0, reasons }
}

/**
 * Price range (max 25 points).
 * Full points if deal askingPrice is within buyer's min/max range.
 * Partial points if within 15% of range boundary.
 */
function scorePriceRange(deal: DealData, buyer: BuyerData): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const price = deal.askingPrice

  // No budget set — neutral
  if (buyer.minPrice == null && buyer.maxPrice == null) {
    reasons.push('No price range set — neutral (15/25)')
    return { score: 15, reasons }
  }

  const min = buyer.minPrice ?? 0
  const max = buyer.maxPrice ?? Infinity

  if (price >= min && price <= max) {
    reasons.push(`Asking $${price.toLocaleString()} within budget [$${min.toLocaleString()} - ${max === Infinity ? 'unlimited' : '$' + max.toLocaleString()}]`)
    return { score: 25, reasons }
  }

  // How far outside?
  const belowDist = min > price ? (min - price) / min : 0
  const aboveDist = max !== Infinity && price > max ? (price - max) / max : 0
  const distance = Math.max(belowDist, aboveDist)

  if (distance <= 0.15) {
    reasons.push(`Asking $${price.toLocaleString()} within 15% of budget range`)
    return { score: 12, reasons }
  }

  if (distance <= 0.30) {
    reasons.push(`Asking $${price.toLocaleString()} within 30% of budget range`)
    return { score: 5, reasons }
  }

  reasons.push(`Asking $${price.toLocaleString()} more than 30% outside budget`)
  return { score: 0, reasons }
}

/**
 * Strategy match (max 20 points).
 * Maps deal condition to expected buyer strategy.
 * "distressed"/"fair" -> FLIP preferred
 * "good"/"excellent" -> HOLD preferred
 * BOTH always gets decent score
 */
function scoreStrategy(deal: DealData, buyer: BuyerData): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const condition = deal.condition?.toLowerCase() ?? null

  if (!buyer.strategy) {
    reasons.push('No strategy set — neutral (10/20)')
    return { score: 10, reasons }
  }

  if (buyer.strategy === 'BOTH') {
    reasons.push('Buyer open to flip & hold — strong fit')
    return { score: 16, reasons }
  }

  if (buyer.strategy === 'LAND') {
    const isLand = deal.propertyType === 'LAND'
    reasons.push(isLand ? 'Land strategy + land deal = perfect' : 'Land strategy but property is not land')
    return { score: isLand ? 20 : 0, reasons }
  }

  if (buyer.strategy === 'COMMERCIAL') {
    const isComm = deal.propertyType === 'COMMERCIAL' || deal.propertyType === 'MULTI_FAMILY'
    reasons.push(isComm ? 'Commercial strategy + commercial property' : 'Commercial strategy but residential property')
    return { score: isComm ? 20 : 0, reasons }
  }

  if (!condition) {
    reasons.push(`${buyer.strategy} buyer, no condition on deal — neutral`)
    return { score: 10, reasons }
  }

  // FLIP buyer
  if (buyer.strategy === 'FLIP') {
    if (condition === 'distressed') {
      reasons.push('Flip buyer + distressed = ideal')
      return { score: 20, reasons }
    }
    if (condition === 'fair') {
      reasons.push('Flip buyer + fair condition = good fit')
      return { score: 16, reasons }
    }
    if (condition === 'good') {
      reasons.push('Flip buyer + good condition = moderate fit')
      return { score: 8, reasons }
    }
    reasons.push('Flip buyer + excellent condition = poor fit')
    return { score: 3, reasons }
  }

  // HOLD buyer
  if (buyer.strategy === 'HOLD') {
    if (condition === 'excellent' || condition === 'good') {
      reasons.push('Hold buyer + good/excellent = ideal')
      return { score: 20, reasons }
    }
    if (condition === 'fair') {
      reasons.push('Hold buyer + fair condition = moderate fit')
      return { score: 12, reasons }
    }
    reasons.push('Hold buyer + distressed = poor fit')
    return { score: 4, reasons }
  }

  return { score: 10, reasons: ['Unknown strategy — neutral'] }
}

/**
 * Buyer score (max 15 points).
 * Linear scale from buyerScore (0-100) to (0-15).
 */
function scoreBuyerQuality(buyer: BuyerData): { score: number; reasons: string[] } {
  const raw = Math.max(0, Math.min(100, buyer.buyerScore))
  const scaled = Math.round((raw / 100) * 15)
  return {
    score: scaled,
    reasons: [`Buyer score ${raw}/100 -> ${scaled}/15`],
  }
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Find the top matching buyers for a given deal.
 *
 * Fetches the deal and all eligible buyers from the database,
 * scores each buyer, and returns the top 10 sorted by total score.
 *
 * @param dealId - The deal to match buyers against
 * @param profileId - The wholesaler's profile ID (for ownership check & buyer scope)
 * @returns Top 10 MatchResult[] sorted by totalScore descending
 */
export async function findMatchingBuyers(
  dealId: string,
  profileId: string,
): Promise<MatchResult[]> {
  // Fetch deal
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, profileId },
  })

  if (!deal) {
    throw new Error('Deal not found')
  }

  // Fetch all eligible buyers for this profile
  const buyers = await prisma.cashBuyer.findMany({
    where: {
      profileId,
      isOptedOut: false,
      status: { not: 'DO_NOT_CALL' },
      contactType: { in: ['BUYER', 'BOTH'] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      entityName: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      preferredMarkets: true,
      preferredZips: true,
      strategy: true,
      minPrice: true,
      maxPrice: true,
      buyerScore: true,
      status: true,
      isOptedOut: true,
    },
  })

  const dealData: DealData = {
    id: deal.id,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
    askingPrice: deal.askingPrice,
    condition: deal.condition,
    propertyType: deal.propertyType,
  }

  // Score each buyer
  const results: MatchResult[] = buyers.map((buyer) => {
    const market = scoreMarket(dealData, buyer)
    const priceRange = scorePriceRange(dealData, buyer)
    const strategy = scoreStrategy(dealData, buyer)
    const quality = scoreBuyerQuality(buyer)

    const breakdown: ScoreBreakdown = {
      market: market.score,
      priceRange: priceRange.score,
      strategy: strategy.score,
      buyerScore: quality.score,
    }

    const totalScore = breakdown.market + breakdown.priceRange + breakdown.strategy + breakdown.buyerScore

    const name = [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || buyer.entityName || 'Unknown'

    return {
      buyerId: buyer.id,
      buyerName: name,
      phone: buyer.phone,
      email: buyer.email,
      entityName: buyer.entityName,
      status: buyer.status,
      strategy: buyer.strategy,
      totalScore,
      breakdown,
      reasons: [...market.reasons, ...priceRange.reasons, ...strategy.reasons, ...quality.reasons],
    }
  })

  // Sort by total score descending, take top 10
  results.sort((a, b) => b.totalScore - a.totalScore)
  return results.slice(0, 10)
}
