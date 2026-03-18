// ─── Audience Builder ────────────────────────────────────────────────────────
// Selects and filters CashBuyers for outreach campaigns.
// Handles DNC filtering, compliance pre-checks, and cost estimation.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getDNCSet, normalizePhone, checkCompliance } from './compliance'
import type { ComplianceChannel } from './compliance'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AudienceFilter {
  markets?: string[]
  statuses?: string[]
  tags?: string[]
  minScore?: number
  maxScore?: number
  propertyTypes?: string[]
  strategies?: string[]
  hasPhone?: boolean
  hasEmail?: boolean
  lastContactedBefore?: string
  lastContactedAfter?: string
  excludeRecentlyContacted?: number  // days
  excludeCampaignId?: string
}

export interface AudienceBuyer {
  id: string
  name: string
  phone: string | null
  email: string | null
  state: string | null
  status: string
  buyerScore: number
  preferredMarkets: string[]
  preferredTypes: string[]
  strategy: string | null
  lastContactedAt: string | null
  complianceStatus: 'clear' | 'blocked' | 'warning'
  complianceNote?: string
}

export interface AudienceResult {
  buyers: AudienceBuyer[]
  totalMatched: number
  totalAfterDNC: number
  removedDNC: number
  removedNoPhone: number
  removedNoEmail: number
  estimatedCost: {
    voice: number
    sms: number
    email: number
  }
}

// ─── Cost Constants ─────────────────────────────────────────────────────────

const COST_VOICE_PER_MIN = 0.12
const COST_VOICE_AVG_MINS = 3
const COST_SMS_PER_MSG = 0.015
const COST_EMAIL_PER_MSG = 0.001

// ─── Build Audience ─────────────────────────────────────────────────────────

