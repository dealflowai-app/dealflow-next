import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import type { BuyerStatus } from '@prisma/client'

type BulkAction = 'archive' | 'activate' | 'mark_dormant' | 'mark_high_confidence' | 'export'

const ACTION_STATUS_MAP: Record<Exclude<BulkAction, 'export'>, {
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

    let body: { action?: string; buyerIds?: string[] }
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

    const validActions: BulkAction[] = ['archive', 'activate', 'mark_dormant', 'mark_high_confidence', 'export']
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

    // Apply status update
    const updateData = ACTION_STATUS_MAP[action]
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
