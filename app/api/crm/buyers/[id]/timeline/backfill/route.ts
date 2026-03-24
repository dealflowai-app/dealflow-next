import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logBulkActivity, type ActivityInput } from '@/lib/activity'
import { logger } from '@/lib/logger'

/**
 * POST /api/crm/buyers/[id]/timeline/backfill
 *
 * Generate synthetic activity events from existing campaignCalls,
 * dealMatches, and offers for a buyer who existed before the timeline feature.
 *
 * Idempotent — skips if the buyer already has activity events.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const buyer = await prisma.cashBuyer.findFirst({
      where: { id, profileId: profile.id },
      include: {
        campaignCalls: {
          select: { id: true, outcome: true, createdAt: true, durationSecs: true },
          orderBy: { createdAt: 'asc' },
        },
        dealMatches: {
          select: { id: true, matchScore: true, createdAt: true, deal: { select: { address: true } } },
          orderBy: { createdAt: 'asc' },
        },
        offers: {
          select: { id: true, amount: true, status: true, createdAt: true, deal: { select: { address: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // Idempotent check
    const existingCount = await prisma.activityEvent.count({
      where: { buyerId: id, profileId: profile.id },
    })
    if (existingCount > 0) {
      return NextResponse.json({
        message: 'Buyer already has activity events, skipping backfill',
        existingEvents: existingCount,
      })
    }

    const events: ActivityInput[] = []

    // Buyer creation event
    events.push({
      buyerId: id,
      profileId: profile.id,
      type: 'created',
      title: 'Buyer added to CRM',
      createdAt: buyer.createdAt,
    })

    // Campaign calls
    for (const call of buyer.campaignCalls) {
      events.push({
        buyerId: id,
        profileId: profile.id,
        type: 'call_completed',
        title: `Call completed — ${call.outcome ?? 'no outcome'}`,
        metadata: {
          callId: call.id,
          outcome: call.outcome,
          durationSecs: call.durationSecs,
        },
        createdAt: call.createdAt,
      })
    }

    // Deal matches
    for (const match of buyer.dealMatches) {
      events.push({
        buyerId: id,
        profileId: profile.id,
        type: 'deal_matched',
        title: `Matched to deal at ${match.deal.address}`,
        metadata: {
          matchId: match.id,
          matchScore: match.matchScore,
          dealAddress: match.deal.address,
        },
        createdAt: match.createdAt,
      })
    }

    // Offers
    for (const offer of buyer.offers) {
      events.push({
        buyerId: id,
        profileId: profile.id,
        type: 'offer_received',
        title: `Offer $${offer.amount.toLocaleString()} — ${offer.status}`,
        metadata: {
          offerId: offer.id,
          amount: offer.amount,
          status: offer.status,
          dealAddress: offer.deal.address,
        },
        createdAt: offer.createdAt,
      })
    }

    await logBulkActivity(events)

    return NextResponse.json({
      backfilled: events.length,
      breakdown: {
        created: 1,
        calls: buyer.campaignCalls.length,
        matches: buyer.dealMatches.length,
        offers: buyer.offers.length,
      },
    })
  } catch (err) {
    logger.error('POST /api/crm/buyers/[id]/timeline/backfill error', { route: '/api/crm/buyers/[id]/timeline/backfill', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to backfill timeline' }, { status: 500 })
  }
}