export async function buildAudience(
  profileId: string,
  filters: AudienceFilter,
  channel: ComplianceChannel,
  options?: { previewOnly?: boolean; limit?: number },
): Promise<AudienceResult> {
  try {
    // ── 1. Build Prisma where clause ──────────────────────────────────────
    const where: any = {
      profileId,
      isOptedOut: false,
      status: { not: 'DO_NOT_CALL' },
    }

    if (filters.statuses?.length) {
      where.status = { in: filters.statuses }
    }

    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      where.buyerScore = {}
      if (filters.minScore !== undefined) where.buyerScore.gte = filters.minScore
      if (filters.maxScore !== undefined) where.buyerScore.lte = filters.maxScore
    }

    if (filters.markets?.length) {
      where.preferredMarkets = { hasSome: filters.markets }
    }

    if (filters.propertyTypes?.length) {
      where.preferredTypes = { hasSome: filters.propertyTypes }
    }

    if (filters.strategies?.length) {
      where.strategy = { in: filters.strategies }
    }

    if (channel === 'voice' || channel === 'sms' || filters.hasPhone) {
      where.phone = { not: null }
    }

    if (channel === 'email' || filters.hasEmail) {
      where.email = { not: null }
    }

    if (filters.lastContactedBefore) {
      where.lastContactedAt = {
        ...where.lastContactedAt,
        lt: new Date(filters.lastContactedBefore),
      }
    }

    if (filters.lastContactedAfter) {
      where.lastContactedAt = {
        ...where.lastContactedAt,
        gt: new Date(filters.lastContactedAfter),
      }
    }

    if (filters.excludeRecentlyContacted && filters.excludeRecentlyContacted > 0) {
      const cutoff = new Date(Date.now() - filters.excludeRecentlyContacted * 24 * 60 * 60 * 1000)
      where.OR = [
        { lastContactedAt: null },
        { lastContactedAt: { lt: cutoff } },
      ]
    }

    // Tag filtering requires a subquery
    if (filters.tags?.length) {
      where.tags = {
        some: {
          tag: {
            name: { in: filters.tags },
          },
        },
      }
    }

    // ── 2. Query buyers ──────────────────────────────────────────────────
    const rawBuyers = await prisma.cashBuyer.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        entityName: true,
        phone: true,
        email: true,
        state: true,
        status: true,
        buyerScore: true,
        preferredMarkets: true,
        preferredTypes: true,
        strategy: true,
        lastContactedAt: true,
      },
      orderBy: { buyerScore: 'desc' },
      take: options?.limit || 10000,
    })

    const totalMatched = rawBuyers.length

    // ── 3. Exclude buyers already in another campaign ────────────────────
    let filteredBuyers = rawBuyers
    if (filters.excludeCampaignId) {
      const existingCallBuyerIds = await prisma.campaignCall.findMany({
        where: { campaignId: filters.excludeCampaignId },
        select: { buyerId: true },
        distinct: ['buyerId'],
      })
      const excludeIds = new Set(existingCallBuyerIds.map(c => c.buyerId))
      filteredBuyers = filteredBuyers.filter(b => !excludeIds.has(b.id))
    }

    // ── 4. Batch DNC filter ──────────────────────────────────────────────
    const dncSet = await getDNCSet()
    let removedDNC = 0
    let removedNoPhone = 0
    let removedNoEmail = 0

    filteredBuyers = filteredBuyers.filter(buyer => {
      if (channel === 'voice' || channel === 'sms') {
        if (!buyer.phone) {
          removedNoPhone++
          return false
        }
        const normalized = normalizePhone(buyer.phone)
        if (!normalized) {
          removedNoPhone++
          return false
        }
        if (dncSet.has(normalized)) {
          removedDNC++
          return false
        }
      }

      if (channel === 'email') {
        if (!buyer.email) {
          removedNoEmail++
          return false
        }
      }

      return true
    })

    // ── 5. Batch recent-contact check ────────────────────────────────────
    const recentContactPhones = new Set<string>()
    if (channel !== 'email' && filteredBuyers.length > 0) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const phonesToCheck = filteredBuyers
        .map(b => b.phone ? normalizePhone(b.phone) : null)
        .filter((p): p is string => p !== null)

      if (phonesToCheck.length > 0) {
        try {
          const recentCalls = await prisma.campaignCall.findMany({
            where: {
              phoneNumber: { in: phonesToCheck },
              createdAt: { gte: twentyFourHoursAgo },
            },
            select: { phoneNumber: true },
            distinct: ['phoneNumber'],
          })
          for (const call of recentCalls) {
            const norm = normalizePhone(call.phoneNumber)
            if (norm) recentContactPhones.add(norm)
          }
        } catch {
          // Non-critical — skip batch check on failure
        }
      }
    }

    // ── 6. Build audience buyer list with compliance status ──────────────
    const audienceBuyers: AudienceBuyer[] = []

    for (const buyer of filteredBuyers) {
      const name = buyer.entityName
        || [buyer.firstName, buyer.lastName].filter(Boolean).join(' ')
        || 'Unknown'

      let complianceStatus: 'clear' | 'blocked' | 'warning' = 'clear'
      let complianceNote: string | undefined

      if (buyer.phone && (channel === 'voice' || channel === 'sms')) {
        const normalized = normalizePhone(buyer.phone)
        if (normalized && recentContactPhones.has(normalized)) {
          complianceStatus = 'warning'
          complianceNote = 'Contacted within last 24 hours'
        }
      }

      // For non-preview mode with reasonable list size, run individual compliance checks
      if (!options?.previewOnly && filteredBuyers.length <= 500 && buyer.phone && channel !== 'email') {
        try {
          const result = await checkCompliance(buyer.phone, channel, profileId, {
            state: buyer.state,
            buyerId: buyer.id,
          })
          if (result.blocked) {
            complianceStatus = 'blocked'
            complianceNote = result.reasons.map(r => r.message).join('; ')
          } else if (result.warnings.length > 0) {
            complianceStatus = 'warning'
            complianceNote = result.warnings.map(w => w.message).join('; ')
          }
        } catch {
          // Non-critical — default to clear
        }
      }

      if (complianceStatus !== 'blocked') {
        audienceBuyers.push({
          id: buyer.id,
          name,
          phone: buyer.phone,
          email: buyer.email,
          state: buyer.state,
          status: buyer.status,
          buyerScore: buyer.buyerScore,
          preferredMarkets: buyer.preferredMarkets,
          preferredTypes: buyer.preferredTypes,
          strategy: buyer.strategy,
          lastContactedAt: buyer.lastContactedAt?.toISOString() || null,
          complianceStatus,
          complianceNote,
        })
      }
    }

    const totalAfterDNC = audienceBuyers.length

    // ── 7. Cost estimation ───────────────────────────────────────────────
    const estimatedCost = {
      voice: Math.round(totalAfterDNC * COST_VOICE_PER_MIN * COST_VOICE_AVG_MINS * 100) / 100,
      sms: Math.round(totalAfterDNC * COST_SMS_PER_MSG * 100) / 100,
      email: Math.round(totalAfterDNC * COST_EMAIL_PER_MSG * 100) / 100,
    }

    return {
      buyers: audienceBuyers,
      totalMatched,
      totalAfterDNC,
      removedDNC,
      removedNoPhone,
      removedNoEmail,
      estimatedCost,
    }
  } catch (err) {
    logger.error('buildAudience failed', {
      route: 'audience-builder',
      error: err instanceof Error ? err.message : String(err),
    })
    return {
      buyers: [],
      totalMatched: 0,
      totalAfterDNC: 0,
      removedDNC: 0,
      removedNoPhone: 0,
      removedNoEmail: 0,
      estimatedCost: { voice: 0, sms: 0, email: 0 },
    }
  }
}

/**
 * Validate that a list of buyer IDs belong to the given profile and are eligible.
 * Returns only the valid, non-opted-out buyers.
 */
export async function validateBuyerIds(
  buyerIds: string[],
  profileId: string,
  channel: ComplianceChannel,
): Promise<{ valid: AudienceBuyer[]; invalidCount: number }> {
  const buyers = await prisma.cashBuyer.findMany({
    where: {
      id: { in: buyerIds },
      profileId,
      isOptedOut: false,
      status: { not: 'DO_NOT_CALL' },
      ...(channel === 'voice' || channel === 'sms' ? { phone: { not: null } } : {}),
      ...(channel === 'email' ? { email: { not: null } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      entityName: true,
      phone: true,
      email: true,
      state: true,
      status: true,
      buyerScore: true,
      preferredMarkets: true,
      preferredTypes: true,
      strategy: true,
      lastContactedAt: true,
    },
  })

  const valid: AudienceBuyer[] = buyers.map(buyer => ({
    id: buyer.id,
    name: buyer.entityName || [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || 'Unknown',
    phone: buyer.phone,
    email: buyer.email,
    state: buyer.state,
    status: buyer.status,
    buyerScore: buyer.buyerScore,
    preferredMarkets: buyer.preferredMarkets,
    preferredTypes: buyer.preferredTypes,
    strategy: buyer.strategy,
    lastContactedAt: buyer.lastContactedAt?.toISOString() || null,
    complianceStatus: 'clear',
  }))

  return { valid, invalidCount: buyerIds.length - valid.length }
}
