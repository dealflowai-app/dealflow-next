/**
 * AI Analysis Summary Generator
 *
 * Feeds the full deal analysis data to Claude and returns a structured
 * professional written analysis. Uses Sonnet for quality/speed/cost balance.
 */

import { logger } from '@/lib/logger'
import type { FullDealAnalysis } from './deal-analyzer'

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1000
const TEMPERATURE = 0.3

const SYSTEM_PROMPT = `You are a senior real estate investment analyst working for a wholesale deal analysis platform. You write concise, data-driven deal analyses for real estate wholesalers. Your tone is professional but direct — wholesalers are busy and want the bottom line fast.

Rules:
- Always cite specific numbers from the data (don't say "good spread" — say "32% spread ($80K)")
- Be honest about risks and limitations — if comp confidence is low, say so clearly
- Tailor advice to wholesalers specifically — they're assigning contracts, not buying to hold (unless the rental numbers are strong enough to mention)
- Keep each section to 2-4 sentences max
- Use plain language, not academic real estate jargon
- If data is missing or unreliable, acknowledge it rather than guessing

Respond ONLY with valid JSON matching the specified format. No markdown, no backticks, no preamble.`

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface AIAnalysisSummary {
  overview: string
  arvAnalysis: string
  profitAnalysis: string
  marketContext: string
  risksAndConsiderations: string
  recommendation: string
  bulletPoints: string[]
  generatedAt: string
  model: string
}

// ─── PROMPT BUILDER ─────────────────────────────────────────────────────────

function dollars(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  return `$${Math.abs(value).toLocaleString()}`
}

function pct(value: number | null | undefined): string {
  if (value == null) return 'N/A'
  return `${value}%`
}

