// ─── Query Timer ─────────────────────────────────────────────────────────────
// Wraps a Promise and logs execution time if it exceeds the threshold.
// Only logs in development to avoid noise in production.

const SLOW_THRESHOLD_MS = 500

export async function timeQuery<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV !== 'development') return fn()

  const start = Date.now()
  const result = await fn()
  const elapsed = Date.now() - start

  if (elapsed > SLOW_THRESHOLD_MS) {
    console.warn(`[SLOW QUERY] ${label}: ${elapsed}ms`)
  }

  return result
}
