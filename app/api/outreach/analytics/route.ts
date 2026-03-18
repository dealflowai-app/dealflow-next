import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// In-memory cache: profileId → { data, ts }
const cache = new Map<string, { data: Record<string, unknown>; ts: number }>()
const CACHE_TTL = 60_000 // 60 seconds

// GET /api/outreach/analytics — Cross-campaign aggregate analytics
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10), 365)

  // Check cache
  const cacheKey = `global-analytics-${profile.id}-${days}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return successResponse(cached.data)
  }

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Fetch all user campaigns in the time range
  const campaigns = await prisma.campaign.findMany({
    where: {
      profileId: profile.id,
      createdAt: { gte: since },
    },
    select: {
      id: true,
      name: true,
      status: true,
      channel: true,
      mode: true,
      totalBuyers: true,
      callsCompleted: true,
      qualified: true,
      notBuying: true,
      noAnswer: true,
      totalTalkTime: true,
      estimatedCost: true,
      actualCost: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch all calls in the time range for timeline data
  const calls = await prisma.campaignCall.findMany({
    where: {
      campaign: { profileId: profile.id },
      createdAt: { gte: since },
    },
    select: {
      outcome: true,
      durationSecs: true,
      createdAt: true,
      endedAt: true,
      startedAt: true,
      campaignId: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // ── Aggregate stats ─────────────────────────────────────────────────────
  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter(c => c.status === 'RUNNING').length
  const totalCalls = calls.length
  const completedCalls = calls.filter(c => c.outcome !== null)
  const qualifiedCalls = calls.filter(c => c.outcome === 'QUALIFIED')
  const connectedCalls = calls.filter(c =>
    c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED',
  )
  const totalDuration = completedCalls.reduce((sum, c) => sum + (c.durationSecs || 0), 0)
  const totalEstimatedCost = campaigns.reduce((sum, c) => sum + (c.estimatedCost || 0), 0)
  const totalActualCost = campaigns.reduce((sum, c) => sum + (c.actualCost || 0), 0)

  const overview = {
    totalCampaigns,
    activeCampaigns,
    completedCampaigns: campaigns.filter(c => c.status === 'COMPLETED').length,
    totalCalls,
    completedCalls: completedCalls.length,
    qualifiedLeads: qualifiedCalls.length,
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
    totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
    totalActualCost: Math.round(totalActualCost * 100) / 100,
    costPerQualified: qualifiedCalls.length > 0
      ? Math.round((totalActualCost / qualifiedCalls.length) * 100) / 100
      : 0,
  }

  // ── Trend data (daily buckets) ──────────────────────────────────────────
  const trendBuckets: Record<string, {
    date: string; calls: number; qualified: number; connected: number; minutes: number
  }> = {}

  for (const c of calls) {
    const date = c.createdAt.toISOString().split('T')[0]
    if (!trendBuckets[date]) {
      trendBuckets[date] = { date, calls: 0, qualified: 0, connected: 0, minutes: 0 }
    }
    trendBuckets[date].calls++
    if (c.outcome === 'QUALIFIED') trendBuckets[date].qualified++
    if (c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED') {
      trendBuckets[date].connected++
    }
    trendBuckets[date].minutes += Math.round((c.durationSecs || 0) / 60)
  }

  const trends = Object.values(trendBuckets).sort((a, b) => a.date.localeCompare(b.date))

  // ── Outcome breakdown (global) ──────────────────────────────────────────
  const outcomeBreakdown: Record<string, number> = {}
  for (const c of calls) {
    const key = c.outcome || 'PENDING'
    outcomeBreakdown[key] = (outcomeBreakdown[key] || 0) + 1
  }

  // ── Best time to call (global hour-of-day heatmap data) ─────────────────
  const hourSlots: Record<number, { total: number; connected: number; qualified: number }> = {}
  for (const c of completedCalls) {
    const hour = (c.startedAt || c.createdAt).getHours()
    if (!hourSlots[hour]) hourSlots[hour] = { total: 0, connected: 0, qualified: 0 }
    hourSlots[hour].total++
    if (c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED') {
      hourSlots[hour].connected++
    }
    if (c.outcome === 'QUALIFIED') hourSlots[hour].qualified++
  }

  // Build day × hour heatmap
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const heatmap: { day: string; hour: number; calls: number; connectionRate: number }[] = []
  const dayHourSlots: Record<string, { total: number; connected: number }> = {}

  for (const c of completedCalls) {
    const dt = c.startedAt || c.createdAt
    const key = `${dt.getDay()}-${dt.getHours()}`
    if (!dayHourSlots[key]) dayHourSlots[key] = { total: 0, connected: 0 }
    dayHourSlots[key].total++
    if (c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED') {
      dayHourSlots[key].connected++
    }
  }

  for (let d = 0; d < 7; d++) {
    for (let h = 8; h <= 20; h++) {
      const key = `${d}-${h}`
      const slot = dayHourSlots[key] || { total: 0, connected: 0 }
      heatmap.push({
        day: dayNames[d],
        hour: h,
        calls: slot.total,
        connectionRate: slot.total > 0 ? Math.round((slot.connected / slot.total) * 100) : 0,
      })
    }
  }

  // ── Campaign comparison table ───────────────────────────────────────────
  const campaignComparison = campaigns.map(c => {
    const connected = c.qualified + c.notBuying
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      channel: c.channel,
      mode: c.mode,
      totalBuyers: c.totalBuyers,
      callsCompleted: c.callsCompleted,
      qualified: c.qualified,
      connectionRate: c.callsCompleted > 0
        ? Math.round((connected / c.callsCompleted) * 100)
        : 0,
      qualificationRate: connected > 0
        ? Math.round((c.qualified / connected) * 100)
        : 0,
      avgTalkTime: c.callsCompleted > 0
        ? Math.round((c.totalTalkTime || 0) / c.callsCompleted)
        : 0,
      cost: c.actualCost || c.estimatedCost || 0,
      costPerQualified: c.qualified > 0
        ? Math.round(((c.actualCost || c.estimatedCost || 0) / c.qualified) * 100) / 100
        : 0,
    }
  })

  // ── Channel breakdown ───────────────────────────────────────────────────
  const channelStats: Record<string, { campaigns: number; calls: number; qualified: number; cost: number }> = {}
  for (const c of campaigns) {
    const ch = c.channel || 'VOICE'
    if (!channelStats[ch]) channelStats[ch] = { campaigns: 0, calls: 0, qualified: 0, cost: 0 }
    channelStats[ch].campaigns++
    channelStats[ch].calls += c.callsCompleted
    channelStats[ch].qualified += c.qualified
    channelStats[ch].cost += c.actualCost || c.estimatedCost || 0
  }

  const result = {
    period: { days, since: since.toISOString() },
    overview,
    trends,
    outcomeBreakdown,
    heatmap,
    campaignComparison,
    channelStats,
  }

  cache.set(cacheKey, { data: result, ts: Date.now() })

  return successResponse(result)
}