function buildPrompt(analysis: FullDealAnalysis): string {
  const { property: prop, arv, repairs, flip, rental, dealScore, market, neighborhood } = analysis
  const p = prop.property
  const sections: string[] = []

  // ── Property ──
  sections.push(`Analyze this wholesale deal and provide your assessment.

PROPERTY:
Address: ${p.address}, ${p.city}, ${p.state} ${p.zip}
Type: ${p.propertyType ?? 'Unknown'} | ${p.beds ?? '?'}bd/${p.baths ?? '?'}ba | ${p.sqft ?? '?'} sqft | Built ${p.yearBuilt ?? 'Unknown'}
Owner: ${p.ownerName ?? 'Unknown'} | Owner-occupied: ${p.ownerOccupied ?? 'Unknown'}
Last sold: ${p.lastSaleDate ?? 'Unknown'} for ${dollars(p.lastSalePrice)}
Assessed value: ${dollars(p.assessedValue)}`)

  // ── ARV & Comps ──
  const arvValue = arv.arv
  const spread = arvValue != null && flip ? arvValue - flip.purchasePrice : null
  const spreadPct = arvValue != null && arvValue > 0 && flip
    ? Math.round(((arvValue - flip.purchasePrice) / arvValue) * 100)
    : null

  sections.push(`\nDEAL NUMBERS:
Asking price: ${flip ? dollars(flip.purchasePrice) : 'Not provided'}
ARV (our calculation): ${dollars(arvValue)} (confidence: ${arv.confidence.level}, score ${arv.confidence.score}/100, based on ${arv.compSummary.used} comps)
ARV range: ${dollars(arv.arvLow)} - ${dollars(arv.arvHigh)}
RentCast AVM: ${dollars(arv.breakdown.rentCastAVM)}${arv.breakdown.avmDifferencePercent != null ? ` (difference from our ARV: ${arv.breakdown.avmDifferencePercent}%)` : ''}
Spread: ${dollars(spread)} (${spreadPct != null ? `${spreadPct}%` : 'N/A'})`)

  // ── Comps (top 5 scored) ──
  const usedComps = arv.scoredComps
    .filter((c) => !c.excluded)
    .slice(0, 5)
  if (usedComps.length > 0) {
    const compLines = usedComps.map(
      (c) =>
        `  - ${c.address}: ${dollars(c.price)}, ${c.sqft ?? '?'} sqft, ${c.distance != null ? `${c.distance.toFixed(1)} mi` : '? mi'}, sold ${c.saleDate ?? 'Unknown'}, adjusted ${dollars(c.adjustedPrice)}, relevance ${c.relevanceScore}/100`,
    )
    sections.push(
      `\nCOMPARABLE SALES (${arv.compSummary.used} used, ${arv.compSummary.excluded} excluded):\n${compLines.join('\n')}`,
    )
  }

  // ── Repairs ──
  const topItems = repairs.breakdown
    .filter((item) => item.applies && item.mid > 0)
    .sort((a, b) => b.mid - a.mid)
    .slice(0, 4)
  sections.push(`\nREPAIR ESTIMATE: ${dollars(repairs.total)} (range: ${dollars(repairs.totalLow)} - ${dollars(repairs.totalHigh)})
Key items: ${topItems.map((i) => `${i.category} ${dollars(i.mid)}`).join(', ') || 'None'}`)

  // ── Flip Analysis ──
  if (flip) {
    sections.push(`\nFLIP ANALYSIS:
Total investment: ${dollars(flip.totalInvestment)}
Net profit: ${dollars(flip.netProfit)} (range: ${dollars(flip.netProfitLow)} - ${dollars(flip.netProfitHigh)})
ROI: ${flip.roi}% | Annualized ROI: ${flip.roiAnnualized}%
Hold time: ${flip.holdingCosts.months} months
Assignment fee: ${dollars(flip.assignmentFee)}
End buyer profit: ${dollars(flip.endBuyerProfit)} (ROI: ${flip.endBuyerROI}%)
Meets thresholds: Spread ${flip.meetsMinSpread ? 'YES' : 'NO'} | Profit ${flip.meetsMinProfit ? 'YES' : 'NO'} | ROI ${flip.meetsMinROI ? 'YES' : 'NO'}`)
  }

  // ── Rental Analysis ──
  if (rental) {
    sections.push(`\nRENTAL ANALYSIS:
Estimated rent: ${dollars(rental.monthlyRent)}/mo (range: ${dollars(rental.monthlyRentRange.low)} - ${dollars(rental.monthlyRentRange.high)})
Monthly cash flow: ${dollars(rental.monthlyCashFlow)}
Cap rate: ${pct(rental.capRate)} | Cash-on-cash return: ${pct(rental.cashOnCashReturn)}
Break-even rent: ${dollars(rental.breakEvenRent)}/mo`)
  }

  // ── Market Conditions ──
  if (market) {
    const m = market
    const signalLines = m.assessment.signals
      .slice(0, 4)
      .map((s) => `  - [${s.type}] ${s.signal}`)
      .join('\n')

    sections.push(`\nMARKET CONDITIONS (${m.location.city}, ${m.location.state}):
Median price: ${dollars(m.priceTrends.medianPrice)} | Avg $/sqft: ${dollars(m.priceTrends.avgPricePerSqft)}
6-month price trend: ${pct(m.priceTrends.priceChange6Month)} (${m.priceTrends.trend}) | Data points: ${m.priceTrends.dataPoints}
Active buyers in CRM: ${m.demand.activeBuyerCount} (${m.demand.highConfidenceBuyerCount} high-confidence)
Active deals on platform: ${m.inventory.activeDealCount} | Listings: ${m.inventory.activeListingCount}
Market assessment: ${m.assessment.level} (score: ${m.assessment.score}/100)
Mortgage rate: ${m.macro.mortgageRate30yr != null ? `${m.macro.mortgageRate30yr}%` : 'Unknown'} (${m.macro.mortgageRateTrend})
Key signals:\n${signalLines}`)
  }

  // ── Neighborhood Intelligence ──
  if (neighborhood) {
    const n = neighborhood
    const nSignals = n.signals.slice(0, 4).map((s) => `  - [${s.type}] ${s.signal}`).join('\n')
    sections.push(`\nNEIGHBORHOOD (Zip ${n.zip}):
Zip median price: ${n.zipPricing.medianPrice != null ? dollars(n.zipPricing.medianPrice) : 'N/A'} | Avg $/sqft: ${n.zipPricing.avgPricePerSqft != null ? dollars(n.zipPricing.avgPricePerSqft) : 'N/A'}
Zip vs city: ${n.zipPricing.comparedToCity != null ? `${n.zipPricing.comparedToCity > 0 ? '+' : ''}${n.zipPricing.comparedToCity}%` : 'N/A'} | 6-month trend: ${n.zipPricing.priceChange6Month != null ? `${n.zipPricing.priceChange6Month}%` : 'unknown'} (${n.zipPricing.trend})
CRM buyers targeting zip: ${n.buyerDemand.buyersTargetingZip} (${n.buyerDemand.highConfidenceInZip} high-confidence) | City: ${n.buyerDemand.buyersTargetingCity}
Demand vs supply: ${n.buyerDemand.demandVsSupply} | Competition: ${n.platformActivity.competitionLevel}
Nearby sales (0.5mi): ${n.surroundingProperties.nearbyRecentSales} | Neighborhood median: ${n.surroundingProperties.nearbyMedianPrice != null ? dollars(n.surroundingProperties.nearbyMedianPrice) : 'N/A'}
Price vs neighborhood: ${n.surroundingProperties.priceVsNeighborhood != null ? `${n.surroundingProperties.priceVsNeighborhood > 0 ? '+' : ''}${n.surroundingProperties.priceVsNeighborhood}%` : 'N/A'}
Signals:\n${nSignals || '  None'}`)
  }

  // ── Deal Score ──
  if (dealScore) {
    sections.push(`\nDEAL SCORE: ${dealScore.score}/100 (Grade: ${dealScore.grade})
Recommendation: ${dealScore.recommendation}
Strengths: ${dealScore.strengths.join('; ') || 'None identified'}
Risks: ${dealScore.risks.join('; ') || 'None identified'}`)
  }

  // ── Response format ──
  const responseFields: string[] = [
    '"overview": "2-3 sentence executive summary"',
    '"arvAnalysis": "paragraph about ARV confidence and what comps tell us"',
    '"profitAnalysis": "paragraph about profit potential (flip and/or rental)"',
  ]

  if (market) {
    responseFields.push('"marketContext": "paragraph about market conditions and timing"')
  } else {
    responseFields.push('"marketContext": ""')
  }

  responseFields.push(
    '"risksAndConsiderations": "paragraph about risks and things to verify"',
    '"recommendation": "1-2 sentence bottom line recommendation"',
    '"bulletPoints": ["key takeaway 1", "key takeaway 2", "...", "up to 7 points"]',
  )

  sections.push(`\nRespond with JSON:\n{\n  ${responseFields.join(',\n  ')}\n}`)

  return sections.join('\n')
}

