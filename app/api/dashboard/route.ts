import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { getCached, setCache } from '@/lib/dashboard-cache'
import { timeQuery } from '@/lib/query-timer'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const pid = profile.id

    // Check cache first
    const cacheKey = `dashboard:${pid}`
    const cached = getCached<Record<string, unknown>>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      activeDeals,
      closedDeals,
      buyerCount,
      campaignCalls,
      recentActivity,
      pendingOffers,
      totalSpreadAgg,
      matchesSent,
      dealsThisMonth,
      recentDeals,
      topMatches,
      pendingOffersList,
      dealPipelineRaw,
      // Contract KPIs
      contractsDraft,
      contractsPending,
      contractsExecuted,
      contractsExecutedThisMonth,
      contractsVoided,
      executedContractsWithOffers,
      recentContracts,
      contractPipelineRaw,
      // Marketplace KPIs
      activeListings,
      totalListingViewsAgg,
      newInquiries,
      recentInquiries,
    ] = await timeQuery('Dashboard.allQueries', () => Promise.all([
      // Existing KPIs
      prisma.deal.count({ where: { profileId: pid, status: 'ACTIVE' } }),
      prisma.deal.count({ where: { profileId: pid, status: 'CLOSED' } }),
      prisma.cashBuyer.count({ where: { profileId: pid, isOptedOut: false } }),
      prisma.campaign.aggregate({
        where: { profileId: pid },
        _sum: { callsCompleted: true },
      }),
      prisma.activityEvent.findMany({
        where: { profileId: pid },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, type: true, title: true, createdAt: true },
      }),

      // New: pending offers count
      prisma.offer.count({
        where: {
          deal: { profileId: pid },
          status: 'PENDING',
        },
      }),

      // New: total spread (sum of assignFee on closed deals)
      prisma.deal.aggregate({
        where: { profileId: pid, status: 'CLOSED', assignFee: { not: null } },
        _sum: { assignFee: true },
      }),

      // New: matches sent in last 30 days
      prisma.dealMatch.count({
        where: {
          deal: { profileId: pid },
          outreachSent: true,
          outreachSentAt: { gte: thirtyDaysAgo },
        },
      }),

      // New: deals created this month
      prisma.deal.count({
        where: { profileId: pid, createdAt: { gte: monthStart } },
      }),

      // New: recent deals (last 5)
      prisma.deal.findMany({
        where: { profileId: pid },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          askingPrice: true,
          status: true,
          createdAt: true,
          offers: { select: { id: true, status: true } },
          matches: { select: { id: true } },
        },
      }),

      // New: top matches (top 5 by score, last 14 days)
      prisma.dealMatch.findMany({
        where: {
          deal: { profileId: pid },
          createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
          outreachSent: false,
        },
        orderBy: { matchScore: 'desc' },
        take: 5,
        select: {
          id: true,
          matchScore: true,
          dealId: true,
          deal: { select: { address: true, city: true, state: true, askingPrice: true } },
          buyer: { select: { id: true, firstName: true, lastName: true, entityName: true } },
        },
      }),

      // New: pending offers (last 5, with deal + buyer info)
      prisma.offer.findMany({
        where: {
          deal: { profileId: pid },
          status: { in: ['PENDING', 'COUNTERED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          dealId: true,
          deal: { select: { address: true, city: true, state: true, askingPrice: true } },
          buyer: { select: { id: true, firstName: true, lastName: true, entityName: true } },
        },
      }),

      // New: deal pipeline (group by status)
      prisma.deal.groupBy({
        by: ['status'],
        where: { profileId: pid },
        _count: { _all: true },
      }),

      // ── Contract KPIs ──────────────────────────────────
      prisma.contract.count({ where: { profileId: pid, status: 'DRAFT' } }),
      prisma.contract.count({ where: { profileId: pid, status: { in: ['SENT'] } } }),
      prisma.contract.count({ where: { profileId: pid, status: 'EXECUTED' } }),
      prisma.contract.count({ where: { profileId: pid, status: 'EXECUTED', updatedAt: { gte: monthStart } } }),
      prisma.contract.count({ where: { profileId: pid, status: 'VOIDED' } }),
      // Fetch executed contracts with offers to sum fees
      prisma.contract.findMany({
        where: { profileId: pid, status: 'EXECUTED', offerId: { not: null } },
        select: { offer: { select: { amount: true } } },
      }),
      prisma.contract.findMany({
        where: { profileId: pid },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          templateName: true,
          status: true,
          createdAt: true,
          deal: { select: { address: true, city: true, state: true } },
          offer: { select: { amount: true, buyer: { select: { firstName: true, lastName: true, entityName: true } } } },
        },
      }),
      // Contract pipeline (group by status)
      prisma.contract.groupBy({
        by: ['status'],
        where: { profileId: pid },
        _count: { _all: true },
      }),

      // ── Marketplace KPIs ───────────────────────────────
      prisma.marketplaceListing.count({ where: { profileId: pid, status: 'ACTIVE' } }),
      prisma.marketplaceListing.aggregate({
        where: { profileId: pid },
        _sum: { viewCount: true },
      }),
      prisma.marketplaceInquiry.count({
        where: { listing: { profileId: pid }, status: 'NEW' },
      }),
      prisma.marketplaceInquiry.findMany({
        where: { listing: { profileId: pid }, status: 'NEW' },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: {
          id: true,
          buyerName: true,
          message: true,
          createdAt: true,
          listing: { select: { address: true, city: true, state: true } },
        },
      }),
    ]))

    // Transform pipelines into maps
    const dealPipeline: Record<string, number> = {}
    for (const row of dealPipelineRaw) {
      dealPipeline[row.status] = row._count._all
    }

    const contractPipeline: Record<string, number> = {}
    for (const row of contractPipelineRaw) {
      contractPipeline[row.status] = row._count._all
    }

    // Sum fees from executed contracts with linked offers
    const totalFeesCollected = executedContractsWithOffers.reduce(
      (sum: number, c: { offer: { amount: number } | null }) => sum + (c.offer?.amount || 0),
      0,
    )

    const responseData = {
      kpis: {
        activeDeals,
        closedDeals,
        buyerCount,
        aiCalls: campaignCalls._sum.callsCompleted || 0,
        pendingOffers,
        totalSpread: totalSpreadAgg._sum.assignFee || 0,
        matchesSent,
        dealsThisMonth,
        contractsDraft,
        contractsPending,
        contractsExecuted,
        contractsExecutedThisMonth,
        contractsVoided,
        totalFeesCollected,
        activeListings,
        totalListingViews: totalListingViewsAgg._sum.viewCount || 0,
        newInquiries,
      },
      recentActivity,
      recentDeals,
      topMatches,
      pendingOffersList,
      dealPipeline,
      contractPipeline,
      recentContracts,
      recentInquiries,
    }

    setCache(cacheKey, responseData)
    return NextResponse.json(responseData)
  } catch (err) {
    logger.error('GET /api/dashboard failed', { route: '/api/dashboard', method: 'GET', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
