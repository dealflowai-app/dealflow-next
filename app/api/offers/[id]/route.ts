import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logActivity } from '@/lib/activity'
import { getTemplate } from '@/lib/contracts/templates'
import { fillContract, type FillContractInput } from '@/lib/contracts/fill'
import { renderContractHTML } from '@/lib/contracts/render'
import { generateContractPDF } from '@/lib/contracts/pdf'
import type { OfferStatus, DealStatus, ContractStatus } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { Validator, sanitizeString } from '@/lib/validation'
import { parseBody } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

// Valid status transitions
const OFFER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'COUNTERED'],
  COUNTERED: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  // Terminal states
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
  EXPIRED: [],
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id: offerId } = await params

    const { body, error: parseError } = await parseBody(req)
    if (!body) return NextResponse.json({ error: parseError }, { status: 400 })

    const newStatus = body.status as string | undefined

    // ── Validate inputs ──
    const VALID_STATUSES = ['ACCEPTED', 'REJECTED', 'COUNTERED', 'WITHDRAWN']
    const v = new Validator()
    v.require('status', newStatus, 'Status')
    if (newStatus !== undefined) v.enumValue('status', newStatus, VALID_STATUSES, 'Status')
    if (body.counterAmount !== undefined) {
      v.positiveInt('counterAmount', body.counterAmount, 'Counter amount')
      v.intRange('counterAmount', body.counterAmount, 1, 100_000_000, 'Counter amount')
    }
    if (body.counterTerms !== undefined) v.string('counterTerms', body.counterTerms, { maxLength: 1000, label: 'Counter terms' })
    if (body.counterMessage !== undefined) v.string('counterMessage', body.counterMessage, { maxLength: 2000, label: 'Counter message' })
    if (!v.isValid()) return v.toResponse()

    // Fetch offer + deal to verify ownership
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        deal: true,
        buyer: { select: { id: true, firstName: true, lastName: true, entityName: true, phone: true, email: true, address: true, city: true, state: true, zip: true } },
      },
    })

    if (!offer || offer.deal.profileId !== profile.id) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Validate transition
    const allowed = OFFER_TRANSITIONS[offer.status] ?? []
    if (!allowed.includes(newStatus!)) {
      return NextResponse.json(
        { error: `Cannot transition from ${offer.status} to ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}` },
        { status: 400 },
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: newStatus as OfferStatus,
    }

    // For COUNTERED, allow updating amount/terms/message
    if (newStatus === 'COUNTERED') {
      if (body.counterAmount != null) updateData.amount = Number(body.counterAmount)
      if (body.counterTerms !== undefined) updateData.terms = body.counterTerms ? sanitizeString(body.counterTerms as string) : null
      if (body.counterMessage !== undefined) updateData.message = body.counterMessage ? sanitizeString(body.counterMessage as string) : null
    }

    const dealId = offer.deal.id
    const buyerDisplay = [offer.buyer.firstName, offer.buyer.lastName].filter(Boolean).join(' ') || offer.buyer.entityName || 'Unknown'

    // Use transaction for ACCEPTED (cascading effects)
    if (newStatus === 'ACCEPTED') {
      await prisma.$transaction(async (tx) => {
        // Update this offer
        await tx.offer.update({ where: { id: offerId }, data: updateData as never })

        // Reject all other pending/countered offers on this deal
        await tx.offer.updateMany({
          where: {
            dealId,
            id: { not: offerId },
            status: { in: ['PENDING', 'COUNTERED'] },
          },
          data: { status: 'REJECTED' as OfferStatus },
        })

        // Close the deal
        await tx.deal.update({
          where: { id: dealId },
          data: {
            status: 'CLOSED' as DealStatus,
            closedAt: new Date(),
          },
        })
      })

      logActivity({
        buyerId: offer.buyerId,
        profileId: profile.id,
        type: 'offer_accepted',
        title: `Accepted $${offer.amount.toLocaleString()} offer from ${buyerDisplay} on ${offer.deal.address}`,
        metadata: { dealId, offerId, amount: offer.amount },
      })

      // Auto-generate contract (fire-and-forget)
      ;(async () => {
        try {
          const deal = offer.deal
          const stateId = `${deal.state.toLowerCase()}_assignment_v1`
          const template = getTemplate(stateId) || getTemplate('tx_assignment_v1')
          if (!template) return

          const fillInput: FillContractInput = {
            deal: {
              address: deal.address, city: deal.city, state: deal.state, zip: deal.zip,
              askingPrice: deal.askingPrice, assignFee: deal.assignFee, closeByDate: deal.closeByDate,
              arv: deal.arv, condition: deal.condition, propertyType: deal.propertyType,
              beds: deal.beds, baths: deal.baths, sqft: deal.sqft, yearBuilt: deal.yearBuilt,
            },
            offer: { amount: offer.amount, closeDate: offer.closeDate, terms: offer.terms, message: offer.message },
            buyer: {
              firstName: offer.buyer.firstName, lastName: offer.buyer.lastName,
              entityName: offer.buyer.entityName, phone: offer.buyer.phone,
              email: offer.buyer.email, address: offer.buyer.address,
              city: offer.buyer.city, state: offer.buyer.state, zip: offer.buyer.zip,
            },
            profile: {
              firstName: profile.firstName, lastName: profile.lastName,
              email: profile.email, phone: profile.phone, company: profile.company,
            },
          }

          const filled = fillContract(template, fillInput)
          const html = renderContractHTML(filled, { isDraft: true })
          const { buffer, contentType } = await generateContractPDF(html)

          const contract = await prisma.contract.create({
            data: {
              profileId: profile.id, dealId: deal.id, offerId: offerId,
              templateName: template.name, status: 'DRAFT' as ContractStatus,
              filledData: filled.filledData as never, documentUrl: null,
            },
          })

          const ext = contentType === 'application/pdf' ? 'pdf' : 'html'
          const dir = path.join('/tmp', 'contracts')
          await fs.mkdir(dir, { recursive: true })
          const filePath = path.join(dir, `${contract.id}.${ext}`)
          await fs.writeFile(filePath, buffer)
          await prisma.contract.update({ where: { id: contract.id }, data: { documentUrl: filePath } })

          logActivity({
            buyerId: offer.buyerId, profileId: profile.id,
            type: 'contract_created',
            title: `Contract auto-generated for ${deal.address}`,
            metadata: { dealId: deal.id, contractId: contract.id, offerId },
          })
        } catch (contractErr) {
          logger.error('Auto-contract generation failed', { error: contractErr instanceof Error ? contractErr.message : String(contractErr) })
        }
      })()
    } else {
      // Simple status update
      await prisma.offer.update({ where: { id: offerId }, data: updateData as never })

      // If rejecting, check if deal should revert to ACTIVE
      if (newStatus === 'REJECTED' && offer.deal.status === 'UNDER_OFFER') {
        const remainingActive = await prisma.offer.count({
          where: {
            dealId,
            id: { not: offerId },
            status: { in: ['PENDING', 'COUNTERED'] },
          },
        })
        if (remainingActive === 0) {
          await prisma.deal.update({
            where: { id: dealId },
            data: { status: 'ACTIVE' as DealStatus },
          })
        }
      }

      const actionLabel = newStatus === 'REJECTED' ? 'rejected' : newStatus === 'COUNTERED' ? 'countered' : 'withdrawn'
      logActivity({
        buyerId: offer.buyerId,
        profileId: profile.id,
        type: `offer_${actionLabel}`,
        title: `Offer ${actionLabel} for ${buyerDisplay} on ${offer.deal.address}`,
        metadata: { dealId, offerId, amount: offer.amount, newStatus },
      })
    }

    // Fetch updated offer
    const updated = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, entityName: true },
        },
      },
    })

    return NextResponse.json({ offer: updated })
  } catch (err) {
    logger.error('PATCH /api/offers/[id] error', { route: '/api/offers/[id]', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to update offer', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id: offerId } = await params

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        deal: { select: { id: true, profileId: true, status: true } },
      },
    })

    if (!offer || offer.deal.profileId !== profile.id) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Only allow deleting PENDING offers
    if (offer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending offers can be deleted' },
        { status: 400 },
      )
    }

    await prisma.offer.delete({ where: { id: offerId } })

    // Check if deal should revert to ACTIVE
    if (offer.deal.status === 'UNDER_OFFER') {
      const remainingActive = await prisma.offer.count({
        where: {
          dealId: offer.dealId,
          status: { in: ['PENDING', 'COUNTERED'] },
        },
      })
      if (remainingActive === 0) {
        await prisma.deal.update({
          where: { id: offer.dealId },
          data: { status: 'ACTIVE' as DealStatus },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('DELETE /api/offers/[id] error', { route: '/api/offers/[id]', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to delete offer', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
