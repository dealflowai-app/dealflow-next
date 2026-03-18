// ─── Smart Call Scheduler ────────────────────────────────────────────────────
// Learns optimal call times per buyer, reorders campaign queues for max
// connection rate, handles callback scheduling, and auto-redistributes
// underperforming time slots.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getRecipientTimezone, isWithinCallingHours } from './timezone-map'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BuyerCallWindow {
  buyerId: string
  phone: string
  timezone: string
  bestDay: string | null
  bestHour: number | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  nextOptimalSlot: Date | null
  reason: string
}

export interface ScheduleOptimization {
  buyerId: string
  callId: string
  scheduledFor: Date
  reason: string
  priority: number // 1 = highest
}

export interface RedistributionSuggestion {
  action: string
  reason: string
  shift?: { from: string; to: string }
  skipDays?: string[]
}

// ─── Day names ──────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function dayIndex(name: string): number {
  return DAY_NAMES.findIndex(d => d.toLowerCase() === name.toLowerCase())
}

// ─── Analyze single buyer's call patterns ───────────────────────────────────

export async function analyzeBuyerCallPatterns(
  buyerId: string,
  profileId: string,
): Promise<BuyerCallWindow> {
  const buyer = await prisma.cashBuyer.findUnique({
    where: { id: buyerId },
    select: { phone: true, state: true },
  })

  const phone = buyer?.phone || ''
  const timezone = getRecipientTimezone(phone, buyer?.state)

  const calls = await prisma.campaignCall.findMany({
    where: {
      buyerId,
      campaign: { profileId },
      outcome: { not: null },
      startedAt: { not: null },
    },
    select: { startedAt: true, outcome: true, durationSecs: true },
  })

  if (calls.length === 0) {
    return { buyerId, phone, timezone, bestDay: null, bestHour: null, confidence: 'none', nextOptimalSlot: null, reason: 'No call history' }
  }

  // Bucket by dayOfWeek + hour
  const slots: Record<string, { total: number; connected: number }> = {}
  for (const c of calls) {
    if (!c.startedAt) continue
    const d = c.startedAt.getDay()
    const h = c.startedAt.getHours()
    const key = `${d}-${h}`
    if (!slots[key]) slots[key] = { total: 0, connected: 0 }
    slots[key].total++
    if (c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED') {
      slots[key].connected++
    }
  }

  // Find best slot
  let bestKey = ''
  let bestRate = 0
  let bestTotal = 0
  for (const [key, data] of Object.entries(slots)) {
    const rate = data.total > 0 ? data.connected / data.total : 0
    if (rate > bestRate || (rate === bestRate && data.total > bestTotal)) {
      bestKey = key
      bestRate = rate
      bestTotal = data.total
    }
  }

  if (!bestKey) {
    return { buyerId, phone, timezone, bestDay: null, bestHour: null, confidence: 'none', nextOptimalSlot: null, reason: 'No clear pattern' }
  }

  const [dayStr, hourStr] = bestKey.split('-')
  const bestDayIdx = parseInt(dayStr)
  const bestHour = parseInt(hourStr)
  const bestDay = DAY_NAMES[bestDayIdx]

  const confidence: BuyerCallWindow['confidence'] =
    bestTotal >= 3 && bestRate > 0.5 ? 'high' :
    bestTotal >= 2 ? 'medium' : 'low'

  const connectedCount = slots[bestKey].connected
  const reason = `Answered ${connectedCount} of ${bestTotal} calls around ${bestHour}:00 on ${bestDay}s`

  const nextOptimalSlot = computeNextSlot(bestDayIdx, bestHour, timezone)

  return { buyerId, phone, timezone, bestDay, bestHour, confidence, nextOptimalSlot, reason }
}

// ─── Bulk pattern analysis (one query for all buyers) ───────────────────────

