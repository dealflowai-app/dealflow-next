import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalUsers,
    newUsersThisWeek,
    tierCounts,
    trialUsers,
    trialExpiringThisWeek,
    recentPayments,
    totalDeals,
    totalBuyers,
    totalContracts,
    activeListings,
    totalUsage,
    cancelledCount,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.profile.groupBy({
      by: ['tier'],
      _count: { tier: true },
    }),
    prisma.profile.count({
      where: {
        tier: 'free',
        trialEndsAt: { gt: now },
      },
    }),
    prisma.profile.count({
      where: {
        tier: 'free',
        trialEndsAt: { gt: now, lt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.paymentHistory.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { amount: true, status: true },
    }),
    prisma.deal.count().catch(() => 0),
    prisma.cashBuyer.count().catch(() => 0),
    prisma.contract.count().catch(() => 0),
    prisma.marketplaceListing.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
    prisma.usage.aggregate({
      _sum: {
        aiCallMinutes: true,
        smsCount: true,
        skipTraces: true,
        dealsClosed: true,
      },
    }),
    prisma.profile.count({
      where: {
        tierStatus: 'cancelled',
        updatedAt: { gte: monthAgo },
      },
    }),
  ])

  // Calculate MRR
  const tierPrices: Record<string, number> = { starter: 149, pro: 299, business: 499, enterprise: 499 }
  let mrr = 0
  const tierBreakdown: Record<string, number> = {}
  for (const tc of tierCounts) {
    tierBreakdown[tc.tier] = tc._count.tier
    if (tierPrices[tc.tier]) {
      mrr += tierPrices[tc.tier] * tc._count.tier
    }
  }

  const paidSubscribers =
    (tierBreakdown.starter || 0) + (tierBreakdown.pro || 0) + (tierBreakdown.business || 0) + (tierBreakdown.enterprise || 0)

  // Revenue MTD from payments
  const revenueMtd =
    recentPayments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0) / 100

  // Usage revenue MTD (usage charges beyond subscription)
  const usageRevenueMtd = Math.max(0, revenueMtd - mrr)

  // Churn rate
  const paidAtStartOfMonth = paidSubscribers + cancelledCount
  const churnRate =
    paidAtStartOfMonth > 0
      ? Math.round((cancelledCount / paidAtStartOfMonth) * 100)
      : 0

  // Active users (7d) - approximate by checking users with recent usage or recent updatedAt
  const activeUsers7d = await prisma.profile.count({
    where: { updatedAt: { gte: weekAgo } },
  })

  // User growth data (last 30 days)
  const userGrowth: { date: string; total: number; paid: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    date.setHours(23, 59, 59, 999)
    const dateStr = date.toISOString().split('T')[0]

    const [total, paid] = await Promise.all([
      prisma.profile.count({ where: { createdAt: { lte: date } } }),
      prisma.profile.count({
        where: {
          createdAt: { lte: date },
          tier: { in: ['starter', 'pro', 'enterprise'] },
        },
      }),
    ])

    userGrowth.push({ date: dateStr, total, paid })
  }

  return NextResponse.json({
    users: {
      total: totalUsers,
      newThisWeek: newUsersThisWeek,
      activeUsers7d,
      activePercent: totalUsers > 0 ? Math.round((activeUsers7d / totalUsers) * 100) : 0,
      tierBreakdown,
      trialUsers,
      trialExpiringThisWeek,
      paidSubscribers,
    },
    revenue: {
      mrr,
      usageRevenueMtd,
      totalRevenueMtd: revenueMtd,
      churnRate,
    },
    platform: {
      totalDeals,
      totalBuyers,
      totalContracts,
      activeListings,
      totalAiMinutes: Math.round(totalUsage._sum.aiCallMinutes || 0),
      totalSms: totalUsage._sum.smsCount || 0,
      totalSkipTraces: totalUsage._sum.skipTraces || 0,
      totalDealsClosed: totalUsage._sum.dealsClosed || 0,
    },
    charts: {
      userGrowth,
    },
  })
}
