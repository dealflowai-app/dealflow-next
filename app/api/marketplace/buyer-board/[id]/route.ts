import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

type RouteCtx = { params: Promise<{ id: string }> }

// ─── GET /api/marketplace/buyer-board/[id] ──────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const post = await prisma.buyerBoardPost.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        buyerType: true,
        propertyTypes: true,
        markets: true,
        strategy: true,
        minPrice: true,
        maxPrice: true,
        closeSpeedDays: true,
        proofOfFunds: true,
        description: true,
        status: true,
        viewCount: true,
        contactCount: true,
        createdAt: true,
        expiresAt: true,
        profileId: true,
        profile: {
          select: { firstName: true, lastName: true, company: true },
        },
        contacts: {
          select: {
            id: true,
            message: true,
            status: true,
            createdAt: true,
            profileId: true,
            profile: {
              select: { firstName: true, lastName: true, company: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const isOwner = post.profileId === profile.id

    // Increment view count (fire-and-forget)
    if (!isOwner) {
      prisma.buyerBoardPost.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }).catch(() => {})
    }

    return NextResponse.json({
      post: {
        ...post,
        profile: {
          firstName: post.profile.firstName,
          lastInitial: post.profile.lastName?.[0] || null,
          company: post.profile.company,
        },
        isOwner,
        // Only expose contacts to the post owner
        contacts: isOwner ? post.contacts : undefined,
        profileId: undefined,
      },
    })
  } catch (err) {
    console.error('GET /api/marketplace/buyer-board/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch post', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── PATCH /api/marketplace/buyer-board/[id] ────────────────────────────────

const STATUS_TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ['PAUSED', 'CLOSED'],
  PAUSED: ['ACTIVE', 'CLOSED'],
  CLOSED: [],
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const post = await prisma.buyerBoardPost.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!post) return NextResponse.json({ error: 'Post not found or not yours' }, { status: 404 })

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { status: newStatus, ...updates } = body as {
      status?: string
      displayName?: string
      buyerType?: string
      propertyTypes?: string[]
      markets?: string[]
      strategy?: string
      minPrice?: number
      maxPrice?: number
      closeSpeedDays?: number
      proofOfFunds?: boolean
      description?: string
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}

    // Status transition validation
    if (newStatus) {
      const allowed = STATUS_TRANSITIONS[post.status] || []
      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from ${post.status} to ${newStatus}` },
          { status: 400 },
        )
      }
      data.status = newStatus
    }

    // Field updates
    const fields = ['displayName', 'buyerType', 'propertyTypes', 'markets', 'strategy', 'minPrice', 'maxPrice', 'closeSpeedDays', 'proofOfFunds', 'description'] as const
    for (const key of fields) {
      if (key in updates && updates[key] !== undefined) {
        data[key] = updates[key]
      }
    }

    const updated = await prisma.buyerBoardPost.update({
      where: { id },
      data,
    })

    return NextResponse.json({ post: updated })
  } catch (err) {
    console.error('PATCH /api/marketplace/buyer-board/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to update post', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── DELETE /api/marketplace/buyer-board/[id] ────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const post = await prisma.buyerBoardPost.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!post) return NextResponse.json({ error: 'Post not found or not yours' }, { status: 404 })

    await prisma.buyerBoardPost.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/marketplace/buyer-board/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to delete post', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
