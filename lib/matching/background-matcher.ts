/**
 * Background Deal Matcher
 *
 * Runs periodically to match buyer buy boxes against Discovery property cache.
 * Groups buyers by criteria to batch searches, creates MatchAlert records for
 * new matches, and queues notifications based on alert frequency preferences.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface CriteriaGroup {
  propertyTypes: string[]
  markets: Array<{ city: string; state: string }>
  minPrice: number | null
  maxPrice: number | null
  buyers: Array<{
    id: string
    profileId: string
    preferredMarkets: string[]
    preferredTypes: string[]
    preferredZips: string[]
    minPrice: number | null
    maxPrice: number | null
    alertFrequency: string
  }>
}

interface MatcherResult {
  buyersProcessed: number
  propertiesScanned: number
  newMatches: number
  errors: number
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Parse "City, ST" strings into { city, state } */
function parseMarket(market: string): { city: string; state: string } | null {
  const match = market.match(/^(.+?),\s*([A-Z]{2})$/i)
  if (!match) return null
  return { city: match[1].trim(), state: match[2].trim().toUpperCase() }
}

/** Score how well a property matches a buyer's criteria (0-100) */
function calculateMatchScore(
  buyer: CriteriaGroup['buyers'][number],
  property: {
    propertyType: string | null
    city: string
    state: string
    zipCode: string | null
    assessedValue: number | null
  },
): number {
  let score = 0
  let factors = 0

  // Property type match (30pts)
  if (buyer.preferredTypes.length > 0 && property.propertyType) {
    factors += 30
    const normalized = property.propertyType.toUpperCase().replace(/[\s-]/g, '_')
    if (buyer.preferredTypes.some(t => t === normalized || property.propertyType?.toLowerCase().includes(t.toLowerCase()))) {
      score += 30
    }
  }

  // Location match (40pts)
  factors += 40
  const propertyMarket = `${property.city}, ${property.state}`.toLowerCase()

  // Exact zip match is strongest
  if (buyer.preferredZips.length > 0 && property.zipCode && buyer.preferredZips.includes(property.zipCode)) {
    score += 40
  } else if (buyer.preferredMarkets.some(m => m.toLowerCase() === propertyMarket)) {
    score += 35
  } else if (buyer.preferredMarkets.some(m => {
    const parsed = parseMarket(m)
    return parsed && parsed.state.toUpperCase() === property.state.toUpperCase()
  })) {
    score += 15
  }

  // Price match (30pts)
  if ((buyer.minPrice != null || buyer.maxPrice != null) && property.assessedValue != null) {
    factors += 30
    const min = buyer.minPrice ?? 0
    const max = buyer.maxPrice ?? 999_999_999
    if (property.assessedValue >= min && property.assessedValue <= max) {
      score += 30
    } else {
      // Partial credit for being close (within 20%)
      const priceDiff = property.assessedValue < min
        ? (min - property.assessedValue) / min
        : (property.assessedValue - max) / max
      if (priceDiff <= 0.2) score += 15
    }
  }

  // Normalize to 0-100 based on applicable factors
  return factors > 0 ? Math.round((score / factors) * 100) : 50
}

/** Generate a unique key for a criteria group to batch searches */
function criteriaKey(buyer: CriteriaGroup['buyers'][number]): string {
  const types = [...buyer.preferredTypes].sort().join(',')
  const markets = [...buyer.preferredMarkets].sort().join(',')
  const zips = [...buyer.preferredZips].sort().join(',')
  return `${types}|${markets}|${zips}|${buyer.minPrice ?? ''}|${buyer.maxPrice ?? ''}`
}

