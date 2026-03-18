import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { getLiveTranscript } from '@/lib/outreach/live-call-service'

interface RouteContext {
  params: Promise<{ callId: string }>
}

// GET /api/outreach/live/[callId]/transcript?since=timestamp
// Polled every 2 seconds during active monitoring
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { callId } = await ctx.params
  const url = new URL(req.url)
  const since = url.searchParams.get('since') || undefined

  try {
    const result = await getLiveTranscript(callId, profile.id, since)
    return successResponse({
      transcript: result.transcript,
      updatedAt: result.updatedAt,
    })
  } catch (err) {
    return errorResponse(400, err instanceof Error ? err.message : String(err))
  }
}
