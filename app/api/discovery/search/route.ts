import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { toClientProperty } from '@/lib/discovery/to-client-property'
import { getDataProvider } from '@/lib/discovery/data-provider'
import { RentCastError } from '@/lib/rentcast'
import { BatchDataApiError } from '@/lib/batchdata'
import { requireTier, FEATURE_TIERS } from '@/lib/subscription-guard'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// Map frontend property type values to DB format
const PROPERTY_TYPE_MAP: Record<string, string> = {
  SFR: 'Single Family',
  'Multi-Family': 'Multi Family',
  Land: 'Land',
  Condo: 'Condo',
  Commercial: 'Commercial',
}

export async function GET(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Rate limit: 20 searches per minute per user
    const rl = rateLimit(`discovery-search:${profile.id}`, 20, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    // Enforce minimum tier for discovery
    const tierGuard = await requireTier(profile.id, FEATURE_TIERS.discovery)
    if (tierGuard) return tierGuard

    const params = req.nextUrl.searchParams
    const city = params.get('city') || undefined
    const state = params.get('state') || undefined
    const zip = params.get('zip') || undefined
    const propertyType = params.get('propertyType') || undefined
    const bedsMin = params.get('bedsMin') ? parseInt(params.get('bedsMin')!) : undefined
    const bedsMax = params.get('bedsMax') ? parseInt(params.get('bedsMax')!) : undefined
    const bathsMin = params.get('bathsMin') ? parseInt(params.get('bathsMin')!) : undefined
    const bathsMax = params.get('bathsMax') ? parseInt(params.get('bathsMax')!) : undefined
    const sqftMin = params.get('sqftMin') ? parseInt(params.get('sqftMin')!) : undefined
    const sqftMax = params.get('sqftMax') ? parseInt(params.get('sqftMax')!) : undefined
    const yearBuiltMin = params.get('yearBuiltMin') ? parseInt(params.get('yearBuiltMin')!) : undefined
    const yearBuiltMax = params.get('yearBuiltMax') ? parseInt(params.get('yearBuiltMax')!) : undefined
    const valueMin = params.get('valueMin') ? parseInt(params.get('valueMin')!) : undefined
    const valueMax = params.get('valueMax') ? parseInt(params.get('valueMax')!) : undefined
    const absenteeOnly = params.get('absenteeOnly') === 'true'
    const ownerType = params.get('ownerType') || undefined
    const ownershipMin = params.get('ownershipMin') ? parseInt(params.get('ownershipMin')!) : undefined
    const limit = Math.min(200, Math.max(1, parseInt(params.get('limit') || '50')))
    const offset = Math.max(0, parseInt(params.get('offset') || '0'))

    // Validate: need either city+state or zip
    if (!zip && (!city || !state)) {
      return NextResponse.json(
        { error: 'Provide either zip or city + state' },
        { status: 400 }
      )
    }

    const searchCity = city?.toLowerCase() ?? null
    const searchZip = zip ?? null
    const searchLocation = zip ? zip : `${city}, ${state}`

    const provider = getDataProvider()

    // ── 1. Check cache ──────────────────────────────────────────────────────
    const cacheWhere: Prisma.DiscoveryPropertyWhereInput = {
      expiresAt: { gt: new Date() },
      ...(searchZip ? { searchZip } : { searchCity }),
    }

    // Apply filters to cache query
    const filterWhere: Prisma.DiscoveryPropertyWhereInput = { ...cacheWhere }
    if (propertyType) {
      const mapped = propertyType.split(',').map((t) => PROPERTY_TYPE_MAP[t.trim()] ?? t.trim())
      filterWhere.propertyType = { in: mapped }
    }
    if (bedsMin !== undefined || bedsMax !== undefined) {
      filterWhere.bedrooms = {
        ...(bedsMin !== undefined ? { gte: bedsMin } : {}),
        ...(bedsMax !== undefined ? { lte: bedsMax } : {}),
      }
    }
    if (bathsMin !== undefined || bathsMax !== undefined) {
      filterWhere.bathrooms = {
        ...(bathsMin !== undefined ? { gte: bathsMin } : {}),
        ...(bathsMax !== undefined ? { lte: bathsMax } : {}),
      }
    }
    if (sqftMin !== undefined || sqftMax !== undefined) {
      filterWhere.sqft = {
        ...(sqftMin !== undefined ? { gte: sqftMin } : {}),
        ...(sqftMax !== undefined ? { lte: sqftMax } : {}),
      }
    }
    if (yearBuiltMin !== undefined || yearBuiltMax !== undefined) {
      filterWhere.yearBuilt = {
        ...(yearBuiltMin !== undefined ? { gte: yearBuiltMin } : {}),
        ...(yearBuiltMax !== undefined ? { lte: yearBuiltMax } : {}),
      }
    }
    if (valueMin !== undefined || valueMax !== undefined) {
      filterWhere.assessedValue = {
        ...(valueMin !== undefined ? { gte: valueMin } : {}),
        ...(valueMax !== undefined ? { lte: valueMax } : {}),
      }
    }
    if (absenteeOnly) {
      filterWhere.ownerOccupied = { equals: false }
    }
    if (ownerType) {
      // Owner type filtering by name pattern matching
      const types = ownerType.split(',').map(t => t.trim())
      const ownerNameConditions: Prisma.DiscoveryPropertyWhereInput[] = []
      for (const t of types) {
        if (t === 'Individual') {
          // Individual: names that do NOT match entity patterns
          ownerNameConditions.push({
            ownerName: { not: { equals: null } },
            NOT: {
              OR: [
                { ownerName: { contains: 'LLC', mode: 'insensitive' } },
                { ownerName: { contains: 'Corp', mode: 'insensitive' } },
                { ownerName: { contains: 'Inc', mode: 'insensitive' } },
                { ownerName: { contains: 'Trust', mode: 'insensitive' } },
                { ownerName: { contains: 'Bank', mode: 'insensitive' } },
                { ownerName: { contains: 'Holdings', mode: 'insensitive' } },
              ],
            },
          })
        } else if (t === 'LLC/Corp') {
          ownerNameConditions.push({
            OR: [
              { ownerName: { contains: 'LLC', mode: 'insensitive' } },
              { ownerName: { contains: 'Corp', mode: 'insensitive' } },
              { ownerName: { contains: 'Inc', mode: 'insensitive' } },
              { ownerName: { contains: 'Holdings', mode: 'insensitive' } },
              { ownerName: { contains: 'LP', mode: 'insensitive' } },
            ],
          })
        } else if (t === 'Trust') {
          ownerNameConditions.push({
            ownerName: { contains: 'Trust', mode: 'insensitive' },
          })
        } else if (t === 'Bank-Owned') {
          ownerNameConditions.push({
            OR: [
              { ownerName: { contains: 'Bank', mode: 'insensitive' } },
              { ownerName: { contains: 'Federal', mode: 'insensitive' } },
              { ownerName: { contains: 'Mortgage', mode: 'insensitive' } },
            ],
          })
        }
      }
      if (ownerNameConditions.length > 0) {
        filterWhere.OR = ownerNameConditions
      }
    }
    if (ownershipMin !== undefined) {
      // Filter by last sale date being at least N years ago
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - ownershipMin)
      filterWhere.lastSaleDate = { lte: cutoff }
    }
    const daysOnMarketMin = params.get('daysOnMarketMin') ? parseInt(params.get('daysOnMarketMin')!) : undefined
    if (daysOnMarketMin !== undefined) {
      filterWhere.daysOnMarket = { gte: daysOnMarketMin }
    }

    // Check if cache has any rows for this location (before filters)
    const cacheCount = await prisma.discoveryProperty.count({ where: cacheWhere })

    if (cacheCount > 0) {
      const [properties, total] = await Promise.all([
        prisma.discoveryProperty.findMany({
          where: filterWhere,
          skip: offset,
          take: limit,
          orderBy: [{ assessedValue: 'desc' }, { cachedAt: 'desc' }],
        }),
        prisma.discoveryProperty.count({ where: filterWhere }),
      ])

      return NextResponse.json({
        properties: properties.map(toClientProperty),
        total,
        fromCache: true,
        dataSource: provider.primarySource,
        searchLocation,
      })
    }

    // ── 2. Fetch from data provider ─────────────────────────────────────────
    // Fetch broadly (no narrow filters) to populate cache.
    // Filters are applied locally from the cached data.
    const unified = await provider.searchProperties({
      city,
      state,
      zipCode: zip,
      pageSize: 500, // fetch max to populate cache
    })

    // ── 3. Upsert into cache ────────────────────────────────────────────────
    if (unified.length > 0) {
      const upserts = unified.map((p) => {
        const data = {
          rentcastId: p.dataSource === 'rentcast' ? p.id : null,
          userId: profile.id,
          addressLine1: p.addressLine1,
          city: p.city,
          state: p.state,
          zipCode: p.zipCode,
          county: p.county,
          latitude: p.latitude,
          longitude: p.longitude,
          propertyType: p.propertyType,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          sqft: p.sqft,
          lotSize: p.lotSize,
          yearBuilt: p.yearBuilt,
          assessedValue: p.assessedValue,
          taxAmount: p.taxAmount,
          lastSaleDate: p.lastSaleDate ? new Date(p.lastSaleDate) : null,
          lastSalePrice: p.lastSalePrice,
          ownerName: p.ownerName,
          ownerOccupied: p.ownerOccupied,
          features: Prisma.JsonNull,
          rawResponse: p.enrichmentLevel != null
            ? ({
                enrichmentLevel: p.enrichmentLevel,
                dataSource: p.dataSource,
                ...(p._batchdataRaw ? { batchdata: p._batchdataRaw } : {}),
              } as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          searchCity,
          searchZip,
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }

        // For RentCast results, upsert by rentcastId. For BatchData, upsert by address.
        if (p.dataSource === 'rentcast' && p.id) {
          return prisma.discoveryProperty.upsert({
            where: { rentcastId: p.id },
            create: data,
            update: {
              ...data,
              userId: undefined, // don't overwrite if another user cached first
            },
          })
        }

        // BatchData: upsert by composite address to avoid duplicate rows
        return prisma.discoveryProperty.upsert({
          where: {
            addressCityState: {
              addressLine1: p.addressLine1,
              city: p.city,
              state: p.state,
            },
          },
          create: data,
          update: {
            ...data,
            userId: undefined,
          },
        })
      })

      await Promise.all(upserts)
    }

    // ── 4. Read back from DB with filters applied ───────────────────────────
    const [properties, total] = await Promise.all([
      prisma.discoveryProperty.findMany({
        where: filterWhere,
        skip: offset,
        take: limit,
        orderBy: [{ assessedValue: 'desc' }, { cachedAt: 'desc' }],
      }),
      prisma.discoveryProperty.count({ where: filterWhere }),
    ])

    return NextResponse.json({
      properties: properties.map(toClientProperty),
      total,
      fromCache: false,
      dataSource: provider.primarySource,
      searchLocation,
    })
  } catch (err) {
    if (err instanceof BatchDataApiError) {
      logger.error(`BatchData error in discovery search: ${err.status} ${err.endpoint}`)
      const clientStatus = err.status === 429 ? 429 : 502
      return NextResponse.json(
        { error: err.status === 429 ? 'Rate limit exceeded, try again shortly' : 'Property data provider error' },
        { status: clientStatus }
      )
    }
    if (err instanceof RentCastError) {
      logger.error(`RentCast error in discovery search: ${err.status}`)
      const clientStatus = err.status === 429 ? 429 : 502
      return NextResponse.json(
        { error: err.status === 429 ? 'Rate limit exceeded, try again shortly' : 'Property data provider error' },
        { status: clientStatus }
      )
    }
    logger.error('Discovery search error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
