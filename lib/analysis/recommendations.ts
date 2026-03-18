/**
 * Deal Recommendations Engine
 *
 * Generates actionable next-step recommendations after a deal analysis:
 * - Priority actions for this specific deal
 * - Nearby properties worth investigating
 * - Specific CRM buyers to contact and why
 * - Strategic insights combining deal + market + neighborhood data
 *
 * All rule-based (no AI calls), uses only local DB queries and
 * data already present in the FullDealAnalysis. Targets < 500ms.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { FullDealAnalysis } from './deal-analyzer'

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ActionRecommendation {
  priority: 'high' | 'medium' | 'low'
  action: string
  reason: string
  cta: {
    label: string
    route?: string
    actionType: string
  }
}

export interface NearbyOpportunity {
  address: string
  city: string
  state: string
  zip: string
  propertyType: string | null
  lastSalePrice: number | null
  lastSaleDate: string | null
  assessedValue: number | null
  sqft: number | null
  beds: number | null
  yearBuilt: number | null
  ownerOccupied: boolean | null
  estimatedValue: number | null
  opportunityReason: string
  distanceFromSubject: number | null
  score: number
}

export interface BuyerAction {
  buyerId: string
  name: string
  matchScore: number
  action: string
  urgency: 'now' | 'soon' | 'later'
  reason: string
  lastContacted: string | null
  strategy: string | null
  proofOfFunds: boolean
}

export interface StrategicInsight {
  insight: string
  category: 'pricing' | 'timing' | 'market' | 'competition' | 'strategy'
  confidence: 'high' | 'medium' | 'low'
}

export interface DealRecommendations {
  actions: ActionRecommendation[]
  nearbyOpportunities: NearbyOpportunity[]
  buyerActions: BuyerAction[]
  strategicInsights: StrategicInsight[]
  generatedAt: string
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function dollars(v: number): string {
  return `$${Math.abs(v).toLocaleString()}`
}

function daysSince(date: Date | string | null): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

function monthsSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (30 * 86_400_000))
}

// ─── A. ACTION RECOMMENDATIONS ──────────────────────────────────────────────

function generateActions(
  analysis: FullDealAnalysis,
  matchedBuyerCount: number,
): ActionRecommendation[] {
  const actions: ActionRecommendation[] = []
  const { dealScore, flip, rental, repairs, neighborhood, arv } = analysis
  const score = dealScore?.score ?? 0
  const flipProfit = flip?.netProfit ?? 0
  const cashFlow = rental?.monthlyCashFlow ?? 0
  const repairCost = repairs.total
  const condition = arv.confidence.level

  // Strong deal + ready buyers
  if (score >= 80 && matchedBuyerCount >= 3) {
    actions.push({
      priority: 'high',
      action: `Strong deal with ready buyers. Save and blast to ${matchedBuyerCount} matched buyers immediately.`,
      reason: `${matchedBuyerCount} high-confidence buyers match this deal's profile. Deal score ${score}/100.`,
      cta: { label: 'Save & Blast', actionType: 'blast_buyers' },
    })
  }

  // Strong deal + no buyers
  if (score >= 80 && matchedBuyerCount === 0) {
    actions.push({
      priority: 'high',
      action: 'Excellent deal but no matching buyers in your CRM. List on the marketplace to reach other wholesalers\' buyers.',
      reason: `Deal score ${score}/100 but zero CRM buyers match. The marketplace expands your reach.`,
      cta: { label: 'List on Marketplace', actionType: 'list_marketplace' },
    })
  }

  // Solid deal
  if (score >= 60 && score < 80) {
    actions.push({
      priority: 'medium',
      action: 'Solid deal. Save to your pipeline and run matching to find interested buyers.',
      reason: `Deal scores ${score}/100 — meets core wholesale criteria.`,
      cta: { label: 'Save & Match', actionType: 'run_matching' },
    })
  }

  // Low score but profitable
  if (score < 60 && flipProfit > 20_000) {
    actions.push({
      priority: 'medium',
      action: 'Numbers work but low confidence. Verify the ARV with a local CMA before making an offer.',
      reason: `Flip profit of ${dollars(flipProfit)} looks good, but deal score is only ${score}/100.`,
      cta: { label: 'Save as Deal', actionType: 'save_deal' },
    })
  }

  // Very low score
  if (score > 0 && score < 40 && flipProfit <= 20_000) {
    actions.push({
      priority: 'low',
      action: 'This deal needs more analysis. The ARV confidence is low and profit margins are thin.',
      reason: `Deal score ${score}/100 with ${dollars(flipProfit)} projected profit.`,
      cta: { label: 'Save for Review', actionType: 'save_deal' },
    })
  }

  // Strong rental play
  if (cashFlow > 300) {
    actions.push({
      priority: 'medium',
      action: `Strong rental play. Even if the flip doesn't work, hold potential is solid at ${dollars(cashFlow)}/mo.`,
      reason: 'Positive rental cash flow adds a second exit strategy beyond assignment.',
      cta: { label: 'Save & Match', actionType: 'run_matching' },
    })
  }

  // Heavy rehab
  if (repairCost > 50_000) {
    actions.push({
      priority: 'medium',
      action: `Heavy rehab deal. Make sure your buyers can handle ${dollars(repairCost)} in repairs. Target flippers with deep pockets.`,
      reason: 'Repair costs are significant — narrow your outreach to experienced rehab investors.',
      cta: { label: 'Match to Buyers', actionType: 'run_matching' },
    })
  }

  // Buyers targeting zip
  if (neighborhood && neighborhood.buyerDemand.buyersTargetingZip >= 3) {
    const count = neighborhood.buyerDemand.buyersTargetingZip
    actions.push({
      priority: 'high',
      action: `${count} buyers in your CRM specifically target this zip code. This deal sells fast.`,
      reason: `High buyer concentration in zip ${neighborhood.zip} means faster disposition.`,
      cta: { label: 'Save & Blast', actionType: 'blast_buyers' },
    })
  }

  // Low competition
  if (neighborhood && neighborhood.platformActivity.competitionLevel === 'low') {
    actions.push({
      priority: 'medium',
      action: 'Low competition in this zip. You have time to negotiate without pressure.',
      reason: `Only ${neighborhood.platformActivity.activeDealsInZip} active deal(s) in zip ${neighborhood.zip}.`,
      cta: { label: 'Save as Deal', actionType: 'save_deal' },
    })
  }

  // Low ARV confidence
  if (condition === 'low' || condition === 'very_low') {
    actions.push({
      priority: 'medium',
      action: 'Low comp confidence — get an agent BPO or drive the comps before committing.',
      reason: `ARV confidence is ${condition} (${arv.confidence.score}/100). Verify before offering.`,
      cta: { label: 'Save for Review', actionType: 'save_deal' },
    })
  }

  // Sort by priority
  const order = { high: 0, medium: 1, low: 2 }
  actions.sort((a, b) => order[a.priority] - order[b.priority])

  // Deduplicate by actionType — keep highest priority for each
  const seen = new Set<string>()
  return actions.filter((a) => {
    if (seen.has(a.cta.actionType)) return false
    seen.add(a.cta.actionType)
    return true
  })
}

// ─── B. NEARBY OPPORTUNITIES ────────────────────────────────────────────────

function findNearbyOpportunities(analysis: FullDealAnalysis): NearbyOpportunity[] {
  const { arv, neighborhood } = analysis
  const zipMedian = neighborhood?.zipPricing.medianPrice
  const opportunities: NearbyOpportunity[] = []

  // Examine all comps (including excluded) for undervalued properties
  for (const comp of arv.scoredComps) {
    if (!comp.price || comp.price <= 0) continue

    // Skip comps that sold very recently at high prices — not opportunities
    const monthsAgo = monthsSince(comp.saleDate)
    if (monthsAgo != null && monthsAgo < 6) continue

    let score = 0
    const reasons: string[] = []

    // Sold below zip median
    if (zipMedian && comp.price < zipMedian * 0.75) {
      score += 30
      reasons.push(`Sold ${Math.round((1 - comp.price / zipMedian) * 100)}% below zip median`)
    }

    // Old purchase = equity built
    if (monthsAgo != null && monthsAgo > 24) {
      score += Math.min(25, Math.round(monthsAgo / 3))
      reasons.push(`Purchased ${Math.round(monthsAgo / 12)} years ago`)
    }

    // Low price per sqft compared to area
    const areaAvgPpsf = neighborhood?.zipPricing.avgPricePerSqft
    if (comp.pricePerSqft != null && areaAvgPpsf != null && comp.pricePerSqft < areaAvgPpsf * 0.7) {
      score += 20
      reasons.push(`${Math.round(comp.pricePerSqft)}/sqft vs area avg ${Math.round(areaAvgPpsf)}/sqft`)
    }

    // Far from subject — still in area but may be overlooked
    if (comp.distance != null && comp.distance > 0.3) {
      score += 5
    }

    // Minimum threshold to be considered an opportunity
    if (score < 25) continue

    // Build the reason string
    const estimatedValue = zipMedian ?? (comp.price * 1.3)
    const equityEst = estimatedValue - comp.price
    const reasonStr = reasons.length > 0
      ? `${reasons.join('. ')}. Potential equity of ${dollars(equityEst)}.`
      : `Potential equity of ${dollars(equityEst)}.`

    opportunities.push({
      address: comp.address,
      city: comp.city,
      state: comp.state,
      zip: comp.zip,
      propertyType: comp.propertyType,
      lastSalePrice: comp.price,
      lastSaleDate: comp.saleDate,
      assessedValue: null,
      sqft: comp.sqft,
      beds: comp.beds,
      yearBuilt: null,
      ownerOccupied: null,
      estimatedValue: Math.round(estimatedValue),
      opportunityReason: reasonStr,
      distanceFromSubject: comp.distance,
      score: Math.min(100, score),
    })
  }

  // Sort by score desc, limit to 5
  opportunities.sort((a, b) => b.score - a.score)
  return opportunities.slice(0, 5)
}

// ─── C. BUYER ACTIONS ───────────────────────────────────────────────────────

interface BuyerPreviewMatch {
  buyerId: string
  name: string
  matchScore: number
  status: string
  strategy: string | null
  proofOfFunds: boolean
  lastContacted: string
}

async function generateBuyerActions(
  analysis: FullDealAnalysis,
  profileId: string,
): Promise<BuyerAction[]> {
  // Get matched buyers from the existing buyer preview infrastructure
  // Query CRM for buyers that match this deal's profile
  const p = analysis.property.property
  const askingPrice = analysis.flip?.purchasePrice
  const actions: BuyerAction[] = []

  try {
    const whereClause: Record<string, unknown> = {
      profileId,
      isOptedOut: false,
      status: { notIn: ['DO_NOT_CALL', 'INACTIVE'] },
    }

    // Price filter: buyers whose maxPrice >= 80% of asking price
    if (askingPrice != null && askingPrice > 0) {
      whereClause.OR = [
        { maxPrice: null },
        { maxPrice: { gte: Math.round(askingPrice * 0.8) } },
      ]
    }

    const buyers = await prisma.cashBuyer.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        entityName: true,
        status: true,
        strategy: true,
        proofOfFundsVerified: true,
        lastContactedAt: true,
        buyerScore: true,
        preferredZips: true,
        preferredMarkets: true,
        preferredTypes: true,
        maxPrice: true,
        minPrice: true,
      },
      take: 50,
      orderBy: { buyerScore: 'desc' },
    })

    const zip = p.zip
    const cityMarket = p.city && p.state ? `${p.city}, ${p.state}` : null

    for (const buyer of buyers) {
      const name = buyer.entityName || [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || 'Unknown'
      const daysAgo = daysSince(buyer.lastContactedAt)

      // Simple match score based on zip/market/price alignment
      let matchScore = 40 // base
      const zips = buyer.preferredZips as string[] | null
      const markets = buyer.preferredMarkets as string[] | null
      if (zip && zips?.includes(zip)) matchScore += 25
      if (cityMarket && markets?.some((m: string) => m.toLowerCase() === cityMarket.toLowerCase())) matchScore += 15
      if (buyer.proofOfFundsVerified) matchScore += 10
      if (buyer.buyerScore >= 70) matchScore += 10
      matchScore = Math.min(100, matchScore)

      // Only include buyers with decent match
      if (matchScore < 50) continue

      // Determine action and urgency
      let action: string
      let urgency: BuyerAction['urgency']
      let reason: string

      if ((daysAgo === null || daysAgo > 14) && matchScore >= 80) {
        action = `Call ${name} — they match ${matchScore}% but haven't been contacted in ${daysAgo ?? '14+'} days`
        urgency = 'now'
        reason = 'High match score with stale contact — reconnect with this deal as the hook'
      } else if (buyer.proofOfFundsVerified && matchScore >= 80) {
        action = `Priority: ${name} has verified proof of funds and matches ${matchScore}%`
        urgency = 'now'
        reason = 'Verified funds + high match = fastest path to close'
      } else if (buyer.status === 'HIGH_CONFIDENCE') {
        action = `High-confidence closer — ${name} has a strong close history`
        urgency = 'now'
        reason = 'Track record of closing makes this buyer a priority contact'
      } else if (daysAgo != null && daysAgo < 3 && matchScore > 75) {
        action = `Send deal sheet to ${name} — spoke with them recently and they're a ${matchScore}% match`
        urgency = 'soon'
        reason = 'Recent contact + good match = warm lead for this deal'
      } else if (daysAgo === null || daysAgo > 7) {
        action = `Reach out to ${name} — ${matchScore}% match, last contacted ${daysAgo != null ? `${daysAgo} days ago` : 'never'}`
        urgency = 'soon'
        reason = 'Decent match, due for a check-in'
      } else {
        action = `Follow up with ${name} when ready — ${matchScore}% match`
        urgency = 'later'
        reason = 'Good fit but recently contacted'
      }

      actions.push({
        buyerId: buyer.id,
        name,
        matchScore,
        action,
        urgency,
        reason,
        lastContacted: buyer.lastContactedAt?.toISOString() ?? null,
        strategy: buyer.strategy,
        proofOfFunds: buyer.proofOfFundsVerified,
      })
    }
  } catch (err) {
    logger.warn('Failed to generate buyer actions for recommendations', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // Sort: urgency (now > soon > later), then matchScore desc
  const urgencyOrder = { now: 0, soon: 1, later: 2 }
  actions.sort((a, b) => {
    const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    if (uDiff !== 0) return uDiff
    return b.matchScore - a.matchScore
  })

  return actions.slice(0, 5)
}

// ─── D. STRATEGIC INSIGHTS ──────────────────────────────────────────────────

function generateStrategicInsights(
  analysis: FullDealAnalysis,
  buyerActionCount: number,
): StrategicInsight[] {
  const insights: StrategicInsight[] = []
  const { flip, rental, arv, dealScore, market, neighborhood, repairs } = analysis

  // Pricing insight — 70% rule
  if (flip && arv.arv != null && arv.arv > 0) {
    const maxOffer = Math.round(arv.arv * 0.7 - repairs.total)
    const askingPrice = flip.purchasePrice
    const spreadPct = Math.round(((arv.arv - askingPrice) / arv.arv) * 100)

    if (askingPrice <= maxOffer) {
      insights.push({
        insight: `At ${dollars(askingPrice)}, you're entering at ${spreadPct}% below ARV. The 70% rule max offer is ${dollars(maxOffer)} — you're ${dollars(maxOffer - askingPrice)} under the ceiling.`,
        category: 'pricing',
        confidence: 'high',
      })
    } else {
      const overBy = askingPrice - maxOffer
      insights.push({
        insight: `Asking price of ${dollars(askingPrice)} is ${dollars(overBy)} above the 70% rule max of ${dollars(maxOffer)}. Negotiate down or factor in the tighter margin.`,
        category: 'pricing',
        confidence: 'high',
      })
    }
  }

  // Timing insight — market trend
  if (market && market.priceTrends.priceChange6Month != null) {
    const change = market.priceTrends.priceChange6Month
    if (change > 3) {
      insights.push({
        insight: `Market prices are rising ${change}% over 6 months. Acting quickly locks in a better spread before comps push higher.`,
        category: 'timing',
        confidence: change > 5 ? 'high' : 'medium',
      })
    } else if (change < -3) {
      insights.push({
        insight: `Market prices are declining ${Math.abs(change)}% over 6 months. Factor in potential ARV erosion during your hold period.`,
        category: 'timing',
        confidence: Math.abs(change) > 5 ? 'high' : 'medium',
      })
    }
  }

  // Competition insight — neighborhood supply/demand
  if (neighborhood) {
    const deals = neighborhood.platformActivity.activeDealsInZip + neighborhood.platformActivity.marketplaceListingsInZip
    const buyers = neighborhood.buyerDemand.buyersTargetingZip

    if (buyers > deals && buyers >= 2) {
      insights.push({
        insight: `Only ${deals} active deal${deals !== 1 ? 's' : ''} in this zip vs ${buyers} interested buyers — this is a seller's market for wholesale deals. Price your assignment fee accordingly.`,
        category: 'competition',
        confidence: buyers >= 4 ? 'high' : 'medium',
      })
    } else if (deals > 0 && buyers === 0) {
      insights.push({
        insight: `${deals} active deal${deals !== 1 ? 's' : ''} in this zip but no CRM buyers targeting it. You'll need the marketplace or cold outreach to find a buyer.`,
        category: 'competition',
        confidence: 'medium',
      })
    }
  }

  // Strategy insight — dual exit
  if (flip && rental && flip.netProfit > 0 && rental.monthlyCashFlow > 0) {
    insights.push({
      insight: `This deal works as either a flip (${dollars(flip.netProfit)} profit) or a hold (${dollars(rental.monthlyCashFlow)}/mo cash flow). Market to both flippers and landlords to maximize interest.`,
      category: 'strategy',
      confidence: 'high',
    })
  }

  // Reverse wholesale insight
  if (neighborhood && neighborhood.buyerDemand.buyersTargetingZip >= 3) {
    const bCount = neighborhood.buyerDemand.buyersTargetingZip
    const dCount = neighborhood.platformActivity.activeDealsInZip
    if (bCount > dCount + 1) {
      insights.push({
        insight: `High buyer demand in this zip. Consider sourcing more properties here — you have ${bCount} ready buyers and only ${dCount} active deal${dCount !== 1 ? 's' : ''}.`,
        category: 'strategy',
        confidence: 'high',
      })
    }
  }

  // Assignment fee insight
  if (flip && flip.assignmentFee != null && flip.endBuyerROI != null) {
    if (flip.endBuyerROI < 10) {
      insights.push({
        insight: `Your assignment fee of ${dollars(flip.assignmentFee)} leaves the end buyer only ${flip.endBuyerROI}% ROI. Consider reducing your fee to attract more buyer interest.`,
        category: 'pricing',
        confidence: 'medium',
      })
    } else if (flip.endBuyerROI > 25) {
      insights.push({
        insight: `End buyer ROI of ${flip.endBuyerROI}% is very generous. You may be leaving money on the table — consider a higher assignment fee.`,
        category: 'pricing',
        confidence: 'medium',
      })
    }
  }

  // Market health + buyer count
  if (market && buyerActionCount > 0) {
    if (market.assessment.level === 'hot' || market.assessment.level === 'warm') {
      insights.push({
        insight: `${market.location.city} market is ${market.assessment.level} (${market.assessment.score}/100). Combined with ${buyerActionCount} actionable buyer${buyerActionCount !== 1 ? 's' : ''}, disposition should be fast.`,
        category: 'market',
        confidence: 'high',
      })
    }
  }

  // Limit to 5 most confident
  const confOrder = { high: 0, medium: 1, low: 2 }
  insights.sort((a, b) => confOrder[a.confidence] - confOrder[b.confidence])
  return insights.slice(0, 5)
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Generate deal recommendations from a completed analysis.
 *
 * Pure rule-based engine plus lightweight Prisma queries for buyer data.
 * No external API calls. Targets < 500ms.
 */
export async function generateRecommendations(
  analysis: FullDealAnalysis,
  profileId: string,
): Promise<DealRecommendations> {
  const startTime = Date.now()

  // Run buyer actions query and nearby opportunities in parallel
  const [buyerActions, nearbyOpportunities] = await Promise.all([
    generateBuyerActions(analysis, profileId),
    Promise.resolve(findNearbyOpportunities(analysis)),
  ])

  // Actions and insights use buyer count
  const actions = generateActions(analysis, buyerActions.length)
  const strategicInsights = generateStrategicInsights(analysis, buyerActions.length)

  const durationMs = Date.now() - startTime
  logger.info('Recommendations generated', {
    actionCount: actions.length,
    nearbyCount: nearbyOpportunities.length,
    buyerActionCount: buyerActions.length,
    insightCount: strategicInsights.length,
    durationMs,
  })

  return {
    actions,
    nearbyOpportunities,
    buyerActions,
    strategicInsights,
    generatedAt: new Date().toISOString(),
  }
}
