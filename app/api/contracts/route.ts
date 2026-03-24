import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { requireTier, FEATURE_TIERS } from '@/lib/subscription-guard'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { getTemplate, listTemplates } from '@/lib/contracts/templates'
import { fillContract, type FillContractInput } from '@/lib/contracts/fill'
import { generateContractPDF } from '@/lib/contracts/pdf'
import { renderContractHTML } from '@/lib/contracts/render'
import { ContractStatus } from '@prisma/client'
import { createInitialVersion } from '@/lib/contracts/versioning'
import { Validator, sanitizeString } from '@/lib/validation'
import { parseBody } from '@/lib/api-utils'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import fs from 'fs/promises'
import path from 'path'

const VALID_CONTRACT_TYPES = ['ASSIGNMENT', 'DOUBLE_CLOSE', 'JV_AGREEMENT']

// ─── GET /api/contracts ─────────────────────────────────────────────────────
// List all contracts for the current user, with optional status/dealId filters.

export async function GET(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const url = new URL(req.url)
    const statusFilter = url.searchParams.get('status')
    const dealId = url.searchParams.get('dealId')

    const where: Record<string, unknown> = { profileId: profile.id }
    if (statusFilter) where.status = statusFilter as ContractStatus
    if (dealId) where.dealId = dealId

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        deal: { select: { address: true, city: true, state: true, zip: true, askingPrice: true, status: true } },
        offer: {
          select: {
            amount: true,
            status: true,
            terms: true,
            buyer: { select: { firstName: true, lastName: true, entityName: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Compute daysInCurrentStatus for each contract and check for linked contracts
    const dealIds = Array.from(new Set(contracts.map(c => c.dealId)))
    const linkedCounts = dealIds.length > 0
      ? await prisma.contract.groupBy({
          by: ['dealId'],
          where: { dealId: { in: dealIds }, profileId: profile.id },
          _count: { _all: true },
        })
      : []
    const linkedMap = new Map(linkedCounts.map(c => [c.dealId, c._count._all]))

    const now = Date.now()
    const enriched = contracts.map(c => {
      // Days in current status: use voidedAt, buyerSignedAt, sellerSignedAt, updatedAt
      const lastStatusDate = c.voidedAt || c.buyerSignedAt || c.sellerSignedAt || c.updatedAt
      const daysInCurrentStatus = Math.floor((now - new Date(lastStatusDate).getTime()) / 86400000)

      // Check closingDate from filledData for expiry
      const filledData = c.filledData as Record<string, string> | null
      const closingDateStr = filledData?.closingDate
      let isExpiringSoon = false
      let daysUntilClosing: number | null = null
      if (closingDateStr) {
        const closingDate = new Date(closingDateStr)
        if (!isNaN(closingDate.getTime())) {
          daysUntilClosing = Math.ceil((closingDate.getTime() - now) / 86400000)
          isExpiringSoon = daysUntilClosing <= 7 && daysUntilClosing >= 0
        }
      }

      return {
        ...c,
        daysInCurrentStatus,
        isExpiringSoon,
        daysUntilClosing,
        hasLinkedContracts: (linkedMap.get(c.dealId) || 0) > 1,
      }
    })

    return NextResponse.json({ contracts: enriched })
  } catch (err) {
    logger.error('GET /api/contracts failed', { route: '/api/contracts', method: 'GET', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch contracts', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── POST /api/contracts ────────────────────────────────────────────────────
// Create a new contract. Supports two modes:
// 1. From deal + buyer: provide dealId + buyerId (auto-fills from DB data)
// 2. Manual entry: provide dealId + manualBuyer object (fills from provided info)

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const tierGuard = await requireTier(profile.id, FEATURE_TIERS.contracts)
    if (tierGuard) return tierGuard

    // Rate limit: 20 contract creations per minute
    const rl = rateLimit(`contracts:create:${profile.id}`, 20, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { body, error: parseError } = await parseBody(req)
    if (!body) return NextResponse.json({ error: parseError }, { status: 400 })

    const { dealId, offerId, buyerId, manualBuyer, templateId, type, overrides, generatePdf } = body as {
      dealId?: string
      offerId?: string
      buyerId?: string
      manualBuyer?: {
        firstName?: string
        lastName?: string
        entityName?: string
        phone?: string
        email?: string
        address?: string
        city?: string
        state?: string
        zip?: string
      }
      templateId?: string
      type?: string
      overrides?: Record<string, string>
      generatePdf?: boolean
    }

    // ── Validate inputs ──
    const v = new Validator()
    v.require('dealId', dealId, 'Deal ID')
    if (dealId !== undefined) v.string('dealId', dealId, { maxLength: 100, label: 'Deal ID' })
    if (!buyerId && !manualBuyer) {
      v.custom('buyer', false, 'buyerId or manualBuyer is required')
    }
    if (buyerId !== undefined) v.string('buyerId', buyerId, { maxLength: 100, label: 'Buyer ID' })
    if (offerId !== undefined) v.string('offerId', offerId, { maxLength: 100, label: 'Offer ID' })
    if (templateId !== undefined) v.string('templateId', templateId, { maxLength: 100, label: 'Template ID' })
    if (type !== undefined) v.enumValue('type', type, VALID_CONTRACT_TYPES, 'Contract type')
    if (overrides !== undefined && (typeof overrides !== 'object' || Array.isArray(overrides))) {
      v.custom('overrides', false, 'Overrides must be an object')
    }
    if (manualBuyer !== undefined) {
      if (typeof manualBuyer !== 'object' || Array.isArray(manualBuyer)) {
        v.custom('manualBuyer', false, 'manualBuyer must be an object')
      } else {
        if (manualBuyer.firstName !== undefined) v.string('manualBuyer.firstName', manualBuyer.firstName, { maxLength: 100, label: 'Buyer first name' })
        if (manualBuyer.lastName !== undefined) v.string('manualBuyer.lastName', manualBuyer.lastName, { maxLength: 100, label: 'Buyer last name' })
        if (manualBuyer.entityName !== undefined) v.string('manualBuyer.entityName', manualBuyer.entityName, { maxLength: 200, label: 'Buyer entity name' })
        if (manualBuyer.email !== undefined) v.email('manualBuyer.email', manualBuyer.email, 'Buyer email')
        if (manualBuyer.phone !== undefined) v.phone('manualBuyer.phone', manualBuyer.phone, 'Buyer phone')
      }
    }
    if (!v.isValid()) return v.toResponse()

    // Sanitize overrides string values
    let sanitizedOverrides = overrides
    if (overrides && typeof overrides === 'object') {
      sanitizedOverrides = {} as Record<string, string>
      for (const [k, val] of Object.entries(overrides)) {
        sanitizedOverrides[k] = typeof val === 'string' ? sanitizeString(val) : val
      }
    }

    // Fetch deal (verify ownership)
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, profileId: profile.id },
    })
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    // Fetch buyer from CRM if buyerId provided
    let buyer: {
      id?: string
      firstName: string | null
      lastName: string | null
      entityName: string | null
      phone: string | null
      email: string | null
      address: string | null
      city: string | null
      state: string | null
      zip: string | null
    } | null = null

    if (buyerId) {
      const crmBuyer = await prisma.cashBuyer.findFirst({
        where: { id: buyerId, profileId: profile.id },
      })
      if (!crmBuyer) return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
      buyer = crmBuyer
    } else if (manualBuyer) {
      // Manual entry — use provided info directly
      buyer = {
        firstName: manualBuyer.firstName ? sanitizeString(manualBuyer.firstName) : null,
        lastName: manualBuyer.lastName ? sanitizeString(manualBuyer.lastName) : null,
        entityName: manualBuyer.entityName ? sanitizeString(manualBuyer.entityName) : null,
        phone: manualBuyer.phone || null,
        email: manualBuyer.email || null,
        address: manualBuyer.address ? sanitizeString(manualBuyer.address) : null,
        city: manualBuyer.city ? sanitizeString(manualBuyer.city) : null,
        state: manualBuyer.state || null,
        zip: manualBuyer.zip || null,
      }
    }

    // Fetch offer if provided
    let offer: { id: string; amount: number; closeDate: Date | null; terms: string | null; message: string | null } | null = null
    if (offerId) {
      offer = await prisma.offer.findFirst({
        where: { id: offerId, dealId },
        select: { id: true, amount: true, closeDate: true, terms: true, message: true },
      })
      if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    // Auto-select template
    const contractType = (type as string) || 'ASSIGNMENT'
    let resolvedTemplateId = templateId as string | undefined
    let warning: string | undefined

    if (!resolvedTemplateId) {
      const stateId = `${deal.state.toLowerCase()}_assignment_v1`
      const stateTemplate = getTemplate(stateId)
      if (stateTemplate) {
        resolvedTemplateId = stateId
      } else {
        resolvedTemplateId = 'tx_assignment_v1'
        warning = `No template found for state ${deal.state}. Using Texas template as fallback.`
      }

      // If not assignment, try to find a matching type
      if (contractType === 'DOUBLE_CLOSE') {
        const dcId = `${deal.state.toLowerCase()}_double_close_v1`
        const dcTemplate = getTemplate(dcId)
        resolvedTemplateId = dcTemplate ? dcId : 'tx_double_close_v1'
      } else if (contractType === 'JV_AGREEMENT') {
        resolvedTemplateId = 'jv_agreement_v1'
      }
    }

    const template = getTemplate(resolvedTemplateId)
    if (!template) {
      return NextResponse.json({ error: `Template "${resolvedTemplateId}" not found` }, { status: 400 })
    }

    // Build fill input
    const fillInput: FillContractInput = {
      deal: {
        address: deal.address,
        city: deal.city,
        state: deal.state,
        zip: deal.zip,
        askingPrice: deal.askingPrice,
        assignFee: deal.assignFee,
        closeByDate: deal.closeByDate,
        arv: deal.arv,
        condition: deal.condition,
        propertyType: deal.propertyType,
        beds: deal.beds,
        baths: deal.baths,
        sqft: deal.sqft,
        yearBuilt: deal.yearBuilt,
      },
      offer: offer
        ? { amount: offer.amount, closeDate: offer.closeDate, terms: offer.terms, message: offer.message }
        : null,
      buyer: buyer
        ? {
            firstName: buyer.firstName,
            lastName: buyer.lastName,
            entityName: buyer.entityName,
            phone: buyer.phone,
            email: buyer.email,
            address: buyer.address,
            city: buyer.city,
            state: buyer.state,
            zip: buyer.zip,
          }
        : {},
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        company: profile.company,
      },
      overrides: sanitizedOverrides,
    }

    // Fill contract
    const filled = fillContract(template, fillInput)

    // Generate PDF if requested (default true)
    let documentUrl: string | null = null
    const shouldGeneratePdf = generatePdf !== false

    // Create the contract record
    const contract = await prisma.contract.create({
      data: {
        profileId: profile.id,
        dealId: deal.id,
        offerId: offer?.id ?? null,
        templateName: template.name,
        status: 'DRAFT' as ContractStatus,
        filledData: filled.filledData as never,
        documentUrl: null,
      },
      include: {
        deal: { select: { address: true, city: true, state: true, zip: true } },
        offer: { select: { amount: true, status: true } },
      },
    })

    if (shouldGeneratePdf) {
      try {
        const html = renderContractHTML(filled, { isDraft: true })
        const { buffer, contentType } = await generateContractPDF(html)

        const ext = contentType === 'application/pdf' ? 'pdf' : 'html'
        const dir = path.join('/tmp', 'contracts')
        await fs.mkdir(dir, { recursive: true })
        const filePath = path.join(dir, `${contract.id}.${ext}`)
        await fs.writeFile(filePath, buffer)

        documentUrl = filePath
        await prisma.contract.update({
          where: { id: contract.id },
          data: { documentUrl },
        })
      } catch (pdfErr) {
        logger.warn('PDF generation failed, contract still created', { route: '/api/contracts', contractId: contract.id, error: pdfErr instanceof Error ? pdfErr.message : String(pdfErr) })
      }
    }

    // Create initial version (v1) — fire-and-forget
    createInitialVersion(contract.id, filled.filledData as Record<string, unknown>, documentUrl, profile.id)
      .catch(err => logger.warn('Failed to create initial contract version', { route: '/api/contracts', contractId: contract.id, error: err instanceof Error ? err.message : String(err) }))

    // Log activity
    const buyerDisplay = buyer?.entityName || [buyer?.firstName, buyer?.lastName].filter(Boolean).join(' ') || 'Manual Entry'
    logActivity({
      buyerId: buyer?.id ?? '',
      profileId: profile.id,
      type: 'contract_created',
      title: `Contract generated for ${deal.address}`,
      metadata: { dealId: deal.id, contractId: contract.id, templateId: resolvedTemplateId, buyerName: buyerDisplay },
    })

    return NextResponse.json(
      {
        contract: { ...contract, documentUrl },
        missingFields: filled.missingFields,
        ...(warning ? { warning } : {}),
      },
      { status: 201 },
    )
  } catch (err) {
    logger.error('POST /api/contracts failed', { route: '/api/contracts', method: 'POST', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to create contract', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
