// ─── Cache Header Helpers ────────────────────────────────────────────────────
// Standardized cache control headers for API responses.
// Use stale-while-revalidate for fast reads with background refresh.

/** No caching — for mutations, auth, and real-time data */
export const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
} as const

/** Short cache (10s) with 30s stale — for frequently changing data (dashboard, activity) */
export const CACHE_SHORT = {
  'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
} as const

/** Medium cache (60s) with 5min stale — for semi-static data (marketplace listings, feed) */
export const CACHE_MEDIUM = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
} as const

/** Long cache (5min) with 1hr stale — for rarely changing data (market data, analysis history) */
export const CACHE_LONG = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
} as const

/** Private cache (60s) — for user-specific data that shouldn't be shared across CDN */
export const CACHE_PRIVATE = {
  'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
} as const

/** Apply cache headers to a NextResponse */
export function withCacheHeaders(
  headers: Record<string, string>,
  response: Response,
): Response {
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}
