import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { profile: admin, error, status } = await getAdminProfile()
  if (!admin) return NextResponse.json({ error }, { status })

  const { id } = params
  const profile = await prisma.profile.findUnique({ where: { id } })
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [usageHistory, payments, dealCount, buyerCount, contractCount] = await Promise.all([
    prisma.usage.findMany({
      where: { userId: id },
      orderBy: { periodStart: 'desc' },
      take: 6,
    }),
    prisma.paymentHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.deal.count({ where: { profileId: id } }).catch(() => 0),
    prisma.cashBuyer.count({ where: { profileId: id } }).catch(() => 0),
    prisma.contract.count({ where: { profileId: id } }).catch(() => 0),
  ])

  return NextResponse.json({
    profile,
    usageHistory,
    payments,
    stats: { deals: dealCount, buyers: buyerCount, contracts: contractCount },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { profile: admin, error, status } = await getAdminProfile()
  if (!admin) return NextResponse.json({ error }, { status })

  const { id } = params
  const body = await req.json()
  const { action, tier, role, reason } = body

  const targetUser = await prisma.profile.findUnique({ where: { id } })
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  switch (action) {
    case 'change_tier': {
      const validTiers = ['free', 'starter', 'pro', 'business', 'enterprise']
      if (!validTiers.includes(tier)) {
        return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
      }
      await prisma.profile.update({
        where: { id },
        data: { tier, tierStatus: 'active' },
      })
      return NextResponse.json({ success: true, message: `Tier changed to ${tier}` })
    }

    case 'suspend': {
      await prisma.profile.update({
        where: { id },
        data: { tierStatus: 'suspended' },
      })
      if (targetUser.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.update(targetUser.stripeSubscriptionId, {
            pause_collection: { behavior: 'mark_uncollectible' },
          })
        } catch (e) {
          console.error('Failed to pause Stripe subscription:', e)
        }
      }
      return NextResponse.json({ success: true, message: 'User suspended' })
    }

    case 'unsuspend': {
      await prisma.profile.update({
        where: { id },
        data: { tierStatus: 'active' },
      })
      if (targetUser.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.update(targetUser.stripeSubscriptionId, {
            pause_collection: '' as any,
          })
        } catch (e) {
          console.error('Failed to resume Stripe subscription:', e)
        }
      }
      return NextResponse.json({ success: true, message: 'User reactivated' })
    }

    case 'change_role': {
      if (role !== 'user' && role !== 'admin') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      await prisma.profile.update({
        where: { id },
        data: { platformRole: role },
      })
      return NextResponse.json({ success: true, message: `Role changed to ${role}` })
    }

    case 'delete': {
      if (targetUser.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(targetUser.stripeSubscriptionId)
        } catch (e) {
          console.error('Failed to cancel Stripe subscription:', e)
        }
      }
      await prisma.profile.delete({ where: { id } })
      return NextResponse.json({ success: true, message: 'Account deleted' })
    }

    case 'extend_trial': {
      const newTrialEnd = new Date()
      newTrialEnd.setDate(newTrialEnd.getDate() + 14)
      await prisma.profile.update({
        where: { id },
        data: { trialEndsAt: newTrialEnd },
      })
      return NextResponse.json({ success: true, message: 'Trial extended by 14 days' })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
