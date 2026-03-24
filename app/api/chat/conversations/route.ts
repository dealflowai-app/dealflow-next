import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET /api/chat/conversations — list conversations
export async function GET(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 30), 100)
    const cursor = url.searchParams.get('cursor') ?? undefined

    const conversations = await prisma.chatConversation.findMany({
      where: { profileId: profile.id },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        title: true,
        summary: true,
        pinned: true,
        updatedAt: true,
        messages: true,
        shareToken: true,
        sharedAt: true,
      },
    })

    const hasMore = conversations.length > limit
    const items = hasMore ? conversations.slice(0, limit) : conversations

    const result = items.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      pinned: c.pinned,
      updatedAt: c.updatedAt,
      messageCount: Array.isArray(c.messages) ? (c.messages as unknown[]).length : 0,
      shared: !!c.sharedAt,
    }))

    return NextResponse.json({
      conversations: result,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (err) {
    logger.error('GET /api/chat/conversations error', { route: '/api/chat/conversations', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 },
    )
  }
}

// POST /api/chat/conversations — create a new conversation
export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const { title, messages } = body

    const conversation = await prisma.chatConversation.create({
      data: {
        profileId: profile.id,
        title: title ?? 'New conversation',
        messages: messages ?? [],
      },
      select: {
        id: true,
        title: true,
        summary: true,
        pinned: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (err) {
    logger.error('POST /api/chat/conversations error', { route: '/api/chat/conversations', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 },
    )
  }
}
