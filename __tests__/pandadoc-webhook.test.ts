import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/server', () => {
  class MockNextRequest {
    _body: string
    _headers: Map<string, string>
    constructor(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
      this._body = init?.body ?? ''
      this._headers = new Map(Object.entries(init?.headers ?? {}))
    }
    get headers() {
      return { get: (key: string) => this._headers.get(key) ?? null }
    }
    async text() { return this._body }
  }
  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) => ({
        body,
        status: init?.status ?? 200,
      }),
    },
  }
})

const mockVerifyWebhookSignature = vi.fn()
const mockProcessWebhookEvent = vi.fn()
vi.mock('@/lib/contracts/pandadoc', () => ({
  verifyWebhookSignature: (...args: unknown[]) => mockVerifyWebhookSignature(...args),
  processWebhookEvent: (...args: unknown[]) => mockProcessWebhookEvent(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { POST } from '@/app/api/webhooks/pandadoc/route'
import { NextRequest } from 'next/server'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/pandadoc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processes valid webhook event', async () => {
    const payload = {
      event: 'document_state_changed',
      data: { id: 'doc-123', status: 'document.completed' },
    }

    mockVerifyWebhookSignature.mockReturnValue(true)
    mockProcessWebhookEvent.mockResolvedValue({
      contractId: 'contract-1',
      action: 'updated',
    })

    const req = new NextRequest('http://test.com/api/webhooks/pandadoc', {
      method: 'POST',
      headers: { 'x-pandadoc-signature': 'valid-sig' },
      body: JSON.stringify(payload),
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)
    expect(res.body.contractId).toBe('contract-1')
    expect(mockVerifyWebhookSignature).toHaveBeenCalledWith(
      JSON.stringify(payload),
      'valid-sig',
    )
  })

  it('rejects invalid signature with 401', async () => {
    mockVerifyWebhookSignature.mockReturnValue(false)

    const req = new NextRequest('http://test.com/api/webhooks/pandadoc', {
      method: 'POST',
      headers: { 'x-pandadoc-signature': 'bad-sig' },
      body: JSON.stringify({ event: 'test', data: {} }),
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid signature')
  })

  it('skips signature verification when no signature header', async () => {
    const payload = {
      event: 'document_state_changed',
      data: { id: 'doc-456' },
    }
    mockProcessWebhookEvent.mockResolvedValue({
      contractId: null,
      action: 'skipped',
    })

    const req = new NextRequest('http://test.com/api/webhooks/pandadoc', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(200)
    expect(mockVerifyWebhookSignature).not.toHaveBeenCalled()
  })

  it('returns 200 even on processing errors (prevent retries)', async () => {
    const payload = {
      event: 'document_state_changed',
      data: { id: 'doc-789' },
    }
    mockProcessWebhookEvent.mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://test.com/api/webhooks/pandadoc', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(200) // Must return 200 to prevent PandaDoc retries
    expect(res.body.received).toBe(true)
    expect(res.body.error).toBe('Processing failed')
  })
})
