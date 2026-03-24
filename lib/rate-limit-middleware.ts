/**
 * Rate Limiting Middleware for API Routes
 *
 * Wraps Next.js API route handlers with rate limiting based on
 * the authenticated user ID or the client IP address.
 *
 * Usage:
 *   import { withRateLimit } from '@/lib/rate-limit-middleware'
 *
 *   export const GET = withRateLimit(
 *     async (req) => { ... },
 *     { max: 60, windowMs: 60_000 }
 *   )
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

interface RateLimitConfig {
  /** Max requests per window (default: 60) */
  max?: number
  /** Window duration in ms (default: 60000 = 1 minute) */
  windowMs?: number
  /** Custom key prefix (default: route path) */
  keyPrefix?: string
}

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>

/**
 * Get a rate-limit key from the request.
 * Uses X-Forwarded-For header (Vercel sets this), falling back to a generic key.
 */
function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'anonymous'
}

/**
 * Higher-order function that wraps a route handler with rate limiting.
 */
export function withRateLimit(
  handler: RouteHandler,
  config?: RateLimitConfig,
): RouteHandler {
  const max = config?.max ?? 60
  const windowMs = config?.windowMs ?? 60_000

  return async (req: NextRequest, ctx?: unknown) => {
    const prefix = config?.keyPrefix ?? req.nextUrl.pathname
    const clientKey = getClientKey(req)
    const key = `${prefix}:${clientKey}`

    const rl = rateLimit(key, max, windowMs)
    if (!rl.allowed) {
      return rateLimitResponse(rl.resetAt)
    }

    // Add rate limit headers to response
    const response = await handler(req, ctx)
    const headers = new Headers(response.headers)
    headers.set('X-RateLimit-Limit', String(max))
    headers.set('X-RateLimit-Remaining', String(rl.remaining))
    headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetAt / 1000)))

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

/**
 * Pre-configured rate limiters for common route categories.
 */
export const RATE_LIMITS = {
  /** Standard API routes: 60 req/min */
  standard: { max: 60, windowMs: 60_000 },
  /** Auth routes (login, signup): 10 req/min */
  auth: { max: 10, windowMs: 60_000 },
  /** Search/discovery routes: 30 req/min */
  search: { max: 30, windowMs: 60_000 },
  /** AI/expensive routes: 20 req/min */
  ai: { max: 20, windowMs: 60_000 },
  /** Webhook endpoints: 100 req/min */
  webhook: { max: 100, windowMs: 60_000 },
} as const
