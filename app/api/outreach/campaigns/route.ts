import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { requireTier, FEATURE_TIERS } from '@/lib/subscription-guard'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { buildAudience, validateBuyerIds } from '@/lib/outreach/audience-builder'
import type { ComplianceChannel } from '@/lib/outreach'

const CAMPAIGN_MODES = ['AI', 'MANUAL']
const CHANNELS: ComplianceChannel[] = ['voice', 'sms', 'email']
const CAMPAIGN_CHANNELS = ['VOICE', 'SMS', 'EMAIL', 'MULTI_CHANNEL']

// GET /api/outreach/campaigns — List campaigns
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status') || undefined
  const sort = url.searchParams.get('sort') || 'newest'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const where: any = { profileId: profile.id }
  if (statusFilter) {
    where.status = statusFilter
  }

  const orderBy: any =
    sort === 'oldest' ? { createdAt: 'asc' } :
    sort === 'name' ? { name: 'asc' } :
    { createdAt: 'desc' }

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        market: true,
        status: true,
        mode: true,
        channel: true,
        totalBuyers: true,
        callsCompleted: true,
        qualified: true,
        notBuying: true,
        noAnswer: true,
        totalTalkTime: true,
        estimatedCost: true,
        actualCost: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.campaign.count({ where }),
  ])

  // Derive stats for each campaign
  const enriched = campaigns.map(c => {
    const connected = c.qualified + c.notBuying
    return {
      ...c,
      connectionRate: c.callsCompleted > 0
        ? Math.round((connected / c.callsCompleted) * 100)
        : 0,
      qualificationRate: connected > 0
        ? Math.round((c.qualified / connected) * 100)
        : 0,
    }
  })

  return successResponse({ campaigns: enriched, total, limit, offset })
}

