import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { ListingStatus } from '@prisma/client'

type RouteCtx = { params: Promise<{ id: string }> }

// Valid status transitions: from → allowed targets
const STATUS_TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ['PAUSED', 'SOLD'],
  PAUSED: ['ACTIVE'],
  SOLD: [],
  EXPIRED: [],
}

// ─── GET /api/marketplace/listings/[id] ─────────────────────────────────────
// Get a single listing. Public endpoint (no auth required).

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
          },
        },
      },
    })

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    // Increment view count (fire-and-forget)
    prisma.marketplaceListing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {})

    // Sanitize wholesaler info
    const sanitized = {
      ...listing,
      profile: {
        firstName: listing.profile.firstName,
        lastInitial: listing.profile.lastName ? listing.profile.lastName.charAt(0) + '.' : null,
        company: listing.profile.company,
      },
    }

    return NextResponse.json({ listing: sanitized })
  } catch (err) {
    console.error('GET /api/marketplace/listings/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch listing', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── PATCH /api/marketplace/listings/[id] ───────────────────────────────────
// Update a listing. Auth required, ownership verified.

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const listing = await prisma.marketplaceListing.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { status: newStatus, headline, description, askingPrice, photoUrls, condition, beds, baths, sqft, yearBuilt, assignFee } = body as {
      status?: string
      headline?: string
      description?: string
      askingPrice?: number
      photoUrls?: string[]
      condition?: string
      beds?: number
      baths?: number
      sqft?: number
      yearBuilt?: number
      assignFee?: number
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {}

    // Field updates
    if (headline !== undefined) data.headline = headline
    if (description !== undefined) data.description = description
    if (askingPrice !== undefined && typeof askingPrice === 'number') data.askingPrice = askingPrice
    if (assignFee !== undefined && typeof assignFee === 'number') data.assignFee = assignFee
    if (condition !== undefined) data.condition = condition
    if (beds !== undefined && typeof beds === 'number') data.beds = beds
    if (baths !== undefined && typeof baths === 'number') data.baths = baths
    if (sqft !== undefined && typeof sqft === 'number') data.sqft = sqft
    if (yearBuilt !== undefined && typeof yearBuilt === 'number') data.yearBuilt = yearBuilt
    if (photoUrls !== undefined && Array.isArray(photoUrls)) {
      if (photoUrls.length > 10) {
        return NextResponse.json({ error: 'Maximum 10 photos per listing' }, { status: 400 })
      }
      data.photoUrls = photoUrls
    }

    // Status transition
    if (newStatus) {
      const currentStatus = listing.status as string
      const allowed = STATUS_TRANSITIONS[currentStatus]

      if (!allowed || !allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed?.join(', ') || 'none'}` },
          { status: 400 },
        )
      }

      data.status = newStatus as ListingStatus

      switch (newStatus) {
        case 'SOLD':
          data.soldAt = new Date()
          // Also update deal status to CLOSED if not already
          if (listing.dealId) {
            prisma.deal.updateMany({
              where: { id: listing.dealId, status: { not: 'CLOSED' } },
              data: { status: 'CLOSED', closedAt: new Date() },
            }).catch(() => {})
          }
          break
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data,
      include: {
        deal: { select: { address: true, city: true, state: true, zip: true } },
      },
    })

    if (newStatus) {
      logActivity({
        buyerId: '',
        profileId: profile.id,
        type: 'listing_status_changed',
        title: `Listing for ${listing.address} changed to ${newStatus}`,
        metadata: { listingId: listing.id, from: listing.status, to: newStatus },
      })
    }

    return NextResponse.json({ listing: updated })
  } catch (err) {
    console.error('PATCH /api/marketplace/listings/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to update listing', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── DELETE /api/marketplace/listings/[id] ───────────────────────────────────
// Soft-delete: set status to EXPIRED.

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const listing = await prisma.marketplaceListing.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    if (listing.status === 'SOLD') {
      return NextResponse.json(
        { error: 'Cannot remove a sold listing' },
        { status: 400 },
      )
    }

    await prisma.marketplaceListing.update({
      where: { id },
      data: { status: 'EXPIRED' as ListingStatus },
    })

    logActivity({
      buyerId: '',
      profileId: profile.id,
      type: 'listing_removed',
      title: `Removed listing for ${listing.address}`,
      metadata: { listingId: listing.id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/marketplace/listings/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to remove listing', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
