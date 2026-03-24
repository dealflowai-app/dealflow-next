/**
 * Subscription enforcement for API routes and server actions.
 *
 * Centralizes tier checks so individual routes don't have to
 * duplicate the same logic. Works alongside the existing
 * `checkAllowance()` system for usage-based limits.
 *
 * Usage in API routes:
 *   const guard = await requireTier(profileId, 'starter')
 *   if (guard) return guard // returns 403 response
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TIERS, type TierKey } from '@/lib/tiers'

// Tier hierarchy — higher index = higher tier
const TIER_HIERARCHY: TierKey[] = ['free', 'trial', 'starter', 'pro', 'business']

/**
 * Check if a user's current tier meets the minimum required tier.
 * Returns null if allowed, or a NextResponse 403 if not.
 */
export async function requireTier(
  profileId: string,
  minimumTier: TierKey,
): Promise<NextResponse | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { tier: true, tierStatus: true },
  })

  if (!profile) {
    return NextResponse.json(
      { error: 'Profile not found' },
      { status: 404 },
    )
  }

  // Block cancelled/past_due subscriptions from paid features
  if (minimumTier !== 'free') {
    if (profile.tierStatus === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription cancelled. Please resubscribe to access this feature.', code: 'SUBSCRIPTION_CANCELLED' },
        { status: 403 },
      )
    }
    if (profile.tierStatus === 'past_due') {
      return NextResponse.json(
        { error: 'Payment past due. Please update your payment method.', code: 'PAYMENT_PAST_DUE' },
        { status: 403 },
      )
    }
  }

  const effectiveTier = mapTier(profile.tier)
  const userTierIndex = TIER_HIERARCHY.indexOf(effectiveTier)
  const requiredTierIndex = TIER_HIERARCHY.indexOf(minimumTier)

  if (userTierIndex < requiredTierIndex) {
    const tierConfig = TIERS[minimumTier]
    return NextResponse.json(
      {
        error: `This feature requires the ${tierConfig.name} plan or higher.`,
        code: 'TIER_REQUIRED',
        requiredTier: minimumTier,
        currentTier: effectiveTier,
      },
      { status: 403 },
    )
  }

  return null // Allowed
}

/**
 * Check tier without returning a response — just returns the boolean + tier info.
 * Useful for conditional rendering or partial access.
 */
export async function checkTierAccess(
  profileId: string,
  minimumTier: TierKey,
): Promise<{
  allowed: boolean
  currentTier: TierKey
  tierStatus: string
}> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { tier: true, tierStatus: true },
  })

  if (!profile) {
    return { allowed: false, currentTier: 'free', tierStatus: 'active' }
  }

  const effectiveTier = mapTier(profile.tier)

  if (minimumTier !== 'free') {
    if (profile.tierStatus === 'cancelled' || profile.tierStatus === 'past_due') {
      return { allowed: false, currentTier: effectiveTier, tierStatus: profile.tierStatus }
    }
  }

  const userTierIndex = TIER_HIERARCHY.indexOf(effectiveTier)
  const requiredTierIndex = TIER_HIERARCHY.indexOf(minimumTier)

  return {
    allowed: userTierIndex >= requiredTierIndex,
    currentTier: effectiveTier,
    tierStatus: profile.tierStatus,
  }
}

/**
 * Feature-to-tier mapping. Defines the minimum tier required for each feature.
 * Routes can use: `requireTier(profileId, FEATURE_TIERS.outreach)`
 */
export const FEATURE_TIERS = {
  // Free tier — accessible to everyone
  dashboard: 'free' as TierKey,
  community: 'free' as TierKey,
  askAi: 'free' as TierKey,

  // Starter tier ($149/mo)
  discovery: 'starter' as TierKey,
  crm: 'starter' as TierKey,
  deals: 'starter' as TierKey,
  contracts: 'starter' as TierKey,
  analyzeDeal: 'starter' as TierKey,

  // Pro tier ($299/mo)
  outreach: 'pro' as TierKey,
  marketplace: 'starter' as TierKey,
  aiCalling: 'pro' as TierKey,

  // Business tier ($499/mo)
  whiteLabel: 'business' as TierKey,
  apiAccess: 'business' as TierKey,
  teamManagement: 'business' as TierKey,
} as const

/** Normalize tier name — maps 'enterprise' to 'business' for backward compat */
function mapTier(tier: string): TierKey {
  if (tier === 'enterprise') return 'business'
  if (tier === 'trialing') return 'trial'
  return (TIER_HIERARCHY.includes(tier as TierKey) ? tier : 'free') as TierKey
}
