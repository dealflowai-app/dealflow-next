import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { getDataProvider } from '@/lib/discovery/data-provider'
import { toClientProperty } from '@/lib/discovery/to-client-property'
import {
  normalizeOwnerName,
  groupPropertiesByOwner,
} from '@/lib/discovery/owner-intelligence'
import { BatchDataApiError } from '@/lib/batchdata'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await context.params

    // ── Look up the property to get owner name ────────────────────────────
    const row = await prisma.discoveryProperty.findUnique({ where: { id } })
    if (!row) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (!row.ownerName) {
      return NextResponse.json({
        owner: null,
        portfolio: { properties: [], propertyCount: 0, totalValue: 0 },
        dataSource: 'rentcast',
      })
    }

    const provider = getDataProvider()

    // ── BatchData path: owner profile via BatchData API ─────────────────
    if (provider.hasBatchData) {
      try {
        const ownerProfile = await provider.getOwnerPortfolio(
          row.ownerName,
          `${row.city}, ${row.state}`,
        )

        // Also search cached properties by this owner name for local data
        const normalized = normalizeOwnerName(row.ownerName)
        const cachedRows = await prisma.discoveryProperty.findMany({
          where: {
            ownerName: { not: null },
            expiresAt: { gt: new Date() },
            OR: [
              ...(row.searchCity ? [{ searchCity: row.searchCity }] : []),
              ...(row.searchZip ? [{ searchZip: row.searchZip }] : []),
            ],
          },
        })

        const matchingRows = cachedRows.filter(
          (r) => normalizeOwnerName(r.ownerName) === normalized
        )
        const otherProperties = matchingRows
          .filter((r) => r.id !== id)
          .map(toClientProperty)

        return NextResponse.json({
          owner: ownerProfile,
          portfolio: {
            properties: otherProperties,
            propertyCount: ownerProfile.portfolio.propertyCount || matchingRows.length,
            totalValue: ownerProfile.portfolio.totalValue ||
              matchingRows.reduce((sum, r) => sum + (r.assessedValue ?? 0), 0),
          },
          dataSource: provider.primarySource,
        })
      } catch (err) {
        if (!(err instanceof BatchDataApiError)) throw err
        console.error(`BatchData owner lookup failed, falling back: ${err.status}`)
        // Fall through to RentCast path
      }
    }

    // ── RentCast path: search cache by owner name ─────────────────────────
    const normalized = normalizeOwnerName(row.ownerName)
    const location = `${row.city}, ${row.state}`

    // Search all cached properties (same search area) for this owner
    const cachedRows = await prisma.discoveryProperty.findMany({
      where: {
        ownerName: { not: null },
        expiresAt: { gt: new Date() },
        // Broaden search: same city or same zip
        OR: [
          ...(row.searchCity ? [{ searchCity: row.searchCity }] : []),
          ...(row.searchZip ? [{ searchZip: row.searchZip }] : []),
        ],
      },
    })

    const clientProperties = cachedRows.map(toClientProperty)
    const ownerGroups = groupPropertiesByOwner(clientProperties)
    const ownerGroup = ownerGroups.get(normalized)

    if (!ownerGroup) {
      return NextResponse.json({
        owner: {
          dataSource: 'rentcast' as const,
          ownerName: row.ownerName,
          ownerName2: null,
          corporateIndicator: false,
          absenteeOwner: row.ownerOccupied === false,
          mailingAddress: null,
          ownershipLength: { ownedSince: null, yearsOwned: null },
          portfolio: {
            propertyCount: 1,
            totalValue: row.assessedValue ?? 0,
            avgValue: row.assessedValue ?? 0,
            cities: [row.city],
            propertyTypes: row.propertyType ? [row.propertyType] : [],
          },
          investorScore: 0,
          likelyCashBuyer: false,
        },
        portfolio: {
          properties: [],
          propertyCount: 1,
          totalValue: row.assessedValue ?? 0,
        },
        dataSource: 'rentcast',
      })
    }

    const otherProperties = ownerGroup.properties.filter((p) => p.id !== id)

    return NextResponse.json({
      owner: {
        dataSource: 'rentcast' as const,
        ownerName: ownerGroup.displayName,
        ownerName2: null,
        corporateIndicator: ownerGroup.likelyCashBuyer,
        absenteeOwner: ownerGroup.properties.some((p) => p.ownerOccupied === false),
        mailingAddress: null,
        ownershipLength: {
          ownedSince: ownerGroup.oldestPurchaseDate,
          yearsOwned: ownerGroup.oldestPurchaseDate
            ? Math.round(
                ((Date.now() - new Date(ownerGroup.oldestPurchaseDate).getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000)) *
                  10,
              ) / 10
            : null,
        },
        portfolio: {
          propertyCount: ownerGroup.propertyCount,
          totalValue: ownerGroup.totalValue,
          avgValue: ownerGroup.avgValue,
          cities: ownerGroup.cities,
          propertyTypes: ownerGroup.propertyTypes,
        },
        investorScore: ownerGroup.investorScore,
        likelyCashBuyer: ownerGroup.likelyCashBuyer,
      },
      portfolio: {
        properties: otherProperties,
        propertyCount: ownerGroup.propertyCount,
        totalValue: ownerGroup.totalValue,
      },
      dataSource: provider.primarySource,
    })
  } catch (err) {
    if (err instanceof BatchDataApiError) {
      console.error(`BatchData error in portfolio: ${err.status} ${err.endpoint}`)
      return NextResponse.json(
        { error: 'Property data provider error' },
        { status: 502 },
      )
    }
    console.error('Portfolio error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
