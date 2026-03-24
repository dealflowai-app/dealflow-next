import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { toClientProperty } from '@/lib/discovery/to-client-property'
import { groupPropertiesByOwner } from '@/lib/discovery/owner-intelligence'
import { getDataProvider } from '@/lib/discovery/data-provider'
import { BatchDataApiError } from '@/lib/batchdata'
import type { OwnerProfile } from '@/lib/types/owner-intelligence'
import { logger } from '@/lib/logger'

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

    // ── Default: group cached properties by owner ─────────────────────────
    const rows = await prisma.discoveryProperty.findMany({
      where: {
        expiresAt: { gt: new Date() },
        ...(searchZip ? { searchZip } : { searchCity }),
      },
    })

    if (rows.length === 0) {
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
    if (err instanceof BatchDataApiError) {
      logger.error(`BatchData error in discovery owners: ${err.status} ${err.endpoint}`)
      return NextResponse.json(
        { error: 'Property data provider error' },
        { status: 502 },
      )
    }
    logger.error('Discovery owners error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
