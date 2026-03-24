import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, hasScope } from '@/lib/api-key-auth'
import { logger } from '@/lib/logger'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  if (!hasScope(auth, 'marketplace:read')) return NextResponse.json({ error: 'Insufficient scope' }, { status: 403 })

  const rl = rateLimit(`api:${auth.keyId}`, 100, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 20, 100)
    const offset = Number(req.nextUrl.searchParams.get('offset')) || 0
    const status = req.nextUrl.searchParams.get('status')
    const state = req.nextUrl.searchParams.get('state')
    const propertyType = req.nextUrl.searchParams.get('propertyType')
    const minPrice = req.nextUrl.searchParams.get('minPrice')
    const maxPrice = req.nextUrl.searchParams.get('maxPrice')

    const where: Record<string, unknown> = {}
    // Marketplace listings are public within the platform — filter by caller's own listings if desired
    const mine = req.nextUrl.searchParams.get('mine')
    if (mine === 'true') where.profileId = auth.profileId
    if (status) where.status = status.toUpperCase()
    if (state) where.state = state.toUpperCase()
    if (propertyType) where.propertyType = propertyType.toUpperCase()
    if (minPrice || maxPrice) {
      where.askingPrice = {
        ...(minPrice ? { gte: Number(minPrice) } : {}),
        ...(maxPrice ? { lte: Number(maxPrice) } : {}),
      }
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          propertyType: true,
          askingPrice: true,
          assignFee: true,
          arv: true,
          repairCost: true,
          flipProfit: true,
          rentalCashFlow: true,
          beds: true,
          baths: true,
          sqft: true,
          yearBuilt: true,
          condition: true,
          confidenceScore: true,
          latitude: true,
          longitude: true,
          headline: true,
          description: true,
          photoUrls: true,
          status: true,
          viewCount: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      prisma.marketplaceListing.count({ where }),
    ])

    return NextResponse.json({ data: listings, total, limit, offset })
  } catch (err) {
    logger.error('GET /api/v1/marketplace error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
