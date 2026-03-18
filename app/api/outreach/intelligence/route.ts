import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// GET /api/outreach/intelligence — Aggregate intelligence across calls
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const campaignId = url.searchParams.get('campaignId') || undefined
  const dateFrom = url.searchParams.get('dateFrom')
  const dateTo = url.searchParams.get('dateTo')
  const minCalls = parseInt(url.searchParams.get('minCalls') || '10')

  // Build where clause
  const where: Record<string, unknown> = { profileId: profile.id }
  if (campaignId) {
    // Filter by calls belonging to this campaign
    const callIds = await prisma.campaignCall.findMany({
      where: { campaignId },
      select: { id: true },
    })
    where.callId = { in: callIds.map(c => c.id) }
  }
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {}
    if (dateFrom) createdAt.gte = new Date(dateFrom)
    if (dateTo) createdAt.lte = new Date(dateTo)
    where.createdAt = createdAt
  }

  const records = await prisma.callIntelligence.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })

  if (records.length < minCalls) {
    return successResponse({
      summary: null,
      message: `Need at least ${minCalls} analyzed calls for aggregate intelligence (have ${records.length})`,
      totalCallsAnalyzed: records.length,
    })
  }

  // Aggregate sentiment
  const avgSentiment = Math.round(records.reduce((s, r) => s + r.sentimentScore, 0) / records.length)
  const sentimentDist = { positive: 0, neutral: 0, negative: 0, mixed: 0 }
  for (const r of records) {
    const key = r.overallSentiment as keyof typeof sentimentDist
    if (key in sentimentDist) sentimentDist[key]++
  }
  // Convert to percentages
  const sentimentDistPct = {
    positive: Math.round((sentimentDist.positive / records.length) * 100),
    neutral: Math.round((sentimentDist.neutral / records.length) * 100),
    negative: Math.round((sentimentDist.negative / records.length) * 100),
    mixed: Math.round((sentimentDist.mixed / records.length) * 100),
  }

  // Aggregate engagement
  const avgEngagement = Math.round(records.reduce((s, r) => s + r.engagementScore, 0) / records.length)

  // Buying intent distribution
  const intentCounts = { high: 0, medium: 0, low: 0, none: 0 }
  for (const r of records) {
    const key = r.overallBuyingIntent as keyof typeof intentCounts
    if (key in intentCounts) intentCounts[key]++
  }
  const primaryIntent = (Object.entries(intentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none') as string

  // Talk ratio
  const avgAiTalk = Math.round(records.reduce((s, r) => s + r.aiTalkPercent, 0) / records.length)
  const avgBuyerTalk = 100 - avgAiTalk

  // Top buying signals across all calls
  const signalMap = new Map<string, { count: number; qualifiedCount: number }>()
  for (const r of records) {
    const signals = (r.buyingSignals as Array<{ signal: string }>) || []
    for (const sig of signals) {
      const existing = signalMap.get(sig.signal) || { count: 0, qualifiedCount: 0 }
      existing.count++
      // Check if this call was qualified (high intent as proxy)
      if (r.overallBuyingIntent === 'high') existing.qualifiedCount++
      signalMap.set(sig.signal, existing)
    }
  }
  const topBuyingSignals = Array.from(signalMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([signal, data]) => ({
      signal,
      count: data.count,
      conversionRate: data.count > 0 ? Math.round((data.qualifiedCount / data.count) * 100) : 0,
    }))

  // Top objections
  const objectionMap = new Map<string, { count: number; handledCount: number; category: string }>()
  for (const r of records) {
    const objs = (r.objections as Array<{ objection: string; category: string; handled: boolean }>) || []
    for (const obj of objs) {
      const existing = objectionMap.get(obj.objection) || { count: 0, handledCount: 0, category: obj.category }
      existing.count++
      if (obj.handled) existing.handledCount++
      objectionMap.set(obj.objection, existing)
    }
  }
  const topObjections = Array.from(objectionMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .map(([objection, data]) => ({
      objection,
      category: data.category,
      count: data.count,
      handleRate: data.count > 0 ? Math.round((data.handledCount / data.count) * 100) : 0,
    }))

  // Competitor mentions
  const competitorMap = new Map<string, { count: number; sentiments: string[] }>()
  for (const r of records) {
    const mentions = (r.competitorMentions as Array<{ competitor: string; sentiment: string }>) || []
    for (const m of mentions) {
      const existing = competitorMap.get(m.competitor) || { count: 0, sentiments: [] }
      existing.count++
      existing.sentiments.push(m.sentiment)
      competitorMap.set(m.competitor, existing)
    }
  }
  const competitorMentions = Array.from(competitorMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([competitor, data]) => {
      const posSent = data.sentiments.filter((s: string) => s === 'positive').length
      const negSent = data.sentiments.filter((s: string) => s === 'negative').length
      const avgSent = posSent > negSent ? 'positive' : negSent > posSent ? 'negative' : 'neutral'
      return { competitor, count: data.count, sentiment: avgSent }
    })

  // Script performance
  const withEffectiveness = records.filter(r => r.scriptEffectiveness != null)
  const avgEffectiveness = withEffectiveness.length > 0
    ? Math.round(withEffectiveness.reduce((s, r) => s + (r.scriptEffectiveness || 0), 0) / withEffectiveness.length)
    : null

  // Top script suggestions (aggregate from deep analysis)
  const suggestionMap = new Map<string, { count: number; priority: string; reasons: string[] }>()
  for (const r of records) {
    const suggestions = (r.scriptSuggestions as Array<{ suggestion: string; priority: string; reason: string }>) || []
    for (const s of suggestions) {
      const key = s.suggestion.toLowerCase().slice(0, 60) // fuzzy dedup
      const existing = suggestionMap.get(key) || { count: 0, priority: s.priority, reasons: [] }
      existing.count++
      if (existing.reasons.length < 3) existing.reasons.push(s.reason)
      if (s.priority === 'high') existing.priority = 'high'
      suggestionMap.set(key, existing)
    }
  }
  const topSuggestions = Array.from(suggestionMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([, data]) => ({
      suggestion: data.reasons[0] ? data.reasons[0].split(' — ')[0] || data.reasons[0] : '',
      count: data.count,
      priority: data.priority,
    }))

  // Engagement trend (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentRecords = records.filter(r => r.createdAt >= thirtyDaysAgo)
  const dailyMap = new Map<string, { total: number; count: number }>()
  for (const r of recentRecords) {
    const day = r.createdAt.toISOString().split('T')[0]
    const existing = dailyMap.get(day) || { total: 0, count: 0 }
    existing.total += r.engagementScore
    existing.count++
    dailyMap.set(day, existing)
  }
  const engagementTrend = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, data]) => ({ date, avgEngagement: Math.round(data.total / data.count) }))

  return successResponse({
    summary: {
      totalCallsAnalyzed: records.length,
      avgSentiment,
      avgEngagement,
      avgBuyingIntent: primaryIntent,
      avgTalkRatio: { ai: avgAiTalk, buyer: avgBuyerTalk },
    },
    sentimentDistribution: sentimentDistPct,
    topBuyingSignals,
    topObjections,
    competitorMentions,
    scriptPerformance: { avgEffectiveness, topSuggestions },
    engagementTrend,
  })
}
