import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { Validator, sanitizeString } from '@/lib/validation'
import { parseBody } from '@/lib/api-utils'

/**
 * GET /api/marketplace/sellers/[profileId]/reviews
 * Public — returns paginated reviews for a seller
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { profileId: string } },
) {
  try {
    const { profileId } = params
    const url = new URL(req.url)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '10'), 1), 50)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0') || 0, 0)
    const sort = url.searchParams.get('sort') === 'oldest' ? 'asc' as const : 'desc' as const

    const [reviews, total] = await Promise.all([
      prisma.sellerReview.findMany({
        where: { sellerId: profileId },
        orderBy: { createdAt: sort },
        skip: offset,
        take: limit,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          tags: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              sellerVerification: true,
            },
          },
          listing: {
            select: {
              id: true,
              address: true,
              city: true,
              state: true,
            },
          },
        },
      }),
      prisma.sellerReview.count({ where: { sellerId: profileId } }),
    ])

    const formatted = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      tags: r.tags,
      createdAt: r.createdAt,
      reviewer: {
        id: r.reviewer.id,
        firstName: r.reviewer.firstName,
        lastInitial: r.reviewer.lastName?.charAt(0) || null,
        avatarUrl: r.reviewer.avatarUrl,
        verified: r.reviewer.sellerVerification === 'VERIFIED',
      },
      listing: r.listing
        ? { id: r.listing.id, address: r.listing.address, city: r.listing.city, state: r.listing.state }
        : null,
    }))

    return NextResponse.json({ reviews: formatted, total, limit, offset })
  } catch (err) {
    logger.error('GET seller reviews failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}

/**
 * POST /api/marketplace/sellers/[profileId]/reviews
 * Auth required — submit a review for a seller
 */
const VALID_TAGS = [
  'responsive', 'accurate_description', 'fast_close', 'fair_pricing',
  'good_communication', 'professional', 'reliable', 'transparent',
]

export async function POST(
  req: NextRequest,
  { params }: { params: { profileId: string } },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { profileId: sellerId } = params

    // Can't review yourself
    if (profile.id === sellerId) {
      return NextResponse.json({ error: 'You cannot review yourself' }, { status: 400 })
    }

    // Verify seller exists
    const seller = await prisma.profile.findUnique({
      where: { id: sellerId },
      select: { id: true },
    })
    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 })
    }

    const { body, error: parseError } = await parseBody(req)
    if (!body) return NextResponse.json({ error: parseError }, { status: 400 })

    // Validate
    const v = new Validator()
    v.require('rating', body.rating, 'Rating')
    v.intRange('rating', body.rating, 1, 5, 'Rating')
    if (body.title !== undefined) v.string('title', body.title, { maxLength: 200, label: 'Title' })
    if (body.body !== undefined) v.string('body', body.body, { maxLength: 2000, label: 'Review' })
    if (body.listingId !== undefined) v.string('listingId', body.listingId, { maxLength: 100, label: 'Listing ID' })
    if (!v.isValid()) return v.toResponse()

    // Validate tags
    const tags: string[] = Array.isArray(body.tags)
      ? body.tags.filter((t: unknown) => typeof t === 'string' && VALID_TAGS.includes(t as string))
      : []

    // If listing specified, verify it belongs to the seller
    let listingId: string | null = null
    if (body.listingId) {
      const listing = await prisma.marketplaceListing.findFirst({
        where: { id: body.listingId as string, profileId: sellerId },
        select: { id: true },
      })
      if (!listing) {
        return NextResponse.json({ error: 'Listing not found for this seller' }, { status: 404 })
      }
      listingId = listing.id
    }

    // Check for existing review (unique constraint: sellerId + reviewerId + listingId)
    const existing = await prisma.sellerReview.findFirst({
      where: {
        sellerId,
        reviewerId: profile.id,
        listingId: listingId,
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'You have already reviewed this seller for this listing' }, { status: 409 })
    }

    // Create the review
    const review = await prisma.sellerReview.create({
      data: {
        sellerId,
        reviewerId: profile.id,
        listingId,
        rating: Number(body.rating),
        title: body.title ? sanitizeString(body.title as string) : null,
        body: body.body ? sanitizeString(body.body as string) : null,
        tags,
      },
    })

    // Update denormalized reputation score on the seller profile
    const agg = await prisma.sellerReview.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await prisma.profile.update({
      where: { id: sellerId },
      data: {
        reputationScore: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count.rating,
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (err) {
    logger.error('POST seller review failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
