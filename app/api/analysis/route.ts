import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { Validator, sanitizeString } from '@/lib/validation'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { RentCastError } from '@/lib/analysis/property-lookup'
import { runFullAnalysis } from '@/lib/analysis/deal-analyzer'
import { cacheFullAnalysis } from '@/lib/analysis/cache'
import { getRentCastClient } from '@/lib/rentcast'
import { withRetry } from '@/lib/resilience'
import { logger } from '@/lib/logger'

// ─── POST /api/analysis — Full deal analysis ───────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  // 2. Parse body
  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const { address, askingPrice, repairCost, condition } = body as {
    address?: unknown
    askingPrice?: unknown
    repairCost?: unknown
    condition?: unknown
  }

  // 3. Validate
  const v = new Validator()
  v.require('address', address, 'Address')
  v.string('address', address, { maxLength: 300, label: 'Address' })
  v.positiveInt('askingPrice', askingPrice, 'Asking price')
  v.positiveInt('repairCost', repairCost, 'Repair cost')
  v.enumValue('condition', condition, ['distressed', 'fair', 'good', 'excellent'], 'Condition')
  if (!v.isValid()) return v.toResponse()

  // 4. Rate limit: 30 analyses per hour per user
  const rl = rateLimit(`analysis:${profile.id}`, 30, 60 * 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // 5. Run full analysis pipeline
  try {
    const sanitizedAddress = sanitizeString(address as string)
    const analysis = await runFullAnalysis(
      {
        address: sanitizedAddress,
        askingPrice: askingPrice as number | undefined,
        repairCost: repairCost as number | undefined,
        condition: condition as string | undefined,
      },
      profile.id,
    )

    // Cache the full analysis for history (overwrites property-only cache)
    await cacheFullAnalysis(profile.id, sanitizedAddress, analysis)

    return successResponse({ analysis })
  } catch (err) {
    if (err instanceof RentCastError) {
      if (err.status === 429) {
        return errorResponse(429, 'Property data rate limit exceeded, try again in a few minutes')
      }
      if (err.status === 404) {
        return errorResponse(404, 'Property not found. Check the address and try again.')
      }
      logger.error('RentCast API error during analysis', {
        status: err.status,
        error: err.message,
        userId: profile.id,
      })
      return errorResponse(502, 'Property data provider error')
    }

    logger.error('Unexpected error during property analysis', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
    })
    return errorResponse(500, 'Internal server error')
  }
}

// ─── GET /api/analysis?address=... — Quick property lookup ─────────────────

export async function GET(req: NextRequest) {
  // 1. Auth
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  // 2. Validate
  const address = req.nextUrl.searchParams.get('address')
  if (!address || address.trim().length === 0) {
    return errorResponse(400, 'address query parameter is required')
  }
  if (address.length > 300) {
    return errorResponse(400, 'Address must be at most 300 characters')
  }

  // 3. Rate limit (shared with POST — same budget)
  const rl = rateLimit(`analysis:${profile.id}`, 30, 60 * 60 * 1000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  // 4. Quick lookup — property details only (1 API call)
  try {
    const client = getRentCastClient()
    const property = await withRetry(
      () => client.getPropertyByAddress(sanitizeString(address)),
      { maxRetries: 1, baseDelayMs: 2000, label: 'rentcast-quick-lookup' },
    )

    if (!property) {
      return errorResponse(404, 'Property not found. Check the address and try again.')
    }

    return successResponse({
      property: {
        address: property.formattedAddress,
        city: property.city,
        state: property.state,
        zip: property.zipCode,
        propertyType: property.propertyType,
        beds: property.bedrooms,
        baths: property.bathrooms,
        sqft: property.squareFootage,
        yearBuilt: property.yearBuilt,
        lotSize: property.lotSize,
      },
    })
  } catch (err) {
    if (err instanceof RentCastError) {
      if (err.status === 429) {
        return errorResponse(429, 'Property data rate limit exceeded, try again in a few minutes')
      }
      if (err.status === 404) {
        return errorResponse(404, 'Property not found. Check the address and try again.')
      }
      return errorResponse(502, 'Property data provider error')
    }

    logger.error('Unexpected error during property lookup', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
    })
    return errorResponse(500, 'Internal server error')
  }
}
