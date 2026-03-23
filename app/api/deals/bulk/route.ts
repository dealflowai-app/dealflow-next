import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import type { DealStatus } from '@prisma/client'

type BulkAction = 'delete' | 'change_status' | 'export'

const VALID_STATUSES: DealStatus[] = ['DRAFT', 'ACTIVE', 'UNDER_OFFER', 'CLOSED', 'CANCELLED', 'EXPIRED']

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    let body: { action?: string; dealIds?: string[]; status?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { action, dealIds } = body as { action: BulkAction; dealIds: string[] }

    if (!action || !Array.isArray(dealIds) || dealIds.length === 0) {
      return NextResponse.json(
        { error: 'action and dealIds array are required' },
        { status: 400 },
      )
    }

    if (dealIds.length > 200) {
      return NextResponse.json(
        { error: 'Maximum 200 deals per bulk action' },
        { status: 400 },
      )
    }

    const validActions: BulkAction[] = ['delete', 'change_status', 'export']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      )
    }

    // Verify ownership of all deal IDs
    const ownedDeals = await prisma.deal.findMany({
      where: { id: { in: dealIds }, profileId: profile.id },
      select: { id: true, status: true },
    })
    const ownedIds = new Set(ownedDeals.map((d) => d.id))
    const unauthorizedIds = dealIds.filter((id) => !ownedIds.has(id))

    if (unauthorizedIds.length > 0) {
      return NextResponse.json(
        { error: 'Some deal IDs not found or not owned by you', unauthorizedIds },
        { status: 403 },
      )
    }

    // Handle export
    if (action === 'export') {
      const deals = await prisma.deal.findMany({
        where: { id: { in: dealIds }, profileId: profile.id },
        include: {
          matches: { select: { id: true, matchScore: true } },
          offers: { select: { id: true, status: true, amount: true } },
        },
      })
      return NextResponse.json({ deals, count: deals.length })
    }

    // Handle delete (cancel non-closed deals)
    if (action === 'delete') {
      // Filter out CLOSED deals which cannot be cancelled
      const deletableIds = ownedDeals
        .filter((d) => d.status !== 'CLOSED')
        .map((d) => d.id)

      if (deletableIds.length === 0) {
        return NextResponse.json(
          { error: 'No deletable deals (closed deals cannot be deleted)' },
          { status: 400 },
        )
      }

      const result = await prisma.deal.updateMany({
        where: { id: { in: deletableIds }, profileId: profile.id },
        data: { status: 'CANCELLED' as DealStatus },
      })

      return NextResponse.json({
        success: true,
        action: 'delete',
        updated: result.count,
        skipped: dealIds.length - deletableIds.length,
      })
    }

    // Handle change_status
    if (action === 'change_status') {
      const newStatus = body.status as DealStatus
      if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        )
      }

      const data: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'CLOSED') {
        data.closedAt = new Date()
      }

      const result = await prisma.deal.updateMany({
        where: { id: { in: dealIds }, profileId: profile.id },
        data: data as never,
      })

      return NextResponse.json({
        success: true,
        action: 'change_status',
        status: newStatus,
        updated: result.count,
      })
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 })
  } catch (err) {
    console.error('POST /api/deals/bulk error:', err)
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 })
  }
}
