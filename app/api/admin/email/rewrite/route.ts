import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-4-20250514'

/**
 * POST /api/admin/email/rewrite — AI-rewrite an email draft
 */
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const { message, subject, tone } = (await req.json()) as {
    message: string
    subject?: string
    tone?: string
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const toneGuide = tone || 'friendly founder'

  const systemPrompt = `You are an email copywriter for a SaaS founder. You rewrite emails to sound natural, personal, and compelling. The company is DealFlow AI, a platform for real estate wholesalers.

Rules:
- Write like a real person, not a marketer. No corporate speak.
- Keep it short and conversational. Wholesalers are busy.
- No em dashes. Use commas or periods instead.
- No exclamation marks unless truly warranted.
- Don't use "I hope this email finds you well" or similar filler.
- Keep {{firstName}} placeholders intact — they get replaced with real names.
- Match the tone: ${toneGuide}
- Return ONLY the rewritten email body text. No subject line, no explanation, no quotes around it.`

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Rewrite this email${subject ? ` (subject: "${subject}")` : ''}:\n\n${message}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Anthropic API error: ${text}` }, { status: 502 })
    }

    const data = await res.json()
    const rewritten = data.content?.[0]?.text?.trim() || ''

    return NextResponse.json({ rewritten })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
