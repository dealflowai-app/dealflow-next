import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import type { PhotoAnalysis } from '@/lib/analysis/photo-analysis'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2000
const MAX_PHOTOS = 6
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const SYSTEM_PROMPT = `You are an expert property condition assessor for real estate investors. Analyze the provided property photos and assess the condition for a wholesale deal analysis.
For each photo, identify:
- What part of the property is shown (exterior, kitchen, bathroom, living area, roof, yard, etc.)
- Visible damage, wear, or issues
- Estimated condition of that area (excellent, good, fair, poor)
- Specific repair items needed

Then provide an overall assessment.
Respond ONLY with valid JSON matching the specified format. No markdown, no backticks.`

// ─── POST /api/analysis/photo-analysis ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return errorResponse(503, 'Photo analysis unavailable. You can still use the condition dropdown for repair estimates.')
  }

  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  // Rate limit: 10 per hour per user
  const rl = rateLimit(`photo-analysis:${profile.id}`, 10, 60 * 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  try {
    const formData = await req.formData()

    // Extract photos
    const photos: File[] = formData.getAll('photos').filter(
      (v): v is File => v instanceof File,
    )

    if (photos.length === 0) {
      return errorResponse(400, 'At least 1 photo is required')
    }
    if (photos.length > MAX_PHOTOS) {
      return errorResponse(400, `Maximum ${MAX_PHOTOS} photos allowed`)
    }

    // Validate each photo
    for (const photo of photos) {
      if (!ALLOWED_TYPES.has(photo.type)) {
        return errorResponse(400, `Invalid file type: ${photo.type}. Accepted: JPG, PNG, WebP`)
      }
      if (photo.size > MAX_FILE_SIZE) {
        return errorResponse(400, `File "${photo.name}" exceeds 5MB limit`)
      }
    }

    // Optional metadata
    const propertyType = formData.get('propertyType') as string | null
    const sqft = formData.get('sqft') ? Number(formData.get('sqft')) : null
    const yearBuilt = formData.get('yearBuilt') ? Number(formData.get('yearBuilt')) : null

    // Convert images to base64 content blocks
    const imageBlocks: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = []
    for (const photo of photos) {
      const buffer = Buffer.from(await photo.arrayBuffer())
      const base64 = buffer.toString('base64')
      imageBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: photo.type,
          data: base64,
        },
      })
    }

    // Build user prompt
    const propDesc = [
      propertyType ? `a ${propertyType}` : 'a property',
      sqft ? `approximately ${sqft} sqft` : null,
      yearBuilt ? `built in ${yearBuilt}` : null,
    ].filter(Boolean).join(', ')

    const userText = `Analyze these ${photos.length} property photo${photos.length > 1 ? 's' : ''}. The property is ${propDesc}.
Respond with JSON:
{
  "photos": [
    {
      "description": "Front exterior of single-family home",
      "area": "exterior",
      "condition": "fair",
      "issues": ["Peeling paint on siding", "Overgrown landscaping", "Damaged gutters"],
      "repairItems": [
        { "item": "Exterior paint", "urgency": "high", "estimatedCost": "$3,000 - $5,000" },
        { "item": "Gutter replacement", "urgency": "medium", "estimatedCost": "$800 - $1,500" },
        { "item": "Landscaping cleanup", "urgency": "low", "estimatedCost": "$500 - $1,000" }
      ]
    }
  ],
  "overallCondition": "fair",
  "overallConditionScore": 45,
  "majorIssues": ["Exterior needs significant work", "Kitchen appears outdated"],
  "estimatedRepairTotal": { "low": 25000, "mid": 35000, "high": 48000 },
  "conditionSummary": "2-3 sentence summary of overall condition",
  "confidenceNote": "Based on exterior and kitchen photos only. Interior rooms, roof condition, and mechanicals not visible."
}`

    // Build message content: images first, then text
    const content: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }> = [
      ...imageBlocks,
      { type: 'text', text: userText },
    ]

    // Call Claude with vision
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)

    let rawText: string | null = null
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          temperature: 0.2,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content }],
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errBody = await response.text().catch(() => 'Unknown error')
        logger.error('Anthropic API error in photo analysis', {
          status: response.status,
          error: errBody,
        })
        return errorResponse(502, 'Photo analysis unavailable. You can still use the condition dropdown for repair estimates.')
      }

      const result = await response.json() as {
        content?: Array<{ type: string; text: string }>
      }
      rawText = result.content?.[0]?.text ?? null
    } finally {
      clearTimeout(timer)
    }

    if (!rawText) {
      return errorResponse(502, 'Photo analysis unavailable. You can still use the condition dropdown for repair estimates.')
    }

    // Parse response — strip backticks if present
    let parsed = parseResponse(rawText)

    // Retry once on parse failure
    if (!parsed) {
      logger.warn('Photo analysis JSON parse failed, retrying')
      try {
        const retryResponse = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: 0.2,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content }],
          }),
        })
        if (retryResponse.ok) {
          const retryResult = await retryResponse.json() as {
            content?: Array<{ type: string; text: string }>
          }
          const retryText = retryResult.content?.[0]?.text
          if (retryText) parsed = parseResponse(retryText)
        }
      } catch {
        // Retry failed — fall through to error
      }
    }

    if (!parsed) {
      return errorResponse(502, 'Photo analysis unavailable. You can still use the condition dropdown for repair estimates.')
    }

    const photoAnalysis: PhotoAnalysis = {
      ...parsed,
      analyzedAt: new Date().toISOString(),
    }

    return successResponse({ photoAnalysis })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      logger.warn('Photo analysis timed out')
      return errorResponse(504, 'Photo analysis timed out. Try with fewer photos.')
    }
    logger.error('Photo analysis failed', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
    })
    return errorResponse(500, 'Photo analysis unavailable. You can still use the condition dropdown for repair estimates.')
  }
}

// ─── Response Parsing ────────────────────────────────────────────────────────

function parseResponse(text: string): Omit<PhotoAnalysis, 'analyzedAt'> | null {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      overallCondition: parsed.overallCondition ?? 'fair',
      overallConditionScore: typeof parsed.overallConditionScore === 'number' ? parsed.overallConditionScore : 50,
      majorIssues: Array.isArray(parsed.majorIssues) ? parsed.majorIssues : [],
      estimatedRepairTotal: {
        low: parsed.estimatedRepairTotal?.low ?? 0,
        mid: parsed.estimatedRepairTotal?.mid ?? 0,
        high: parsed.estimatedRepairTotal?.high ?? 0,
      },
      conditionSummary: parsed.conditionSummary ?? '',
      confidenceNote: parsed.confidenceNote ?? '',
    }
  } catch {
    return null
  }
}