// POST /api/outreach/campaigns — Create a new campaign
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const tierGuard = await requireTier(profile.id, FEATURE_TIERS.outreach)
  if (tierGuard) return tierGuard

  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  // ── Validate ────────────────────────────────────────────────────────────
  const v = new Validator()
    .require('name', body.name, 'Campaign name')
    .string('name', body.name, { maxLength: 200, label: 'Campaign name' })
    .require('market', body.market, 'Market')
    .string('market', body.market, { maxLength: 200, label: 'Market' })
    .enumValue('mode', body.mode, CAMPAIGN_MODES, 'Campaign mode')

  if (body.channel !== undefined) {
    v.enumValue('channel', body.channel, CAMPAIGN_CHANNELS, 'Campaign channel')
  }
  if (body.maxConcurrentCalls !== undefined) {
    v.intRange('maxConcurrentCalls', body.maxConcurrentCalls, 1, 50, 'Max concurrent calls')
  }
  if (body.maxRetries !== undefined) {
    v.intRange('maxRetries', body.maxRetries, 0, 10, 'Max retries')
  }
  if (body.retryDelayHours !== undefined) {
    v.intRange('retryDelayHours', body.retryDelayHours, 1, 168, 'Retry delay hours')
  }
  if (body.scriptTemplate !== undefined) {
    v.string('scriptTemplate', body.scriptTemplate, { maxLength: 100 })
  }
  if (body.customScript !== undefined) {
    v.string('customScript', body.customScript, { maxLength: 5000 })
  }

  if (!v.isValid()) return v.toResponse()

  const campaignChannel = (body.channel as string) || 'VOICE'
  const channelMap: Record<string, ComplianceChannel> = { VOICE: 'voice', SMS: 'sms', EMAIL: 'email', MULTI_CHANNEL: 'voice' }
  const channel: ComplianceChannel = channelMap[campaignChannel] || 'voice'

  // ── Build audience ──────────────────────────────────────────────────────
  let audienceBuyers: { id: string; phone: string | null; email: string | null }[] = []
  let audienceStats = { totalMatched: 0, removedDNC: 0, removedNoPhone: 0, removedNoEmail: 0 }

  if (body.audienceFilter && typeof body.audienceFilter === 'object') {
    const result = await buildAudience(profile.id, body.audienceFilter as any, channel)
    audienceBuyers = result.buyers.map(b => ({ id: b.id, phone: b.phone, email: b.email }))
    audienceStats = {
      totalMatched: result.totalMatched,
      removedDNC: result.removedDNC,
      removedNoPhone: result.removedNoPhone,
      removedNoEmail: result.removedNoEmail,
    }
  } else if (body.audienceBuyerIds && Array.isArray(body.audienceBuyerIds)) {
    const ids = body.audienceBuyerIds as string[]
    if (ids.length > 10000) return errorResponse(400, 'Maximum 10,000 buyers per campaign')
    const { valid, invalidCount } = await validateBuyerIds(ids, profile.id, channel)
    audienceBuyers = valid.map(b => ({ id: b.id, phone: b.phone, email: b.email }))
    audienceStats = {
      totalMatched: ids.length,
      removedDNC: invalidCount,
      removedNoPhone: 0,
      removedNoEmail: 0,
    }
  }

  // Channel-specific validation
  if (campaignChannel === 'SMS' || campaignChannel === 'VOICE') {
    const noPhone = audienceBuyers.filter(b => !b.phone).length
    if (noPhone > 0 && noPhone === audienceBuyers.length) {
      return errorResponse(400, 'No buyers with phone numbers for this campaign channel.')
    }
  }
  if (campaignChannel === 'EMAIL') {
    const noEmail = audienceBuyers.filter(b => !b.email).length
    if (noEmail > 0 && noEmail === audienceBuyers.length) {
      return errorResponse(400, 'No buyers with email addresses for this email campaign.')
    }
  }

  if (audienceBuyers.length === 0) {
    return errorResponse(400, 'No eligible buyers for this campaign. Check your filters or ensure buyers have phone numbers and are not on the DNC list.')
  }

  // ── Estimated cost ──────────────────────────────────────────────────────
  const costPerBuyer = campaignChannel === 'VOICE' ? 0.36 : campaignChannel === 'SMS' ? 0.015 : campaignChannel === 'EMAIL' ? 0.001 : 0.38 // MULTI_CHANNEL: voice + sms cost
  const estimatedCost = Math.round(audienceBuyers.length * costPerBuyer * 100) / 100

  // ── Create campaign ─────────────────────────────────────────────────────
  const campaign = await prisma.campaign.create({
    data: {
      profileId: profile.id,
      name: (body.name as string).trim(),
      market: (body.market as string).trim(),
      status: 'DRAFT',
      mode: (body.mode as any) || 'AI',
      channel: (campaignChannel as any),
      scriptTemplate: (body.scriptTemplate as string) || 'standard_qualification',
      companyName: (body.companyName as string) || null,
      agentName: (body.agentName as string) || null,
      customScript: (body.customScript as string) || null,
      maxConcurrentCalls: (body.maxConcurrentCalls as number) || 5,
      callingHoursStart: (body.callingHoursStart as string) || '09:00',
      callingHoursEnd: (body.callingHoursEnd as string) || '19:00',
      timezone: (body.timezone as string) || 'America/New_York',
      leaveVoicemail: body.leaveVoicemail !== false,
      maxRetries: (body.maxRetries as number) ?? 2,
      retryDelayHours: (body.retryDelayHours as number) ?? 24,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt as string) : null,
      totalBuyers: audienceBuyers.length,
      estimatedCost,
    },
  })

  // ── Create CampaignCall records (bulk) ──────────────────────────────────
  await prisma.campaignCall.createMany({
    data: audienceBuyers.map(buyer => ({
      campaignId: campaign.id,
      buyerId: buyer.id,
      phoneNumber: buyer.phone || '',
      attemptNumber: 1,
    })),
  })

  logger.info('Campaign created', {
    route: '/api/outreach/campaigns',
    userId: profile.id,
    campaignId: campaign.id,
    buyerCount: audienceBuyers.length,
  })

  return successResponse({
    campaign,
    audience: {
      total: audienceBuyers.length,
      ...audienceStats,
      estimatedCost,
    },
  }, 201)
}