// ─── RESPONSE PARSING ──────────────────────────────────────────────────────

function parseAIResponse(text: string): Omit<AIAnalysisSummary, 'generatedAt' | 'model'> | null {
  // Strip markdown backticks if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      overview: parsed.overview ?? '',
      arvAnalysis: parsed.arvAnalysis ?? '',
      profitAnalysis: parsed.profitAnalysis ?? '',
      marketContext: parsed.marketContext ?? '',
      risksAndConsiderations: parsed.risksAndConsiderations ?? '',
      recommendation: parsed.recommendation ?? '',
      bulletPoints: Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [],
    }
  } catch {
    return null
  }
}

function buildFallback(analysis: FullDealAnalysis): AIAnalysisSummary {
  const { dealScore, arv, flip, rental, market } = analysis
  return {
    overview: dealScore?.summary ?? 'Analysis complete. Review the data panels for details.',
    arvAnalysis: `ARV estimated at $${(arv.arv ?? 0).toLocaleString()} with ${arv.confidence.level} confidence based on ${arv.compSummary.used} comparable sales.`,
    profitAnalysis: flip
      ? `Projected net flip profit of $${flip.netProfit.toLocaleString()} with ${flip.roi}% ROI.`
      : 'Flip analysis not available — asking price required.',
    marketContext: market?.assessment.summary ?? '',
    risksAndConsiderations: dealScore?.risks.join('. ') ?? '',
    recommendation: dealScore
      ? `Deal score: ${dealScore.score}/100 (${dealScore.grade}). Recommendation: ${dealScore.recommendation.replace('_', ' ')}.`
      : '',
    bulletPoints: [
      ...(dealScore?.strengths.slice(0, 3) ?? []),
      ...(dealScore?.risks.slice(0, 3) ?? []),
      ...(rental && rental.monthlyCashFlow > 0
        ? [`Rental cash flow of $${rental.monthlyCashFlow.toLocaleString()}/mo`]
        : []),
    ].slice(0, 7),
    generatedAt: new Date().toISOString(),
    model: 'fallback',
  }
}

// ─── API CALL ──────────────────────────────────────────────────────────────

async function callClaude(
  userPrompt: string,
  timeoutMs: number = 15_000,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => 'Unknown error')
      logger.error('Anthropic API error in AI summary', {
        status: response.status,
        error: errBody,
      })
      return null
    }

    const result = await response.json() as {
      content?: Array<{ type: string; text: string }>
    }
    return result.content?.[0]?.text ?? null
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      logger.warn('AI summary generation timed out', { timeoutMs })
    } else {
      logger.error('AI summary generation failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ─── MAIN FUNCTION ─────────────────────────────────────────────────────────

/**
 * Generate a professional AI-written analysis from the full deal data.
 *
 * Calls Claude Sonnet with the complete analysis context and returns a
 * structured summary. Falls back to a data-derived summary if the API
 * call fails or times out.
 *
 * Returns null only if ANTHROPIC_API_KEY is not set.
 *
 * @param analysis - The complete FullDealAnalysis from the deal analyzer
 * @param timeoutMs - Max time to wait for Claude response (default 15s)
 */
export async function generateAIAnalysis(
  analysis: FullDealAnalysis,
  timeoutMs: number = 15_000,
): Promise<AIAnalysisSummary | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const prompt = buildPrompt(analysis)

  // Attempt 1
  let rawText = await callClaude(prompt, timeoutMs)
  let parsed = rawText ? parseAIResponse(rawText) : null

  // Retry once if parsing failed but we got a response
  if (rawText && !parsed) {
    logger.warn('AI summary JSON parse failed, retrying')
    rawText = await callClaude(prompt, timeoutMs)
    parsed = rawText ? parseAIResponse(rawText) : null
  }

  // If still no valid response, return fallback
  if (!parsed) {
    logger.warn('AI summary falling back to data-derived summary')
    return buildFallback(analysis)
  }

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
    model: MODEL,
  }
}
