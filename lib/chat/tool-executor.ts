/**
 * Tool executor for the Ask AI chat route.
 *
 * Each tool runs Prisma queries scoped to the user's profileId.
 * Uses the real matching engine (lib/matching.ts) and market
 * intelligence service (lib/analysis/market-intelligence.ts).
 */

import { prisma } from '@/lib/prisma'
import {
  rankBuyersForDeal,
  type DealForMatching,
  type BuyerForMatching,
} from '@/lib/matching'
import { getMarketIntelligence } from '@/lib/analysis/market-intelligence'

// ── Main dispatcher ─────────────────────────────────────────────────────────

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  profileId: string,
): Promise<unknown> {
  switch (toolName) {
    case 'search_buyers':
      return searchBuyers(toolInput, profileId)
    case 'get_buyer_detail':
      return getBuyerDetail(toolInput, profileId)
    case 'search_deals':
      return searchDeals(toolInput, profileId)
    case 'get_deal_detail':
      return getDealDetail(toolInput, profileId)
    case 'get_campaign_detail':
      return getCampaignDetail(toolInput, profileId)
    case 'match_buyers_to_deal':
      return matchBuyersToDeal(toolInput, profileId)
    case 'get_pipeline_summary':
      return getPipelineSummary(profileId)
    case 'search_marketplace':
      return searchMarketplace(toolInput)
    case 'get_contract_status':
      return getContractStatus(toolInput, profileId)
    case 'get_market_intelligence':
      return getMarketIntel(toolInput, profileId)
    case 'propose_action':
      return proposeAction(toolInput)
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

// ── a) search_buyers ────────────────────────────────────────────────────────

async function searchBuyers(
  input: Record<string, unknown>,
  profileId: string,
) {
  const where: Record<string, unknown> = { profileId, isOptedOut: false }

  if (input.query) {
    const q = input.query as string
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { entityName: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (input.status) where.status = input.status
  if (input.minScore != null || input.maxScore != null) {
    const score: Record<string, unknown> = {}
    if (input.minScore != null) score.gte = input.minScore
    if (input.maxScore != null) score.lte = input.maxScore
    where.buyerScore = score
  }
  if (input.market) where.preferredMarkets = { has: input.market as string }
  if (input.propertyType)
    where.preferredTypes = { has: input.propertyType as string }
  if (input.strategy) where.strategy = input.strategy

  const limit = Math.min((input.limit as number) || 10, 50)

  const buyers = await prisma.cashBuyer.findMany({
    where,
    orderBy: { buyerScore: 'desc' },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      entityName: true,
      phone: true,
      email: true,
      status: true,
      buyerScore: true,
      preferredMarkets: true,
      preferredTypes: true,
      strategy: true,
      minPrice: true,
      maxPrice: true,
      closeSpeedDays: true,
      proofOfFundsVerified: true,
      cashPurchaseCount: true,
      lastContactedAt: true,
      motivation: true,
      buyerType: true,
      fundingSource: true,
      conditionPreference: true,
      notes: true,
    },
  })

  return { buyers, count: buyers.length }
}

// ── b) get_buyer_detail ─────────────────────────────────────────────────────

async function getBuyerDetail(
  input: Record<string, unknown>,
  profileId: string,
) {
  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: input.buyerId as string, profileId },
    include: {
      campaignCalls: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          outcome: true,
          durationSecs: true,
          aiSummary: true,
          createdAt: true,
          campaign: { select: { name: true } },
        },
      },
      dealMatches: {
        orderBy: { matchScore: 'desc' },
        take: 10,
        include: {
          deal: {
            select: {
              address: true,
              city: true,
              state: true,
              askingPrice: true,
              status: true,
            },
          },
        },
      },
      offers: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          deal: { select: { address: true, city: true, state: true } },
        },
      },
      activityEvents: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          type: true,
          title: true,
          detail: true,
          metadata: true,
          createdAt: true,
        },
      },
      tags: {
        include: {
          tag: { select: { name: true, label: true, color: true } },
        },
      },
    },
  })

  if (!buyer) return { error: 'Buyer not found' }
  return buyer
}

