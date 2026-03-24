import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * GET /api/marketplace/sellers/[profileId]/reputation
 * Public — returns seller reputation summary
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { profileId: string } },
) {
  try {
    const { profileId } = params

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        avatarUrl: true,
        sellerVerification: true,
        sellerVerifiedAt: true,
        reputationScore: true,
        reviewCount: true,
        completedDeals: true,
        createdAt: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    // Get rating distribution
    const ratingDistribution = await prisma.sellerReview.groupBy({
      by: ['rating'],
      where: { sellerId: profileId },
      _count: { rating: true },
    })

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const row of ratingDistribution) {
      distribution[row.rating] = row._count.rating
    }

    // Get top tags
    const reviews = await prisma.sellerReview.findMany({
      where: { sellerId: profileId },
      select: { tags: true },
    })
    const tagCounts: Record<string, number> = {}
    for (const r of reviews) {
      for (const tag of r.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }))

    return NextResponse.json({
      seller: {
        id: profile.id,
        firstName: profile.firstName,
        lastInitial: profile.lastName?.charAt(0) || null,
        company: profile.company,
        avatarUrl: profile.avatarUrl,
        verified: profile.sellerVerification === 'VERIFIED',
        verifiedAt: profile.sellerVerifiedAt,
        memberSince: profile.createdAt,
      },
      reputation: {
        score: profile.reputationScore,
        reviewCount: profile.reviewCount,
        completedDeals: profile.completedDeals,
        distribution,
        topTags,
      },
    })
  } catch (err) {
    logger.error('GET seller reputation failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Failed to fetch reputation' }, { status: 500 })
  }
}
