import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { toClientProperty } from '@/lib/discovery/to-client-property'
import { groupPropertiesByOwner } from '@/lib/discovery/owner-intelligence'
import { getDataProvider } from '@/lib/discovery/data-provider'
import { AttomApiError } from '@/lib/attom'
import type { OwnerProfile } from '@/lib/types/owner-intelligence'
import type { UnifiedBuyer } from '@/lib/discovery/unified-types'

type SortField = 'propertyCount' | 'totalValue' | 'investorScore'

const VALID_SORT_FIELDS: SortField[] = ['propertyCount', 'totalValue', 'investorScore']

export async function GET(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const params = req.nextUrl.searchParams
    const city = params.get('city') || undefined
    const state = params.get('state') || undefined
    const zip = params.get('zip') || undefined
    const minProperties = Math.max(1, parseInt(params.get('minProperties') || '2'))
    const sortBy = (VALID_SORT_FIELDS.includes(params.get('sortBy') as SortField)
      ? params.get('sortBy')
      : 'investorScore') as SortField
    const limit = Math.min(200, Math.max(1, parseInt(params.get('limit') || '50')))
    const offset = Math.max(0, parseInt(params.get('offset') || '0'))
    const mode = params.get('mode') // "cashBuyers" to use provider.findCashBuyers()

    if (!zip && (!city || !state)) {
      return NextResponse.json(
        { error: 'Provide either zip or city + state' },
        { status: 400 },
      )
    }

    const searchCity = city?.toLowerCase() ?? null
    const searchZip = zip ?? null
    const searchLocation = zip ? zip : `${city}, ${state}`

    const provider = getDataProvider()

    // ── Mode: cashBuyers — use provider for verified cash buyer data ──────
    if (mode === 'cashBuyers' && provider.hasAttom) {
      const buyers = await provider.findCashBuyers({
        city,
        state,
        zipCode: zip,
        minPurchases: minProperties,
        pageSize: limit,
        page: offset > 0 ? Math.floor(offset / limit) + 1 : 1,
      })

      return NextResponse.json({
        owners: buyers.map(buyerToOwnerShape),
        cashBuyers: buyers,
        total: buyers.length,
        searchLocation,
        dataSource: provider.primarySource,
        fromCache: false,
      })
    }

    // ── Default: group cached properties by owner ─────────────────────────
    const rows = await prisma.discoveryProperty.findMany({
      where: {
        expiresAt: { gt: new Date() },
        ...(searchZip ? { searchZip } : { searchCity }),
      },
    })

    if (rows.length === 0) {
      // No cache — if ATTOM available, try cash buyer search directly
      if (provider.hasAttom) {
        const buyers = await provider.findCashBuyers({
          city,
          state,
          zipCode: zip,
          minPurchases: minProperties,
          pageSize: limit,
        })

        return NextResponse.json({
          owners: buyers.map(buyerToOwnerShape),
          cashBuyers: buyers,
          total: buyers.length,
          searchLocation,
          dataSource: provider.primarySource,
          fromCache: false,
        })
      }

      return NextResponse.json({
        owners: [],
        total: 0,
        searchLocation,
        dataSource: provider.primarySource,
        fromCache: false,
      })
    }

    // Convert to client types and group by owner
    const clientProperties = rows.map(toClientProperty)
    const ownerMap = groupPropertiesByOwner(clientProperties)

    // Filter by minProperties and collect into array
    const allOwners: OwnerProfile[] = []
    ownerMap.forEach(owner => {
      if (owner.propertyCount >= minProperties) {
        allOwners.push(owner)
      }
    })

    // Sort
    allOwners.sort((a, b) => {
      if (sortBy === 'propertyCount') return b.propertyCount - a.propertyCount
      if (sortBy === 'totalValue') return b.totalValue - a.totalValue
      return b.investorScore - a.investorScore
    })

    const total = allOwners.length
    const paginated = allOwners.slice(offset, offset + limit)

    return NextResponse.json({
      owners: paginated,
      total,
      searchLocation,
      dataSource: provider.primarySource,
      fromCache: true,
    })
  } catch (err) {
    if (err instanceof AttomApiError) {
      console.error(`ATTOM error in discovery owners: ${err.status} ${err.endpoint}`)
      return NextResponse.json(
        { error: 'Property data provider error' },
        { status: 502 },
      )
    }
    console.error('Discovery owners error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Map a UnifiedBuyer to the OwnerProfile-like shape the frontend expects */
function buyerToOwnerShape(b: UnifiedBuyer): OwnerProfile {
  return {
    normalizedName: b.buyerName.toLowerCase().trim(),
    displayName: b.buyerName,
    properties: [],
    propertyCount: b.cashPurchaseCount,
    totalValue: b.totalCashVolume,
    avgValue: b.avgPurchasePrice ?? 0,
    cities: b.markets,
    propertyTypes: b.propertyTypes,
    likelyCashBuyer: true,
    investorScore: Math.min(100, b.cashPurchaseCount * 15 + (b.corporateIndicator ? 20 : 0)),
    lastPurchaseDate: b.lastPurchaseDate,
    oldestPurchaseDate: null,
  }
}
