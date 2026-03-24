import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ─── GET /api/marketplace/my-listings ───────────────────────────────────────
// List the current user's own listings (all statuses) with inquiry data.

export async function GET(_req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const listings = await prisma.marketplaceListing.findMany({
      where: { profileId: profile.id },
      include: {
        deal: {
          select: {
            address: true,
            city: true,
            state: true,
            zip: true,
            status: true,
            askingPrice: true,
          },
        },
        inquiries: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            buyerName: true,
            buyerEmail: true,
            message: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ listings })
  } catch (err) {
    logger.error('GET /api/marketplace/my-listings error', { route: '/api/marketplace/my-listings', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch your listings', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
