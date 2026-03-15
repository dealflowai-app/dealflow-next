import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logBulkActivity, type ActivityInput } from '@/lib/activity'
import {
  evaluateAutoTags,
  AUTO_TAG_DEFINITIONS,
  type BuyerForTagging,
} from '@/lib/tags'
import type { CallForScoring, MatchForScoring, OfferForScoring } from '@/lib/scoring'

const BATCH_SIZE = 50

/**
 * POST /api/crm/buyers/auto-tag
 *
 * NOTE: This endpoint is expensive — it evaluates all buyers against all rules.
 * In production, add rate limiting (e.g., max 1 call per 5 minutes per user).
 *
 * Run auto-tagging across all buyers for the current user.
 * - Ensures all auto-tag definitions exist as Tag records
 * - Evaluates each buyer against all auto-tag rules
 * - Adds new auto tags, removes auto tags that no longer apply
 * - Never touches manually-applied tags
 * - Processes in batches of 50
 */
export async function POST() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Step 1: Upsert all auto-tag definitions as Tag records
    const tagMap = new Map<string, string>() // tagName -> tagId
    for (const def of AUTO_TAG_DEFINITIONS) {
      const tag = await prisma.tag.upsert({
        where: { profileId_name: { profileId: profile.id, name: def.name } },
        create: {
          profileId: profile.id,
          name: def.name,
          label: def.label,
          color: def.color,
          type: 'auto',
          description: def.description,
        },
        update: {
          label: def.label,
          color: def.color,
          description: def.description,
        },
      })
      tagMap.set(def.name, tag.id)
    }

    const autoTagIds = new Set(tagMap.values())

    // Step 2: Process buyers in batches
    let totalProcessed = 0
    let tagsAdded = 0
    let tagsRemoved = 0
    const tagBreakdown: Record<string, number> = {}
    const activityEvents: ActivityInput[] = []
    let cursor: string | undefined

    const totalBuyers = await prisma.cashBuyer.count({
      where: { profileId: profile.id, isOptedOut: false },
    })

    while (totalProcessed < totalBuyers) {
      const buyers = await prisma.cashBuyer.findMany({
        where: { profileId: profile.id, isOptedOut: false },
        include: {
          campaignCalls: { select: { outcome: true } },
          dealMatches: {
            select: { outreachSent: true, viewed: true, dealId: true, buyerId: true },
          },
          offers: {
            select: { status: true, dealId: true, buyerId: true },
          },
          tags: {
            include: { tag: { select: { name: true, type: true } } },
          },
        },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      })

      if (buyers.length === 0) break

      for (const buyer of buyers) {
        const buyerData: BuyerForTagging = {
          buyerScore: buyer.buyerScore,
          status: buyer.status,
          cashPurchaseCount: buyer.cashPurchaseCount,
          lastContactedAt: buyer.lastContactedAt,
          createdAt: buyer.createdAt,
          phone: buyer.phone,
          email: buyer.email,
          maxPrice: buyer.maxPrice,
        }

        const shouldHaveArr = evaluateAutoTags(
          buyerData,
          buyer.campaignCalls as CallForScoring[],
          buyer.dealMatches as MatchForScoring[],
          buyer.offers as OfferForScoring[],
        )
        const shouldHave = new Set(shouldHaveArr)

        // Current auto tags on this buyer
        const currentAutoTags = buyer.tags
          .filter((bt) => bt.autoApplied && bt.tag.type === 'auto')
          .map((bt) => bt.tag.name)
        const currentAutoSet = new Set(currentAutoTags)

        // Tags to add (should have but doesn't)
        for (const tagName of shouldHaveArr) {
          if (!currentAutoSet.has(tagName)) {
            const tagId = tagMap.get(tagName)
            if (!tagId) continue

            // Check if user manually removed this tag (has a manual BuyerTag that was deleted)
            // We only skip if there's an existing manual assignment — if no record exists, apply it
            const existingManual = buyer.tags.find(
              (bt) => !bt.autoApplied && bt.tag.name === tagName,
            )
            if (existingManual) continue // User manually has this tag, don't auto-apply

            await prisma.buyerTag.upsert({
              where: { buyerId_tagId: { buyerId: buyer.id, tagId } },
              create: { buyerId: buyer.id, tagId, autoApplied: true },
              update: {}, // Already exists, do nothing
            })

            tagsAdded++
            tagBreakdown[tagName] = (tagBreakdown[tagName] || 0) + 1

            activityEvents.push({
              buyerId: buyer.id,
              profileId: profile.id,
              type: 'tag_added',
              title: `Auto-tag "${tagName}" applied`,
              metadata: { tagName, auto: true },
            })
          }
        }

        // Tags to remove (has but shouldn't — only auto-applied ones)
        for (const tagName of currentAutoTags) {
          if (!shouldHave.has(tagName)) {
            const tagId = tagMap.get(tagName)
            if (!tagId) continue

            await prisma.buyerTag.deleteMany({
              where: { buyerId: buyer.id, tagId, autoApplied: true },
            })

            tagsRemoved++

            activityEvents.push({
              buyerId: buyer.id,
              profileId: profile.id,
              type: 'tag_removed',
              title: `Auto-tag "${tagName}" removed`,
              metadata: { tagName, auto: true },
            })
          }
        }

        totalProcessed++
      }

      cursor = buyers[buyers.length - 1].id
    }

    // Log all activity events in bulk
    if (activityEvents.length > 0) {
      logBulkActivity(activityEvents)
    }

    return NextResponse.json({
      processed: totalProcessed,
      tagsAdded,
      tagsRemoved,
      tagBreakdown,
    })
  } catch (err) {
    console.error('POST /api/crm/buyers/auto-tag error:', err)
    return NextResponse.json({ error: 'Failed to run auto-tagging' }, { status: 500 })
  }
}
