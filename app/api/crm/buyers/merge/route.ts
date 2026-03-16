import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { refreshBuyerScore } from '@/lib/scoring-triggers'
import { buildMergedBuyer, type BuyerForMerge } from '@/lib/merge'

const BUYER_SELECT_FOR_MERGE = {
  id: true,
  firstName: true,
  lastName: true,
  entityName: true,
  entityType: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  state: true,
  zip: true,
  cashPurchaseCount: true,
  lastPurchaseDate: true,
  estimatedMinPrice: true,
  estimatedMaxPrice: true,
  primaryPropertyType: true,
  status: true,
  contactEnriched: true,
  enrichedAt: true,
  notes: true,
  buyerScore: true,
  lastContactedAt: true,
  lastVerifiedAt: true,
  scorePinned: true,
  scoreOverride: true,
  scoreAdjustment: true,
  overrideReason: true,
  customTags: true,
  preferredMarkets: true,
  preferredTypes: true,
  strategy: true,
  minPrice: true,
  maxPrice: true,
  closeSpeedDays: true,
  proofOfFundsVerified: true,
} as const

/**
 * POST /api/crm/buyers/merge
 *
 * Merge duplicate buyers into a single primary buyer.
 * Body: { primaryBuyerId: string, secondaryBuyerIds: string[] }
 *
 * Steps:
 * 1. Verify all buyers belong to current user
 * 2. Compute merged data via pure function
 * 3. In a transaction: update primary, reassign relations, soft-delete secondaries
 * 4. Log activity and recalculate score
 */
