// ─── Caller Identification Service ──────────────────────────────────────────
// Identifies inbound callers by matching phone to CashBuyer records,
// loads call history, scheduled callbacks, and deal matches to build
// a rich context summary for AI answering or wholesaler display.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizePhone } from './compliance'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CallerIdentification {
  identified: boolean
  buyer: {
    id: string
    name: string
    phone: string
    score: number
    status: string
    preferredTypes: string[]
    strategy: string | null
    markets: string[]
    lastContacted: string | null
  } | null
  previousCalls: Array<{
    id: string
    campaignName: string
    outcome: string
    date: string
    duration: number
    aiSummary: string | null
  }>
  scheduledCallback: {
    id: string
    scheduledAt: string
    reason: string
    notes: string | null
  } | null
  matchedDeals: Array<{
    id: string
    address: string
    city: string
    askingPrice: number
    propertyType: string
    matchScore: number
  }>
  context: string
}

// ─── Identify Caller ────────────────────────────────────────────────────────

export async function identifyCaller(
  phone: string,
  profileId: string,
): Promise<CallerIdentification> {
  const normalized = normalizePhone(phone)
  if (!normalized) {
    return unknownCaller(phone)
  }

  try {
    // Find buyer by phone — use normalized 10-digit match
    const buyer = await prisma.cashBuyer.findFirst({
      where: {
        profileId,
        phone: { contains: normalized },
        isOptedOut: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        entityName: true,
        phone: true,
        buyerScore: true,
        status: true,
        preferredTypes: true,
        strategy: true,
        preferredMarkets: true,
        lastContactedAt: true,
        minPrice: true,
        maxPrice: true,
      },
    })

    if (!buyer) return unknownCaller(phone)

    const buyerName = buyer.firstName
      ? `${buyer.firstName}${buyer.lastName ? ' ' + buyer.lastName : ''}`
      : buyer.entityName || 'Unknown'

    // Load last 5 calls for this buyer
    const recentCalls = await prisma.campaignCall.findMany({
      where: { buyerId: buyer.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        outcome: true,
        durationSecs: true,
        aiSummary: true,
        createdAt: true,
        campaign: { select: { name: true } },
      },
    })

    // Check for pending scheduled callbacks
    const callback = await prisma.scheduledCallback.findFirst({
      where: {
        buyerId: buyer.id,
        profileId,
        status: 'scheduled',
      },
      orderBy: { scheduledAt: 'asc' },
      select: { id: true, scheduledAt: true, reason: true, notes: true },
    })

    // Load top 3 deal matches
    const dealMatches = await prisma.dealMatch.findMany({
      where: { buyerId: buyer.id },
      orderBy: { matchScore: 'desc' },
      take: 3,
      select: {
        id: true,
        matchScore: true,
        deal: {
          select: { id: true, address: true, city: true, askingPrice: true, propertyType: true },
        },
      },
    })

    const previousCalls = recentCalls.map(c => ({
      id: c.id,
      campaignName: c.campaign?.name || 'Manual',
      outcome: c.outcome || 'PENDING',
      date: c.createdAt.toISOString(),
      duration: c.durationSecs || 0,
      aiSummary: c.aiSummary,
    }))

    const matchedDeals = dealMatches.map(m => ({
      id: m.deal.id,
      address: m.deal.address,
      city: m.deal.city,
      askingPrice: m.deal.askingPrice,
      propertyType: m.deal.propertyType,
      matchScore: m.matchScore,
    }))

    const scheduledCallback = callback
      ? { id: callback.id, scheduledAt: callback.scheduledAt.toISOString(), reason: callback.reason, notes: callback.notes }
      : null

    // Build context string
    const context = buildContextString(
      buyerName, buyer, previousCalls, scheduledCallback, matchedDeals,
    )

    return {
      identified: true,
      buyer: {
        id: buyer.id,
        name: buyerName,
        phone: buyer.phone || normalized,
        score: buyer.buyerScore,
        status: buyer.status,
        preferredTypes: buyer.preferredTypes as string[],
        strategy: buyer.strategy,
        markets: buyer.preferredMarkets as string[],
        lastContacted: buyer.lastContactedAt?.toISOString() || null,
      },
      previousCalls,
      scheduledCallback,
      matchedDeals,
      context,
    }
  } catch (err) {
    logger.error('Caller identification failed', {
      route: 'caller-id',
      phone: `***${normalized.slice(-4)}`,
      error: err instanceof Error ? err.message : String(err),
    })
    return unknownCaller(phone)
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function unknownCaller(phone: string): CallerIdentification {
  const masked = phone.length >= 4 ? `***${phone.slice(-4)}` : phone
  return {
    identified: false,
    buyer: null,
    previousCalls: [],
    scheduledCallback: null,
    matchedDeals: [],
    context: `Unknown caller from ${masked}. No matching buyer in your CRM.`,
  }
}

function buildContextString(
  name: string,
  buyer: { buyerScore: number; status: string; strategy: string | null; minPrice: number | null; maxPrice: number | null; preferredTypes: unknown },
  calls: CallerIdentification['previousCalls'],
  callback: CallerIdentification['scheduledCallback'],
  deals: CallerIdentification['matchedDeals'],
): string {
  const parts: string[] = []

  parts.push(`This is ${name}, a cash buyer (score: ${buyer.buyerScore}, status: ${buyer.status}).`)

  // Last call context
  if (calls.length > 0) {
    const last = calls[0]
    const daysAgo = Math.round((Date.now() - new Date(last.date).getTime()) / 86400000)
    const dayStr = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`
    parts.push(`Last spoke ${dayStr} during the "${last.campaignName}" campaign (outcome: ${last.outcome}).`)
    if (last.aiSummary) parts.push(`Previous call summary: ${last.aiSummary}`)
  }

  // Preferences
  const prefs: string[] = []
  const types = buyer.preferredTypes as string[]
  if (types?.length) prefs.push(`types: ${types.join(', ')}`)
  if (buyer.strategy) prefs.push(`strategy: ${buyer.strategy}`)
  if (buyer.minPrice && buyer.maxPrice) {
    prefs.push(`range: $${(buyer.minPrice / 1000).toFixed(0)}K-$${(buyer.maxPrice / 1000).toFixed(0)}K`)
  }
  if (prefs.length) parts.push(`Preferences: ${prefs.join(', ')}.`)

  // Callback
  if (callback) {
    parts.push(`Has a scheduled callback for ${new Date(callback.scheduledAt).toLocaleString()}. Reason: ${callback.reason}`)
  }

  // Matched deals
  if (deals.length > 0) {
    parts.push(`You have ${deals.length} deal(s) matching their criteria:`)
    for (const d of deals) {
      parts.push(`- ${d.address}, ${d.city} (${d.propertyType}, $${(d.askingPrice / 1000).toFixed(0)}K, ${d.matchScore}% match)`)
    }
  }

  return parts.join(' ')
}