export async function analyzeCallPatternsForAudience(
  buyerIds: string[],
  profileId: string,
): Promise<Map<string, BuyerCallWindow>> {
  const results = new Map<string, BuyerCallWindow>()
  if (buyerIds.length === 0) return results

  // Fetch all buyer info in one query
  const buyers = await prisma.cashBuyer.findMany({
    where: { id: { in: buyerIds }, profileId },
    select: { id: true, phone: true, state: true },
  })
  const buyerMap = new Map(buyers.map(b => [b.id, b]))

  // Fetch all calls for these buyers in one query
  const calls = await prisma.campaignCall.findMany({
    where: {
      buyerId: { in: buyerIds },
      campaign: { profileId },
      outcome: { not: null },
      startedAt: { not: null },
    },
    select: { buyerId: true, startedAt: true, outcome: true },
  })

  // Bucket by buyer → dayOfWeek-hour
  const buckets: Record<string, Record<string, { total: number; connected: number }>> = {}
  for (const c of calls) {
    if (!c.startedAt) continue
    if (!buckets[c.buyerId]) buckets[c.buyerId] = {}
    const key = `${c.startedAt.getDay()}-${c.startedAt.getHours()}`
    if (!buckets[c.buyerId][key]) buckets[c.buyerId][key] = { total: 0, connected: 0 }
    buckets[c.buyerId][key].total++
    if (c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED') {
      buckets[c.buyerId][key].connected++
    }
  }

  for (const buyerId of buyerIds) {
    const buyer = buyerMap.get(buyerId)
    const phone = buyer?.phone || ''
    const timezone = getRecipientTimezone(phone, buyer?.state)
    const slots = buckets[buyerId]

    if (!slots || Object.keys(slots).length === 0) {
      results.set(buyerId, {
        buyerId, phone, timezone, bestDay: null, bestHour: null,
        confidence: 'none', nextOptimalSlot: null, reason: 'No call history',
      })
      continue
    }

    let bestKey = ''
    let bestRate = 0
    let bestTotal = 0
    for (const [key, data] of Object.entries(slots)) {
      const rate = data.total > 0 ? data.connected / data.total : 0
      if (rate > bestRate || (rate === bestRate && data.total > bestTotal)) {
        bestKey = key
        bestRate = rate
        bestTotal = data.total
      }
    }

    if (!bestKey) {
      results.set(buyerId, {
        buyerId, phone, timezone, bestDay: null, bestHour: null,
        confidence: 'none', nextOptimalSlot: null, reason: 'No clear pattern',
      })
      continue
    }

    const [dayStr, hourStr] = bestKey.split('-')
    const bestDayIdx = parseInt(dayStr)
    const bestHour = parseInt(hourStr)
    const bestDay = DAY_NAMES[bestDayIdx]
    const confidence: BuyerCallWindow['confidence'] =
      bestTotal >= 3 && bestRate > 0.5 ? 'high' :
      bestTotal >= 2 ? 'medium' : 'low'

    const connectedCount = slots[bestKey].connected
    const reason = `Answered ${connectedCount} of ${bestTotal} calls around ${bestHour}:00 on ${bestDay}s`
    const nextOptimalSlot = computeNextSlot(bestDayIdx, bestHour, timezone)

    results.set(buyerId, { buyerId, phone, timezone, bestDay, bestHour, confidence, nextOptimalSlot, reason })
  }

  return results
}

// ─── Market-level defaults ──────────────────────────────────────────────────

export async function getMarketDefaults(
  market: string,
  profileId: string,
): Promise<{ day: number; hour: number; connectionRate: number }[]> {
  const calls = await prisma.campaignCall.findMany({
    where: {
      campaign: { profileId, market },
      outcome: { not: null },
      startedAt: { not: null },
    },
    select: { startedAt: true, outcome: true },
    take: 5000,
  })

  const slots: Record<string, { total: number; connected: number }> = {}
  for (const c of calls) {
    if (!c.startedAt) continue
    const key = `${c.startedAt.getDay()}-${c.startedAt.getHours()}`
    if (!slots[key]) slots[key] = { total: 0, connected: 0 }
    slots[key].total++
    if (c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED') {
      slots[key].connected++
    }
  }

  return Object.entries(slots)
    .map(([key, data]) => {
      const [d, h] = key.split('-')
      return { day: parseInt(d), hour: parseInt(h), connectionRate: data.total > 0 ? data.connected / data.total : 0 }
    })
    .filter(s => s.connectionRate > 0)
    .sort((a, b) => b.connectionRate - a.connectionRate)
    .slice(0, 3)
}

// ─── Optimize campaign schedule ─────────────────────────────────────────────

