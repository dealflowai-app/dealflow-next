import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { getSystemTemplate, isSystemTemplate } from '@/lib/outreach/campaign-templates'

type Params = { params: Promise<{ id: string }> }

const VALID_CATEGORIES = ['qualification', 'deal_alert', 'reactivation', 'follow_up', 'verification', 'custom']
const VALID_CHANNELS = ['VOICE', 'SMS', 'EMAIL', 'MULTI_CHANNEL']

// GET /api/outreach/templates/[id] — Get a single template
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  // System template check
  if (isSystemTemplate(id)) {
    const sys = getSystemTemplate(id)
    if (!sys) return errorResponse(404, 'Template not found')
    return successResponse({
      template: {
        ...sys,
        source: 'system',
        profileId: null,
        useCount: 0,
        lastUsedAt: null,
        isPublic: false,
        createdAt: null,
        updatedAt: null,
      },
    })
  }

  const template = await prisma.campaignTemplate.findUnique({ where: { id } })
  if (!template) return errorResponse(404, 'Template not found')

  // Ownership or public check
  if (template.profileId !== profile.id && !template.isPublic) {
    return errorResponse(404, 'Template not found')
  }

  return successResponse({
    template: { ...template, source: 'user' },
  })
}

// PATCH /api/outreach/templates/[id] — Update a user template
export async function PATCH(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  if (isSystemTemplate(id)) {
    return errorResponse(400, 'System templates cannot be edited')
  }

  const template = await prisma.campaignTemplate.findUnique({ where: { id } })
  if (!template || template.profileId !== profile.id) {
    return errorResponse(404, 'Template not found')
  }

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
  if (body.name !== undefined) v.string('name', body.name, { maxLength: 200, label: 'Template name' })
  if (body.description !== undefined) v.string('description', body.description, { maxLength: 500, label: 'Description' })
  if (body.category !== undefined) v.enumValue('category', body.category, VALID_CATEGORIES, 'Category')
  if (body.channel !== undefined) v.enumValue('channel', body.channel, VALID_CHANNELS, 'Channel')
  if (body.scriptTemplate !== undefined) v.string('scriptTemplate', body.scriptTemplate, { maxLength: 100 })
  if (body.customScript !== undefined) v.string('customScript', body.customScript, { maxLength: 5000 })
  if (!v.isValid()) return v.toResponse()

  const updateData: Record<string, unknown> = {}
  const allowedFields = [
    'name', 'description', 'category', 'icon', 'channel',
    'scriptTemplate', 'customScript', 'smsTemplateId', 'emailSequenceId',
  ]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  // JSON fields
  if (body.audienceFilter !== undefined) updateData.audienceFilter = body.audienceFilter
  if (body.settings !== undefined) updateData.settings = body.settings
  if (body.multiChannelConfig !== undefined) updateData.multiChannelConfig = body.multiChannelConfig

  if (Object.keys(updateData).length === 0) {
    return errorResponse(400, 'No valid fields to update')
  }

  const updated = await prisma.campaignTemplate.update({
    where: { id },
    data: updateData,
  })

  return successResponse({ template: updated })
}

// DELETE /api/outreach/templates/[id] — Delete a user template
export async function DELETE(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  if (isSystemTemplate(id)) {
    return errorResponse(400, 'System templates cannot be deleted')
  }

  const template = await prisma.campaignTemplate.findUnique({ where: { id } })
  if (!template || template.profileId !== profile.id) {
    return errorResponse(404, 'Template not found')
  }

  await prisma.campaignTemplate.delete({ where: { id } })

  return successResponse({ success: true })
}
