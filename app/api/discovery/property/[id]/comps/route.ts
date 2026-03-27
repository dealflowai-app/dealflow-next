import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { RentCastClient, RentCastError } from '@/lib/rentcast'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Rate limit: 15 comp requests per minute per user
    const rl = rateLimit(`discovery-comps:${profile.id}`, 15, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { id } = await context.params

    const row = await prisma.discoveryProperty.findUnique({ where: { id } })
    if (!row) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const apiKey = process.env.RENTCAST_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Comps not available' }, { status: 501 })
    }

    const address = `${row.addressLine1}, ${row.city}, ${row.state} ${row.zipCode ?? ''}`
    const client = new RentCastClient(apiKey)
    const valuation = await client.getValueEstimate(address)

    return NextResponse.json({
      value: valuation.value,
      valueRangeLow: valuation.valueRangeLow,
      valueRangeHigh: valuation.valueRangeHigh,
      comparables: (valuation.comparables ?? []).map((c) => ({
        address: c.formattedAddress,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        price: c.price,
        sqft: c.squareFootage,
        bedrooms: c.bedrooms,
        bathrooms: c.bathrooms,
        distance: c.distance,
        correlation: c.correlation,
        listedDate: c.listedDate,
      })),
    })
  } catch (err) {
    if (err instanceof RentCastError) {
      logger.error(`RentCast comps error: ${err.status}`)
      return NextResponse.json(
        { error: err.status === 429 ? 'Rate limit exceeded' : 'Comps unavailable' },
        { status: err.status === 429 ? 429 : 502 },
      )
    }
    logger.error('Comps error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
