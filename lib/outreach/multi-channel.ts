// ─── Multi-Channel Orchestrator ─────────────────────────────────────────────
// Coordinates outreach across voice, SMS, and email channels.
// Stateless: reads campaign history and determines the next action.
//
// Default multi-channel sequence:
// 1. AI voice call (primary)
// 2. If no answer after 2 attempts → send SMS (wait 4 hours)
// 3. If no SMS response in 24 hours → send email
// 4. If no email response in 48 hours → mark as unresponsive

import { prisma } from '@/lib/prisma'

// ─── Types ──────────────────────────────────────────────────────────────────

export type OutreachChannel = 'voice' | 'sms' | 'email'

export interface ChannelFallback {
  channel: OutreachChannel
  triggerOn: 'no_answer' | 'no_response' | 'always'
  delayHours: number
}

export interface MultiChannelConfig {
  primaryChannel: OutreachChannel
  fallbackSequence: ChannelFallback[]
  waitBetweenChannels: number     // hours to wait before trying next channel
}

export interface ChannelAction {
  channel: OutreachChannel
  action: 'call' | 'send_sms' | 'send_email' | 'mark_unresponsive'
  scheduledFor: Date | null       // null = execute now
  stepIndex: number               // which step in the sequence (0-based)
}

// ─── Default Config ─────────────────────────────────────────────────────────

export const DEFAULT_MULTI_CHANNEL_CONFIG: MultiChannelConfig = {
  primaryChannel: 'voice',
  fallbackSequence: [
    { channel: 'sms', triggerOn: 'no_answer', delayHours: 4 },
    { channel: 'email', triggerOn: 'no_response', delayHours: 24 },
  ],
  waitBetweenChannels: 4,
}

// ─── Terminal outcomes (don't attempt further channels) ─────────────────────

const TERMINAL_OUTCOMES = new Set([
  'QUALIFIED',
  'NOT_BUYING',
  'DO_NOT_CALL',
  'WRONG_NUMBER',
])

const POSITIVE_OUTCOMES = new Set(['QUALIFIED', 'CALLBACK_REQUESTED'])

// ─── Get Next Channel Action ────────────────────────────────────────────────

