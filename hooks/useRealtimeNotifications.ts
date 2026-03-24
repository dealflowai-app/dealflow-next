'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface NotificationEvent {
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
}

interface UseRealtimeNotificationsOptions {
  /** Called whenever a new notification arrives via SSE */
  onNotification?: (event: NotificationEvent) => void
  /** Enable/disable the connection (default: true) */
  enabled?: boolean
}

interface UseRealtimeNotificationsResult {
  /** Whether the SSE connection is active */
  connected: boolean
  /** Latest notification event received */
  lastEvent: NotificationEvent | null
  /** Count of events received in this session */
  eventCount: number
}

/**
 * Hook that subscribes to real-time notification events via Server-Sent Events.
 *
 * Falls back gracefully — if SSE fails, the polling-based notification
 * system (useNotificationCount) continues working independently.
 *
 * Auto-reconnects with exponential backoff on disconnect.
 */
export function useRealtimeNotifications(
  options?: UseRealtimeNotificationsOptions,
): UseRealtimeNotificationsResult {
  const { onNotification, enabled = true } = options ?? {}

  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<NotificationEvent | null>(null)
  const [eventCount, setEventCount] = useState(0)

  const onNotificationRef = useRef(onNotification)
  onNotificationRef.current = onNotification

  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return
    if (typeof EventSource === 'undefined') return // SSR or unsupported

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource('/api/notifications/stream')
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      if (!mountedRef.current) return
      setConnected(true)
      retryCountRef.current = 0
    })

    es.addEventListener('notification', (event) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(event.data) as NotificationEvent
        if (!data.type || !data.title) return // Basic validation
        setLastEvent(data)
        setEventCount((c) => c + 1)
        onNotificationRef.current?.(data)
      } catch {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[SSE] Failed to parse notification:', event.data)
        }
      }
    })

    // Server sends `timeout` event before closing — reconnect immediately
    es.addEventListener('timeout', () => {
      if (!mountedRef.current) return
      setConnected(false)
      es.close()
      eventSourceRef.current = null
      retryCountRef.current = 0
      connect()
    })

    es.onerror = () => {
      if (!mountedRef.current) return
      setConnected(false)
      es.close()
      eventSourceRef.current = null

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30_000)
      retryCountRef.current++

      // Clear any pending retry timer before scheduling a new one
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current && enabled) connect()
      }, delay)
    }
  }, [enabled])

  useEffect(() => {
    mountedRef.current = true

    if (enabled) {
      connect()
    }

    return () => {
      mountedRef.current = false
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
      }
    }
  }, [enabled, connect])

  // Pause on tab hidden, resume on visible
  useEffect(() => {
    if (!enabled) return

    function handleVisibilityChange() {
      if (document.hidden) {
        // Close connection when tab is hidden to save resources
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
          setConnected(false)
        }
      } else {
        // Reconnect when tab becomes visible
        retryCountRef.current = 0
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [enabled, connect])

  return { connected, lastEvent, eventCount }
}
