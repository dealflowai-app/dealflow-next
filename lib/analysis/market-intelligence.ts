/**
 * Market Intelligence Service
 *
 * Gathers real-time market context for any location by combining:
 * - RentCast property data (price trends from recent sales)
 * - Platform data (deals, listings, buyers from our DB)
 * - FRED API (mortgage rates)
 *
 * Produces a 0-100 market health score that feeds into the deal scorer's
 * market strength factor (15pts max).
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getRentCastClient, type RentCastProperty } from '@/lib/rentcast'
import { withRetry } from '@/lib/resilience'

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface MarketIntelligence {
  location: {
    city: string
    state: string
    zip: string | null
    county: string | null
  }

  priceTrends: {
    medianPrice: number | null
    avgPricePerSqft: number | null
    priceChange6Month: number | null
    priceChange12Month: number | null
    trend: 'rising' | 'falling' | 'stable' | 'unknown'
    dataPoints: number
    monthlyMedians: Array<{ month: string; median: number; count: number }>
  }

  inventory: {
    activeDealCount: number
    activeListingCount: number
    avgDaysToClose: number | null
    supplyLevel: 'low' | 'moderate' | 'high' | 'unknown'
  }

  demand: {
    activeBuyerCount: number
    highConfidenceBuyerCount: number
    recentSearchCount: number
    demandLevel: 'low' | 'moderate' | 'high' | 'unknown'
  }

  cashBuyerActivity: {
    cashSalePercentage: number | null
    avgCashBuyerScore: number | null
    recentCashPurchases: number
  }

  macro: {
    mortgageRate30yr: number | null
    mortgageRateTrend: 'rising' | 'falling' | 'stable' | 'unknown'
    lastUpdated: string | null
  }

  assessment: {
    score: number
    level: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold'
    summary: string
    signals: MarketSignal[]
  }

  meta: {
    generatedAt: string
    dataSources: string[]
    cached: boolean
  }
}

export interface MarketSignal {
  type: 'positive' | 'negative' | 'neutral'
  signal: string
  impact: 'high' | 'medium' | 'low'
}

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const FRED_SERIES_ID = 'MORTGAGE30US'
const FRED_API_KEY = process.env.FRED_API_KEY ?? null
const DEFAULT_MORTGAGE_RATE = 7.0

/** In-memory cache for mortgage rate (updates weekly, cache 24h) */
let mortgageRateCache: {
  rate: number
  trend: 'rising' | 'falling' | 'stable' | 'unknown'
  lastUpdated: string
  fetchedAt: number
} | null = null

const MORTGAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000

// ─── PRICE TREND ANALYSIS ──────────────────────────────────────────────────

interface MonthBucket {
  month: string // "2025-09"
  prices: number[]
}

