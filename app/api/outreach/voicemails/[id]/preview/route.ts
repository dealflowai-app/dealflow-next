import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import {
  getVoicemailTemplate,
  isSystemVoicemailTemplate,
  mergeVoicemailTemplate,
} from '@/lib/outreach/voicemail-templates'
import { generateTTSAudio } from '@/lib/outreach/voicemail-service'

type Params = { params: Promise<{ id: string }> }

// GET /api/outreach/voicemails/[id]/preview — Stream stored audio data
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  const recording = await prisma.voicemailRecording.findUnique({
    where: { id },
    select: { profileId: true, audioData: true, format: true },
  })

  if (!recording) return errorResponse(404, 'Recording not found')
  if (recording.profileId !== profile.id) return errorResponse(404, 'Recording not found')
  if (!recording.audioData) return errorResponse(404, 'No audio data stored for this recording')

  const contentType = recording.format === 'wav' ? 'audio/wav' : 'audio/mpeg'

  return new NextResponse(recording.audioData as any, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(recording.audioData.length),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

// POST /api/outreach/voicemails/[id]/preview — Generate TTS preview with merge data
export async function POST(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  const mergeData = {
    buyerName: (body.buyerName as string) || 'John',
    agentName: (body.agentName as string) || 'Alex',
    companyName: (body.companyName as string) || 'DealFlow Properties',
    market: (body.market as string) || 'Atlanta, GA',
    callbackNumber: (body.callbackNumber as string) || '(555) 123-4567',
    propertyType: (body.propertyType as string) || 'single family home',
  }

  let ttsText: string | null = null

  // System template
  if (isSystemVoicemailTemplate(id)) {
    const template = getVoicemailTemplate(id)
    if (!template) return errorResponse(404, 'Template not found')
    ttsText = mergeVoicemailTemplate(template.ttsText, mergeData)
  } else {
    // User recording
    const recording = await prisma.voicemailRecording.findUnique({ where: { id } })
    if (!recording) return errorResponse(404, 'Recording not found')
    if (recording.profileId !== profile.id) return errorResponse(404, 'Recording not found')
    if (!recording.ttsText) return errorResponse(400, 'This recording has no TTS text to preview')
    ttsText = mergeVoicemailTemplate(recording.ttsText, mergeData)
  }

  // Try to generate TTS audio
  const ttsResult = await generateTTSAudio(ttsText)

  if (ttsResult) {
    // Return audio stream
    return new NextResponse(new Uint8Array(ttsResult.audioBuffer) as any, {
      headers: {
        'Content-Type': ttsResult.contentType,
        'Content-Length': String(ttsResult.audioBuffer.length),
      },
    })
  }

  // No TTS API — return the merged text for the user to read
  return successResponse({
    text: ttsText,
    message: 'TTS generation unavailable. Configure ELEVENLABS_API_KEY for audio preview.',
    estimatedDuration: Math.round((ttsText.split(/\s+/).length / 150) * 60),
  })
}
