import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

const mockConstructEvent = vi.fn()
const mockRetrieveSubscription = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
    subscriptions: {
      retrieve: (...args: unknown[]) => mockRetrieveSubscription(...args),
    },
  },
}))

const mockProfileFindFirst = vi.fn()
const mockProfileUpdate = vi.fn()
const mockUsageUpsert = vi.fn()
const mockPaymentHistoryUpsert = vi.fn()
const mockAllowanceFindFirst = vi.fn()
const mockAllowanceUpdate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    profile: {
      findFirst: (...args: unknown[]) => mockProfileFindFirst(...args),
      update: (...args: unknown[]) => mockProfileUpdate(...args),
    },
    usage: {
      upsert: (...args: unknown[]) => mockUsageUpsert(...args),
    },
    paymentHistory: {
      upsert: (...args: unknown[]) => mockPaymentHistoryUpsert(...args),
    },
    usageAllowance: {
      findFirst: (...args: unknown[]) => mockAllowanceFindFirst(...args),
      update: (...args: unknown[]) => mockAllowanceUpdate(...args),
    },
  },
}))

vi.mock('@/lib/billing/allowances', () => ({
  createAllowanceForPeriod: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { POST } from '@/app/api/stripe/webhooks/route'
import { NextRequest } from 'next/server'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/stripe/webhooks', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.STRIPE_STARTER_PRICE_ID = 'price_starter'
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns 400 when signature is missing', async () => {
    const req = new NextRequest('http://test.com/api/stripe/webhooks', {
      method: 'POST',
      body: 'body',
    })
    const res = await POST(req as any) as any
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Missing signature')
  })

  it('returns 400 when webhook secret is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const req = new NextRequest('http://test.com/api/stripe/webhooks', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_test' },
      body: 'body',
    })
    const res = await POST(req as any) as any
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const req = new NextRequest('http://test.com/api/stripe/webhooks', {
      method: 'POST',
      headers: { 'stripe-signature': 'bad_sig' },
      body: 'body',
    })
    const res = await POST(req as any) as any
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid signature')
  })

  it('handles subscription.deleted — reverts profile to free', async () => {
    const mockSubscription = {
      id: 'sub_123',
      customer: 'cus_123',
      items: { data: [{ price: { id: 'price_pro' } }] },
    }

    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: mockSubscription },
    })

    mockProfileFindFirst.mockResolvedValue({
      id: 'profile-1',
      tier: 'pro',
      tierStatus: 'active',
    })
    mockProfileUpdate.mockResolvedValue({})
    mockAllowanceFindFirst.mockResolvedValue({
      id: 'allowance-1',
    })
    mockAllowanceUpdate.mockResolvedValue({})

    const req = new NextRequest('http://test.com/api/stripe/webhooks', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid_sig' },
      body: 'body',
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)

    // Verify profile was reverted to free
    expect(mockProfileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'profile-1' },
        data: expect.objectContaining({
          tier: 'free',
          tierStatus: 'cancelled',
          stripeSubscriptionId: null,
        }),
      }),
    )

    // Verify allowances were zeroed out
    expect(mockAllowanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          revealsAllowed: 0,
          callMinutesAllowed: 0,
          smsAllowed: 0,
          analysesAllowed: 0,
        }),
      }),
    )
  })

  it('handles subscription.updated — updates tier and status', async () => {
    const mockSubscription = {
      id: 'sub_456',
      customer: 'cus_456',
      status: 'active',
      trial_end: null,
      items: {
        data: [{
          price: { id: 'price_pro' },
          current_period_start: 1700000000,
          current_period_end: 1702592000,
        }],
      },
    }

    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: mockSubscription },
    })

    mockProfileFindFirst.mockResolvedValue({
      id: 'profile-2',
      tier: 'starter',
      tierStatus: 'active',
    })
    mockProfileUpdate.mockResolvedValue({})

    const req = new NextRequest('http://test.com/api/stripe/webhooks', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid_sig' },
      body: 'body',
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(200)

    expect(mockProfileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tier: 'pro',
          tierStatus: 'active',
        }),
      }),
    )
  })

  it('handles invoice.payment_failed — marks profile as past_due', async () => {
    const mockInvoice = {
      id: 'inv_789',
      customer: 'cus_789',
      amount_due: 29900,
      currency: 'usd',
      hosted_invoice_url: 'https://stripe.com/inv/789',
      lines: { data: [{ description: 'Pro plan' }] },
      parent: null,
    }

    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: { object: mockInvoice },
    })

    mockProfileFindFirst.mockResolvedValue({
      id: 'profile-3',
      tier: 'pro',
      tierStatus: 'active',
    })
    mockProfileUpdate.mockResolvedValue({})
    mockPaymentHistoryUpsert.mockResolvedValue({})

    const req = new NextRequest('http://test.com/api/stripe/webhooks', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid_sig' },
      body: 'body',
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(200)

    expect(mockProfileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { tierStatus: 'past_due' },
      }),
    )

    expect(mockPaymentHistoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: 'failed',
          amount: 29900,
        }),
      }),
    )
  })

  it('handles unrecognized event types gracefully', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'some.unknown.event',
      data: { object: {} },
    })

    const req = new NextRequest('http://test.com/api/stripe/webhooks', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid_sig' },
      body: 'body',
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)
  })

  it('returns 500 when handler throws', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_err', items: { data: [] } } },
    })

    mockProfileFindFirst.mockRejectedValue(new Error('DB connection failed'))

    const req = new NextRequest('http://test.com/api/stripe/webhooks', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid_sig' },
      body: 'body',
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Webhook processing failed')
  })
})
