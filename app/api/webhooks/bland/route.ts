import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const BLAND_WEBHOOK_SECRET = process.env.BLAND_WEBHOOK_SECRET
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// POST /api/webhooks/bland — receives call events from Bland AI
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    // Verify webhook signature from Bland AI
    if (BLAND_WEBHOOK_SECRET) {
      const signature = req.headers.get('x-bland-signature')
      if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 401 })

      const expected = crypto
        .createHmac('sha256', BLAND_WEBHOOK_SECRET)
        .update(body)
        .digest('hex')

      if (signature !== expected) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(body)
    const { call_id, status, transcript, duration, recording_url, metadata } = event

    if (!call_id) return NextResponse.json({ ok: true })

    const { campaignId, buyerId } = metadata || {}
    if (!campaignId || !buyerId) return NextResponse.json({ ok: true })

    // Find the call record
    const callRecord = await prisma.campaignCall.findFirst({
      where: { blandCallId: call_id },
    })

    // ── Handle different event types ────────────────────────────────────────

    if (status === 'completed' || status === 'ended') {
      // Extract structured data from transcript using Claude
      let extractedData: ExtractedCallData | null = null
      let aiSummary = ''
      let outcome: string = 'NO_ANSWER'

      if (transcript && transcript.length > 50) {
        try {
          extractedData = await extractCallData(transcript)
          aiSummary = generateSummary(extractedData)

          // Determine outcome
          if (extractedData.stillBuying === false) outcome = 'NOT_BUYING'
          else if (extractedData.stillBuying === true) outcome = 'QUALIFIED'
          else if (transcript.toLowerCase().includes('voicemail')) outcome = 'VOICEMAIL'
          else outcome = 'NO_ANSWER'
        } catch (err) {
          console.error('AI extraction error:', err)
          outcome = 'NO_ANSWER'
        }
      }

      // Update the call record
      const updatedCall = await prisma.campaignCall.updateMany({
        where: { blandCallId: call_id },
        data: {
          outcome: outcome as any,
          durationSecs: duration || 0,
          recordingUrl: recording_url || null,
          transcript: transcript || null,
          extractedData: extractedData ? JSON.parse(JSON.stringify(extractedData)) : undefined,
          aiSummary,
          endedAt: new Date(),
        },
      })

      // Update buyer profile with extracted preferences
      if (extractedData && outcome === 'QUALIFIED') {
        const buyerUpdate: Record<string, any> = {
          lastContactedAt: new Date(),
          lastVerifiedAt: new Date(),
          status: 'RECENTLY_VERIFIED',
        }

        if (extractedData.preferredTypes?.length) {
          buyerUpdate.preferredTypes = extractedData.preferredTypes
        }
        if (extractedData.strategy) buyerUpdate.strategy = extractedData.strategy
        if (extractedData.minPrice) buyerUpdate.minPrice = extractedData.minPrice
        if (extractedData.maxPrice) buyerUpdate.maxPrice = extractedData.maxPrice
        if (extractedData.closeSpeedDays) buyerUpdate.closeSpeedDays = extractedData.closeSpeedDays
        if (extractedData.notes) buyerUpdate.notes = extractedData.notes
        if (extractedData.markets?.length) buyerUpdate.preferredMarkets = extractedData.markets

        // Increase buyer score for qualified buyers
        buyerUpdate.buyerScore = { increment: 15 }

        await prisma.cashBuyer.update({ where: { id: buyerId }, data: buyerUpdate })
      }

      if (outcome === 'NOT_BUYING') {
        await prisma.cashBuyer.update({
          where: { id: buyerId },
          data: { lastContactedAt: new Date(), status: 'DORMANT' },
        })
      }

      // Update campaign stats
      const statUpdate: Record<string, any> = {
        callsCompleted: { increment: 1 },
        totalTalkTime: { increment: duration || 0 },
      }

      if (outcome === 'QUALIFIED') statUpdate.qualified = { increment: 1 }
      else if (outcome === 'NOT_BUYING') statUpdate.notBuying = { increment: 1 }
      else statUpdate.noAnswer = { increment: 1 }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: statUpdate,
      })

      // Check if campaign is complete
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
      if (campaign && campaign.callsCompleted + 1 >= campaign.totalBuyers) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Bland webhook error:', error)
    // Always return 200 to Bland so they don't retry
    return NextResponse.json({ ok: true })
  }
}

