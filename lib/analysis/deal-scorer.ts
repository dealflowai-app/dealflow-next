/**
 * Deal Score Calculator
 *
 * Produces a 0-100 deal score with letter grade, factor breakdown,
 * human-readable strengths/risks, and a buy/pass recommendation.
 * Pure function, no DB or API calls.
 */

import type { ARVResult } from './arv-calculator'
import type { FlipAnalysis } from './flip-calculator'
import type { RentalAnalysis } from './rental-calculator'
import type { NeighborhoodIntelligence } from './neighborhood-intel'

// ─── SCORE THRESHOLDS ───────────────────────────────────────────────────────

/** Spread score (25pts max): (ARV - askingPrice) / ARV */
const SPREAD_TIERS: [number, number][] = [
  [0.35, 25],
  [0.30, 22],
  [0.25, 18],
  [0.20, 14],
  [0.15, 10],
  [0.10, 5],
]

/** Profit score (20pts max): net flip profit in dollars */
const PROFIT_TIERS: [number, number][] = [
  [50_000, 20],
  [40_000, 17],
  [30_000, 14],
  [20_000, 10],
  [10_000, 5],
]

/** Entry price score (10pts max): asking vs assessed value ratio */
const ENTRY_TIERS: [number, number][] = [
  [0.70, 10],
  [0.80, 7],
  [0.90, 4],
]

/** Rental cash flow score (10pts max): monthly cash flow */
const RENTAL_TIERS: [number, number][] = [
  [500, 10],
  [300, 7],
  [100, 4],
]

/** Grade thresholds */
const GRADES: [number, string][] = [
  [90, 'A+'],
  [85, 'A'],
  [80, 'B+'],
  [70, 'B'],
  [60, 'C+'],
  [50, 'C'],
  [40, 'D'],
]

/** Recommendation thresholds */
const RECOMMENDATIONS: [number, DealScore['recommendation']][] = [
  [80, 'strong_buy'],
  [65, 'buy'],
  [50, 'hold'],
  [35, 'pass'],
]

/** Default market strength score (used when market intelligence is unavailable) */
const DEFAULT_MARKET_STRENGTH = 10

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface DealScore {
  score: number
  grade: string

  factors: {
    spreadScore: number
    profitScore: number
    compConfidence: number
    marketStrength: number
    entryPrice: number
    rentalViability: number
  }

  summary: string
  strengths: string[]
  risks: string[]
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'pass' | 'needs_review'
}

