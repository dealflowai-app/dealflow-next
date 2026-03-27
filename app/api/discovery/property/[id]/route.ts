import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAuthProfile } from '@/lib/auth'
import { getDataProvider } from '@/lib/discovery/data-provider'
import { toClientProperty } from '@/lib/discovery/to-client-property'
import { estimateEquity } from '@/lib/discovery/owner-intelligence'
import { RentCastError } from '@/lib/rentcast'
import { BatchDataApiError } from '@/lib/batchdata'
import type { EquityData, DistressSignals } from '@/lib/discovery/unified-types'
import type { BatchDataProperty } from '@/lib/batchdata/types'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Rate limit: 30 property detail views per minute per user
    const rl = rateLimit(`discovery-property:${profile.id}`, 30, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const { id } = await context.params

    const provider = getDataProvider()

    // ── Look up the cached property row first ─────────────────────────────
    const row = await prisma.discoveryProperty.findUnique({ where: { id } })
    if (!row) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    let clientProperty = toClientProperty(row)
    const rawResponse = (row.rawResponse as Record<string, unknown>) ?? {}
    const currentLevel = (rawResponse.enrichmentLevel as number) ?? 0

    // ── BatchData tiered enrichment ─────────────────────────────────────
    // If this property came from a BatchData search (Tier 0), enrich it
    // with full detail data (Tier 2) on first detail view.
    let detail = null

    if (provider.hasBatchData && currentLevel < 2) {
      try {
        const address = {
          street: row.addressLine1,
          city: row.city,
          state: row.state,
          zip: row.zipCode ?? '',
        }
        const enriched = await provider.enrichProperty(address, 2)

        if (enriched && Object.keys(enriched).length > 0) {
          // Update cache with enriched data, including full BatchData object
          const enrichedRaw = {
            ...rawResponse,
            enrichmentLevel: 2,
            enrichedAt: new Date().toISOString(),
            dataSource: 'batchdata',
            // Store the full BatchData object for future extraction
            ...(enriched._batchdataRaw ? { batchdata: enriched._batchdataRaw } : {}),
            owner: enriched.owner ?? null,
            assessment: enriched.assessment ?? null,
            mortgage: enriched.mortgage ?? null,
            lastSale: enriched.lastSale ?? null,
            estimatedValue: enriched.assessment?.marketValue ?? null,
            listing: enriched.listingStatus ? {
              status: enriched.listingStatus,
              daysOnMarket: enriched.daysOnMarket ?? null,
              listPrice: enriched.listPrice ?? null,
              originalListPrice: enriched.originalListPrice ?? null,
              listingDate: enriched.listingDate ?? null,
              agent: enriched.listingAgent ?? null,
            } : (rawResponse.listing ?? null),
          }

          await prisma.discoveryProperty.update({
            where: { id },
            data: {
              ownerName: enriched.ownerName ?? row.ownerName,
              assessedValue: enriched.assessedValue ?? row.assessedValue,
              taxAmount: enriched.taxAmount ?? row.taxAmount,
              lastSaleDate: enriched.lastSaleDate ? new Date(enriched.lastSaleDate) : row.lastSaleDate,
              lastSalePrice: enriched.lastSalePrice ?? row.lastSalePrice,
              ownerOccupied: enriched.ownerOccupied ?? row.ownerOccupied,
              rawResponse: enrichedRaw as unknown as Prisma.InputJsonValue,
            },
          })

          // Re-read the updated row for the response
          const updated = await prisma.discoveryProperty.findUnique({ where: { id } })
          if (updated) clientProperty = toClientProperty(updated)

          detail = enriched
        }
      } catch (enrichErr) {
        // Enrichment failed — continue with base data but log the error
        logger.error('Property enrichment failed', { error: enrichErr instanceof Error ? enrichErr.message : String(enrichErr) })
      }
    } else if (!provider.hasBatchData) {
      // RentCast detail path
      const lookupKey = `${row.addressLine1}, ${row.city}, ${row.state} ${row.zipCode ?? ''}`

      try {
        detail = await provider.getPropertyDetail(lookupKey)
      } catch {
        // Detail enrichment failed — we still return the cached base data
      }
    } else {
      // Already enriched — extract detail from cached rawResponse
      const batchdataRaw = rawResponse.batchdata as BatchDataProperty | undefined
      if (batchdataRaw) {
        const lastSaleDeed = batchdataRaw.deedHistory?.find(d => d.salePrice != null && d.salePrice > 0)
        detail = {
          owner: batchdataRaw.owner ?? null,
          assessment: batchdataRaw.valuation ? {
            assessedTotal: batchdataRaw.valuation.estimatedValue ?? null,
            assessedLand: null,
            assessedImprovement: null,
            marketValue: batchdataRaw.valuation.estimatedValue ?? null,
            taxYear: null,
            taxAmount: batchdataRaw.listing?.taxes?.find(t => t.amount != null)?.amount ?? null,
          } : null,
          mortgage: batchdataRaw.openLien?.mortgages?.length ? {
            totalLienAmount: batchdataRaw.openLien.totalOpenLienBalance ?? null,
            liens: batchdataRaw.openLien.mortgages.map((m, i) => ({
              position: i + 1,
              amount: m.loanAmount ?? m.currentEstimatedBalance ?? null,
              lenderName: m.lenderName ?? null,
              interestRate: m.currentEstimatedInterestRate ?? null,
              interestRateType: m.financingType ?? null,
              term: m.loanTermMonths ?? null,
              dueDate: m.dueDate ?? null,
            })),
          } : null,
          lastSale: lastSaleDeed ? {
            date: lastSaleDeed.saleDate ?? null,
            price: lastSaleDeed.salePrice ?? null,
            pricePerSqft: null,
            buyerName: lastSaleDeed.buyers?.[0] ?? null,
            sellerName: lastSaleDeed.sellers?.[0] ?? null,
          } : null,
          listing: batchdataRaw.listing ?? null,
          deedHistory: batchdataRaw.deedHistory ?? null,
          mortgageHistory: batchdataRaw.mortgageHistory ?? null,
          propertyOwnerProfile: batchdataRaw.propertyOwnerProfile ?? null,
          intel: batchdataRaw.intel ?? null,
        }
      } else {
        // Legacy cached data
        detail = {
          owner: rawResponse.owner ?? null,
          assessment: rawResponse.assessment ?? null,
          mortgage: rawResponse.mortgage ?? null,
          lastSale: rawResponse.lastSale ?? null,
          listing: rawResponse.listing ?? null,
        }
      }
    }

    // ── Fetch equity and distress data ──────────────────────────────────
    const enrichedRaw = (clientProperty.rawResponse as Record<string, unknown>) ?? {}
    let equityData: EquityData
    let distressSignals: DistressSignals

    if (provider.hasBatchData) {
      equityData = await provider.getEquityData(id, enrichedRaw)
      distressSignals = await provider.getDistressSignals(id, enrichedRaw)
    } else {
      equityData = buildFallbackEquity(clientProperty)
      distressSignals = buildDerivedDistress(clientProperty)
    }

    // ── Build response ────────────────────────────────────────────────────
    return NextResponse.json({
      property: clientProperty,
      detail,
      features: {
        equityData,
        distressSignals,
        mortgageData: (detail as Record<string, unknown>)?.mortgage ?? null,
        foreclosureData: distressSignals.foreclosure,
        dataSource: provider.primarySource,
      },
      dataSource: provider.primarySource,
    })
  } catch (err) {
    if (err instanceof BatchDataApiError) {
      logger.error(`BatchData error in property detail: ${err.status} ${err.endpoint}`)
      return NextResponse.json(
        { error: 'Property data provider error' },
        { status: 502 },
      )
    }
    if (err instanceof RentCastError) {
      logger.error(`RentCast error in property detail: ${err.status}`)
      return NextResponse.json(
        { error: 'Property data provider error' },
        { status: 502 },
      )
    }
    logger.error('Property detail error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Build equity estimate from cached property data */
function buildFallbackEquity(property: {
  assessedValue: number | null
  lastSalePrice: number | null
  lastSaleDate: string | null
}): EquityData {
  const est = estimateEquity({
    assessedValue: property.assessedValue,
    lastSalePrice: property.lastSalePrice,
    lastSaleDate: property.lastSaleDate,
  } as Parameters<typeof estimateEquity>[0])

  const equity = est.estimatedCurrentValue && est.lastSalePrice
    ? est.estimatedCurrentValue - est.lastSalePrice
    : null
  const equityPercent = equity != null && est.estimatedCurrentValue > 0
    ? Math.round((equity / est.estimatedCurrentValue) * 100)
    : null

  return {
    dataSource: 'rentcast',
    source: 'estimated',
    confidence: 'low',
    estimatedValue: est.estimatedCurrentValue || property.assessedValue,
    mortgageBalance: null,
    equity,
    equityPercent,
    ltv: null,
    avm: null,
  }
}

/**
 * Derive distress indicators from available RentCast / cached property data.
 *
 * Since RentCast doesn't provide foreclosure or tax-delinquent flags directly,
 * we infer potential distress from heuristics:
 *  - Tax assessment vs last-sale-price discrepancy (possible tax issues)
 *  - Long ownership + absentee owner (tired landlord / neglected property)
 *  - Listed well below assessed value (potential distress pricing)
 */
function buildDerivedDistress(property: {
  assessedValue?: number | null
  lastSalePrice?: number | null
  lastSaleDate?: string | Date | null
  taxAmount?: number | null
  ownerOccupied?: boolean | null
  listPrice?: number | null
  listingStatus?: string | null
  ownerName?: string | null
}): DistressSignals {
  // ── Tax delinquency heuristic ──────────────────────────────────────────
  // If we have an assessed value but tax amount is $0 or null while
  // assessed value is substantial, flag as potentially delinquent.
  // Also flag if tax-to-value ratio is abnormally low (< 0.1%) which
  // may indicate missed payments or assessment disputes.
  let taxDelinquent: DistressSignals['taxDelinquent'] = null

  if (property.assessedValue && property.assessedValue > 50_000) {
    const taxRate = property.taxAmount != null && property.assessedValue > 0
      ? property.taxAmount / property.assessedValue
      : null

    // A tax amount of $0 on a property worth >$50k is suspicious
    if (property.taxAmount === 0 || property.taxAmount === null) {
      taxDelinquent = {
        isDelinquent: false, // We can't confirm — only flag as suspect
        delinquentAmount: null,
        delinquentYears: null,
        taxLienAmount: null,
      }
    } else if (taxRate !== null && taxRate < 0.001) {
      // Tax rate under 0.1% of assessed value is unusually low
      taxDelinquent = {
        isDelinquent: false,
        delinquentAmount: null,
        delinquentYears: null,
        taxLienAmount: null,
      }
    }
  }

  // ── Foreclosure heuristic ──────────────────────────────────────────────
  // We cannot confirm foreclosure without court records, but we can detect
  // distress-pricing signals: listed significantly below assessed value.
  let foreclosure: DistressSignals['foreclosure'] = null

  const isAbsentee = property.ownerOccupied === false
  const listPrice = property.listPrice
  const assessed = property.assessedValue

  if (listPrice && assessed && assessed > 0) {
    const listToAssessedRatio = listPrice / assessed

    // Listed at 70% or less of assessed value — strong distress signal
    if (listToAssessedRatio <= 0.70) {
      foreclosure = {
        active: false,  // Cannot confirm without court records
        status: 'DISTRESS_PRICING',
        filingDate: null,
        defaultAmount: null,
        auctionDate: null,
      }
    }
  }

  // ── Long-hold absentee heuristic ───────────────────────────────────────
  // Absentee owner who purchased 10+ years ago with no recent sale may be
  // a tired landlord or an estate/probate situation — not foreclosure per se
  // but a motivating factor. Only set if we didn't already flag foreclosure.
  if (!foreclosure && isAbsentee && property.lastSaleDate) {
    const saleDate = typeof property.lastSaleDate === 'string'
      ? new Date(property.lastSaleDate)
      : property.lastSaleDate
    const yearsHeld = (Date.now() - saleDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

    if (yearsHeld >= 15) {
      foreclosure = {
        active: false,
        status: 'LONG_HOLD_ABSENTEE',
        filingDate: null,
        defaultAmount: null,
        auctionDate: null,
      }
    }
  }

  // ── Corporate / trust owner check ──────────────────────────────────────
  // Estates and trusts sometimes indicate probate or distress situations.
  // We note it in the foreclosure status if nothing else flagged.
  if (!foreclosure && property.ownerName) {
    const ownerLower = property.ownerName.toLowerCase()
    const isEstate = ownerLower.includes('estate') || ownerLower.includes('heir')
    if (isEstate) {
      foreclosure = {
        active: false,
        status: 'POSSIBLE_ESTATE',
        filingDate: null,
        defaultAmount: null,
        auctionDate: null,
      }
    }
  }

  const hasAnySignal = foreclosure !== null || taxDelinquent !== null

  return {
    dataSource: 'rentcast',
    available: hasAnySignal,
    upgradeRequired: true, // Still recommend BatchData for confirmed data
    foreclosure,
    taxDelinquent,
    probate: null,
  }
}
