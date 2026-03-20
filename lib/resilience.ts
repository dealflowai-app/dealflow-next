// ─── Resilience Utilities ───────────────────────────────────────────────────
// Retry with exponential backoff + jitter, and a simple circuit breaker
// for external API calls (email, SMS, geocode, PDF generation, etc.).

import { logger } from './logger'

// ── Retry with Backoff ──────────────────────────────────────────────────────

export interface RetryOptions {
  maxRetries?: number       // default 3
  baseDelayMs?: number      // default 500
  maxDelayMs?: number       // default 10_000
  shouldRetry?: (err: unknown) => boolean // default: always retry
  label?: string            // for logging
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry an async function with exponential backoff + jitter.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
    shouldRetry = () => true,
    label = 'operation',
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err

      if (attempt === maxRetries || !shouldRetry(err)) {
        logger.error(`${label} failed after ${attempt + 1} attempt(s)`, {
          error: err instanceof Error ? err.message : String(err),
          attempt: attempt + 1,
        })
        throw err
      }

      // Exponential backoff with jitter
      const exponential = baseDelayMs * Math.pow(2, attempt)
      const jitter = Math.random() * baseDelayMs
      const delay = Math.min(exponential + jitter, maxDelayMs)

      logger.warn(`${label} attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`, {
        error: err instanceof Error ? err.message : String(err),
        attempt: attempt + 1,
        nextRetryMs: Math.round(delay),
      })

      await sleep(delay)
    }
  }

  // TypeScript safety — should never reach here
  throw lastError
}

// ── Circuit Breaker ─────────────────────────────────────────────────────────

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  failureThreshold?: number  // failures before opening (default 5)
  resetTimeoutMs?: number    // ms before trying half-open (default 30_000)
  label?: string
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failures = 0
  private lastFailureTime = 0
  private readonly failureThreshold: number
  private readonly resetTimeoutMs: number
  private readonly label: string

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000
    this.label = options.label ?? 'circuit'
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      // Check if we should transition to half-open
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN'
        logger.info(`${this.label} circuit half-open, allowing test request`)
      }
    }
    return this.state
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState()

    if (currentState === 'OPEN') {
      logger.warn(`${this.label} circuit open, rejecting request`, {
        failures: this.failures,
        resetInMs: this.resetTimeoutMs - (Date.now() - this.lastFailureTime),
      })
      throw new Error(`${this.label} circuit breaker is open — service unavailable`)
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      logger.info(`${this.label} circuit closed after successful test request`)
    }
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN'
      logger.error(`${this.label} circuit opened after ${this.failures} failures`)
    }
  }

  /** Reset the circuit breaker (useful for testing) */
  reset(): void {
    this.state = 'CLOSED'
    this.failures = 0
    this.lastFailureTime = 0
  }
}

// ── Pre-configured circuit breakers for external services ───────────────────

export const circuits = {
  email: new CircuitBreaker({ label: 'email', failureThreshold: 5, resetTimeoutMs: 60_000 }),
  sms: new CircuitBreaker({ label: 'sms', failureThreshold: 5, resetTimeoutMs: 60_000 }),
  geocode: new CircuitBreaker({ label: 'geocode', failureThreshold: 3, resetTimeoutMs: 30_000 }),
  pdf: new CircuitBreaker({ label: 'pdf', failureThreshold: 3, resetTimeoutMs: 30_000 }),
  batchdata: new CircuitBreaker({ label: 'batchdata', failureThreshold: 5, resetTimeoutMs: 30_000 }),
}
