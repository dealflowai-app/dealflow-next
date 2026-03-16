/**
 * Daisy Chain Detection Service
 *
 * Detects when the same property address is being listed by multiple
 * wholesalers — a common quality issue in real estate wholesaling
 * known as "daisy chaining."
 *
 * Runs at deal creation time and can also be invoked on demand.
 */

import { normalizeAddress, normalizeCity, addressMatch } from '@/lib/address'
import type { MatchConfidence } from '@/lib/address'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export interface DaisyChainInput {
  address: string
  city: string
  state: string
  zip: string
  profileId: string
}

export interface DaisyChainDeal {
  id: string
  address: string
  city: string
  state: string
  profileId: string
  status: string
  createdAt: Date
  isSameWholesaler: boolean
}

export interface DaisyChainResult {
  isDuplicate: boolean
  confidence: MatchConfidence | 'none'
  existingDeals: DaisyChainDeal[]
  warning: string | null
}

// Minimal Prisma interface — avoids importing the full PrismaClient type
interface PrismaLike {
  deal: {
    findMany: (args: {
      where: Record<string, unknown>
      select: Record<string, boolean>
    }) => Promise<Array<{
      id: string
      address: string
      city: string
      state: string
      profileId: string
      status: string
      createdAt: Date
    }>>
  }
}

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const LOOKBACK_DAYS = 90
const EXCLUDED_STATUSES = ['CANCELLED', 'EXPIRED']

/* ═══════════════════════════════════════════════
   MAIN CHECK
   ═══════════════════════════════════════════════ */

export async function checkDaisyChain(
  deal: DaisyChainInput,
  prisma: PrismaLike,
): Promise<DaisyChainResult> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS)

  const normState = deal.state.toUpperCase().trim()
  const normCity = normalizeCity(deal.city)

  // First-pass DB query: narrow by state + city (case-insensitive) + recent + not cancelled/expired
  const candidates = await prisma.deal.findMany({
    where: {
      state: { equals: normState, mode: 'insensitive' } as unknown as string,
      city: { equals: normCity, mode: 'insensitive' } as unknown as string,
      createdAt: { gte: cutoff },
      status: { notIn: EXCLUDED_STATUSES },
    } as Record<string, unknown>,
    select: {
      id: true,
      address: true,
      city: true,
      state: true,
      profileId: true,
      status: true,
      createdAt: true,
    },
  })

  if (candidates.length === 0) {
    return { isDuplicate: false, confidence: 'none', existingDeals: [], warning: null }
  }

  // Second pass: normalize address and compare
  const matches: DaisyChainDeal[] = []
  let bestConfidence: MatchConfidence | 'none' = 'none'

  for (const candidate of candidates) {
    const result = addressMatch(
      deal.address, deal.city, deal.state,
      candidate.address, candidate.city, candidate.state,
    )

    if (result.isMatch && result.confidence !== 'partial') {
      const isSameWholesaler = candidate.profileId === deal.profileId
      matches.push({
        id: candidate.id,
        address: candidate.address,
        city: candidate.city,
        state: candidate.state,
        profileId: candidate.profileId,
        status: candidate.status,
        createdAt: candidate.createdAt,
        isSameWholesaler,
      })

      // Track highest confidence
      if (bestConfidence === 'none' || confidenceRank(result.confidence) > confidenceRank(bestConfidence as MatchConfidence)) {
        bestConfidence = result.confidence
      }
    }
  }

  if (matches.length === 0) {
    return { isDuplicate: false, confidence: 'none', existingDeals: [], warning: null }
  }

  // Split into same-wholesaler vs different-wholesaler matches
  const otherWholesalerMatches = matches.filter((m) => !m.isSameWholesaler)
  const sameWholesalerMatches = matches.filter((m) => m.isSameWholesaler)

  const isDuplicate = otherWholesalerMatches.length > 0

  let warning: string | null = null

  if (otherWholesalerMatches.length > 0) {
    const oldest = otherWholesalerMatches.reduce((a, b) =>
      a.createdAt < b.createdAt ? a : b,
    )
    const daysAgo = Math.floor((Date.now() - oldest.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    const timeStr = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`
    warning = `This property is already listed by ${otherWholesalerMatches.length > 1 ? `${otherWholesalerMatches.length} other wholesalers` : 'another wholesaler'} (first listed ${timeStr}). This may indicate daisy chaining.`
  } else if (sameWholesalerMatches.length > 0) {
    const existing = sameWholesalerMatches[0]
    warning = `You already have a deal at this address (status: ${existing.status.replace(/_/g, ' ')})`
  }

  return {
    isDuplicate,
    confidence: bestConfidence,
    existingDeals: matches,
    warning,
  }
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function confidenceRank(c: MatchConfidence): number {
  switch (c) {
    case 'exact': return 3
    case 'high': return 2
    case 'partial': return 1
    default: return 0
  }
}
