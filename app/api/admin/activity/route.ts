import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const [recentSignups, recentPayments, recentTierChanges] = await Promise.all([
    prisma.profile.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    }),
    prisma.paymentHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.profile.findMany({
      where: {
        tier: { not: 'free' },
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        tier: true,
        updatedAt: true,
      },
    }),
  ])

  const activities: Array<{
    type: string
    description: string
    email?: string
    timestamp: Date
    status?: string
  }> = []

  for (const s of recentSignups) {
    const name = `${s.firstName || ''} ${s.lastName || ''}`.trim()
    activities.push({
      type: 'signup',
      description: name ? `${name} signed up` : `${s.email} signed up`,
      email: s.email,
      timestamp: s.createdAt,
    })
  }

  for (const p of recentPayments) {
    const name = p.user
      ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() || p.user.email
      : 'Unknown'
    activities.push({
      type: p.status === 'paid' ? 'payment' : 'payment_failed',
      description:
        p.status === 'paid'
          ? `${name} paid $${(p.amount / 100).toFixed(2)}`
          : `Payment failed for ${name}`,
      timestamp: p.createdAt,
      status: p.status,
    })
  }

  for (const t of recentTierChanges) {
    const name = `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.email || 'Unknown'
    activities.push({
      type: 'tier_change',
      description: `${name} upgraded to ${t.tier}`,
      timestamp: t.updatedAt,
    })
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({ activities: activities.slice(0, 20) })
}
