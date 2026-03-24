import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'

const CACHE_DAYS = 7
const MODEL = 'claude-haiku-4-5-20251001'

/**
 * POST /api/crm/buyers/[id]/insights
 *
 * Generate (or return cached) AI buyer insight summary using Anthropic API.
 * Body: { force?: boolean } — set force=true to regenerate even if cached
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'ANTHROPIC_API_KEY not configured',
        insight: null,
      }, { status: 503 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const force = body.force === true

    const buyer = await prisma.cashBuyer.findFirst({
      where: { id, profileId: profile.id },
      include: {
        campaignCalls: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            outcome: true,
            durationSecs: true,
            aiSummary: true,
            createdAt: true,
          },
        },
        dealMatches: {
          include: { deal: { select: { address: true, city: true, state: true, askingPrice: true, arv: true } } },
          orderBy: { matchScore: 'desc' },
          take: 10,
        },
        offers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { amount: true, status: true, createdAt: true },
        },
        tags: {
          include: { tag: { select: { label: true } } },
        },
        activityEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { type: true, title: true, createdAt: true },
        },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // Check cache
    if (!force && buyer.aiInsight && buyer.aiInsightGeneratedAt) {
      const cacheAge = Date.now() - new Date(buyer.aiInsightGeneratedAt).getTime()
      if (cacheAge < CACHE_DAYS * 24 * 60 * 60 * 1000) {
        return NextResponse.json({
          insight: buyer.aiInsight,
          generatedAt: buyer.aiInsightGeneratedAt,
          cached: true,
        })
      }
    }

    // Build prompt
    const buyerName = buyer.entityName || [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || 'Unknown'
    const callSummaries = buyer.campaignCalls.map(c =>
      `- ${c.outcome || 'Unknown'} call (${c.durationSecs ? Math.round(c.durationSecs / 60) + 'min' : 'unknown duration'})${c.aiSummary ? ': ' + c.aiSummary : ''}`
    ).join('\n')
    const dealSummaries = buyer.dealMatches.map(m =>
      `- ${m.deal.address}, ${m.deal.city} ${m.deal.state} | Match: ${m.matchScore}% | Ask: $${m.deal.askingPrice?.toLocaleString()} | ARV: $${m.deal.arv?.toLocaleString() || 'N/A'} | Outreach sent: ${m.outreachSent ? 'Yes' : 'No'}`
    ).join('\n')
    const offerSummaries = buyer.offers.map(o =>
      `- $${o.amount.toLocaleString()} | Status: ${o.status} | ${new Date(o.createdAt).toLocaleDateString()}`
    ).join('\n')
    const tagList = buyer.tags.map(t => t.tag.label).join(', ')

    const userPrompt = `Buyer Profile:
Name: ${buyerName}
Entity Type: ${buyer.entityType || 'Individual'}
Phone: ${buyer.phone || 'Not provided'}
Email: ${buyer.email || 'Not provided'}
Contact Enriched: ${buyer.contactEnriched ? 'Yes' : 'No'}

Buy Box:
- Preferred Types: ${buyer.preferredTypes?.join(', ') || 'Not specified'}
- Strategy: ${buyer.strategy || 'Not specified'}
- Price Range: ${buyer.minPrice ? '$' + buyer.minPrice.toLocaleString() : '?'} - ${buyer.maxPrice ? '$' + buyer.maxPrice.toLocaleString() : '?'}
- Close Speed: ${buyer.closeSpeedDays ? buyer.closeSpeedDays + ' days' : 'Not specified'}
- Preferred Markets: ${buyer.preferredMarkets?.join(', ') || 'Not specified'}
- Proof of Funds: ${buyer.proofOfFundsVerified ? 'Verified' : 'Not verified'}

Score: ${buyer.buyerScore}/100 (Status: ${buyer.status})
Cash Purchases: ${buyer.cashPurchaseCount}
Last Contacted: ${buyer.lastContactedAt ? new Date(buyer.lastContactedAt).toLocaleDateString() : 'Never'}
Tags: ${tagList || 'None'}

Call History (${buyer.campaignCalls.length} calls):
${callSummaries || 'No calls recorded'}

Deal Matches (${buyer.dealMatches.length} matches):
${dealSummaries || 'No deals matched'}

Offers (${buyer.offers.length} offers):
${offerSummaries || 'No offers made'}

Recent Activity:
${buyer.activityEvents.map(e => `- ${e.title} (${new Date(e.createdAt).toLocaleDateString()})`).join('\n') || 'No recent activity'}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: 'You are an AI assistant for a real estate wholesale CRM. Generate a concise, actionable buyer profile summary for a wholesaler. Be direct and specific. Focus on what makes this buyer valuable or risky, and what the wholesaler should do next. Keep it to 3-4 short paragraphs. Do not use any markdown formatting or bullet points.',
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      logger.error('Anthropic API error', { status: response.status, body: errData })
      return NextResponse.json({ error: 'AI generation failed', detail: errData }, { status: 502 })
    }

    const result = await response.json()
    const insight = result.content?.[0]?.text || ''
    const generatedAt = new Date()

    // Cache the insight
    await prisma.cashBuyer.update({
      where: { id },
      data: { aiInsight: insight, aiInsightGeneratedAt: generatedAt },
    })

    return NextResponse.json({ insight, generatedAt: generatedAt.toISOString(), cached: false })
  } catch (err) {
    logger.error('POST /api/crm/buyers/[id]/insights error', { route: '/api/crm/buyers/[id]/insights', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }
}
