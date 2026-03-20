import { prisma } from '@/lib/prisma'
import { PLAN_ALLOWANCES, OVERAGE_RATES } from '@/lib/tiers'
import { stripe } from '@/lib/stripe'

// ── Types ────────────────────────────────────────────────────────────────────

export type Resource = 'reveals' | 'callMinutes' | 'sms' | 'analyses'

export interface AllowanceCheck {
  allowed: boolean
  used: number
  limit: number
  remaining: number
  canOverage: boolean
}

export interface UsageRecord {
  used: number
  limit: number
  remaining: number
  isOverage: boolean
}

// ── Field mapping ────────────────────────────────────────────────────────────

const FIELD_MAP = {
  reveals:     { used: 'revealsUsed',      limit: 'revealsAllowed',     overage: 'revealsOverage' },
  callMinutes: { used: 'callMinutesUsed',  limit: 'callMinutesAllowed', overage: 'callMinutesOverage' },
  sms:         { used: 'smsUsed',          limit: 'smsAllowed',         overage: 'smsOverage' },
  analyses:    { used: 'analysesUsed',     limit: 'analysesAllowed',    overage: null },
} as const

// ── Get current allowance record ─────────────────────────────────────────────

export async function getCurrentAllowance(profileId: string) {
  const now = new Date()

  // Find current period's allowance
  let allowance = await prisma.usageAllowance.findFirst({
    where: {
      profileId,
      periodStart: { lte: now },
      periodEnd: { gt: now },
    },
  })

  // If none exists, create one for the current month
  if (!allowance) {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const tier = await getUserTier(profileId)
    const limits = PLAN_ALLOWANCES[tier] ?? PLAN_ALLOWANCES.free

    allowance = await prisma.usageAllowance.upsert({
      where: {
        profileId_periodStart: { profileId, periodStart },
      },
      update: {},
      create: {
        profileId,
        periodStart,
        periodEnd,
        revealsAllowed: limits.reveals,
        callMinutesAllowed: limits.callMinutes,
        smsAllowed: limits.sms,
        analysesAllowed: limits.analyses,
      },
    })
  }

  return allowance
}

// ── Check if user can consume a resource ─────────────────────────────────────

export async function checkAllowance(
  profileId: string,
  resource: Resource,
  amount: number = 1,
): Promise<AllowanceCheck> {
  const allowance = await getCurrentAllowance(profileId)

  const fields = FIELD_MAP[resource]
  const used = allowance[fields.used as keyof typeof allowance] as number
  const limit = allowance[fields.limit as keyof typeof allowance] as number

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, used, limit: -1, remaining: -1, canOverage: false }
  }

  const remaining = Math.max(0, limit - used)
  const withinAllowance = used + amount <= limit

  // Paid plan users can go over (billed as overage); trial/free cannot
  const tier = await getUserTier(profileId)
  const canOverage = ['starter', 'pro', 'business'].includes(tier)

  return {
    allowed: withinAllowance || canOverage,
    used,
    limit,
    remaining,
    canOverage: !withinAllowance && canOverage,
  }
}

// ── Record usage of a resource ───────────────────────────────────────────────

export async function recordUsage(
  profileId: string,
  resource: Resource,
  amount: number = 1,
  estimatedCost: number = 0,
): Promise<UsageRecord> {
  const allowance = await getCurrentAllowance(profileId)

  const fields = FIELD_MAP[resource]
  const currentUsed = allowance[fields.used as keyof typeof allowance] as number
  const limit = allowance[fields.limit as keyof typeof allowance] as number
  const newUsed = currentUsed + amount
  const isOverage = limit !== -1 && newUsed > limit
  const overageAmount = isOverage ? Math.max(0, newUsed - limit) : 0

  // Build update data
  const updateData: Record<string, unknown> = {
    [fields.used]: newUsed,
    estimatedCost: { increment: estimatedCost },
  }

  if (isOverage && fields.overage) {
    updateData[fields.overage] = overageAmount
  }

  await prisma.usageAllowance.update({
    where: { id: allowance.id },
    data: updateData,
  })

  // If overage, report to Stripe for billing
  if (isOverage && overageAmount > 0 && fields.overage) {
    reportOverageToStripe(profileId, resource, amount).catch(err => {
      console.error('Failed to report overage to Stripe:', err)
    })
  }

  return {
    used: newUsed,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - newUsed),
    isOverage,
  }
}

// ── Create allowance for a new billing period ────────────────────────────────

export async function createAllowanceForPeriod(
  profileId: string,
  tier: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const limits = PLAN_ALLOWANCES[tier] ?? PLAN_ALLOWANCES.free

  return prisma.usageAllowance.upsert({
    where: {
      profileId_periodStart: { profileId, periodStart },
    },
    update: {
      periodEnd,
      revealsAllowed: limits.reveals,
      callMinutesAllowed: limits.callMinutes,
      smsAllowed: limits.sms,
      analysesAllowed: limits.analyses,
    },
    create: {
      profileId,
      periodStart,
      periodEnd,
      revealsAllowed: limits.reveals,
      callMinutesAllowed: limits.callMinutes,
      smsAllowed: limits.sms,
      analysesAllowed: limits.analyses,
    },
  })
}

// ── Report overage to Stripe ─────────────────────────────────────────────────

async function reportOverageToStripe(profileId: string, resource: Resource, quantity: number) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { stripeSubscriptionId: true, tier: true },
  })

  if (!profile?.stripeSubscriptionId) return

  // Only report overages for resources that have overage rates
  if (resource === 'analyses') return

  try {
    // Look up the Stripe customer from the subscription
    const subscription = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId)
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

    // Add overage as a pending invoice item on the customer's next invoice
    const tier = profile.tier === 'enterprise' ? 'business' : profile.tier
    const rates = OVERAGE_RATES[tier]
    const unitRate = rates?.[resource as keyof typeof rates] ?? 0
    const amount = Math.round(unitRate * quantity * 100) // cents
    if (amount > 0) {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount,
        currency: 'usd',
        description: `Overage: ${quantity} ${resource} @ $${unitRate}/${resource === 'callMinutes' ? 'min' : 'ea'}`,
        subscription: profile.stripeSubscriptionId,
      })
    }
  } catch (err) {
    console.error(`Stripe overage report failed for ${resource}:`, err)
  }
}

// ── Get user tier ────────────────────────────────────────────────────────────

async function getUserTier(profileId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { tier: true, tierStatus: true },
  })

  if (!profile) return 'free'

  // Map 'enterprise' to 'business' for backward compat
  const tier = profile.tier === 'enterprise' ? 'business' : profile.tier
  const status = profile.tierStatus

  // Trialing users get trial allowances
  if (status === 'trialing') return 'trial'

  return tier || 'free'
}
