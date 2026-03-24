import { NextResponse } from 'next/server'

// ─── In-memory sliding window rate limiter ──────────────────────────────────
//
// LIMITATION: On serverless platforms (Vercel), each function instance has
// its own in-memory store. Rate limits are per-instance, not global.
//
// For production with strict rate limiting needs, replace with Upstash Redis:
//   import { Ratelimit } from '@upstash/ratelimit'
//   import { Redis } from '@upstash/redis'
//
// The current implementation still provides meaningful protection against:
// - Rapid repeated requests hitting the same instance (warm functions)
// - Client-side bugs causing request floods
// - Basic abuse within a single function lifecycle

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up stale entries every 2 minutes — guarded against duplicate intervals in dev HMR
const globalForRateLimit = globalThis as unknown as { __rateLimitInterval?: ReturnType<typeof setInterval> }
if (!globalForRateLimit.__rateLimitInterval) {
  globalForRateLimit.__rateLimitInterval = setInterval(() => {
    const now = Date.now()
    rateLimitMap.forEach((entry, key) => {
      if (entry.resetAt <= now) rateLimitMap.delete(key)
    })
  }, 120_000)
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || entry.resetAt <= now) {
    // New window
    const resetAt = now + windowMs
    rateLimitMap.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return NextResponse.json(
    { error: 'Too many requests', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}
