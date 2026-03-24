import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    _url: string
    _headers: Map<string, string>
    _body: string | null

    constructor(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
      this._url = url
      this._headers = new Map(Object.entries(init?.headers ?? {}))
      this._body = init?.body ?? null
    }

    get headers() {
      return {
        get: (key: string) => this._headers.get(key) ?? null,
      }
    }

    async text() {
      return this._body ?? ''
    }
  },
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

import { errorResponse, successResponse, parseBody, verifyCronSecret } from '@/lib/api-utils'
import { NextRequest } from 'next/server'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('errorResponse', () => {
  it('returns error JSON with correct status', () => {
    const res = errorResponse(400, 'Bad request') as any
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Bad request')
  })

  it('includes additional details when provided', () => {
    const res = errorResponse(422, 'Validation failed', { field: 'email' }) as any
    expect(res.body.details).toEqual({ field: 'email' })
  })

  it('omits details when not provided', () => {
    const res = errorResponse(500, 'Server error') as any
    expect(res.body.details).toBeUndefined()
  })
})

describe('successResponse', () => {
  it('returns data with 200 status by default', () => {
    const res = successResponse({ count: 5 }) as any
    expect(res.status).toBe(200)
    expect(res.body.count).toBe(5)
  })

  it('allows custom status', () => {
    const res = successResponse({ created: true }, 201) as any
    expect(res.status).toBe(201)
  })
})

describe('parseBody', () => {
  it('parses valid JSON body', async () => {
    const req = new NextRequest('http://test.com', {
      body: JSON.stringify({ name: 'test' }),
      headers: { 'content-type': 'application/json' },
    })
    const result = await parseBody(req)
    expect(result.body).toEqual({ name: 'test' })
    expect(result.error).toBeUndefined()
  })

  it('rejects empty body', async () => {
    const req = new NextRequest('http://test.com', { body: '' })
    const result = await parseBody(req)
    expect(result.body).toBeNull()
    expect(result.error).toBe('Request body is empty')
  })

  it('rejects invalid JSON', async () => {
    const req = new NextRequest('http://test.com', { body: 'not json' })
    const result = await parseBody(req)
    expect(result.body).toBeNull()
    expect(result.error).toBe('Invalid JSON body')
  })

  it('rejects array bodies', async () => {
    const req = new NextRequest('http://test.com', { body: '[1,2,3]' })
    const result = await parseBody(req)
    expect(result.body).toBeNull()
    expect(result.error).toBe('Request body must be a JSON object')
  })

  it('rejects body exceeding max size via content-length', async () => {
    const req = new NextRequest('http://test.com', {
      body: JSON.stringify({ data: 'x' }),
      headers: { 'content-length': String(200 * 1024) }, // 200KB
    })
    const result = await parseBody(req) // default 100KB
    expect(result.body).toBeNull()
    expect(result.error).toContain('too large')
  })

  it('rejects body exceeding max size via text length', async () => {
    const bigBody = JSON.stringify({ data: 'x'.repeat(150 * 1024) })
    const req = new NextRequest('http://test.com', { body: bigBody })
    const result = await parseBody(req)
    expect(result.body).toBeNull()
    expect(result.error).toContain('too large')
  })

  it('accepts body within custom size limit', async () => {
    const req = new NextRequest('http://test.com', {
      body: JSON.stringify({ ok: true }),
      headers: { 'content-length': '50' },
    })
    const result = await parseBody(req, 1) // 1KB max
    expect(result.body).toEqual({ ok: true })
  })
})

describe('verifyCronSecret', () => {
  const originalEnv = process.env.CRON_SECRET

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CRON_SECRET = originalEnv
    } else {
      delete process.env.CRON_SECRET
    }
  })

  it('returns true for matching secret', () => {
    process.env.CRON_SECRET = 'my-secret-123'
    const req = new NextRequest('http://test.com', {
      headers: { authorization: 'Bearer my-secret-123' },
    })
    expect(verifyCronSecret(req)).toBe(true)
  })

  it('returns false for wrong secret', () => {
    process.env.CRON_SECRET = 'my-secret-123'
    const req = new NextRequest('http://test.com', {
      headers: { authorization: 'Bearer wrong-secret' },
    })
    expect(verifyCronSecret(req)).toBe(false)
  })

  it('returns false when no CRON_SECRET env var', () => {
    delete process.env.CRON_SECRET
    const req = new NextRequest('http://test.com', {
      headers: { authorization: 'Bearer anything' },
    })
    expect(verifyCronSecret(req)).toBe(false)
  })

  it('returns false when no authorization header', () => {
    process.env.CRON_SECRET = 'my-secret-123'
    const req = new NextRequest('http://test.com', {})
    expect(verifyCronSecret(req)).toBe(false)
  })

  it('returns false for mismatched length (timing-safe)', () => {
    process.env.CRON_SECRET = 'short'
    const req = new NextRequest('http://test.com', {
      headers: { authorization: 'Bearer very-long-secret-value' },
    })
    expect(verifyCronSecret(req)).toBe(false)
  })
})