function analyzePriceTrends(properties: RentCastProperty[]): MarketIntelligence['priceTrends'] {
  // Filter to properties with recent sale data
  const withSales = properties.filter(
    (p) => p.lastSaleDate && p.lastSalePrice && p.lastSalePrice > 0,
  )

  if (withSales.length === 0) {
    return {
      medianPrice: null,
      avgPricePerSqft: null,
      priceChange6Month: null,
      priceChange12Month: null,
      trend: 'unknown',
      dataPoints: 0,
      monthlyMedians: [],
    }
  }

  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1)

  // Filter to last 12 months
  const recentSales = withSales.filter((p) => {
    const saleDate = new Date(p.lastSaleDate!)
    return saleDate >= twelveMonthsAgo
  })

  if (recentSales.length === 0) {
    return {
      medianPrice: null,
      avgPricePerSqft: null,
      priceChange6Month: null,
      priceChange12Month: null,
      trend: 'unknown',
      dataPoints: withSales.length,
      monthlyMedians: [],
    }
  }

  // Group by month
  const buckets = new Map<string, MonthBucket>()
  for (const p of recentSales) {
    const d = new Date(p.lastSaleDate!)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!buckets.has(key)) {
      buckets.set(key, { month: key, prices: [] })
    }
    buckets.get(key)!.prices.push(p.lastSalePrice!)
  }

  // Calculate monthly medians (sorted chronologically)
  const monthlyMedians = Array.from(buckets.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((b) => ({
      month: b.month,
      median: median(b.prices),
      count: b.prices.length,
    }))

  // Overall median price
  const allPrices = recentSales.map((p) => p.lastSalePrice!)
  const medianPrice = median(allPrices)

  // Avg price per sqft
  const withSqft = recentSales.filter((p) => p.squareFootage && p.squareFootage > 0)
  const avgPricePerSqft =
    withSqft.length > 0
      ? Math.round(
          withSqft.reduce((sum, p) => sum + p.lastSalePrice! / p.squareFootage!, 0) /
            withSqft.length,
        )
      : null

  // Price change calculations
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  const sixMonthKey = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}`

  const recentMonths = monthlyMedians.filter((m) => m.month >= sixMonthKey)
  const olderMonths = monthlyMedians.filter((m) => m.month < sixMonthKey)

  let priceChange6Month: number | null = null
  let priceChange12Month: number | null = null

  if (recentMonths.length > 0 && olderMonths.length > 0) {
    const recentMedian = median(recentMonths.map((m) => m.median))
    const olderMedian = median(olderMonths.map((m) => m.median))
    if (olderMedian > 0) {
      priceChange6Month = Math.round(((recentMedian - olderMedian) / olderMedian) * 1000) / 10
    }
  }

  if (monthlyMedians.length >= 2) {
    const firstMedian = monthlyMedians[0].median
    const lastMedian = monthlyMedians[monthlyMedians.length - 1].median
    if (firstMedian > 0) {
      priceChange12Month = Math.round(((lastMedian - firstMedian) / firstMedian) * 1000) / 10
    }
  }

  // Determine trend
  let trend: 'rising' | 'falling' | 'stable' | 'unknown' = 'unknown'
  if (priceChange6Month != null) {
    if (priceChange6Month > 5) trend = 'rising'
    else if (priceChange6Month < -5) trend = 'falling'
    else trend = 'stable'
  }

  return {
    medianPrice,
    avgPricePerSqft,
    priceChange6Month,
    priceChange12Month,
    trend,
    dataPoints: recentSales.length,
    monthlyMedians,
  }
}

// ─── PLATFORM INVENTORY ────────────────────────────────────────────────────

async function getInventoryData(
  city: string,
  state: string,
): Promise<MarketIntelligence['inventory']> {
  try {
    const [dealCount, listingCount, closedDeals] = await Promise.all([
      prisma.deal.count({
        where: {
          city: { equals: city, mode: 'insensitive' },
          state: { equals: state, mode: 'insensitive' },
          status: { in: ['ACTIVE', 'UNDER_OFFER'] },
        },
      }),

      prisma.marketplaceListing.count({
        where: {
          city: { equals: city, mode: 'insensitive' },
          state: { equals: state, mode: 'insensitive' },
          status: 'ACTIVE',
        },
      }),

      prisma.deal.findMany({
        where: {
          city: { equals: city, mode: 'insensitive' },
          state: { equals: state, mode: 'insensitive' },
          status: 'CLOSED',
          closedAt: { not: null },
        },
        select: { createdAt: true, closedAt: true },
        take: 50,
        orderBy: { closedAt: 'desc' },
      }),
    ])

    // Calculate average days to close
    let avgDaysToClose: number | null = null
    if (closedDeals.length > 0) {
      const totalDays = closedDeals.reduce((sum, d) => {
        const days = Math.round(
          (d.closedAt!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        )
        return sum + days
      }, 0)
      avgDaysToClose = Math.round(totalDays / closedDeals.length)
    }

    // Supply level
    const totalActive = dealCount + listingCount
    let supplyLevel: 'low' | 'moderate' | 'high' | 'unknown' = 'unknown'
    if (totalActive > 20) supplyLevel = 'high'
    else if (totalActive > 5) supplyLevel = 'moderate'
    else supplyLevel = 'low'

    return {
      activeDealCount: dealCount,
      activeListingCount: listingCount,
      avgDaysToClose,
      supplyLevel,
    }
  } catch (err) {
    logger.warn('Failed to fetch inventory data', {
      error: err instanceof Error ? err.message : String(err),
      city,
      state,
    })
    return {
      activeDealCount: 0,
      activeListingCount: 0,
      avgDaysToClose: null,
      supplyLevel: 'unknown',
    }
  }
}

// ─── PLATFORM DEMAND ───────────────────────────────────────────────────────

async function getDemandData(
  city: string,
  state: string,
): Promise<MarketIntelligence['demand']> {
  try {
    // CashBuyer.preferredMarkets is a String[] — check if any element matches city or state
    const [activeBuyers, highConfBuyers, searchCount] = await Promise.all([
      prisma.cashBuyer.count({
        where: {
          isOptedOut: false,
          status: { not: 'DO_NOT_CALL' },
          preferredMarkets: { hasSome: [city, `${city}, ${state}`, state] },
        },
      }),

      prisma.cashBuyer.count({
        where: {
          isOptedOut: false,
          status: { not: 'DO_NOT_CALL' },
          buyerScore: { gte: 75 },
          preferredMarkets: { hasSome: [city, `${city}, ${state}`, state] },
        },
      }),

      // Analysis cache entries for this area in last 30 days (proxy for search activity)
      prisma.analysisCache.count({
        where: {
          rawAddress: { contains: city, mode: 'insensitive' },
          cachedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ])

    let demandLevel: 'low' | 'moderate' | 'high' | 'unknown' = 'unknown'
    if (activeBuyers > 50) demandLevel = 'high'
    else if (activeBuyers > 15) demandLevel = 'moderate'
    else demandLevel = 'low'

    return {
      activeBuyerCount: activeBuyers,
      highConfidenceBuyerCount: highConfBuyers,
      recentSearchCount: searchCount,
      demandLevel,
    }
  } catch (err) {
    logger.warn('Failed to fetch demand data', {
      error: err instanceof Error ? err.message : String(err),
      city,
      state,
    })
    return {
      activeBuyerCount: 0,
      highConfidenceBuyerCount: 0,
      recentSearchCount: 0,
      demandLevel: 'unknown',
    }
  }
}

// ─── CASH BUYER ACTIVITY ───────────────────────────────────────────────────

async function getCashBuyerActivity(
  city: string,
  state: string,
  properties: RentCastProperty[],
): Promise<MarketIntelligence['cashBuyerActivity']> {
  try {
    // Heuristic: if lastSalePrice < assessedValue * 0.85, likely cash/investor purchase
    const recentSales = properties.filter(
      (p) => p.lastSaleDate && p.lastSalePrice && p.lastSalePrice > 0,
    )
    let cashSalePercentage: number | null = null

    if (recentSales.length >= 5) {
      const likelyCash = recentSales.filter((p) => {
        if (!p.assessedValue || p.assessedValue <= 0) return false
        return p.lastSalePrice! < p.assessedValue * 0.85
      })
      // Only calculate if we have assessed values to compare
      const withAssessed = recentSales.filter(
        (p) => p.assessedValue && p.assessedValue > 0,
      )
      if (withAssessed.length >= 3) {
        cashSalePercentage =
          Math.round((likelyCash.length / withAssessed.length) * 1000) / 10
      }
    }

    // Platform buyer data
    const buyersInMarket = await prisma.cashBuyer.findMany({
      where: {
        isOptedOut: false,
        status: { not: 'DO_NOT_CALL' },
        preferredMarkets: { hasSome: [city, `${city}, ${state}`, state] },
      },
      select: { buyerScore: true, cashPurchaseCount: true },
    })

    const avgCashBuyerScore =
      buyersInMarket.length > 0
        ? Math.round(
            buyersInMarket.reduce((sum, b) => sum + b.buyerScore, 0) /
              buyersInMarket.length,
          )
        : null

    const recentCashPurchases = buyersInMarket.reduce(
      (sum, b) => sum + b.cashPurchaseCount,
      0,
    )

    return {
      cashSalePercentage,
      avgCashBuyerScore,
      recentCashPurchases,
    }
  } catch (err) {
    logger.warn('Failed to fetch cash buyer activity', {
      error: err instanceof Error ? err.message : String(err),
    })
    return {
      cashSalePercentage: null,
      avgCashBuyerScore: null,
      recentCashPurchases: 0,
    }
  }
}

// ─── MORTGAGE RATE (FRED API) ──────────────────────────────────────────────

interface FREDObservation {
  date: string
  value: string
}

interface FREDResponse {
  observations: FREDObservation[]
}

async function getMortgageRate(): Promise<MarketIntelligence['macro']> {
  // Check in-memory cache
  if (mortgageRateCache && Date.now() - mortgageRateCache.fetchedAt < MORTGAGE_CACHE_TTL_MS) {
    return {
      mortgageRate30yr: mortgageRateCache.rate,
      mortgageRateTrend: mortgageRateCache.trend,
      lastUpdated: mortgageRateCache.lastUpdated,
    }
  }

  if (!FRED_API_KEY) {
    return {
      mortgageRate30yr: DEFAULT_MORTGAGE_RATE,
      mortgageRateTrend: 'unknown',
      lastUpdated: null,
    }
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${FRED_SERIES_ID}&api_key=${FRED_API_KEY}&sort_order=desc&limit=5&file_type=json`

    const data = await withRetry<FREDResponse>(
      async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`FRED API returned ${res.status}`)
        return res.json() as Promise<FREDResponse>
      },
      { maxRetries: 2, baseDelayMs: 1000, label: 'fred-mortgage-rate' },
    )

    const observations = data.observations.filter((o) => o.value !== '.')
    if (observations.length === 0) {
      return {
        mortgageRate30yr: DEFAULT_MORTGAGE_RATE,
        mortgageRateTrend: 'unknown',
        lastUpdated: null,
      }
    }

    const currentRate = parseFloat(observations[0].value)
    const lastUpdated = observations[0].date

    // Determine trend from recent observations
    let trend: 'rising' | 'falling' | 'stable' | 'unknown' = 'unknown'
    if (observations.length >= 3) {
      const latest = parseFloat(observations[0].value)
      const oldest = parseFloat(observations[observations.length - 1].value)
      const diff = latest - oldest
      if (diff > 0.15) trend = 'rising'
      else if (diff < -0.15) trend = 'falling'
      else trend = 'stable'
    }

    // Cache result
    mortgageRateCache = {
      rate: currentRate,
      trend,
      lastUpdated,
      fetchedAt: Date.now(),
    }

    return {
      mortgageRate30yr: currentRate,
      mortgageRateTrend: trend,
      lastUpdated,
    }
  } catch (err) {
    logger.warn('Failed to fetch mortgage rate from FRED', {
      error: err instanceof Error ? err.message : String(err),
    })
    return {
      mortgageRate30yr: DEFAULT_MORTGAGE_RATE,
      mortgageRateTrend: 'unknown',
      lastUpdated: null,
    }
  }
}

