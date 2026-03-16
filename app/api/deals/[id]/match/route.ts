import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logBulkActivity } from '@/lib/activity'
import {
  rankBuyersForDeal,
  type DealForMatching,
  type BuyerForMatching,
  type PropertyType,
  type InvestorStrategy,
  type ConditionPreference,
  type BuyerStatus,
} from '@/lib/matching'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { timeQuery } from '@/lib/query-timer'
import { logger } from '@/lib/logger'

// Fields selected from CashBuyer — only what BuyerForMatching needs
const BUYER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  entityName: true,
  phone: true,
  email: true,
  preferredMarkets: true,
  preferredTypes: true,
  preferredZips: true,
  strategy: true,
  conditionPreference: true,
  minPrice: true,
  maxPrice: true,
  closeSpeedDays: true,
  proofOfFundsVerified: true,
  buyerScore: true,
  status: true,
  lastContactedAt: true,
  cashPurchaseCount: true,
} as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Rate limit: 10 match runs per minute
    const rl = rateLimit(`match:${profile.id}`, 10, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { id } = await params

    // Parse optional body params
    let minScore = 20
    let limit = 50
    try {
      const body = await req.json()
      if (body.minScore != null) minScore = Number(body.minScore)
      if (body.limit != null) limit = Number(body.limit)
    } catch {
      // No body is fine — use defaults
    }

    if (minScore < 0 || minScore > 100) minScore = 20
    if (limit < 1 || limit > 500) limit = 50

    // Fetch deal and verify ownership
    const deal = await prisma.deal.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Pre-filter: narrow candidates before full scoring
    // Only fetch buyers whose buy box might overlap with this deal
    const priceThreshold = Math.round(deal.askingPrice * 0.8)
    const buyers = await timeQuery('Match.buyerFetch', () => prisma.cashBuyer.findMany({
      where: {
        profileId: profile.id,
        isOptedOut: false,
        status: { not: 'DO_NOT_CALL' },
        OR: [
          // Buyers with no max price set (open to anything)
          { maxPrice: null },
          // Buyers whose budget is within range of the asking price
          { maxPrice: { gte: priceThreshold } },
        ],
      },
      select: BUYER_SELECT,
    }))

    // Map to matching engine types
    const dealInput: DealForMatching = {
      id: deal.id,
      city: deal.city,
      state: deal.state,
      zip: deal.zip,
      propertyType: deal.propertyType as PropertyType,
      askingPrice: deal.askingPrice,
      arv: deal.arv,
      repairCost: deal.repairCost,
      condition: deal.condition,
      beds: deal.beds,
      baths: deal.baths != null ? Math.floor(deal.baths) : null,
      sqft: deal.sqft,
      yearBuilt: deal.yearBuilt,
    }

    const buyerInputs: BuyerForMatching[] = buyers.map((b) => ({
      id: b.id,
      preferredMarkets: b.preferredMarkets,
      preferredTypes: b.preferredTypes as PropertyType[],
      preferredZips: b.preferredZips,
      strategy: b.strategy as InvestorStrategy | null,
      conditionPreference: b.conditionPreference as ConditionPreference | null,
      minPrice: b.minPrice,
      maxPrice: b.maxPrice,
      closeSpeedDays: b.closeSpeedDays,
      proofOfFundsVerified: b.proofOfFundsVerified,
      buyerScore: b.buyerScore,
      status: b.status as BuyerStatus,
      lastContactedAt: b.lastContactedAt,
      cashPurchaseCount: b.cashPurchaseCount,
    }))

    // Run the matching engine
    const results = await timeQuery('Match.scoring', () => Promise.resolve(rankBuyersForDeal(dealInput, buyerInputs, undefined, { minScore, limit })))

    // Persist results in a transaction: delete old matches, create new ones
    await prisma.$transaction([
      prisma.dealMatch.deleteMany({ where: { dealId: deal.id } }),
      prisma.dealMatch.createMany({
        data: results.map((r) => ({
          dealId: deal.id,
          buyerId: r.buyerId,
          matchScore: r.matchScore,
          buyBoxScore: r.buyBoxScore,
          priceScore: r.priceScore,
          strategyScore: r.strategyScore,
          timingScore: r.timingScore,
          closeProbScore: r.closeProbScore,
        })),
      }),
    ])

    // Log activity for each matched buyer (fire-and-forget)
    const dealAddress = [deal.address, deal.city, deal.state].filter(Boolean).join(', ')
    logBulkActivity(
      results.map((r) => ({
        buyerId: r.buyerId,
        profileId: profile.id,
        type: 'deal_matched',
        title: `Matched to deal at ${dealAddress}`,
        metadata: {
          dealId: deal.id,
          matchScore: r.matchScore,
          buyBoxScore: r.buyBoxScore,
          priceScore: r.priceScore,
          strategyScore: r.strategyScore,
          timingScore: r.timingScore,
          closeProbScore: r.closeProbScore,
        },
      })),
    )

    // Build buyer name lookup for response
    const buyerMap = new Map(buyers.map((b) => [b.id, b]))
    const matches = results.map((r) => {
      const b = buyerMap.get(r.buyerId)
      return {
        ...r,
        buyerName: b
          ? [b.firstName, b.lastName].filter(Boolean).join(' ') || b.entityName || 'Unknown'
          : 'Unknown',
        buyerEmail: b?.email ?? null,
        buyerPhone: b?.phone ?? null,
      }
    })

    return NextResponse.json({
      matches,
      total: buyers.length,
      matched: results.length,
    })
  } catch (err) {
    logger.error('POST /api/deals/[id]/match failed', { route: '/api/deals/[id]/match', method: 'POST', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to run matching', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    // Verify deal ownership
    const deal = await prisma.deal.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true },
    })
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const matches = await prisma.dealMatch.findMany({
      where: { dealId: id },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entityName: true,
            phone: true,
            email: true,
            status: true,
            buyerScore: true,
            preferredTypes: true,
            strategy: true,
            minPrice: true,
            maxPrice: true,
          },
        },
      },
      orderBy: { matchScore: 'desc' },
    })

    return NextResponse.json({ matches })
  } catch (err) {
    logger.error('GET /api/deals/[id]/match failed', { route: '/api/deals/[id]/match', method: 'GET', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch matches', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
