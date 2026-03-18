import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

// ─── Recording Proxy ────────────────────────────────────────────────────────
// Proxies audio from Bland AI (or other provider) so the client never touches
// the raw provider URL. Supports Range requests for seeking in the audio player.
//
// Why a proxy?
// 1. Provider URLs may be temporary / signed — our API URL is stable
// 2. Auth: only the call owner can stream the recording
// 3. Range support: enables seeking in the browser audio element
// 4. CORS: avoids cross-origin issues with direct provider URLs

export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  // Verify ownership
  const call = await prisma.campaignCall.findUnique({
    where: { id },
    select: {
      recordingUrl: true,
      campaign: { select: { profileId: true } },
    },
  })

  if (!call || call.campaign?.profileId !== profile.id) {
    return errorResponse(404, 'Call not found')
  }

  if (!call.recordingUrl) {
    return errorResponse(404, 'No recording available for this call')
  }

  try {
    // Forward Range header for seeking support
    const rangeHeader = req.headers.get('range')
    const headers: Record<string, string> = {}
    if (rangeHeader) {
      headers['Range'] = rangeHeader
    }

    // Add Bland API auth if the URL is from Bland
    const blandApiKey = process.env.BLAND_API_KEY
    if (blandApiKey && call.recordingUrl.includes('bland.ai')) {
      headers['Authorization'] = `Bearer ${blandApiKey}`
    }

    const upstream = await fetch(call.recordingUrl, { headers })

    if (!upstream.ok && upstream.status !== 206) {
      logger.warn('Recording proxy upstream error', {
        route: `/api/outreach/calls/${id}/recording`,
        status: upstream.status,
      })
      return errorResponse(502, 'Failed to fetch recording from provider')
    }

    // Build response headers
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
    responseHeaders.set('Accept-Ranges', 'bytes')
    responseHeaders.set('Cache-Control', 'private, max-age=3600')

    // Forward content-related headers
    const contentLength = upstream.headers.get('content-length')
    if (contentLength) responseHeaders.set('Content-Length', contentLength)

    const contentRange = upstream.headers.get('content-range')
    if (contentRange) responseHeaders.set('Content-Range', contentRange)

    // Content-Disposition for download support
    responseHeaders.set('Content-Disposition', `inline; filename="call-${id}.mp3"`)

    return new NextResponse(upstream.body, {
      status: upstream.status, // 200 or 206 for partial content
      headers: responseHeaders,
    })
  } catch (err) {
    logger.error('Recording proxy failed', {
      route: `/api/outreach/calls/${id}/recording`,
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(502, 'Failed to stream recording')
  }
}
