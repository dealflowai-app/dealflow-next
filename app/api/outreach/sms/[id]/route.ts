import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import {
  sendManualMessage,
  setConversationMode,
  markConversationRead,
} from '@/lib/outreach/sms-conversation'
import { trackSms } from '@/lib/usage'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/outreach/sms/[id] — Get conversation with messages
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await ctx.params

  const conversation = await prisma.sMSConversation.findUnique({
    where: { id },
    include: {
      buyer: {
        select: {
          id: true, firstName: true, lastName: true, entityName: true,
          phone: true, status: true, buyerScore: true, motivation: true,
          preferredMarkets: true, strategy: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 200,
      },
    },
  })

  if (!conversation || conversation.profileId !== profile.id) {
    return errorResponse(404, 'Conversation not found')
  }

  // Mark as read
  if (conversation.unreadCount > 0) {
    await markConversationRead(id)
  }

  return successResponse({ conversation })
}

// POST /api/outreach/sms/[id] — Send a message or change mode
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await ctx.params

  // Verify ownership
  const convo = await prisma.sMSConversation.findUnique({
    where: { id },
    select: { profileId: true },
  })
  if (!convo || convo.profileId !== profile.id) {
    return errorResponse(404, 'Conversation not found')
  }

  const { body: reqBody, error: parseError } = await parseBody(req)
  if (!reqBody) return errorResponse(400, parseError!)

  const action = reqBody.action as string

  // ── Send message ──────────────────────────────────────────────────────
  if (action === 'send') {
    const messageBody = reqBody.body as string
    if (!messageBody || typeof messageBody !== 'string' || messageBody.trim().length === 0) {
      return errorResponse(400, 'Message body is required')
    }

    const result = await sendManualMessage(id, messageBody.trim())
    if (!result.success) {
      return errorResponse(400, result.error || 'Send failed')
    }

    // Track SMS usage for billing
    try {
      await trackSms(profile.id)
    } catch (err) {
      logger.error('Usage tracking failed for SMS', { error: err instanceof Error ? err.message : String(err) })
    }

    return successResponse({
      messageId: result.messageId,
      twilioSid: result.twilioSid,
    })
  }

  // ── Takeover (switch to manual mode) ──────────────────────────────────
  if (action === 'takeover') {
    await setConversationMode(id, 'manual')
    return successResponse({ mode: 'manual' })
  }

  // ── Set mode ──────────────────────────────────────────────────────────
  if (action === 'set_mode') {
    const mode = reqBody.mode as string
    if (!['auto', 'manual', 'hybrid'].includes(mode)) {
      return errorResponse(400, 'Mode must be auto, manual, or hybrid')
    }
    await setConversationMode(id, mode as any)
    return successResponse({ mode })
  }

  // ── Archive ───────────────────────────────────────────────────────────
  if (action === 'archive') {
    await prisma.sMSConversation.update({
      where: { id },
      data: { status: 'archived' },
    })
    return successResponse({ status: 'archived' })
  }

  // ── Reopen ────────────────────────────────────────────────────────────
  if (action === 'reopen') {
    await prisma.sMSConversation.update({
      where: { id },
      data: { status: 'active' },
    })
    return successResponse({ status: 'active' })
  }

  return errorResponse(400, 'Unknown action. Use: send, takeover, set_mode, archive, reopen')
}
