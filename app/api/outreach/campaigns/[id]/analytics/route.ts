import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// In-memory cache: campaignId → { data, ts }
const cache = new Map<string, { data: Record<string, unknown>; ts: number }>()
const CACHE_TTL = 60_000 // 60 seconds

// GET /api/outreach/campaigns/[id]/analytics — Detailed campaign performance analytics
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  // Ownership check
  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign || campaign.profileId !== profile.id) {
    return errorResponse(404, 'Campaign not found')
  }

  // Check cache
  const cacheKey = `campaign-analytics-${id}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return successResponse(cached.data)
  }

  // Fetch all calls for this campaign
  const calls = await prisma.campaignCall.findMany({
    where: { campaignId: id },
    select: {
      id: true,
      outcome: true,
      durationSecs: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      channel: true,
      extractedData: true,
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          entityName: true,
          buyerScore: true,
          status: true,
          strategy: true,
          preferredTypes: true,
          preferredMarkets: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const completedCalls = calls.filter(c => c.outcome !== null)
  const qualifiedCalls = calls.filter(c => c.outcome === 'QUALIFIED')
  const connectedCalls = calls.filter(c =>
    c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED',
  )

  // ── Outcome distribution ────────────────────────────────────────────────
  const outcomeDistribution: Record<string, number> = {}
  for (const c of calls) {
    const key = c.outcome || 'PENDING'
    outcomeDistribution[key] = (outcomeDistribution[key] || 0) + 1
  }

  // ── Timeline: outcomes over time (daily buckets) ────────────────────────
  const timelineBuckets: Record<string, { date: string; qualified: number; notBuying: number; noAnswer: number; voicemail: number; other: number }> = {}
  for (const c of completedCalls) {
    const date = (c.endedAt || c.createdAt).toISOString().split('T')[0]
    if (!timelineBuckets[date]) {
      timelineBuckets[date] = { date, qualified: 0, notBuying: 0, noAnswer: 0, voicemail: 0, other: 0 }
    }
    const bucket = timelineBuckets[date]
    if (c.outcome === 'QUALIFIED') bucket.qualified++
    else if (c.outcome === 'NOT_BUYING') bucket.notBuying++
    else if (c.outcome === 'NO_ANSWER') bucket.noAnswer++
    else if (c.outcome === 'VOICEMAIL') bucket.voicemail++
    else bucket.other++
  }
  const outcomeTimeline = Object.values(timelineBuckets).sort((a, b) => a.date.localeCompare(b.date))

  // ── Best time slots (hour-of-day analysis) ──────────────────────────────
  const hourSlots: Record<number, { total: number; connected: number; qualified: number; totalDuration: number }> = {}
  for (const c of completedCalls) {
    const hour = (c.startedAt || c.createdAt).getHours()
    if (!hourSlots[hour]) hourSlots[hour] = { total: 0, connected: 0, qualified: 0, totalDuration: 0 }
    hourSlots[hour].total++
    hourSlots[hour].totalDuration += c.durationSecs || 0
    if (c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED') {
      hourSlots[hour].connected++
    }
    if (c.outcome === 'QUALIFIED') hourSlots[hour].qualified++
  }

  const bestTimeSlots = Array.from({ length: 24 }, (_, hour) => {
    const slot = hourSlots[hour] || { total: 0, connected: 0, qualified: 0, totalDuration: 0 }
    return {
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      totalCalls: slot.total,
      connected: slot.connected,
      qualified: slot.qualified,
      connectionRate: slot.total > 0 ? Math.round((slot.connected / slot.total) * 100) : 0,
      qualificationRate: slot.connected > 0 ? Math.round((slot.qualified / slot.connected) * 100) : 0,
      avgDuration: slot.total > 0 ? Math.round(slot.totalDuration / slot.total) : 0,
    }
  })

  // ── Day-of-week analysis ────────────────────────────────────────────────
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const daySlots: Record<number, { total: number; connected: number; qualified: number }> = {}
  for (const c of completedCalls) {
    const day = (c.startedAt || c.createdAt).getDay()
    if (!daySlots[day]) daySlots[day] = { total: 0, connected: 0, qualified: 0 }
    daySlots[day].total++
    if (c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED') {
      daySlots[day].connected++
    }
    if (c.outcome === 'QUALIFIED') daySlots[day].qualified++
  }

  const dayOfWeekStats = dayNames.map((name, i) => {
    const slot = daySlots[i] || { total: 0, connected: 0, qualified: 0 }
    return {
      day: name,
      dayIndex: i,
      totalCalls: slot.total,
      connected: slot.connected,
      qualified: slot.qualified,
      connectionRate: slot.total > 0 ? Math.round((slot.connected / slot.total) * 100) : 0,
    }
  })

  // ── Buyer insights from extractedData ───────────────────────────────────
  const strategyBreakdown: Record<string, number> = {}
  const propertyTypeBreakdown: Record<string, number> = {}
  const marketBreakdown: Record<string, number> = {}
  let totalBuyerScore = 0
  let scoredBuyers = 0

  for (const c of qualifiedCalls) {
    const buyer = c.buyer
    if (buyer.buyerScore != null) {
      totalBuyerScore += buyer.buyerScore
      scoredBuyers++
    }
    if (buyer.strategy) {
      strategyBreakdown[buyer.strategy] = (strategyBreakdown[buyer.strategy] || 0) + 1
    }
    if (buyer.preferredTypes && Array.isArray(buyer.preferredTypes)) {
      for (const t of buyer.preferredTypes) {
        propertyTypeBreakdown[t] = (propertyTypeBreakdown[t] || 0) + 1
      }
    }
    if (buyer.preferredMarkets && Array.isArray(buyer.preferredMarkets)) {
      for (const m of buyer.preferredMarkets) {
        marketBreakdown[m] = (marketBreakdown[m] || 0) + 1
      }
    }

    // Also pull from extractedData if available
    try {
      const ed = c.extractedData as Record<string, unknown> | null
      if (ed) {
        if (ed.propertyTypes && Array.isArray(ed.propertyTypes)) {
          for (const t of ed.propertyTypes as string[]) {
            propertyTypeBreakdown[t] = (propertyTypeBreakdown[t] || 0) + 1
          }
        }
        if (ed.markets && Array.isArray(ed.markets)) {
          for (const m of ed.markets as string[]) {
            marketBreakdown[m] = (marketBreakdown[m] || 0) + 1
          }
        }
      }
    } catch {
      // Malformed extractedData — skip
    }
  }

  const buyerInsights = {
    avgQualifiedScore: scoredBuyers > 0 ? Math.round(totalBuyerScore / scoredBuyers) : 0,
    strategyBreakdown,
    propertyTypeBreakdown,
    marketBreakdown,
  }

  // ── Cost analysis ───────────────────────────────────────────────────────
  const totalDuration = completedCalls.reduce((sum, c) => sum + (c.durationSecs || 0), 0)
  const voiceCost = Math.round((totalDuration / 60) * 0.18 * 100) / 100 // $0.18/min
  const costPerQualified = qualifiedCalls.length > 0
    ? Math.round(((campaign.actualCost || voiceCost) / qualifiedCalls.length) * 100) / 100
    : 0

  const costAnalysis = {
    estimatedCost: campaign.estimatedCost || 0,
    actualCost: campaign.actualCost || voiceCost,
    costPerCall: completedCalls.length > 0
      ? Math.round(((campaign.actualCost || voiceCost) / completedCalls.length) * 100) / 100
      : 0,
    costPerQualified,
    totalMinutes: Math.round(totalDuration / 60),
  }

  // ── Performance summary ─────────────────────────────────────────────────
  const performance = {
    totalCalls: calls.length,
    completed: completedCalls.length,
    pending: calls.length - completedCalls.length,
    connected: connectedCalls.length,
    qualified: qualifiedCalls.length,
    connectionRate: completedCalls.length > 0
      ? Math.round((connectedCalls.length / completedCalls.length) * 100)
      : 0,
    qualificationRate: connectedCalls.length > 0
      ? Math.round((qualifiedCalls.length / connectedCalls.length) * 100)
      : 0,
    avgCallDuration: completedCalls.length > 0
      ? Math.round(totalDuration / completedCalls.length)
      : 0,
    totalTalkTimeMins: Math.round(totalDuration / 60),
  }

  const result = {
    campaignId: id,
    campaignName: campaign.name,
    status: campaign.status,
    channel: campaign.channel,
    performance,
    outcomeDistribution,
    outcomeTimeline,
    bestTimeSlots,
    dayOfWeekStats,
    buyerInsights,
    costAnalysis,
  }

  // Cache the result
  cache.set(cacheKey, { data: result, ts: Date.now() })

  return successResponse(result)
}
