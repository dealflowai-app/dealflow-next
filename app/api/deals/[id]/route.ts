import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { trackDealClosed, updateActiveDeals } from '@/lib/usage'
import type { DealStatus } from '@prisma/client'
import { logger } from '@/lib/logger'

// Valid status transitions: from -> allowed destinations
const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['UNDER_OFFER', 'CANCELLED'],
  UNDER_OFFER: ['CLOSED', 'ACTIVE'],
  CANCELLED: [],
  CLOSED: [],
  EXPIRED: [],
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const deal = await prisma.deal.findFirst({
      where: { id, profileId: profile.id },
      include: {
        matches: {
          include: {
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                entityName: true,
                phone: true,
                email: true,
                status: true,
                buyerScore: true,
              },
            },
          },
          orderBy: { matchScore: 'desc' },
        },
        offers: {
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
        },
      },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Enrich offers with match scores
    const offerBuyerIds = deal.offers.map((o) => o.buyerId)
    const offerMatches = offerBuyerIds.length > 0
      ? await prisma.dealMatch.findMany({
          where: { dealId: id, buyerId: { in: offerBuyerIds } },
          select: { buyerId: true, matchScore: true },
        })
      : []
    const matchScoreMap = new Map(offerMatches.map((m) => [m.buyerId, m.matchScore]))

    // Look up contracts linked to offers
    const offerIds = deal.offers.map((o) => o.id)
    const offerContracts = offerIds.length > 0
      ? await prisma.contract.findMany({
          where: { offerId: { in: offerIds } },
          select: { id: true, offerId: true },
        })
      : []
    const contractByOffer = new Map(offerContracts.map((c) => [c.offerId, c.id]))

    const enrichedDeal = {
      ...deal,
      offers: deal.offers.map((o) => ({
        ...o,
        matchScore: matchScoreMap.get(o.buyerId) ?? null,
        contractId: contractByOffer.get(o.id) ?? null,
      })),
    }

    return NextResponse.json({ deal: enrichedDeal })
  } catch (err) {
    logger.error('GET /api/deals/[id] error', { route: '/api/deals/[id]', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch deal', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

const UPDATABLE_FIELDS = [
  'address', 'city', 'state', 'zip', 'propertyType',
  'beds', 'baths', 'sqft', 'yearBuilt', 'condition',
  'askingPrice', 'assignFee', 'closeByDate',
  'arv', 'repairCost', 'notes', 'status',
] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const existing = await prisma.deal.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Validate status transition if status is being changed
    if (body.status && body.status !== existing.status) {
      // CLOSED deals only allow notes updates
      if (existing.status === 'CLOSED') {
        return NextResponse.json(
          { error: 'Cannot change status of a closed deal' },
          { status: 400 },
        )
      }

      const allowed = STATUS_TRANSITIONS[existing.status] ?? []
      if (!allowed.includes(body.status as string)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existing.status} to ${body.status}. Allowed: ${allowed.join(', ') || 'none'}` },
          { status: 400 },
        )
      }
    }

    // CLOSED deals: only notes can be updated
    if (existing.status === 'CLOSED') {
      const nonNoteKeys = Object.keys(body).filter((k) => k !== 'notes')
      if (nonNoteKeys.length > 0) {
        return NextResponse.json(
          { error: 'Closed deals can only have notes updated' },
          { status: 400 },
        )
      }
    }

    // Build update data from whitelisted fields
    const data: Record<string, unknown> = {}
    const numericFields = ['beds', 'sqft', 'yearBuilt', 'askingPrice', 'assignFee', 'arv', 'repairCost']
    const floatFields = ['baths']
    const dateFields = ['closeByDate']

    for (const field of UPDATABLE_FIELDS) {
      if (!(field in body)) continue
      const val = body[field]

      if (numericFields.includes(field)) {
        data[field] = val != null && val !== '' ? Number(val) : null
      } else if (floatFields.includes(field)) {
        data[field] = val != null && val !== '' ? Number(val) : null
      } else if (dateFields.includes(field)) {
        data[field] = val ? new Date(val as string) : null
      } else if (field === 'status') {
        if (val && val !== '') data[field] = val
      } else if (field === 'propertyType') {
        if (val && val !== '') data[field] = val
      } else {
        data[field] = val && val !== '' ? val : null
      }
    }

    // Set closedAt when transitioning to CLOSED
    if (data.status === 'CLOSED') {
      data.closedAt = new Date()
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: data as never,
    })

    // Track deal closed and update active deals count for billing
    if (data.status === 'CLOSED') {
      try {
        await trackDealClosed(profile.id)
        await updateActiveDeals(profile.id)
      } catch (err) {
        logger.error('Usage tracking failed for deal closed', { error: err instanceof Error ? err.message : String(err) })
      }
    }

    // Update active deals snapshot when status changes to/from active states
    if (data.status && ['ACTIVE', 'UNDER_OFFER', 'CANCELLED'].includes(data.status as string)) {
      try {
        await updateActiveDeals(profile.id)
      } catch (err) {
        logger.error('Usage tracking failed for active deals update', { error: err instanceof Error ? err.message : String(err) })
      }
    }

    return NextResponse.json({ deal })
  } catch (err) {
    logger.error('PATCH /api/deals/[id] error', { route: '/api/deals/[id]', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to update deal', detail: err instanceof Error ? err.message : String(err) },
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

    const { id } = await params

    const existing = await prisma.deal.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    if (existing.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Cannot cancel a closed deal' },
        { status: 400 },
      )
    }

    await prisma.deal.update({
      where: { id },
      data: { status: 'CANCELLED' as DealStatus },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('DELETE /api/deals/[id] error', { route: '/api/deals/[id]', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
