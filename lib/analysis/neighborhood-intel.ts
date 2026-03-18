/**
 * Neighborhood Intelligence Service
 *
 * Gathers hyperlocal data for a specific zip code by combining:
 * - Zip-level pricing from existing comps + optional RentCast search
 * - Buyer demand from CRM (preferredZips, preferredMarkets)
 * - Platform activity (deals, offers, analyses, listings in this zip)
 * - Nearby property context from scored comps
 * - Rule-based investment signals
 * - Optional AI narrative via Claude Haiku
 *
 * Cached 6 hours per zip per profile.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getRentCastClient } from '@/lib/rentcast'
import { withRetry } from '@/lib/resilience'
import type { ScoredComp } from './comp-engine'
import type { MarketIntelligence } from './market-intelligence'

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface NeighborhoodSignal {
  type: 'opportunity' | 'caution' | 'info'
  signal: string
  detail: string | null
}

export interface NeighborhoodIntelligence {
  zip: string
  city: string
  state: string

  zipPricing: {
    medianPrice: number | null
    avgPricePerSqft: number | null
    priceChange6Month: number | null
    comparedToCity: number | null
    saleVolume: number
    trend: 'rising' | 'falling' | 'stable' | 'unknown'
  }

  buyerDemand: {
    buyersTargetingZip: number
    buyersTargetingCity: number
    highConfidenceInZip: number
    recentPurchasesInZip: number
    demandVsSupply: 'undersupplied' | 'balanced' | 'oversupplied' | 'unknown'
    demandSignal: string
  }

  platformActivity: {
    activeDealsInZip: number
    recentOffersInZip: number
    avgDealScoreInZip: number | null
    marketplaceListingsInZip: number
    competitionLevel: 'low' | 'moderate' | 'high'
  }

  surroundingProperties: {
    nearbyRecentSales: number
    nearbyMedianPrice: number | null
    nearbyPricePerSqft: number | null
    priceVsNeighborhood: number | null
    neighborhoodTrend: string
  }

  signals: NeighborhoodSignal[]
  narrative: string | null
}

// ─── CACHE ──────────────────────────────────────────────────────────────────

const neighborhoodCache = new Map<string, { data: NeighborhoodIntelligence; expiresAt: number }>()
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

// Clean up every 30 minutes
setInterval(() => {
  const now = Date.now()
  neighborhoodCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) neighborhoodCache.delete(key)
  })
}, 30 * 60 * 1000)

// ─── HELPERS ────────────────────────────────────────────────────────────────

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

interface NeighborhoodInput {
  zip: string
  city: string
  state: string
  askingPrice: number | null
  sqft: number | null
  profileId: string
}

/**
 * Get neighborhood intelligence for a specific zip code.
 *
 * @param input - Property details including zip, city, state
 * @param comps - Scored comps from the ARV calculation
 * @param cityMarket - City-level market intelligence (optional, for comparison)
 */
export async function getNeighborhoodIntelligence(
  input: NeighborhoodInput,
  comps: ScoredComp[],
  cityMarket: MarketIntelligence | null,
): Promise<NeighborhoodIntelligence> {
  const { zip, city, state, askingPrice, sqft, profileId } = input
  const cacheKey = `neighborhood:${zip}:${profileId}`

  // Check cache
  const cached = neighborhoodCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  // Run all data gathering in parallel
  const [zipPricing, buyerDemand, platformActivity, surroundingProperties] = await Promise.all([
    gatherZipPricing(zip, state, comps, cityMarket),
    gatherBuyerDemand(zip, city, state, profileId),
    gatherPlatformActivity(zip, profileId),
    gatherSurroundingProperties(comps, askingPrice, sqft, zip),
  ])

  // Generate signals
  const signals = generateSignals(zip, zipPricing, buyerDemand, platformActivity, surroundingProperties)

  // AI narrative (best-effort)
  let narrative: string | null = null
  try {
    narrative = await generateNarrative(zip, city, state, zipPricing, buyerDemand, platformActivity, signals)
  } catch (err) {
    logger.warn('Neighborhood narrative generation failed', {
      error: err instanceof Error ? err.message : String(err),
      zip,
    })
  }

  const result: NeighborhoodIntelligence = {
    zip,
    city,
    state,
    zipPricing,
    buyerDemand,
    platformActivity,
    surroundingProperties,
    signals,
    narrative,
  }

  // Cache
  neighborhoodCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS })

  return result
}

