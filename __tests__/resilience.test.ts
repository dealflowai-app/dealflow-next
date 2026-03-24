import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the logger to avoid console noise in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { withRetry, CircuitBreaker } from '@/lib/resilience'

// ─── withRetry ────────────────────────────────────────────────────────────────

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok')

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 1 })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 1, label: 'test-op' })
    ).rejects.toThrow('always fails')

    expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries
  })

  it('respects shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('non-retryable'))

    await expect(
      withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 1,
        shouldRetry: () => false,
      })
    ).rejects.toThrow('non-retryable')

    expect(fn).toHaveBeenCalledTimes(1) // no retries
  })

  it('defaults to 3 retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toThrow()
    expect(fn).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
  })
})

// ─── CircuitBreaker ───────────────────────────────────────────────────────────

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker

  beforeEach(() => {
    cb = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 100,
      label: 'test',
    })
  })

  it('starts in CLOSED state', () => {
    expect(cb.getState()).toBe('CLOSED')
  })

  it('executes function successfully in CLOSED state', async () => {
    const result = await cb.execute(() => Promise.resolve('ok'))
    expect(result).toBe('ok')
    expect(cb.getState()).toBe('CLOSED')
  })

  it('opens after reaching failure threshold', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow('fail')
    }

    expect(cb.getState()).toBe('OPEN')
  })

  it('rejects requests when OPEN', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow('fail')
    }

    // Now should reject without executing
    await expect(
      cb.execute(() => Promise.resolve('should not run'))
    ).rejects.toThrow('circuit breaker is open')
  })

  it('transitions to HALF_OPEN after reset timeout', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow()
    }
    expect(cb.getState()).toBe('OPEN')

    // Wait for reset timeout
    await new Promise(r => setTimeout(r, 150))

    expect(cb.getState()).toBe('HALF_OPEN')
  })

  it('closes after successful request in HALF_OPEN state', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow()
    }

    // Wait for reset
    await new Promise(r => setTimeout(r, 150))
    expect(cb.getState()).toBe('HALF_OPEN')

    // Successful request should close the circuit
    const result = await cb.execute(() => Promise.resolve('recovered'))
    expect(result).toBe('recovered')
    expect(cb.getState()).toBe('CLOSED')
  })

  it('re-opens on failure in HALF_OPEN state', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    // Trip the breaker
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow()
    }

    // Wait for reset
    await new Promise(r => setTimeout(r, 150))
    expect(cb.getState()).toBe('HALF_OPEN')

    // Another failure should re-open
    await expect(cb.execute(fail)).rejects.toThrow('fail')
    expect(cb.getState()).toBe('OPEN')
  })

  it('resets manually', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fail)).rejects.toThrow()
    }
    expect(cb.getState()).toBe('OPEN')

    cb.reset()
    expect(cb.getState()).toBe('CLOSED')

    // Should work again
    const result = await cb.execute(() => Promise.resolve('ok'))
    expect(result).toBe('ok')
  })

  it('does not open before threshold is reached', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    // Only 2 failures (threshold is 3)
    await expect(cb.execute(fail)).rejects.toThrow()
    await expect(cb.execute(fail)).rejects.toThrow()

    expect(cb.getState()).toBe('CLOSED')
  })

  it('resets failure count on success', async () => {
    const fail = () => Promise.reject(new Error('fail'))

    // 2 failures
    await expect(cb.execute(fail)).rejects.toThrow()
    await expect(cb.execute(fail)).rejects.toThrow()

    // 1 success resets the counter
    await cb.execute(() => Promise.resolve('ok'))

    // 2 more failures should not trip (counter was reset)
    await expect(cb.execute(fail)).rejects.toThrow()
    await expect(cb.execute(fail)).rejects.toThrow()

    expect(cb.getState()).toBe('CLOSED')
  })
})
