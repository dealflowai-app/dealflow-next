import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock NextResponse before importing the module
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      body,
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
    }),
  },
}))

import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Access the internal map to clear state between tests
// We reset by using unique keys per test to avoid cross-test contamination

let counter = 0
function uniqueKey(): string {
  return `test-key-${++counter}-${Date.now()}`
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('rateLimit', () => {
  it('allows the first request', () => {
    const key = uniqueKey()
    const result = rateLimit(key, 5, 60_000)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('decrements remaining count', () => {
    const key = uniqueKey()

    const r1 = rateLimit(key, 5, 60_000)
    expect(r1.remaining).toBe(4)

    const r2 = rateLimit(key, 5, 60_000)
    expect(r2.remaining).toBe(3)

    const r3 = rateLimit(key, 5, 60_000)
    expect(r3.remaining).toBe(2)
  })

  it('blocks after max requests reached', () => {
    const key = uniqueKey()

    // Use up all 3 requests
    rateLimit(key, 3, 60_000)
    rateLimit(key, 3, 60_000)
    rateLimit(key, 3, 60_000)

    // 4th should be blocked
    const result = rateLimit(key, 3, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after window expires', () => {
    const key = uniqueKey()

    // Use a very short window
    const windowMs = 50

    rateLimit(key, 1, windowMs) // use the one allowed request

    // Should be blocked
    const blocked = rateLimit(key, 1, windowMs)
    expect(blocked.allowed).toBe(false)

    // Wait for window to expire then try again
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const afterReset = rateLimit(key, 1, windowMs)
        expect(afterReset.allowed).toBe(true)
        expect(afterReset.remaining).toBe(0) // 1 max - 1 used = 0
        resolve()
      }, windowMs + 10)
    })
  })

  it('tracks different keys independently', () => {
    const key1 = uniqueKey()
    const key2 = uniqueKey()

    // Exhaust key1
    rateLimit(key1, 1, 60_000)
    const blocked = rateLimit(key1, 1, 60_000)
    expect(blocked.allowed).toBe(false)

    // key2 should still work
    const result = rateLimit(key2, 1, 60_000)
    expect(result.allowed).toBe(true)
  })

  it('returns consistent resetAt within same window', () => {
    const key = uniqueKey()

    const r1 = rateLimit(key, 5, 60_000)
    const r2 = rateLimit(key, 5, 60_000)

    expect(r1.resetAt).toBe(r2.resetAt)
  })

  it('handles maxRequests of 1', () => {
    const key = uniqueKey()

    const first = rateLimit(key, 1, 60_000)
    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(0)

    const second = rateLimit(key, 1, 60_000)
    expect(second.allowed).toBe(false)
  })
})

describe('rateLimitResponse', () => {
  it('returns 429 status with Retry-After header', () => {
    const resetAt = Date.now() + 30_000
    const response = rateLimitResponse(resetAt) as unknown as {
      body: { error: string; retryAfter: number }
      status: number
      headers: Record<string, string>
    }

    expect(response.status).toBe(429)
    expect(response.body.error).toBe('Too many requests')
    expect(response.body.retryAfter).toBeGreaterThan(0)
    expect(response.headers['Retry-After']).toBeDefined()
  })
})