// ── c) search_deals ─────────────────────────────────────────────────────────

async function searchDeals(
  input: Record<string, unknown>,
  profileId: string,
) {
  const where: Record<string, unknown> = { profileId }

  if (input.status) where.status = input.status
  if (input.city)
    where.city = { contains: input.city as string, mode: 'insensitive' }
  if (input.state)
    where.state = { equals: input.state as string, mode: 'insensitive' }
  if (input.propertyType) where.propertyType = input.propertyType
  if (input.minPrice != null || input.maxPrice != null) {
    const price: Record<string, unknown> = {}
    if (input.minPrice != null) price.gte = input.minPrice
    if (input.maxPrice != null) price.lte = input.maxPrice
    where.askingPrice = price
  }

  const limit = Math.min((input.limit as number) || 10, 50)

  const deals = await prisma.deal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      propertyType: true,
      beds: true,
      baths: true,
      sqft: true,
      yearBuilt: true,
      condition: true,
      askingPrice: true,
      arv: true,
      assignFee: true,
      repairCost: true,
      flipProfit: true,
      rentalCashFlow: true,
      confidenceScore: true,
      status: true,
      createdAt: true,
    },
  })

  return { deals, count: deals.length }
}

// ── d) get_deal_detail ──────────────────────────────────────────────────────

async function getDealDetail(
  input: Record<string, unknown>,
  profileId: string,
) {
  const deal = await prisma.deal.findFirst({
    where: { id: input.dealId as string, profileId },
    include: {
      matches: {
        orderBy: { matchScore: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              entityName: true,
              buyerScore: true,
              status: true,
            },
          },
        },
      },
      offers: {
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              entityName: true,
            },
          },
        },
      },
      contracts: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          templateName: true,
          status: true,
          documentUrl: true,
          sellerSignedAt: true,
          buyerSignedAt: true,
          createdAt: true,
        },
      },
    },
  })

  if (!deal) return { error: 'Deal not found' }
  return deal
}

// ── e) get_campaign_detail ──────────────────────────────────────────────────

async function getCampaignDetail(
  input: Record<string, unknown>,
  profileId: string,
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: input.campaignId as string, profileId },
  })

  if (!campaign) return { error: 'Campaign not found' }

  const [recentCalls, outcomeGroups] = await Promise.all([
    prisma.campaignCall.findMany({
      where: { campaignId: campaign.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        outcome: true,
        durationSecs: true,
        aiSummary: true,
        createdAt: true,
        buyer: {
          select: { firstName: true, lastName: true, entityName: true },
        },
      },
    }),
    prisma.campaignCall.groupBy({
      by: ['outcome'],
      where: { campaignId: campaign.id },
      _count: true,
    }),
  ])

  const aggregatedOutcomes = Object.fromEntries(
    outcomeGroups.map((o) => [o.outcome ?? 'UNKNOWN', o._count]),
  )

  return {
    ...campaign,
    aggregatedOutcomes,
    recentCalls,
  }
}

// ── f) match_buyers_to_deal ─────────────────────────────────────────────────