/** Group buyers by similar criteria to batch searches */
function groupByCriteria(buyers: CriteriaGroup['buyers']): CriteriaGroup[] {
  const groups = new Map<string, CriteriaGroup>()

  for (const buyer of buyers) {
    const key = criteriaKey(buyer)
    let group = groups.get(key)

    if (!group) {
      const markets: CriteriaGroup['markets'] = []
      for (const m of buyer.preferredMarkets) {
        const parsed = parseMarket(m)
        if (parsed) markets.push(parsed)
      }

      group = {
        propertyTypes: buyer.preferredTypes,
        markets,
        minPrice: buyer.minPrice,
        maxPrice: buyer.maxPrice,
        buyers: [],
      }
      groups.set(key, group)
    }

    group.buyers.push(buyer)
  }

  return Array.from(groups.values())
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

export async function runBackgroundMatcher(): Promise<MatcherResult> {
  const startTime = Date.now()
  const result: MatcherResult = {
    buyersProcessed: 0,
    propertiesScanned: 0,
    newMatches: 0,
    errors: 0,
  }

  try {
    // 1. Query all buyers with alerts enabled
    const alertBuyers = await prisma.cashBuyer.findMany({
      where: {
        alertsEnabled: true,
        contactType: { in: ['BUYER', 'BOTH'] },
        status: { in: ['ACTIVE', 'HIGH_CONFIDENCE', 'RECENTLY_VERIFIED'] },
        profileId: { not: null },
        // Must have at least some buy box criteria
        OR: [
          { preferredMarkets: { isEmpty: false } },
          { preferredZips: { isEmpty: false } },
        ],
      },
      select: {
        id: true,
        profileId: true,
        preferredMarkets: true,
        preferredTypes: true,
        preferredZips: true,
        minPrice: true,
        maxPrice: true,
        alertFrequency: true,
      },
    })

    if (alertBuyers.length === 0) {
      logger.info('Background matcher: no buyers with alerts enabled')
      return result
    }

    result.buyersProcessed = alertBuyers.length

    // Filter out buyers without profileId (shouldn't happen due to where clause)
    const validBuyers = alertBuyers
      .filter((b): b is typeof b & { profileId: string } => b.profileId != null)
      .map(b => ({
        ...b,
        preferredTypes: b.preferredTypes.map(String),
      }))

    // 2. Group by criteria to batch searches
    const criteriaGroups = groupByCriteria(validBuyers)

    logger.info('Background matcher: processing groups', {
      buyers: validBuyers.length,
      groups: criteriaGroups.length,
    })

    // 3. For each group, search Discovery cache
    for (const group of criteriaGroups) {
      try {
        // Build the where clause for Discovery search
        const whereConditions: Record<string, unknown>[] = []

        // Market filters (city + state)
        if (group.markets.length > 0) {
          whereConditions.push(
            ...group.markets.map(m => ({
              city: { equals: m.city, mode: 'insensitive' as const },
              state: { equals: m.state, mode: 'insensitive' as const },
            })),
          )
        }

        // Zip filters
        const allZips = group.buyers.flatMap(b => b.preferredZips)
        if (allZips.length > 0) {
          whereConditions.push({ zipCode: { in: Array.from(new Set(allZips)) } })
        }

        if (whereConditions.length === 0) continue

        const properties = await prisma.discoveryProperty.findMany({
          where: {
            expiresAt: { gt: new Date() },
            ...(group.propertyTypes.length > 0 ? {
              propertyType: { in: group.propertyTypes.map(t => {
                // Map enum values to Discovery property types
                const map: Record<string, string> = {
                  'SFR': 'Single Family',
                  'MULTI_FAMILY': 'Multi Family',
                  'LAND': 'Land',
                  'COMMERCIAL': 'Commercial',
                  'CONDO': 'Condo',
                  'MOBILE_HOME': 'Mobile Home',
                }
                return map[t] ?? t
              }) },
            } : {}),
            ...(group.minPrice != null || group.maxPrice != null ? {
              assessedValue: {
                ...(group.minPrice != null ? { gte: group.minPrice } : {}),
                ...(group.maxPrice != null ? { lte: group.maxPrice } : {}),
              },
            } : {}),
            OR: whereConditions,
          },
          select: {
            id: true,
            propertyType: true,
            city: true,
            state: true,
            zipCode: true,
            assessedValue: true,
            addressLine1: true,
          },
          take: 500,
        })

        result.propertiesScanned += properties.length

        // 4. For each property, check each buyer for new matches
        for (const property of properties) {
          for (const buyer of group.buyers) {
            const matchScore = calculateMatchScore(buyer, property)

            // Only create alerts for decent matches (>= 40)
            if (matchScore < 40) continue

            try {
              // Upsert — if already matched, skip
              await prisma.matchAlert.upsert({
                where: {
                  buyerId_propertyId: {
                    buyerId: buyer.id,
                    propertyId: property.id,
                  },
                },
                update: {}, // Don't update existing matches
                create: {
                  profileId: buyer.profileId,
                  buyerId: buyer.id,
                  propertyId: property.id,
                  matchScore,
                  status: 'NEW',
                },
              })

              result.newMatches++
            } catch {
              // Unique constraint race condition — safe to ignore
            }
          }
        }
      } catch (err) {
        result.errors++
        logger.error('Background matcher: group processing error', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // 5. Create notifications for realtime alert buyers
    await createRealtimeNotifications()

  } catch (err) {
    result.errors++
    logger.error('Background matcher: fatal error', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const durationMs = Date.now() - startTime
  logger.info('Background matcher complete', { ...result, durationMs })
  return result
}

// ─── NOTIFICATION CREATION ──────────────────────────────────────────────────

/**
 * For buyers with alertFrequency: 'realtime', create in-app notifications
 * for any NEW match alerts that haven't been notified yet.
 */
async function createRealtimeNotifications(): Promise<void> {
  const unnotified = await prisma.matchAlert.findMany({
    where: {
      status: 'NEW',
      notifiedAt: null,
      buyer: {
        alertFrequency: 'realtime',
      },
    },
    include: {
      buyer: {
        select: { firstName: true, lastName: true, entityName: true },
      },
      property: {
        select: { addressLine1: true, city: true, state: true },
      },
    },
    take: 200,
  })

  if (unnotified.length === 0) return

  // Group by profileId
  const byProfile = new Map<string, typeof unnotified>()
  for (const alert of unnotified) {
    const existing = byProfile.get(alert.profileId) ?? []
    existing.push(alert)
    byProfile.set(alert.profileId, existing)
  }

  const entries = Array.from(byProfile.entries())
  for (const [profileId, alerts] of entries) {
    if (alerts.length === 1) {
      const a = alerts[0]
      const buyerName = a.buyer.firstName
        ? `${a.buyer.firstName} ${a.buyer.lastName ?? ''}`.trim()
        : a.buyer.entityName ?? 'A buyer'
      const addr = `${a.property.addressLine1}, ${a.property.city}`

      await prisma.notification.create({
        data: {
          profileId,
          type: 'match_alert',
          title: 'New deal match',
          body: `${addr} matches ${buyerName}'s criteria (${a.matchScore}% match)`,
          data: {
            matchAlertId: a.id,
            buyerId: a.buyerId,
            propertyId: a.propertyId,
            matchScore: a.matchScore,
          },
        },
      })
    } else {
      // Batch notification
      await prisma.notification.create({
        data: {
          profileId,
          type: 'match_alert',
          title: `${alerts.length} new deal matches`,
          body: `${alerts.length} properties match your buyer criteria. Review them now.`,
          data: {
            matchAlertIds: alerts.map((a: typeof alerts[number]) => a.id),
            count: alerts.length,
          },
        },
      })
    }

    // Mark alerts as SENT
    await prisma.matchAlert.updateMany({
      where: { id: { in: alerts.map((a: typeof alerts[number]) => a.id) } },
      data: { status: 'SENT', notifiedAt: new Date() },
    })
  }
}
