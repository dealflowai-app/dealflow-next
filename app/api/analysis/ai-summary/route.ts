import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { generateAIAnalysis } from '@/lib/analysis/ai-summary'
import type { FullDealAnalysis } from '@/lib/analysis/deal-analyzer'
import { logger } from '@/lib/logger'

// ─── POST /api/analysis/ai-summary — Regenerate AI summary ─────────────────

export async function POST(req: NextRequest) {
  // 1. Auth
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  // 2. Parse body
  const { body, error: parseError } = await parseBody(req, 512)
  if (!body) return errorResponse(400, parseError!)

  const { analysisData } = body as { analysisData?: unknown }

  if (!analysisData || typeof analysisData !== 'object') {
    return errorResponse(400, 'analysisData is required and must be an object')
  }

  // Basic shape check — must have at least property and arv
  const data = analysisData as Record<string, unknown>
  if (!data.property || !data.arv || !data.repairs) {
    return errorResponse(400, 'analysisData must include property, arv, and repairs')
  }

  // 3. Rate limit: 20 per hour per user
  const rl = rateLimit(`ai-summary:${profile.id}`, 20, 60 * 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // 4. Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    return errorResponse(503, 'AI analysis is not configured')
  }

  // 5. Generate AI summary
  try {
    const aiSummary = await generateAIAnalysis(
      analysisData as FullDealAnalysis,
      15_000,
    )

    if (!aiSummary) {
      return errorResponse(503, 'AI analysis generation failed')
    }

    return successResponse({ aiSummary })
  } catch (err) {
    logger.error('Unexpected error during AI summary generation', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
    })
    return errorResponse(500, 'Internal server error')
  }
}
