import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { getDataProvider } from '@/lib/discovery/data-provider'
import { toClientProperty } from '@/lib/discovery/to-client-property'
import { estimateEquity } from '@/lib/discovery/owner-intelligence'
import { AttomApiError } from '@/lib/attom'
import { RentCastError } from '@/lib/rentcast'
import type { EquityData, DistressSignals } from '@/lib/discovery/unified-types'

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

    const clientProperty = toClientProperty(row)

    // ── Fetch enriched detail from provider ───────────────────────────────
    // For ATTOM: pass the DB id (which may be an attomId if sourced from ATTOM)
    // For RentCast: pass the address string for lookup
    const lookupKey = provider.hasAttom
      ? id
      : `${row.addressLine1}, ${row.city}, ${row.state} ${row.zipCode ?? ''}`

    let detail = null
    try {
      detail = await provider.getPropertyDetail(lookupKey)
    } catch {
      // Detail enrichment failed — we still return the cached base data
    }

    // ── Fetch equity and distress data in parallel ────────────────────────
    let equityData: EquityData
    let distressSignals: DistressSignals

    if (provider.hasAttom) {
      const [equity, distress] = await Promise.all([
        provider.getEquityData(id).catch((): EquityData => buildFallbackEquity(clientProperty)),
        provider.getDistressSignals(id).catch((): DistressSignals => buildNoDistress('attom')),
      ])
      equityData = equity
      distressSignals = distress
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
        mortgageData: detail?.mortgage ?? null,
        foreclosureData: distressSignals.foreclosure,
        dataSource: provider.primarySource,
      },
      dataSource: provider.primarySource,
    })
  } catch (err) {
    if (err instanceof AttomApiError) {
      console.error(`ATTOM error in property detail: ${err.status} ${err.endpoint}`)
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

/** Build equity estimate from cached property data (no ATTOM) */
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
function buildNoDistress(source: 'attom' | 'rentcast'): DistressSignals {
  return {
    dataSource: source,
    available: false,
    upgradeRequired: source === 'rentcast',
    foreclosure: null,
    taxDelinquent: null,
    probate: null,
  }
}
