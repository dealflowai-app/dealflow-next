// ─── Simple TTL Cache for Dashboard Data ────────────────────────────────────
// In-memory cache keyed by profileId. Each entry expires after TTL_MS.
// This avoids re-running 25+ queries on rapid dashboard refreshes.

const TTL_MS = 30_000 // 30 seconds

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

// Clean up expired entries every 60 seconds — guarded against duplicate intervals in dev HMR
const globalForCache = globalThis as unknown as { __dashboardCacheInterval?: ReturnType<typeof setInterval> }
if (!globalForCache.__dashboardCacheInterval) {
  globalForCache.__dashboardCacheInterval = setInterval(() => {
    const now = Date.now()
    cache.forEach((entry, key) => {
      if (entry.expiresAt <= now) cache.delete(key)
    })
  }, 60_000)
}

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS })
}
