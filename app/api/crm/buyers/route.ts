import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { logActivity } from '@/lib/activity'
import { updateCrmContacts, checkLimit } from '@/lib/usage'

export async function GET(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const params = req.nextUrl.searchParams
    const page = Math.max(1, parseInt(params.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25')))
    const search = params.get('search') || ''
    const statusFilter = params.get('status') || ''
    const market = params.get('market') || ''
    const scoreMin = params.get('scoreMin') ? parseInt(params.get('scoreMin')!) : undefined
    const type = params.get('type') || ''
    const strategy = params.get('strategy') || ''
    const tag = params.get('tag') || ''
    const motivationParam = params.get('motivation') || ''
    const sortBy = params.get('sortBy') || 'createdAt'
    const sortOrder = (params.get('sortOrder') || 'desc') as 'asc' | 'desc'

    const contactTypeParam = params.get('contactType') || ''
    const archived = params.get('archived') === 'true'
    const cursor = params.get('cursor') || ''

    const where: Prisma.CashBuyerWhereInput = {
      profileId: profile.id,
      isOptedOut: archived,
    }

    if (contactTypeParam && ['BUYER', 'SELLER', 'BOTH'].includes(contactTypeParam)) {
      where.contactType = contactTypeParam as 'BUYER' | 'SELLER' | 'BOTH'
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { entityName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (statusFilter) {
      where.status = statusFilter as Prisma.EnumBuyerStatusFilter['equals']
    }

    if (market) {
      where.preferredMarkets = { has: market }
    }

    if (scoreMin !== undefined) {
      where.buyerScore = { gte: scoreMin }
    }

    if (type) {
      where.primaryPropertyType = type as Prisma.EnumPropertyTypeNullableFilter['equals']
    }

    if (strategy) {
      where.strategy = strategy as Prisma.EnumInvestorStrategyNullableFilter['equals']
    }

    if (tag) {
      where.tags = {
        some: { tag: { name: tag } },
      }
    }

    if (motivationParam) {
      where.motivation = motivationParam as Prisma.EnumBuyerMotivationNullableFilter['equals']
    }

    const allowedSortFields = [
      'createdAt', 'updatedAt', 'buyerScore', 'lastContactedAt',
      'firstName', 'entityName', 'cashPurchaseCount',
    ]
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'

    const [buyers, total, statusCounts] = await Promise.all([
      prisma.cashBuyer.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          entityName: true,
          phone: true,
          email: true,
          status: true,
          buyerScore: true,
          primaryPropertyType: true,
          strategy: true,
          motivation: true,
          buyerType: true,
          preferredMarkets: true,
          minPrice: true,
          maxPrice: true,
          closeSpeedDays: true,
          proofOfFundsVerified: true,
          cashPurchaseCount: true,
          lastContactedAt: true,
          followUpDate: true,
          source: true,
          contactType: true,
          sellerMotivation: true,
          sellerAskingPrice: true,
          sellerPropertyId: true,
          sellerTimeline: true,
          alertsEnabled: true,
          alertFrequency: true,
          createdAt: true,
          updatedAt: true,
          tags: {
            select: {
              autoApplied: true,
              tag: { select: { id: true, name: true, label: true, color: true, type: true } },
            },
          },
          _count: { select: { dealMatches: true, offers: true } },
        },
        orderBy: { [orderField]: sortOrder },
        ...(cursor
          ? { skip: 1, cursor: { id: cursor }, take: limit }
          : { skip: (page - 1) * limit, take: limit }),
      }),
      prisma.cashBuyer.count({ where }),
      prisma.cashBuyer.groupBy({
        by: ['status'],
        where: { profileId: profile.id, isOptedOut: archived },
        _count: true,
      }),
    ])

    const stats = statusCounts.reduce(
      (acc, row) => {
        acc[row.status] = row._count
        return acc
      },
      {} as Record<string, number>,
    )

    const nextCursor = buyers.length === limit ? buyers[buyers.length - 1].id : null
    return NextResponse.json({
      buyers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), nextCursor },
      stats,
    })
  } catch (err) {
    console.error('GET /api/crm/buyers error:', err)
    return NextResponse.json({ error: 'Failed to fetch buyers', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.firstName && !body.entityName) {
      return NextResponse.json(
        { error: 'Either firstName or entityName is required' },
        { status: 400 },
      )
    }

    // Check CRM contact limit
    const limitResult = await checkLimit(profile.id, 'crmContact')
    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: limitResult.reason, upgrade: true },
        { status: 403 },
      )
    }

    if (body.phone) {
      const existing = await prisma.cashBuyer.findFirst({
        where: { profileId: profile.id, phone: body.phone as string | undefined, isOptedOut: false },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'A buyer with this phone number already exists', existingId: existing.id },
          { status: 409 },
        )
      }
    }

    const contactEnriched = !!(body.phone && body.email)

    // Validate contactType if provided
    const validContactTypes = ['BUYER', 'SELLER', 'BOTH']
    const contactType = body.contactType && validContactTypes.includes(body.contactType as string)
      ? body.contactType as string
      : 'BUYER'

    const createData = {
      profileId: profile.id,
      firstName: body.firstName || null,
      lastName: body.lastName || null,
      entityName: body.entityName || null,
      entityType: body.entityType || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      primaryPropertyType: body.primaryPropertyType || null,
      strategy: body.strategy || null,
      preferredMarkets: body.preferredMarkets || [],
      preferredTypes: body.preferredTypes || [],
      minPrice: body.minPrice ?? null,
      maxPrice: body.maxPrice ?? null,
      notes: body.notes || null,
      buyerScore: body.buyerScore ?? 0,
      motivation: body.motivation || null,
      buyerType: body.buyerType || null,
      fundingSource: body.fundingSource || null,
      conditionPreference: body.conditionPreference || null,
      communicationPref: body.communicationPref || null,
      preferredZips: body.preferredZips || [],
      portfolioSize: body.portfolioSize ?? null,
      avgPurchasePrice: body.avgPurchasePrice ?? null,
      followUpDate: body.followUpDate ? new Date(body.followUpDate as string) : null,
      source: body.source || null,
      assignedTo: body.assignedTo || null,
      contactEnriched,
      enrichedAt: contactEnriched ? new Date() : null,
      // Contact type and seller fields
      contactType,
      sellerMotivation: body.sellerMotivation || null,
      sellerAskingPrice: body.sellerAskingPrice != null ? Number(body.sellerAskingPrice) : null,
      sellerPropertyId: body.sellerPropertyId || null,
      sellerTimeline: body.sellerTimeline || null,
      sellerNotes: body.sellerNotes || null,
    }

    const buyer = await prisma.cashBuyer.create({
      data: createData as never,
    })

    logActivity({
      buyerId: buyer.id,
      profileId: profile.id,
      type: 'created',
      title: `${contactType === 'SELLER' ? 'Seller' : contactType === 'BOTH' ? 'Contact' : 'Buyer'} ${buyer.firstName || buyer.entityName || ''} created`,
    })

    // Update CRM contact count for billing
    try {
      await updateCrmContacts(profile.id)
    } catch (err) {
      console.error('Usage tracking failed for CRM contacts:', err)
    }

    return NextResponse.json({ buyer }, { status: 201 })
  } catch (err) {
    console.error('POST /api/crm/buyers error:', err)
    return NextResponse.json({ error: 'Failed to create buyer', detail: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
