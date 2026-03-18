import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { nanoid } from 'nanoid'

type RouteContext = { params: Promise<{ id: string }> }

// POST — Enable sharing for a conversation
export async function POST(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await context.params

    const conversation = await prisma.chatConversation.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true, shareToken: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Already shared — return existing URL
    if (conversation.shareToken) {
      const host = req.headers.get('host') || 'localhost:3000'
      const proto = req.headers.get('x-forwarded-proto') || 'https'
      return NextResponse.json({
        shareToken: conversation.shareToken,
        shareUrl: `${proto}://${host}/shared/chat/${conversation.shareToken}`,
      })
    }

    // Generate a new share token (12 chars, URL-safe)
    const shareToken = nanoid(12)

    await prisma.chatConversation.update({
      where: { id },
      data: {
        shareToken,
        sharedAt: new Date(),
        sharedBy: profile.id,
      },
    })

    const host = req.headers.get('host') || 'localhost:3000'
    const proto = req.headers.get('x-forwarded-proto') || 'https'

    return NextResponse.json({
      shareToken,
      shareUrl: `${proto}://${host}/shared/chat/${shareToken}`,
    })
  } catch (err) {
    console.error('POST share error:', err)
    return NextResponse.json({ error: 'Failed to share conversation' }, { status: 500 })
  }
}

// DELETE — Revoke sharing
export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await context.params

    const conversation = await prisma.chatConversation.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await prisma.chatConversation.update({
      where: { id },
      data: {
        shareToken: null,
        sharedAt: null,
        sharedBy: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE share error:', err)
    return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 })
  }
}
