import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── In-memory briefing cache (30 min TTL) ────────────────────────────────────

interface CachedBriefing {
  content: string
  signals: BriefingSignals
  generatedAt: number
}

const briefingCache = new Map<string, CachedBriefing>()
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// ── Signal types ─────────────────────────────────────────────────────────────

interface BriefingSignals {
  contractsNeedingAttention: number
  marketplaceInquiries: number
  activeCampaigns: number
  callsToday: number
  staleBuyers: number
  activeDeals: number
  dealsUnderOffer: number
  recentWins: number
  totalBuyers: number
  totalListings: number
  suggestedActions: string[]
}

// ── Gather signals from the database ─────────────────────────────────────────

async function gatherSignals(profileId: string): Promise<BriefingSignals> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000)
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3_600_000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)

  const [
    contractsSent,
    staleContracts,
    recentInquiries,
    activeCampaigns,
    callsToday,
    staleBuyers,
    activeDeals,
    dealsUnderOffer,
    recentExecuted,
    totalBuyers,
    activeListings,
  ] = await Promise.all([
    // 1. Contracts awaiting signature (SENT status)
    prisma.contract.count({
      where: { profileId, status: 'SENT' },
    }),

    // 2. Stale contracts — SENT for > 48 hours
    prisma.contract.count({
      where: {
        profileId,
        status: 'SENT',
        updatedAt: { lt: fortyEightHoursAgo },
      },
    }),

    // 3. Marketplace inquiries in last 7 days
    prisma.marketplaceInquiry.count({
      where: {
        listing: { profileId },
        createdAt: { gte: sevenDaysAgo },
      },
    }),

    // 4. Active campaigns (RUNNING status)
    prisma.campaign.count({
      where: { profileId, status: 'RUNNING' },
    }),

    // 5. Calls completed today
    prisma.campaignCall.count({
      where: {
        campaign: { profileId },
        createdAt: { gte: todayStart },
      },
    }),

    // 6. Stale high-value buyers (HIGH_CONFIDENCE, no activity in 14+ days)
    prisma.cashBuyer.count({
      where: {
        profileId,
        status: 'HIGH_CONFIDENCE',
        updatedAt: { lt: fourteenDaysAgo },
      },
    }),

    // 7. Active deals
    prisma.deal.count({
      where: { profileId, status: 'ACTIVE' },
    }),

    // 8. Deals under offer
    prisma.deal.count({
      where: { profileId, status: 'UNDER_OFFER' },
    }),

    // 9. Recently executed contracts (last 7 days)
    prisma.contract.count({
      where: {
        profileId,
        status: 'EXECUTED',
        updatedAt: { gte: sevenDaysAgo },
      },
    }),

    // 10. Total active buyers
    prisma.cashBuyer.count({
      where: { profileId, isOptedOut: false },
    }),

    // 11. Active marketplace listings
    prisma.marketplaceListing.count({
      where: { profileId, status: 'ACTIVE' },
    }),
  ])

  // Build suggested actions based on signals
  const suggestedActions: string[] = []

  if (staleContracts > 0) {
    suggestedActions.push(`Follow up on ${staleContracts} stale contract${staleContracts > 1 ? 's' : ''} awaiting signature`)
  }
  if (recentInquiries > 0) {
    suggestedActions.push(`Review ${recentInquiries} new marketplace inquir${recentInquiries > 1 ? 'ies' : 'y'}`)
  }
  if (staleBuyers > 0) {
    suggestedActions.push(`Re-engage ${staleBuyers} high-value buyer${staleBuyers > 1 ? 's' : ''} going cold`)
  }
  if (activeDeals > 0 && activeCampaigns === 0) {
    suggestedActions.push('Launch an outreach campaign for your active deals')
  }
  if (dealsUnderOffer > 0) {
    suggestedActions.push(`Check status on ${dealsUnderOffer} deal${dealsUnderOffer > 1 ? 's' : ''} under offer`)
  }

  return {
    contractsNeedingAttention: contractsSent,
    marketplaceInquiries: recentInquiries,
    activeCampaigns,
    callsToday,
    staleBuyers,
    activeDeals,
    dealsUnderOffer,
    recentWins: recentExecuted,
    totalBuyers,
    totalListings: activeListings,
    suggestedActions,
  }
}

// ── Generate briefing via Anthropic API ──────────────────────────────────────

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

async function generateBriefing(
  signals: BriefingSignals,
  greeting: string,
): Promise<string> {
  const signalSummary = `
- Contracts awaiting signature: ${signals.contractsNeedingAttention}
- Marketplace inquiries (7d): ${signals.marketplaceInquiries}
- Active campaigns: ${signals.activeCampaigns}
- Calls completed today: ${signals.callsToday}
- High-value buyers going stale (14d+ no activity): ${signals.staleBuyers}
- Active deals: ${signals.activeDeals}
- Deals under offer: ${signals.dealsUnderOffer}
- Recently executed contracts (7d): ${signals.recentWins}
- Total active buyers: ${signals.totalBuyers}
- Active marketplace listings: ${signals.totalListings}
`

  const systemPrompt = `You are the AI assistant for DealFlow AI, a real estate wholesaling platform. Generate a concise, personalized daily briefing for the wholesaler.

Rules:
- Start with the greeting provided, then give the briefing
- Use markdown formatting with headers and bullet points
- Be concise — the entire briefing should be 150-250 words max
- Focus on ACTIONABLE insights, not just restating numbers
- If there are urgent items (stale contracts, cold buyers), lead with those
- End with 2-3 specific suggested next steps
- Use real estate wholesaling terminology naturally
- If numbers are all zero, acknowledge they're getting started and suggest first steps
- Do NOT use generic filler — every sentence should be specific to their data`

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate today's briefing using this greeting and data.\n\nGreeting: "${greeting}"\n\nAccount signals:\n${signalSummary}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    console.error('Briefing generation API error:', res.status)
    throw new Error('Failed to generate briefing')
  }

  const data = await res.json()
  return data.content?.[0]?.text?.trim() ?? 'Unable to generate briefing.'
}

// ── Time-based greeting ──────────────────────────────────────────────────────

function getGreeting(timezone?: string): string {
  let hour: number
  try {
    if (timezone) {
      const now = new Date()
      const formatted = now.toLocaleString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      })
      hour = parseInt(formatted, 10)
    } else {
      hour = new Date().getUTCHours()
    }
  } catch {
    hour = new Date().getUTCHours()
  }

  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── GET /api/chat/briefing ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const refresh = req.nextUrl.searchParams.get('refresh') === 'true'
    const timezone = req.headers.get('x-timezone') || undefined

    // Check cache (unless refresh requested)
    if (!refresh) {
      const cached = briefingCache.get(profile.id)
      if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
        return NextResponse.json({
          briefing: cached.content,
          signals: cached.signals,
          cached: true,
          generatedAt: new Date(cached.generatedAt).toISOString(),
        })
      }
    }

    // Gather signals
    const signals = await gatherSignals(profile.id)
    const greeting = getGreeting(timezone)

    // Generate briefing
    const content = await generateBriefing(signals, greeting)

    // Cache it
    const generatedAt = Date.now()
    briefingCache.set(profile.id, { content, signals, generatedAt })

    return NextResponse.json({
      briefing: content,
      signals,
      cached: false,
      generatedAt: new Date(generatedAt).toISOString(),
    })
  } catch (err) {
    console.error('GET /api/chat/briefing error:', err)
    return NextResponse.json(
      { error: 'Failed to generate briefing' },
      { status: 500 },
    )
  }
}
