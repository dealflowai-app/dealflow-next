import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { nanoid } from 'nanoid'

type RouteContext = { params: Promise<{ id: string }> }

function getShareBaseUrl(): string {
  // Trust configured app URL, never the host header
  return process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.app'
}

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
      return NextResponse.json({
        shareToken: conversation.shareToken,
        shareUrl: `${getShareBaseUrl()}/shared/chat/${conversation.shareToken}`,
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

    return NextResponse.json({
      shareToken,
      shareUrl: `${getShareBaseUrl()}/shared/chat/${shareToken}`,
    })
  } catch (err) {
    logger.error('POST share failed', { error: err instanceof Error ? err.message : String(err) })
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
    logger.error('DELETE share failed', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to revoke share' }, { status: 500 })
  }
}