// ─── MARKET ASSESSMENT ─────────────────────────────────────────────────────

function assessMarket(
  priceTrends: MarketIntelligence['priceTrends'],
  inventory: MarketIntelligence['inventory'],
  demand: MarketIntelligence['demand'],
  cashBuyer: MarketIntelligence['cashBuyerActivity'],
  macro: MarketIntelligence['macro'],
  city: string,
  state: string,
): MarketIntelligence['assessment'] {
  const signals: MarketSignal[] = []
  let score = 0

  // ── Price trend strength (25pts) ──
  let priceTrendScore = 0
  if (priceTrends.trend === 'rising') {
    priceTrendScore = 20
    const changePct = priceTrends.priceChange6Month ?? 0
    if (changePct > 10) priceTrendScore = 25
    if (priceTrends.medianPrice != null) {
      signals.push({
        type: 'positive',
        signal: `Median SFR price in ${city} up ${changePct}% over 6 months (${dollars(priceTrends.medianPrice)} median)`,
        impact: changePct > 10 ? 'high' : 'medium',
      })
    }
  } else if (priceTrends.trend === 'stable') {
    priceTrendScore = 12
    signals.push({
      type: 'neutral',
      signal: `Prices stable in ${city} — ${priceTrends.priceChange6Month ?? 0}% change over 6 months`,
      impact: 'low',
    })
  } else if (priceTrends.trend === 'falling') {
    priceTrendScore = 5
    signals.push({
      type: 'negative',
      signal: `Prices declining in ${city} — ${priceTrends.priceChange6Month ?? 0}% over 6 months`,
      impact: 'high',
    })
  } else {
    priceTrendScore = 10 // unknown — partial credit
  }
  score += priceTrendScore

  // ── Demand level (25pts) ──
  let demandScore = 0
  if (demand.demandLevel === 'high') {
    demandScore = 25
    signals.push({
      type: 'positive',
      signal: `Strong buyer demand — ${demand.activeBuyerCount} active buyers targeting ${city}`,
      impact: 'high',
    })
  } else if (demand.demandLevel === 'moderate') {
    demandScore = 15
    signals.push({
      type: 'neutral',
      signal: `Moderate buyer demand — ${demand.activeBuyerCount} active buyers in market`,
      impact: 'medium',
    })
  } else if (demand.demandLevel === 'low') {
    demandScore = 5
    if (demand.activeBuyerCount === 0) {
      signals.push({
        type: 'negative',
        signal: `No active buyers targeting ${city} on the platform`,
        impact: 'medium',
      })
    } else {
      signals.push({
        type: 'negative',
        signal: `Low buyer demand — only ${demand.activeBuyerCount} buyers in ${city}`,
        impact: 'medium',
      })
    }
  } else {
    demandScore = 10
  }
  score += demandScore

  // ── Inventory tightness (20pts) — lower supply = better for wholesalers ──
  let inventoryScore = 0
  if (inventory.supplyLevel === 'low') {
    inventoryScore = 20
    signals.push({
      type: 'positive',
      signal: `Low inventory — ${inventory.activeDealCount} active deals, less competition`,
      impact: 'medium',
    })
  } else if (inventory.supplyLevel === 'moderate') {
    inventoryScore = 12
  } else if (inventory.supplyLevel === 'high') {
    inventoryScore = 5
    signals.push({
      type: 'negative',
      signal: `High inventory — ${inventory.activeDealCount} active deals competing in ${city}`,
      impact: 'medium',
    })
  } else {
    inventoryScore = 10
  }

  if (inventory.avgDaysToClose != null) {
    if (inventory.avgDaysToClose <= 30) {
      inventoryScore = Math.min(20, inventoryScore + 3)
      signals.push({
        type: 'positive',
        signal: `Fast deal velocity — average ${inventory.avgDaysToClose} days to close`,
        impact: 'medium',
      })
    } else if (inventory.avgDaysToClose > 90) {
      signals.push({
        type: 'negative',
        signal: `Slow deal velocity — average ${inventory.avgDaysToClose} days to close`,
        impact: 'medium',
      })
    }
  }
  score += inventoryScore

  // ── Cash buyer activity (15pts) ──
  let cashScore = 0
  if (cashBuyer.cashSalePercentage != null && cashBuyer.cashSalePercentage > 30) {
    cashScore = 15
    signals.push({
      type: 'positive',
      signal: `High cash buyer activity — estimated ${cashBuyer.cashSalePercentage}% of recent sales are investor/cash purchases`,
      impact: 'high',
    })
  } else if (cashBuyer.cashSalePercentage != null && cashBuyer.cashSalePercentage > 15) {
    cashScore = 10
    signals.push({
      type: 'neutral',
      signal: `Moderate cash buyer activity — ${cashBuyer.cashSalePercentage}% estimated investor purchases`,
      impact: 'low',
    })
  } else if (cashBuyer.recentCashPurchases > 10) {
    cashScore = 10
    signals.push({
      type: 'positive',
      signal: `${cashBuyer.recentCashPurchases} total cash purchases by CRM buyers in this market`,
      impact: 'medium',
    })
  } else {
    cashScore = 5 // partial credit
  }
  score += cashScore

  // ── Macro environment (15pts) ──
  let macroScore = 0
  if (macro.mortgageRate30yr != null) {
    if (macro.mortgageRate30yr < 6.0) {
      macroScore = 15
      signals.push({
        type: 'positive',
        signal: `Favorable rates — 30yr fixed at ${macro.mortgageRate30yr}%`,
        impact: 'medium',
      })
    } else if (macro.mortgageRate30yr < 7.0) {
      macroScore = 10
    } else if (macro.mortgageRate30yr < 8.0) {
      macroScore = 7
      if (macro.mortgageRateTrend === 'rising') {
        signals.push({
          type: 'negative',
          signal: `Rising mortgage rates at ${macro.mortgageRate30yr}% may slow buyer activity`,
          impact: 'medium',
        })
      }
    } else {
      macroScore = 3
      signals.push({
        type: 'negative',
        signal: `High mortgage rates at ${macro.mortgageRate30yr}% — reduced buyer pool for financed purchases`,
        impact: 'high',
      })
    }
  } else {
    macroScore = 7
  }
  score += macroScore

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, score))

  // Map to level
  let level: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold'
  if (score >= 80) level = 'hot'
  else if (score >= 60) level = 'warm'
  else if (score >= 40) level = 'neutral'
  else if (score >= 25) level = 'cool'
  else level = 'cold'

  // Generate summary
  const summary = buildMarketSummary(city, state, level, priceTrends, demand, cashBuyer, macro)

  return { score, level, summary, signals }
}

