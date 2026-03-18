/**
 * Master Deal Analyzer
 *
 * Chains property lookup, ARV calculation, repair estimation, flip/rental
 * analysis, and deal scoring into a single complete analysis result.
 */

import { logger } from '@/lib/logger'
import { analyzeProperty, type AnalysisInput, type PropertyAnalysis } from './property-lookup'
import { calculateARV, type ARVResult } from './arv-calculator'
import { estimateRepairCost, type RepairEstimate } from './repair-estimator'
import { calculateFlipProfit, type FlipAnalysis } from './flip-calculator'
import { calculateRentalAnalysis, type RentalAnalysis } from './rental-calculator'
import { calculateDealScore, type DealScore } from './deal-scorer'
import { getMarketIntelligence, type MarketIntelligence } from './market-intelligence'
import { getNeighborhoodIntelligence, type NeighborhoodIntelligence } from './neighborhood-intel'
import { generateAIAnalysis, type AIAnalysisSummary } from './ai-summary'

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface FullDealAnalysis {
  property: PropertyAnalysis
  arv: ARVResult
  repairs: RepairEstimate
  flip: FlipAnalysis | null
  rental: RentalAnalysis | null
  dealScore: DealScore | null
  market: MarketIntelligence | null
  neighborhood: NeighborhoodIntelligence | null
  aiSummary: AIAnalysisSummary | null
  analyzedAt: string
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Run a complete deal analysis: property data, ARV, repairs, flip, rental, and score.
 *
 * Requires an asking price for flip/rental/score calculations. If no asking price
 * is provided, returns property data + ARV + repairs only (flip/rental/score = null).
 *
 * @param input - Address, asking price, repair cost override, condition
 * @param profileId - User profile ID for caching
 */
export async function runFullAnalysis(
  input: AnalysisInput,
  profileId: string,
): Promise<FullDealAnalysis> {
  const startTime = Date.now()

  // 1. Property data + comps + rent estimate from RentCast
  const property = await analyzeProperty(input, profileId)

  // 2. ARV calculation from comps
  const arv = calculateARV(
    {
      sqft: property.property.sqft,
      beds: property.property.beds,
      baths: property.property.baths,
      yearBuilt: property.property.yearBuilt,
      propertyType: property.property.propertyType,
    },
    property.valuation.comparables,
    property.valuation.estimatedValue,
    input.condition ?? null,
  )

  // 3. Repair estimate
  const repairs = estimateRepairCost(
    {
      sqft: property.property.sqft,
      beds: property.property.beds,
      baths: property.property.baths,
      yearBuilt: property.property.yearBuilt,
    },
    input.condition ?? null,
    input.repairCost ?? null,
  )

  // 4. Market intelligence (best-effort — don't block analysis if it fails)
  let market: MarketIntelligence | null = null
  try {
    market = await getMarketIntelligence(
      property.property.city,
      property.property.state,
      property.property.zip,
      profileId,
    )
  } catch (err) {
    logger.warn('Market intelligence failed, using default market score', {
      error: err instanceof Error ? err.message : String(err),
      city: property.property.city,
      state: property.property.state,
    })
  }

  // 4b. Neighborhood intelligence (best-effort — runs in parallel where possible)
  let neighborhood: NeighborhoodIntelligence | null = null
  if (property.property.zip) {
    try {
      neighborhood = await getNeighborhoodIntelligence(
        {
          zip: property.property.zip,
          city: property.property.city ?? '',
          state: property.property.state ?? '',
          askingPrice: input.askingPrice ?? null,
          sqft: property.property.sqft,
          profileId,
        },
        arv.scoredComps,
        market,
      )
    } catch (err) {
      logger.warn('Neighborhood intelligence failed', {
        error: err instanceof Error ? err.message : String(err),
        zip: property.property.zip,
      })
    }
  }

  // 5. Flip, rental, and score require both an asking price and an ARV
  let flip: FlipAnalysis | null = null
  let rental: RentalAnalysis | null = null
  let dealScore: DealScore | null = null

  const askingPrice = input.askingPrice
  const arvValue = arv.arv

  if (askingPrice != null && askingPrice > 0 && arvValue != null && arvValue > 0) {
    // Flip analysis
    flip = calculateFlipProfit({
      purchasePrice: askingPrice,
      arv: arvValue,
      arvLow: arv.arvLow ?? arvValue,
      arvHigh: arv.arvHigh ?? arvValue,
      repairs,
      condition: input.condition,
      assessedValue: property.property.assessedValue,
    })

    // Rental analysis (needs rent estimate)
    const monthlyRent = property.rental.estimatedRent
    if (monthlyRent != null && monthlyRent > 0) {
      rental = calculateRentalAnalysis({
        purchasePrice: askingPrice,
        monthlyRent,
        rentLow: property.rental.rentLow ?? monthlyRent,
        rentHigh: property.rental.rentHigh ?? monthlyRent,
        repairCost: repairs.total,
        assessedValue: property.property.assessedValue,
      })
    }

    // Deal score
    dealScore = calculateDealScore({
      purchasePrice: askingPrice,
      arv,
      flip,
      rental: rental ?? {
        monthlyRent: 0,
        monthlyRentRange: { low: 0, high: 0 },
        monthlyExpenses: {
          mortgage: 0, taxes: 0, insurance: 0,
          maintenance: 0, vacancy: 0, propertyManagement: 0, total: 0,
        },
        monthlyCashFlow: 0,
        annualCashFlow: 0,
        cashOnCashReturn: 0,
        capRate: 0,
        totalCashNeeded: 0,
        breakEvenRent: 0,
        meetsMinCashFlow: false,
      },
      assessedValue: property.property.assessedValue,
      lastSalePrice: property.property.lastSalePrice,
      marketScore: market?.assessment.score ?? null,
      marketSummary: market?.assessment.summary ?? null,
      neighborhood,
    })
  }

  // 6. Assemble result (without AI summary first, since AI needs the full object)
  const result: FullDealAnalysis = {
    property,
    arv,
    repairs,
    flip,
    rental,
    dealScore,
    market,
    neighborhood,
    aiSummary: null,
    analyzedAt: new Date().toISOString(),
  }

  // 7. AI-written analysis (best-effort with 10s timeout)
  try {
    result.aiSummary = await generateAIAnalysis(result, 10_000)
  } catch (err) {
    logger.warn('AI summary generation failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const durationMs = Date.now() - startTime
  logger.info('Full deal analysis complete', {
    address: input.address,
    arvValue,
    repairCost: repairs.total,
    netProfit: flip?.netProfit ?? null,
    dealScore: dealScore?.score ?? null,
    hasAISummary: result.aiSummary != null,
    durationMs,
  })

  return result
}
