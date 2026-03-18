import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { sanitizeString } from '@/lib/validation'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { getMarketIntelligence } from '@/lib/analysis/market-intelligence'
import { logger } from '@/lib/logger'

// ─── GET /api/analysis/market?city=Atlanta&state=GA&zip=30312 ───────────────

export async function GET(req: NextRequest) {
  // 1. Auth
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  // 2. Validate
  const city = req.nextUrl.searchParams.get('city')
  const state = req.nextUrl.searchParams.get('state')
  const zip = req.nextUrl.searchParams.get('zip')

  if (!city || city.trim().length === 0) {
    return errorResponse(400, 'city query parameter is required')
  }
  if (!state || state.trim().length === 0) {
    return errorResponse(400, 'state query parameter is required')
  }
  if (city.length > 100) {
    return errorResponse(400, 'City must be at most 100 characters')
  }
  if (state.length > 2) {
    return errorResponse(400, 'State must be a 2-letter code')
  }

  // 3. Rate limit: 20 per hour per user (heavier queries)
  const rl = rateLimit(`market-intel:${profile.id}`, 20, 60 * 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // 4. Fetch market intelligence
  try {
    const market = await getMarketIntelligence(
      sanitizeString(city),
      sanitizeString(state).toUpperCase(),
      zip ? sanitizeString(zip) : null,
      profile.id,
    )

    return successResponse({ market })
  } catch (err) {
    logger.error('Unexpected error during market intelligence query', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
      city,
      state,
    })
    return errorResponse(500, 'Internal server error')
  }
}
