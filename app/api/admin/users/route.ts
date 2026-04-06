import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'

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

  // ── Fetch Supabase Auth users (source of truth for signups) ──
  let authUsers: Array<{
    id: string
    email: string | undefined
    created_at: string
    email_confirmed_at: string | null
    last_sign_in_at: string | null
    user_metadata: Record<string, any>
    app_metadata: Record<string, any>
  }> = []

  try {
    const supabaseAdmin = createAdminClient()
    // Fetch all auth users (paginated by Supabase in batches of 1000)
    const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (!authError && data?.users) {
      authUsers = data.users
    }
  } catch {
    // Service role key may not be set — fall back to profiles only
    console.warn('[Admin Users] Could not fetch Supabase auth users — SUPABASE_SERVICE_ROLE_KEY may be missing')
  }

  // ── Fetch all profiles from Prisma ──
  const allProfiles = await prisma.profile.findMany({
    select: {
      id: true,
      userId: true,
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
  })

  const profilesByUserId = new Map(allProfiles.map((p) => [p.userId, p]))

  // ── Merge: auth users as the base, profiles layered on ──
  type MergedUser = {
    id: string
    userId: string
    email: string
    firstName: string | null
    lastName: string | null
    phone: string | null
    tier: string
    tierStatus: string
    platformRole: string
    trialEndsAt: string | null
    currentPeriodEnd: string | null
    stripeCustomerId: string | null
    createdAt: string
    updatedAt: string
    emailVerified: boolean
    lastSignIn: string | null
    provider: string
    hasProfile: boolean
  }

  let merged: MergedUser[] = []

  if (authUsers.length > 0) {
    // Build from auth users — this captures everyone who signed up
    merged = authUsers.map((au) => {
      const p = profilesByUserId.get(au.id)
      return {
        id: p?.id || au.id,
        userId: au.id,
        email: p?.email || au.email || '',
        firstName: p?.firstName || au.user_metadata?.firstName || au.user_metadata?.full_name?.split(' ')[0] || null,
        lastName: p?.lastName || au.user_metadata?.lastName || au.user_metadata?.full_name?.split(' ').slice(1).join(' ') || null,
        phone: p?.phone || null,
        tier: p?.tier || 'free',
        tierStatus: p?.tierStatus || (au.email_confirmed_at ? 'active' : 'pending'),
        platformRole: p?.platformRole || 'user',
        trialEndsAt: p?.trialEndsAt?.toISOString() || null,
        currentPeriodEnd: p?.currentPeriodEnd?.toISOString() || null,
        stripeCustomerId: p?.stripeCustomerId || null,
        createdAt: p?.createdAt?.toISOString() || au.created_at,
        updatedAt: p?.updatedAt?.toISOString() || au.created_at,
        emailVerified: !!au.email_confirmed_at,
        lastSignIn: au.last_sign_in_at || null,
        provider: au.app_metadata?.provider || 'email',
        hasProfile: !!p,
      }
    })
  } else {
    // Fallback: no auth users available, use profiles only
    merged = allProfiles.map((p) => ({
      id: p.id,
      userId: p.userId,
      email: p.email,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      tier: p.tier,
      tierStatus: p.tierStatus,
      platformRole: p.platformRole,
      trialEndsAt: p.trialEndsAt?.toISOString() || null,
      currentPeriodEnd: p.currentPeriodEnd?.toISOString() || null,
      stripeCustomerId: p.stripeCustomerId,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      emailVerified: true,
      lastSignIn: null,
      provider: 'email',
      hasProfile: true,
    }))
  }

  // ── Apply filters ──
  if (search) {
    const q = search.toLowerCase()
    merged = merged.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.lastName && u.lastName.toLowerCase().includes(q))
    )
  }

  if (tierFilter) merged = merged.filter((u) => u.tier === tierFilter)
  if (statusFilter) merged = merged.filter((u) => u.tierStatus === statusFilter)

  // ── Sort ──
  merged.sort((a, b) => {
    const aVal = (a as any)[safeSortBy] || ''
    const bVal = (b as any)[safeSortBy] || ''
    const cmp = String(aVal).localeCompare(String(bVal))
    return sortOrder === 'desc' ? -cmp : cmp
  })

  // ── Paginate ──
  const total = merged.length
  const paginated = merged.slice((page - 1) * limit, page * limit)

  // ── Batch-fetch usage and revenue ──
  const profileIds = paginated.filter((u) => u.hasProfile).map((u) => u.id)

  const [allUsage, allRevenue] = await Promise.all([
    profileIds.length > 0
      ? prisma.usage.findMany({
          where: { userId: { in: profileIds } },
          orderBy: { periodStart: 'desc' },
          distinct: ['userId'],
        })
      : [],
    profileIds.length > 0
      ? prisma.paymentHistory.groupBy({
          by: ['userId'],
          where: { userId: { in: profileIds }, status: 'paid' },
          _sum: { amount: true },
        })
      : [],
  ])

  const usageMap = new Map(allUsage.map((u) => [u.userId, u]))
  const revenueMap = new Map(allRevenue.map((r) => [r.userId, (r._sum.amount || 0) / 100]))

  const usersWithUsage = paginated.map((u) => ({
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
