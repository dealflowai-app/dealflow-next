import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import type { OfferStatus, DealStatus } from '@prisma/client'

// Valid status transitions
const OFFER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'COUNTERED'],
  COUNTERED: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  // Terminal states
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
  EXPIRED: [],
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id: offerId } = await params

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const newStatus = body.status as string | undefined
    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    // Fetch offer + deal to verify ownership
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        deal: { select: { id: true, profileId: true, address: true, status: true } },
        buyer: { select: { id: true, firstName: true, lastName: true, entityName: true } },
      },
    })

    if (!offer || offer.deal.profileId !== profile.id) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Validate transition
    const allowed = OFFER_TRANSITIONS[offer.status] ?? []
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${offer.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}` },
        { status: 400 },
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: newStatus as OfferStatus,
    }

    // For COUNTERED, allow updating amount/terms/message
    if (newStatus === 'COUNTERED') {
      if (body.counterAmount != null) updateData.amount = Number(body.counterAmount)
      if (body.counterTerms !== undefined) updateData.terms = body.counterTerms || null
      if (body.counterMessage !== undefined) updateData.message = body.counterMessage || null
    }

    const dealId = offer.deal.id
    const buyerDisplay = [offer.buyer.firstName, offer.buyer.lastName].filter(Boolean).join(' ') || offer.buyer.entityName || 'Unknown'

    // Use transaction for ACCEPTED (cascading effects)
    if (newStatus === 'ACCEPTED') {
      await prisma.$transaction(async (tx) => {
        // Update this offer
        await tx.offer.update({ where: { id: offerId }, data: updateData as never })

        // Reject all other pending/countered offers on this deal
        await tx.offer.updateMany({
          where: {
            dealId,
            id: { not: offerId },
            status: { in: ['PENDING', 'COUNTERED'] },
          },
          data: { status: 'REJECTED' as OfferStatus },
        })

        // Close the deal
        await tx.deal.update({
          where: { id: dealId },
          data: {
            status: 'CLOSED' as DealStatus,
            closedAt: new Date(),
          },
        })
      })

      logActivity({
        buyerId: offer.buyerId,
        profileId: profile.id,
        type: 'offer_accepted',
        title: `Accepted $${offer.amount.toLocaleString()} offer from ${buyerDisplay} on ${offer.deal.address}`,
        metadata: { dealId, offerId, amount: offer.amount },
      })
    } else {
      // Simple status update
      await prisma.offer.update({ where: { id: offerId }, data: updateData as never })

      // If rejecting, check if deal should revert to ACTIVE
      if (newStatus === 'REJECTED' && offer.deal.status === 'UNDER_OFFER') {
        const remainingActive = await prisma.offer.count({
          where: {
            dealId,
            id: { not: offerId },
            status: { in: ['PENDING', 'COUNTERED'] },
          },
        })
        if (remainingActive === 0) {
          await prisma.deal.update({
            where: { id: dealId },
            data: { status: 'ACTIVE' as DealStatus },
          })
        }
      }

      const actionLabel = newStatus === 'REJECTED' ? 'rejected' : newStatus === 'COUNTERED' ? 'countered' : 'withdrawn'
      logActivity({
        buyerId: offer.buyerId,
        profileId: profile.id,
        type: `offer_${actionLabel}`,
        title: `Offer ${actionLabel} for ${buyerDisplay} on ${offer.deal.address}`,
        metadata: { dealId, offerId, amount: offer.amount, newStatus },
      })
    }

    // Fetch updated offer
    const updated = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, entityName: true },
        },
      },
    })

    return NextResponse.json({ offer: updated })
  } catch (err) {
    console.error('PATCH /api/offers/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to update offer', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id: offerId } = await params

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        deal: { select: { id: true, profileId: true, status: true } },
      },
    })

    if (!offer || offer.deal.profileId !== profile.id) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Only allow deleting PENDING offers
    if (offer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending offers can be deleted' },
        { status: 400 },
      )
    }

    await prisma.offer.delete({ where: { id: offerId } })

    // Check if deal should revert to ACTIVE
    if (offer.deal.status === 'UNDER_OFFER') {
      const remainingActive = await prisma.offer.count({
        where: {
          dealId: offer.dealId,
          status: { in: ['PENDING', 'COUNTERED'] },
        },
      })
      if (remainingActive === 0) {
        await prisma.deal.update({
          where: { id: offer.dealId },
          data: { status: 'ACTIVE' as DealStatus },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/offers/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to delete offer', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
