// ─── Voicemail Drop Service ──────────────────────────────────────────────────
// Handles voicemail drop logic, TTS generation, and smart sequencing.
// Integrates with Bland AI's task parameter to deliver voicemail messages.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { fetchWithTimeout } from '@/lib/resilience'
import {
  getVoicemailTemplate,
  getDefaultVoicemailForScript,
  mergeVoicemailTemplate,
  type VoicemailMergeData,
  type VoicemailTemplate,
} from './voicemail-templates'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VoicemailRecordingConfig {
  recordingId?: string       // DB recording ID
  systemTemplateId?: string  // system template ID (vm_*)
  ttsText?: string           // raw TTS text (already merged)
  audioUrl?: string          // pre-recorded audio URL
}

export interface VoicemailDropResult {
  success: boolean
  method: 'recording' | 'tts' | 'bland_native'
  duration: number | null
  error?: string
}

interface CampaignWithVM {
  leaveVoicemail: boolean
  voicemailRecordingId: string | null
  voicemailSequence: unknown // Json
  scriptTemplate: string
  companyName: string | null
  agentName: string | null
  market: string
}

interface VoicemailSequenceEntry {
  attempt: number
  recordingId: string
}

// ─── Smart Voicemail Sequencing ──────────────────────────────────────────────

/**
 * Get the right voicemail config for a campaign + attempt number.
 * Returns null if voicemail should not be left.
 */
export function getVoicemailForAttempt(
  campaign: CampaignWithVM,
  attemptNumber: number,
): VoicemailRecordingConfig | null {
  if (!campaign.leaveVoicemail) return null

  // Smart sequencing: different VMs per attempt
  if (campaign.voicemailSequence) {
    const sequence = campaign.voicemailSequence as VoicemailSequenceEntry[]
    if (Array.isArray(sequence) && sequence.length > 0) {
      const entry = sequence.find(s => s.attempt === attemptNumber)
      if (entry) return { recordingId: entry.recordingId }
      // Fall back to last defined recording for attempts beyond the sequence
      const last = sequence[sequence.length - 1]
      return { recordingId: last.recordingId }
    }
  }

  // Single recording for all attempts
  if (campaign.voicemailRecordingId) {
    return { recordingId: campaign.voicemailRecordingId }
  }

  // Default: use system template matching the campaign's script template
  const template = getDefaultVoicemailForScript(campaign.scriptTemplate)
  return { systemTemplateId: template.id }
}

// ─── Resolve Voicemail Text ─────────────────────────────────────────────────

/**
 * Resolve a VoicemailRecordingConfig into the actual text to include in the
 * Bland AI task. Returns the merged voicemail text ready to speak.
 */