// ─── SUMMARY BUILDER ───────────────────────────────────────────────────────

function buildMarketSummary(
  city: string,
  state: string,
  level: string,
  priceTrends: MarketIntelligence['priceTrends'],
  demand: MarketIntelligence['demand'],
  cashBuyer: MarketIntelligence['cashBuyerActivity'],
  macro: MarketIntelligence['macro'],
): string {
  const parts: string[] = []

  const levelLabel =
    level === 'hot' ? 'hot' :
    level === 'warm' ? 'active' :
    level === 'neutral' ? 'moderate' :
    level === 'cool' ? 'slow' : 'cold'

  parts.push(`${city}, ${state}'s SFR market is ${levelLabel}.`)

  if (priceTrends.trend === 'rising' && priceTrends.priceChange6Month != null) {
    parts.push(`Prices are up ${priceTrends.priceChange6Month}% over 6 months.`)
  } else if (priceTrends.trend === 'falling' && priceTrends.priceChange6Month != null) {
    parts.push(`Prices are down ${Math.abs(priceTrends.priceChange6Month)}% over 6 months.`)
  }

  if (demand.activeBuyerCount > 0) {
    parts.push(
      `${demand.activeBuyerCount} active buyers are targeting this market` +
        (demand.highConfidenceBuyerCount > 0
          ? ` (${demand.highConfidenceBuyerCount} high-confidence).`
          : '.'),
    )
  }

  if (cashBuyer.cashSalePercentage != null && cashBuyer.cashSalePercentage > 20) {
    parts.push(`Strong cash buyer activity supports quick disposition.`)
  }

  if (macro.mortgageRate30yr != null && macro.mortgageRate30yr >= 7.5) {
    parts.push(`Elevated mortgage rates may favor cash buyers.`)
  }

  return parts.join(' ')
}

