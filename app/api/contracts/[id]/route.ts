import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { requireTier, FEATURE_TIERS } from '@/lib/subscription-guard'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { getTemplate, listTemplates } from '@/lib/contracts/templates'
import { fillContract, type FillContractInput } from '@/lib/contracts/fill'
import { generateContractPDF } from '@/lib/contracts/pdf'
import { renderContractHTML } from '@/lib/contracts/render'
import { ContractStatus, DealStatus, OfferStatus } from '@prisma/client'
import { sendContractNotification, type ContractNotificationType, type NotificationLogEntry } from '@/lib/contracts/notifications'
import { createVersion, detectChangedFields, type ChangeType } from '@/lib/contracts/versioning'
import { isPandaDocConfigured, createDocument, voidDocument, buildSignersFromContract } from '@/lib/contracts/pandadoc'
import { Validator, sanitizeString } from '@/lib/validation'
import { parseBody } from '@/lib/api-utils'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import fs from 'fs/promises'
import path from 'path'

type RouteCtx = { params: Promise<{ id: string }> }

// ─── GET /api/contracts/[id] ────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const contract = await prisma.contract.findFirst({
      where: { id, profileId: profile.id },
      include: {
        deal: true,
        offer: true,
      },
    })

    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    // Fetch contract history for the same deal
    const contractHistory = await prisma.contract.findMany({
      where: { dealId: contract.dealId, profileId: profile.id, id: { not: contract.id } },
      select: { id: true, status: true, templateName: true, createdAt: true, voidedAt: true },
      orderBy: { createdAt: 'desc' },
    })

    // Count missing required fields from template
    let missingFieldCount = 0
    const filledData = (contract.filledData as Record<string, string>) ?? {}
    // Try to find the template to check required fields
    const stateId = `${contract.deal.state.toLowerCase()}_assignment_v1`
    const template = getTemplate(stateId) ?? getTemplate('tx_assignment_v1')
    if (template) {
      for (const field of template.fields) {
        if (field.required && !filledData[field.key]?.trim()) {
          missingFieldCount++
        }
      }
    }

    // Build e-signature info
    const esignature = contract.pandadocDocumentId
      ? {
          documentId: contract.pandadocDocumentId,
          status: contract.pandadocStatus,
          sentAt: contract.pandadocSentAt,
          completedAt: contract.pandadocCompletedAt,
          declinedAt: contract.pandadocDeclinedAt,
          declineReason: contract.pandadocDeclineReason,
          signers: contract.signerStatuses ?? [],
        }
      : null

    return NextResponse.json({ contract, contractHistory, missingFieldCount, esignature })
  } catch (err) {
    logger.error('GET /api/contracts/[id] failed', { route: '/api/contracts/[id]', method: 'GET', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch contract', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── PATCH /api/contracts/[id] ──────────────────────────────────────────────
// Update fields and/or transition status.

// Valid status transitions: from → allowed targets
const STATUS_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: ['SENT', 'VOIDED'],
  SENT: ['EXECUTED', 'VOIDED'],
  EXECUTED: [],
  VOIDED: [],
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Rate limit: 10 contract updates per minute per user
    const rl = rateLimit(`contract-update:${profile.id}`, 10, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const tierGuard = await requireTier(profile.id, FEATURE_TIERS.contracts)
    if (tierGuard) return tierGuard

    const { id } = await params

    const contract = await prisma.contract.findFirst({
      where: { id, profileId: profile.id },
      include: {
        deal: true,
        offer: true,
      },
    })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    const { body, error: parseError } = await parseBody(req)
    if (!body) return NextResponse.json({ error: parseError }, { status: 400 })

    const { status: newStatus, voidReason, overrides, ...fieldUpdates } = body as {
      status?: ContractStatus
      voidReason?: string
      overrides?: Record<string, string>
      [key: string]: unknown
    }

    // ── Validate inputs ──
    const v = new Validator()
    if (newStatus !== undefined) v.enumValue('status', newStatus, ['DRAFT', 'SENT', 'EXECUTED', 'VOIDED'], 'Status')
    if (voidReason !== undefined) v.string('voidReason', voidReason, { maxLength: 500, label: 'Void reason' })
    if (overrides !== undefined && (typeof overrides !== 'object' || Array.isArray(overrides))) {
      v.custom('overrides', false, 'Overrides must be an object')
    }
    if (fieldUpdates.templateName !== undefined) v.string('templateName', fieldUpdates.templateName as string, { maxLength: 200, label: 'Template name' })
    if (!v.isValid()) return v.toResponse()

    const data: Record<string, unknown> = {}

    // ── Field updates ──
    const allowedFields = [
      'templateName',
    ]
    for (const key of allowedFields) {
      if (key in fieldUpdates && fieldUpdates[key] !== undefined) {
        data[key] = fieldUpdates[key]
      }
    }

    // ── filledData overrides ──
    let shouldRegeneratePdf = false
    if (overrides && typeof overrides === 'object') {
      const currentFilledData = (contract.filledData as Record<string, string>) ?? {}
      const sanitizedOverrides: Record<string, string> = {}
      for (const [k, val] of Object.entries(overrides)) {
        sanitizedOverrides[k] = typeof val === 'string' ? sanitizeString(val) : val
      }
      data.filledData = { ...currentFilledData, ...sanitizedOverrides }
      shouldRegeneratePdf = true
    }

    // ── Status transition ──
    if (newStatus) {
      const currentStatus = contract.status
      const allowed = STATUS_TRANSITIONS[currentStatus as ContractStatus]

      if (!allowed || !allowed.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed?.join(', ') || 'none'}` },
          { status: 400 },
        )
      }

      data.status = newStatus

      switch (newStatus) {
        case 'SENT':
          // Trigger PandaDoc e-signature if configured
          if (isPandaDocConfigured()) {
            try {
              const filledData = (contract.filledData as Record<string, string>) ?? {}
              const templateType = contract.templateName.includes('Double Close')
                ? 'DOUBLE_CLOSE'
                : contract.templateName.includes('Joint Venture')
                  ? 'JV_AGREEMENT'
                  : 'ASSIGNMENT'

              const signers = buildSignersFromContract(filledData, templateType)

              if (signers.length < 2) {
                return NextResponse.json(
                  { error: 'At least 2 signers with email addresses are required for e-signatures. Check assignor/assignee email fields.' },
                  { status: 400 },
                )
              }

              // Generate PDF for PandaDoc if not already generated
              let pdfBuffer: Buffer | null = null
              if (contract.documentUrl) {
                try {
                  const fileContent = await fs.readFile(contract.documentUrl)
                  pdfBuffer = Buffer.from(fileContent)
                } catch {
                  // File not found, regenerate below
                }
              }

              if (!pdfBuffer) {
                const stateId = `${contract.deal.state.toLowerCase()}_assignment_v1`
                const template = getTemplate(stateId) ?? getTemplate('tx_assignment_v1')
                if (template) {
                  const fillInput: FillContractInput = {
                    deal: {
                      address: contract.deal.address, city: contract.deal.city,
                      state: contract.deal.state, zip: contract.deal.zip,
                      askingPrice: contract.deal.askingPrice, assignFee: contract.deal.assignFee,
                      closeByDate: contract.deal.closeByDate, arv: contract.deal.arv,
                      condition: contract.deal.condition, propertyType: contract.deal.propertyType,
                      beds: contract.deal.beds, baths: contract.deal.baths,
                      sqft: contract.deal.sqft, yearBuilt: contract.deal.yearBuilt,
                    },
                    offer: contract.offer
                      ? { amount: contract.offer.amount, closeDate: contract.offer.closeDate, terms: contract.offer.terms, message: contract.offer.message }
                      : null,
                    buyer: {},
                    profile: { firstName: profile.firstName, lastName: profile.lastName, email: profile.email, phone: profile.phone, company: profile.company },
                    overrides: filledData,
                  }
                  const filled = fillContract(template, fillInput)
                  const html = renderContractHTML(filled, { isDraft: false })
                  const result = await generateContractPDF(html)
                  pdfBuffer = result.buffer
                }
              }

              if (pdfBuffer) {
                const propertyAddr = `${contract.deal.address}, ${contract.deal.city}, ${contract.deal.state}`
                const docResult = await createDocument(
                  contract.id,
                  pdfBuffer,
                  signers,
                  `Contract: ${propertyAddr}`,
                  `Please review and sign the assignment contract for the property at ${propertyAddr}.`,
                )
                data.pandadocDocumentId = docResult.documentId
                data.pandadocStatus = 'document.sent'
                data.pandadocSentAt = new Date()
              }
            } catch (dsErr) {
              logger.warn('PandaDoc document creation failed, contract still marked SENT', {
                contractId: id,
                error: dsErr instanceof Error ? dsErr.message : String(dsErr),
              })
              // Don't block the SENT transition — contract proceeds without e-signature
            }
          }
          break

        case 'VOIDED':
          if (!voidReason) {
            return NextResponse.json({ error: 'voidReason is required when voiding a contract' }, { status: 400 })
          }
          data.voidedAt = new Date()
          data.voidReason = voidReason

          // Void the PandaDoc document if one exists
          if (contract.pandadocDocumentId && isPandaDocConfigured()) {
            try {
              await voidDocument(contract.pandadocDocumentId, voidReason)
              data.pandadocStatus = 'document.voided'
            } catch (pdErr) {
              logger.warn('Failed to void PandaDoc document', {
                contractId: id,
                documentId: contract.pandadocDocumentId,
                error: pdErr instanceof Error ? pdErr.message : String(pdErr),
              })
            }
          }
          break

        case 'EXECUTED': {
          data.buyerSignedAt = contract.buyerSignedAt ?? new Date()
          data.sellerSignedAt = contract.sellerSignedAt ?? new Date()

          // Update linked offer to ACCEPTED and deal to CLOSED
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await prisma.$transaction(async (tx: any) => {
            if (contract.offerId) {
              const offer = await tx.offer.findUnique({ where: { id: contract.offerId } })
              if (offer && offer.status !== 'ACCEPTED') {
                await tx.offer.update({
                  where: { id: contract.offerId },
                  data: { status: 'ACCEPTED' as OfferStatus, signedAt: new Date() },
                })
              }
            }
            if (contract.deal.status !== 'CLOSED') {
              await tx.deal.update({
                where: { id: contract.dealId },
                data: { status: 'CLOSED' as DealStatus, closedAt: new Date() },
              })
            }
          })
          break
        }
      }
    }

    // ── Regenerate PDF if filledData changed ──
    if (shouldRegeneratePdf) {
      try {
        const filledData = data.filledData as Record<string, string>

        // Find the template
        const stateId = `${contract.deal.state.toLowerCase()}_assignment_v1`
        const template = getTemplate(stateId) ?? getTemplate('tx_assignment_v1')

        if (template) {
          // We need to rebuild the fill input to regenerate properly
          const buyer = contract.offerId
            ? await prisma.cashBuyer.findFirst({ where: { id: contract.offer?.buyerId ?? '' } })
            : null

          const fillInput: FillContractInput = {
            deal: {
              address: contract.deal.address,
              city: contract.deal.city,
              state: contract.deal.state,
              zip: contract.deal.zip,
              askingPrice: contract.deal.askingPrice,
              assignFee: contract.deal.assignFee,
              closeByDate: contract.deal.closeByDate,
              arv: contract.deal.arv,
              condition: contract.deal.condition,
              propertyType: contract.deal.propertyType,
              beds: contract.deal.beds,
              baths: contract.deal.baths,
              sqft: contract.deal.sqft,
              yearBuilt: contract.deal.yearBuilt,
            },
            offer: contract.offer
              ? { amount: contract.offer.amount, closeDate: contract.offer.closeDate, terms: contract.offer.terms, message: contract.offer.message }
              : null,
            buyer: buyer
              ? { firstName: buyer.firstName, lastName: buyer.lastName, entityName: buyer.entityName, phone: buyer.phone, email: buyer.email, address: buyer.address, city: buyer.city, state: buyer.state, zip: buyer.zip }
              : {},
            profile: { firstName: profile.firstName, lastName: profile.lastName, email: profile.email, phone: profile.phone, company: profile.company },
            overrides: filledData,
          }

          const filled = fillContract(template, fillInput)
          const isDraft = (data.status as string ?? contract.status) === 'DRAFT'
          const html = renderContractHTML(filled, { isDraft })
          const { buffer, contentType } = await generateContractPDF(html)

          const ext = contentType === 'application/pdf' ? 'pdf' : 'html'
          const dir = path.join('/tmp', 'contracts')
          await fs.mkdir(dir, { recursive: true })
          const filePath = path.join(dir, `${contract.id}.${ext}`)
          await fs.writeFile(filePath, buffer)
          data.documentUrl = filePath
        }
      } catch (pdfErr) {
        logger.warn('PDF regeneration failed during PATCH', { route: '/api/contracts/[id]', contractId: id, error: pdfErr instanceof Error ? pdfErr.message : String(pdfErr) })
      }
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: data as never,
      include: {
        deal: { select: { address: true, city: true, state: true, zip: true } },
        offer: { select: { amount: true, status: true } },
      },
    })

    // ── Create version snapshot ──
    ;(async () => {
      try {
        let changeType: ChangeType = 'fields_updated'
        const summaryParts: string[] = []

        if (newStatus) {
          changeType = 'status_changed'
          summaryParts.push(`Status changed from ${contract.status} to ${newStatus}`)
        }

        if (overrides && typeof overrides === 'object') {
          if (!newStatus) changeType = 'fields_updated'
          const { changedFields, previousValues } = detectChangedFields(
            (contract.filledData as Record<string, unknown>) ?? {},
            (updated.filledData as Record<string, unknown>) ?? {},
          )
          if (changedFields.length > 0) {
            summaryParts.push(`Updated ${changedFields.length} field${changedFields.length > 1 ? 's' : ''}: ${changedFields.slice(0, 5).join(', ')}${changedFields.length > 5 ? '...' : ''}`)
          }

          await createVersion({
            contractId: id,
            filledData: (updated.filledData as Record<string, unknown>) ?? null,
            documentUrl: updated.documentUrl,
            changeType,
            changeSummary: summaryParts.join('. ') || 'Contract updated',
            changedFields,
            previousValues,
            changedBy: profile.id,
          })
          return
        }

        if (newStatus || Object.keys(data).length > 0) {
          await createVersion({
            contractId: id,
            filledData: (updated.filledData as Record<string, unknown>) ?? null,
            documentUrl: updated.documentUrl,
            changeType,
            changeSummary: summaryParts.join('. ') || 'Contract updated',
            changedFields: [],
            previousValues: {},
            changedBy: profile.id,
          })
        }
      } catch (vErr) {
        logger.warn('Failed to create contract version', { contractId: id, error: vErr instanceof Error ? vErr.message : String(vErr) })
      }
    })()

    // Log activity for status changes
    if (newStatus) {
      logActivity({
        buyerId: contract.offer?.buyerId ?? '',
        profileId: profile.id,
        type: 'contract_status_changed',
        title: `Contract for ${contract.deal.address} changed to ${newStatus}`,
        metadata: { contractId: contract.id, from: contract.status, to: newStatus },
      })

      // Fire-and-forget email notification
      const notifyType = newStatus as ContractNotificationType
      if (['SENT', 'EXECUTED', 'VOIDED'].includes(notifyType)) {
        ;(async () => {
          try {
            // Fetch buyer info for the notification
            const contractWithBuyer = await prisma.contract.findUnique({
              where: { id },
              include: {
                deal: { select: { address: true, city: true, state: true, zip: true, askingPrice: true, assignFee: true } },
                offer: {
                  select: {
                    amount: true,
                    buyer: { select: { firstName: true, lastName: true, entityName: true, email: true } },
                  },
                },
              },
            })

            if (!contractWithBuyer) return

            const result = await sendContractNotification(notifyType, {
              ...contractWithBuyer,
              filledData: (contractWithBuyer.filledData as Record<string, string>) ?? {},
            }, profile)

            // Append to notification log in filledData
            const currentData = (contractWithBuyer.filledData as Record<string, unknown>) ?? {}
            const log: NotificationLogEntry[] = (currentData._notifications as NotificationLogEntry[]) ?? []
            log.push({
              type: notifyType,
              recipients: result.recipients,
              success: result.success,
              timestamp: result.timestamp,
              ...(result.errors ? { errors: result.errors } : {}),
            })

            await prisma.contract.update({
              where: { id },
              data: { filledData: { ...currentData, _notifications: log } as never },
            })

            logger.info('Contract notification sent', { contractId: id, type: notifyType, recipients: result.recipients, success: result.success })
          } catch (err) {
            logger.warn('Contract notification failed', { contractId: id, type: notifyType, error: err instanceof Error ? err.message : String(err) })
          }
        })()
      }
    }

    return NextResponse.json({ contract: updated })
  } catch (err) {
    logger.error('PATCH /api/contracts/[id] failed', { route: '/api/contracts/[id]', method: 'PATCH', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to update contract', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── DELETE /api/contracts/[id] ─────────────────────────────────────────────
// Only DRAFT contracts can be hard-deleted.

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const contract = await prisma.contract.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    if (contract.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft contracts can be deleted. Void the contract instead.' },
        { status: 400 },
      )
    }

    // Clean up PDF file if it exists
    if (contract.documentUrl) {
      try {
        await fs.unlink(contract.documentUrl)
      } catch {
        // File may not exist, that's fine
      }
    }

    await prisma.contract.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('DELETE /api/contracts/[id] failed', { route: '/api/contracts/[id]', method: 'DELETE', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to delete contract', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
