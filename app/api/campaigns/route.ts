import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/campaigns — list all campaigns for current user
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const campaigns = await prisma.campaign.findMany({
      where: { profileId: profile.id },
      include: {
        _count: { select: { calls: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Campaigns GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

// POST /api/campaigns — create a new campaign
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await req.json()
    const {
      name,
      market,
      mode,
      buyerIds,
      scriptTemplate,
      companyName,
      agentName,
      customScript,
      maxConcurrentCalls,
      callingHoursStart,
      callingHoursEnd,
      timezone,
      leaveVoicemail,
      maxRetries,
      retryDelayHours,
      scheduledAt,
      isRecurring,
    } = body

    if (!name || !market || !buyerIds?.length) {
      return NextResponse.json({ error: 'name, market, and buyerIds are required' }, { status: 400 })
    }

    // Create the campaign
    const campaign = await prisma.campaign.create({
      data: {
        profileId: profile.id,
        name,
        market,
        mode: mode || 'AI',
        scriptTemplate: scriptTemplate || 'standard_qualification',
        companyName,
        agentName,
        customScript,
        maxConcurrentCalls: maxConcurrentCalls || 5,
        callingHoursStart: callingHoursStart || '09:00',
        callingHoursEnd: callingHoursEnd || '19:00',
        timezone: timezone || 'America/New_York',
        leaveVoicemail: leaveVoicemail ?? true,
        maxRetries: maxRetries || 2,
        retryDelayHours: retryDelayHours || 24,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        isRecurring: isRecurring || false,
        totalBuyers: buyerIds.length,
        status: scheduledAt ? 'DRAFT' : 'RUNNING',
        startedAt: scheduledAt ? null : new Date(),
      },
    })

    // Create call records for each buyer
    const buyers = await prisma.cashBuyer.findMany({
      where: { id: { in: buyerIds }, isOptedOut: false, phone: { not: null } },
    })

    await prisma.campaignCall.createMany({
      data: buyers.map(buyer => ({
        campaignId: campaign.id,
        buyerId: buyer.id,
        phoneNumber: buyer.phone!,
      })),
    })

    // If launching now, trigger the calling engine
    if (!scheduledAt && mode === 'AI') {
      // Fire and forget — don't await
      triggerCampaign(campaign.id, buyers.map(b => ({
        callId: '',
        buyerId: b.id,
        phone: b.phone!,
        name: b.entityName || `${b.firstName || ''} ${b.lastName || ''}`.trim(),
      })), {
        companyName: companyName || 'our company',
        agentName: agentName || 'Alex',
        scriptTemplate: scriptTemplate || 'standard_qualification',
        maxConcurrent: maxConcurrentCalls || 5,
        market,
      }).catch(console.error)
    }

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error('Campaign POST error:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

// ── Bland AI calling engine ──────────────────────────────────────────────────

interface BuyerCall {
  callId: string
  buyerId: string
  phone: string
  name: string
}

interface CampaignConfig {
  companyName: string
  agentName: string
  scriptTemplate: string
  maxConcurrent: number
  market: string
}

async function triggerCampaign(campaignId: string, buyers: BuyerCall[], config: CampaignConfig) {
  const BLAND_KEY = process.env.BLAND_API_KEY
  if (!BLAND_KEY) {
    console.log('No BLAND_API_KEY set — skipping actual calls in development')
    return
  }

  const webhookBase = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'

  // Build the script for the selected template
  const script = buildScript(config.scriptTemplate, config.companyName, config.agentName, config.market)

  // Process in batches of maxConcurrent
  const batches: BuyerCall[][] = []
  for (let i = 0; i < buyers.length; i += config.maxConcurrent) {
    batches.push(buyers.slice(i, i + config.maxConcurrent))
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (buyer) => {
        try {
          // Check opt-out list before calling
          const isOptedOut = await prisma.optOut.findUnique({ where: { phone: buyer.phone } })
          if (isOptedOut) {
            await prisma.cashBuyer.update({ where: { id: buyer.buyerId }, data: { isOptedOut: true } })
            return
          }

          // Compliance check — only call during allowed hours in buyer's timezone
          const now = new Date()
          const hour = now.getHours()
          if (hour < 9 || hour > 19) {
            console.log(`Skipping call to ${buyer.phone} — outside calling hours`)
            return
          }

          // Make the Bland AI call
          // Docs: https://docs.bland.ai/api-v1/post/calls
          const res = await fetch('https://api.bland.ai/v1/calls', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: BLAND_KEY,
            },
            body: JSON.stringify({
              phone_number: buyer.phone,
              task: script,
              voice: 'maya',          // ElevenLabs-quality voice
              reduce_latency: true,
              wait_for_greeting: true,
              record: true,
              max_duration: 8,        // 8 minute max per call
              webhook: `${webhookBase}/api/webhooks/bland`,
              metadata: {
                campaignId,
                buyerId: buyer.buyerId,
                buyerName: buyer.name,
              },
              // Dynamic variables inserted into script
              request_data: {
                buyer_name: buyer.name,
                company_name: config.companyName,
                agent_name: config.agentName,
                market: config.market,
              },
            }),
          })

          if (res.ok) {
            const data = await res.json()
            // Update the call record with Bland's call ID
            await prisma.campaignCall.updateMany({
              where: { campaignId, buyerId: buyer.buyerId },
              data: {
                blandCallId: data.call_id,
                startedAt: new Date(),
              },
            })
          } else {
            const err = await res.text()
            console.error(`Bland API error for ${buyer.phone}:`, err)
          }
        } catch (err) {
          console.error(`Call error for buyer ${buyer.buyerId}:`, err)
        }
      })
    )

    // Small delay between batches to avoid rate limits
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

// ── Script templates ──────────────────────────────────────────────────────────

function buildScript(template: string, company: string, agent: string, market: string): string {
  const scripts: Record<string, string> = {
    standard_qualification: `
You are ${agent}, a real estate acquisition specialist calling on behalf of ${company}.

You are calling to speak with a cash real estate investor about potential deals in ${market}.

STEP 1 — Introduction:
"Hi, this is ${agent} calling from ${company}. I'm reaching out because our records show you've been an active cash buyer in ${market}. I have a quick question for you — are you still actively buying investment properties in this area?"

If YES, proceed to Step 2.
If NO or not interested, thank them politely and end the call. Mark as NOT_BUYING.

STEP 2 — Qualify their buy box:
Ask these questions naturally in conversation (not as a list):
1. "What types of properties are you focused on right now — single family, multifamily, or land?"
2. "What price range are you working in?"
3. "Are you more of a fix-and-flip investor or do you prefer buy-and-hold for rentals?"
4. "And roughly, if the right deal came along — how quickly could you close?"

STEP 3 — Close:
"Perfect, that's really helpful. I'm going to add you to our buyer network and send you deals that match exactly what you just described — only properties that fit your criteria. Would that be alright?"

If yes: "Great. I'll have our system send you details on any new matches in ${market}. Thanks for your time, have a great day."

IMPORTANT RULES:
- Be conversational, not robotic. Listen and adapt.
- Never push someone who says they're not buying.
- If asked if you're an AI, be transparent: "Yes, I'm an AI assistant — but the deals and the team behind them are very real."
- Keep the call under 5 minutes.
- Do not discuss specific deals unless specifically prompted.
    `.trim(),

    check_in: `
You are ${agent} from ${company}, calling to check in with an existing buyer contact in ${market}.

"Hi, this is ${agent} from ${company}. We've worked together before and I just wanted to do a quick check-in — are you still actively looking for investment properties in ${market}?"

If yes, ask:
- "Has anything changed in your buy box — price range or property types?"
- "How's your timeline looking for your next deal?"

Keep it brief and friendly. This is a relationship call, not a hard pitch.
    `.trim(),

    deal_specific: `
You are ${agent} from ${company}. You are calling about a specific property deal in ${market}.

"Hi, this is ${agent} from ${company}. I'm reaching out because we have a property under contract in ${market} that I think might be a strong fit for you. Do you have about 2 minutes?"

If yes, ask:
- "Are you currently buying in [the specific area]?"
- "What price range are you working in right now?"
- "Would a [property type] at [price range] be something you'd want more details on?"

If they're interested, tell them you'll send the full deal details right away.
    `.trim(),

    new_market: `
You are ${agent} from ${company}, introducing your buyer network to investors in ${market}.

"Hi, this is ${agent} from ${company}. We're a real estate investment platform that sources off-market deals in ${market} and matches them to qualified cash buyers. I wanted to reach out and see if that's something that might interest you."

If interested, qualify:
- What types of properties and price ranges they want
- How they prefer to be contacted about new deals
- How quickly they can typically close

End by adding them to the notification list.
    `.trim(),
  }

  return scripts[template] || scripts.standard_qualification
}