export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    let body: { primaryBuyerId?: string; secondaryBuyerIds?: string[] }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { primaryBuyerId, secondaryBuyerIds } = body

    if (!primaryBuyerId || !Array.isArray(secondaryBuyerIds) || secondaryBuyerIds.length === 0) {
      return NextResponse.json(
        { error: 'primaryBuyerId and secondaryBuyerIds[] are required' },
        { status: 400 },
      )
    }

    // Prevent merging a buyer into itself
    if (secondaryBuyerIds.includes(primaryBuyerId)) {
      return NextResponse.json(
        { error: 'primaryBuyerId cannot appear in secondaryBuyerIds' },
        { status: 400 },
      )
    }

    // Fetch primary
    const primary = await prisma.cashBuyer.findFirst({
      where: { id: primaryBuyerId, profileId: profile.id, isOptedOut: false },
      select: BUYER_SELECT_FOR_MERGE,
    })
    if (!primary) {
      return NextResponse.json({ error: 'Primary buyer not found' }, { status: 404 })
    }

    // Fetch secondaries
    const secondaries = await prisma.cashBuyer.findMany({
      where: {
        id: { in: secondaryBuyerIds },
        profileId: profile.id,
        isOptedOut: false,
      },
      select: BUYER_SELECT_FOR_MERGE,
    })

    if (secondaries.length !== secondaryBuyerIds.length) {
      const foundIds = secondaries.map((s) => s.id)
      const missing = secondaryBuyerIds.filter((id: string) => !foundIds.includes(id))
      return NextResponse.json(
        { error: 'Some secondary buyers not found', missingIds: missing },
        { status: 404 },
      )
    }

    // Compute merged data (pure function)
    const mergedData = buildMergedBuyer(
      primary as unknown as BuyerForMerge,
      secondaries as unknown as BuyerForMerge[],
    )

    const secondaryIds = secondaries.map((s) => s.id)

    // Execute merge in a transaction
    await prisma.$transaction(async (tx) => {
      // a. Update primary buyer with merged data
      await tx.cashBuyer.update({
        where: { id: primaryBuyerId },
        data: mergedData as Parameters<typeof tx.cashBuyer.update>[0]['data'],
      })

      // b. Reassign CampaignCall records
      await tx.campaignCall.updateMany({
        where: { buyerId: { in: secondaryIds } },
        data: { buyerId: primaryBuyerId },
      })

      // c. Reassign DealMatch records (handle unique constraint on [dealId, buyerId])
      // First, find which deals the primary already has matches for
      const primaryMatches = await tx.dealMatch.findMany({
        where: { buyerId: primaryBuyerId },
        select: { dealId: true, matchScore: true, id: true },
      })
      const primaryDealIds = new Map(primaryMatches.map((m) => [m.dealId, m]))

      const secondaryMatches = await tx.dealMatch.findMany({
        where: { buyerId: { in: secondaryIds } },
        select: { id: true, dealId: true, matchScore: true },
      })

      const matchesToReassign: string[] = []
      const matchesToDelete: string[] = []

      for (const sm of secondaryMatches) {
        const existing = primaryDealIds.get(sm.dealId)
        if (existing) {
          // Conflict: keep the one with higher matchScore
          if (sm.matchScore > existing.matchScore) {
            // Secondary has better score — delete primary's, reassign secondary's
            matchesToDelete.push(existing.id)
            matchesToReassign.push(sm.id)
            primaryDealIds.set(sm.dealId, sm) // update tracker
          } else {
            // Primary's is better or equal — delete secondary's
            matchesToDelete.push(sm.id)
          }
        } else {
          // No conflict — reassign
          matchesToReassign.push(sm.id)
        }
      }

      if (matchesToDelete.length > 0) {
        await tx.dealMatch.deleteMany({
          where: { id: { in: matchesToDelete } },
        })
      }
      if (matchesToReassign.length > 0) {
        await tx.dealMatch.updateMany({
          where: { id: { in: matchesToReassign } },
          data: { buyerId: primaryBuyerId },
        })
      }

      // d. Reassign Offer records
      await tx.offer.updateMany({
        where: { buyerId: { in: secondaryIds } },
        data: { buyerId: primaryBuyerId },
      })

      // e. Reassign BuyerTag records (skip duplicates by deleting conflicts first)
      const primaryTagIds = await tx.buyerTag.findMany({
        where: { buyerId: primaryBuyerId },
        select: { tagId: true },
      })
      const primaryTagIdSet = new Set(primaryTagIds.map((t) => t.tagId))

      // Delete secondary BuyerTags that would conflict
      await tx.buyerTag.deleteMany({
        where: {
          buyerId: { in: secondaryIds },
          tagId: { in: Array.from(primaryTagIdSet) },
        },
      })
      // Reassign remaining
      await tx.buyerTag.updateMany({
        where: { buyerId: { in: secondaryIds } },
        data: { buyerId: primaryBuyerId },
      })

      // f. Reassign ActivityEvent records
      await tx.activityEvent.updateMany({
        where: { buyerId: { in: secondaryIds } },
        data: { buyerId: primaryBuyerId },
      })

      // g. Soft-delete all secondary buyers
      await tx.cashBuyer.updateMany({
        where: { id: { in: secondaryIds } },
        data: {
          isOptedOut: true,
          optedOutAt: new Date(),
          notes: `Merged into ${primaryBuyerId}`,
          status: 'DO_NOT_CALL',
        },
      })
    })

    // Log activity on primary
    const mergedNames = secondaries.map((s) =>
      s.entityName || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.id,
    )
    logActivity({
      buyerId: primaryBuyerId,
      profileId: profile.id,
      type: 'merged',
      title: `Merged ${secondaries.length} duplicate${secondaries.length > 1 ? 's' : ''} into this buyer`,
      detail: `Merged from: ${mergedNames.join(', ')}`,
      metadata: {
        secondaryIds,
        secondaryNames: mergedNames,
      },
    })

    // Recalculate score with all new data
    await refreshBuyerScore(primaryBuyerId)

    // Return updated primary with relations
    const updatedBuyer = await prisma.cashBuyer.findUnique({
      where: { id: primaryBuyerId },
      include: {
        campaignCalls: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        dealMatches: {
          include: { deal: true },
          orderBy: { matchScore: 'desc' },
          take: 20,
        },
        offers: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, label: true, color: true, type: true } },
          },
        },
      },
    })

    return NextResponse.json({
      buyer: updatedBuyer,
      merged: {
        primaryId: primaryBuyerId,
        secondaryIds,
        secondaryNames: mergedNames,
      },
    })
  } catch (err) {
    console.error('POST /api/crm/buyers/merge error:', err)
    return NextResponse.json({ error: 'Failed to merge buyers' }, { status: 500 })
  }
}
