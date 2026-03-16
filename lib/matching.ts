/**
 * Smart Deal Matching Engine — Scoring Service
 *
 * Pure functions that score deal-buyer compatibility across 5 weighted factors.
 * Supports configurable weights, batch ranking, and reverse lookups.
 * No database calls — all data passed in.
 */

// ─── DEFAULT WEIGHTS ─────────────────────────────────────────────────────────
// Sum to 100. Each factor produces a 0-100 sub-score, then is weighted.

/** How well the deal fits the buyer's buy box (property type, location, size) */
export const DEFAULT_WEIGHT_BUY_BOX = 25
/** Is the deal within the buyer's budget? */
export const DEFAULT_WEIGHT_PRICE = 25
/** Does the deal condition/type align with the buyer's investment strategy? */
export const DEFAULT_WEIGHT_STRATEGY = 20
/** How active/ready is this buyer right now? */
export const DEFAULT_WEIGHT_TIMING = 15
/** How likely is this buyer to actually close? */
export const DEFAULT_WEIGHT_CLOSE_PROB = 15

// ─── INPUT TYPES ─────────────────────────────────────────────────────────────

/** Property type — mirrors Prisma PropertyType enum */
export type PropertyType = 'SFR' | 'MULTI_FAMILY' | 'LAND' | 'COMMERCIAL' | 'MOBILE_HOME' | 'CONDO'

/** Investor strategy — mirrors Prisma InvestorStrategy enum */
export type InvestorStrategy = 'FLIP' | 'HOLD' | 'BOTH' | 'LAND' | 'COMMERCIAL'

/** Condition preference — mirrors Prisma ConditionPreference enum */
export type ConditionPreference = 'TURNKEY' | 'LIGHT_REHAB' | 'HEAVY_REHAB' | 'TEARDOWN' | 'ANY'

/** Buyer status — mirrors Prisma BuyerStatus enum */
export type BuyerStatus = 'ACTIVE' | 'DORMANT' | 'HIGH_CONFIDENCE' | 'RECENTLY_VERIFIED' | 'DO_NOT_CALL'

/** Configurable weights for each matching factor */
export interface MatchWeights {
  buyBox: number
  price: number
  strategy: number
  timing: number
  closeProb: number
}

/** Deal fields needed for matching — no Prisma dependency */
export interface DealForMatching {
  id: string
  city: string | null
  state: string | null
  zip: string | null
  propertyType: PropertyType | null
  askingPrice: number | null
  arv: number | null
  repairCost: number | null
  condition: string | null
  beds: number | null
  baths: number | null
  sqft: number | null
  yearBuilt: number | null
}

/** Buyer fields needed for matching — no Prisma dependency */
export interface BuyerForMatching {
  id: string
  preferredMarkets: string[]
  preferredTypes: PropertyType[]
  preferredZips: string[]
  strategy: InvestorStrategy | null
  conditionPreference: ConditionPreference | null
  minPrice: number | null
  maxPrice: number | null
  closeSpeedDays: number | null
  proofOfFundsVerified: boolean
  buyerScore: number
  status: BuyerStatus | null
  lastContactedAt: Date | null
  cashPurchaseCount: number
}

/** Result from a single deal-buyer match calculation */
export interface MatchResult {
  dealId: string
  buyerId: string
  matchScore: number
  buyBoxScore: number
  priceScore: number
  strategyScore: number
  timingScore: number
  closeProbScore: number
  breakdown: string[]
}

/** Options for batch ranking functions */
export interface RankingOptions {
  minScore?: number
  limit?: number
}

// ─── RESOLVE WEIGHTS ─────────────────────────────────────────────────────────

/** Merge partial custom weights with defaults */
export function resolveWeights(custom?: Partial<MatchWeights>): MatchWeights {
  return {
    buyBox: custom?.buyBox ?? DEFAULT_WEIGHT_BUY_BOX,
    price: custom?.price ?? DEFAULT_WEIGHT_PRICE,
    strategy: custom?.strategy ?? DEFAULT_WEIGHT_STRATEGY,
    timing: custom?.timing ?? DEFAULT_WEIGHT_TIMING,
    closeProb: custom?.closeProb ?? DEFAULT_WEIGHT_CLOSE_PROB,
  }
}

// ─── SCORING FACTORS ─────────────────────────────────────────────────────────

/**
 * Buy Box Score — does the deal match what the buyer wants?
 * Considers property type (40pts), location (30pts + 15pt zip bonus), and size (15pts).
 */
