import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string }> }

// ─── GET /api/messages/conversations/[id] — get messages in a conversation ───

export async function GET(req: NextRequest, ctx: RouteParams) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id: conversationId } = await ctx.params

  try {
    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_profileId: {
          conversationId,
          profileId: profile.id,
        },
      },
    })
    if (!participant) return errorResponse(403, 'Not a participant')

    const searchParams = req.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
    const cursor = searchParams.get('cursor')

    const messages = await prisma.directMessage.findMany({
      where: { conversationId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    })

    // Mark as read
    await prisma.conversationParticipant.update({
      where: {
        conversationId_profileId: {
          conversationId,
          profileId: profile.id,
        },
      },
      data: { lastReadAt: new Date() },
    })

    const hasMore = messages.length > limit
    const items = hasMore ? messages.slice(0, limit) : messages

    return successResponse({
      messages: items.map(m => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        sender: m.sender,
        createdAt: m.createdAt.toISOString(),
        isOwn: m.senderId === profile.id,
      })),
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (err) {
    console.error('GET /api/messages/conversations/[id] error:', err)
    return errorResponse(500, 'Failed to load messages')
  }
}

// ─── POST /api/messages/conversations/[id] — send a message ──────────────────

export async function POST(req: NextRequest, ctx: RouteParams) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id: conversationId } = await ctx.params
  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const content = (body.content as string)?.trim()
  if (!content) return errorResponse(400, 'Message content is required')
  if (content.length > 5000) return errorResponse(400, 'Message too long (max 5000 characters)')

  try {
    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_profileId: {
          conversationId,
          profileId: profile.id,
        },
      },
    })
    if (!participant) return errorResponse(403, 'Not a participant')

    // Create message and update conversation timestamp
    const [message] = await prisma.$transaction([
      prisma.directMessage.create({
        data: {
          conversationId,
          senderId: profile.id,
          content,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
      // Mark as read for sender
      prisma.conversationParticipant.update({
        where: {
          conversationId_profileId: {
            conversationId,
            profileId: profile.id,
          },
        },
        data: { lastReadAt: new Date() },
      }),
    ])

    return successResponse(
      {
        message: {
          id: message.id,
          content: message.content,
          senderId: message.senderId,
          sender: message.sender,
          createdAt: message.createdAt.toISOString(),
          isOwn: true,
        },
      },
      201,
    )
  } catch (err) {
    console.error('POST /api/messages/conversations/[id] error:', err)
    return errorResponse(500, 'Failed to send message')
  }
}