export async function optimizeSchedule(campaignId: string): Promise<ScheduleOptimization[]> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, profileId: true, market: true },
    })
    if (!campaign) return []

    // Fetch pending calls with buyer info
    const pendingCalls = await prisma.campaignCall.findMany({
      where: { campaignId, OR: [{ outcome: null, startedAt: null }, { outcome: 'NO_ANSWER' }, { outcome: 'VOICEMAIL' }] },
      select: {
        id: true, buyerId: true,
        buyer: { select: { id: true, phone: true, state: true, buyerScore: true } },
      },
    })

    if (pendingCalls.length === 0) return []

    const buyerIds = pendingCalls.map(c => c.buyerId)
    const now = new Date()

    // Get scheduled callbacks
    const callbacks = await prisma.scheduledCallback.findMany({
      where: { profileId: campaign.profileId, buyerId: { in: buyerIds }, status: 'scheduled', scheduledAt: { lte: now } },
      select: { buyerId: true, scheduledAt: true, reason: true },
    })
    const callbackBuyerIds = new Set(callbacks.map(cb => cb.buyerId))

    // Bulk pattern analysis
    const patterns = await analyzeCallPatternsForAudience(buyerIds, campaign.profileId)

    // Market defaults fallback
    const marketDefaults = await getMarketDefaults(campaign.market, campaign.profileId)
    const currentHour = now.getHours()
    const currentDay = now.getDay()
    const isInMarketDefault = marketDefaults.some(d => d.day === currentDay && d.hour === currentHour)

    // Assign priorities
    const optimized: ScheduleOptimization[] = pendingCalls.map(call => {
      const pattern = patterns.get(call.buyerId)
      const score = call.buyer.buyerScore || 0
      const cb = callbacks.find(c => c.buyerId === call.buyerId)

      let priority: number
      let reason: string

      if (callbackBuyerIds.has(call.buyerId) && cb) {
        priority = 1
        reason = `Scheduled callback: ${cb.reason}`
      } else if (pattern?.confidence === 'high' && pattern.bestHour === currentHour) {
        priority = 2
        reason = `In optimal window (${pattern.reason})`
      } else if (score >= 80) {
        priority = 3
        reason = `High-value buyer (score ${score})`
      } else if (pattern?.confidence === 'medium' && pattern.bestHour === currentHour) {
        priority = 4
        reason = `Likely good time (${pattern.reason})`
      } else if (pattern?.confidence === 'none' && isInMarketDefault) {
        priority = 5
        reason = 'No history — using market default time'
      } else {
        priority = 6
        reason = 'Standard queue order'
      }

      return {
        buyerId: call.buyerId,
        callId: call.id,
        scheduledFor: now,
        reason,
        priority,
      }
    })

    // Sort by priority asc, then score desc within each priority
    const scoreMap = new Map(pendingCalls.map(c => [c.buyerId, c.buyer.buyerScore || 0]))
    optimized.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return (scoreMap.get(b.buyerId) || 0) - (scoreMap.get(a.buyerId) || 0)
    })

    return optimized
  } catch (err) {
    logger.error('optimizeSchedule failed, falling back to FIFO', {
      route: 'smart-scheduler', campaignId,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

// ─── Auto-redistribute based on campaign performance ────────────────────────

export async function autoRedistribute(campaignId: string): Promise<RedistributionSuggestion[]> {
  const suggestions: RedistributionSuggestion[] = []

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { profileId: true },
    })
    if (!campaign) return suggestions

    const calls = await prisma.campaignCall.findMany({
      where: { campaignId, outcome: { not: null }, startedAt: { not: null } },
      select: { startedAt: true, outcome: true },
    })

    if (calls.length < 20) return suggestions // Need enough data

    // Morning vs afternoon comparison
    let morningTotal = 0, morningConnected = 0
    let afternoonTotal = 0, afternoonConnected = 0
    const dayTotals: Record<number, { total: number; connected: number }> = {}

    for (const c of calls) {
      if (!c.startedAt) continue
      const h = c.startedAt.getHours()
      const d = c.startedAt.getDay()
      const connected = c.outcome === 'QUALIFIED' || c.outcome === 'NOT_BUYING' || c.outcome === 'CALLBACK_REQUESTED'

      if (h >= 9 && h < 12) {
        morningTotal++
        if (connected) morningConnected++
      } else if (h >= 13 && h < 17) {
        afternoonTotal++
        if (connected) afternoonConnected++
      }

      if (!dayTotals[d]) dayTotals[d] = { total: 0, connected: 0 }
      dayTotals[d].total++
      if (connected) dayTotals[d].connected++
    }

    // Check morning vs afternoon
    const morningRate = morningTotal > 5 ? Math.round((morningConnected / morningTotal) * 100) : -1
    const afternoonRate = afternoonTotal > 5 ? Math.round((afternoonConnected / afternoonTotal) * 100) : -1

    if (morningRate >= 0 && afternoonRate >= 0 && morningRate < 10 && afternoonRate > 25) {
      suggestions.push({
        action: 'shift_afternoon',
        reason: `Morning connection rate is ${morningRate}% vs ${afternoonRate}% afternoon`,
        shift: { from: '9am-12pm', to: '1pm-5pm' },
      })
    } else if (morningRate >= 0 && afternoonRate >= 0 && afternoonRate < 10 && morningRate > 25) {
      suggestions.push({
        action: 'shift_morning',
        reason: `Afternoon connection rate is ${afternoonRate}% vs ${morningRate}% morning`,
        shift: { from: '1pm-5pm', to: '9am-12pm' },
      })
    }

    // Check for consistently bad days
    const skipDays: string[] = []
    for (const [dayIdx, data] of Object.entries(dayTotals)) {
      if (data.total >= 5) {
        const rate = Math.round((data.connected / data.total) * 100)
        if (rate < 5) {
          skipDays.push(DAY_NAMES[parseInt(dayIdx)])
        }
      }
    }

    if (skipDays.length > 0) {
      suggestions.push({
        action: 'skip_days',
        reason: `${skipDays.join(', ')} consistently low connection rates (<5%)`,
        skipDays,
      })
    }

    return suggestions
  } catch (err) {
    logger.error('autoRedistribute failed', {
      route: 'smart-scheduler', campaignId,
      error: err instanceof Error ? err.message : String(err),
    })
    return suggestions
  }
}

