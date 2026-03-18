import { prisma } from '@/lib/prisma'

export async function gatherChatContext(profileId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalBuyers,
    buyersByStatus,
    topBuyers,
    deals,
    dealsByStatus,
    campaigns,
    recentActivity,
    tags,
    dealMatches,
    activeListings,
    recentInquiries,
    contractsByStatus,
  ] = await Promise.all([
    // 1. Buyer summary
    prisma.cashBuyer.count({
      where: { profileId, isOptedOut: false },
    }),

    prisma.cashBuyer.groupBy({
      by: ['status'],
      where: { profileId, isOptedOut: false },
      _count: true,
    }),

    prisma.cashBuyer.findMany({
      where: { profileId, isOptedOut: false },
      orderBy: { buyerScore: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        entityName: true,
        buyerScore: true,
        status: true,
        preferredMarkets: true,
        preferredTypes: true,
        strategy: true,
        lastContactedAt: true,
      },
    }),

    // 2. Deal summary
    prisma.deal.findMany({
      where: { profileId },
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        askingPrice: true,
        arv: true,
        assignFee: true,
        status: true,
        confidenceScore: true,
        propertyType: true,
        createdAt: true,
      },
    }),

    prisma.deal.groupBy({
      by: ['status'],
      where: { profileId },
      _count: true,
    }),

    // 3. Campaign summary
    prisma.campaign.findMany({
      where: { profileId },
      select: {
        id: true,
        name: true,
        status: true,
        totalBuyers: true,
        callsCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    // 4. Recent activity
    prisma.activityEvent.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        type: true,
        title: true,
        createdAt: true,
        metadata: true,
      },
    }),

    // 5. Tags with buyer counts
    prisma.tag.findMany({
      where: { profileId },
      include: {
        _count: {
          select: { buyers: true },
        },
      },
    }),

    // 6. Recent deal matches
    prisma.dealMatch.findMany({
      where: { deal: { profileId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        matchScore: true,
        outreachSent: true,
        deal: {
          select: { address: true, city: true, state: true },
        },
        buyer: {
          select: { firstName: true, lastName: true, entityName: true },
        },
      },
    }),

    // 7. Marketplace summary
    prisma.marketplaceListing.count({
      where: { profileId, status: 'ACTIVE' },
    }),

    prisma.marketplaceInquiry.count({
      where: {
        listing: { profileId },
        createdAt: { gte: sevenDaysAgo },
      },
    }),

    // 8. Contract summary
    prisma.contract.groupBy({
      by: ['status'],
      where: { profileId },
      _count: true,
    }),
  ])

  const totalCallsCompleted = campaigns.reduce(
    (sum, c) => sum + c.callsCompleted,
    0
  )

  const awaitingSignature = contractsByStatus
    .filter((c) => c.status === 'SENT')
    .reduce((sum, c) => sum + c._count, 0)

  return {
    buyers: {
      total: totalBuyers,
      byStatus: Object.fromEntries(
        buyersByStatus.map((s) => [s.status, s._count])
      ),
      top10: topBuyers,
    },
    deals: {
      all: deals,
      byStatus: Object.fromEntries(
        dealsByStatus.map((s) => [s.status, s._count])
      ),
    },
    campaigns: {
      all: campaigns,
      totalCallsCompleted,
    },
    recentActivity,
    tags: tags.map((t) => ({
      name: t.name,
      label: t.label,
      color: t.color,
      buyerCount: t._count.buyers,
    })),
    dealMatches,
    marketplace: {
      activeListings,
      recentInquiries,
    },
    contracts: {
      byStatus: Object.fromEntries(
        contractsByStatus.map((c) => [c.status, c._count])
      ),
      awaitingSignature,
    },
  }
}
