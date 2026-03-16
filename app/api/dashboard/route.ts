import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const pid = profile.id
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
    ] = await Promise.all([
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
    ])

    // Transform pipeline into a map
    const dealPipeline: Record<string, number> = {}
    for (const row of dealPipelineRaw) {
      dealPipeline[row.status] = row._count._all
    }

    return NextResponse.json({
      kpis: {
        activeDeals,
        closedDeals,
        buyerCount,
        aiCalls: campaignCalls._sum.callsCompleted || 0,
        pendingOffers,
        totalSpread: totalSpreadAgg._sum.assignFee || 0,
        matchesSent,
        dealsThisMonth,
      },
      recentActivity,
      recentDeals,
      topMatches,
      pendingOffersList,
      dealPipeline,
    })
  } catch (err) {
    console.error('GET /api/dashboard error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