// ─── Priority queue for hot deals ───────────────────────────────────────────

export async function prioritizeBuyersForDeal(
  dealId: string,
  profileId: string,
): Promise<{ prioritized: number }> {
  try {
    // Find matched buyers for this deal
    const matches = await prisma.dealMatch.findMany({
      where: { dealId, deal: { profileId } },
      select: { buyerId: true },
    })
    if (matches.length === 0) return { prioritized: 0 }

    const matchedBuyerIds = new Set(matches.map(m => m.buyerId))

    // Find running campaigns for this profile
    const campaigns = await prisma.campaign.findMany({
      where: { profileId, status: 'RUNNING' },
      select: { id: true },
    })
    if (campaigns.length === 0) return { prioritized: 0 }

    const campaignIds = campaigns.map(c => c.id)

    // Find pending calls for matched buyers in running campaigns
    const pendingCalls = await prisma.campaignCall.findMany({
      where: {
        campaignId: { in: campaignIds },
        buyerId: { in: Array.from(matchedBuyerIds) },
        outcome: null,
        startedAt: null,
      },
      select: { id: true, buyerId: true, campaignId: true },
    })

    if (pendingCalls.length === 0) return { prioritized: 0 }

    // Move these to front of queue by setting createdAt to epoch (earliest possible)
    // The executor sorts by attemptNumber asc, createdAt asc — so earliest createdAt = first
    await prisma.campaignCall.updateMany({
      where: { id: { in: pendingCalls.map(c => c.id) } },
      data: { createdAt: new Date(0) },
    })

    const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { address: true, confidenceScore: true } })

    logger.info(`Prioritized ${pendingCalls.length} buyers for deal`, {
      route: 'smart-scheduler',
      dealId,
      address: deal?.address,
      confidenceScore: deal?.confidenceScore,
      prioritizedCount: pendingCalls.length,
    })

    return { prioritized: pendingCalls.length }
  } catch (err) {
    logger.error('prioritizeBuyersForDeal failed', {
      route: 'smart-scheduler',
      error: err instanceof Error ? err.message : String(err),
    })
    return { prioritized: 0 }
  }
}

// ─── Callback time parser ───────────────────────────────────────────────────

