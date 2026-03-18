import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { normalizeAddressKey } from '@/lib/analysis/cache'
import { logger } from '@/lib/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistorySummary {
  id: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string | null
  askingPrice: number | null
  arv: number | null
  dealScore: number | null
  dealGrade: string | null
  recommendation: string | null
  flipProfit: number | null
  monthlyCashFlow: number | null
  compCount: number | null
  confidence: string | null
  analyzedAt: string
  isExpired: boolean
  savedAsDeal: boolean
  dealId: string | null
}

// ─── Helper: extract summary from cached JSON ───────────────────────────────

function extractSummary(
  entry: { id: string; rawAddress: string; cachedAt: Date; expiresAt: Date; result: unknown },
  dealLookup: Map<string, string>,
  now: Date,
): HistorySummary {
  const r = entry.result as Record<string, unknown> | null
  if (!r) {
    return {
      id: entry.id,
      address: entry.rawAddress,
      city: '', state: '', zip: '',
      propertyType: null, askingPrice: null, arv: null,
      dealScore: null, dealGrade: null, recommendation: null,
      flipProfit: null, monthlyCashFlow: null,
      compCount: null, confidence: null,
      analyzedAt: entry.cachedAt.toISOString(),
      isExpired: entry.expiresAt <= now,
      savedAsDeal: false, dealId: null,
    }
  }

  // Handle both FullDealAnalysis shape (has property.property) and PropertyAnalysis shape
  const full = r as Record<string, Record<string, unknown> | null>
  const propOuter = full.property as Record<string, unknown> | null
  const prop = (propOuter?.property ?? propOuter ?? {}) as Record<string, unknown>
  const arv = (full.arv ?? {}) as Record<string, unknown>
  const flip = full.flip as Record<string, unknown> | null
  const rental = full.rental as Record<string, unknown> | null
  const ds = full.dealScore as Record<string, unknown> | null
  const compSummary = (arv.compSummary ?? {}) as Record<string, unknown>
  const confidence = (arv.confidence ?? {}) as Record<string, unknown>

  const address = (prop.address as string) ?? entry.rawAddress
  const city = (prop.city as string) ?? ''
  const state = (prop.state as string) ?? ''
  const zip = (prop.zip as string) ?? ''

  const lookupKey = `${address}|${city}|${state}`.toLowerCase()
  const dealId = dealLookup.get(lookupKey) ?? null

  return {
    id: entry.id,
    address,
    city,
    state,
    zip,
    propertyType: (prop.propertyType as string) ?? null,
    askingPrice: (flip?.purchasePrice as number) ?? null,
    arv: (arv.arv as number) ?? null,
    dealScore: (ds?.score as number) ?? null,
    dealGrade: (ds?.grade as string) ?? null,
    recommendation: (ds?.recommendation as string) ?? null,
    flipProfit: (flip?.netProfit as number) ?? null,
    monthlyCashFlow: (rental?.monthlyCashFlow as number) ?? null,
    compCount: (compSummary.used as number) ?? null,
    confidence: (confidence.level as string) ?? null,
    analyzedAt: entry.cachedAt.toISOString(),
    isExpired: entry.expiresAt <= now,
    savedAsDeal: dealId != null,
    dealId,
  }
}

// ─── GET /api/analysis/history — List analysis history ──────────────────────

export async function GET(req: NextRequest) {
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  const url = req.nextUrl
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '20')), 50)
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0') || 0)
  const sort = url.searchParams.get('sort') || 'newest'

  try {
    // Fetch all cache entries for this user (small dataset per user)
    const entries = await prisma.analysisCache.findMany({
      where: { profileId: profile.id },
      orderBy: { cachedAt: 'desc' },
    })

    // Build deal lookup for savedAsDeal check
    const deals = await prisma.deal.findMany({
      where: { profileId: profile.id },
      select: { id: true, address: true, city: true, state: true },
    })
    const dealLookup = new Map<string, string>()
    for (const d of deals) {
      dealLookup.set(`${d.address}|${d.city}|${d.state}`.toLowerCase(), d.id)
    }

    // Count today's analyses for API usage tracker
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayCount = entries.filter((e) => e.cachedAt >= todayStart).length

    // Extract summaries
    const now = new Date()
    const history = entries.map((e) => extractSummary(e, dealLookup, now))

    // Sort
    if (sort === 'oldest') {
      history.reverse()
    } else if (sort === 'score_desc') {
      history.sort((a, b) => (b.dealScore ?? -1) - (a.dealScore ?? -1))
    } else if (sort === 'price_asc') {
      history.sort((a, b) => (a.askingPrice ?? Infinity) - (b.askingPrice ?? Infinity))
    } else if (sort === 'price_desc') {
      history.sort((a, b) => (b.askingPrice ?? -1) - (a.askingPrice ?? -1))
    }
    // 'newest' is already the default order from DB

    const total = history.length
    const paginated = history.slice(offset, offset + limit)

    return successResponse({ history: paginated, total, limit, offset, todayCount })
  } catch (err) {
    logger.error('Failed to fetch analysis history', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
    })
    return errorResponse(500, 'Internal server error')
  }
}

// ─── DELETE /api/analysis/history — Bulk delete ─────────────────────────────

export async function DELETE(req: NextRequest) {
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const { ids, clearAll } = body as { ids?: unknown; clearAll?: unknown }

  try {
    let deleted: number

    if (clearAll === true) {
      const result = await prisma.analysisCache.deleteMany({
        where: { profileId: profile.id },
      })
      deleted = result.count
    } else if (Array.isArray(ids) && ids.length > 0 && ids.length <= 100) {
      const stringIds = ids.filter((id): id is string => typeof id === 'string')
      const result = await prisma.analysisCache.deleteMany({
        where: { id: { in: stringIds }, profileId: profile.id },
      })
      deleted = result.count
    } else {
      return errorResponse(400, 'Provide ids array (max 100) or clearAll: true')
    }

    return successResponse({ deleted })
  } catch (err) {
    logger.error('Failed to delete analysis history', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
    })
    return errorResponse(500, 'Internal server error')
  }
}