// ─── CACHE HELPERS ─────────────────────────────────────────────────────────

const MARKET_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

function marketCacheKey(city: string, state: string): string {
  return `market:${city.toUpperCase().trim()}:${state.toUpperCase().trim()}`
}

async function getCachedMarketIntelligence(
  profileId: string,
  city: string,
  state: string,
): Promise<MarketIntelligence | null> {
  try {
    const entry = await prisma.analysisCache.findUnique({
      where: {
        profileId_addressKey: {
          profileId,
          addressKey: marketCacheKey(city, state),
        },
      },
    })

    if (!entry || entry.expiresAt <= new Date()) {
      return null
    }

    const result = entry.result as unknown as MarketIntelligence
    return { ...result, meta: { ...result.meta, cached: true } }
  } catch {
    return null
  }
}

async function cacheMarketIntelligence(
  profileId: string,
  city: string,
  state: string,
  result: MarketIntelligence,
): Promise<void> {
  const key = marketCacheKey(city, state)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + MARKET_CACHE_TTL_MS)
  const jsonResult = JSON.parse(JSON.stringify(result))

  try {
    await prisma.analysisCache.upsert({
      where: {
        profileId_addressKey: { profileId, addressKey: key },
      },
      create: {
        profileId,
        addressKey: key,
        rawAddress: `${city}, ${state}`,
        result: jsonResult,
        apiCalls: 1,
        cachedAt: now,
        expiresAt,
      },
      update: {
        rawAddress: `${city}, ${state}`,
        result: jsonResult,
        apiCalls: 1,
        cachedAt: now,
        expiresAt,
      },
    })
  } catch (err) {
    logger.warn('Market intelligence cache write failed', {
      error: err instanceof Error ? err.message : String(err),
      city,
      state,
    })
  }
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function dollars(value: number): string {
  return `$${Math.abs(value).toLocaleString()}`
}

