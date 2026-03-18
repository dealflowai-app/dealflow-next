/**
 * After Repair Value (ARV) Calculator
 *
 * Takes scored comparable sales and produces a weighted, confidence-scored
 * ARV with full breakdown. The ARV assumes the property is fully renovated,
 * which is the key metric wholesalers need to evaluate a deal.
 *
 * Pure function — no DB or API calls, just math.
 */

import type { SaleComp } from './property-lookup'
import { scoreAndFilterComps, type ScoredComp, type SubjectProperty } from './comp-engine'

// ─── RENOVATION PREMIUM PERCENTAGES ─────────────────────────────────────────
// Applied to the weighted comp average to estimate post-renovation value.
// "distressed" properties have the largest gap between as-is and ARV.

export const RENOVATION_PREMIUM: Record<string, { low: number; high: number }> = {
  distressed: { low: 0.15, high: 0.20 },
  fair:       { low: 0.08, high: 0.12 },
  good:       { low: 0.03, high: 0.05 },
  excellent:  { low: 0.00, high: 0.00 },
}

/** Default premium when condition is unknown (conservative) */
const DEFAULT_PREMIUM = { low: 0.00, high: 0.00 }

// ─── CONFIDENCE SCORE WEIGHTS ───────────────────────────────────────────────

const CONFIDENCE_BASE = 20
const CONFIDENCE_COMP_COUNT: [number, number][] = [
  [12, 35],
  [8, 30],
  [4, 20],
  [2, 10],
]
const CONFIDENCE_PROXIMITY: [number, number][] = [
  [0.5, 15],
  [1, 10],
  [2, 5],
]
const CONFIDENCE_RECENCY_MONTHS: [number, number][] = [
  [3, 15],
  [6, 10],
]
const CONFIDENCE_CONSISTENCY_CV_THRESHOLD = 0.15 // coefficient of variation

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ARVResult {
  arv: number | null
  arvLow: number | null
  arvHigh: number | null
  method: 'weighted_comp_average' | 'avm_adjusted' | 'insufficient_data'

  confidence: {
    score: number
    level: 'high' | 'medium' | 'low' | 'very_low'
    factors: string[]
    warnings: string[]
  }

  compSummary: {
    total: number
    used: number
    excluded: number
    medianPrice: number | null
    avgPrice: number | null
    avgPricePerSqft: number | null
    avgDistance: number | null
    dateRange: { oldest: string | null; newest: string | null }
  }

  breakdown: {
    weightedAvgPrice: number | null
    arvAdjustment: number | null
    arvAdjustmentPercent: number | null
    rentCastAVM: number | null
    avmDifference: number | null
    avmDifferencePercent: number | null
  }

  scoredComps: ScoredComp[]
}

// ─── INTERNAL HELPERS ───────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function percentile(values: number[], pct: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (pct / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}

function monthsAgo(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
}

function confidenceLevel(score: number): 'high' | 'medium' | 'low' | 'very_low' {
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  if (score >= 40) return 'low'
  return 'very_low'
}

function buildCompSummary(
  allComps: ScoredComp[],
  usedComps: ScoredComp[],
): ARVResult['compSummary'] {
  const prices = usedComps
    .map((c) => c.adjustedPrice)
    .filter((p) => p > 0)

  const ppsqft = usedComps
    .filter((c) => c.pricePerSqft != null && c.pricePerSqft > 0)
    .map((c) => c.pricePerSqft!)

  const distances = usedComps
    .filter((c) => c.distance != null)
    .map((c) => c.distance!)

  const dates = usedComps
    .filter((c) => c.saleDate != null)
    .map((c) => c.saleDate!)
    .sort()

  return {
    total: allComps.length,
    used: usedComps.length,
    excluded: allComps.length - usedComps.length,
    medianPrice: prices.length > 0 ? Math.round(median(prices)) : null,
    avgPrice: prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null,
    avgPricePerSqft: ppsqft.length > 0
      ? Math.round(ppsqft.reduce((a, b) => a + b, 0) / ppsqft.length)
      : null,
    avgDistance: distances.length > 0
      ? Math.round((distances.reduce((a, b) => a + b, 0) / distances.length) * 100) / 100
      : null,
    dateRange: {
      oldest: dates.length > 0 ? dates[0] : null,
      newest: dates.length > 0 ? dates[dates.length - 1] : null,
    },
  }
}

