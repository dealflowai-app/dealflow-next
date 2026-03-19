import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const now = new Date()
  const totalUsers = await prisma.profile.count()

  // --- Feature adoption ---
  const [
    usersWithBuyers,
    usersWithCampaigns,
    usersWithAnalyses,
    usersWithContracts,
    usersWithListings,
    usersWithChats,
  ] = await Promise.all([
    prisma.cashBuyer.groupBy({ by: ['profileId'], _count: true }).then((r) => r.length).catch(() => 0),
    prisma.campaign.groupBy({ by: ['profileId'], _count: true }).then((r) => r.length).catch(() => 0),
    prisma.usage.groupBy({
      by: ['userId'],
      where: { dealsAnalyzed: { gt: 0 } },
      _count: true,
    }).then((r) => r.length).catch(() => 0),
    prisma.contract.groupBy({ by: ['profileId'], _count: true }).then((r) => r.length).catch(() => 0),
    prisma.marketplaceListing.groupBy({ by: ['profileId'], _count: true }).then((r) => r.length).catch(() => 0),
    prisma.chatConversation.groupBy({ by: ['profileId'], _count: true }).then((r) => r.length).catch(() => 0),
  ])

  const featureAdoption = [
    { name: 'Find Buyers', users: usersWithBuyers, total: totalUsers },
    { name: 'AI Outreach', users: usersWithCampaigns, total: totalUsers },
    { name: 'Deal Analysis', users: usersWithAnalyses, total: totalUsers },
    { name: 'Contracts', users: usersWithContracts, total: totalUsers },
    { name: 'Marketplace', users: usersWithListings, total: totalUsers },
    { name: 'Ask AI', users: usersWithChats, total: totalUsers },
  ].map((f) => ({
    ...f,
    percentage: f.total > 0 ? Math.round((f.users / f.total) * 100) : 0,
  }))

  // --- Daily usage (last 30 days) ---
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const usageRecords = await prisma.usage.findMany({
    where: { periodStart: { gte: thirtyDaysAgo } },
    select: {
      periodStart: true,
      aiCallMinutes: true,
      smsCount: true,
      dealsAnalyzed: true,
      skipTraces: true,
    },
  })

  // Aggregate by date
  const dailyMap: Record<string, { aiMinutes: number; sms: number; analyses: number; skipTraces: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split('T')[0]
    dailyMap[key] = { aiMinutes: 0, sms: 0, analyses: 0, skipTraces: 0 }
  }

  for (const r of usageRecords) {
    const key = new Date(r.periodStart).toISOString().split('T')[0]
    if (dailyMap[key]) {
      dailyMap[key].aiMinutes += r.aiCallMinutes
      dailyMap[key].sms += r.smsCount
      dailyMap[key].analyses += r.dealsAnalyzed
      dailyMap[key].skipTraces += r.skipTraces
    }
  }

  const dailyUsage = Object.entries(dailyMap).map(([date, data]) => ({
    date,
    ...data,
  }))

  // --- User activity distribution (this month) ---
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const activeProfiles = await prisma.profile.findMany({
    select: { id: true, updatedAt: true },
  })

  // Approximate activity by updatedAt recency
  let powerUsers = 0
  let regularUsers = 0
  let casualUsers = 0
  let inactiveUsers = 0

  for (const p of activeProfiles) {
    const daysSinceActive = (now.getTime() - new Date(p.updatedAt).getTime()) / (24 * 60 * 60 * 1000)
    if (daysSinceActive <= 2) powerUsers++
    else if (daysSinceActive <= 7) regularUsers++
    else if (daysSinceActive <= 14) casualUsers++
    else inactiveUsers++
  }

  const activityDistribution = [
    { label: 'Power Users', description: 'Active in last 2 days', count: powerUsers, color: '#2563EB' },
    { label: 'Regular', description: 'Active in last 7 days', count: regularUsers, color: '#8B5CF6' },
    { label: 'Casual', description: 'Active in last 14 days', count: casualUsers, color: '#F59E0B' },
    { label: 'Inactive', description: '14+ days inactive', count: inactiveUsers, color: '#9CA3AF' },
  ].map((d) => ({
    ...d,
    percentage: totalUsers > 0 ? Math.round((d.count / totalUsers) * 100) : 0,
  }))

  // --- Usage by tier ---
  const tiers = ['free', 'starter', 'pro', 'enterprise']
  const usageByTier: Record<string, { aiMinutes: number; sms: number; analyses: number; deals: number; contacts: number; userCount: number }> = {}

  for (const tier of tiers) {
    const tierProfiles = await prisma.profile.findMany({
      where: { tier },
      select: { id: true },
    })

    const tierUserIds = tierProfiles.map((p) => p.id)
    const userCount = tierUserIds.length

    if (userCount === 0) {
      usageByTier[tier] = { aiMinutes: 0, sms: 0, analyses: 0, deals: 0, contacts: 0, userCount: 0 }
      continue
    }

    const tierUsage = await prisma.usage.aggregate({
      where: { userId: { in: tierUserIds } },
      _sum: {
        aiCallMinutes: true,
        smsCount: true,
        dealsAnalyzed: true,
        activeDeals: true,
        crmContacts: true,
      },
    })

    usageByTier[tier] = {
      aiMinutes: Math.round((tierUsage._sum.aiCallMinutes || 0) / userCount),
      sms: Math.round((tierUsage._sum.smsCount || 0) / userCount),
      analyses: Math.round((tierUsage._sum.dealsAnalyzed || 0) / userCount),
      deals: Math.round((tierUsage._sum.activeDeals || 0) / userCount),
      contacts: Math.round((tierUsage._sum.crmContacts || 0) / userCount),
      userCount,
    }
  }

  // --- Most popular actions (estimated from totals) ---
  const [buyerCount, campaignCount, analysisCount, contractCount, listingCount, chatCount, dealCount, skipTraceTotal] =
    await Promise.all([
      prisma.cashBuyer.count().catch(() => 0),
      prisma.campaign.count().catch(() => 0),
      prisma.analysisCache.count().catch(() => 0),
      prisma.contract.count().catch(() => 0),
      prisma.marketplaceListing.count().catch(() => 0),
      prisma.chatConversation.count().catch(() => 0),
      prisma.deal.count().catch(() => 0),
      prisma.contactReveal.count().catch(() => 0),
    ])

  const popularActions = [
    { action: 'Imported buyer to CRM', count: buyerCount },
    { action: 'Ran deal analysis', count: analysisCount },
    { action: 'Started AI campaign', count: campaignCount },
    { action: 'Created deal', count: dealCount },
    { action: 'Generated contract', count: contractCount },
    { action: 'Started AI chat', count: chatCount },
    { action: 'Created marketplace listing', count: listingCount },
    { action: 'Ran skip trace', count: skipTraceTotal },
  ]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return NextResponse.json({
    featureAdoption,
    dailyUsage,
    activityDistribution,
    usageByTier,
    popularActions,
    totalUsers,
  })
}
