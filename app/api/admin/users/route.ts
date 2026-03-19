import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
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

  // Get current usage for each user
  const usersWithUsage = await Promise.all(
    users.map(async (u) => {
      const usage = await prisma.usage.findFirst({
        where: { userId: u.id },
        orderBy: { periodStart: 'desc' },
      })
      const totalPaid = await prisma.paymentHistory.aggregate({
        where: { userId: u.id, status: 'paid' },
        _sum: { amount: true },
      })
      return {
        ...u,
        usage,
        totalRevenue: (totalPaid._sum.amount || 0) / 100,
      }
    })
  )

  return NextResponse.json({
    users: usersWithUsage,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
