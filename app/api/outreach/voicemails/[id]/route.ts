import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { getVoicemailTemplate, isSystemVoicemailTemplate } from '@/lib/outreach/voicemail-templates'

type Params = { params: Promise<{ id: string }> }

const VALID_CATEGORIES = ['deal_alert', 'follow_up', 'reactivation', 'introduction', 'custom']

// GET /api/outreach/voicemails/[id] — Single recording detail
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  // Check system templates first
  if (isSystemVoicemailTemplate(id)) {
    const template = getVoicemailTemplate(id)
    if (!template) return errorResponse(404, 'Template not found')
    return successResponse({
      voicemail: {
        ...template,
        source: 'system',
        profileId: null,
        audioUrl: null,
        format: null,
        ttsVoiceId: null,
        ttsGenerated: false,
        isDefault: false,
        useCount: 0,
        callbackRate: null,
        createdAt: null,
        updatedAt: null,
      },
    })
  }

  const recording = await prisma.voicemailRecording.findUnique({ where: { id } })
  if (!recording) return errorResponse(404, 'Recording not found')
  if (recording.profileId !== profile.id) return errorResponse(404, 'Recording not found')

  // If recording has audioData, provide a playback endpoint
  const hasAudio = !!recording.audioData || !!recording.audioUrl
  const playbackUrl = recording.audioData ? `/api/outreach/voicemails/${id}/preview` : recording.audioUrl

  return successResponse({
    voicemail: {
      ...recording,
      audioData: undefined, // Don't send raw bytes in JSON
      hasAudio,
      playbackUrl,
      source: 'user',
    },
  })
}

// PATCH /api/outreach/voicemails/[id] — Update recording
export async function PATCH(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  if (isSystemVoicemailTemplate(id)) {
    return errorResponse(400, 'Cannot modify system voicemail templates')
  }

  const recording = await prisma.voicemailRecording.findUnique({ where: { id } })
  if (!recording) return errorResponse(404, 'Recording not found')
  if (recording.profileId !== profile.id) return errorResponse(404, 'Recording not found')

  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
  if (body.name !== undefined) v.string('name', body.name, { maxLength: 200, label: 'Name' })
  if (body.category !== undefined) v.enumValue('category', body.category, VALID_CATEGORIES, 'Category')
  if (body.ttsText !== undefined) v.string('ttsText', body.ttsText, { maxLength: 2000, label: 'Voicemail text' })
  if (!v.isValid()) return v.toResponse()

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = (body.name as string).trim()
  if (body.category !== undefined) data.category = body.category
  if (body.ttsText !== undefined) {
    data.ttsText = (body.ttsText as string).trim()
    // Recalculate estimated duration
    const wordCount = (body.ttsText as string).split(/\s+/).length
    data.duration = Math.round((wordCount / 150) * 60)
  }
  if (body.ttsVoiceId !== undefined) data.ttsVoiceId = body.ttsVoiceId || null

  // Set as default for its category
  if (body.isDefault === true) {
    // Unset other defaults in this category
    await prisma.voicemailRecording.updateMany({
      where: { profileId: profile.id, category: recording.category, isDefault: true },
      data: { isDefault: false },
    })
    data.isDefault = true
  } else if (body.isDefault === false) {
    data.isDefault = false
  }

  if (Object.keys(data).length === 0) {
    return errorResponse(400, 'No valid fields to update')
  }

  const updated = await prisma.voicemailRecording.update({
    where: { id },
    data,
  })

  return successResponse({ voicemail: { ...updated, audioData: undefined } })
}

// DELETE /api/outreach/voicemails/[id] — Delete recording
export async function DELETE(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  if (isSystemVoicemailTemplate(id)) {
    return errorResponse(400, 'Cannot delete system voicemail templates')
  }

  const recording = await prisma.voicemailRecording.findUnique({ where: { id } })
  if (!recording) return errorResponse(404, 'Recording not found')
  if (recording.profileId !== profile.id) return errorResponse(404, 'Recording not found')

  await prisma.voicemailRecording.delete({ where: { id } })

  return successResponse({ deleted: true })
}
