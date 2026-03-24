import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { Validator, sanitizeString, sanitizeHtml } from '@/lib/validation'
import { parseBody } from '@/lib/api-utils'
import { apiHandler } from '@/lib/api-handler'

// ─── GET /api/marketplace/buyer-board ────────────────────────────────────────
// Browse active buyer board posts with filters.

export const GET = apiHandler({ route: 'GET /api/marketplace/buyer-board' }, async (req) => {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const url = new URL(req.url)
  const market = url.searchParams.get('market') || ''
  const propertyType = url.searchParams.get('propertyType') || ''
  const minBudget = parseInt(url.searchParams.get('minBudget') || '0') || 0
  const maxBudget = parseInt(url.searchParams.get('maxBudget') || '0') || 0
  const strategy = url.searchParams.get('strategy') || ''
  const proofOfFunds = url.searchParams.get('proofOfFunds') === 'true'
  const myPosts = url.searchParams.get('myPosts') === 'true'
  const sort = url.searchParams.get('sort') || 'newest'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20') || 20, 50)
  const offset = parseInt(url.searchParams.get('offset') || '0') || 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}

  if (myPosts) {
    where.profileId = profile.id
    // Show all statuses for own posts
  } else {
    where.status = 'ACTIVE'
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ]
  }

  if (market) {
    where.markets = { hasSome: [market] }
    // Also do a broader search across the array
    if (!where.OR || myPosts) {
      // For text search across markets array, use raw filtering after fetch
      // Prisma String[] doesn't support "contains" on array elements directly
      // We'll filter in-memory for market text search
    }
  }

  if (propertyType) {
    where.propertyTypes = { hasSome: [propertyType] }
  }

  if (minBudget > 0) {
    where.maxPrice = { gte: minBudget }
  }

  if (maxBudget > 0) {
    where.minPrice = { ...(where.minPrice || {}), lte: maxBudget }
  }

  if (strategy) {
    where.strategy = strategy
  }

  if (proofOfFunds) {
    where.proofOfFunds = true
  }

  let orderBy: Record<string, string>
  switch (sort) {
    case 'budget_desc':
      orderBy = { maxPrice: 'desc' }
      break
    case 'fastest_close':
      orderBy = { closeSpeedDays: 'asc' }
      break
    default:
      orderBy = { createdAt: 'desc' }
  }

  const [posts, total] = await Promise.all([
    prisma.buyerBoardPost.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      select: {
        id: true,
        displayName: true,
        buyerType: true,
        propertyTypes: true,
        markets: true,
        strategy: true,
        minPrice: true,
        maxPrice: true,
        closeSpeedDays: true,
        proofOfFunds: true,
        description: true,
        status: true,
        viewCount: true,
        contactCount: true,
        createdAt: true,
        expiresAt: true,
        profileId: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
            sellerVerification: true,
            reputationScore: true,
            reviewCount: true,
          },
        },
        _count: { select: { contacts: true } },
      },
    }),
    prisma.buyerBoardPost.count({ where }),
  ])

  // If market is a text search (not exact match), filter in-memory
  let filtered = posts
  if (market && !propertyType && posts.length > 0) {
    const q = market.toLowerCase()
    filtered = posts.filter(p =>
      p.markets.some(m => m.toLowerCase().includes(q)),
    )
  }

  // Transform: add lastInitial, hide profileId for non-owners
  const transformed = filtered.map(p => ({
    ...p,
    profile: {
      firstName: p.profile.firstName,
      lastInitial: p.profile.lastName?.[0] || null,
      company: p.profile.company,
      verified: p.profile.sellerVerification === 'VERIFIED',
      reputationScore: p.profile.reputationScore,
      reviewCount: p.profile.reviewCount,
    },
    isOwner: p.profileId === profile.id,
    profileId: undefined,
  }))

  return NextResponse.json({ posts: transformed, total })
})

// ─── POST /api/marketplace/buyer-board ───────────────────────────────────────
// Create a new buyer board post.

export const POST = apiHandler({ route: 'POST /api/marketplace/buyer-board' }, async (req) => {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const { body, error: parseError } = await parseBody(req)
  if (!body) return NextResponse.json({ error: parseError }, { status: 400 })

  const {
    displayName,
    buyerType,
    propertyTypes,
    markets,
    strategy,
    minPrice,
    maxPrice,
    closeSpeedDays,
    proofOfFunds,
    description,
    buyerId,
  } = body as {
    displayName?: string
    buyerType?: string
    propertyTypes?: string[]
    markets?: string[]
    strategy?: string
    minPrice?: number
    maxPrice?: number
    closeSpeedDays?: number
    proofOfFunds?: boolean
    description?: string
    buyerId?: string
  }

  // ── Validate inputs ──
  const VALID_PROPERTY_TYPES = ['SFR', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'MOBILE_HOME', 'CONDO']
  const VALID_STRATEGIES = ['fix_and_flip', 'buy_and_hold', 'wholesale', 'novation', 'subject_to', 'creative_finance']
  const VALID_BUYER_TYPES = ['individual', 'llc', 'trust', 'partnership', 'corporation']

  const v = new Validator()
  v.require('displayName', displayName, 'Display name')
  v.string('displayName', displayName, { maxLength: 100, label: 'Display name' })
  v.require('markets', markets, 'Markets')
  v.array('markets', markets, { maxItems: 10, label: 'Markets' })
  v.require('propertyTypes', propertyTypes, 'Property types')
  if (propertyTypes) {
    for (const pt of propertyTypes) {
      v.enumValue('propertyTypes', pt, VALID_PROPERTY_TYPES, 'Property type')
    }
  }
  if (buyerType !== undefined) v.enumValue('buyerType', buyerType, VALID_BUYER_TYPES, 'Buyer type')
  if (strategy !== undefined) v.enumValue('strategy', strategy, VALID_STRATEGIES, 'Strategy')
  if (minPrice !== undefined) v.positiveInt('minPrice', minPrice, 'Min price')
  if (maxPrice !== undefined) v.positiveInt('maxPrice', maxPrice, 'Max price')
  if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
    v.custom('price', false, 'Min price cannot exceed max price')
  }
  if (closeSpeedDays !== undefined) v.intRange('closeSpeedDays', closeSpeedDays, 1, 365, 'Close speed days')
  if (description !== undefined) v.string('description', description, { maxLength: 2000, label: 'Description' })
  if (!v.isValid()) return v.toResponse()

  // Validate buyerId belongs to this profile
  if (buyerId) {
    const buyer = await prisma.cashBuyer.findFirst({
      where: { id: buyerId, profileId: profile.id },
    })
    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found in your CRM' }, { status: 400 })
    }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const post = await prisma.buyerBoardPost.create({
    data: {
      profileId: profile.id,
      displayName: sanitizeString(displayName!),
      buyerType: buyerType || null,
      propertyTypes,
      markets,
      strategy: strategy || null,
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      closeSpeedDays: closeSpeedDays || null,
      proofOfFunds: proofOfFunds ?? false,
      description: description ? sanitizeHtml(description) : null,
      buyerId: buyerId || null,
      expiresAt,
    },
  })

  return NextResponse.json({ post }, { status: 201 })
})
