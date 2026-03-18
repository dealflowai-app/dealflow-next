/**
 * Comparable Sales Scoring & Filtering Engine
 *
 * Pure functions that take raw comparable sales from RentCast and produce
 * filtered, scored, weighted comps with price adjustments. No DB or API calls.
 *
 * Used by the ARV calculator to determine which comps matter and how much.
 */

import type { SaleComp } from './property-lookup'

// ─── ADJUSTMENT CONSTANTS ───────────────────────────────────────────────────
// All dollar amounts are approximations tuned for residential wholesale deals.

/** Adjustment per bedroom difference between subject and comp */
export const ADJ_PER_BEDROOM = 5_000

/** Adjustment per bathroom difference between subject and comp */
export const ADJ_PER_BATHROOM = 3_000

/** Adjustment per decade of age difference between subject and comp */
export const ADJ_PER_DECADE_AGE = 1_000

/** Maximum distance in miles before a comp is excluded */
export const MAX_COMP_DISTANCE_MI = 3

/** Maximum age in months before a comp is considered stale */
export const MAX_COMP_AGE_MONTHS = 18

/** Outlier threshold: exclude comps >2 standard deviations from median */
export const OUTLIER_STD_DEV_THRESHOLD = 2

// ─── RELEVANCE SCORE POINTS ─────────────────────────────────────────────────

const DISTANCE_POINTS: [number, number][] = [
  [0.25, 30],
  [0.5, 25],
  [1, 20],
  [2, 10],
  [3, 5],
]

const RECENCY_POINTS: [number, number][] = [
  [3, 25],   // within 3 months
  [6, 20],   // within 6 months
  [12, 12],  // within 12 months
  [18, 5],   // within 18 months
]

const SIZE_SIMILARITY_POINTS: [number, number][] = [
  [0.10, 20],  // within 10%
  [0.20, 15],  // within 20%
  [0.30, 10],  // within 30%
]

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface CompAdjustment {
  factor: string
  description: string
  amount: number
}

export interface ScoredComp extends SaleComp {
  relevanceScore: number
  weight: number
  adjustedPrice: number
  adjustments: CompAdjustment[]
  flags: string[]
  excluded: boolean
  excludeReason?: string
}

/** Subject property details needed for comp comparison */
export interface SubjectProperty {
  sqft: number | null
  beds: number | null
  baths: number | null
  yearBuilt: number | null
  propertyType: string | null
}

// ─── INTERNAL HELPERS ───────────────────────────────────────────────────────

