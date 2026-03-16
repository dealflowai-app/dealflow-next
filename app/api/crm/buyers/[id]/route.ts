import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const buyer = await prisma.cashBuyer.findFirst({
      where: { id, profileId: profile.id },
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
          include: { deal: { select: { address: true, city: true, state: true } } },
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

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    return NextResponse.json({ buyer })
  } catch (err) {
    console.error('GET /api/crm/buyers/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch buyer' }, { status: 500 })
  }
}

const UPDATABLE_FIELDS = [
  'firstName', 'lastName', 'entityName', 'entityType',
  'phone', 'email', 'address', 'city', 'state', 'zip',
  'primaryPropertyType', 'strategy', 'preferredMarkets', 'preferredTypes',
  'minPrice', 'maxPrice', 'closeSpeedDays', 'proofOfFundsVerified',
  'notes', 'buyerScore', 'status',
  'scorePinned', 'scoreOverride', 'scoreAdjustment', 'overrideReason', 'customTags',
  // Wholesaler-specific fields
  'motivation', 'buyerType', 'fundingSource', 'conditionPreference',
  'communicationPref', 'preferredZips', 'portfolioSize', 'avgPurchasePrice',
  'followUpDate', 'source', 'assignedTo',
  // Unarchive support
  'isOptedOut',
] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const existing = await prisma.cashBuyer.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // Whitelist fields
    const data: Record<string, unknown> = {}
    const numericFields = ['minPrice', 'maxPrice', 'closeSpeedDays',
      'scoreOverride', 'portfolioSize', 'avgPurchasePrice']
    const requiredNumericFields = ['buyerScore', 'scoreAdjustment'] // non-nullable, skip if empty
    const dateFields = ['followUpDate']
    const nullableEnumFields = ['primaryPropertyType', 'strategy', 'motivation',
      'buyerType', 'fundingSource', 'conditionPreference', 'communicationPref']
    const requiredEnumFields = ['status'] // non-nullable, skip if empty
    const requiredStringFields: string[] = [] // fields that can't be null
    const arrayFields = ['preferredMarkets', 'preferredTypes', 'preferredZips', 'customTags']

    for (const field of UPDATABLE_FIELDS) {
      if (!(field in body)) continue
      const val = body[field]

      if (requiredNumericFields.includes(field)) {
        // Only set if value is valid, never set to null
        if (val != null && val !== '') data[field] = Number(val)
      } else if (numericFields.includes(field)) {
        data[field] = val != null && val !== '' ? Number(val) : null
      } else if (dateFields.includes(field)) {
        data[field] = val ? new Date(val as string) : null
      } else if (requiredEnumFields.includes(field)) {
        // Only set if value is valid, never set to null
        if (val && val !== '') data[field] = val
      } else if (nullableEnumFields.includes(field)) {
        data[field] = val && val !== '' ? val : null
      } else if (arrayFields.includes(field)) {
        data[field] = Array.isArray(val) ? val : []
      } else if (requiredStringFields.includes(field)) {
        if (val && val !== '') data[field] = val
      } else if (typeof val === 'boolean') {
        data[field] = val
      } else {
        // Nullable string fields: empty string -> null
        data[field] = val && val !== '' ? val : null
      }
    }

    // Auto-mark contactEnriched when both phone and email present
    const finalPhone = (data.phone as string | undefined) ?? existing.phone
    const finalEmail = (data.email as string | undefined) ?? existing.email
    if (finalPhone && finalEmail && !existing.contactEnriched) {
      data.contactEnriched = true
      data.enrichedAt = new Date()
    }

    const buyer = await prisma.cashBuyer.update({
      where: { id },
      data: data as never,
    })

    // Log edit activity
    const changedFields = Object.keys(data)
    logActivity({
      buyerId: id,
      profileId: profile.id,
      type: 'edited',
      title: `Updated ${changedFields.join(', ')}`,
      metadata: { changedFields, updates: data },
    })

    // Log status change separately if status was updated
    if (data.status && data.status !== existing.status) {
      logActivity({
        buyerId: id,
        profileId: profile.id,
        type: 'status_changed',
        title: `Status changed from ${existing.status} to ${data.status}`,
        metadata: { oldStatus: existing.status, newStatus: data.status },
      })
    }

    return NextResponse.json({ buyer })
  } catch (err: unknown) {
    console.error('PATCH /api/crm/buyers/[id] error:', err)
    // Get full Prisma error message
    let detail = 'Unknown error'
    if (err && typeof err === 'object' && 'message' in err) {
      detail = (err as { message: string }).message
    }
    return NextResponse.json({ error: 'Failed to update buyer', detail }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const existing = await prisma.cashBuyer.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    logActivity({
      buyerId: id,
      profileId: profile.id,
      type: 'archived',
      title: `Buyer archived and opted out`,
    })

    await prisma.cashBuyer.update({
      where: { id },
      data: {
        isOptedOut: true,
        optedOutAt: new Date(),
        status: 'DO_NOT_CALL',
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/crm/buyers/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete buyer' }, { status: 500 })
  }
}