// ─── A. ZIP-LEVEL PRICING ───────────────────────────────────────────────────

async function gatherZipPricing(
  zip: string,
  state: string,
  comps: ScoredComp[],
  cityMarket: MarketIntelligence | null,
): Promise<NeighborhoodIntelligence['zipPricing']> {
  // Start with comps in this zip
  const zipComps = comps.filter((c) => !c.excluded && c.zip === zip && c.price != null && c.price > 0)

  // If fewer than 3 zip comps, try to get more from RentCast
  let additionalSales: Array<{ price: number; date: string | null; sqft: number | null }> = []
  if (zipComps.length < 3) {
    try {
      const client = getRentCastClient()
      const results = await withRetry(
        () => client.searchProperties({ zipCode: zip, state, limit: 50 }),
        { maxRetries: 1, baseDelayMs: 1000, label: 'neighborhood-zip-search' },
      )
      additionalSales = results
        .filter((p) => p.lastSalePrice != null && p.lastSalePrice > 0)
        .map((p) => ({ price: p.lastSalePrice!, date: p.lastSaleDate, sqft: p.squareFootage }))
    } catch (err) {
      logger.warn('Failed to fetch additional zip data from RentCast', {
        error: err instanceof Error ? err.message : String(err),
        zip,
      })
    }
  }

  // Combine all zip prices
  const allPrices: number[] = [
    ...zipComps.map((c) => c.price!),
    ...additionalSales.map((s) => s.price),
  ]
  const allWithSqft = [
    ...zipComps.filter((c) => c.sqft != null).map((c) => ({ price: c.price!, sqft: c.sqft! })),
    ...additionalSales.filter((s) => s.sqft != null).map((s) => ({ price: s.price, sqft: s.sqft! })),
  ]

  const medianPrice = median(allPrices)
  const avgPricePerSqft = allWithSqft.length > 0
    ? Math.round(mean(allWithSqft.map((s) => s.price / s.sqft))!)
    : null

  // 6-month price change from zip sales
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

  const datedSales = [
    ...zipComps.filter((c) => c.saleDate).map((c) => ({ price: c.price!, date: new Date(c.saleDate!) })),
    ...additionalSales.filter((s) => s.date).map((s) => ({ price: s.price, date: new Date(s.date!) })),
  ].filter((s) => s.date >= sixMonthsAgo)

  const olderSales = datedSales.filter((s) => s.date < threeMonthsAgo)
  const recentSales = datedSales.filter((s) => s.date >= threeMonthsAgo)

  let priceChange6Month: number | null = null
  let trend: 'rising' | 'falling' | 'stable' | 'unknown' = 'unknown'

  if (olderSales.length >= 2 && recentSales.length >= 2) {
    const olderMedian = median(olderSales.map((s) => s.price))!
    const recentMedian = median(recentSales.map((s) => s.price))!
    if (olderMedian > 0) {
      priceChange6Month = Math.round(((recentMedian - olderMedian) / olderMedian) * 100 * 10) / 10
      if (priceChange6Month > 3) trend = 'rising'
      else if (priceChange6Month < -3) trend = 'falling'
      else trend = 'stable'
    }
  }

  // Compare to city median
  let comparedToCity: number | null = null
  if (medianPrice != null && cityMarket?.priceTrends.medianPrice != null && cityMarket.priceTrends.medianPrice > 0) {
    comparedToCity = Math.round(((medianPrice - cityMarket.priceTrends.medianPrice) / cityMarket.priceTrends.medianPrice) * 100)
  }

  return {
    medianPrice: medianPrice != null ? Math.round(medianPrice) : null,
    avgPricePerSqft,
    priceChange6Month,
    comparedToCity,
    saleVolume: datedSales.length,
    trend,
  }
}

// ─── B. BUYER DEMAND ────────────────────────────────────────────────────────

