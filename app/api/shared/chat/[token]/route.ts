import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

type RouteContext = { params: Promise<{ token: string }> }

// GET — Load a shared conversation (no auth required)
export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { token } = await context.params

    const conversation = await prisma.chatConversation.findUnique({
      where: { shareToken: token },
      select: {
        title: true,
        messages: true,
        summary: true,
        sharedAt: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            firstName: true,
            company: true,
          },
        },
      },
    })

    if (!conversation || !conversation.sharedAt) {
      return NextResponse.json(
        { error: 'This conversation is no longer available' },
        { status: 404 },
      )
    }

    // Strip action card data and internal IDs from messages
    const messages = Array.isArray(conversation.messages)
      ? (conversation.messages as Array<Record<string, unknown>>).map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
      : []

    return NextResponse.json({
      title: conversation.title,
      messages,
      summary: conversation.summary,
      sharedAt: conversation.sharedAt,
      createdAt: conversation.createdAt,
      sharedBy: {
        firstName: conversation.profile.firstName,
        company: conversation.profile.company,
      },
    })
  } catch (err) {
    logger.error('GET shared chat error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to load shared conversation' },
      { status: 500 },
    )
  }
}
