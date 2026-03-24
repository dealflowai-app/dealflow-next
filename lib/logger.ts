// ─── Structured Logger ──────────────────────────────────────────────────────
// JSON output in production for log aggregation, readable format in dev.
// Includes request context (requestId, route, method, userId) when available.
// Error-level logs are also reported to Sentry when configured.

export interface LogContext {
  requestId?: string
  route?: string
  method?: string
  userId?: string
  durationMs?: number
  [key: string]: unknown
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'debug']
const IS_PROD = process.env.NODE_ENV === 'production'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= MIN_LEVEL
}

function formatDev(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString().slice(11, 23) // HH:mm:ss.SSS
  const prefix = `[${timestamp}] ${level.toUpperCase().padEnd(5)}`
  const ctx = context
    ? ' ' + Object.entries(context)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' ')
    : ''
  return `${prefix} ${message}${ctx}`
}

function formatProd(level: LogLevel, message: string, context?: LogContext): string {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  })
}

/**
 * Report errors to Sentry if the SDK is available.
 * Lazy-loads to avoid import errors when @sentry/nextjs isn't installed.
 */
function reportToSentry(message: string, context?: LogContext): void {
  try {
    // Dynamic import to avoid breaking if Sentry isn't installed
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(new Error(message), {
        extra: context as Record<string, unknown>,
        tags: {
          route: context?.route,
          method: context?.method,
        },
      })
    }).catch(() => {
      // Sentry not available — silent
    })
  } catch {
    // Sentry not available — silent
  }
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return
  const formatted = IS_PROD ? formatProd(level, message, context) : formatDev(level, message, context)
  if (level === 'error') {
    console.error(formatted)
    // Report errors to Sentry in production
    if (IS_PROD) reportToSentry(message, context)
  } else if (level === 'warn') {
    console.warn(formatted)
  } else {
    console.log(formatted)
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
}

/** Generate a short request ID for tracing */
export function generateRequestId(): string {
  return Math.random().toString(36).slice(2, 10)
}
