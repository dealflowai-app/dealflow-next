import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// ─── GET /api/messages/unread-count — unread conversation count ──────────────

export async function GET() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  try {
    // Count conversations where the latest message is newer than lastReadAt
    const unreadConversations = await prisma.conversationParticipant.count({
      where: {
        profileId: profile.id,
        conversation: {
          messages: {
            some: {
              createdAt: { gt: prisma.conversationParticipant.fields?.lastReadAt as unknown as Date ?? new Date(0) },
              senderId: { not: profile.id },
            },
          },
        },
      },
    })

    return successResponse({ count: unreadConversations })
  } catch {
    // Fallback: simpler query if the above doesn't work with the schema
    try {
      const participations = await prisma.conversationParticipant.findMany({
        where: { profileId: profile.id },
        select: {
          lastReadAt: true,
          conversation: {
            select: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { createdAt: true, senderId: true },
              },
            },
          },
        },
      })

      const count = participations.filter(p => {
        const lastMsg = p.conversation.messages[0]
        if (!lastMsg) return false
        if (lastMsg.senderId === profile.id) return false
        return new Date(lastMsg.createdAt) > new Date(p.lastReadAt)
      }).length

      return successResponse({ count })
    } catch {
      return successResponse({ count: 0 })
    }
  }
}
