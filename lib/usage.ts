import { prisma } from '@/lib/prisma'
import { TIERS, USAGE_RATES, TierKey } from '@/lib/tiers'

// ── Get or create the current usage record for a user ────────────────────────

async function getCurrentUsage(profileId: string) {
  let usage = await prisma.usage.findFirst({
    where: { userId: profileId },
    orderBy: { periodStart: 'desc' },
  })

  if (!usage || new Date() > usage.periodEnd) {
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + 30)

    usage = await prisma.usage.create({
      data: {
        userId: profileId,
        periodStart: now,
        periodEnd,
      },
    })
  }

  return usage
}

// ── Get user's tier config ───────────────────────────────────────────────────

async function getUserTier(profileId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { tier: true },
  })
  return TIERS[(profile?.tier || 'free') as TierKey]
}

// ── Track AI call minutes ────────────────────────────────────────────────────

export async function trackAiCallMinutes(profileId: string, minutes: number) {
  const usage = await getCurrentUsage(profileId)
  await prisma.usage.update({
    where: { id: usage.id },
    data: { aiCallMinutes: { increment: minutes } },
  })
  return usage.aiCallMinutes + minutes
}

// ── Track SMS sent ───────────────────────────────────────────────────────────

export async function trackSms(profileId: string, count: number = 1) {
  const usage = await getCurrentUsage(profileId)
  await prisma.usage.update({
    where: { id: usage.id },
    data: { smsCount: { increment: count } },
  })
  return usage.smsCount + count
}

// ── Track skip trace reveal ──────────────────────────────────────────────────

export async function trackSkipTrace(profileId: string, count: number = 1) {
  const usage = await getCurrentUsage(profileId)
  await prisma.usage.update({
    where: { id: usage.id },
    data: { skipTraces: { increment: count } },
  })
  return usage.skipTraces + count
}

// ── Track deal analysis ──────────────────────────────────────────────────────

export async function trackDealAnalysis(profileId: string) {
  const usage = await getCurrentUsage(profileId)
  const tier = await getUserTier(profileId)

  if (tier.dealsAnalyzed !== Infinity && usage.dealsAnalyzed >= tier.dealsAnalyzed) {
    return { allowed: false, current: usage.dealsAnalyzed, limit: tier.dealsAnalyzed }
  }

  await prisma.usage.update({
    where: { id: usage.id },
    data: { dealsAnalyzed: { increment: 1 } },
  })
  return { allowed: true, current: usage.dealsAnalyzed + 1, limit: tier.dealsAnalyzed }
}

// ── Track deal closed (triggers per-deal fee) ────────────────────────────────

export async function trackDealClosed(profileId: string) {
  const usage = await getCurrentUsage(profileId)
  await prisma.usage.update({
    where: { id: usage.id },
    data: { dealsClosed: { increment: 1 } },
  })
  return usage.dealsClosed + 1
}

// ── Update active deals count (snapshot) ─────────────────────────────────────

export async function updateActiveDeals(profileId: string) {
  const usage = await getCurrentUsage(profileId)
  const activeCount = await prisma.deal.count({
    where: {
      profileId,
      status: { in: ['ACTIVE', 'UNDER_OFFER'] },
    },
  })
  await prisma.usage.update({
    where: { id: usage.id },
    data: { activeDeals: activeCount },
  })
  return activeCount
}

// ── Update CRM contact count (snapshot) ──────────────────────────────────────

export async function updateCrmContacts(profileId: string) {
  const usage = await getCurrentUsage(profileId)
  const contactCount = await prisma.cashBuyer.count({
    where: { profileId },
  })
  await prisma.usage.update({
    where: { id: usage.id },
    data: { crmContacts: contactCount },
  })
  return contactCount
}

// ── Check if a user can perform an action based on tier limits ───────────────

export async function checkLimit(
  profileId: string,
  action: 'crmContact' | 'dealAnalysis' | 'activeDeal' | 'sms' | 'abTest' | 'whiteLabel' | 'api'
) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { tier: true, tierStatus: true },
  })

  if (!profile) return { allowed: false, reason: 'User not found' }
  if (profile.tierStatus === 'cancelled') return { allowed: false, reason: 'Subscription cancelled. Please resubscribe.' }
  if (profile.tierStatus === 'past_due') return { allowed: false, reason: 'Payment past due. Please update your payment method.' }

  const tier = TIERS[(profile.tier || 'free') as TierKey]
  const usage = await getCurrentUsage(profileId)

  switch (action) {
    case 'crmContact':
      if (tier.crmContacts !== Infinity && usage.crmContacts >= tier.crmContacts)
        return { allowed: false, reason: `Contact limit reached (${tier.crmContacts}). Upgrade for more.` }
      return { allowed: true }

    case 'dealAnalysis':
      if (tier.dealsAnalyzed !== Infinity && usage.dealsAnalyzed >= tier.dealsAnalyzed)
        return { allowed: false, reason: `Analysis limit reached (${tier.dealsAnalyzed}/mo). Upgrade for more.` }
      return { allowed: true }

    case 'activeDeal':
      if (tier.activeDeals !== Infinity && usage.activeDeals >= tier.activeDeals)
        return { allowed: false, reason: `Active deal limit reached (${tier.activeDeals}). Close or archive a deal to add more.` }
      return { allowed: true }

    case 'sms':
      if (!tier.sms)
        return { allowed: false, reason: 'SMS campaigns require the Pro plan or higher.' }
      return { allowed: true }

    case 'abTest':
      if (!tier.abTesting)
        return { allowed: false, reason: 'A/B testing requires the Pro plan or higher.' }
      return { allowed: true }

    case 'whiteLabel':
      if (!tier.whiteLabel)
        return { allowed: false, reason: 'White-label requires the Enterprise plan.' }
      return { allowed: true }

    case 'api':
      if (!tier.apiAccess)
        return { allowed: false, reason: 'API access requires the Enterprise plan.' }
      return { allowed: true }

    default:
      return { allowed: true }
  }
}

// ── Calculate estimated usage charges for the current period ─────────────────

export async function getUsageCharges(profileId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { tier: true },
  })
  const tier = TIERS[(profile?.tier || 'free') as TierKey]
  const usage = await getCurrentUsage(profileId)

  const freeMinutes = tier.freeAiMinutes || 0
  const overageMinutes = Math.max(0, usage.aiCallMinutes - freeMinutes)

  const charges = {
    aiCalls: Math.round(overageMinutes * USAGE_RATES.aiCallPerMinute * 100) / 100,
    sms: Math.round(usage.smsCount * USAGE_RATES.smsPerMessage * 100) / 100,
    skipTraces: Math.round(usage.skipTraces * USAGE_RATES.skipTracePerReveal * 100) / 100,
    dealsClosed: usage.dealsClosed * USAGE_RATES.dealClosedFee,
  }

  return {
    ...charges,
    total: charges.aiCalls + charges.sms + charges.skipTraces + charges.dealsClosed,
  }
}
