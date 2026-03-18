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

    // Week start (Monday)
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    weekStart.setHours(0, 0, 0, 0)

    // Today start
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    // 14 days ago (for sparkline)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

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
      // Outreach KPIs
      activeCampaignsCount,
      callsThisWeek,
      callsToday,
      qualifiedThisWeek,
      connectedThisWeek,
      avgCallDurationAgg,
      totalCallSecsAgg,
      recentCalls,
      topCampaigns,
      callsByChannel,
      callsLast14Days,
      recentCampaignEvents,
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

      // ── Outreach KPIs ──────────────────────────────────
      prisma.campaign.count({ where: { profileId: pid, status: 'RUNNING' } }),
      prisma.campaignCall.count({
        where: { campaign: { profileId: pid }, startedAt: { gte: weekStart } },
      }),
      prisma.campaignCall.count({
        where: { campaign: { profileId: pid }, startedAt: { gte: todayStart } },
      }),
      prisma.campaignCall.count({
        where: { campaign: { profileId: pid }, outcome: 'QUALIFIED', startedAt: { gte: weekStart } },
      }),
      // Connected calls this week (for qualification rate calculation)
      prisma.campaignCall.count({
        where: {
          campaign: { profileId: pid },
          startedAt: { gte: weekStart },
          outcome: { notIn: ['NO_ANSWER', 'VOICEMAIL'], not: null },
        },
      }),
      // Avg call duration (last 30 days)
      prisma.campaignCall.aggregate({
        where: { campaign: { profileId: pid }, durationSecs: { gt: 0 }, startedAt: { gte: thirtyDaysAgo } },
        _avg: { durationSecs: true },
      }),
      // Total call minutes (all time)
      prisma.campaignCall.aggregate({
        where: { campaign: { profileId: pid } },
        _sum: { durationSecs: true },
      }),
      // Recent calls (last 5)
      prisma.campaignCall.findMany({
        where: { campaign: { profileId: pid }, outcome: { not: null } },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          outcome: true,
          durationSecs: true,
          channel: true,
          startedAt: true,
          buyer: { select: { id: true, firstName: true, lastName: true, entityName: true } },
          campaign: { select: { id: true, name: true } },
        },
      }),
      // Top campaigns by qualification rate (min 10 calls)
      prisma.campaign.findMany({
        where: { profileId: pid, callsCompleted: { gte: 10 } },
        orderBy: { qualified: 'desc' },
        take: 3,
        select: {
          id: true, name: true, channel: true, status: true,
          totalBuyers: true, callsCompleted: true, qualified: true, notBuying: true,
        },
      }),
      // Calls by channel (last 30 days)
      prisma.campaignCall.groupBy({
        by: ['channel'],
        where: { campaign: { profileId: pid }, startedAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      }),
      // Calls per day (last 14 days, for sparkline)
      prisma.campaignCall.findMany({
        where: { campaign: { profileId: pid }, startedAt: { gte: fourteenDaysAgo } },
        select: { startedAt: true, outcome: true },
        orderBy: { startedAt: 'asc' },
      }),
      // Recent campaign events (status changes for activity feed)
      prisma.campaign.findMany({
        where: { profileId: pid, startedAt: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, name: true, status: true, totalBuyers: true, qualified: true, startedAt: true, completedAt: true, updatedAt: true },
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

    // ── Process outreach data ──────────────────────────
    const qualificationRate = connectedThisWeek > 0
      ? Math.round((qualifiedThisWeek / connectedThisWeek) * 100)
      : 0
    const avgCallDuration = Math.round(avgCallDurationAgg._avg.durationSecs || 0)
    const totalCallMinutes = Math.round((totalCallSecsAgg._sum.durationSecs || 0) / 60)
    const totalCallsAllTime = (campaignCalls._sum.callsCompleted || 0)

    // Calls per day (sparkline data)
    const callsPerDay: { date: string; total: number; qualified: number }[] = []
    const dayBuckets: Record<string, { total: number; qualified: number }> = {}
    for (const c of callsLast14Days) {
      if (!c.startedAt) continue
      const date = c.startedAt.toISOString().split('T')[0]
      if (!dayBuckets[date]) dayBuckets[date] = { total: 0, qualified: 0 }
      dayBuckets[date].total++
      if (c.outcome === 'QUALIFIED') dayBuckets[date].qualified++
    }
    // Fill in missing days
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const date = d.toISOString().split('T')[0]
      callsPerDay.push({ date, total: dayBuckets[date]?.total || 0, qualified: dayBuckets[date]?.qualified || 0 })
    }

    // Channel breakdown
    const outreachByChannel: Record<string, number> = {}
    for (const row of callsByChannel) {
      outreachByChannel[row.channel || 'VOICE'] = row._count._all
    }

    // Campaign performance (derive qualification rate)
    const campaignPerformance = topCampaigns.map(c => {
      const connected = c.qualified + c.notBuying
      return {
        id: c.id,
        name: c.name,
        channel: c.channel,
        status: c.status,
        totalBuyers: c.totalBuyers,
        callsCompleted: c.callsCompleted,
        qualified: c.qualified,
        qualificationRate: connected > 0 ? Math.round((c.qualified / connected) * 100) : 0,
      }
    })

    // Outreach activity events (synthesized from campaign data)
    const outreachEvents: { id: string; type: string; title: string; createdAt: string }[] = []
    for (const c of recentCampaignEvents) {
      if (c.status === 'COMPLETED' && c.completedAt) {
        outreachEvents.push({
          id: `camp-completed-${c.id}`,
          type: 'campaign',
          title: `Campaign "${c.name}" completed — ${c.qualified} qualified out of ${c.totalBuyers}`,
          createdAt: c.completedAt.toISOString(),
        })
      } else if (c.status === 'RUNNING' && c.startedAt) {
        outreachEvents.push({
          id: `camp-started-${c.id}`,
          type: 'campaign',
          title: `Campaign "${c.name}" launched with ${c.totalBuyers} buyers`,
          createdAt: c.startedAt.toISOString(),
        })
      }
    }

    const responseData = {
      kpis: {
        activeDeals,
        closedDeals,
        buyerCount,
        aiCalls: totalCallsAllTime,
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
        // Outreach KPIs
        activeCampaigns: activeCampaignsCount,
        callsThisWeek,
        callsToday,
        qualifiedThisWeek,
        qualificationRate,
        avgCallDuration,
        totalCallMinutes,
      },
      recentActivity,
      recentDeals,
      topMatches,
      pendingOffersList,
      dealPipeline,
      contractPipeline,
      recentContracts,
      recentInquiries,
      // Outreach data
      outreach: {
        recentCalls,
        campaignPerformance,
        callsPerDay,
        outreachByChannel,
        outreachEvents,
      },
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
