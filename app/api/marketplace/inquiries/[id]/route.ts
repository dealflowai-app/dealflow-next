import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InquiryStatus } from '@prisma/client'

type RouteCtx = { params: Promise<{ id: string }> }

// Valid status transitions: from → allowed targets
const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ['CONTACTED', 'CLOSED'],
  CONTACTED: ['CLOSED'],
  CLOSED: [],
}

// ─── PATCH /api/marketplace/inquiries/[id] ──────────────────────────────────
// Update inquiry status. Auth required, verified via listing ownership.

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    // Fetch inquiry with its listing to verify ownership
    const inquiry = await prisma.marketplaceInquiry.findUnique({
      where: { id },
      include: {
        listing: { select: { profileId: true, address: true } },
      },
    })
    if (!inquiry) return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })

    if (inquiry.listing.profileId !== profile.id) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { status: newStatus } = body as { status?: string }

    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const currentStatus = inquiry.status as string
    const allowed = STATUS_TRANSITIONS[currentStatus]

    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed?.join(', ') || 'none'}` },
        { status: 400 },
      )
    }

    const updated = await prisma.marketplaceInquiry.update({
      where: { id },
      data: { status: newStatus as InquiryStatus },
    })

    return NextResponse.json({ inquiry: updated })
  } catch (err) {
    console.error('PATCH /api/marketplace/inquiries/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to update inquiry', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
