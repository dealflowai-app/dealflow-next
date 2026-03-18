/**
 * Repair Cost Estimator
 *
 * Estimates renovation costs based on property characteristics and condition.
 * These are approximations — real costs require an in-person inspection.
 * Pure function, no DB or API calls.
 */

// ─── COST CONSTANTS ─────────────────────────────────────────────────────────
// All ranges in dollars. Flat = total cost, PerSqft = multiply by sqft.

/** Kitchen renovation (cabinets, counters, appliances) */
const KITCHEN = { low: 8_000, high: 25_000 }

/** Bathroom renovation per bathroom */
const BATHROOM = { low: 3_000, high: 10_000 }

/** Interior flooring per sqft */
const FLOORING_PER_SQFT = { low: 3, high: 8 }

/** Interior paint per sqft */
const PAINT_INT_PER_SQFT = { low: 1.5, high: 3 }

/** Exterior paint flat */
const PAINT_EXT = { low: 2_000, high: 6_000 }

/** Roof replacement */
const ROOF = { low: 5_000, high: 15_000 }

/** HVAC system */
const HVAC = { low: 3_000, high: 8_000 }

/** Electrical update */
const ELECTRICAL = { low: 2_000, high: 6_000 }

/** Plumbing update */
const PLUMBING = { low: 2_000, high: 8_000 }

/** Window replacement */
const WINDOWS = { low: 3_000, high: 10_000 }

/** Landscaping and curb appeal */
const LANDSCAPING = { low: 1_000, high: 3_000 }

/** Dumpster and cleanup */
const CLEANUP = { low: 500, high: 2_000 }

/** Permits and contingency as percentage of subtotal */
const CONTINGENCY_PCT = 0.10

/** Estimated sqft when actual sqft is unknown, by bedroom count */
const ESTIMATED_SQFT: Record<number, number> = {
  1: 750,
  2: 1_000,
  3: 1_400,
  4: 1_800,
  5: 2_200,
}

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface RepairLineItem {
  category: string
  description: string
  low: number
  high: number
  mid: number
  applies: boolean
}

export interface RepairEstimate {
  total: number
  totalLow: number
  totalHigh: number
  perSqft: number
  confidence: 'estimate' | 'rough'

  breakdown: RepairLineItem[]

  assumptions: string[]
  disclaimer: string
}

/** Property details needed for repair estimation */
export interface RepairPropertyInput {
  sqft: number | null
  beds: number | null
  baths: number | null
  yearBuilt: number | null
}

// ─── CONDITION HELPERS ──────────────────────────────────────────────────────

type Condition = 'distressed' | 'fair' | 'good' | 'excellent'

function needsRoof(yearBuilt: number | null, cond: Condition): boolean {
  return cond === 'distressed' && (yearBuilt == null || yearBuilt < 1990)
}

function needsHVAC(yearBuilt: number | null, cond: Condition): boolean {
  return (cond === 'distressed' || cond === 'fair') &&
    (yearBuilt == null || yearBuilt < 2000)
}

function needsElectrical(yearBuilt: number | null): boolean {
  return yearBuilt == null || yearBuilt < 1980
}

function needsPlumbing(yearBuilt: number | null): boolean {
  return yearBuilt == null || yearBuilt < 1980
}

function needsWindows(yearBuilt: number | null, cond: Condition): boolean {
  return cond === 'distressed' && (yearBuilt == null || yearBuilt < 1990)
}

/** Pick a point in the low-high range based on condition */
function conditionMultiplier(cond: Condition): number {
  switch (cond) {
    case 'distressed': return 0.85 // lean toward high end
    case 'fair':       return 0.50 // midpoint
    case 'good':       return 0.25 // lean toward low end
    case 'excellent':  return 0.10 // minimal
  }
}

