/**
 * Duplicate Detection Service — Pure functions that identify potential
 * duplicate buyers by phone, email, entity name, and name+market.
 * No database calls — all data passed in as arguments.
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface BuyerForDuplicateCheck {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  phone: string | null
  email: string | null
  city: string | null
  state: string | null
  buyerScore: number
  createdAt: Date
}

export interface DuplicateGroup {
  confidence: 'high' | 'medium' | 'low'
  reason: string
  buyerIds: string[]
  buyers: Array<{
    id: string
    firstName: string | null
    lastName: string | null
    entityName: string | null
    phone: string | null
    email: string | null
    city: string | null
    state: string | null
    buyerScore: number
    createdAt: Date
  }>
}

// ─── NORMALIZATION HELPERS ───────────────────────────────────────────────────

/** Strip all non-digit characters from a phone number */
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  // Take last 10 digits to handle country code prefix
  return digits.length >= 10 ? digits.slice(-10) : digits.length > 0 ? digits : null
}

/** Lowercase and trim email */
function normalizeEmail(email: string | null): string | null {
  if (!email) return null
  const trimmed = email.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Normalize entity name by stripping common suffixes, punctuation, and extra spaces.
 * e.g. "Apex Property Group LLC" -> "apex property group"
 */
function normalizeEntityName(name: string | null): string | null {
  if (!name) return null
  let normalized = name.toLowerCase().trim()

  // Strip common business suffixes
  const suffixes = [
    'llc', 'inc', 'corp', 'ltd', 'company', 'co',
    'group', 'holdings', 'investments', 'properties',
    'realty', 'capital',
  ]
  for (const suffix of suffixes) {
    // Remove suffix at end of string (with optional trailing punctuation)
    normalized = normalized.replace(new RegExp(`\\b${suffix}\\.?\\s*$`), '')
    // Also remove suffix followed by comma
    normalized = normalized.replace(new RegExp(`\\b${suffix}\\.?,\\s*`), '')
  }

  // Strip punctuation and collapse whitespace
  normalized = normalized.replace(/[.,\-_'"()]/g, ' ').replace(/\s+/g, ' ').trim()

  return normalized.length > 0 ? normalized : null
}

// ─── DUPLICATE DETECTION ─────────────────────────────────────────────────────

/**
 * Find groups of potential duplicate buyers from a list.
 * Detection rules are checked in priority order — once two buyers are grouped
 * by a higher-confidence rule, they won't appear again in a lower-confidence group.
 *
 * @param buyers - Array of buyer records to scan
 * @returns Array of duplicate groups sorted by confidence (high first)
 */
export function findPotentialDuplicates(buyers: BuyerForDuplicateCheck[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = []
  const alreadyGrouped = new Set<string>()

  // Helper to process groups from an index map
  function processIndex(
    index: Map<string, BuyerForDuplicateCheck[]>,
    confidence: 'high' | 'medium' | 'low',
    reason: string,
  ) {
    index.forEach((group) => {
      if (group.length < 2) return
      const ids = group.map((b: BuyerForDuplicateCheck) => b.id)
      groups.push({
        confidence,
        reason,
        buyerIds: ids,
        buyers: group.map(toBuyerSummary),
      })
      ids.forEach((id: string) => alreadyGrouped.add(id))
    })
  }

  // --- Pass 1: Exact phone match (high confidence) ---
  const phoneIndex = new Map<string, BuyerForDuplicateCheck[]>()
  for (const buyer of buyers) {
    const norm = normalizePhone(buyer.phone)
    if (!norm) continue
    const arr = phoneIndex.get(norm)
    if (arr) arr.push(buyer)
    else phoneIndex.set(norm, [buyer])
  }
  processIndex(phoneIndex, 'high', 'Same phone number')

  // --- Pass 2: Exact email match (high confidence) ---
  const emailIndex = new Map<string, BuyerForDuplicateCheck[]>()
  for (const buyer of buyers) {
    if (alreadyGrouped.has(buyer.id)) continue
    const norm = normalizeEmail(buyer.email)
    if (!norm) continue
    const arr = emailIndex.get(norm)
    if (arr) arr.push(buyer)
    else emailIndex.set(norm, [buyer])
  }
  processIndex(emailIndex, 'high', 'Same email address')

  // --- Pass 3: Entity name match (medium confidence) ---
  const entityIndex = new Map<string, BuyerForDuplicateCheck[]>()
  for (const buyer of buyers) {
    if (alreadyGrouped.has(buyer.id)) continue
    const norm = normalizeEntityName(buyer.entityName)
    if (!norm) continue
    const arr = entityIndex.get(norm)
    if (arr) arr.push(buyer)
    else entityIndex.set(norm, [buyer])
  }
  processIndex(entityIndex, 'medium', 'Similar entity name')

  // --- Pass 4: Name + market match (low confidence) ---
  const nameMarketIndex = new Map<string, BuyerForDuplicateCheck[]>()
  for (const buyer of buyers) {
    if (alreadyGrouped.has(buyer.id)) continue
    if (!buyer.firstName || !buyer.lastName) continue

    const nameKey = `${buyer.firstName.toLowerCase().trim()}|${buyer.lastName.toLowerCase().trim()}`

    if (buyer.city) {
      const key = `${nameKey}|city:${buyer.city.toLowerCase().trim()}`
      const arr = nameMarketIndex.get(key)
      if (arr) arr.push(buyer)
      else nameMarketIndex.set(key, [buyer])
    }
    if (buyer.state) {
      const key = `${nameKey}|state:${buyer.state.toLowerCase().trim()}`
      const arr = nameMarketIndex.get(key)
      if (arr) arr.push(buyer)
      else nameMarketIndex.set(key, [buyer])
    }
  }
  // Deduplicate: a buyer might appear in both city and state groups
  const lowGroupSeen = new Set<string>()
  nameMarketIndex.forEach((group) => {
    if (group.length < 2) return
    const ids = group.map((b: BuyerForDuplicateCheck) => b.id).sort()
    const groupKey = ids.join(',')
    if (lowGroupSeen.has(groupKey)) return
    lowGroupSeen.add(groupKey)

    const ungrouped = group.filter((b: BuyerForDuplicateCheck) => !alreadyGrouped.has(b.id))
    if (ungrouped.length < 2) return

    const finalIds = ungrouped.map((b: BuyerForDuplicateCheck) => b.id)
    groups.push({
      confidence: 'low',
      reason: 'Same name + market',
      buyerIds: finalIds,
      buyers: ungrouped.map(toBuyerSummary),
    })
    finalIds.forEach((id: string) => alreadyGrouped.add(id))
  })

  return groups
}

/**
 * Find potential duplicates for a single specific buyer against a list of others.
 * Returns all groups that contain the target buyer.
 *
 * @param target - The buyer to check
 * @param allBuyers - All other buyers to compare against (should not include target)
 */
export function findDuplicatesForBuyer(
  target: BuyerForDuplicateCheck,
  allBuyers: BuyerForDuplicateCheck[],
): DuplicateGroup[] {
  // Include the target in the full list so the grouping algorithm works
  const fullList = [target, ...allBuyers.filter((b) => b.id !== target.id)]
  const allGroups = findPotentialDuplicates(fullList)

  // Return only groups that contain the target buyer
  return allGroups.filter((g) => g.buyerIds.includes(target.id))
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function toBuyerSummary(b: BuyerForDuplicateCheck) {
  return {
    id: b.id,
    firstName: b.firstName,
    lastName: b.lastName,
    entityName: b.entityName,
    phone: b.phone,
    email: b.email,
    city: b.city,
    state: b.state,
    buyerScore: b.buyerScore,
    createdAt: b.createdAt,
  }
}
