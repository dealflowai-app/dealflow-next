import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// ─── Transcript Search API ──────────────────────────────────────────────────
// Full-text search across all call transcripts for the authenticated user.
// Returns matching calls with context snippets around the search term.
//
// Query params:
//   q          — search query (required, min 2 chars)
//   campaignId — scope to a specific campaign
//   outcome    — filter by call outcome
//   limit      — results per page (default 20, max 50)
//   offset     — pagination offset

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const query = (url.searchParams.get('q') || '').trim()
  const campaignId = url.searchParams.get('campaignId') || undefined
  const outcome = url.searchParams.get('outcome') || undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  if (query.length < 2) {
    return errorResponse(400, 'Search query must be at least 2 characters')
  }

  // Build where clause — scope to user's campaigns, has transcript
  const where: Record<string, unknown> = {
    campaign: { profileId: profile.id },
    transcript: { not: null },
  }

  if (campaignId) where.campaignId = campaignId
  if (outcome) where.outcome = outcome

  // Fetch calls that have transcripts (Prisma doesn't support full-text on
  // arbitrary fields without raw SQL, so we filter in-app for now. For scale,
  // this should migrate to Elasticsearch / pg_trgm.)
  const calls = await prisma.campaignCall.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      campaignId: true,
      buyerId: true,
      phoneNumber: true,
      outcome: true,
      durationSecs: true,
      transcript: true,
      aiSummary: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      campaign: { select: { id: true, name: true, market: true } },
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          entityName: true,
        },
      },
    },
  })

  // Filter and extract snippets
  const lowerQuery = query.toLowerCase()
  const results: {
    call: Record<string, unknown>
    snippets: string[]
    matchCount: number
  }[] = []

  for (const call of calls) {
    if (!call.transcript) continue

    const lowerTranscript = call.transcript.toLowerCase()
    const indices: number[] = []
    let searchFrom = 0

    // Find all occurrences
    while (searchFrom < lowerTranscript.length) {
      const idx = lowerTranscript.indexOf(lowerQuery, searchFrom)
      if (idx === -1) break
      indices.push(idx)
      searchFrom = idx + 1
    }

    if (indices.length === 0) continue

    // Build context snippets (first 3 matches)
    const snippets: string[] = []
    for (let i = 0; i < Math.min(indices.length, 3); i++) {
      const idx = indices[i]
      const start = Math.max(0, idx - 60)
      const end = Math.min(call.transcript.length, idx + query.length + 60)
      const prefix = start > 0 ? '...' : ''
      const suffix = end < call.transcript.length ? '...' : ''
      snippets.push(prefix + call.transcript.slice(start, end) + suffix)
    }

    const buyerName = call.buyer.entityName
      || [call.buyer.firstName, call.buyer.lastName].filter(Boolean).join(' ')
      || 'Unknown'

    results.push({
      call: {
        id: call.id,
        campaignId: call.campaignId,
        buyerId: call.buyerId,
        phoneNumber: call.phoneNumber,
        outcome: call.outcome,
        durationSecs: call.durationSecs,
        aiSummary: call.aiSummary,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        createdAt: call.createdAt,
        buyerName,
        campaignName: call.campaign?.name ?? '',
        campaignMarket: call.campaign?.market ?? '',
      },
      snippets,
      matchCount: indices.length,
    })
  }

  // Sort by match count (most relevant first), then by date
  results.sort((a, b) => b.matchCount - a.matchCount || 0)

  // Apply pagination
  const total = results.length
  const paged = results.slice(offset, offset + limit)

  return successResponse({
    results: paged,
    total,
    query,
    limit,
    offset,
  })
}
