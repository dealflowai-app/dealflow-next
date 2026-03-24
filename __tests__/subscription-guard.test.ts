import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

const mockFindUnique = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    profile: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}))

import { requireTier, checkTierAccess, FEATURE_TIERS } from '@/lib/subscription-guard'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('requireTier', () => {
  beforeEach(() => {
    mockFindUnique.mockReset()
  })

  it('returns null (allowed) when user tier meets requirement', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'pro', tierStatus: 'active' })
    const result = await requireTier('user-1', 'starter')
    expect(result).toBeNull()
  })

  it('returns null when tier exactly matches requirement', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'starter', tierStatus: 'active' })
    const result = await requireTier('user-1', 'starter')
    expect(result).toBeNull()
  })

  it('returns 403 when user tier is below requirement', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'free', tierStatus: 'active' })
    const result = await requireTier('user-1', 'starter')
    expect(result).not.toBeNull()
    expect((result as any).status).toBe(403)
    expect((result as any).body.code).toBe('TIER_REQUIRED')
    expect((result as any).body.requiredTier).toBe('starter')
    expect((result as any).body.currentTier).toBe('free')
  })

  it('returns 404 when profile not found', async () => {
    mockFindUnique.mockResolvedValue(null)
    const result = await requireTier('nonexistent', 'free')
    expect(result).not.toBeNull()
    expect((result as any).status).toBe(404)
  })

  it('blocks cancelled subscriptions from paid features', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'pro', tierStatus: 'cancelled' })
    const result = await requireTier('user-1', 'starter')
    expect(result).not.toBeNull()
    expect((result as any).status).toBe(403)
    expect((result as any).body.code).toBe('SUBSCRIPTION_CANCELLED')
  })

  it('blocks past_due subscriptions from paid features', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'pro', tierStatus: 'past_due' })
    const result = await requireTier('user-1', 'starter')
    expect(result).not.toBeNull()
    expect((result as any).status).toBe(403)
    expect((result as any).body.code).toBe('PAYMENT_PAST_DUE')
  })

  it('allows cancelled subscriptions for free-tier features', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'pro', tierStatus: 'cancelled' })
    const result = await requireTier('user-1', 'free')
    expect(result).toBeNull()
  })

  it('maps enterprise tier to business', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'enterprise', tierStatus: 'active' })
    const result = await requireTier('user-1', 'business')
    expect(result).toBeNull()
  })

  it('maps trialing to trial', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'trialing', tierStatus: 'active' })
    const result = await requireTier('user-1', 'trial')
    expect(result).toBeNull()
  })

  it('maps unknown tier to free', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'unknown_tier', tierStatus: 'active' })
    const result = await requireTier('user-1', 'starter')
    expect(result).not.toBeNull()
    expect((result as any).status).toBe(403)
    expect((result as any).body.currentTier).toBe('free')
  })

  it('business tier can access all features', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'business', tierStatus: 'active' })
    for (const feature of Object.values(FEATURE_TIERS)) {
      const result = await requireTier('user-1', feature)
      expect(result).toBeNull()
    }
  })

  it('free tier can only access free features', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'free', tierStatus: 'active' })

    // Should access free features
    const dashResult = await requireTier('user-1', FEATURE_TIERS.dashboard)
    expect(dashResult).toBeNull()

    // Should NOT access starter features
    const discoveryResult = await requireTier('user-1', FEATURE_TIERS.discovery)
    expect(discoveryResult).not.toBeNull()
    expect((discoveryResult as any).status).toBe(403)
  })
})

describe('checkTierAccess', () => {
  beforeEach(() => {
    mockFindUnique.mockReset()
  })

  it('returns allowed=true when tier meets requirement', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'pro', tierStatus: 'active' })
    const result = await checkTierAccess('user-1', 'starter')
    expect(result.allowed).toBe(true)
    expect(result.currentTier).toBe('pro')
    expect(result.tierStatus).toBe('active')
  })

  it('returns allowed=false when tier is insufficient', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'free', tierStatus: 'active' })
    const result = await checkTierAccess('user-1', 'pro')
    expect(result.allowed).toBe(false)
  })

  it('returns allowed=false for cancelled subscription on paid features', async () => {
    mockFindUnique.mockResolvedValue({ tier: 'pro', tierStatus: 'cancelled' })
    const result = await checkTierAccess('user-1', 'starter')
    expect(result.allowed).toBe(false)
    expect(result.tierStatus).toBe('cancelled')
  })

  it('returns default values when profile not found', async () => {
    mockFindUnique.mockResolvedValue(null)
    const result = await checkTierAccess('nonexistent', 'free')
    expect(result.allowed).toBe(false)
    expect(result.currentTier).toBe('free')
  })
})

describe('FEATURE_TIERS', () => {
  it('maps free features correctly', () => {
    expect(FEATURE_TIERS.dashboard).toBe('free')
    expect(FEATURE_TIERS.community).toBe('free')
    expect(FEATURE_TIERS.askAi).toBe('free')
  })

  it('maps starter features correctly', () => {
    expect(FEATURE_TIERS.discovery).toBe('starter')
    expect(FEATURE_TIERS.crm).toBe('starter')
    expect(FEATURE_TIERS.deals).toBe('starter')
    expect(FEATURE_TIERS.contracts).toBe('starter')
    expect(FEATURE_TIERS.analyzeDeal).toBe('starter')
  })

  it('maps pro features correctly', () => {
    expect(FEATURE_TIERS.outreach).toBe('pro')
    expect(FEATURE_TIERS.aiCalling).toBe('pro')
  })

  it('maps business features correctly', () => {
    expect(FEATURE_TIERS.whiteLabel).toBe('business')
    expect(FEATURE_TIERS.apiAccess).toBe('business')
    expect(FEATURE_TIERS.teamManagement).toBe('business')
  })
})
