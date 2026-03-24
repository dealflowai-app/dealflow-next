import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import type { BuyerStatus } from '@prisma/client'

type BulkAction = 'archive' | 'activate' | 'mark_dormant' | 'mark_high_confidence' | 'export' | 'delete' | 'tag' | 'add_to_campaign'

const ACTION_STATUS_MAP: Record<string, {
  status?: BuyerStatus
  isOptedOut?: boolean
  optedOutAt?: Date | null
}> = {
  archive: { isOptedOut: true, optedOutAt: new Date(), status: 'DO_NOT_CALL' },
  activate: { status: 'ACTIVE', isOptedOut: false, optedOutAt: null },
  mark_dormant: { status: 'DORMANT' },
  mark_high_confidence: { status: 'HIGH_CONFIDENCE' },
}

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    let body: { action?: string; buyerIds?: string[]; tagId?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { action, buyerIds } = body as { action: BulkAction; buyerIds: string[] }

    if (!action || !Array.isArray(buyerIds) || buyerIds.length === 0) {
      return NextResponse.json(
        { error: 'action and buyerIds array are required' },
        { status: 400 },
      )
    }

    if (buyerIds.length > 200) {
      return NextResponse.json(
        { error: 'Maximum 200 buyers per bulk action' },
        { status: 400 },
      )
    }

    const validActions: BulkAction[] = ['archive', 'activate', 'mark_dormant', 'mark_high_confidence', 'export', 'delete', 'tag', 'add_to_campaign']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      )
    }

    // Verify ownership of all buyer IDs
    const ownedBuyers = await prisma.cashBuyer.findMany({
      where: { id: { in: buyerIds }, profileId: profile.id },
      select: { id: true },
    })
    const ownedIds = new Set(ownedBuyers.map((b) => b.id))
    const unauthorizedIds = buyerIds.filter((id) => !ownedIds.has(id))

    if (unauthorizedIds.length > 0) {
      return NextResponse.json(
        { error: 'Some buyer IDs not found or not owned by you', unauthorizedIds },
        { status: 403 },
      )
    }

    // Handle export separately
    if (action === 'export') {
      const buyers = await prisma.cashBuyer.findMany({
        where: { id: { in: buyerIds }, profileId: profile.id },
      })
      return NextResponse.json({ buyers, count: buyers.length })
    }

    // Handle delete - permanently remove buyers
    if (action === 'delete') {
      // Delete related records first, then the buyers
      await prisma.$transaction(async (tx) => {
        // Delete tag associations
        await tx.buyerTag.deleteMany({
          where: { buyerId: { in: buyerIds } },
        })
        // Delete deal matches
        await tx.dealMatch.deleteMany({
          where: { buyerId: { in: buyerIds } },
        })
        // Delete the buyers
        await tx.cashBuyer.deleteMany({
          where: { id: { in: buyerIds }, profileId: profile.id },
        })
      })

      return NextResponse.json({
        success: true,
        action: 'delete',
        deleted: buyerIds.length,
      })
    }

    // Handle tag - assign a tag to selected buyers
    if (action === 'tag') {
      const { tagId } = body
      if (!tagId) {
        return NextResponse.json({ error: 'tagId is required for tag action' }, { status: 400 })
      }

      // Verify tag belongs to user
      const tag = await prisma.tag.findFirst({
        where: { id: tagId, profileId: profile.id },
      })
      if (!tag) {
        return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
      }

      // Create tag assignments atomically, skipping duplicates
      const result = await prisma.buyerTag.createMany({
        data: buyerIds.map((buyerId) => ({ buyerId, tagId })),
        skipDuplicates: true,
      })

      return NextResponse.json({
        success: true,
        action: 'tag',
        tagged: result.count,
        skipped: buyerIds.length - result.count,
      })
    }

    // Handle add_to_campaign - return buyer IDs for campaign creation
    if (action === 'add_to_campaign') {
      return NextResponse.json({
        success: true,
        action: 'add_to_campaign',
        buyerIds,
        count: buyerIds.length,
      })
    }

    // Apply status update for remaining actions
    const updateData = ACTION_STATUS_MAP[action]
    if (!updateData) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const result = await prisma.cashBuyer.updateMany({
      where: { id: { in: buyerIds }, profileId: profile.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      action,
      updated: result.count,
    })
  } catch (err) {
    console.error('POST /api/crm/buyers/bulk error:', err)
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 })
  }
}
