import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// ─── GET /api/messages/conversations — list user's conversations ─────────────

export async function GET() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  try {
    const participations = await prisma.conversationParticipant.findMany({
      where: { profileId: profile.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                profile: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    })

    const conversations = participations.map(p => {
      const other = p.conversation.participants.find(
        pp => pp.profileId !== profile.id,
      )
      const lastMsg = p.conversation.messages[0] ?? null
      const hasUnread = lastMsg
        ? new Date(lastMsg.createdAt) > new Date(p.lastReadAt)
        : false

      return {
        id: p.conversation.id,
        otherUser: other?.profile ?? null,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt.toISOString(),
              senderId: lastMsg.senderId,
            }
          : null,
        unread: hasUnread,
        updatedAt: p.conversation.updatedAt.toISOString(),
      }
    })

    return successResponse({ conversations })
  } catch (err) {
    console.error('GET /api/messages/conversations error:', err)
    return errorResponse(500, 'Failed to load conversations')
  }
}

// ─── POST /api/messages/conversations — create or find conversation ──────────

export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const targetProfileId = body.profileId as string
  if (!targetProfileId || typeof targetProfileId !== 'string') {
    return errorResponse(400, 'profileId is required')
  }
  if (targetProfileId === profile.id) {
    return errorResponse(400, 'Cannot message yourself')
  }

  // Verify target profile exists
  const targetProfile = await prisma.profile.findUnique({
    where: { id: targetProfileId },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  })
  if (!targetProfile) return errorResponse(404, 'User not found')

  try {
    // Check if conversation already exists between these two users
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { profileId: profile.id } } },
          { participants: { some: { profileId: targetProfileId } } },
        ],
      },
      include: {
        participants: {
          include: {
            profile: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    })

    if (existing) {
      return successResponse({
        conversation: {
          id: existing.id,
          otherUser: targetProfile,
          lastMessage: null,
          unread: false,
          updatedAt: existing.updatedAt.toISOString(),
        },
        created: false,
      })
    }

    // Create new conversation with both participants
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { profileId: profile.id },
            { profileId: targetProfileId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            profile: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    })

    return successResponse(
      {
        conversation: {
          id: conversation.id,
          otherUser: targetProfile,
          lastMessage: null,
          unread: false,
          updatedAt: conversation.updatedAt.toISOString(),
        },
        created: true,
      },
      201,
    )
  } catch (err) {
    console.error('POST /api/messages/conversations error:', err)
    return errorResponse(500, 'Failed to create conversation')
  }
}