// ─── CONFIDENCE SCORING ─────────────────────────────────────────────────────

function calculateConfidence(
  usedComps: ScoredComp[],
  subject: SubjectProperty,
): ARVResult['confidence'] {
  let score = CONFIDENCE_BASE
  const factors: string[] = []
  const warnings: string[] = []

  // Comp count
  const count = usedComps.length
  for (const [threshold, pts] of CONFIDENCE_COMP_COUNT) {
    if (count >= threshold) {
      score += pts
      factors.push(`${count} comparable sales used`)
      break
    }
  }
  if (count <= 2) {
    warnings.push('Only 2 comps available — consider verifying with a local CMA')
  } else if (count <= 3) {
    warnings.push('Limited comp data (3 sales) — treat estimate as approximate')
  }

  // Proximity
  const distances = usedComps
    .filter((c) => c.distance != null)
    .map((c) => c.distance!)
  if (distances.length > 0) {
    const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length
    for (const [threshold, pts] of CONFIDENCE_PROXIMITY) {
      if (avgDist <= threshold) {
        score += pts
        factors.push(`Average comp distance: ${avgDist.toFixed(1)}mi`)
        break
      }
    }
    const farthest = Math.max(...distances)
    if (farthest > 2) {
      warnings.push(`Nearest comp area extends to ${farthest.toFixed(1)}mi — consider local market conditions`)
    }
  }

  // Recency
  const dates = usedComps
    .filter((c) => c.saleDate != null)
    .map((c) => c.saleDate!)
    .sort()
  if (dates.length > 0) {
    const newestMonths = monthsAgo(dates[dates.length - 1])
    for (const [threshold, pts] of CONFIDENCE_RECENCY_MONTHS) {
      if (newestMonths <= threshold) {
        score += pts
        factors.push(`Most recent sale: ${newestMonths} month${newestMonths !== 1 ? 's' : ''} ago`)
        break
      }
    }
    if (newestMonths > 9) {
      warnings.push('No recent sales in the last 9 months — market may have shifted')
    }
  }

  // Consistency (low coefficient of variation = more reliable)
  const prices = usedComps.map((c) => c.adjustedPrice).filter((p) => p > 0)
  if (prices.length >= 3) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    const variance = prices.reduce((sum, p) => sum + (p - avg) ** 2, 0) / prices.length
    const cv = Math.sqrt(variance) / avg
    if (cv <= CONFIDENCE_CONSISTENCY_CV_THRESHOLD) {
      score += 10
      factors.push('Comp prices are consistent (low variance)')
    } else {
      warnings.push('Significant price variance among comps — ARV range may be wide')
    }
  }

  // Size match
  if (subject.sqft != null && subject.sqft > 0) {
    const sqfts = usedComps.filter((c) => c.sqft != null).map((c) => c.sqft!)
    if (sqfts.length > 0) {
      const avgSqft = sqfts.reduce((a, b) => a + b, 0) / sqfts.length
      const pctDiff = Math.abs(avgSqft - subject.sqft) / subject.sqft
      if (pctDiff <= 0.15) {
        score += 5
        factors.push('Comps are similar in size to subject')
      }
    }
  }

  return {
    score: Math.min(100, score),
    level: confidenceLevel(Math.min(100, score)),
    factors,
    warnings,
  }
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Calculate the After Repair Value (ARV) for a subject property using
 * comparable sales data and optional RentCast AVM estimate.
 *
 * @param subject  - Subject property details (beds, baths, sqft, yearBuilt, propertyType)
 * @param comps    - Raw comparable sales from RentCast
 * @param rentCastAVM - RentCast's own AVM estimate (optional, used as fallback)
 * @param condition - Property condition: "distressed" | "fair" | "good" | "excellent"
 */
