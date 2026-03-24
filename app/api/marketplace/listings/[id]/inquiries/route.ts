import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InquiryStatus } from '@prisma/client'
import { Validator, sanitizeString, sanitizeHtml } from '@/lib/validation'
import { parseBody } from '@/lib/api-utils'
import { sendEmail } from '@/lib/email'
import { formatInquiryEmail } from '@/lib/emails'
import { logger } from '@/lib/logger'

type RouteCtx = { params: Promise<{ id: string }> }

// ─── GET /api/marketplace/listings/[id]/inquiries ───────────────────────────
// List inquiries for a listing. Auth required, ownership verified.

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    // Verify listing ownership
    const listing = await prisma.marketplaceListing.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const inquiries = await prisma.marketplaceInquiry.findMany({
      where: { listingId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ inquiries })
  } catch (err) {
    logger.error('GET /api/marketplace/listings/[id]/inquiries error', { route: '/api/marketplace/listings/[id]/inquiries', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch inquiries', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── POST /api/marketplace/listings/[id]/inquiries ──────────────────────────
// Submit an inquiry on a listing. Auth required.

export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    // Verify listing exists and is active
    const listing = await prisma.marketplaceListing.findFirst({
      where: { id, status: 'ACTIVE' },
    })
    if (!listing) return NextResponse.json({ error: 'Listing not found or not active' }, { status: 404 })

    // Prevent self-inquiry
    if (listing.profileId === profile.id) {
      return NextResponse.json({ error: 'Cannot inquire on your own listing' }, { status: 400 })
    }

    const { body, error: parseError } = await parseBody(req)
    if (!body) return NextResponse.json({ error: parseError }, { status: 400 })

    const { message, name, email, phone } = body as {
      message?: string
      name?: string
      email?: string
      phone?: string
    }

    // ── Validate inputs ──
    const v = new Validator()
    if (message !== undefined) v.string('message', message, { maxLength: 1000, label: 'Message' })
    if (name !== undefined) v.string('name', name, { maxLength: 100, label: 'Name' })
    if (email !== undefined) v.email('email', email, 'Email')
    if (phone !== undefined) v.phone('phone', phone, 'Phone')
    if (!v.isValid()) return v.toResponse()

    // Use profile info as fallback for buyer details
    const buyerName = name ? sanitizeString(name) : [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Unknown'
    const buyerEmail = email || profile.email
    const buyerPhone = phone || profile.phone

    const inquiry = await prisma.marketplaceInquiry.create({
      data: {
        listingId: id,
        buyerName,
        buyerEmail: buyerEmail || undefined,
        buyerPhone: buyerPhone || undefined,
        message: message ? sanitizeHtml(message) : null,
        status: 'NEW' as InquiryStatus,
      },
    })

    // Increment inquiry count (fire-and-forget)
    prisma.marketplaceListing.update({
      where: { id },
      data: { inquiryCount: { increment: 1 } },
    }).catch(() => {})

    // Notify listing owner via email (fire-and-forget)
    const listingOwner = await prisma.profile.findUnique({
      where: { id: listing.profileId },
      select: { email: true, firstName: true, lastName: true },
    })
    if (listingOwner?.email) {
      const ownerName = [listingOwner.firstName, listingOwner.lastName].filter(Boolean).join(' ') || 'Wholesaler'
      const { subject, html, text } = formatInquiryEmail({
        wholesalerName: ownerName,
        buyerName,
        buyerEmail: buyerEmail || '',
        buyerPhone: buyerPhone || null,
        propertyAddress: listing.address,
        city: listing.city,
        state: listing.state,
        listingPrice: listing.askingPrice,
        message: message ? sanitizeHtml(message) : null,
        listingId: id,
      })
      sendEmail({
        to: { email: listingOwner.email, name: ownerName },
        subject,
        html,
        text,
        categories: ['marketplace', 'inquiry'],
      }).catch((err) => logger.error('Inquiry notification email failed', { error: err instanceof Error ? err.message : String(err) }))
    }

    return NextResponse.json({ inquiry }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/marketplace/listings/[id]/inquiries error', { route: '/api/marketplace/listings/[id]/inquiries', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to submit inquiry', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
