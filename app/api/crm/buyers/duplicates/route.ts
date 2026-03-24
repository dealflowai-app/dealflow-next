import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { findPotentialDuplicates, type BuyerForDuplicateCheck } from '@/lib/duplicates'
import { logger } from '@/lib/logger'

/**
 * GET /api/crm/buyers/duplicates
 *
 * Scan all non-opted-out buyers for the current user and return groups
 * of potential duplicates with confidence levels.
 *
 * Query params:
 *   - confidence: "high" | "medium" | "low" — filter by confidence level
 *   - limit: number — max groups to return (default 50)
 */
export async function GET(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const params = req.nextUrl.searchParams
    const confidenceFilter = params.get('confidence') || ''
    const limit = Math.min(200, Math.max(1, parseInt(params.get('limit') || '50')))

    // Fetch only the fields needed for duplicate detection
    const buyers = await prisma.cashBuyer.findMany({
      where: { profileId: profile.id, isOptedOut: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        entityName: true,
        phone: true,
        email: true,
        city: true,
        state: true,
        buyerScore: true,
        createdAt: true,
      },
    })

    let groups = findPotentialDuplicates(buyers as BuyerForDuplicateCheck[])

    // Filter by confidence if requested
    if (confidenceFilter && ['high', 'medium', 'low'].includes(confidenceFilter)) {
      groups = groups.filter((g) => g.confidence === confidenceFilter)
    }

    // Build summary before limiting
    const summary = {
      high: groups.filter((g) => g.confidence === 'high').length,
      medium: groups.filter((g) => g.confidence === 'medium').length,
      low: groups.filter((g) => g.confidence === 'low').length,
      totalDuplicateBuyers: groups.reduce((sum, g) => sum + g.buyerIds.length, 0),
    }

    // Apply limit
    groups = groups.slice(0, limit)

    return NextResponse.json({ groups, summary })
  } catch (err) {
    logger.error('GET /api/crm/buyers/duplicates error', { route: '/api/crm/buyers/duplicates', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to scan for duplicates' }, { status: 500 })
  }
}