// ── AI extraction of structured data from transcripts ────────────────────────

interface ExtractedCallData {
  stillBuying: boolean | null
  preferredTypes: string[]
  strategy: string | null
  minPrice: number | null
  maxPrice: number | null
  closeSpeedDays: number | null
  markets: string[]
  notes: string
  objections: string[]
}

async function extractCallData(transcript: string): Promise<ExtractedCallData> {
  if (!ANTHROPIC_API_KEY) {
    // Return basic extraction without AI
    return parseTranscriptBasic(transcript)
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: 'You extract structured buyer preference data from real estate call transcripts. Always respond with valid JSON only, no explanation.',
      messages: [{
        role: 'user',
        content: `Extract buyer preferences from this real estate call transcript. Return ONLY valid JSON with these exact fields:
{
  "stillBuying": true/false/null,
  "preferredTypes": ["SFR", "MULTI_FAMILY", "LAND", "COMMERCIAL"] (only types mentioned),
  "strategy": "FLIP" | "HOLD" | "BOTH" | null,
  "minPrice": number or null,
  "maxPrice": number or null,
  "closeSpeedDays": number or null,
  "markets": ["city names mentioned"],
  "notes": "any important notes in 1-2 sentences",
  "objections": ["list any objections or concerns raised"]
}

TRANSCRIPT:
${transcript.substring(0, 3000)}`,
      }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)

  const data = await res.json()
  const text = data.content?.[0]?.text || '{}'

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return parseTranscriptBasic(transcript)
  }
}

function parseTranscriptBasic(transcript: string): ExtractedCallData {
  const lower = transcript.toLowerCase()
  const stillBuying =
    lower.includes('not buying') || lower.includes('not interested') || lower.includes('paused')
      ? false
      : lower.includes('yes') || lower.includes('definitely') || lower.includes('looking')
      ? true
      : null

  const strategy =
    lower.includes('flip') ? 'FLIP' :
    lower.includes('rental') || lower.includes('hold') ? 'HOLD' :
    lower.includes('both') ? 'BOTH' : null

  const priceMatch = transcript.match(/\$?([\d,]+)k?\s*(?:to|-)\s*\$?([\d,]+)k?/i)
  const minPrice = priceMatch ? parseInt(priceMatch[1].replace(',', '')) * (priceMatch[1].length <= 3 ? 1000 : 1) : null
  const maxPrice = priceMatch ? parseInt(priceMatch[2].replace(',', '')) * (priceMatch[2].length <= 3 ? 1000 : 1) : null

  return {
    stillBuying,
    preferredTypes: lower.includes('multifamily') ? ['MULTI_FAMILY'] : lower.includes('land') ? ['LAND'] : ['SFR'],
    strategy,
    minPrice,
    maxPrice,
    closeSpeedDays: lower.includes('30 day') ? 30 : lower.includes('14 day') ? 14 : lower.includes('7 day') ? 7 : null,
    markets: [],
    notes: '',
    objections: [],
  }
}

function generateSummary(data: ExtractedCallData): string {
  if (data.stillBuying === false) return 'Buyer confirmed not currently active.'
  if (data.stillBuying === null) return 'No answer or voicemail.'

  const parts: string[] = ['Active buyer.']
  if (data.preferredTypes?.length) parts.push(`Wants: ${data.preferredTypes.join(', ')}.`)
  if (data.minPrice && data.maxPrice) parts.push(`Range: $${(data.minPrice/1000).toFixed(0)}K–$${(data.maxPrice/1000).toFixed(0)}K.`)
  if (data.strategy) parts.push(`Strategy: ${data.strategy}.`)
  if (data.closeSpeedDays) parts.push(`Closes in ${data.closeSpeedDays} days.`)
  return parts.join(' ')
}