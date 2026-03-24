import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1)
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '20') || 20), 100)
  const search = url.searchParams.get('search') || ''
  const tierFilter = url.searchParams.get('tier') || ''
  const statusFilter = url.searchParams.get('status') || ''
  const sortBy = url.searchParams.get('sort') || 'createdAt'
  const sortOrder = (url.searchParams.get('order') || 'desc') as 'asc' | 'desc'

  const allowedSortFields = ['createdAt', 'updatedAt', 'email', 'firstName', 'tier']
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'

  const where: any = {}

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (tierFilter) where.tier = tierFilter
  if (statusFilter) where.tierStatus = statusFilter

  const [users, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { [safeSortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        tier: true,
        tierStatus: true,
        platformRole: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        stripeCustomerId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.profile.count({ where }),
  ])

  // Batch-fetch usage and revenue for all users (avoids N+1)
  const userIds = users.map((u) => u.id)

  const [allUsage, allRevenue] = await Promise.all([
    // Get most recent usage for each user
    prisma.usage.findMany({
      where: { userId: { in: userIds } },
      orderBy: { periodStart: 'desc' },
      distinct: ['userId'],
    }),
    // Get total revenue per user in one query
    prisma.paymentHistory.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, status: 'paid' },
      _sum: { amount: true },
    }),
  ])

  const usageMap = new Map(allUsage.map((u) => [u.userId, u]))
  const revenueMap = new Map(allRevenue.map((r) => [r.userId, (r._sum.amount || 0) / 100]))

  const usersWithUsage = users.map((u) => ({
    ...u,
    usage: usageMap.get(u.id) || null,
    totalRevenue: revenueMap.get(u.id) || 0,
  }))

  return NextResponse.json({
    users: usersWithUsage,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
