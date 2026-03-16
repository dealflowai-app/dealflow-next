import type { DiscoveryProperty } from '@/lib/types/discovery'
import type { OwnerProfile } from '@/lib/types/owner-intelligence'

// ─── ENTITY KEYWORDS ────────────────────────────────────────────────────────
// Used both for cash-buyer detection and suffix stripping.

const ENTITY_KEYWORDS = [
  'llc', 'l.l.c.', 'l l c',
  'corp', 'corporation', 'incorporated', 'inc',
  'trust', 'revocable', 'irrevocable', 'living trust',
  'holdings', 'capital', 'properties', 'investments',
  'group', 'partners', 'partnership', 'lp', 'l.p.',
  'ventures', 'realty', 'real estate', 'acquisitions',
  'enterprise', 'enterprises', 'management', 'development',
  'fund', 'equity', 'asset', 'assets',
]

/** Suffixes to strip when normalizing for grouping purposes. */
const STRIP_SUFFIXES = [
  'llc', 'l.l.c.', 'l l c',
  'inc', 'inc.', 'incorporated',
  'corp', 'corp.', 'corporation',
  'lp', 'l.p.', 'limited partnership',
  'ltd', 'ltd.',
  'co', 'co.',
]

// ─── normalizeOwnerName ─────────────────────────────────────────────────────

/**
 * Normalize an owner name for grouping.
 *
 * "Iron Horse Capital LLC" and "IRON HORSE CAPITAL, LLC" → "iron horse capital"
 * "SMITH, JOHN A" and "Smith John A" → "smith john a"
 */
