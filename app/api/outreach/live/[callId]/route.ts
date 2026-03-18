import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import {
  getCallDetail,
  startMonitoring,
  stopMonitoring,
  sendWhisper,
  bargeIn,
  endCallRemotely,
} from '@/lib/outreach/live-call-service'

interface RouteContext {
  params: Promise<{ callId: string }>
}

// GET /api/outreach/live/[callId] — Get call detail for monitoring
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { callId } = await ctx.params

  const detail = await getCallDetail(callId, profile.id)
  if (!detail) return errorResponse(404, 'Call not found')

  return successResponse({ ...detail })
}

// POST /api/outreach/live/[callId] — Actions: monitor, stop-monitor, whisper, barge-in, end
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { callId } = await ctx.params
  const { body: reqBody, error: parseError } = await parseBody(req)
  if (!reqBody) return errorResponse(400, parseError!)

  const action = reqBody.action as string

  try {
    // ── Start monitoring ──────────────────────────────────────────────
    if (action === 'monitor') {
      const session = await startMonitoring(callId, profile.id)
      return successResponse({ session })
    }

    // ── Stop monitoring ───────────────────────────────────────────────
    if (action === 'stop_monitor') {
      const sessionId = reqBody.sessionId as string
      if (!sessionId) return errorResponse(400, 'sessionId required')
      await stopMonitoring(sessionId, profile.id)
      return successResponse({ stopped: true })
    }

    // ── Whisper ───────────────────────────────────────────────────────
    if (action === 'whisper') {
      const sessionId = reqBody.sessionId as string
      const message = reqBody.message as string
      if (!sessionId) return errorResponse(400, 'sessionId required')
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return errorResponse(400, 'message required')
      }
      const result = await sendWhisper(sessionId, message.trim(), profile.id)
      return successResponse({ ...result })
    }

    // ── Barge in ──────────────────────────────────────────────────────
    if (action === 'barge_in') {
      const sessionId = reqBody.sessionId as string
      if (!sessionId) return errorResponse(400, 'sessionId required')
      const result = await bargeIn(sessionId, profile.id)
      return successResponse({ ...result })
    }

    // ── End call ──────────────────────────────────────────────────────
    if (action === 'end') {
      await endCallRemotely(callId, profile.id)
      return successResponse({ ended: true })
    }

    return errorResponse(400, 'Unknown action. Use: monitor, stop_monitor, whisper, barge_in, end')
  } catch (err) {
    return errorResponse(400, err instanceof Error ? err.message : String(err))
  }
}
