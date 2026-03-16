import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

type RouteCtx = { params: Promise<{ id: string }> }

// ─── POST /api/marketplace/buyer-board/[id]/contact ─────────────────────────
// Reach out to a buyer board poster.

export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const post = await prisma.buyerBoardPost.findUnique({
      where: { id },
      select: { id: true, profileId: true, status: true },
    })

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    if (post.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'This post is no longer active' }, { status: 400 })
    }

    if (post.profileId === profile.id) {
      return NextResponse.json({ error: 'You cannot contact your own post' }, { status: 400 })
    }

    // Check unique constraint
    const existing = await prisma.buyerBoardContact.findUnique({
      where: { postId_profileId: { postId: id, profileId: profile.id } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You have already contacted this poster', contact: existing },
        { status: 409 },
      )
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { message } = body as { message?: string }

    const contact = await prisma.buyerBoardContact.create({
      data: {
        postId: id,
        profileId: profile.id,
        message: message?.trim() || null,
      },
    })

    // Increment contact count (fire-and-forget)
    prisma.buyerBoardPost.update({
      where: { id },
      data: { contactCount: { increment: 1 } },
    }).catch(() => {})

    return NextResponse.json({ contact }, { status: 201 })
  } catch (err) {
    console.error('POST /api/marketplace/buyer-board/[id]/contact error:', err)
    return NextResponse.json(
      { error: 'Failed to send contact', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── GET /api/marketplace/buyer-board/[id]/contact ──────────────────────────
// List contacts for a post (owner only).

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const post = await prisma.buyerBoardPost.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!post) return NextResponse.json({ error: 'Post not found or not yours' }, { status: 404 })

    const contacts = await prisma.buyerBoardContact.findMany({
      where: { postId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        profile: {
          select: { firstName: true, lastName: true, company: true, email: true },
        },
      },
    })

    return NextResponse.json({ contacts })
  } catch (err) {
    console.error('GET /api/marketplace/buyer-board/[id]/contact error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch contacts', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
