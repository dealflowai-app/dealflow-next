import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateApiKey, hasScope } from '@/lib/api-key-auth'
import { logger } from '@/lib/logger'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  if (!hasScope(auth, 'deals:read')) return NextResponse.json({ error: 'Insufficient scope' }, { status: 403 })

  const rl = rateLimit(`api:${auth.keyId}`, 100, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 20, 100)
    const offset = Number(req.nextUrl.searchParams.get('offset')) || 0
    const status = req.nextUrl.searchParams.get('status')

    const where: Record<string, unknown> = { profileId: auth.profileId }
    if (status) where.status = status.toUpperCase()

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({ where, take: limit, skip: offset, orderBy: { createdAt: 'desc' } }),
      prisma.deal.count({ where }),
    ])

    return NextResponse.json({ data: deals, total, limit, offset })
  } catch (err) {
    logger.error('GET /api/v1/deals error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
