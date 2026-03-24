import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import {
  addSSEClient,
  removeSSEClient,
  sendHeartbeat,
  getClientCount,
  type SSEClient,
} from '@/lib/notification-emitter'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_CONNECTIONS_PER_USER = 5

/**
 * GET /api/notifications/stream
 *
 * Server-Sent Events endpoint for real-time notifications.
 * Clients receive events like:
 *   event: notification
 *   data: {"type":"deal_match","title":"...","body":"..."}
 *
 * Heartbeats sent every 30s to keep the connection alive.
 * Auto-closes after 10 minutes; sends a `timeout` event first so
 * the client can reconnect immediately instead of using backoff.
 */
export async function GET(req: NextRequest) {
  // Origin validation — only allow requests from same origin
  const origin = req.headers.get('origin')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (origin && appUrl && !appUrl.startsWith(origin)) {
    return new Response('Forbidden', { status: 403 })
  }

  const { profile } = await getAuthProfile()
  if (!profile) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Limit concurrent connections per user
  if (getClientCount(profile.id) >= MAX_CONNECTIONS_PER_USER) {
    return new Response('Too many connections', { status: 429 })
  }

  let client: SSEClient | null = null
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let maxAgeTimeout: ReturnType<typeof setTimeout> | null = null

  const stream = new ReadableStream({
    start(controller) {
      client = {
        id: nanoid(),
        profileId: profile.id,
        controller,
        createdAt: Date.now(),
      }
      addSSEClient(client)

      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`event: connected\ndata: {"clientId":"${client.id}"}\n\n`))

      // Heartbeat every 30 seconds
      heartbeatInterval = setInterval(() => {
        try {
          sendHeartbeat(profile.id)
        } catch {
          // Stream closed — clean up
          if (heartbeatInterval) clearInterval(heartbeatInterval)
        }
      }, 30_000)

      // Auto-close after 10 minutes — send timeout event so client reconnects immediately
      maxAgeTimeout = setTimeout(() => {
        try {
          controller.enqueue(encoder.encode(`event: timeout\ndata: {}\n\n`))
        } catch { /* already closed */ }
        if (client) removeSSEClient(client)
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        try { controller.close() } catch { /* already closed */ }
      }, 10 * 60 * 1000)
    },
    cancel() {
      if (client) removeSSEClient(client)
      if (heartbeatInterval) clearInterval(heartbeatInterval)
      if (maxAgeTimeout) clearTimeout(maxAgeTimeout)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
