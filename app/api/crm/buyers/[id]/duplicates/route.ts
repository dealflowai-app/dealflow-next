import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { findDuplicatesForBuyer, type BuyerForDuplicateCheck } from '@/lib/duplicates'
import { logger } from '@/lib/logger'

/**
 * GET /api/crm/buyers/[id]/duplicates
 *
 * Check if a specific buyer has potential duplicates among the user's other buyers.
 * Useful for showing a "possible duplicate" warning on the buyer detail page.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    // Fetch all non-opted-out buyers (select only fields needed for detection)
    const allBuyers = await prisma.cashBuyer.findMany({
      where: { profileId: profile.id, isOptedOut: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        entityName: true,
        phone: true,
        email: true,
        city: true,
        state: true,
        buyerScore: true,
        createdAt: true,
      },
    })

    const target = allBuyers.find((b) => b.id === id)
    if (!target) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const others = allBuyers.filter((b) => b.id !== id)
    const duplicates = findDuplicatesForBuyer(
      target as BuyerForDuplicateCheck,
      others as BuyerForDuplicateCheck[],
    )

    return NextResponse.json({ duplicates })
  } catch (err) {
    logger.error('GET /api/crm/buyers/[id]/duplicates error', { route: '/api/crm/buyers/[id]/duplicates', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to check for duplicates' }, { status: 500 })
  }
}
