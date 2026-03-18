import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'
import { getVoicemailTemplates, isSystemVoicemailTemplate } from '@/lib/outreach/voicemail-templates'
import { generateTTSAudio } from '@/lib/outreach/voicemail-service'

const VALID_CATEGORIES = ['deal_alert', 'follow_up', 'reactivation', 'introduction', 'custom']
const MAX_AUDIO_SIZE = 1_000_000 // 1MB
const MAX_DURATION = 60 // seconds

// GET /api/outreach/voicemails — List user recordings + system templates
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const category = url.searchParams.get('category') || undefined

  // System templates
  let systemTemplates = getVoicemailTemplates().map(t => ({
    ...t,
    source: 'system' as const,
    profileId: null,
    audioUrl: null,
    audioData: null,
    format: null,
    ttsVoiceId: null,
    ttsGenerated: false,
    isDefault: false,
    useCount: 0,
    callbackRate: null,
    createdAt: null,
    updatedAt: null,
  }))
  if (category) {
    systemTemplates = systemTemplates.filter(t => t.category === category)
  }

  // User recordings
  const where: Record<string, unknown> = { profileId: profile.id }
  if (category) where.category = category

  const userRecordings = await prisma.voicemailRecording.findMany({
    where,
    orderBy: [{ useCount: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      category: true,
      audioUrl: true,
      duration: true,
      format: true,
      ttsText: true,
      ttsVoiceId: true,
      ttsGenerated: true,
      isDefault: true,
      useCount: true,
      callbackRate: true,
      profileId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const userMapped = userRecordings.map(r => ({
    ...r,
    source: 'user' as const,
    estimatedDuration: r.duration || (r.ttsText ? Math.round((r.ttsText.split(/\s+/).length / 150) * 60) : null),
    bestFor: null,
  }))

  return successResponse({
    voicemails: [...systemTemplates, ...userMapped],
    systemCount: systemTemplates.length,
    userCount: userMapped.length,
  })
}

// POST /api/outreach/voicemails — Create a voicemail recording
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const contentType = req.headers.get('content-type') || ''

  // Handle multipart form data (audio file upload)
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData()
      const name = formData.get('name') as string
      const category = (formData.get('category') as string) || 'custom'
      const audioFile = formData.get('audio') as File | null

      if (!name) return errorResponse(400, 'Name is required')
      if (!audioFile) return errorResponse(400, 'Audio file is required')

      // Validate file
      const format = audioFile.name.endsWith('.wav') ? 'wav' : 'mp3'
      if (!['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'].includes(audioFile.type) && !['mp3', 'wav'].includes(format)) {
        return errorResponse(400, 'Audio must be MP3 or WAV format')
      }
      if (audioFile.size > MAX_AUDIO_SIZE) {
        return errorResponse(400, 'Audio file must be under 1MB')
      }

      const arrayBuffer = await audioFile.arrayBuffer()
      const audioData = Buffer.from(arrayBuffer)

      // Estimate duration from file size (rough: ~16KB/s for mp3 at 128kbps)
      const estimatedDuration = format === 'mp3'
        ? Math.round(audioFile.size / 16000)
        : Math.round(audioFile.size / 88200) // WAV at 44.1kHz mono 16bit
      if (estimatedDuration > MAX_DURATION) {
        return errorResponse(400, `Audio must be under ${MAX_DURATION} seconds`)
      }

      const recording = await prisma.voicemailRecording.create({
        data: {
          profileId: profile.id,
          name: name.trim(),
          category,
          audioData,
          duration: estimatedDuration,
          format,
        },
      })

      return successResponse({ recording: { ...recording, audioData: undefined } }, 201)
    } catch (err) {
      return errorResponse(400, 'Invalid form data')
    }
  }

  // Handle JSON body (TTS-based voicemail)
  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
    .require('name', body.name, 'Name')
    .string('name', body.name, { maxLength: 200, label: 'Name' })
    .require('ttsText', body.ttsText, 'Voicemail text')
    .string('ttsText', body.ttsText, { maxLength: 2000, label: 'Voicemail text' })

  if (body.category !== undefined) {
    v.enumValue('category', body.category, VALID_CATEGORIES, 'Category')
  }

  if (!v.isValid()) return v.toResponse()

  if (body.id && isSystemVoicemailTemplate(body.id as string)) {
    return errorResponse(400, 'Cannot create a recording with a system template ID')
  }

  // Optionally generate TTS audio
  let audioUrl: string | null = null
  let audioData: Uint8Array | null = null
  let duration: number | null = null
  let ttsGenerated = false

  if (body.generateAudio) {
    const ttsResult = await generateTTSAudio(body.ttsText as string, body.ttsVoiceId as string | undefined)
    if (ttsResult) {
      audioData = new Uint8Array(ttsResult.audioBuffer)
      duration = ttsResult.duration
      ttsGenerated = true
    }
  }

  // Estimate duration from text if not generated
  if (!duration && body.ttsText) {
    const wordCount = (body.ttsText as string).split(/\s+/).length
    duration = Math.round((wordCount / 150) * 60)
  }

  const recording = await prisma.voicemailRecording.create({
    data: {
      profileId: profile.id,
      name: (body.name as string).trim(),
      category: (body.category as string) || 'custom',
      ttsText: (body.ttsText as string).trim(),
      ttsVoiceId: (body.ttsVoiceId as string) || null,
      ttsGenerated,
      audioData: audioData as any,
      audioUrl,
      duration,
      format: ttsGenerated ? 'mp3' : null,
    },
  })

  return successResponse({ recording: { ...recording, audioData: undefined } }, 201)
}