// ─── MAIN FUNCTION ─────────────────────────────────────────────────────────

/**
 * Gather market intelligence for a city/state.
 *
 * Combines RentCast property data, platform DB metrics, and FRED mortgage rates
 * into a comprehensive market assessment with a 0-100 score.
 *
 * @param city - City name (e.g. "Atlanta")
 * @param state - State code (e.g. "GA")
 * @param zip - Optional zip code for more targeted data
 * @param profileId - User profile ID for caching
 */
export async function getMarketIntelligence(
  city: string,
  state: string,
  zip: string | null,
  profileId: string,
): Promise<MarketIntelligence> {
  const startTime = Date.now()

  // Check cache first
  const cached = await getCachedMarketIntelligence(profileId, city, state)
  if (cached) {
    logger.info('Market intelligence served from cache', { city, state })
    return cached
  }

  // Gather all data in parallel
  const [propertiesResult, inventoryResult, demandResult, macroResult] =
    await Promise.allSettled([
      // A. RentCast property search for price trends
      withRetry(
        () => {
          const client = getRentCastClient()
          return client.searchProperties({
            city,
            state,
            propertyType: 'Single Family',
            limit: 100,
          })
        },
        { maxRetries: 1, baseDelayMs: 2000, label: 'rentcast-market-search' },
      ),

      // B. Platform inventory data
      getInventoryData(city, state),

      // C. Platform demand data
      getDemandData(city, state),

      // E. Macro indicators
      getMortgageRate(),
    ])

  const properties =
    propertiesResult.status === 'fulfilled' ? propertiesResult.value : []
  const inventory =
    inventoryResult.status === 'fulfilled'
      ? inventoryResult.value
      : { activeDealCount: 0, activeListingCount: 0, avgDaysToClose: null, supplyLevel: 'unknown' as const }
  const demand =
    demandResult.status === 'fulfilled'
      ? demandResult.value
      : { activeBuyerCount: 0, highConfidenceBuyerCount: 0, recentSearchCount: 0, demandLevel: 'unknown' as const }
  const macro =
    macroResult.status === 'fulfilled'
      ? macroResult.value
      : { mortgageRate30yr: DEFAULT_MORTGAGE_RATE, mortgageRateTrend: 'unknown' as const, lastUpdated: null }

  // Analyze price trends from properties
  const priceTrends = analyzePriceTrends(properties)

  // D. Cash buyer activity (depends on properties from step A)
  const cashBuyerActivity = await getCashBuyerActivity(city, state, properties)

  // Detect county from first property if available
  const county = properties.find((p) => p.county)?.county ?? null

  // F. Market assessment
  const assessment = assessMarket(
    priceTrends,
    inventory,
    demand,
    cashBuyerActivity,
    macro,
    city,
    state,
  )

  // Track data sources
  const dataSources: string[] = []
  if (propertiesResult.status === 'fulfilled') dataSources.push('rentcast')
  dataSources.push('platform_db')
  if (FRED_API_KEY && macroResult.status === 'fulfilled') dataSources.push('fred')

  const result: MarketIntelligence = {
    location: { city, state, zip, county },
    priceTrends,
    inventory,
    demand,
    cashBuyerActivity,
    macro,
    assessment,
    meta: {
      generatedAt: new Date().toISOString(),
      dataSources,
      cached: false,
    },
  }

  // Cache the result (6hr TTL)
  await cacheMarketIntelligence(profileId, city, state, result)

  const durationMs = Date.now() - startTime
  logger.info('Market intelligence generated', {
    city,
    state,
    score: assessment.score,
    level: assessment.level,
    dataPoints: priceTrends.dataPoints,
    durationMs,
  })

  return result
}
