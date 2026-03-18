import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { getSystemTemplate, isSystemTemplate } from '@/lib/outreach/campaign-templates'
import type { SystemTemplate } from '@/lib/outreach/campaign-templates'
import { buildAudience, validateBuyerIds } from '@/lib/outreach/audience-builder'
import type { ComplianceChannel } from '@/lib/outreach'
import { logger } from '@/lib/logger'

type Params = { params: Promise<{ id: string }> }

// POST /api/outreach/templates/[id]/use — Create a campaign from a template
export async function POST(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  // ── Resolve template ────────────────────────────────────────────────────
  let templateData: {
    name: string
    channel: string
    scriptTemplate: string | null
    smsTemplateId: string | null
    emailSequenceId: string | null
    audienceFilter: Record<string, unknown> | null
    settings: Record<string, unknown> | null
    multiChannelConfig: Record<string, unknown> | null
  }

  if (isSystemTemplate(id)) {
    const sys = getSystemTemplate(id)
    if (!sys) return errorResponse(404, 'Template not found')
    templateData = {
      name: sys.name,
      channel: sys.channel,
      scriptTemplate: sys.scriptTemplate,
      smsTemplateId: sys.smsTemplateId,
      emailSequenceId: sys.emailSequenceId,
      audienceFilter: sys.audienceFilter as Record<string, unknown>,
      settings: sys.settings as Record<string, unknown>,
      multiChannelConfig: sys.multiChannelConfig as Record<string, unknown> || null,
    }
  } else {
    const dbTemplate = await prisma.campaignTemplate.findUnique({ where: { id } })
    if (!dbTemplate) return errorResponse(404, 'Template not found')
    if (dbTemplate.profileId !== profile.id && !dbTemplate.isPublic) {
      return errorResponse(404, 'Template not found')
    }
    templateData = {
      name: dbTemplate.name,
      channel: dbTemplate.channel,
      scriptTemplate: dbTemplate.scriptTemplate,
      smsTemplateId: dbTemplate.smsTemplateId,
      emailSequenceId: dbTemplate.emailSequenceId,
      audienceFilter: dbTemplate.audienceFilter as Record<string, unknown> | null,
      settings: dbTemplate.settings as Record<string, unknown> | null,
      multiChannelConfig: dbTemplate.multiChannelConfig as Record<string, unknown> | null,
    }
  }

  // ── Parse overrides from request body ───────────────────────────────────
  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
    .require('market', body.market, 'Market')
    .string('market', body.market, { maxLength: 200, label: 'Market' })

  if (body.name !== undefined) v.string('name', body.name, { maxLength: 200, label: 'Campaign name' })
  if (!v.isValid()) return v.toResponse()

  // Merge template settings with overrides
  const settings = templateData.settings || {}
  const overrideSettings = (body.settings as Record<string, unknown>) || {}
  const merged = { ...settings, ...overrideSettings }

  const campaignChannel = (body.channel as string) || templateData.channel
  const channelMap: Record<string, ComplianceChannel> = {
    VOICE: 'voice', SMS: 'sms', EMAIL: 'email', MULTI_CHANNEL: 'voice',
  }
  const channel: ComplianceChannel = channelMap[campaignChannel] || 'voice'

  // ── Build audience ────────────────────────────────────────────────────
  const audienceFilter = body.audienceFilter
    ? { ...(templateData.audienceFilter || {}), ...(body.audienceFilter as Record<string, unknown>) }
    : templateData.audienceFilter

  let audienceBuyers: { id: string; phone: string | null; email: string | null }[] = []
  let audienceStats = { totalMatched: 0, removedDNC: 0, removedNoPhone: 0, removedNoEmail: 0 }

  if (body.audienceBuyerIds && Array.isArray(body.audienceBuyerIds)) {
    const ids = body.audienceBuyerIds as string[]
    if (ids.length > 10000) return errorResponse(400, 'Maximum 10,000 buyers per campaign')
    const { valid, invalidCount } = await validateBuyerIds(ids, profile.id, channel)
    audienceBuyers = valid.map(b => ({ id: b.id, phone: b.phone, email: b.email }))
    audienceStats = { totalMatched: ids.length, removedDNC: invalidCount, removedNoPhone: 0, removedNoEmail: 0 }
  } else if (audienceFilter && typeof audienceFilter === 'object') {
    const result = await buildAudience(profile.id, audienceFilter as any, channel)
    audienceBuyers = result.buyers.map(b => ({ id: b.id, phone: b.phone, email: b.email }))
    audienceStats = {
      totalMatched: result.totalMatched,
      removedDNC: result.removedDNC,
      removedNoPhone: result.removedNoPhone,
      removedNoEmail: result.removedNoEmail,
    }
  }

  if (audienceBuyers.length === 0) {
    return errorResponse(400, 'No eligible buyers for this campaign. Check your filters or ensure buyers have contact info and are not on the DNC list.')
  }

  // ── Estimated cost ──────────────────────────────────────────────────────
  const costPerBuyer = campaignChannel === 'VOICE' ? 0.36
    : campaignChannel === 'SMS' ? 0.015
    : campaignChannel === 'EMAIL' ? 0.001
    : 0.38
  const estimatedCost = Math.round(audienceBuyers.length * costPerBuyer * 100) / 100

  // ── Create campaign from template ───────────────────────────────────────
  const campaign = await prisma.campaign.create({
    data: {
      profileId: profile.id,
      name: ((body.name as string) || templateData.name).trim(),
      market: (body.market as string).trim(),
      status: 'DRAFT',
      mode: (body.mode as any) || 'AI',
      channel: campaignChannel as any,
      scriptTemplate: (body.scriptTemplate as string) || templateData.scriptTemplate || 'standard_qualification',
      companyName: (body.companyName as string) || null,
      agentName: (body.agentName as string) || null,
      customScript: (body.customScript as string) || null,
      maxConcurrentCalls: (merged.maxConcurrentCalls as number) || 5,
      callingHoursStart: (merged.callingHoursStart as string) || '09:00',
      callingHoursEnd: (merged.callingHoursEnd as string) || '19:00',
      timezone: (merged.timezone as string) || 'America/New_York',
      leaveVoicemail: merged.leaveVoicemail !== false,
      maxRetries: (merged.maxRetries as number) ?? 2,
      retryDelayHours: (merged.retryDelayHours as number) ?? 24,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt as string) : null,
      totalBuyers: audienceBuyers.length,
      estimatedCost,
    },
  })

  // ── Create CampaignCall records ─────────────────────────────────────────
  await prisma.campaignCall.createMany({
    data: audienceBuyers.map(buyer => ({
      campaignId: campaign.id,
      buyerId: buyer.id,
      phoneNumber: buyer.phone || '',
      attemptNumber: 1,
    })),
  })

  // ── Increment template use count ────────────────────────────────────────
  if (!isSystemTemplate(id)) {
    await prisma.campaignTemplate.update({
      where: { id },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
    })
  }

  logger.info('Campaign created from template', {
    route: `/api/outreach/templates/${id}/use`,
    userId: profile.id,
    templateId: id,
    campaignId: campaign.id,
    buyerCount: audienceBuyers.length,
  })

  return successResponse({
    campaign,
    templateId: id,
    audience: {
      total: audienceBuyers.length,
      ...audienceStats,
      estimatedCost,
    },
  }, 201)
}
