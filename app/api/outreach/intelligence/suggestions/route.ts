import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// GET /api/outreach/intelligence/suggestions — Aggregated script suggestions
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const campaignId = url.searchParams.get('campaignId') || undefined

  // Build where clause
  const where: Record<string, unknown> = { profileId: profile.id }
  if (campaignId) {
    const callIds = await prisma.campaignCall.findMany({
      where: { campaignId },
      select: { id: true },
    })
    where.callId = { in: callIds.map(c => c.id) }
  }

  const records = await prisma.callIntelligence.findMany({
    where: where as any,
    select: { scriptSuggestions: true, callId: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  // Aggregate suggestions with fuzzy grouping
  const groups = new Map<string, {
    suggestion: string
    count: number
    priority: string
    reasons: string[]
    callIds: string[]
  }>()

  for (const r of records) {
    const suggestions = (r.scriptSuggestions as Array<{ suggestion: string; reason: string; priority: string }>) || []
    for (const s of suggestions) {
      if (!s.suggestion) continue
      // Fuzzy key: lowercase first 50 chars
      const key = s.suggestion.toLowerCase().slice(0, 50).replace(/[^a-z0-9 ]/g, '')
      const existing = groups.get(key) || {
        suggestion: s.suggestion,
        count: 0,
        priority: s.priority || 'medium',
        reasons: [],
        callIds: [],
      }
      existing.count++
      if (existing.reasons.length < 5 && s.reason) existing.reasons.push(s.reason)
      if (existing.callIds.length < 5) existing.callIds.push(r.callId)
      if (s.priority === 'high') existing.priority = 'high'
      groups.set(key, existing)
    }
  }

  const suggestions = Array.from(groups.values())
    .sort((a, b) => {
      // Sort by priority first, then count
      const prio = { high: 3, medium: 2, low: 1 }
      const aPrio = prio[a.priority as keyof typeof prio] || 1
      const bPrio = prio[b.priority as keyof typeof prio] || 1
      if (aPrio !== bPrio) return bPrio - aPrio
      return b.count - a.count
    })
    .slice(0, 10)
    .map(g => ({
      suggestion: g.suggestion,
      count: g.count,
      priority: g.priority,
      reasons: g.reasons,
      exampleCallIds: g.callIds,
    }))

  return successResponse({ suggestions, totalCallsAnalyzed: records.length })
}
