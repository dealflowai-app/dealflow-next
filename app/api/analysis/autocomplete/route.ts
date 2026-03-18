import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

// ─── In-memory cache for autocomplete results (5-minute TTL) ────────────────

interface CacheEntry {
  data: AddressSuggestion[]
  expiresAt: number
}

const autocompleteCache = new Map<string, CacheEntry>()

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  autocompleteCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) autocompleteCache.delete(key)
  })
}, 300_000)

// ─── Types ──────────────────────────────────────────────────────────────────

interface AddressSuggestion {
  address: string
  city: string
  state: string
  zip: string
  full: string
}

interface MapboxFeature {
  place_name: string
  text: string
  context?: Array<{ id: string; text: string; short_code?: string }>
  properties?: { address?: string }
  address?: string
}

// ─── GET /api/analysis/autocomplete?q=... ───────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Auth
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  // 2. Validate
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 3) {
    return errorResponse(400, 'q parameter is required (min 3 characters)')
  }

  // 3. Check cache
  const cacheKey = q.trim().toLowerCase()
  const cached = autocompleteCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return successResponse({ suggestions: cached.data })
  }

  // 4. Call Mapbox Geocoding
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) {
    logger.error('NEXT_PUBLIC_MAPBOX_TOKEN not configured')
    return errorResponse(502, 'Address lookup service not configured')
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&types=address&country=us&limit=5`
    const res = await fetch(url)

    if (!res.ok) {
      logger.error('Mapbox geocoding error', { status: res.status })
      return errorResponse(502, 'Address lookup service error')
    }

    const data = await res.json()
    const suggestions: AddressSuggestion[] = (data.features ?? []).map(
      (f: MapboxFeature) => {
        // Extract city, state, zip from Mapbox context array
        let city = ''
        let state = ''
        let zip = ''

        for (const ctx of f.context ?? []) {
          if (ctx.id.startsWith('place.')) city = ctx.text
          if (ctx.id.startsWith('region.')) state = ctx.short_code?.replace('US-', '') ?? ctx.text
          if (ctx.id.startsWith('postcode.')) zip = ctx.text
        }

        // Build the street address from the number + street name
        const streetNumber = f.address ?? ''
        const streetName = f.text ?? ''
        const streetAddress = streetNumber
          ? `${streetNumber} ${streetName}`
          : streetName

        return {
          address: streetAddress,
          city,
          state,
          zip,
          full: f.place_name,
        }
      },
    )

    // 5. Cache for 5 minutes
    autocompleteCache.set(cacheKey, {
      data: suggestions,
      expiresAt: Date.now() + 5 * 60 * 1000,
    })

    return successResponse({ suggestions })
  } catch (err) {
    logger.error('Autocomplete fetch failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(502, 'Address lookup service error')
  }
}