export async function resolveVoicemailText(
  config: VoicemailRecordingConfig,
  mergeData: VoicemailMergeData,
): Promise<{ text: string; audioUrl: string | null; recordingDbId: string | null }> {
  // If raw TTS text is provided, use it directly
  if (config.ttsText) {
    return { text: config.ttsText, audioUrl: null, recordingDbId: null }
  }

  // If a system template ID is specified
  if (config.systemTemplateId) {
    const template = getVoicemailTemplate(config.systemTemplateId)
    if (template) {
      const text = mergeVoicemailTemplate(template.ttsText, mergeData)
      return { text, audioUrl: null, recordingDbId: null }
    }
  }

  // If a DB recording ID is specified
  if (config.recordingId) {
    // Check if it's actually a system template ID
    const sysTemplate = getVoicemailTemplate(config.recordingId)
    if (sysTemplate) {
      const text = mergeVoicemailTemplate(sysTemplate.ttsText, mergeData)
      return { text, audioUrl: null, recordingDbId: null }
    }

    // Look up in DB
    try {
      const recording = await prisma.voicemailRecording.findUnique({
        where: { id: config.recordingId },
      })
      if (recording) {
        // If it has a pre-recorded audio URL, prefer that
        if (recording.audioUrl) {
          return { text: recording.ttsText || '', audioUrl: recording.audioUrl, recordingDbId: recording.id }
        }
        // Otherwise use TTS text
        if (recording.ttsText) {
          const text = mergeVoicemailTemplate(recording.ttsText, mergeData)
          return { text, audioUrl: null, recordingDbId: recording.id }
        }
      }
    } catch (err) {
      logger.warn('Failed to fetch voicemail recording', {
        route: 'voicemail-service',
        recordingId: config.recordingId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // Fallback: generic introduction
  const fallback = getDefaultVoicemailForScript(null)
  const text = mergeVoicemailTemplate(fallback.ttsText, mergeData)
  return { text, audioUrl: null, recordingDbId: null }
}

// ─── Build Voicemail Instructions for Bland AI ──────────────────────────────

/**
 * Build the voicemail instruction block to append to a Bland AI task/script.
 * This tells Bland's AI agent what to do when it detects voicemail.
 */
export function buildVoicemailInstructions(
  voicemailText: string | null,
  leaveVoicemail: boolean,
): string {
  if (!leaveVoicemail || !voicemailText) {
    return '\n\nVOICEMAIL INSTRUCTIONS: If you reach voicemail, hang up immediately without leaving a message.'
  }

  return (
    '\n\nVOICEMAIL INSTRUCTIONS: If you hear a voicemail greeting or beep, leave this exact message ' +
    '(speak naturally, like a real person): ' +
    `"${voicemailText}" ` +
    'Keep it under 30 seconds. After leaving the message, hang up. ' +
    'Do not try to have a conversation with a voicemail machine.'
  )
}

// ─── Build Merge Data from Campaign + Buyer ─────────────────────────────────

export interface BuyerMergeInfo {
  firstName?: string | null
  lastName?: string | null
  entityName?: string | null
}

/**
 * Build merge data from campaign and buyer information.
 */
export function buildMergeData(
  campaign: { companyName?: string | null; agentName?: string | null; market: string },
  buyer: BuyerMergeInfo,
  callbackNumber?: string,
  propertyType?: string,
): VoicemailMergeData {
  const buyerName = buyer.firstName
    ? `${buyer.firstName}${buyer.lastName ? ' ' + buyer.lastName : ''}`
    : buyer.entityName || undefined

  return {
    buyerName,
    agentName: campaign.agentName || undefined,
    companyName: campaign.companyName || undefined,
    market: campaign.market,
    callbackNumber,
    propertyType,
  }
}

// ─── TTS Generation (stub for MVP) ─────────────────────────────────────────

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'pNInz6obpgDQGcFmaJgB' // Adam

/**
 * Generate TTS audio from text using ElevenLabs.
 * Returns null if no API key is configured — callers should fall back to
 * text-based instructions for Bland AI.
 */
export async function generateTTSAudio(
  text: string,
  voiceId?: string,
): Promise<{ audioBuffer: Buffer; contentType: string; duration: number } | null> {
  if (!ELEVENLABS_API_KEY) return null

  try {
    const res = await fetchWithTimeout(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || DEFAULT_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
        timeoutMs: 15_000,
      },
    )

    if (!res.ok) {
      logger.warn('ElevenLabs TTS failed', {
        route: 'voicemail-service',
        status: res.status,
      })
      return null
    }

    const arrayBuffer = await res.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)

    // Estimate duration: ~150 words per minute for TTS, average 5 chars per word
    const wordCount = text.split(/\s+/).length
    const duration = Math.round((wordCount / 150) * 60)

    return { audioBuffer, contentType: 'audio/mpeg', duration }
  } catch (err) {
    logger.warn('TTS generation failed', {
      route: 'voicemail-service',
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

// ─── Voicemail Callback Attribution ─────────────────────────────────────────

/**
 * Update callback rates for all voicemail recordings belonging to a profile.
 * A "callback" is defined as a buyer who was left a voicemail and then either:
 * - Was marked as CALLBACK_REQUESTED within 48 hours
 * - Had a subsequent call with outcome QUALIFIED within 48 hours
 */
export async function updateVoicemailCallbackRates(profileId: string): Promise<void> {
  try {
    const recordings = await prisma.voicemailRecording.findMany({
      where: { profileId },
      select: { id: true, useCount: true },
    })

    if (recordings.length === 0) return

    // For each recording, find calls that used this VM and check for follow-ups
    for (const recording of recordings) {
      if (recording.useCount === 0) continue

      // Find voicemail calls that reference this recording
      // We track VM usage via extractedData.voicemailRecordingId on CampaignCall
      const vmCalls = await prisma.campaignCall.findMany({
        where: {
          outcome: 'VOICEMAIL',
          extractedData: { path: ['voicemailRecordingId'], equals: recording.id },
        },
        select: { buyerId: true, endedAt: true },
      })

      if (vmCalls.length === 0) {
        await prisma.voicemailRecording.update({
          where: { id: recording.id },
          data: { callbackRate: 0 },
        })
        continue
      }

      // Check for callbacks within 48 hours of each VM drop
      let callbackCount = 0
      for (const vmCall of vmCalls) {
        if (!vmCall.endedAt) continue
        const windowEnd = new Date(vmCall.endedAt.getTime() + 48 * 60 * 60 * 1000)

        const followUp = await prisma.campaignCall.findFirst({
          where: {
            buyerId: vmCall.buyerId,
            outcome: { in: ['QUALIFIED', 'CALLBACK_REQUESTED'] },
            startedAt: { gte: vmCall.endedAt, lte: windowEnd },
          },
        })

        if (followUp) callbackCount++
      }

      const callbackRate = vmCalls.length > 0 ? (callbackCount / vmCalls.length) * 100 : 0

      await prisma.voicemailRecording.update({
        where: { id: recording.id },
        data: { callbackRate: Math.round(callbackRate * 10) / 10 },
      })
    }

    logger.info('Updated voicemail callback rates', {
      route: 'voicemail-service',
      profileId,
      recordingsUpdated: recordings.length,
    })
  } catch (err) {
    logger.error('updateVoicemailCallbackRates failed', {
      route: 'voicemail-service',
      profileId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
