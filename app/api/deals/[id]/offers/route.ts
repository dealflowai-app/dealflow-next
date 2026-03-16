import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import type { DealStatus } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id: dealId } = await params

    // Verify deal ownership
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, profileId: profile.id },
      select: { id: true },
    })
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const offers = await prisma.offer.findMany({
      where: { dealId },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entityName: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Include match score if available
    const buyerIds = offers.map((o) => o.buyerId)
    const matches = await prisma.dealMatch.findMany({
      where: { dealId, buyerId: { in: buyerIds } },
      select: { buyerId: true, matchScore: true },
    })
    const matchMap = new Map(matches.map((m) => [m.buyerId, m.matchScore]))

    const enriched = offers.map((o) => ({
      ...o,
      matchScore: matchMap.get(o.buyerId) ?? null,
    }))

    return NextResponse.json({ offers: enriched })
  } catch (err) {
    console.error('GET /api/deals/[id]/offers error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch offers', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id: dealId } = await params

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const buyerId = body.buyerId as string | undefined
    const amount = body.amount != null ? Number(body.amount) : NaN

    if (!buyerId || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'buyerId and a positive amount are required' },
        { status: 400 },
      )
    }

    // Verify deal ownership
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, profileId: profile.id },
    })
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Check for duplicate pending/countered offer from same buyer
    const existing = await prisma.offer.findFirst({
      where: {
        dealId,
        buyerId,
        status: { in: ['PENDING', 'COUNTERED'] },
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'This buyer already has an active offer on this deal' },
        { status: 409 },
      )
    }

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        dealId,
        buyerId,
        amount,
        closeDate: body.closeDate ? new Date(body.closeDate as string) : null,
        terms: (body.terms as string) || null,
        message: (body.message as string) || null,
      },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entityName: true,
          },
        },
      },
    })

    // Auto-transition deal to UNDER_OFFER if currently ACTIVE
    if (deal.status === 'ACTIVE') {
      await prisma.deal.update({
        where: { id: dealId },
        data: { status: 'UNDER_OFFER' as DealStatus },
      })
    }

    // Log activity
    const buyerDisplay = [offer.buyer.firstName, offer.buyer.lastName].filter(Boolean).join(' ') || offer.buyer.entityName || 'Unknown'
    logActivity({
      buyerId,
      profileId: profile.id,
      type: 'offer_received',
      title: `Offer of $${amount.toLocaleString()} on ${deal.address}`,
      metadata: { dealId, offerId: offer.id, amount },
    })

    return NextResponse.json({ offer }, { status: 201 })
  } catch (err) {
    console.error('POST /api/deals/[id]/offers error:', err)
    return NextResponse.json(
      { error: 'Failed to create offer', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
