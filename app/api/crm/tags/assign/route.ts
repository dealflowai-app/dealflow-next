import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logBulkActivity } from '@/lib/activity'
import { logger } from '@/lib/logger'

/**
 * POST /api/crm/tags/assign
 *
 * Assign or remove a tag from one or more buyers.
 * Body: { action: "add" | "remove", tagId: string, buyerIds: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    let body: { action?: string; tagId?: string; buyerIds?: string[] }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { action, tagId, buyerIds } = body

    if (!action || !tagId || !Array.isArray(buyerIds) || buyerIds.length === 0) {
      return NextResponse.json(
        { error: 'action ("add" | "remove"), tagId, and buyerIds[] are required' },
        { status: 400 },
      )
    }

    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json(
        { error: 'action must be "add" or "remove"' },
        { status: 400 },
      )
    }

    // Verify tag belongs to user
    const tag = await prisma.tag.findFirst({
      where: { id: tagId, profileId: profile.id },
    })
    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Verify all buyers belong to user
    const buyers = await prisma.cashBuyer.findMany({
      where: { id: { in: buyerIds }, profileId: profile.id },
      select: { id: true, firstName: true, entityName: true },
    })
    const validIds = new Set(buyers.map((b) => b.id))
    const invalidIds = buyerIds.filter((id: string) => !validIds.has(id))

    if (action === 'add') {
      // Create BuyerTag records, skip duplicates
      const data = buyers.map((b) => ({
        buyerId: b.id,
        tagId,
        autoApplied: false,
      }))

      await prisma.buyerTag.createMany({
        data,
        skipDuplicates: true,
      })

      logBulkActivity(
        buyers.map((b) => ({
          buyerId: b.id,
          profileId: profile.id,
          type: 'tag_added',
          title: `Tag "${tag.label}" added`,
          metadata: { tagId: tag.id, tagName: tag.name, manual: true },
        })),
      )
    } else {
      // Remove BuyerTag records
      await prisma.buyerTag.deleteMany({
        where: {
          tagId,
          buyerId: { in: Array.from(validIds) },
        },
      })

      logBulkActivity(
        buyers.map((b) => ({
          buyerId: b.id,
          profileId: profile.id,
          type: 'tag_removed',
          title: `Tag "${tag.label}" removed`,
          metadata: { tagId: tag.id, tagName: tag.name, manual: true },
        })),
      )
    }

    return NextResponse.json({
      action,
      tagId,
      tagName: tag.name,
      affected: buyers.length,
      invalidIds: invalidIds.length > 0 ? invalidIds : undefined,
    })
  } catch (err) {
    logger.error('POST /api/crm/tags/assign error', { route: '/api/crm/tags/assign', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to assign tags' }, { status: 500 })
  }
}