async function gatherBuyerDemand(
  zip: string,
  city: string,
  state: string,
  profileId: string,
): Promise<NeighborhoodIntelligence['buyerDemand']> {
  const cityMarket = `${city}, ${state}`

  // Parallel queries
  const [zipBuyers, cityBuyers] = await Promise.all([
    prisma.cashBuyer.findMany({
      where: {
        profileId,
        isOptedOut: false,
        status: { not: 'DO_NOT_CALL' },
        preferredZips: { has: zip },
      },
      select: { id: true, buyerScore: true, cashPurchaseCount: true },
    }),
    prisma.cashBuyer.count({
      where: {
        profileId,
        isOptedOut: false,
        status: { not: 'DO_NOT_CALL' },
        preferredMarkets: { has: cityMarket },
      },
    }),
  ])

  const buyersTargetingZip = zipBuyers.length
  const highConfidenceInZip = zipBuyers.filter((b) => b.buyerScore >= 75).length
  const recentPurchasesInZip = zipBuyers.reduce((sum, b) => sum + b.cashPurchaseCount, 0)

  // Determine demand vs supply
  const activeDealCount = await prisma.deal.count({
    where: {
      profileId,
      zip,
      status: { in: ['ACTIVE', 'UNDER_OFFER'] },
    },
  })

  let demandVsSupply: NeighborhoodIntelligence['buyerDemand']['demandVsSupply'] = 'unknown'
  if (buyersTargetingZip > 0 || activeDealCount > 0) {
    const ratio = activeDealCount > 0 ? buyersTargetingZip / activeDealCount : buyersTargetingZip
    if (ratio >= 3) demandVsSupply = 'undersupplied'
    else if (ratio >= 1) demandVsSupply = 'balanced'
    else demandVsSupply = 'oversupplied'
  }

  let demandSignal: string
  if (highConfidenceInZip > 0) {
    demandSignal = `${highConfidenceInZip} high-confidence buyer${highConfidenceInZip !== 1 ? 's' : ''} actively looking in ${zip}`
  } else if (buyersTargetingZip > 0) {
    demandSignal = `${buyersTargetingZip} buyer${buyersTargetingZip !== 1 ? 's' : ''} targeting ${zip}`
  } else {
    demandSignal = `No CRM buyers specifically targeting ${zip}`
  }

  return {
    buyersTargetingZip,
    buyersTargetingCity: cityBuyers,
    highConfidenceInZip,
    recentPurchasesInZip,
    demandVsSupply,
    demandSignal,
  }
}

// ─── C. PLATFORM ACTIVITY ───────────────────────────────────────────────────