export function parseCallbackTime(text: string, currentTimezone: string): Date | null {
  const lower = text.toLowerCase()
  const now = new Date()

  // Get current local time parts
  const localParts = new Intl.DateTimeFormat('en-US', {
    timeZone: currentTimezone, hour: 'numeric', minute: 'numeric', hour12: false,
    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)

  const currentHour = parseInt(localParts.find(p => p.type === 'hour')?.value || '12')
  const currentDay = localParts.find(p => p.type === 'weekday')?.value?.toLowerCase() || ''

  // Parse hour from text
  let targetHour: number | null = null
  let targetIsPM = false

  // "at 3", "at 3pm", "at 15:00"
  const timeMatch = lower.match(/(?:at|around|after)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
  if (timeMatch) {
    targetHour = parseInt(timeMatch[1])
    const isPM = timeMatch[3] === 'pm'
    const isAM = timeMatch[3] === 'am'
    if (isPM && targetHour < 12) targetHour += 12
    if (isAM && targetHour === 12) targetHour = 0
    if (!isPM && !isAM && targetHour >= 1 && targetHour <= 7) targetHour += 12 // "at 3" likely means 3pm
    targetIsPM = targetHour >= 12
  }

  // "after 5" without "at"
  if (targetHour === null) {
    const afterMatch = lower.match(/after\s+(\d{1,2})(?:\s*(am|pm))?/)
    if (afterMatch) {
      targetHour = parseInt(afterMatch[1])
      if (afterMatch[2] === 'pm' && targetHour < 12) targetHour += 12
      if (!afterMatch[2] && targetHour >= 1 && targetHour <= 7) targetHour += 12
    }
  }

  // "in a couple hours", "in 2 hours"
  const inHoursMatch = lower.match(/in\s+(?:a\s+couple(?:\s+of)?|(\d+))\s+hours?/)
  if (inHoursMatch) {
    const hoursOffset = inHoursMatch[1] ? parseInt(inHoursMatch[1]) : 2
    const target = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000)
    return clampToCallingHours(target, currentTimezone)
  }

  // "tomorrow afternoon", "tomorrow morning"
  const tomorrowMatch = lower.match(/tomorrow\s*(morning|afternoon|evening)?/)
  if (tomorrowMatch) {
    const period = tomorrowMatch[1]
    const hour = targetHour ?? (period === 'morning' ? 10 : period === 'afternoon' ? 14 : period === 'evening' ? 17 : 10)
    const target = new Date(now)
    target.setDate(target.getDate() + 1)
    target.setHours(hour, 0, 0, 0)
    return clampToCallingHours(target, currentTimezone)
  }

  // "next week"
  if (lower.includes('next week')) {
    const hour = targetHour ?? 10
    const target = new Date(now)
    const daysUntilMonday = ((8 - now.getDay()) % 7) || 7
    target.setDate(target.getDate() + daysUntilMonday)
    target.setHours(hour, 0, 0, 0)
    return clampToCallingHours(target, currentTimezone)
  }

  // "Thursday", "Monday", etc.
  const dayMatch = lower.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)
  if (dayMatch) {
    const targetDayName = dayMatch[1]
    const targetDayIdx = DAY_NAMES.findIndex(d => d.toLowerCase() === targetDayName)
    if (targetDayIdx >= 0) {
      const hour = targetHour ?? 10
      const target = new Date(now)
      const currentDayIdx = now.getDay()
      let daysAhead = (targetDayIdx - currentDayIdx + 7) % 7
      if (daysAhead === 0) daysAhead = 7 // next occurrence
      target.setDate(target.getDate() + daysAhead)
      target.setHours(hour, 0, 0, 0)
      return clampToCallingHours(target, currentTimezone)
    }
  }

  // "try me later", "not a good time", "busy right now"
  if (lower.includes('later') || lower.includes('not a good time') || lower.includes('busy right now') || lower.includes('busy now')) {
    const target = new Date(now.getTime() + 4 * 60 * 60 * 1000)
    return clampToCallingHours(target, currentTimezone)
  }

  // If we have a target hour but no day, schedule for today if still valid, else tomorrow
  if (targetHour !== null) {
    const target = new Date(now)
    target.setHours(targetHour, 0, 0, 0)
    if (target <= now) {
      target.setDate(target.getDate() + 1)
    }
    return clampToCallingHours(target, currentTimezone)
  }

  // Can't parse — return null (conservative approach)
  return null
}