function scoreBuyBox(deal: DealForMatching, buyer: BuyerForMatching): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Property type match (40pts)
  if (deal.propertyType && buyer.preferredTypes.length > 0) {
    if (buyer.preferredTypes.includes(deal.propertyType)) {
      score += 40
      reasons.push(`Property type ${deal.propertyType} matches buyer preference`)
    } else {
      reasons.push(`Property type ${deal.propertyType} not in buyer preferences [${buyer.preferredTypes.join(', ')}]`)
    }
  } else if (buyer.preferredTypes.length === 0) {
    score += 40
    reasons.push('Buyer has no property type preference — full type points')
  }

  // Location match (30pts base + 15pts zip bonus)
  if (buyer.preferredMarkets.length === 0) {
    score += 30
    reasons.push('Buyer has no market preference — full location points')
  } else if (deal.city && deal.state) {
    const dealMarket = `${deal.city}, ${deal.state}`.toLowerCase()
    const marketMatch = buyer.preferredMarkets.some(
      (m) => m.toLowerCase() === dealMarket,
    )
    if (marketMatch) {
      score += 30
      reasons.push(`Deal in preferred market ${deal.city}, ${deal.state}`)
    } else {
      reasons.push(`Deal market ${deal.city}, ${deal.state} not in buyer's preferred markets`)
    }
  }

  // Zip bonus (15pts)
  if (deal.zip && buyer.preferredZips.length > 0 && buyer.preferredZips.includes(deal.zip)) {
    score += 15
    reasons.push(`Deal zip ${deal.zip} matches buyer preferred zip`)
  } else if (buyer.preferredZips.length === 0 && buyer.preferredMarkets.length === 0) {
    score += 15
    reasons.push('Buyer has no zip preference — full zip bonus')
  }

  // Size baseline (15pts)
  const meetsBaseline = (deal.beds == null || deal.beds >= 2) && (deal.sqft == null || deal.sqft >= 800)
  if (meetsBaseline) {
    score += 15
    reasons.push('Property meets baseline livability (beds >= 2, sqft >= 800)')
  } else {
    reasons.push('Property below baseline livability thresholds')
  }

  return { score: clamp(score, 0, 100), reasons }
}

/**
 * Price Score — is the deal within the buyer's budget?
 * Considers price range fit and deal spread (ARV vs asking).
 */
function scorePrice(deal: DealForMatching, buyer: BuyerForMatching): { score: number; reasons: string[] } {
  const reasons: string[] = []

  // No budget set → neutral
  if (buyer.minPrice == null && buyer.maxPrice == null) {
    reasons.push('Buyer has no price range set — neutral score')
    return { score: 70, reasons }
  }

  if (deal.askingPrice == null) {
    reasons.push('Deal has no asking price — neutral score')
    return { score: 70, reasons }
  }

  let baseScore = 0
  const min = buyer.minPrice ?? 0
  const max = buyer.maxPrice ?? Infinity

  if (deal.askingPrice >= min && deal.askingPrice <= max) {
    baseScore = 100
    reasons.push(`Asking price $${deal.askingPrice.toLocaleString()} within budget [$${min.toLocaleString()} - $${max === Infinity ? '∞' : max.toLocaleString()}]`)
  } else {
    // Calculate how far outside the range
    const distanceBelow = min > deal.askingPrice ? (min - deal.askingPrice) / min : 0
    const distanceAbove = max !== Infinity && deal.askingPrice > max ? (deal.askingPrice - max) / max : 0
    const distance = Math.max(distanceBelow, distanceAbove)

    if (distance <= 0.10) {
      baseScore = 60
      reasons.push(`Asking price $${deal.askingPrice.toLocaleString()} within 10% of budget range`)
    } else if (distance <= 0.20) {
      baseScore = 30
      reasons.push(`Asking price $${deal.askingPrice.toLocaleString()} within 20% of budget range`)
    } else {
      baseScore = 0
      reasons.push(`Asking price $${deal.askingPrice.toLocaleString()} more than 20% outside budget range`)
    }
  }

  // Spread bonus: (ARV - askingPrice) / ARV
  if (deal.arv && deal.askingPrice && deal.arv > 0) {
    const spread = (deal.arv - deal.askingPrice) / deal.arv
    if (spread > 0.30) {
      baseScore += 15
      reasons.push(`Deal spread ${Math.round(spread * 100)}% > 30% — bonus applied`)
    }
  }

  return { score: clamp(baseScore, 0, 100), reasons }
}

/**
 * Strategy Score — does the deal condition/type align with the buyer's strategy?
 * Cross-references investor strategy and condition preference.
 */