export async function getNextChannelAction(
  campaignId: string,
  buyerId: string,
  config?: MultiChannelConfig,
): Promise<ChannelAction | null> {
  const cfg = config || DEFAULT_MULTI_CHANNEL_CONFIG

  // Fetch all outreach attempts for this buyer in this campaign
  const attempts = await prisma.campaignCall.findMany({
    where: { campaignId, buyerId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      channel: true,
      outcome: true,
      messageSent: true,
      responseText: true,
      responseAt: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
    },
  })

  // If any attempt has a terminal outcome, we're done
  if (attempts.some(a => a.outcome && TERMINAL_OUTCOMES.has(a.outcome))) {
    return null
  }

  // If buyer responded positively to SMS, skip further channels
  if (attempts.some(a => a.channel === 'sms' && a.responseText && a.outcome && POSITIVE_OUTCOMES.has(a.outcome))) {
    return null
  }

  // Determine which channels have been attempted
  const voiceAttempts = attempts.filter(a => a.channel === 'voice' || (!a.channel && a.startedAt))
  const smsAttempts = attempts.filter(a => a.channel === 'sms')
  const emailAttempts = attempts.filter(a => a.channel === 'email')

  const now = new Date()

  // ── Step 0: Primary channel (voice) ───────────────────────────────────────
  if (cfg.primaryChannel === 'voice') {
    // If no voice attempts yet, or voice attempts are pending/need retry
    const completedVoice = voiceAttempts.filter(a => a.endedAt)
    const pendingVoice = voiceAttempts.filter(a => !a.endedAt && a.startedAt)

    // If there's an active call in progress, wait
    if (pendingVoice.length > 0) return null

    // If no voice attempts completed yet, do a voice call
    if (completedVoice.length === 0) {
      return { channel: 'voice', action: 'call', scheduledFor: null, stepIndex: 0 }
    }

    // Check if voice attempts exhausted (all NO_ANSWER/VOICEMAIL after max retries)
    const lastVoice = completedVoice[completedVoice.length - 1]
    const voiceExhausted = completedVoice.length >= 2 &&
      completedVoice.every(a => a.outcome === 'NO_ANSWER' || a.outcome === 'VOICEMAIL')

    if (!voiceExhausted) {
      // Voice not exhausted yet — let the normal retry logic handle it
      return null
    }

    // Voice exhausted — proceed to fallback sequence
    const lastVoiceEnd = lastVoice.endedAt!

    // ── Step 1: SMS fallback ──────────────────────────────────────────────
    const smsFallback = cfg.fallbackSequence.find(f => f.channel === 'sms')
    if (smsFallback && smsAttempts.length === 0) {
      const smsScheduledFor = new Date(lastVoiceEnd.getTime() + smsFallback.delayHours * 60 * 60 * 1000)
      if (now >= smsScheduledFor) {
        return { channel: 'sms', action: 'send_sms', scheduledFor: null, stepIndex: 1 }
      }
      return { channel: 'sms', action: 'send_sms', scheduledFor: smsScheduledFor, stepIndex: 1 }
    }

    // ── Step 2: Email fallback ────────────────────────────────────────────
    const emailFallback = cfg.fallbackSequence.find(f => f.channel === 'email')
    if (emailFallback && smsAttempts.length > 0 && emailAttempts.length === 0) {
      const lastSMS = smsAttempts[smsAttempts.length - 1]
      // Check if buyer responded to SMS
      if (lastSMS.responseText) return null // Got a response, don't escalate

      const smsTime = lastSMS.createdAt
      const emailScheduledFor = new Date(smsTime.getTime() + emailFallback.delayHours * 60 * 60 * 1000)
      if (now >= emailScheduledFor) {
        return { channel: 'email', action: 'send_email', scheduledFor: null, stepIndex: 2 }
      }
      return { channel: 'email', action: 'send_email', scheduledFor: emailScheduledFor, stepIndex: 2 }
    }

    // ── Step 3: All channels exhausted ────────────────────────────────────
    if (smsAttempts.length > 0 && emailAttempts.length > 0) {
      const lastEmail = emailAttempts[emailAttempts.length - 1]
      const exhaustedAfter = new Date(lastEmail.createdAt.getTime() + 48 * 60 * 60 * 1000)
      if (now >= exhaustedAfter) {
        return { channel: 'email', action: 'mark_unresponsive', scheduledFor: null, stepIndex: 3 }
      }
      // Still waiting for email response
      return null
    }
  }

  // ── SMS-primary campaigns ───────────────────────────────────────────────
  if (cfg.primaryChannel === 'sms') {
    if (smsAttempts.length === 0) {
      return { channel: 'sms', action: 'send_sms', scheduledFor: null, stepIndex: 0 }
    }
    // Check for email fallback
    const emailFallback = cfg.fallbackSequence.find(f => f.channel === 'email')
    if (emailFallback && emailAttempts.length === 0) {
      const lastSMS = smsAttempts[smsAttempts.length - 1]
      if (lastSMS.responseText) return null
      const emailScheduledFor = new Date(lastSMS.createdAt.getTime() + emailFallback.delayHours * 60 * 60 * 1000)
      if (now >= emailScheduledFor) {
        return { channel: 'email', action: 'send_email', scheduledFor: null, stepIndex: 1 }
      }
      return { channel: 'email', action: 'send_email', scheduledFor: emailScheduledFor, stepIndex: 1 }
    }
    return null
  }

  // ── Email-primary campaigns ─────────────────────────────────────────────
  if (cfg.primaryChannel === 'email') {
    if (emailAttempts.length === 0) {
      return { channel: 'email', action: 'send_email', scheduledFor: null, stepIndex: 0 }
    }
    return null
  }

  return null
}

// ─── Build config from campaign data ────────────────────────────────────────

export function buildMultiChannelConfig(
  primaryChannel: OutreachChannel,
  options?: {
    smsDelayHours?: number
    emailDelayHours?: number
    waitBetweenChannels?: number
  },
): MultiChannelConfig {
  const fallbacks: ChannelFallback[] = []

  if (primaryChannel === 'voice') {
    fallbacks.push(
      { channel: 'sms', triggerOn: 'no_answer', delayHours: options?.smsDelayHours ?? 4 },
      { channel: 'email', triggerOn: 'no_response', delayHours: options?.emailDelayHours ?? 24 },
    )
  } else if (primaryChannel === 'sms') {
    fallbacks.push(
      { channel: 'email', triggerOn: 'no_response', delayHours: options?.emailDelayHours ?? 24 },
    )
  }
  // Email-primary has no fallbacks

  return {
    primaryChannel,
    fallbackSequence: fallbacks,
    waitBetweenChannels: options?.waitBetweenChannels ?? 4,
  }
}
