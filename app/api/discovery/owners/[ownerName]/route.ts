import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { toClientProperty } from '@/lib/discovery/to-client-property'
import {
  normalizeOwnerName,
  detectLikelyCashBuyer,
  calculateInvestorScore,
} from '@/lib/discovery/owner-intelligence'
import type { OwnerProfile } from '@/lib/types/owner-intelligence'

export async function GET(
  req: NextRequest,
  { params }: { params: { ownerName: string } },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const ownerName = decodeURIComponent(params.ownerName)
    if (!ownerName.trim()) {
      return NextResponse.json({ error: 'Owner name is required' }, { status: 400 })
    }

    // Case-insensitive search across the entire cache
    const rows = await prisma.discoveryProperty.findMany({
      where: {
        expiresAt: { gt: new Date() },
        ownerName: { contains: ownerName, mode: 'insensitive' },
      },
      orderBy: [{ assessedValue: 'desc' }, { cachedAt: 'desc' }],
    })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    const properties = rows.map(toClientProperty)

    // Group by normalized name and find the best match
    const normalized = normalizeOwnerName(ownerName)

    // Filter to properties whose normalized owner name matches
    const matched = properties.filter(
      p => normalizeOwnerName(p.ownerName) === normalized,
    )

    // Fall back to all results if exact normalized match fails
    // (the ILIKE query may have returned close matches)
    const finalProps = matched.length > 0 ? matched : properties

    const count = finalProps.length
    const totalValue = finalProps.reduce((s: number, p) => s + (p.assessedValue ?? 0), 0)
    const avgValue = count > 0 ? Math.round(totalValue / count) : 0
    const cities = Array.from(new Set(finalProps.map(p => p.city).filter(Boolean)))
    const propertyTypes = Array.from(new Set(
      finalProps.map(p => p.propertyType).filter((t): t is string => t !== null),
    ))

    const absenteeCount = finalProps.filter(p => p.ownerOccupied === false).length
    const absenteeRatio = count > 0 ? absenteeCount / count : 0

    const saleDates = finalProps
      .map(p => p.lastSaleDate)
      .filter((d): d is string => d !== null)
      .sort()
    const lastPurchaseDate = saleDates.length > 0 ? saleDates[saleDates.length - 1] : null
    const oldestPurchaseDate = saleDates.length > 0 ? saleDates[0] : null

    const likelyCashBuyer = finalProps.some(p => detectLikelyCashBuyer(p, count))
    const investorScore = calculateInvestorScore({
      propertyCount: count,
      totalValue,
      propertyTypes,
      absenteeRatio,
      lastPurchaseDate,
    })

    // Use the longest original name as display name
    const displayName = finalProps.reduce(
      (best, p) => (p.ownerName && p.ownerName.length > best.length ? p.ownerName : best),
      finalProps[0].ownerName ?? ownerName,
    )

    const ownerProfile: OwnerProfile = {
      normalizedName: normalized,
      displayName,
      properties: finalProps,
      propertyCount: count,
      totalValue,
      avgValue,
      cities,
      propertyTypes,
      likelyCashBuyer,
      investorScore,
      lastPurchaseDate,
      oldestPurchaseDate,
    }

    return NextResponse.json({ owner: ownerProfile })
  } catch (err) {
    console.error('Discovery owner detail error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