export function calculateARV(
  subject: SubjectProperty,
  comps: SaleComp[],
  rentCastAVM?: number | null,
  condition?: string | null,
): ARVResult {
  // 1. Score and filter comps
  const scoredComps = scoreAndFilterComps(subject, comps)
  const usedComps = scoredComps.filter((c) => !c.excluded)

  // 2. Handle insufficient comp data
  if (usedComps.length < 2) {
    const avm = rentCastAVM ?? null
    return {
      arv: avm,
      arvLow: avm != null ? Math.round(avm * 0.9) : null,
      arvHigh: avm != null ? Math.round(avm * 1.1) : null,
      method: avm != null ? 'avm_adjusted' : 'insufficient_data',
      confidence: {
        score: avm != null ? 25 : 0,
        level: 'very_low',
        factors: avm != null ? ['Using RentCast AVM as fallback (insufficient comps)'] : [],
        warnings: [
          `Only ${usedComps.length} usable comp${usedComps.length !== 1 ? 's' : ''} available — need at least 2 for reliable ARV`,
          ...(avm != null
            ? ['ARV is based solely on automated valuation model — verify manually']
            : ['No ARV could be calculated — insufficient data']),
        ],
      },
      compSummary: buildCompSummary(scoredComps, usedComps),
      breakdown: {
        weightedAvgPrice: null,
        arvAdjustment: null,
        arvAdjustmentPercent: null,
        rentCastAVM: avm,
        avmDifference: null,
        avmDifferencePercent: null,
      },
      scoredComps,
    }
  }

  // 3. Weighted average of adjusted comp prices
  const weightedAvg = usedComps.reduce(
    (sum, c) => sum + c.adjustedPrice * c.weight, 0,
  )
  const weightedAvgPrice = Math.round(weightedAvg)

  // 4. Apply renovation premium
  const premium = (condition && RENOVATION_PREMIUM[condition]) || DEFAULT_PREMIUM
  const premiumMid = (premium.low + premium.high) / 2
  const arvAdjustment = Math.round(weightedAvgPrice * premiumMid)
  const arv = weightedAvgPrice + arvAdjustment

  // 5. Calculate range using percentiles of adjusted prices + premium
  const adjustedPrices = usedComps.map((c) => c.adjustedPrice).filter((p) => p > 0)
  const p10 = percentile(adjustedPrices, 10)
  const p90 = percentile(adjustedPrices, 90)
  const arvLow = Math.round(p10 * (1 + premium.low))
  const arvHigh = Math.round(p90 * (1 + premium.high))

  // 6. Confidence
  const confidence = calculateConfidence(usedComps, subject)

  // 7. AVM comparison
  const avm = rentCastAVM ?? null
  let avmDifference: number | null = null
  let avmDifferencePercent: number | null = null
  if (avm != null && avm > 0) {
    avmDifference = arv - avm
    avmDifferencePercent = Math.round((avmDifference / avm) * 100 * 10) / 10

    if (Math.abs(avmDifferencePercent) > 20) {
      confidence.warnings.push(
        `Our ARV differs from RentCast AVM by ${avmDifferencePercent > 0 ? '+' : ''}${avmDifferencePercent}% — review comps carefully`,
      )
    }
  }

  // 8. Add premium info to confidence factors
  if (premiumMid > 0) {
    confidence.factors.push(
      `Renovation premium applied: +${Math.round(premiumMid * 100)}% for "${condition}" condition`,
    )
  }

  return {
    arv,
    arvLow,
    arvHigh,
    method: 'weighted_comp_average',
    confidence,
    compSummary: buildCompSummary(scoredComps, usedComps),
    breakdown: {
      weightedAvgPrice,
      arvAdjustment,
      arvAdjustmentPercent: Math.round(premiumMid * 100 * 10) / 10,
      rentCastAVM: avm,
      avmDifference,
      avmDifferencePercent,
    },
    scoredComps,
  }
}