export interface DealScoreInput {
  purchasePrice: number
  arv: ARVResult
  flip: FlipAnalysis
  rental: RentalAnalysis
  assessedValue?: number | null
  lastSalePrice?: number | null
  /** 0-100 market assessment score from market intelligence. Maps to 15pt factor. */
  marketScore?: number | null
  /** Market summary text to include in deal score signals when available. */
  marketSummary?: string | null
  /** Neighborhood intelligence data for zip-level refinements. */
  neighborhood?: NeighborhoodIntelligence | null
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function scoreTier(value: number, tiers: [number, number][]): number {
  for (const [threshold, pts] of tiers) {
    if (value >= threshold) return pts
  }
  return 0
}

function grade(score: number): string {
  for (const [threshold, g] of GRADES) {
    if (score >= threshold) return g
  }
  return 'F'
}

function recommendation(score: number): DealScore['recommendation'] {
  for (const [threshold, rec] of RECOMMENDATIONS) {
    if (score >= threshold) return rec
  }
  return 'needs_review'
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function dollars(value: number): string {
  return `$${Math.abs(value).toLocaleString()}`
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Calculate a 0-100 deal score with grade, factor breakdown, and recommendation.
 *
 * @param input - ARV result, flip analysis, rental analysis, and property details
 */
export function calculateDealScore(input: DealScoreInput): DealScore {
  const { purchasePrice, arv, flip, rental, assessedValue, lastSalePrice, marketScore, marketSummary, neighborhood } = input

  const strengths: string[] = []
  const risks: string[] = []

  // ── 1. Spread score (25pts) ──

  const arvValue = arv.arv ?? 0
  const spreadPct = arvValue > 0 ? (arvValue - purchasePrice) / arvValue : 0
  const spreadScore = scoreTier(spreadPct, SPREAD_TIERS)

  if (spreadPct >= 0.30) {
    strengths.push(`Spread of ${pct(spreadPct)} significantly exceeds the 25% wholesale threshold`)
  } else if (spreadPct >= 0.25) {
    strengths.push(`Spread of ${pct(spreadPct)} meets the 25% wholesale threshold`)
  } else if (spreadPct >= 0.15) {
    risks.push(`Spread of ${pct(spreadPct)} is below the 25% wholesale threshold — thin margin for error`)
  } else {
    risks.push(`Spread of ${pct(spreadPct)} is too thin — minimal room for repairs and profit`)
  }

  // ── 2. Profit score (20pts) ──

  const netProfit = flip.netProfit
  const profitScore = scoreTier(netProfit, PROFIT_TIERS)

  if (netProfit >= 40_000) {
    strengths.push(`Estimated net profit of ${dollars(netProfit)} provides strong upside`)
  } else if (netProfit >= 20_000) {
    strengths.push(`Estimated net profit of ${dollars(netProfit)} meets minimum threshold`)
  } else if (netProfit > 0) {
    risks.push(`Net profit of ${dollars(netProfit)} is below the $20K minimum — holding costs could erode margin`)
  } else {
    risks.push(`Deal shows a projected loss of ${dollars(netProfit)} at this purchase price`)
  }

  // ── 3. Comp confidence (20pts) ──

  const confidenceScore = arv.confidence.score
  const compConfidence = Math.round((confidenceScore / 100) * 20)

  if (confidenceScore >= 75) {
    strengths.push(`High ARV confidence (${arv.compSummary.used} comps, score ${confidenceScore}/100)`)
  } else if (confidenceScore >= 50) {
    // Neutral — don't add to strengths or risks
  } else {
    risks.push(`Low ARV confidence (${arv.compSummary.used} comps, score ${confidenceScore}/100) — verify ARV independently`)
  }

  // ── 4. Market strength (15pts) ──

  let marketStrength: number
  if (marketScore != null && marketScore >= 0) {
    // Map 0-100 market score to 0-15 point range
    marketStrength = Math.round((Math.min(100, marketScore) / 100) * 15)
    if (marketScore >= 70) {
      strengths.push(marketSummary ?? 'Strong market conditions support this deal')
    } else if (marketScore < 35) {
      risks.push(marketSummary ?? 'Weak market conditions increase disposition risk')
    }
  } else {
    marketStrength = DEFAULT_MARKET_STRENGTH
  }

  // Neighborhood refinements (adjust within the 15pt cap)
  if (neighborhood) {
    // Zip trend vs city: bonus/penalty
    if (neighborhood.zipPricing.priceChange6Month != null) {
      const cityChange = neighborhood.zipPricing.comparedToCity
      if (cityChange != null && cityChange > 5 && neighborhood.zipPricing.trend === 'rising') {
        marketStrength = Math.min(15, marketStrength + 2)
      } else if (cityChange != null && cityChange < -5 && neighborhood.zipPricing.trend === 'falling') {
        marketStrength = Math.max(0, marketStrength - 2)
      }
    }

    // Buyer demand bonus
    if (neighborhood.buyerDemand.buyersTargetingZip >= 3) {
      marketStrength = Math.min(15, marketStrength + 2)
      strengths.push(`${neighborhood.buyerDemand.buyersTargetingZip} CRM buyers targeting this zip code`)
    }

    // Competition penalty
    if (neighborhood.platformActivity.competitionLevel === 'high') {
      marketStrength = Math.max(0, marketStrength - 1)
      risks.push(`High competition: ${neighborhood.platformActivity.activeDealsInZip + neighborhood.platformActivity.marketplaceListingsInZip} active deals/listings in zip ${neighborhood.zip}`)
    }

    // Add key neighborhood signals to strengths/risks
    for (const sig of neighborhood.signals) {
      if (sig.type === 'opportunity' && !strengths.some((s) => s.includes(sig.signal))) {
        if (strengths.length < 6) strengths.push(sig.signal)
      } else if (sig.type === 'caution' && !risks.some((r) => r.includes(sig.signal))) {
        if (risks.length < 6) risks.push(sig.signal)
      }
    }
  }

  // ── 5. Entry price (10pts) ──

  let entryPrice = 0
  const compareValue = assessedValue ?? lastSalePrice
  if (compareValue != null && compareValue > 0) {
    const entryRatio = purchasePrice / compareValue
    entryPrice = scoreTier(1 - entryRatio + 1, ENTRY_TIERS) // invert: lower ratio = better

    // More direct calculation
    if (entryRatio <= 0.70) {
      entryPrice = 10
      strengths.push(`Entry price is ${pct(1 - entryRatio)} below ${assessedValue ? 'assessed value' : 'last sale price'} of ${dollars(compareValue)}`)
    } else if (entryRatio <= 0.80) {
      entryPrice = 7
      strengths.push(`Entry price is ${pct(1 - entryRatio)} below ${assessedValue ? 'assessed value' : 'last sale price'}`)
    } else if (entryRatio <= 0.90) {
      entryPrice = 4
    } else {
      entryPrice = 0
      risks.push(`Entry price is close to ${assessedValue ? 'assessed value' : 'last sale price'} — limited built-in equity`)
    }
  } else {
    entryPrice = 3 // partial credit when no comparison available
  }

  // ── 6. Rental viability (10pts) ──

  const monthlyCF = rental.monthlyCashFlow
  const rentalViability = scoreTier(monthlyCF, RENTAL_TIERS)

  if (monthlyCF >= 300) {
    strengths.push(`Strong rental cash flow of ${dollars(monthlyCF)}/mo provides a hold exit strategy`)
  } else if (monthlyCF > 0) {
    // Neutral
  } else {
    risks.push('Negative rental cash flow — hold strategy not viable at this price')
  }

  // ── Aggregate ──

  const totalScore = Math.min(100,
    spreadScore + profitScore + compConfidence + marketStrength + entryPrice + rentalViability,
  )

  // ── Add general risks based on flip analysis ──

  if (!flip.meetsMinROI && flip.roi > 0) {
    risks.push(`ROI of ${flip.roi}% is below the 15% threshold — consider negotiating a lower price`)
  }

  if (flip.repairCost > purchasePrice * 0.4) {
    risks.push('Repair costs exceed 40% of purchase price — high execution risk')
  }

  if (arv.confidence.warnings.length > 0) {
    // Pull the most critical ARV warning
    const critical = arv.confidence.warnings[0]
    if (!risks.some((r) => r.includes('ARV confidence'))) {
      risks.push(critical)
    }
  }

  // ── Summary ──

  const summary = buildSummary(totalScore, spreadPct, netProfit, arvValue, purchasePrice, arv, rental)

  return {
    score: totalScore,
    grade: grade(totalScore),
    factors: {
      spreadScore,
      profitScore,
      compConfidence,
      marketStrength,
      entryPrice,
      rentalViability,
    },
    summary,
    strengths,
    risks,
    recommendation: recommendation(totalScore),
  }
}

// ─── SUMMARY BUILDER ────────────────────────────────────────────────────────

function buildSummary(
  score: number,
  spreadPct: number,
  netProfit: number,
  arv: number,
  purchasePrice: number,
  arvResult: ARVResult,
  rental: RentalAnalysis,
): string {
  const parts: string[] = []

  // Lead with the assessment
  if (score >= 80) {
    parts.push('Strong deal with favorable economics.')
  } else if (score >= 65) {
    parts.push('Solid deal that meets core wholesale criteria.')
  } else if (score >= 50) {
    parts.push('Marginal deal — proceed with caution.')
  } else {
    parts.push('This deal does not meet minimum wholesale thresholds.')
  }

  // Key metric
  if (arv > 0) {
    parts.push(`Entry at ${dollars(purchasePrice)} against an ARV of ${dollars(arv)} gives a ${pct(spreadPct)} spread.`)
  }

  // Profit outlook
  if (netProfit > 0) {
    parts.push(`Estimated net flip profit: ${dollars(netProfit)}.`)
  } else {
    parts.push(`Deal projects a loss of ${dollars(netProfit)} after all costs.`)
  }

  // Rental angle
  if (rental.monthlyCashFlow > 0) {
    parts.push(`Also viable as a rental at ${dollars(rental.monthlyRent)}/mo cash flow of ${dollars(rental.monthlyCashFlow)}/mo.`)
  }

  // Confidence caveat
  if (arvResult.confidence.level === 'very_low' || arvResult.confidence.level === 'low') {
    parts.push('ARV confidence is low — verify with local comps before committing.')
  }

  return parts.join(' ')
}