async function matchBuyersToDeal(
  input: Record<string, unknown>,
  profileId: string,
) {
  const limit = Math.min((input.limit as number) || 10, 50)

  const deal = await prisma.deal.findFirst({
    where: { id: input.dealId as string, profileId },
    select: {
      id: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      propertyType: true,
      askingPrice: true,
      arv: true,
      repairCost: true,
      condition: true,
      beds: true,
      baths: true,
      sqft: true,
      yearBuilt: true,
    },
  })

  if (!deal) return { error: 'Deal not found' }

  const buyers = await prisma.cashBuyer.findMany({
    where: { profileId, isOptedOut: false, status: { not: 'DO_NOT_CALL' } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      entityName: true,
      preferredMarkets: true,
      preferredTypes: true,
      preferredZips: true,
      strategy: true,
      conditionPreference: true,
      minPrice: true,
      maxPrice: true,
      closeSpeedDays: true,
      proofOfFundsVerified: true,
      buyerScore: true,
      status: true,
      lastContactedAt: true,
      cashPurchaseCount: true,
    },
  })

  // Use the real matching engine from lib/matching.ts
  const dealForMatching: DealForMatching = {
    id: deal.id,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
    propertyType: deal.propertyType as DealForMatching['propertyType'],
    askingPrice: deal.askingPrice,
    arv: deal.arv,
    repairCost: deal.repairCost,
    condition: deal.condition,
    beds: deal.beds,
    baths: deal.baths,
    sqft: deal.sqft,
    yearBuilt: deal.yearBuilt,
  }

  const buyersForMatching: BuyerForMatching[] = buyers.map((b) => ({
    id: b.id,
    preferredMarkets: b.preferredMarkets,
    preferredTypes: b.preferredTypes as BuyerForMatching['preferredTypes'],
    preferredZips: b.preferredZips,
    strategy: b.strategy as BuyerForMatching['strategy'],
    conditionPreference:
      b.conditionPreference as BuyerForMatching['conditionPreference'],
    minPrice: b.minPrice,
    maxPrice: b.maxPrice,
    closeSpeedDays: b.closeSpeedDays,
    proofOfFundsVerified: b.proofOfFundsVerified,
    buyerScore: b.buyerScore,
    status: b.status as BuyerForMatching['status'],
    lastContactedAt: b.lastContactedAt,
    cashPurchaseCount: b.cashPurchaseCount,
  }))

  const matches = rankBuyersForDeal(dealForMatching, buyersForMatching, undefined, {
    limit,
    minScore: 10,
  })

  // Enrich with buyer names
  const buyerMap = new Map(buyers.map((b) => [b.id, b]))

  return {
    deal: {
      id: deal.id,
      address: deal.address,
      city: deal.city,
      state: deal.state,
      askingPrice: deal.askingPrice,
      arv: deal.arv,
    },
    matches: matches.map((m) => {
      const b = buyerMap.get(m.buyerId)
      return {
        buyerId: m.buyerId,
        buyerName:
          b
            ? `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim() ||
              b.entityName
            : 'Unknown',
        entityName: b?.entityName ?? null,
        matchScore: m.matchScore,
        buyBoxScore: m.buyBoxScore,
        priceScore: m.priceScore,
        strategyScore: m.strategyScore,
        timingScore: m.timingScore,
        closeProbScore: m.closeProbScore,
        breakdown: m.breakdown,
      }
    }),
    totalBuyersEvaluated: buyers.length,
  }
}

// ── g) get_pipeline_summary ─────────────────────────────────────────────────

async function getPipelineSummary(profileId: string) {
  const [dealsByStatus, dealValues, buyersByStatus, campaigns, recentActivity] =
    await Promise.all([
      prisma.deal.groupBy({
        by: ['status'],
        where: { profileId },
        _count: true,
      }),
      prisma.deal.groupBy({
        by: ['status'],
        where: { profileId },
        _sum: { askingPrice: true, assignFee: true },
      }),
      prisma.cashBuyer.groupBy({
        by: ['status'],
        where: { profileId, isOptedOut: false },
        _count: true,
      }),
      prisma.campaign.findMany({
        where: { profileId },
        select: {
          id: true,
          name: true,
          status: true,
          totalBuyers: true,
          callsCompleted: true,
        },
      }),
      prisma.activityEvent.findMany({
        where: { profileId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { type: true, title: true, createdAt: true },
      }),
    ])

  return {
    deals: {
      byStatus: dealsByStatus.map((d) => ({
        status: d.status,
        count: d._count,
      })),
      totalValue: dealValues.reduce(
        (sum, d) => sum + (d._sum.askingPrice ?? 0),
        0,
      ),
      totalAssignFees: dealValues.reduce(
        (sum, d) => sum + (d._sum.assignFee ?? 0),
        0,
      ),
    },
    buyers: {
      byStatus: buyersByStatus.map((b) => ({
        status: b.status,
        count: b._count,
      })),
    },
    campaigns: campaigns.map((c) => ({
      ...c,
      completionPct:
        c.totalBuyers > 0
          ? Math.round((c.callsCompleted / c.totalBuyers) * 100)
          : 0,
    })),
    recentActivity,
  }
}

// ── h) search_marketplace ───────────────────────────────────────────────────

async function searchMarketplace(input: Record<string, unknown>) {
  const where: Record<string, unknown> = { status: 'ACTIVE' }

  if (input.city)
    where.city = { contains: input.city as string, mode: 'insensitive' }
  if (input.state)
    where.state = { equals: input.state as string, mode: 'insensitive' }
  if (input.propertyType) where.propertyType = input.propertyType
  if (input.minPrice != null || input.maxPrice != null) {
    const price: Record<string, unknown> = {}
    if (input.minPrice != null) price.gte = input.minPrice
    if (input.maxPrice != null) price.lte = input.maxPrice
    where.askingPrice = price
  }

  const limit = Math.min((input.limit as number) || 10, 50)

  const listings = await prisma.marketplaceListing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      propertyType: true,
      askingPrice: true,
      assignFee: true,
      arv: true,
      repairCost: true,
      flipProfit: true,
      rentalCashFlow: true,
      beds: true,
      baths: true,
      sqft: true,
      yearBuilt: true,
      condition: true,
      confidenceScore: true,
      headline: true,
      viewCount: true,
      inquiryCount: true,
      publishedAt: true,
      createdAt: true,
    },
  })

  const now = Date.now()
  return {
    listings: listings.map((l) => ({
      ...l,
      daysListed: l.publishedAt
        ? Math.floor((now - l.publishedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    })),
    count: listings.length,
  }
}

// ── i) get_contract_status ──────────────────────────────────────────────────

async function getContractStatus(
  input: Record<string, unknown>,
  profileId: string,
) {
  const dealId = input.dealId as string

  const [offers, contracts] = await Promise.all([
    prisma.offer.findMany({
      where: { dealId, deal: { profileId } },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: {
          select: { firstName: true, lastName: true, entityName: true },
        },
      },
    }),
    prisma.contract.findMany({
      where: { dealId, profileId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        templateName: true,
        status: true,
        documentUrl: true,
        sellerSignedAt: true,
        buyerSignedAt: true,
        createdAt: true,
        updatedAt: true,
        offer: { select: { amount: true, status: true } },
      },
    }),
  ])

  if (offers.length === 0 && contracts.length === 0) {
    return { error: 'No offers or contracts found for this deal' }
  }

  return {
    offers: offers.map((o) => ({
      id: o.id,
      amount: o.amount,
      status: o.status,
      buyerName:
        `${o.buyer.firstName ?? ''} ${o.buyer.lastName ?? ''}`.trim() ||
        o.buyer.entityName,
      contractUrl: o.contractUrl,
      signedAt: o.signedAt,
      closeDate: o.closeDate,
      terms: o.terms,
      message: o.message,
      createdAt: o.createdAt,
    })),
    contracts: contracts.map((c) => ({
      id: c.id,
      templateName: c.templateName,
      status: c.status,
      documentUrl: c.documentUrl,
      sellerSignedAt: c.sellerSignedAt,
      buyerSignedAt: c.buyerSignedAt,
      offerAmount: c.offer?.amount ?? null,
      createdAt: c.createdAt,
    })),
    awaitingSignature: contracts.filter((c) => c.status === 'SENT').length,
  }
}

// ── propose_action ──────────────────────────────────────────────────────────
// Returns the action card data for the frontend to render.

function proposeAction(input: Record<string, unknown>) {
  return {
    __actionCard: true,
    actionType: input.actionType,
    title: input.title,
    description: input.description,
    params: input.params,
    estimatedImpact: input.estimatedImpact,
  }
}

// ── j) get_market_intelligence ──────────────────────────────────────────────

async function getMarketIntel(
  input: Record<string, unknown>,
  profileId: string,
) {
  return getMarketIntelligence(
    input.city as string,
    input.state as string,
    null,
    profileId,
  )
}
