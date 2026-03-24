/**
 * Server-side Notification Event Emitter
 *
 * Manages SSE connections per user. When a notification is created,
 * call `emitNotification()` to push it to all connected clients
 * for that user in real-time.
 *
 * Uses a simple in-memory Map — works for a single-server deployment
 * (Vercel serverless functions). For multi-server, replace with Redis pub/sub.
 */

export interface SSEClient {
  id: string
  profileId: string
  controller: ReadableStreamDefaultController
  createdAt: number
}

// profileId -> Set of SSE clients
const clients = new Map<string, Set<SSEClient>>()

// Prevent duplicate cleanup intervals in dev HMR
const globalForSSE = globalThis as unknown as { __sseCleanupInterval?: ReturnType<typeof setInterval> }

// Clean up stale connections every 2 minutes
if (!globalForSSE.__sseCleanupInterval) {
  globalForSSE.__sseCleanupInterval = setInterval(() => {
    const maxAge = 10 * 60 * 1000 // 10 minutes
    const now = Date.now()
    clients.forEach((set, profileId) => {
      set.forEach((client) => {
        if (now - client.createdAt > maxAge) {
          try { client.controller.close() } catch { /* already closed */ }
          set.delete(client)
        }
      })
      if (set.size === 0) clients.delete(profileId)
    })
  }, 120_000)
}

/** Register an SSE client for a user */
export function addSSEClient(client: SSEClient): void {
  if (!clients.has(client.profileId)) {
    clients.set(client.profileId, new Set())
  }
  clients.get(client.profileId)!.add(client)
}

/** Remove an SSE client (on disconnect) */
export function removeSSEClient(client: SSEClient): void {
  const set = clients.get(client.profileId)
  if (set) {
    set.delete(client)
    if (set.size === 0) clients.delete(client.profileId)
  }
}

/** Get the number of connected clients for a user */
export function getClientCount(profileId: string): number {
  return clients.get(profileId)?.size ?? 0
}

/**
 * Push a notification event to all SSE clients for a user.
 *
 * Event format follows the SSE spec:
 *   event: notification\n
 *   data: {"type":"deal_match","title":"...",...}\n\n
 */
export function emitNotification(
  profileId: string,
  payload: {
    type: string
    title: string
    body: string
    data?: Record<string, unknown>
  },
): void {
  const set = clients.get(profileId)
  if (!set || set.size === 0) return

  const message = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`
  const encoder = new TextEncoder()
  const encoded = encoder.encode(message)

  const dead: SSEClient[] = []
  set.forEach((client) => {
    try {
      client.controller.enqueue(encoded)
    } catch {
      // Client disconnected
      dead.push(client)
    }
  })

  // Clean up dead clients
  dead.forEach((c) => set.delete(c))
  if (set.size === 0) clients.delete(profileId)
}

/**
 * Send a heartbeat to keep connections alive.
 * Called by the SSE endpoint on an interval.
 */
export function sendHeartbeat(profileId: string): void {
  const set = clients.get(profileId)
  if (!set) return

  const message = `: heartbeat\n\n`
  const encoder = new TextEncoder()
  const encoded = encoder.encode(message)

  const dead: SSEClient[] = []
  set.forEach((client) => {
    try {
      client.controller.enqueue(encoded)
    } catch {
      dead.push(client)
    }
  })
  dead.forEach((c) => set.delete(c))
  if (set.size === 0) clients.delete(profileId)
}
