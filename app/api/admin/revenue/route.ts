import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const now = new Date()
  const tierPrices: Record<string, number> = { starter: 149, pro: 299, enterprise: 499 }

  // --- Tier counts for MRR ---
  const tierCounts = await prisma.profile.groupBy({
    by: ['tier'],
    _count: { tier: true },
    where: { tierStatus: 'active' },
  })

  const tierBreakdown: Record<string, number> = {}
  let mrr = 0
  let paidSubscribers = 0
  for (const tc of tierCounts) {
    tierBreakdown[tc.tier] = tc._count.tier
    if (tierPrices[tc.tier]) {
      mrr += tierPrices[tc.tier] * tc._count.tier
      paidSubscribers += tc._count.tier
    }
  }
  const arr = mrr * 12

  // --- Monthly revenue (last 12 months) ---
  const monthlyRevenue: { month: string; subscription: number; usage: number; total: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
    const monthLabel = start.toLocaleString('en-US', { month: 'short', year: '2-digit' })

    const payments = await prisma.paymentHistory.aggregate({
      where: {
        status: 'paid',
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    })

    const totalCents = payments._sum.amount || 0
    const total = totalCents / 100
    // Approximate: subscription = mrr for that month, usage = remainder
    const subEstimate = Math.min(mrr, total)
    const usageEstimate = Math.max(0, total - subEstimate)

    monthlyRevenue.push({
      month: monthLabel,
      subscription: Math.round(subEstimate),
      usage: Math.round(usageEstimate),
      total: Math.round(total),
    })
  }

  // --- ARPU ---
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const mtdPayments = await prisma.paymentHistory.aggregate({
    where: { status: 'paid', createdAt: { gte: monthStart } },
    _sum: { amount: true },
  })
  const totalRevenueMtd = (mtdPayments._sum.amount || 0) / 100
  const arpu = paidSubscribers > 0 ? Math.round(totalRevenueMtd / paidSubscribers) : 0

  // --- LTV estimate (ARPU * avg months active) ---
  const allPaidProfiles = await prisma.profile.findMany({
    where: { tier: { in: ['starter', 'pro', 'enterprise'] } },
    select: { createdAt: true },
  })
  let avgMonths = 0
  if (allPaidProfiles.length > 0) {
    const totalMonths = allPaidProfiles.reduce((sum, p) => {
      const months = (now.getTime() - new Date(p.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
      return sum + Math.max(1, months)
    }, 0)
    avgMonths = totalMonths / allPaidProfiles.length
  }
  const ltv = avgMonths >= 1 ? Math.round(arpu * avgMonths) : null

  // --- Usage revenue breakdown (current month) ---
  const currentMonthUsage = await prisma.usage.aggregate({
    where: {
      periodStart: { gte: monthStart },
    },
    _sum: {
      aiCallMinutes: true,
      smsCount: true,
      skipTraces: true,
      dealsClosed: true,
    },
  })

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  const prevMonthUsage = await prisma.usage.aggregate({
    where: {
      periodStart: { gte: prevMonthStart },
      periodEnd: { lte: prevMonthEnd },
    },
    _sum: {
      aiCallMinutes: true,
      smsCount: true,
      skipTraces: true,
      dealsClosed: true,
    },
  })

  const usageBreakdown = {
    aiCalls: {
      current: Math.round(currentMonthUsage._sum.aiCallMinutes || 0),
      previous: Math.round(prevMonthUsage._sum.aiCallMinutes || 0),
      rate: 0.18,
      currentRevenue: Math.round((currentMonthUsage._sum.aiCallMinutes || 0) * 0.18),
      previousRevenue: Math.round((prevMonthUsage._sum.aiCallMinutes || 0) * 0.18),
    },
    sms: {
      current: currentMonthUsage._sum.smsCount || 0,
      previous: prevMonthUsage._sum.smsCount || 0,
      rate: 0.03,
      currentRevenue: Math.round((currentMonthUsage._sum.smsCount || 0) * 0.03 * 100) / 100,
      previousRevenue: Math.round((prevMonthUsage._sum.smsCount || 0) * 0.03 * 100) / 100,
    },
    skipTraces: {
      current: currentMonthUsage._sum.skipTraces || 0,
      previous: prevMonthUsage._sum.skipTraces || 0,
      rate: 0.50,
      currentRevenue: (currentMonthUsage._sum.skipTraces || 0) * 0.50,
      previousRevenue: (prevMonthUsage._sum.skipTraces || 0) * 0.50,
    },
    dealFees: {
      current: currentMonthUsage._sum.dealsClosed || 0,
      previous: prevMonthUsage._sum.dealsClosed || 0,
      rate: 200,
      currentRevenue: (currentMonthUsage._sum.dealsClosed || 0) * 200,
      previousRevenue: (prevMonthUsage._sum.dealsClosed || 0) * 200,
    },
  }

  // --- Top 10 paying users ---
  const topUsers = await prisma.paymentHistory.groupBy({
    by: ['userId'],
    where: { status: 'paid' },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 10,
  })

  const topPayingUsers = await Promise.all(
    topUsers.map(async (tu) => {
      const p = await prisma.profile.findUnique({
        where: { id: tu.userId },
        select: { firstName: true, lastName: true, email: true, tier: true, createdAt: true },
      })
      return {
        userId: tu.userId,
        name: p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email : 'Unknown',
        email: p?.email || '',
        tier: p?.tier || 'free',
        totalRevenue: (tu._sum.amount || 0) / 100,
        since: p?.createdAt,
      }
    })
  )

  // --- Upcoming renewals (next 7 days) ---
  const renewalCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingRenewals = await prisma.profile.findMany({
    where: {
      tier: { in: ['starter', 'pro', 'enterprise'] },
      tierStatus: 'active',
      currentPeriodEnd: { gte: now, lte: renewalCutoff },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      tier: true,
      tierStatus: true,
      currentPeriodEnd: true,
    },
    orderBy: { currentPeriodEnd: 'asc' },
    take: 20,
  })

  // --- Failed payments ---
  const failedPayments = await prisma.paymentHistory.findMany({
    where: { status: 'failed' },
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: {
      user: { select: { firstName: true, lastName: true, email: true, stripeCustomerId: true } },
    },
  })

  // --- Payment failure rate ---
  const [totalPayments, failedCount] = await Promise.all([
    prisma.paymentHistory.count(),
    prisma.paymentHistory.count({ where: { status: 'failed' } }),
  ])
  const failureRate = totalPayments > 0 ? Math.round((failedCount / totalPayments) * 100) : 0

  // --- Previous month MRR for comparison ---
  const prevMonthTierCounts = await prisma.profile.count({
    where: {
      tier: { in: ['starter', 'pro', 'enterprise'] },
      createdAt: { lte: prevMonthEnd },
    },
  })
  // Rough estimate: assume same tier distribution last month
  const prevMrrEstimate = prevMonthTierCounts > 0
    ? Math.round((mrr / paidSubscribers) * prevMonthTierCounts)
    : 0
  const mrrChange = prevMrrEstimate > 0
    ? Math.round(((mrr - prevMrrEstimate) / prevMrrEstimate) * 100)
    : 0

  return NextResponse.json({
    mrr,
    mrrChange,
    arr,
    arpu,
    ltv,
    paidSubscribers,
    tierBreakdown,
    monthlyRevenue,
    usageBreakdown,
    topPayingUsers,
    upcomingRenewals: upcomingRenewals.map((r) => ({
      ...r,
      name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.email,
      amount: tierPrices[r.tier] || 0,
    })),
    failedPayments: failedPayments.map((fp) => ({
      id: fp.id,
      amount: fp.amount / 100,
      status: fp.status,
      description: fp.description,
      createdAt: fp.createdAt,
      userName: fp.user
        ? `${fp.user.firstName || ''} ${fp.user.lastName || ''}`.trim() || fp.user.email
        : 'Unknown',
      userEmail: fp.user?.email || '',
      stripeCustomerId: fp.user?.stripeCustomerId || null,
    })),
    failureRate,
    totalRevenueMtd,
  })
}