function scoreStrategy(deal: DealForMatching, buyer: BuyerForMatching): { score: number; reasons: string[] } {
  const reasons: string[] = []
  const condition = deal.condition?.toLowerCase() ?? null

  // Strategy-based scoring
  let strategyScore: number
  switch (buyer.strategy) {
    case 'FLIP': {
      if (condition === 'distressed' || condition === 'fair') { strategyScore = 100; reasons.push('Flip buyer + distressed/fair condition = ideal') }
      else if (condition === 'good') { strategyScore = 50; reasons.push('Flip buyer + good condition = moderate fit') }
      else if (condition === 'excellent') { strategyScore = 20; reasons.push('Flip buyer + excellent condition = poor fit') }
      else { strategyScore = 60; reasons.push('Flip buyer, no condition specified — neutral') }
      break
    }
    case 'HOLD': {
      if (condition === 'good' || condition === 'excellent') { strategyScore = 100; reasons.push('Hold buyer + good/excellent condition = ideal') }
      else if (condition === 'fair') { strategyScore = 70; reasons.push('Hold buyer + fair condition = moderate fit') }
      else if (condition === 'distressed') { strategyScore = 30; reasons.push('Hold buyer + distressed condition = poor fit') }
      else { strategyScore = 60; reasons.push('Hold buyer, no condition specified — neutral') }
      break
    }
    case 'BOTH': {
      const flipScore = condition === 'distressed' || condition === 'fair' ? 100
        : condition === 'good' ? 50 : condition === 'excellent' ? 20 : 60
      const holdScore = condition === 'good' || condition === 'excellent' ? 100
        : condition === 'fair' ? 70 : condition === 'distressed' ? 30 : 60
      strategyScore = Math.max(flipScore, holdScore)
      reasons.push(`Flip/hold buyer — best of flip(${flipScore}) and hold(${holdScore})`)
      break
    }
    case 'LAND': {
      strategyScore = deal.propertyType === 'LAND' ? 100 : 0
      reasons.push(deal.propertyType === 'LAND' ? 'Land strategy + land property = perfect' : 'Land strategy but property is not land')
      break
    }
    case 'COMMERCIAL': {
      const isCommercial = deal.propertyType === 'COMMERCIAL' || deal.propertyType === 'MULTI_FAMILY'
      strategyScore = isCommercial ? 100 : 0
      reasons.push(isCommercial ? 'Commercial strategy + commercial/multi-family = perfect' : 'Commercial strategy but property type mismatch')
      break
    }
    default: {
      strategyScore = 50
      reasons.push('Buyer has no strategy set — neutral score')
    }
  }

  // Cross-check condition preference
  let conditionBonus = 0
  if (buyer.conditionPreference) {
    switch (buyer.conditionPreference) {
      case 'TURNKEY':
        if (condition === 'good' || condition === 'excellent') conditionBonus = 10
        else if (condition === 'distressed') conditionBonus = -20
        break
      case 'LIGHT_REHAB':
        if (condition === 'fair') conditionBonus = 10
        break
      case 'HEAVY_REHAB':
      case 'TEARDOWN':
        if (condition === 'distressed') conditionBonus = 10
        break
      case 'ANY':
        conditionBonus = 10
        break
    }
    if (conditionBonus !== 0) {
      reasons.push(`Condition preference ${buyer.conditionPreference} ${conditionBonus > 0 ? 'bonus' : 'penalty'}: ${conditionBonus}`)
    }
  }

  return { score: clamp(strategyScore + conditionBonus, 0, 100), reasons }
}

/**
 * Timing Score — how active/ready is this buyer right now?
 * Based on buyer status and recency of last contact.
 */
function scoreTiming(buyer: BuyerForMatching): { score: number; reasons: string[] } {
  const reasons: string[] = []

  // Status base score
  let score: number
  switch (buyer.status) {
    case 'HIGH_CONFIDENCE': score = 100; reasons.push('Buyer status: HIGH_CONFIDENCE'); break
    case 'RECENTLY_VERIFIED': score = 90; reasons.push('Buyer status: RECENTLY_VERIFIED'); break
    case 'ACTIVE': score = 70; reasons.push('Buyer status: ACTIVE'); break
    case 'DORMANT': score = 20; reasons.push('Buyer status: DORMANT'); break
    case 'DO_NOT_CALL': score = 0; reasons.push('Buyer status: DO_NOT_CALL'); break
    default: score = 50; reasons.push('Buyer has no status set — neutral')
  }

  // Recency bonus
  if (buyer.lastContactedAt) {
    const daysSince = daysBetween(buyer.lastContactedAt, new Date())
    if (daysSince <= 7) { score += 20; reasons.push(`Last contacted ${daysSince}d ago — +20 recency bonus`) }
    else if (daysSince <= 14) { score += 10; reasons.push(`Last contacted ${daysSince}d ago — +10 recency bonus`) }
    else if (daysSince <= 30) { score += 5; reasons.push(`Last contacted ${daysSince}d ago — +5 recency bonus`) }
    else { reasons.push(`Last contacted ${daysSince}d ago — no recency bonus`) }
  } else {
    reasons.push('No last contact date — no recency bonus')
  }

  return { score: clamp(score, 0, 100), reasons }
}

