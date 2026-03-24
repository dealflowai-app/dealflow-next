import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { toClientProperty } from '@/lib/discovery/to-client-property'
import { logger } from '@/lib/logger'

/**
 * GET /api/discovery/bounds?north=...&south=...&east=...&west=...&limit=200
 *
 * Returns cached properties within the given lat/lng bounding box.
 * Does NOT call external data providers — only queries the local cache.
 */
export async function GET(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const params = req.nextUrl.searchParams
    const north = parseFloat(params.get('north') || '')
    const south = parseFloat(params.get('south') || '')
    const east = parseFloat(params.get('east') || '')
    const west = parseFloat(params.get('west') || '')
    const limit = Math.min(500, Math.max(1, parseInt(params.get('limit') || '200')))

    if ([north, south, east, west].some(isNaN)) {
      return NextResponse.json(
        { error: 'Provide north, south, east, west bounds' },
        { status: 400 }
      )
    }

    const properties = await prisma.discoveryProperty.findMany({
      where: {
        expiresAt: { gt: new Date() },
        latitude: { gte: south, lte: north },
        longitude: { gte: west, lte: east },
      },
      take: limit,
      orderBy: [{ assessedValue: 'desc' }],
    })

    return NextResponse.json({
      properties: properties.map(toClientProperty),
      total: properties.length,
    })
  } catch (err) {
    logger.error('Discovery bounds error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
