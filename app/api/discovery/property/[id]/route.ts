import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAuthProfile } from '@/lib/auth'
import { getDataProvider } from '@/lib/discovery/data-provider'
import { toClientProperty } from '@/lib/discovery/to-client-property'
import { estimateEquity } from '@/lib/discovery/owner-intelligence'
import { RentCastError } from '@/lib/rentcast'
import { BatchDataApiError } from '@/lib/batchdata'
import type { EquityData, DistressSignals, DataSource } from '@/lib/discovery/unified-types'
import type { BatchDataProperty } from '@/lib/batchdata/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

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
        console.error('Property enrichment failed:', enrichErr instanceof Error ? enrichErr.message : enrichErr)
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
      distressSignals = buildNoDistress('rentcast')
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
      console.error(`BatchData error in property detail: ${err.status} ${err.endpoint}`)
      return NextResponse.json(
        { error: 'Property data provider error' },
        { status: 502 },
      )
    }
    if (err instanceof RentCastError) {
      console.error(`RentCast error in property detail: ${err.status}`)
      return NextResponse.json(
        { error: 'Property data provider error' },
        { status: 502 },
      )
    }
    console.error('Property detail error:', err)
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

/** Distress signals unavailable placeholder */
function buildNoDistress(source: DataSource): DistressSignals {
  return {
    dataSource: source,
    available: false,
    upgradeRequired: source === 'rentcast',
    foreclosure: null,
    taxDelinquent: null,
    probate: null,
  }
}
