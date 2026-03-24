import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/server', () => {
  class MockNextRequest {
    _url: string
    constructor(url: string) {
      this._url = url
    }
    get url() { return this._url }
    get nextUrl() {
      const u = new URL(this._url)
      return { searchParams: u.searchParams }
    }
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

const mockFindMany = vi.fn()
const mockCount = vi.fn()
const mockUpdateMany = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}))

vi.mock('@/lib/api-utils', async () => {
  return {
    errorResponse: (status: number, error: string) => ({
      body: { error },
      status,
    }),
    successResponse: (data: Record<string, unknown>, status = 200) => ({
      body: data,
      status,
    }),
  }
})

import { GET, POST } from '@/app/api/notifications/route'
import { NextRequest } from 'next/server'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetAuthProfile.mockResolvedValue({ profile: null, error: 'Unauthorized', status: 401 })
    const req = new NextRequest('http://test.com/api/notifications')
    const res = await GET(req as any) as any
    expect(res.status).toBe(401)
  })

  it('returns paginated notifications', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })

    const mockNotifications = [
      { id: '1', title: 'Test', read: false, createdAt: new Date() },
      { id: '2', title: 'Test 2', read: true, createdAt: new Date() },
    ]

    mockFindMany.mockResolvedValue(mockNotifications)
    mockCount
      .mockResolvedValueOnce(10)  // total
      .mockResolvedValueOnce(5)   // unread

    const req = new NextRequest('http://test.com/api/notifications?limit=20&offset=0')
    const res = await GET(req as any) as any

    expect(res.status).toBe(200)
    expect(res.body.notifications).toEqual(mockNotifications)
    expect(res.body.total).toBe(10)
    expect(res.body.unreadCount).toBe(5)
    expect(res.body.hasMore).toBe(false)
  })

  it('caps limit at 50', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })

    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    const req = new NextRequest('http://test.com/api/notifications?limit=100')
    await GET(req as any)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    )
  })

  it('filters unread only when param is set', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })

    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    const req = new NextRequest('http://test.com/api/notifications?unread=true')
    await GET(req as any)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ read: false }),
      }),
    )
  })

  it('calculates hasMore correctly', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })

    mockFindMany.mockResolvedValue([])
    mockCount
      .mockResolvedValueOnce(100) // total = 100
      .mockResolvedValueOnce(50)  // unread

    const req = new NextRequest('http://test.com/api/notifications?limit=20&offset=0')
    const res = await GET(req as any) as any

    expect(res.body.hasMore).toBe(true) // 0 + 20 < 100
  })
})

describe('POST /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetAuthProfile.mockResolvedValue({ profile: null, error: 'Unauthorized', status: 401 })
    const req = new NextRequest('http://test.com/api/notifications')
    const res = await POST(req as any) as any
    expect(res.status).toBe(401)
  })

  it('marks all notifications as read', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })
    mockUpdateMany.mockResolvedValue({ count: 5 })

    const req = new NextRequest('http://test.com/api/notifications?action=mark-all-read')
    const res = await POST(req as any) as any

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { profileId: 'user-1', read: false },
      data: { read: true },
    })
  })

  it('returns 400 for unknown action', async () => {
    mockGetAuthProfile.mockResolvedValue({
      profile: { id: 'user-1' },
      error: null,
      status: 200,
    })

    const req = new NextRequest('http://test.com/api/notifications?action=invalid')
    const res = await POST(req as any) as any

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Unknown action')
  })
})
