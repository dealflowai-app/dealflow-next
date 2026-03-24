import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { parseBody } from '@/lib/api-utils'

/**
 * POST /api/marketplace/sellers/verify
 * Auth required — request seller verification (self-service)
 * Sets status to PENDING for admin review.
 */
export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Already verified or pending
    if (profile.sellerVerification === 'VERIFIED') {
      return NextResponse.json({ error: 'Already verified' }, { status: 400 })
    }
    if (profile.sellerVerification === 'PENDING') {
      return NextResponse.json({ error: 'Verification already pending' }, { status: 400 })
    }

    // Eligibility: must have email + phone verified and at least 1 completed deal
    if (!profile.emailVerified) {
      return NextResponse.json({ error: 'Email must be verified first' }, { status: 400 })
    }

    await prisma.profile.update({
      where: { id: profile.id },
      data: { sellerVerification: 'PENDING' },
    })

    return NextResponse.json({ status: 'PENDING', message: 'Verification request submitted' })
  } catch (err) {
    logger.error('POST seller verify request failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Failed to request verification' }, { status: 500 })
  }
}

/**
 * PATCH /api/marketplace/sellers/verify
 * Admin only — approve or reject a seller verification
 * Body: { profileId, action: "approve" | "reject" }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    if (profile.platformRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { body, error: parseError } = await parseBody(req)
    if (!body) return NextResponse.json({ error: parseError }, { status: 400 })

    const { profileId, action } = body as { profileId?: string; action?: string }

    if (!profileId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Required: profileId and action ("approve" or "reject")' },
        { status: 400 },
      )
    }

    const target = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, sellerVerification: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const newStatus = action === 'approve' ? 'VERIFIED' : 'REJECTED'

    await prisma.profile.update({
      where: { id: profileId },
      data: {
        sellerVerification: newStatus as 'VERIFIED' | 'REJECTED',
        ...(action === 'approve' ? { sellerVerifiedAt: new Date() } : {}),
      },
    })

    logger.info(`Seller verification ${action}d`, {
      targetProfileId: profileId,
      adminProfileId: profile.id,
      action,
    })

    return NextResponse.json({ profileId, status: newStatus })
  } catch (err) {
    logger.error('PATCH seller verify failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Failed to update verification' }, { status: 500 })
  }
}