/**
 * Close Probability Score — how likely is this buyer to actually close?
 * Based on buyer score, proof of funds, close speed, and purchase history.
 */
function scoreCloseProb(buyer: BuyerForMatching): { score: number; reasons: string[] } {
  const reasons: string[] = []

  // buyerScore as base (0-100)
  let score = clamp(buyer.buyerScore, 0, 100)
  reasons.push(`Buyer score base: ${score}`)

  // Proof of funds bonus
  if (buyer.proofOfFundsVerified) {
    score += 15
    reasons.push('Proof of funds verified — +15')
  }

  // Close speed bonus
  if (buyer.closeSpeedDays != null) {
    if (buyer.closeSpeedDays <= 7) { score += 10; reasons.push(`Close speed ${buyer.closeSpeedDays}d — +10`) }
    else if (buyer.closeSpeedDays <= 14) { score += 5; reasons.push(`Close speed ${buyer.closeSpeedDays}d — +5`) }
  }

  // Cash purchase count bonus
  if (buyer.cashPurchaseCount >= 5) { score += 10; reasons.push(`${buyer.cashPurchaseCount} cash purchases — +10`) }
  else if (buyer.cashPurchaseCount >= 2) { score += 5; reasons.push(`${buyer.cashPurchaseCount} cash purchases — +5`) }

  return { score: clamp(score, 0, 100), reasons }
}

// ─── MAIN MATCHING FUNCTION ──────────────────────────────────────────────────

/**
 * Calculate a deal-buyer match across 5 weighted factors.
 *
 * Each factor produces a 0-100 sub-score. The final matchScore is the
 * weighted average using the configured (or default) weights.
 *
 * @param deal - Deal record with property details
 * @param buyer - Buyer record with preferences and history
 * @param weights - Optional partial weight overrides (merged with defaults)
 */
export function calculateDealMatch(
  deal: DealForMatching,
  buyer: BuyerForMatching,
  weights?: Partial<MatchWeights>,
): MatchResult {
  const w = resolveWeights(weights)
  const totalWeight = w.buyBox + w.price + w.strategy + w.timing + w.closeProb

  const buyBox = scoreBuyBox(deal, buyer)
  const price = scorePrice(deal, buyer)
  const strategy = scoreStrategy(deal, buyer)
  const timing = scoreTiming(buyer)
  const closeProb = scoreCloseProb(buyer)

  const weightedSum =
    buyBox.score * w.buyBox +
    price.score * w.price +
    strategy.score * w.strategy +
    timing.score * w.timing +
    closeProb.score * w.closeProb

  const matchScore = clamp(Math.round(weightedSum / totalWeight), 0, 100)

  return {
    dealId: deal.id,
    buyerId: buyer.id,
    matchScore,
    buyBoxScore: buyBox.score,
    priceScore: price.score,
    strategyScore: strategy.score,
    timingScore: timing.score,
    closeProbScore: closeProb.score,
    breakdown: [
      ...buyBox.reasons,
      ...price.reasons,
      ...strategy.reasons,
      ...timing.reasons,
      ...closeProb.reasons,
    ],
  }
}

// ─── BATCH FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Score and rank all buyers for a given deal.
 *
 * Filters out buyers below minScore (default 20), sorts descending by
 * matchScore, and applies an optional limit. Designed for the API layer
 * to call with potentially thousands of buyers.
 *
 * @param deal - The deal to match against
 * @param buyers - Array of buyer records to score
 * @param weights - Optional partial weight overrides
 * @param options - minScore filter (default 20), result limit
 */
export function rankBuyersForDeal(
  deal: DealForMatching,
  buyers: BuyerForMatching[],
  weights?: Partial<MatchWeights>,
  options?: RankingOptions,
): MatchResult[] {
  const minScore = options?.minScore ?? 20
  const limit = options?.limit

  const results = buyers
    .map((buyer) => calculateDealMatch(deal, buyer, weights))
    .filter((r) => r.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)

  return limit ? results.slice(0, limit) : results
}

/**
 * Score and rank all deals for a given buyer (reverse lookup).
 *
 * Same logic as rankBuyersForDeal but from the buyer's perspective.
 * Used for the buyer-side marketplace.
 *
 * @param buyer - The buyer to match against
 * @param deals - Array of deal records to score
 * @param weights - Optional partial weight overrides
 * @param options - minScore filter (default 20), result limit
 */
export function rankDealsForBuyer(
  buyer: BuyerForMatching,
  deals: DealForMatching[],
  weights?: Partial<MatchWeights>,
  options?: RankingOptions,
): MatchResult[] {
  const minScore = options?.minScore ?? 20
  const limit = options?.limit

  const results = deals
    .map((deal) => calculateDealMatch(deal, buyer, weights))
    .filter((r) => r.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)

  return limit ? results.slice(0, limit) : results
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
