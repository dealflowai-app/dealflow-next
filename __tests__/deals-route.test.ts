import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/server', () => {
  class MockNextRequest {
    _body: string | null
    _url: string
    constructor(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
      this._url = url
      this._body = init?.body ?? null
    }
    get url() { return this._url }
    get headers() {
      return { get: () => null }
    }
    async text() { return this._body ?? '' }
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

const mockGetAuthProfile = vi.fn()
vi.mock('@/lib/auth', () => ({
  getAuthProfile: () => mockGetAuthProfile(),
}))

const mockRequireTier = vi.fn()
vi.mock('@/lib/subscription-guard', () => ({
  requireTier: (...args: unknown[]) => mockRequireTier(...args),
  FEATURE_TIERS: {
    deals: 'starter',
    discovery: 'starter',
    dashboard: 'free',
  },
}))

const mockDealFindMany = vi.fn()
const mockDealCreate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    deal: {
      findMany: (...args: unknown[]) => mockDealFindMany(...args),
      create: (...args: unknown[]) => mockDealCreate(...args),
    },
  },
}))

vi.mock('@/lib/daisy-chain', () => ({
  checkDaisyChain: vi.fn().mockResolvedValue({
    isDuplicate: false,
    confidence: 'none',
    existingDeals: [],
    warning: null,
  }),
}))

vi.mock('@/lib/auto-match', () => ({
  autoMatchDeal: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/api-utils', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    // Keep real parseBody since it works with our mock NextRequest
  }
})

vi.mock('@/lib/validation', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return actual
})

import { GET, POST } from '@/app/api/deals/route'
import { NextRequest } from 'next/server'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/deals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetAuthProfile.mockResolvedValue({ profile: null, error: 'Unauthorized', status: 401 })
    const res = await GET() as any
    expect(res.status).toBe(401)
  })

  it('returns deals for authenticated user', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })

    const mockDeals = [
      { id: 'deal-1', address: '123 Main St', matches: [], offers: [] },
      { id: 'deal-2', address: '456 Oak Ave', matches: [{ id: 'm1', matchScore: 85 }], offers: [] },
    ]
    mockDealFindMany.mockResolvedValue(mockDeals)

    const res = await GET() as any
    expect(res.status).toBe(200)
    expect(res.body.deals).toEqual(mockDeals)
  })

  it('returns 500 on database error', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })
    mockDealFindMany.mockRejectedValue(new Error('Connection refused'))

    const res = await GET() as any
    expect(res.status).toBe(500)
    expect(res.body.error).toContain('Failed to fetch deals')
  })
})

describe('POST /api/deals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetAuthProfile.mockResolvedValue({ profile: null, error: 'Unauthorized', status: 401 })
    const req = new NextRequest('http://test.com/api/deals', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req as any) as any
    expect(res.status).toBe(401)
  })

  it('returns 403 when tier is insufficient', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })
    mockRequireTier.mockResolvedValue({
      body: { error: 'Requires Starter plan', code: 'TIER_REQUIRED' },
      status: 403,
    })

    const req = new NextRequest('http://test.com/api/deals', {
      method: 'POST',
      body: JSON.stringify({ address: '123 Main St' }),
    })
    const res = await POST(req as any) as any
    expect(res.status).toBe(403)
  })

  it('creates a deal with valid data', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })
    mockRequireTier.mockResolvedValue(null) // allowed

    const newDeal = {
      id: 'deal-new',
      address: '789 Elm St',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      askingPrice: 150000,
      status: 'ACTIVE',
    }
    mockDealCreate.mockResolvedValue(newDeal)

    const req = new NextRequest('http://test.com/api/deals', {
      method: 'POST',
      body: JSON.stringify({
        address: '789 Elm St',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
        askingPrice: 150000,
      }),
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(201)
    expect(res.body.deal.id).toBe('deal-new')
  })

  it('validates required fields', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })
    mockRequireTier.mockResolvedValue(null)

    const req = new NextRequest('http://test.com/api/deals', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required fields: address, city, state, zip, askingPrice
      }),
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(400)
  })

  it('validates asking price range', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })
    mockRequireTier.mockResolvedValue(null)

    const req = new NextRequest('http://test.com/api/deals', {
      method: 'POST',
      body: JSON.stringify({
        address: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
        askingPrice: -100, // Invalid
      }),
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(400)
  })

  it('validates state code', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })
    mockRequireTier.mockResolvedValue(null)

    const req = new NextRequest('http://test.com/api/deals', {
      method: 'POST',
      body: JSON.stringify({
        address: '123 Main St',
        city: 'Dallas',
        state: 'XX', // Invalid state
        zip: '75201',
        askingPrice: 100000,
      }),
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(400)
  })

  it('validates property type enum', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })
    mockRequireTier.mockResolvedValue(null)

    const req = new NextRequest('http://test.com/api/deals', {
      method: 'POST',
      body: JSON.stringify({
        address: '123 Main St',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
        askingPrice: 100000,
        propertyType: 'CASTLE', // Invalid
      }),
    })

    const res = await POST(req as any) as any
    expect(res.status).toBe(400)
  })
})
