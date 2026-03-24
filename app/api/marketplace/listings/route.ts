import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { ListingStatus } from '@prisma/client'
import { Validator, sanitizeString, sanitizeHtml } from '@/lib/validation'
import { parseBody } from '@/lib/api-utils'
import { logger } from '@/lib/logger'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// ─── GET /api/marketplace/listings ──────────────────────────────────────────
// Browse active marketplace listings. Public endpoint (no auth required).

export async function GET(req: NextRequest) {
  try {
    // Rate limit by IP — 60 requests per minute for public endpoint
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = rateLimit(`marketplace:${ip}`, 60, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const url = new URL(req.url)
    const city = url.searchParams.get('city')
    const state = url.searchParams.get('state')
    const propertyType = url.searchParams.get('propertyType')
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')
    const minArv = url.searchParams.get('minArv')
    const maxArv = url.searchParams.get('maxArv')
    const condition = url.searchParams.get('condition')
    const sort = url.searchParams.get('sort') || 'newest'
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10) || 20), 50)
    const offset = Math.min(Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0), 10000)

    // Build filters — only ACTIVE listings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { status: 'ACTIVE' as ListingStatus }

    if (city) where.city = { equals: city, mode: 'insensitive' }
    if (state) where.state = state.toUpperCase()
    if (propertyType) where.propertyType = propertyType
    if (condition) where.condition = { equals: condition, mode: 'insensitive' }

    if (minPrice || maxPrice) {
      where.askingPrice = {}
      if (minPrice) where.askingPrice.gte = parseInt(minPrice, 10)
      if (maxPrice) where.askingPrice.lte = parseInt(maxPrice, 10)
    }

    if (minArv || maxArv) {
      where.arv = {}
      if (minArv) where.arv.gte = parseInt(minArv, 10)
      if (maxArv) where.arv.lte = parseInt(maxArv, 10)
    }

    // Sort order
    let orderBy: Record<string, string>
    switch (sort) {
      case 'price_asc': orderBy = { askingPrice: 'asc' }; break
      case 'price_desc': orderBy = { askingPrice: 'desc' }; break
      case 'score_desc': orderBy = { confidenceScore: 'desc' }; break
      case 'views_desc': orderBy = { viewCount: 'desc' }; break
      default: orderBy = { createdAt: 'desc' }
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        select: {
          id: true,
          profileId: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          propertyType: true,
          askingPrice: true,
          assignFee: true,
          arv: true,
          repairCost: true,
          flipProfit: true,
          rentalCashFlow: true,
          beds: true,
          baths: true,
          sqft: true,
          yearBuilt: true,
          condition: true,
          confidenceScore: true,
          latitude: true,
          longitude: true,
          headline: true,
          description: true,
          photoUrls: true,
          viewCount: true,
          inquiryCount: true,
          publishedAt: true,
          createdAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.marketplaceListing.count({ where }),
    ])

    // Get wholesaler deal counts for all unique profileIds
    const profileIds = Array.from(new Set(listings.map(l => l.profileId)))
    const dealCounts = profileIds.length > 0
      ? await prisma.deal.groupBy({
          by: ['profileId'],
          where: { profileId: { in: profileIds } },
          _count: { _all: true },
        })
      : []
    const dealCountMap = new Map(dealCounts.map(d => [d.profileId, d._count._all]))

    // Sanitize wholesaler info: first name + last initial only
    const sanitized = listings.map(l => ({
      ...l,
      profileId: undefined,
      profile: {
        firstName: l.profile.firstName,
        lastInitial: l.profile.lastName ? l.profile.lastName.charAt(0) + '.' : null,
        company: l.profile.company,
        dealCount: dealCountMap.get(l.profileId) || 0,
      },
    }))

    return NextResponse.json({ listings: sanitized, total, limit, offset })
  } catch (err) {
    logger.error('GET /api/marketplace/listings failed', { route: '/api/marketplace/listings', method: 'GET', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch listings', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── POST /api/marketplace/listings ─────────────────────────────────────────
// Create a new marketplace listing from a deal.

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { body, error: parseError } = await parseBody(req)
    if (!body) return NextResponse.json({ error: parseError }, { status: 400 })

    const {
      dealId,
      headline,
      description,
      photoUrls,
      // Optional overrides (user can tweak from deal defaults)
      askingPrice: overrideAskingPrice,
      assignFee: overrideAssignFee,
      condition: overrideCondition,
      beds: overrideBeds,
      baths: overrideBaths,
      sqft: overrideSqft,
      yearBuilt: overrideYearBuilt,
    } = body as {
      dealId?: string
      headline?: string
      description?: string
      photoUrls?: string[]
      askingPrice?: number
      assignFee?: number
      condition?: string
      beds?: number
      baths?: number
      sqft?: number
      yearBuilt?: number
    }

    // ── Validate inputs ──
    const v = new Validator()
    v.require('dealId', dealId, 'Deal ID')
    if (headline !== undefined) v.string('headline', headline, { maxLength: 200, label: 'Headline' })
    if (description !== undefined) v.string('description', description, { maxLength: 2000, label: 'Description' })
    if (overrideAskingPrice !== undefined) v.positiveInt('askingPrice', overrideAskingPrice, 'Asking price')
    if (overrideAssignFee !== undefined) v.positiveInt('assignFee', overrideAssignFee, 'Assignment fee')
    if (overrideBeds !== undefined) v.intRange('beds', overrideBeds, 0, 99, 'Beds')
    if (overrideBaths !== undefined) v.intRange('baths', overrideBaths, 0, 20, 'Baths')
    if (overrideSqft !== undefined) v.intRange('sqft', overrideSqft, 0, 1_000_000, 'Square footage')
    if (!v.isValid()) return v.toResponse()

    // Validate photoUrls if provided
    if (photoUrls !== undefined) {
      if (!Array.isArray(photoUrls)) {
        return NextResponse.json({ error: 'photoUrls must be an array' }, { status: 400 })
      }
      if (photoUrls.length > 10) {
        return NextResponse.json({ error: 'Maximum 10 photos per listing' }, { status: 400 })
      }
    }

    // Verify deal exists and belongs to the profile
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, profileId: profile.id },
    })
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    // Deal must be ACTIVE or UNDER_OFFER
    if (deal.status !== 'ACTIVE' && deal.status !== 'UNDER_OFFER') {
      return NextResponse.json(
        { error: `Deal status must be ACTIVE or UNDER_OFFER to list. Current: ${deal.status}` },
        { status: 400 },
      )
    }

    // Check for existing active listing
    const existing = await prisma.marketplaceListing.findFirst({
      where: { dealId, status: { in: ['ACTIVE', 'PAUSED'] } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An active listing already exists for this deal', existingListingId: existing.id },
        { status: 409 },
      )
    }

    // Extract daisyChainFlag from analysisData if present
    const analysisData = deal.analysisData as Record<string, unknown> | null

    const listing = await prisma.marketplaceListing.create({
      data: {
        profileId: profile.id,
        dealId: deal.id,
        status: 'ACTIVE' as ListingStatus,
        address: deal.address,
        city: deal.city,
        state: deal.state,
        zip: deal.zip,
        propertyType: deal.propertyType,
        askingPrice: overrideAskingPrice ?? deal.askingPrice,
        assignFee: overrideAssignFee ?? deal.assignFee,
        arv: deal.arv,
        repairCost: deal.repairCost,
        flipProfit: deal.flipProfit,
        rentalCashFlow: deal.rentalCashFlow,
        beds: overrideBeds ?? deal.beds,
        baths: overrideBaths ?? deal.baths,
        sqft: overrideSqft ?? deal.sqft,
        yearBuilt: overrideYearBuilt ?? deal.yearBuilt,
        condition: overrideCondition ?? deal.condition,
        confidenceScore: deal.confidenceScore,
        headline: headline ? sanitizeString(headline) : `${deal.propertyType} in ${deal.city}, ${deal.state}`,
        description: description ? sanitizeHtml(description) : null,
        photoUrls: photoUrls || [],
        publishedAt: new Date(),
      },
      include: {
        deal: { select: { address: true, city: true, state: true, zip: true, status: true } },
      },
    })

    logActivity({
      buyerId: '',
      profileId: profile.id,
      type: 'listing_created',
      title: `Listed ${deal.address} on Marketplace`,
      metadata: {
        listingId: listing.id,
        dealId: deal.id,
        askingPrice: deal.askingPrice,
        daisyChain: analysisData?.daisyChainFlag === true,
      },
    })

    // Fire-and-forget geocoding via Mapbox
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (mapboxToken) {
      const fullAddress = `${deal.address}, ${deal.city}, ${deal.state} ${deal.zip}`
      ;(async () => {
        try {
          const geoRes = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=1&country=us`,
          )
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            const coords = geoData?.features?.[0]?.center // [lng, lat]
            if (coords && coords.length === 2) {
              await prisma.marketplaceListing.update({
                where: { id: listing.id },
                data: { longitude: coords[0], latitude: coords[1] },
              })
            }
          }
        } catch (err) {
          logger.warn('Geocoding failed for listing', { listingId: listing.id, error: err instanceof Error ? err.message : String(err) })
        }
      })()
    }

    return NextResponse.json({ listing }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/marketplace/listings failed', { route: '/api/marketplace/listings', method: 'POST', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to create listing', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
