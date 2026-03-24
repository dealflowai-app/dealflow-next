import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, hasScope } from '@/lib/api-key-auth'
import { logger } from '@/lib/logger'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  if (!hasScope(auth, 'buyers:read')) return NextResponse.json({ error: 'Insufficient scope' }, { status: 403 })

  const rl = rateLimit(`api:${auth.keyId}`, 100, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 20, 100)
    const offset = Number(req.nextUrl.searchParams.get('offset')) || 0
    const status = req.nextUrl.searchParams.get('status')

    const where: Record<string, unknown> = { profileId: auth.profileId }
    if (status) where.status = status.toUpperCase()

    const [buyers, total] = await Promise.all([
      prisma.cashBuyer.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          entityName: true,
          phone: true,
          email: true,
          city: true,
          state: true,
          zip: true,
          status: true,
          buyerScore: true,
          buyerType: true,
          motivation: true,
          cashPurchaseCount: true,
          lastPurchaseDate: true,
          estimatedMinPrice: true,
          estimatedMaxPrice: true,
          preferredZips: true,
          lastContactedAt: true,
          createdAt: true,
        },
      }),
      prisma.cashBuyer.count({ where }),
    ])

    return NextResponse.json({ data: buyers, total, limit, offset })
  } catch (err) {
    logger.error('GET /api/v1/buyers error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