async function gatherPlatformActivity(
  zip: string,
  profileId: string,
): Promise<NeighborhoodIntelligence['platformActivity']> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [activeDeals, recentOffers, listings, analyses] = await Promise.all([
    prisma.deal.count({
      where: { profileId, zip, status: { in: ['ACTIVE', 'UNDER_OFFER'] } },
    }),
    prisma.offer.count({
      where: {
        deal: { profileId, zip },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.marketplaceListing.count({
      where: {
        deal: { profileId, zip },
        status: 'ACTIVE',
      },
    }),
    // Avg deal score from recent analyses in this zip
    prisma.analysisCache.findMany({
      where: {
        profileId,
        cachedAt: { gte: thirtyDaysAgo },
      },
      select: { result: true, rawAddress: true },
    }),
  ])

  // Filter analyses by zip (rawAddress contains zip) and extract deal scores
  type AnalysisRow = { result: unknown; rawAddress: string | null }
  const zipAnalyses = analyses.filter((a: AnalysisRow) => {
    const r = a.result as Record<string, unknown> | null
    if (!r) return false
    const prop = (r.property as Record<string, unknown>)?.property as Record<string, unknown> | undefined
    return prop?.zip === zip
  })

  const dealScores: number[] = zipAnalyses
    .map((a: AnalysisRow) => {
      const r = a.result as Record<string, Record<string, unknown>> | null
      return (r?.dealScore as Record<string, unknown>)?.score as number | undefined
    })
    .filter((s: number | undefined): s is number => typeof s === 'number')

  const avgDealScoreInZip = dealScores.length > 0
    ? Math.round(dealScores.reduce((s: number, v: number) => s + v, 0) / dealScores.length)
    : null

  let competitionLevel: 'low' | 'moderate' | 'high'
  const totalActivity = activeDeals + listings
  if (totalActivity <= 2) competitionLevel = 'low'
  else if (totalActivity <= 5) competitionLevel = 'moderate'
  else competitionLevel = 'high'

  return {
    activeDealsInZip: activeDeals,
    recentOffersInZip: recentOffers,
    avgDealScoreInZip,
    marketplaceListingsInZip: listings,
    competitionLevel,
  }
}

// ─── D. SURROUNDING PROPERTIES ──────────────────────────────────────────────

function gatherSurroundingProperties(
  comps: ScoredComp[],
  askingPrice: number | null,
  sqft: number | null,
  zip: string,
): NeighborhoodIntelligence['surroundingProperties'] {
  // Filter to comps within 0.5 miles
  const nearbyComps = comps.filter(
    (c) => !c.excluded && c.distance != null && c.distance <= 0.5 && c.price != null && c.price > 0,
  )

  const nearbyPrices = nearbyComps.map((c) => c.price!)
  const nearbyMedianPrice = median(nearbyPrices) != null ? Math.round(median(nearbyPrices)!) : null

  const nearbyWithSqft = nearbyComps.filter((c) => c.sqft != null && c.sqft > 0)
  const nearbyPricePerSqft = nearbyWithSqft.length > 0
    ? Math.round(mean(nearbyWithSqft.map((c) => c.price! / c.sqft!))!)
    : null

  let priceVsNeighborhood: number | null = null
  if (askingPrice != null && nearbyMedianPrice != null && nearbyMedianPrice > 0) {
    priceVsNeighborhood = Math.round(((askingPrice - nearbyMedianPrice) / nearbyMedianPrice) * 100)
  }

  // Compare nearby median to zip-level comps
  const zipComps = comps.filter((c) => !c.excluded && c.zip === zip && c.price != null && c.price > 0)
  const zipMedian = median(zipComps.map((c) => c.price!))

  let neighborhoodTrend: string
  if (nearbyComps.length === 0) {
    neighborhoodTrend = 'Not enough nearby sales data to determine neighborhood trends'
  } else if (nearbyMedianPrice != null && zipMedian != null && zipMedian > 0) {
    const diff = Math.round(((nearbyMedianPrice - zipMedian) / zipMedian) * 100)
    if (Math.abs(diff) < 5) {
      neighborhoodTrend = `Prices in this immediate area are in line with the ${zip} average`
    } else if (diff > 0) {
      neighborhoodTrend = `Prices in this immediate area are ${diff}% above the ${zip} average`
    } else {
      neighborhoodTrend = `Prices in this immediate area are ${Math.abs(diff)}% below the ${zip} average`
    }
  } else {
    neighborhoodTrend = `${nearbyComps.length} recent sale${nearbyComps.length !== 1 ? 's' : ''} within 0.5mi`
  }

  return {
    nearbyRecentSales: nearbyComps.length,
    nearbyMedianPrice,
    nearbyPricePerSqft,
    priceVsNeighborhood,
    neighborhoodTrend,
  }
}

// ─── E. SIGNAL GENERATION ───────────────────────────────────────────────────

function generateSignals(
  zip: string,
  pricing: NeighborhoodIntelligence['zipPricing'],
  demand: NeighborhoodIntelligence['buyerDemand'],
  activity: NeighborhoodIntelligence['platformActivity'],
  surrounding: NeighborhoodIntelligence['surroundingProperties'],
): NeighborhoodSignal[] {
  const signals: NeighborhoodSignal[] = []

  // ── Opportunity signals (green) ──

  if (demand.highConfidenceInZip >= 3) {
    signals.push({
      type: 'opportunity',
      signal: `${demand.highConfidenceInZip} high-confidence buyers targeting this exact zip code`,
      detail: null,
    })
  } else if (demand.buyersTargetingZip >= 3) {
    signals.push({
      type: 'opportunity',
      signal: `${demand.buyersTargetingZip} CRM buyers targeting zip ${zip}`,
      detail: null,
    })
  }

  if (surrounding.priceVsNeighborhood != null && surrounding.priceVsNeighborhood <= -15) {
    signals.push({
      type: 'opportunity',
      signal: `Property priced ${Math.abs(surrounding.priceVsNeighborhood)}% below neighborhood median`,
      detail: surrounding.nearbyMedianPrice != null
        ? `Neighborhood median: $${surrounding.nearbyMedianPrice.toLocaleString()}`
        : null,
    })
  }

  if (pricing.priceChange6Month != null && pricing.priceChange6Month > 5) {
    signals.push({
      type: 'opportunity',
      signal: `Rising prices: zip up ${pricing.priceChange6Month}% in 6 months`,
      detail: null,
    })
  }

  if (activity.competitionLevel === 'low') {
    signals.push({
      type: 'opportunity',
      signal: `Low competition: only ${activity.activeDealsInZip} active deal${activity.activeDealsInZip !== 1 ? 's' : ''} in this zip`,
      detail: null,
    })
  }

  if (demand.demandVsSupply === 'undersupplied') {
    signals.push({
      type: 'opportunity',
      signal: `High demand: ${demand.buyersTargetingZip} buyers vs ${activity.activeDealsInZip} deals in area`,
      detail: null,
    })
  }

  // ── Caution signals (red) ──

  if (pricing.priceChange6Month != null && pricing.priceChange6Month < -5) {
    signals.push({
      type: 'caution',
      signal: `Prices declining in this zip (${pricing.priceChange6Month}% in 6 months)`,
      detail: null,
    })
  }

  if (activity.competitionLevel === 'high') {
    signals.push({
      type: 'caution',
      signal: `High competition: ${activity.activeDealsInZip + activity.marketplaceListingsInZip} other active deals/listings in this zip`,
      detail: null,
    })
  }

  if (demand.buyersTargetingZip === 0) {
    signals.push({
      type: 'caution',
      signal: 'No CRM buyers targeting this zip code',
      detail: demand.buyersTargetingCity > 0
        ? `${demand.buyersTargetingCity} buyers targeting the broader city market`
        : null,
    })
  }

  if (surrounding.priceVsNeighborhood != null && surrounding.priceVsNeighborhood > 10) {
    signals.push({
      type: 'caution',
      signal: `Property priced ${surrounding.priceVsNeighborhood}% above neighborhood median`,
      detail: null,
    })
  }

  // ── Info signals (blue) ──

  if (pricing.comparedToCity != null) {
    const dir = pricing.comparedToCity > 0 ? 'above' : 'below'
    signals.push({
      type: 'info',
      signal: `Zip code prices are ${Math.abs(pricing.comparedToCity)}% ${dir} city average`,
      detail: null,
    })
  }

  if (surrounding.nearbyRecentSales > 0) {
    signals.push({
      type: 'info',
      signal: `${surrounding.nearbyRecentSales} propert${surrounding.nearbyRecentSales !== 1 ? 'ies' : 'y'} sold within 0.5mi recently`,
      detail: null,
    })
  }

  if (activity.avgDealScoreInZip != null) {
    signals.push({
      type: 'info',
      signal: `Average deal score in this area: ${activity.avgDealScoreInZip}/100`,
      detail: null,
    })
  }

  return signals
}

// ─── F. AI NARRATIVE ────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

async function generateNarrative(
  zip: string,
  city: string,
  state: string,
  pricing: NeighborhoodIntelligence['zipPricing'],
  demand: NeighborhoodIntelligence['buyerDemand'],
  activity: NeighborhoodIntelligence['platformActivity'],
  signals: NeighborhoodSignal[],
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const signalSummary = signals.slice(0, 5).map((s) =>
    `[${s.type}] ${s.signal}`,
  ).join('\n')

  const prompt = `Write a 2-3 sentence neighborhood investment summary for real estate wholesalers.

Zip: ${zip}, ${city}, ${state}
Median price: ${pricing.medianPrice != null ? `$${pricing.medianPrice.toLocaleString()}` : 'N/A'}
6-month trend: ${pricing.priceChange6Month != null ? `${pricing.priceChange6Month}%` : 'unknown'} (${pricing.trend})
vs city: ${pricing.comparedToCity != null ? `${pricing.comparedToCity > 0 ? '+' : ''}${pricing.comparedToCity}%` : 'N/A'}
CRM buyers targeting zip: ${demand.buyersTargetingZip} (${demand.highConfidenceInZip} high-confidence)
Active deals in zip: ${activity.activeDealsInZip}
Competition: ${activity.competitionLevel}

Signals:
${signalSummary || 'None'}

Be specific, cite numbers. Plain text, no markdown.`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 200,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })

    if (!response.ok) return null

    const result = await response.json() as {
      content?: Array<{ type: string; text: string }>
    }
    return result.content?.[0]?.text?.trim() ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