function lerp(low: number, high: number, t: number): number {
  return Math.round(low + (high - low) * t)
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Estimate repair costs based on property characteristics and condition.
 *
 * @param property - Property details (sqft, beds, baths, yearBuilt)
 * @param condition - "distressed" | "fair" | "good" | "excellent" (defaults to "fair")
 * @param manualRepairCost - If provided by the user, returned as-is with a simplified breakdown
 */
export function estimateRepairCost(
  property: RepairPropertyInput,
  condition?: string | null,
  manualRepairCost?: number | null,
): RepairEstimate {
  const disclaimer = 'This is a rough estimate based on property characteristics. Get a contractor bid before making offers.'

  // If user provided a manual repair cost, use it directly
  if (manualRepairCost != null && manualRepairCost > 0) {
    const sqft = property.sqft ?? ESTIMATED_SQFT[property.beds ?? 3] ?? 1_400
    return {
      total: manualRepairCost,
      totalLow: Math.round(manualRepairCost * 0.8),
      totalHigh: Math.round(manualRepairCost * 1.2),
      perSqft: Math.round(manualRepairCost / sqft),
      confidence: 'estimate',
      breakdown: [{
        category: 'Manual estimate',
        description: 'User-provided repair cost',
        low: Math.round(manualRepairCost * 0.8),
        high: Math.round(manualRepairCost * 1.2),
        mid: manualRepairCost,
        applies: true,
      }],
      assumptions: ['Repair cost provided by user — not auto-estimated'],
      disclaimer,
    }
  }

  const cond: Condition = (['distressed', 'fair', 'good', 'excellent'].includes(condition ?? '')
    ? condition as Condition
    : 'fair')

  const assumptions: string[] = []

  // Determine sqft
  let sqft = property.sqft
  if (sqft == null || sqft === 0) {
    sqft = ESTIMATED_SQFT[property.beds ?? 3] ?? 1_400
    assumptions.push(`Square footage estimated at ${sqft.toLocaleString()} sqft based on ${property.beds ?? 3} bedrooms`)
  }

  if (condition == null) {
    assumptions.push('Condition assumed to be "fair" (not specified)')
  }
  assumptions.push('No structural or foundation issues assumed')
  assumptions.push('Standard residential finishes (not luxury)')

  const baths = property.baths ?? 1
  const t = conditionMultiplier(cond)

  // ── Build line items ──

  const items: RepairLineItem[] = []

  // Kitchen
  const kitchenApplies = cond === 'distressed' || cond === 'fair'
  items.push({
    category: 'Kitchen',
    description: 'Full kitchen renovation including cabinets, counters, appliances',
    low: KITCHEN.low,
    high: KITCHEN.high,
    mid: lerp(KITCHEN.low, KITCHEN.high, t),
    applies: kitchenApplies,
  })

  // Bathrooms
  const bathApplies = cond === 'distressed' || cond === 'fair'
  items.push({
    category: 'Bathrooms',
    description: `${baths} bathroom${baths !== 1 ? 's' : ''} — fixtures, tile, vanity`,
    low: Math.round(BATHROOM.low * baths),
    high: Math.round(BATHROOM.high * baths),
    mid: Math.round(lerp(BATHROOM.low, BATHROOM.high, t) * baths),
    applies: bathApplies,
  })

  // Flooring
  const flooringApplies = cond !== 'excellent'
  items.push({
    category: 'Flooring',
    description: `${sqft.toLocaleString()} sqft — LVP, tile, or hardwood`,
    low: Math.round(FLOORING_PER_SQFT.low * sqft),
    high: Math.round(FLOORING_PER_SQFT.high * sqft),
    mid: Math.round(lerp(FLOORING_PER_SQFT.low, FLOORING_PER_SQFT.high, t) * sqft),
    applies: flooringApplies,
  })

  // Interior paint
  items.push({
    category: 'Interior paint',
    description: `${sqft.toLocaleString()} sqft — walls, ceilings, trim`,
    low: Math.round(PAINT_INT_PER_SQFT.low * sqft),
    high: Math.round(PAINT_INT_PER_SQFT.high * sqft),
    mid: Math.round(lerp(PAINT_INT_PER_SQFT.low, PAINT_INT_PER_SQFT.high, t) * sqft),
    applies: true, // always needed
  })

  // Exterior paint
  const extPaintApplies = cond === 'distressed' || cond === 'fair'
  items.push({
    category: 'Exterior paint',
    description: 'Exterior paint and trim',
    low: PAINT_EXT.low,
    high: PAINT_EXT.high,
    mid: lerp(PAINT_EXT.low, PAINT_EXT.high, t),
    applies: extPaintApplies,
  })

  // Roof
  const roofApplies = needsRoof(property.yearBuilt, cond)
  items.push({
    category: 'Roof',
    description: 'Roof repair or replacement',
    low: ROOF.low,
    high: ROOF.high,
    mid: lerp(ROOF.low, ROOF.high, t),
    applies: roofApplies,
  })

  // HVAC
  const hvacApplies = needsHVAC(property.yearBuilt, cond)
  items.push({
    category: 'HVAC',
    description: 'Heating and cooling system',
    low: HVAC.low,
    high: HVAC.high,
    mid: lerp(HVAC.low, HVAC.high, t),
    applies: hvacApplies,
  })

  // Electrical
  const elecApplies = cond === 'distressed' && needsElectrical(property.yearBuilt)
  items.push({
    category: 'Electrical',
    description: 'Panel and wiring update',
    low: ELECTRICAL.low,
    high: ELECTRICAL.high,
    mid: lerp(ELECTRICAL.low, ELECTRICAL.high, t),
    applies: elecApplies,
  })

  // Plumbing
  const plumbApplies = cond === 'distressed' && needsPlumbing(property.yearBuilt)
  items.push({
    category: 'Plumbing',
    description: 'Pipe and fixture update',
    low: PLUMBING.low,
    high: PLUMBING.high,
    mid: lerp(PLUMBING.low, PLUMBING.high, t),
    applies: plumbApplies,
  })

  // Windows
  const winApplies = needsWindows(property.yearBuilt, cond)
  items.push({
    category: 'Windows',
    description: 'Window replacement',
    low: WINDOWS.low,
    high: WINDOWS.high,
    mid: lerp(WINDOWS.low, WINDOWS.high, t),
    applies: winApplies,
  })

  // Landscaping
  const landApplies = cond !== 'excellent'
  items.push({
    category: 'Landscaping',
    description: 'Curb appeal, lawn, basic landscaping',
    low: LANDSCAPING.low,
    high: LANDSCAPING.high,
    mid: lerp(LANDSCAPING.low, LANDSCAPING.high, t),
    applies: landApplies,
  })

  // Cleanup
  items.push({
    category: 'Dumpster / cleanup',
    description: 'Debris removal and site cleanup',
    low: CLEANUP.low,
    high: CLEANUP.high,
    mid: lerp(CLEANUP.low, CLEANUP.high, t),
    applies: true,
  })

  // ── Sum applicable items ──

  const applicable = items.filter((i) => i.applies)
  const subtotalLow = applicable.reduce((s, i) => s + i.low, 0)
  const subtotalHigh = applicable.reduce((s, i) => s + i.high, 0)
  const subtotalMid = applicable.reduce((s, i) => s + i.mid, 0)

  // Add contingency
  const contingencyLow = Math.round(subtotalLow * CONTINGENCY_PCT)
  const contingencyHigh = Math.round(subtotalHigh * CONTINGENCY_PCT)
  const contingencyMid = Math.round(subtotalMid * CONTINGENCY_PCT)

  items.push({
    category: 'Permits / contingency',
    description: `${Math.round(CONTINGENCY_PCT * 100)}% of subtotal for permits and unexpected costs`,
    low: contingencyLow,
    high: contingencyHigh,
    mid: contingencyMid,
    applies: true,
  })

  const totalLow = subtotalLow + contingencyLow
  const totalHigh = subtotalHigh + contingencyHigh
  const total = subtotalMid + contingencyMid

  return {
    total,
    totalLow,
    totalHigh,
    perSqft: Math.round(total / sqft),
    confidence: sqft === property.sqft ? 'estimate' : 'rough',
    breakdown: items,
    assumptions,
    disclaimer,
  }
}
