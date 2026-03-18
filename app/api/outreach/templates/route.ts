import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { getSystemTemplates, isSystemTemplate } from '@/lib/outreach/campaign-templates'

const VALID_CATEGORIES = ['qualification', 'deal_alert', 'reactivation', 'follow_up', 'verification', 'custom']
const VALID_CHANNELS = ['VOICE', 'SMS', 'EMAIL', 'MULTI_CHANNEL']

// GET /api/outreach/templates — List system + user templates
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const category = url.searchParams.get('category') || undefined
  const channel = url.searchParams.get('channel') || undefined

  // System templates (always available, code-defined)
  let systemTemplates = getSystemTemplates().map(t => ({
    ...t,
    source: 'system' as const,
    profileId: null,
    useCount: 0,
    lastUsedAt: null,
    isPublic: false,
    createdAt: null,
    updatedAt: null,
  }))

  if (category) {
    systemTemplates = systemTemplates.filter(t => t.category === category)
  }
  if (channel) {
    systemTemplates = systemTemplates.filter(t => t.channel === channel)
  }

  // User templates (from DB)
  const where: Record<string, unknown> = {
    OR: [
      { profileId: profile.id },
      { isPublic: true },
    ],
  }
  if (category) (where as any).category = category
  if (channel) (where as any).channel = channel

  const userTemplates = await prisma.campaignTemplate.findMany({
    where,
    orderBy: [{ useCount: 'desc' }, { updatedAt: 'desc' }],
  })

  const userMapped = userTemplates.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    icon: t.icon,
    channel: t.channel,
    scriptTemplate: t.scriptTemplate,
    smsTemplateId: t.smsTemplateId,
    emailSequenceId: t.emailSequenceId,
    audienceFilter: t.audienceFilter,
    settings: t.settings,
    multiChannelConfig: t.multiChannelConfig,
    estimatedDuration: null,
    bestFor: null,
    expectedResults: null,
    source: 'user' as const,
    profileId: t.profileId,
    useCount: t.useCount,
    lastUsedAt: t.lastUsedAt,
    isPublic: t.isPublic,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))

  return successResponse({
    templates: [...systemTemplates, ...userMapped],
    systemCount: systemTemplates.length,
    userCount: userMapped.length,
  })
}

// POST /api/outreach/templates — Save a custom template
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
    .require('name', body.name, 'Template name')
    .string('name', body.name, { maxLength: 200, label: 'Template name' })
    .enumValue('channel', body.channel, VALID_CHANNELS, 'Channel')

  if (body.category !== undefined) {
    v.enumValue('category', body.category, VALID_CATEGORIES, 'Category')
  }
  if (body.description !== undefined) {
    v.string('description', body.description, { maxLength: 500, label: 'Description' })
  }
  if (body.scriptTemplate !== undefined) {
    v.string('scriptTemplate', body.scriptTemplate, { maxLength: 100 })
  }
  if (body.customScript !== undefined) {
    v.string('customScript', body.customScript, { maxLength: 5000 })
  }

  if (!v.isValid()) return v.toResponse()

  // Prevent creating templates with system IDs
  if (body.id && isSystemTemplate(body.id as string)) {
    return errorResponse(400, 'Cannot create a template with a system template ID')
  }

  const template = await prisma.campaignTemplate.create({
    data: {
      profileId: profile.id,
      name: (body.name as string).trim(),
      description: (body.description as string) || null,
      category: (body.category as string) || 'custom',
      icon: (body.icon as string) || null,
      channel: body.channel as string,
      scriptTemplate: (body.scriptTemplate as string) || null,
      customScript: (body.customScript as string) || null,
      smsTemplateId: (body.smsTemplateId as string) || null,
      emailSequenceId: (body.emailSequenceId as string) || null,
      audienceFilter: body.audienceFilter ? (body.audienceFilter as any) : undefined,
      settings: body.settings ? (body.settings as any) : undefined,
      multiChannelConfig: body.multiChannelConfig ? (body.multiChannelConfig as any) : undefined,
      isPublic: false,
    },
  })

  return successResponse({ template }, 201)
}
