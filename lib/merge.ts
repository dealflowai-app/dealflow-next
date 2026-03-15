/**
 * Merge Service — Pure function that computes merged buyer data from a
 * primary buyer and one or more secondary buyers. No database calls.
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface BuyerForMerge {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  entityType: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  cashPurchaseCount: number
  lastPurchaseDate: Date | null
  estimatedMinPrice: number | null
  estimatedMaxPrice: number | null
  primaryPropertyType: string | null
  status: string
  contactEnriched: boolean
  enrichedAt: Date | null
  notes: string | null
  buyerScore: number
  lastContactedAt: Date | null
  lastVerifiedAt: Date | null
  scorePinned: boolean
  scoreOverride: number | null
  scoreAdjustment: number
  overrideReason: string | null
  customTags: string[]
  preferredMarkets: string[]
  preferredTypes: string[]
  strategy: string | null
  minPrice: number | null
  maxPrice: number | null
  closeSpeedDays: number | null
  proofOfFundsVerified: boolean
}

export interface MergedBuyerData {
  firstName: string | null
  lastName: string | null
  entityName: string | null
  entityType: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  cashPurchaseCount: number
  lastPurchaseDate: Date | null
  estimatedMinPrice: number | null
  estimatedMaxPrice: number | null
  primaryPropertyType: string | null
  contactEnriched: boolean
  enrichedAt: Date | null
  notes: string | null
  buyerScore: number
  lastContactedAt: Date | null
  lastVerifiedAt: Date | null
  preferredMarkets: string[]
  preferredTypes: string[]
  strategy: string | null
  minPrice: number | null
  maxPrice: number | null
  closeSpeedDays: number | null
  proofOfFundsVerified: boolean
  customTags: string[]
}

// ─── MERGE LOGIC ─────────────────────────────────────────────────────────────

/**
 * Build merged buyer data from a primary buyer and secondary buyers.
 * Pure function — returns the data object to be applied to the primary buyer.
 *
 * Merge rules:
 * - Scalar fields: use primary's value if non-null, otherwise first non-null from secondaries
 * - buyerScore: MAX across all records
 * - cashPurchaseCount: SUM across all records
 * - preferredTypes / preferredMarkets: UNION (deduplicated)
 * - customTags: UNION (deduplicated)
 * - notes: concatenate all non-null notes
 * - Date fields (lastContactedAt, lastVerifiedAt, lastPurchaseDate): most recent
 * - contactEnriched / proofOfFundsVerified: true if ANY is true
 */
export function buildMergedBuyer(
  primary: BuyerForMerge,
  secondaries: BuyerForMerge[],
): MergedBuyerData {
  const all = [primary, ...secondaries]

  return {
    // Scalar fields: primary first, then first non-null secondary
    firstName: firstNonNull(all, 'firstName'),
    lastName: firstNonNull(all, 'lastName'),
    entityName: firstNonNull(all, 'entityName'),
    entityType: firstNonNull(all, 'entityType'),
    phone: firstNonNull(all, 'phone'),
    email: firstNonNull(all, 'email'),
    address: firstNonNull(all, 'address'),
    city: firstNonNull(all, 'city'),
    state: firstNonNull(all, 'state'),
    zip: firstNonNull(all, 'zip'),
    primaryPropertyType: firstNonNull(all, 'primaryPropertyType'),
    strategy: firstNonNull(all, 'strategy'),
    minPrice: firstNonNull(all, 'minPrice'),
    maxPrice: firstNonNull(all, 'maxPrice'),
    closeSpeedDays: firstNonNull(all, 'closeSpeedDays'),
    estimatedMinPrice: firstNonNull(all, 'estimatedMinPrice'),
    estimatedMaxPrice: firstNonNull(all, 'estimatedMaxPrice'),
    enrichedAt: firstNonNull(all, 'enrichedAt'),

    // Aggregate: MAX score
    buyerScore: Math.max(...all.map((b) => b.buyerScore)),

    // Aggregate: SUM purchase counts
    cashPurchaseCount: all.reduce((sum, b) => sum + b.cashPurchaseCount, 0),

    // Aggregate: UNION arrays (deduplicated)
    preferredTypes: unionArrays(all.map((b) => b.preferredTypes)),
    preferredMarkets: unionArrays(all.map((b) => b.preferredMarkets)),
    customTags: unionArrays(all.map((b) => b.customTags)),

    // Aggregate: most recent dates
    lastContactedAt: mostRecent(all.map((b) => b.lastContactedAt)),
    lastVerifiedAt: mostRecent(all.map((b) => b.lastVerifiedAt)),
    lastPurchaseDate: mostRecent(all.map((b) => b.lastPurchaseDate)),

    // Aggregate: true if ANY is true
    contactEnriched: all.some((b) => b.contactEnriched),
    proofOfFundsVerified: all.some((b) => b.proofOfFundsVerified),

    // Aggregate: concatenate notes
    notes: mergeNotes(primary, secondaries),
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Return the first non-null value for a field across all buyers
 * (primary is always first in the array).
 */
function firstNonNull<K extends keyof BuyerForMerge>(
  buyers: BuyerForMerge[],
  field: K,
): BuyerForMerge[K] {
  for (const buyer of buyers) {
    if (buyer[field] != null) return buyer[field]
  }
  return buyers[0][field] // fallback to primary's value (even if null)
}

/** Merge multiple string arrays into a deduplicated union */
function unionArrays(arrays: string[][]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const arr of arrays) {
    for (const item of arr) {
      if (!seen.has(item)) {
        seen.add(item)
        result.push(item)
      }
    }
  }
  return result
}

/** Return the most recent non-null date from an array */
function mostRecent(dates: Array<Date | null>): Date | null {
  let latest: Date | null = null
  for (const d of dates) {
    if (!d) continue
    if (!latest || d.getTime() > latest.getTime()) latest = d
  }
  return latest
}

/** Concatenate notes from all buyers, prefixing secondary notes with source */
function mergeNotes(primary: BuyerForMerge, secondaries: BuyerForMerge[]): string | null {
  const parts: string[] = []

  if (primary.notes) {
    parts.push(primary.notes)
  }

  for (const sec of secondaries) {
    if (sec.notes) {
      const name = sec.entityName || [sec.firstName, sec.lastName].filter(Boolean).join(' ') || sec.id
      parts.push(`[Merged from ${name}]: ${sec.notes}`)
    }
  }

  return parts.length > 0 ? parts.join('\n') : null
}
