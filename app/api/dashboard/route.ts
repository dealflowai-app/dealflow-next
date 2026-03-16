import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const pid = profile.id

    const [
      activeDeals,
      closedDeals,
      buyerCount,
      campaignCalls,
      recentActivity,
    ] = await Promise.all([
      prisma.deal.count({ where: { profileId: pid, status: 'ACTIVE' } }),
      prisma.deal.count({ where: { profileId: pid, status: 'CLOSED' } }),
      prisma.cashBuyer.count({ where: { profileId: pid, isOptedOut: false } }),
      prisma.campaign.aggregate({
        where: { profileId: pid },
        _sum: { callsCompleted: true },
      }),
      prisma.activityEvent.findMany({
        where: { profileId: pid },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, type: true, title: true, createdAt: true },
      }),
    ])

    return NextResponse.json({
      kpis: {
        activeDeals,
        closedDeals,
        buyerCount,
        aiCalls: campaignCalls._sum.callsCompleted || 0,
      },
      recentActivity,
    })
  } catch (err) {
    console.error('GET /api/dashboard error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
