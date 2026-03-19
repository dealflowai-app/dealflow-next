import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { TIERS } from '@/lib/tiers'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const dbUser = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        tier: true,
        tierStatus: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        stripePriceId: true,
      },
    })

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const tierConfig = TIERS[dbUser.tier as keyof typeof TIERS]
    const isTrialing = dbUser.tier === 'free' && dbUser.trialEndsAt && new Date(dbUser.trialEndsAt) > new Date()
    const trialDaysLeft = isTrialing
      ? Math.ceil((new Date(dbUser.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0

    // Get current period usage
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    const usage = profile
      ? await prisma.usage.findFirst({
          where: { userId: profile.id },
          orderBy: { periodStart: 'desc' },
        })
      : null

    return NextResponse.json({
      tier: dbUser.tier,
      tierName: tierConfig?.name || 'Free Trial',
      tierStatus: dbUser.tierStatus,
      isTrialing,
      trialDaysLeft,
      currentPeriodEnd: dbUser.currentPeriodEnd,
      limits: tierConfig,
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