function monthsAgo(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function stdDev(values: number[], med: number): number {
  if (values.length < 2) return 0
  const sumSqDiff = values.reduce((sum, v) => sum + (v - med) ** 2, 0)
  return Math.sqrt(sumSqDiff / values.length)
}

function scoreDistance(distance: number | null): number {
  if (distance == null) return 15 // unknown distance — give moderate score
  for (const [threshold, points] of DISTANCE_POINTS) {
    if (distance <= threshold) return points
  }
  return 0
}

function scoreRecency(saleDate: string | null): number {
  if (!saleDate) return 10 // unknown date — give moderate score
  const months = monthsAgo(saleDate)
  for (const [threshold, points] of RECENCY_POINTS) {
    if (months <= threshold) return points
  }
  return 0
}

function scoreSizeSimilarity(subjectSqft: number | null, compSqft: number | null): number {
  if (subjectSqft == null || compSqft == null || subjectSqft === 0) return 10
  const pctDiff = Math.abs(compSqft - subjectSqft) / subjectSqft
  for (const [threshold, points] of SIZE_SIMILARITY_POINTS) {
    if (pctDiff <= threshold) return points
  }
  return 5 // >30% difference
}

function scoreBedBathMatch(
  subjectBeds: number | null,
  subjectBaths: number | null,
  compBeds: number | null,
  compBaths: number | null,
): number {
  const bedDiff = (subjectBeds != null && compBeds != null)
    ? Math.abs(subjectBeds - compBeds) : 1
  const bathDiff = (subjectBaths != null && compBaths != null)
    ? Math.abs(subjectBaths - compBaths) : 1
  const maxDiff = Math.max(bedDiff, bathDiff)
  if (maxDiff === 0) return 15
  if (maxDiff <= 1) return 10
  return 5
}

// ─── PRICE ADJUSTMENTS ──────────────────────────────────────────────────────

function calculateAdjustments(
  subject: SubjectProperty,
  comp: SaleComp,
  areaPricePerSqft: number,
): CompAdjustment[] {
  const adjustments: CompAdjustment[] = []

  // Sqft difference
  if (subject.sqft != null && comp.sqft != null && comp.sqft > 0 && areaPricePerSqft > 0) {
    const sqftDiff = subject.sqft - comp.sqft
    if (sqftDiff !== 0) {
      const amount = Math.round(sqftDiff * areaPricePerSqft)
      const dir = sqftDiff > 0 ? 'more' : 'fewer'
      adjustments.push({
        factor: 'sqft_difference',
        description: `Subject has ${Math.abs(sqftDiff)} ${dir} sqft (${sqftDiff > 0 ? '+' : ''}$${amount.toLocaleString()})`,
        amount,
      })
    }
  }

  // Bedroom difference
  if (subject.beds != null && comp.beds != null) {
    const bedDiff = subject.beds - comp.beds
    if (bedDiff !== 0) {
      const amount = bedDiff * ADJ_PER_BEDROOM
      const dir = bedDiff > 0 ? 'more' : 'fewer'
      adjustments.push({
        factor: 'bed_count',
        description: `Subject has ${Math.abs(bedDiff)} ${dir} bedroom${Math.abs(bedDiff) !== 1 ? 's' : ''} (${bedDiff > 0 ? '+' : ''}$${amount.toLocaleString()})`,
        amount,
      })
    }
  }

  // Bathroom difference
  if (subject.baths != null && comp.baths != null) {
    const bathDiff = subject.baths - comp.baths
    if (bathDiff !== 0) {
      const amount = Math.round(bathDiff * ADJ_PER_BATHROOM)
      const dir = bathDiff > 0 ? 'more' : 'fewer'
      adjustments.push({
        factor: 'bath_count',
        description: `Subject has ${Math.abs(bathDiff)} ${dir} bathroom${Math.abs(bathDiff) !== 1 ? 's' : ''} (${bathDiff > 0 ? '+' : ''}$${amount.toLocaleString()})`,
        amount,
      })
    }
  }

  // Note: year built adjustment skipped — SaleComp data from RentCast
  // does not include year built for comparables.

  return adjustments
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Score, filter, adjust, and weight comparable sales relative to a subject property.
 * Returns all comps (including excluded ones) sorted by relevanceScore descending.
 */
export function scoreAndFilterComps(
  subject: SubjectProperty,
  comps: SaleComp[],
): ScoredComp[] {
  if (comps.length === 0) return []

  // ── Step 1: Initial exclusion pass ──

  const initial: ScoredComp[] = comps.map((comp) => ({
    ...comp,
    relevanceScore: 0,
    weight: 0,
    adjustedPrice: comp.price ?? 0,
    adjustments: [],
    flags: [],
    excluded: false,
  }))

  // Mark exclusions
  for (const sc of initial) {
    if (sc.price == null || sc.price === 0) {
      sc.excluded = true
      sc.excludeReason = 'No sale price'
      sc.flags.push('no_price')
      continue
    }
    if (sc.saleDate && monthsAgo(sc.saleDate) > MAX_COMP_AGE_MONTHS) {
      sc.excluded = true
      sc.excludeReason = `Stale comp (>${MAX_COMP_AGE_MONTHS} months)`
      sc.flags.push('stale')
      continue
    }
    if (sc.distance != null && sc.distance > MAX_COMP_DISTANCE_MI) {
      sc.excluded = true
      sc.excludeReason = `Too far (>${MAX_COMP_DISTANCE_MI}mi)`
      sc.flags.push('too_far')
      continue
    }
    if (
      subject.propertyType != null &&
      sc.propertyType != null &&
      normalizeType(subject.propertyType) !== normalizeType(sc.propertyType)
    ) {
      sc.excluded = true
      sc.excludeReason = 'Different property type'
      sc.flags.push('different_type')
      continue
    }
  }

  // ── Step 2: Outlier detection on remaining comps ──

  const activePrices = initial
    .filter((c) => !c.excluded && c.price != null)
    .map((c) => c.price!)

  if (activePrices.length >= 3) {
    const med = median(activePrices)
    const sd = stdDev(activePrices, med)

    if (sd > 0) {
      for (const sc of initial) {
        if (sc.excluded || sc.price == null) continue
        if (Math.abs(sc.price - med) > OUTLIER_STD_DEV_THRESHOLD * sd) {
          sc.excluded = true
          sc.excludeReason = 'Statistical outlier'
          sc.flags.push('outlier')
        }
      }
    }
  }

  // ── Step 3: Calculate area price per sqft (for adjustments) ──

  const pricesPerSqft = initial
    .filter((c) => !c.excluded && c.pricePerSqft != null && c.pricePerSqft > 0)
    .map((c) => c.pricePerSqft!)

  const areaPricePerSqft = pricesPerSqft.length > 0
    ? pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length
    : 0

  // ── Step 4: Score and adjust each comp ──

  for (const sc of initial) {
    // Score all comps (even excluded) for display purposes
    sc.relevanceScore = Math.min(100,
      scoreDistance(sc.distance) +
      scoreRecency(sc.saleDate) +
      scoreSizeSimilarity(subject.sqft, sc.sqft) +
      scoreBedBathMatch(subject.beds, subject.baths, sc.beds, sc.baths) +
      Math.round((sc.correlation ?? 0) * 10),
    )

    // Calculate price adjustments for non-excluded comps with a price
    if (!sc.excluded && sc.price != null) {
      sc.adjustments = calculateAdjustments(subject, sc, areaPricePerSqft)
      const totalAdj = sc.adjustments.reduce((sum, a) => sum + a.amount, 0)
      sc.adjustedPrice = sc.price + totalAdj
    }
  }

  // ── Step 5: Normalize weights (non-excluded comps only) ──

  const active = initial.filter((c) => !c.excluded)
  const totalScore = active.reduce((sum, c) => sum + c.relevanceScore, 0)

  for (const sc of active) {
    sc.weight = totalScore > 0
      ? sc.relevanceScore / totalScore
      : 1 / active.length
  }

  // Sort by relevanceScore descending
  initial.sort((a, b) => b.relevanceScore - a.relevanceScore)

  return initial
}

// ─── PROPERTY TYPE NORMALIZATION ────────────────────────────────────────────

function normalizeType(type: string): string {
  const t = type.toLowerCase().replace(/[^a-z]/g, '')
  if (t.includes('single') || t === 'sfr') return 'sfr'
  if (t.includes('multi')) return 'multi'
  if (t.includes('condo') || t.includes('townhouse')) return 'condo'
  if (t.includes('land') || t.includes('vacant')) return 'land'
  if (t.includes('mobile') || t.includes('manufactured')) return 'mobile'
  if (t.includes('commercial')) return 'commercial'
  return t
}
