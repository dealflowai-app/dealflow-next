'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface PollingOptions<T> {
  enabled?: boolean
  onUpdate?: (data: T) => void
  compareKey?: string // Key to compare for changes
}

interface PollingResult<T> {
  data: T | null
  isLoading: boolean
  lastUpdated: Date | null
  error: Error | null
  refetch: () => Promise<void>
}

const MAX_BACKOFF = 5 * 60 * 1000 // 5 minutes

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)

  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false
    if (!deepEqual(aObj[key], bObj[key])) return false
  }

  return true
}

export function useRealtimePolling<T>(
  url: string,
  interval: number = 30000,
  options?: PollingOptions<T>,
): PollingResult<T> {
  const { enabled = true, onUpdate, compareKey } = options ?? {}

  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const dataRef = useRef<T | null>(null)
  const errorCountRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  const hasChanged = useCallback(
    (prev: T | null, next: T): boolean => {
      if (prev === null) return true
      if (compareKey) {
        const prevVal = (prev as Record<string, unknown>)?.[compareKey]
        const nextVal = (next as Record<string, unknown>)?.[compareKey]
        return prevVal !== nextVal
      }
      return !deepEqual(prev, next)
    },
    [compareKey],
  )

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return

    setIsLoading(true)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const json = (await res.json()) as T

      if (!mountedRef.current) return

      // Reset backoff on success
      errorCountRef.current = 0
      setError(null)

      if (hasChanged(dataRef.current, json)) {
        dataRef.current = json
        setData(json)
        setLastUpdated(new Date())
        onUpdateRef.current?.(json)
      }
    } catch (err) {
      if (!mountedRef.current) return
      errorCountRef.current = Math.min(errorCountRef.current + 1, 10)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [url, hasChanged])

  const getNextInterval = useCallback(() => {
    if (errorCountRef.current === 0) return interval
    // Exponential backoff: interval * 2^errorCount, capped at MAX_BACKOFF
    const backoff = interval * Math.pow(2, errorCountRef.current)
    return Math.min(backoff, MAX_BACKOFF)
  }, [interval])

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await fetchData()
      if (mountedRef.current && enabled) {
        scheduleNext()
      }
    }, getNextInterval())
  }, [fetchData, getNextInterval, enabled])

  // Main polling effect
  useEffect(() => {
    mountedRef.current = true

    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    // Initial fetch
    fetchData().then(() => {
      if (mountedRef.current && enabled) {
        scheduleNext()
      }
    })

    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, fetchData, scheduleNext])

  // Visibility change: pause when tab hidden, resume immediately when visible
  useEffect(() => {
    if (!enabled) return

    function handleVisibilityChange() {
      if (document.hidden) {
        // Pause polling
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      } else {
        // Resume: fetch immediately, then reschedule
        fetchData().then(() => {
          if (mountedRef.current && enabled) {
            scheduleNext()
          }
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, fetchData, scheduleNext])

  return { data, isLoading, lastUpdated, error, refetch: fetchData }
}
