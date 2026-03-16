import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logBulkActivity } from '@/lib/activity'
import {
  sendDealToBuyersBatch,
  type DealForOutreach,
  type BuyerForOutreach,
  type OutreachChannel,
} from '@/lib/deal-outreach'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id: dealId } = await params

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const channels = (body.channels as OutreachChannel[] | undefined) || ['sms', 'email']
    const allMatches = body.allMatches === true
    const minScore = typeof body.minScore === 'number' ? body.minScore : 60
    const buyerIds = Array.isArray(body.buyerIds) ? (body.buyerIds as string[]) : []

    if (!allMatches && buyerIds.length === 0) {
      return NextResponse.json(
        { error: 'Provide buyerIds or set allMatches: true' },
        { status: 400 },
      )
    }

    // Fetch deal + verify ownership
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, profileId: profile.id },
    })
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Fetch matches (either all above minScore or specific buyer IDs)
    const matchWhere = allMatches
      ? { dealId, matchScore: { gte: minScore } }
      : { dealId, buyerId: { in: buyerIds } }

    const matches = await prisma.dealMatch.findMany({
      where: matchWhere,
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entityName: true,
            phone: true,
            email: true,
          },
        },
      },
    })

    // Split into sendable vs already-sent
    const toSend = matches.filter((m) => !m.outreachSent)
    const skipped = matches.length - toSend.length

    if (toSend.length === 0) {
      return NextResponse.json({
        sent: 0,
        skipped,
        failed: 0,
        message: skipped > 0 ? 'All selected buyers have already been contacted' : 'No matching buyers found',
      })
    }

    // Map deal to outreach shape
    const dealData: DealForOutreach = {
      id: deal.id,
      address: deal.address,
      city: deal.city,
      state: deal.state,
      zip: deal.zip,
      propertyType: deal.propertyType,
      beds: deal.beds,
      baths: deal.baths != null ? Math.floor(deal.baths) : null,
      sqft: deal.sqft,
      yearBuilt: deal.yearBuilt,
      condition: deal.condition,
      askingPrice: deal.askingPrice,
      arv: deal.arv,
      repairCost: deal.repairCost,
      assignFee: deal.assignFee,
      flipProfit: deal.flipProfit,
    }

    // Send in batches
    const buyersToSend = toSend.map((m) => ({
      buyer: m.buyer as BuyerForOutreach,
      matchScore: m.matchScore,
    }))

    const results = await sendDealToBuyersBatch(dealData, buyersToSend, { channels })

    // Tally results
    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []
    const successBuyerIds: string[] = []

    for (const r of results) {
      const smsOk = r.sms?.success !== false
      const emailOk = r.email?.success !== false
      const anySuccess = (r.sms?.success === true) || (r.email?.success === true)
      const allFailed = (r.sms && !r.sms.success) && (r.email && !r.email.success)

      if (anySuccess) {
        sentCount++
        successBuyerIds.push(r.buyerId)
      }
      if (allFailed || (!smsOk && !emailOk && !r.sms && !r.email)) {
        failedCount++
        if (r.sms?.error) errors.push(`SMS to ${r.buyerId}: ${r.sms.error}`)
        if (r.email?.error) errors.push(`Email to ${r.buyerId}: ${r.email.error}`)
      }
    }

    // Update DealMatch records for successful sends
    if (successBuyerIds.length > 0) {
      const now = new Date()
      await prisma.dealMatch.updateMany({
        where: {
          dealId,
          buyerId: { in: successBuyerIds },
        },
        data: {
          outreachSent: true,
          outreachSentAt: now,
        },
      })

      // Log activity for each buyer
      logBulkActivity(
        successBuyerIds.map((buyerId) => ({
          buyerId,
          profileId: profile.id,
          type: 'outreach_sent',
          title: `Deal blast sent for ${deal.address}`,
          metadata: { dealId, channels },
        })),
      )
    }

    return NextResponse.json({
      sent: sentCount,
      skipped,
      failed: failedCount,
      ...(errors.length > 0 ? { errors } : {}),
    })
  } catch (err) {
    console.error('POST /api/deals/[id]/blast error:', err)
    return NextResponse.json(
      { error: 'Failed to send outreach', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
