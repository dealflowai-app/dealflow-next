import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { requireTier, FEATURE_TIERS } from '@/lib/subscription-guard'
import { checkDaisyChain } from '@/lib/daisy-chain'
import { autoMatchDeal } from '@/lib/auto-match'
import { Validator, sanitizeString, sanitizeHtml } from '@/lib/validation'
import { parseBody } from '@/lib/api-utils'
import type { PropertyType, DealStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'

const VALID_PROPERTY_TYPES = ['SFR', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'MOBILE_HOME', 'CONDO']
const VALID_CONDITIONS = ['distressed', 'fair', 'good', 'excellent']
const CURRENT_YEAR = new Date().getFullYear()

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const deals = await prisma.deal.findMany({
      where: { profileId: profile.id },
      include: {
        matches: {
          select: { id: true, matchScore: true },
        },
        offers: {
          select: { id: true, status: true, amount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ deals })
  } catch (err) {
    logger.error('GET /api/deals failed', { route: '/api/deals', method: 'GET', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch deals', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const tierGuard = await requireTier(profile.id, FEATURE_TIERS.deals)
    if (tierGuard) return tierGuard

    const { body, error: parseError } = await parseBody(req)
    if (!body) return NextResponse.json({ error: parseError }, { status: 400 })

    // ── Validate inputs ──
    const v = new Validator()
    v.require('address', body.address, 'Address')
    v.string('address', body.address, { maxLength: 200, label: 'Address' })
    v.require('city', body.city, 'City')
    v.string('city', body.city, { maxLength: 100, label: 'City' })
    v.require('state', body.state, 'State')
    v.stateCode('state', body.state, 'State')
    v.require('zip', body.zip, 'ZIP code')
    v.zip('zip', body.zip, 'ZIP code')
    v.require('askingPrice', body.askingPrice, 'Asking price')
    v.positiveInt('askingPrice', body.askingPrice, 'Asking price')
    v.intRange('askingPrice', body.askingPrice, 1, 100_000_000, 'Asking price')
    if (body.propertyType !== undefined) v.enumValue('propertyType', body.propertyType, VALID_PROPERTY_TYPES, 'Property type')
    if (body.beds !== undefined) v.intRange('beds', body.beds, 0, 99, 'Beds')
    if (body.baths !== undefined) v.intRange('baths', body.baths, 0, 20, 'Baths')
    if (body.sqft !== undefined) v.intRange('sqft', body.sqft, 0, 1_000_000, 'Square footage')
    if (body.yearBuilt !== undefined) v.intRange('yearBuilt', body.yearBuilt, 1800, CURRENT_YEAR + 1, 'Year built')
    if (body.assignFee !== undefined) v.positiveInt('assignFee', body.assignFee, 'Assignment fee')
    if (body.arv !== undefined) v.positiveInt('arv', body.arv, 'ARV')
    if (body.repairCost !== undefined) v.positiveInt('repairCost', body.repairCost, 'Repair cost')
    if (body.condition !== undefined) v.enumValue('condition', body.condition, VALID_CONDITIONS, 'Condition')
    if (body.notes !== undefined) v.string('notes', body.notes, { maxLength: 5000, label: 'Notes' })
    if (!v.isValid()) return v.toResponse()

    // Sanitize string inputs
    const address = sanitizeString(body.address as string)
    const city = sanitizeString(body.city as string)
    const state = (body.state as string).toUpperCase()
    const zip = sanitizeString(body.zip as string)
    const notes = body.notes ? sanitizeHtml(body.notes as string) : null

    // Run daisy chain detection
    const daisyChain = await checkDaisyChain(
      { address, city, state, zip, profileId: profile.id },
      prisma as never,
    )

    // If same wholesaler has existing deal and user hasn't forced, return warning
    const sameWholesalerDeals = daisyChain.existingDeals.filter((d) => d.isSameWholesaler)
    if (sameWholesalerDeals.length > 0 && body.force !== true) {
      return NextResponse.json({
        warning: daisyChain.warning,
        existingDealId: sameWholesalerDeals[0].id,
        existingDealStatus: sameWholesalerDeals[0].status,
        requiresForce: true,
      }, { status: 409 })
    }

    // Build analysisData with daisy chain flag if detected
    let analysisData: Prisma.InputJsonValue | undefined
    if (daisyChain.isDuplicate && (daisyChain.confidence === 'exact' || daisyChain.confidence === 'high')) {
      analysisData = {
        daisyChainFlag: true,
        daisyChainDetails: {
          confidence: daisyChain.confidence,
          matchCount: daisyChain.existingDeals.filter((d) => !d.isSameWholesaler).length,
          detectedAt: new Date().toISOString(),
        },
      }
    }

    const deal = await prisma.deal.create({
      data: {
        profileId: profile.id,
        address,
        city,
        state,
        zip,
        propertyType: ((body.propertyType as string) || 'SFR') as PropertyType,
        beds: body.beds != null ? Number(body.beds) : null,
        baths: body.baths != null ? Number(body.baths) : null,
        sqft: body.sqft != null ? Number(body.sqft) : null,
        yearBuilt: body.yearBuilt != null ? Number(body.yearBuilt) : null,
        condition: (body.condition as string) || null,
        askingPrice: Number(body.askingPrice),
        assignFee: body.assignFee != null ? Number(body.assignFee) : null,
        closeByDate: body.closeByDate ? new Date(body.closeByDate as string) : null,
        arv: body.arv != null ? Number(body.arv) : null,
        repairCost: body.repairCost != null ? Number(body.repairCost) : null,
        notes,
        status: ((body.status as string) || 'ACTIVE') as DealStatus,
        ...(analysisData ? { analysisData } : {}),
      },
    })

    // Auto-match: fire-and-forget so the response isn't delayed
    if (deal.status === 'ACTIVE') {
      autoMatchDeal(deal.id, profile.id, { notifyWholesaler: true, notifyBuyers: true })
        .catch((err) => logger.error('Auto-match on deal creation failed', { dealId: deal.id, error: String(err) }))
    }

    return NextResponse.json({
      deal,
      ...(daisyChain.warning ? { daisyChainWarning: daisyChain.warning } : {}),
    }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/deals failed', { route: '/api/deals', method: 'POST', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to create deal', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
