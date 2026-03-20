import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { TIERS } from '@/lib/tiers'
import { getCurrentAllowance } from '@/lib/billing/allowances'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        tier: true,
        tierStatus: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        stripePriceId: true,
      },
    })

    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Map 'enterprise' to 'business' for backward compat
    const effectiveTier = profile.tier === 'enterprise' ? 'business' : profile.tier
    const tierConfig = TIERS[effectiveTier as keyof typeof TIERS] ?? TIERS.free
    const isTrialing = profile.tierStatus === 'trialing' && profile.trialEndsAt && new Date(profile.trialEndsAt) > new Date()
    const trialDaysLeft = isTrialing
      ? Math.ceil((new Date(profile.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0

    // Get current allowance
    const allowance = await getCurrentAllowance(profile.id)

    // Legacy usage (for backward compat with any remaining consumers)
    const usage = await prisma.usage.findFirst({
      where: { userId: profile.id },
      orderBy: { periodStart: 'desc' },
    })

    return NextResponse.json({
      tier: effectiveTier,
      tierName: tierConfig.name,
      tierStatus: profile.tierStatus,
      isTrialing,
      trialDaysLeft,
      currentPeriodEnd: profile.currentPeriodEnd,
      limits: tierConfig,
      // New allowance-based usage
      allowance: {
        reveals: { used: allowance.revealsUsed, limit: allowance.revealsAllowed },
        callMinutes: { used: allowance.callMinutesUsed, limit: allowance.callMinutesAllowed },
        sms: { used: allowance.smsUsed, limit: allowance.smsAllowed },
        analyses: { used: allowance.analysesUsed, limit: allowance.analysesAllowed },
        overages: {
          reveals: allowance.revealsOverage,
          callMinutes: allowance.callMinutesOverage,
          sms: allowance.smsOverage,
        },
        estimatedCost: allowance.estimatedCost,
        period: {
          start: allowance.periodStart.toISOString(),
          end: allowance.periodEnd.toISOString(),
        },
      },
      // Legacy usage (kept for backward compat)
      usage: usage ? {
        aiCallMinutes: usage.aiCallMinutes,
        smsCount: usage.smsCount,
        skipTraces: usage.skipTraces,
        dealsAnalyzed: usage.dealsAnalyzed,
        dealsClosed: usage.dealsClosed,
        activeDeals: usage.activeDeals,
        crmContacts: usage.crmContacts,
      } : null,
    })
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}