// ─── Callback detection patterns ────────────────────────────────────────────

const CALLBACK_PATTERNS = [
  /call\s*(?:me\s*)?back/i,
  /try\s*(?:me\s*)?(?:back\s*)?(?:later|again|tomorrow|another\s*time)/i,
  /busy\s*right\s*now/i,
  /not\s*a\s*good\s*time/i,
  /can\s*you\s*call\s*(?:me\s*)?(?:back|later|tomorrow|on|at|next|in\s+\d)/i,
  /call\s*(?:me\s*)?(?:on|at|next|this)\s/i,
  /(?:give|try)\s*(?:me\s*)?a\s*call/i,
  /(?:reach|try)\s*(?:me\s*)?(?:at|after|around)\s*\d/i,
]

export function detectCallbackRequest(transcript: string): boolean {
  return CALLBACK_PATTERNS.some(p => p.test(transcript))
}

export function extractCallbackContext(transcript: string): string {
  // Pull the last 200 chars of the transcript for context
  const trimmed = transcript.trim()
  const context = trimmed.length > 200 ? trimmed.slice(-200) : trimmed
  // Summarize: just return the buyer's last statement containing callback language
  const sentences = context.split(/[.!?]+/).filter(Boolean)
  const relevant = sentences.filter(s => CALLBACK_PATTERNS.some(p => p.test(s)))
  return relevant.length > 0 ? relevant.join('. ').trim() : ''
}

// ─── Process due callbacks ──────────────────────────────────────────────────

export async function processDueCallbacks(profileId: string): Promise<string[]> {
  const now = new Date()
  const dueCallbacks = await prisma.scheduledCallback.findMany({
    where: { profileId, status: 'scheduled', scheduledAt: { lte: now } },
    include: {
      buyer: { select: { id: true, phone: true, state: true, firstName: true, lastName: true, entityName: true } },
    },
    take: 20,
    orderBy: { scheduledAt: 'asc' },
  })

  const processedIds: string[] = []

  for (const cb of dueCallbacks) {
    // Check calling hours
    const tz = getRecipientTimezone(cb.buyer.phone || '', cb.buyer.state)
    const hours = isWithinCallingHours(tz)
    if (!hours.allowed) {
      // Mark as missed if more than 24h overdue
      const overdueMsec = now.getTime() - cb.scheduledAt.getTime()
      if (overdueMsec > 24 * 60 * 60 * 1000) {
        await prisma.scheduledCallback.update({
          where: { id: cb.id },
          data: { status: 'missed' },
        })
      }
      continue
    }

    processedIds.push(cb.id)

    // Mark as completed — the campaign executor will pick up the actual call
    await prisma.scheduledCallback.update({
      where: { id: cb.id },
      data: { status: 'completed', completedAt: now },
    })
  }

  return processedIds
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeNextSlot(dayOfWeek: number, hour: number, timezone: string): Date | null {
  const now = new Date()
  const target = new Date(now)
  const currentDay = now.getDay()
  let daysAhead = (dayOfWeek - currentDay + 7) % 7

  target.setDate(target.getDate() + daysAhead)
  target.setHours(hour, 0, 0, 0)

  // If the computed time is in the past, move to next week
  if (target <= now) {
    target.setDate(target.getDate() + 7)
  }

  // Verify calling hours
  const check = isWithinCallingHours(timezone)
  if (!check.allowed && check.nextWindowStart) {
    const nextWindow = new Date(check.nextWindowStart)
    if (nextWindow > target) return nextWindow
  }

  return target
}

function clampToCallingHours(date: Date, timezone: string): Date {
  const check = isWithinCallingHours(timezone, undefined, undefined)
  // If the target time is outside calling hours, shift to next window
  const localParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: 'numeric', hour12: false,
  }).formatToParts(date)
  const hour = parseInt(localParts.find(p => p.type === 'hour')?.value || '12')

  if (hour < 8) {
    date.setHours(date.getHours() + (8 - hour))
  } else if (hour >= 21) {
    date.setDate(date.getDate() + 1)
    date.setHours(date.getHours() - hour + 9) // 9am next day
  }

  return date
}