export function normalizeOwnerName(name: string | null): string {
  if (!name) return ''

  let n = name
    .toLowerCase()
    .replace(/[.,;'"]/g, '')  // strip punctuation
    .replace(/\s+/g, ' ')     // collapse whitespace
    .trim()

  // Strip known suffixes from the end
  for (const suffix of STRIP_SUFFIXES) {
    const pattern = new RegExp(`\\s+${suffix.replace(/\./g, '\\.')}\\s*$`, 'i')
    n = n.replace(pattern, '')
  }

  return n.trim()
}

// ─── detectLikelyCashBuyer ──────────────────────────────────────────────────

/**
 * Heuristic: is this property likely owned by a cash buyer / investor?
 *
 * Returns true if:
 *  - The owner is absentee AND the name matches entity patterns, OR
 *  - The property is part of a multi-property portfolio (checked externally).
 *
 * This is an inference, not confirmed data.
 *
 * @param property      The property to evaluate
 * @param portfolioSize Number of properties this owner holds in the cache (pass 1 if unknown)
 */
export function detectLikelyCashBuyer(
  property: DiscoveryProperty,
  portfolioSize = 1,
): boolean {
  // Multi-property owners are very likely investors
  if (portfolioSize >= 2) return true

  const name = (property.ownerName ?? '').toLowerCase()
  if (!name) return false

  const isAbsentee = property.ownerOccupied === false
  const isEntity = ENTITY_KEYWORDS.some(kw => name.includes(kw))

  // Entity + absentee is a strong signal
  if (isEntity && isAbsentee) return true

  // Entity alone is a moderate signal — still flag it
  if (isEntity) return true

  return false
}

// ─── calculateInvestorScore ─────────────────────────────────────────────────

interface ScoreInput {
  propertyCount: number
  totalValue: number
  propertyTypes: string[]
  absenteeRatio: number      // 0-1, fraction of properties that are absentee
  lastPurchaseDate: string | null
}

/**
 * Simple heuristic investor score (0-100).
 *
 * Signals weighted:
 *  - Portfolio size (up to 35 pts)
 *  - Total portfolio value (up to 20 pts)
 *  - Property type diversity (up to 10 pts)
 *  - Absentee ratio (up to 20 pts)
 *  - Recency of last purchase (up to 15 pts)
 */
export function calculateInvestorScore(input: ScoreInput): number {
  let score = 0

  // ── Portfolio size (35 pts max) ──
  // 1 property = 5, 2 = 15, 3 = 22, 5 = 30, 10+ = 35
  if (input.propertyCount >= 10) score += 35
  else if (input.propertyCount >= 5) score += 30
  else if (input.propertyCount >= 3) score += 22
  else if (input.propertyCount >= 2) score += 15
  else score += 5

  // ── Total portfolio value (20 pts max) ──
  if (input.totalValue >= 5_000_000) score += 20
  else if (input.totalValue >= 2_000_000) score += 16
  else if (input.totalValue >= 1_000_000) score += 12
  else if (input.totalValue >= 500_000) score += 8
  else if (input.totalValue >= 200_000) score += 4

  // ── Property type diversity (10 pts max) ──
  const typeCount = input.propertyTypes.length
  if (typeCount >= 3) score += 10
  else if (typeCount >= 2) score += 6
  else score += 2

  // ── Absentee ratio (20 pts max) ──
  // Investors typically own absentee properties
  score += Math.round(input.absenteeRatio * 20)

  // ── Recency of last purchase (15 pts max) ──
  if (input.lastPurchaseDate) {
    const monthsAgo = monthsSince(input.lastPurchaseDate)
    if (monthsAgo <= 6) score += 15
    else if (monthsAgo <= 12) score += 12
    else if (monthsAgo <= 24) score += 9
    else if (monthsAgo <= 60) score += 5
    else score += 2
  }
  // No sale date → 0 pts (we can't infer recency)

  return Math.min(100, Math.max(0, score))
}

function monthsSince(dateStr: string): number {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return Infinity
  const now = new Date()
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
}

// ─── estimateEquity ─────────────────────────────────────────────────────────

export interface EquityEstimate {
  estimatedValue: number          // assessed_value (best available)
  lastSalePrice: number | null
  lastSaleDate: string | null
  yearsOwned: number | null       // calculated from lastSaleDate
  estimatedAppreciation: number | null  // rough: 3% per year
  estimatedCurrentValue: number   // lastSalePrice * (1.03 ^ yearsOwned) or assessedValue
  equityCategory: 'high' | 'medium' | 'low' | 'unknown'
}

const ANNUAL_APPRECIATION = 0.03

/**
 * Estimate equity from public record data (assessed value + last sale info).
 *
 * Categories:
 *  - high:    owned 5+ years OR current value > 2× last sale price
 *  - medium:  owned 2-5 years
 *  - low:     owned < 2 years or recent purchase near assessed value
 *  - unknown: no sale data to estimate from
 */
export function estimateEquity(property: DiscoveryProperty): EquityEstimate {
  const assessedValue = property.assessedValue ?? 0
  const lastSalePrice = property.lastSalePrice ?? null
  const lastSaleDate = property.lastSaleDate ?? null

  let yearsOwned: number | null = null
  if (lastSaleDate) {
    const saleTime = new Date(lastSaleDate).getTime()
    if (!isNaN(saleTime)) {
      yearsOwned = Math.max(0, (Date.now() - saleTime) / (365.25 * 24 * 60 * 60 * 1000))
      yearsOwned = Math.round(yearsOwned * 10) / 10 // 1 decimal
    }
  }

  let estimatedAppreciation: number | null = null
  let estimatedCurrentValue = assessedValue

  if (lastSalePrice && lastSalePrice > 0 && yearsOwned !== null) {
    estimatedCurrentValue = Math.round(lastSalePrice * Math.pow(1 + ANNUAL_APPRECIATION, yearsOwned))
    estimatedAppreciation = estimatedCurrentValue - lastSalePrice
  }

  // Determine category
  let equityCategory: EquityEstimate['equityCategory'] = 'unknown'

  if (yearsOwned === null || lastSalePrice === null || lastSalePrice <= 0) {
    equityCategory = 'unknown'
  } else if (yearsOwned >= 5 || (assessedValue > 0 && assessedValue > 2 * lastSalePrice)) {
    equityCategory = 'high'
  } else if (yearsOwned >= 2) {
    equityCategory = 'medium'
  } else {
    equityCategory = 'low'
  }

  return {
    estimatedValue: assessedValue,
    lastSalePrice,
    lastSaleDate,
    yearsOwned,
    estimatedAppreciation,
    estimatedCurrentValue,
    equityCategory,
  }
}

// ─── groupPropertiesByOwner ─────────────────────────────────────────────────

/**
 * Group an array of cached DiscoveryProperty records by normalized owner name.
 *
 * Returns a Map keyed by normalizedName. Each value is an OwnerProfile
 * with aggregate stats, an investor score, and a cash-buyer flag.
 */
export function groupPropertiesByOwner(
  properties: DiscoveryProperty[],
): Map<string, OwnerProfile> {
  const groups = new Map<string, {
    displayName: string
    properties: DiscoveryProperty[]
  }>()

  for (const p of properties) {
    if (!p.ownerName) continue

    const key = normalizeOwnerName(p.ownerName)
    if (!key) continue

    const existing = groups.get(key)
    if (existing) {
      existing.properties.push(p)
      // Keep the display name with the most detail (longest)
      if (p.ownerName.length > existing.displayName.length) {
        existing.displayName = p.ownerName
      }
    } else {
      groups.set(key, {
        displayName: p.ownerName,
        properties: [p],
      })
    }
  }

  // Build OwnerProfile for each group
  const result = new Map<string, OwnerProfile>()

  groups.forEach((group, key) => {
    const props = group.properties
    const count = props.length

    const totalValue = props.reduce((sum: number, p) => sum + (p.assessedValue ?? 0), 0)
    const avgValue = count > 0 ? Math.round(totalValue / count) : 0

    const cities = Array.from(new Set(props.map(p => p.city).filter(Boolean)))
    const propertyTypes = Array.from(new Set(
      props.map(p => p.propertyType).filter((t): t is string => t !== null),
    ))

    const absenteeCount = props.filter(p => p.ownerOccupied === false).length
    const absenteeRatio = count > 0 ? absenteeCount / count : 0

    // Sale dates (sorted)
    const saleDates = props
      .map(p => p.lastSaleDate)
      .filter((d): d is string => d !== null)
      .sort()

    const lastPurchaseDate = saleDates.length > 0 ? saleDates[saleDates.length - 1] : null
    const oldestPurchaseDate = saleDates.length > 0 ? saleDates[0] : null

    const likelyCashBuyer = props.some(p => detectLikelyCashBuyer(p, count))

    const investorScore = calculateInvestorScore({
      propertyCount: count,
      totalValue,
      propertyTypes,
      absenteeRatio,
      lastPurchaseDate,
    })

    result.set(key, {
      normalizedName: key,
      displayName: group.displayName,
      properties: props,
      propertyCount: count,
      totalValue,
      avgValue,
      cities,
      propertyTypes,
      likelyCashBuyer,
      investorScore,
      lastPurchaseDate,
      oldestPurchaseDate,
    })
  })

  return result
}
