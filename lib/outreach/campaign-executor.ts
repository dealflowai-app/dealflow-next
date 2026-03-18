// ─── Campaign Executor ───────────────────────────────────────────────────────
// Engine that processes RUNNING campaigns across all channels:
// VOICE (Bland AI), SMS (Twilio), EMAIL (SendGrid), MULTI_CHANNEL.
//
// Self-sustaining loop:
// 1. Campaign transitions to RUNNING → executeCampaignBatch() fires
// 2. Batch processes pending entries up to maxConcurrentCalls
// 3. For VOICE: Bland webhook fires on completion → triggers next batch
// 4. For SMS: Twilio webhook fires on response → triggers next batch
// 5. For EMAIL: drip steps are time-based, triggered on each batch
// 6. For MULTI_CHANNEL: orchestrator decides next channel per buyer

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { checkCompliance, normalizePhone } from './compliance'
import { generateScript, type ScriptConfig } from './scripts'
import { getBlandClient, toE164 } from './bland-client'
import { getSMSClient, mergeTemplate, SMS_TEMPLATES } from './sms-service'
import { getEmailDripService } from './email-service'
import { getNextChannelAction } from './multi-channel'
import { optimizeSchedule, processDueCallbacks } from './smart-scheduler'
import {
  getVoicemailForAttempt,
  resolveVoicemailText,
  buildVoicemailInstructions,
  buildMergeData,
} from './voicemail-service'
import { recordOutboundCampaignSMS } from './sms-conversation'
import { createLiveSession } from './live-call-service'
import type { ComplianceChannel } from './compliance'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  callsInitiated: number
  callsSkipped: number
  callsFailed: number
  errors: string[]
  nextBatchAt: string | null
}

// ─── Two-party consent states (for recording disclosure) ────────────────────

const TWO_PARTY_CONSENT_STATES = new Set([
  'CA', 'CT', 'FL', 'IL', 'MD', 'MA', 'MI', 'MT', 'NV', 'NH', 'OR', 'PA', 'WA',
])

// ─── Shared: compliance gate ────────────────────────────────────────────────

async function runComplianceCheck(
  phone: string | null,
  channel: ComplianceChannel,
  profileId: string,
  callId: string,
  buyerState: string | null,
  campaignId: string,
  buyerId: string,
  result: ExecutionResult,
): Promise<{ normalized: string | null; blocked: boolean }> {
  if (!phone) {
    result.callsSkipped++
    result.errors.push(`Call ${callId}: No phone number`)
    return { normalized: null, blocked: true }
  }

  const normalized = normalizePhone(phone)
  if (!normalized) {
    result.callsSkipped++
    result.errors.push(`Call ${callId}: Invalid phone number`)
    return { normalized: null, blocked: true }
  }

  const compliance = await checkCompliance(normalized, channel, profileId, {
    state: buyerState,
    campaignId,
    buyerId,
  })

  if (compliance.blocked) {
    const blockReason = compliance.reasons.map(r => r.code).join(', ')

    if (compliance.reasons.some(r => r.code === 'OUTSIDE_HOURS')) {
      result.callsSkipped++
      result.nextBatchAt = compliance.callingWindow.nextWindowStart
      return { normalized, blocked: true }
    }

    result.callsSkipped++
    await prisma.campaignCall.update({
      where: { id: callId },
      data: {
        outcome: compliance.reasons.some(r => r.code === 'DNC_LIST' || r.code === 'OPT_OUT')
          ? 'DO_NOT_CALL' : 'NO_ANSWER',
        endedAt: new Date(),
        aiSummary: `Compliance blocked: ${blockReason}`,
      },
    })
    return { normalized, blocked: true }
  }

  return { normalized, blocked: false }
}

// ─── Voice Executor ─────────────────────────────────────────────────────────

async function executeVoiceCall(
  call: any, campaign: any, normalized: string, result: ExecutionResult,
): Promise<void> {
  const bland = getBlandClient()
  const buyerName = call.buyer.entityName
    || [call.buyer.firstName, call.buyer.lastName].filter(Boolean).join(' ') || undefined
  const needsDisclosure = call.buyer.state
    ? TWO_PARTY_CONSENT_STATES.has(call.buyer.state.toUpperCase()) : false

  const scriptConfig: ScriptConfig = {
    template: campaign.scriptTemplate,
    companyName: campaign.companyName || campaign.profile?.company || 'our company',
    agentName: campaign.agentName || 'Alex',
    market: campaign.market,
    buyerName,
    previousCallSummary: call.aiSummary || undefined,
    customInstructions: campaign.customScript || undefined,
    recordingDisclosure: needsDisclosure,
    state: call.buyer.state || '',
  }
  let script = generateScript(scriptConfig)

  // ── Voicemail drop instructions ────────────────────────────────────────
  let voicemailRecordingDbId: string | null = null
  try {
    const vmConfig = getVoicemailForAttempt(campaign, call.attemptNumber)
    if (vmConfig) {
      const mergeData = buildMergeData(
        campaign,
        { firstName: call.buyer.firstName, lastName: call.buyer.lastName, entityName: call.buyer.entityName },
        process.env.OUTBOUND_CALLER_ID || campaign.companyName || undefined,
      )
      const resolved = await resolveVoicemailText(vmConfig, mergeData)
      script += buildVoicemailInstructions(resolved.text, campaign.leaveVoicemail)
      voicemailRecordingDbId = resolved.recordingDbId
    } else {
      script += buildVoicemailInstructions(null, campaign.leaveVoicemail)
    }
  } catch (err) {
    logger.warn('Voicemail config resolution failed, using default behavior', {
      route: 'campaign-executor', campaignId: campaign.id, callId: call.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const voiceId = process.env.BLAND_VOICE_ID ? parseInt(process.env.BLAND_VOICE_ID, 10) : undefined
  const voiceSpeed = process.env.BLAND_VOICE_SPEED ? parseFloat(process.env.BLAND_VOICE_SPEED) : undefined

  const blandResponse = await bland.initiateCall({
    phone_number: toE164(normalized),
    task: script,
    voice_id: voiceId,
    max_duration: 10,
    record: true,
    wait_for_greeting: true,
    reduce_latency: true,
    metadata: {
      campaignId: campaign.id,
      buyerId: call.buyerId,
      profileId: campaign.profileId,
      ...(voicemailRecordingDbId ? { voicemailRecordingId: voicemailRecordingDbId } : {}),
    },
    ...(voiceSpeed ? { voice_settings: { speed: voiceSpeed } } : {}),
  })

  await prisma.campaignCall.update({
    where: { id: call.id },
    data: {
      channel: 'voice',
      blandCallId: blandResponse.call_id,
      startedAt: new Date(),
      attemptNumber: call.attemptNumber + (call.outcome ? 1 : 0),
      ...(call.outcome ? { outcome: null, endedAt: null, aiSummary: null } : {}),
    },
  })

  // Create live monitoring session
  try {
    await createLiveSession(campaign.profileId, call.id, blandResponse.call_id)
  } catch (err) {
    logger.warn('Failed to create live session', {
      route: 'campaign-executor', campaignId: campaign.id, callId: call.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  result.callsInitiated++
  logger.info('Voice call initiated', {
    route: 'campaign-executor', campaignId: campaign.id, callId: call.id,
    blandCallId: blandResponse.call_id, phone: `***${normalized.slice(-4)}`,
  })
}

// ─── SMS Executor ───────────────────────────────────────────────────────────

async function executeSMSSend(
  call: any, campaign: any, normalized: string, result: ExecutionResult,
): Promise<void> {
  const smsClient = getSMSClient()
  const buyerName = call.buyer.entityName
    || [call.buyer.firstName, call.buyer.lastName].filter(Boolean).join(' ') || 'Investor'

  const templateMap: Record<string, string> = {
    standard_qualification: 'qualification', deal_alert: 'deal_alert',
    reactivation: 'reactivation', follow_up: 'follow_up',
  }
  const templateId = templateMap[campaign.scriptTemplate] || 'qualification'
  const template = SMS_TEMPLATES.find(t => t.id === templateId) || SMS_TEMPLATES[1]

  const mergeData: Record<string, string> = {
    buyerName, agentName: campaign.agentName || 'Alex',
    companyName: campaign.companyName || campaign.profile?.company || 'our company',
    market: campaign.market,
  }
  const messageBody = mergeTemplate(template.body, mergeData)

  const sendResult = await smsClient.sendSMS({ to: toE164(normalized), body: messageBody })

  if (!sendResult.success) {
    result.callsFailed++
    result.errors.push(`Call ${call.id}: SMS failed — ${sendResult.error}`)
    await prisma.campaignCall.update({
      where: { id: call.id },
      data: { channel: 'sms', aiSummary: `SMS send failed: ${sendResult.error}`, endedAt: new Date() },
    })
    return
  }

  await prisma.campaignCall.update({
    where: { id: call.id },
    data: {
      channel: 'sms', messageId: sendResult.messageId, messageSent: true, startedAt: new Date(),
      attemptNumber: call.attemptNumber + (call.outcome ? 1 : 0),
      ...(call.outcome ? { outcome: null, endedAt: null, aiSummary: null } : {}),
    },
  })

  if (sendResult.cost > 0) {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { actualCost: { increment: sendResult.cost } } })
  }

  // Thread outbound SMS into conversation
  try {
    await recordOutboundCampaignSMS(
      campaign.profileId,
      toE164(normalized),
      messageBody,
      sendResult.messageId,
      { buyerId: call.buyerId, campaignId: campaign.id },
    )
  } catch (err) {
    logger.warn('Failed to thread outbound SMS into conversation', {
      route: 'campaign-executor', campaignId: campaign.id, callId: call.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  result.callsInitiated++
  logger.info('SMS sent', {
    route: 'campaign-executor', campaignId: campaign.id, callId: call.id,
    messageId: sendResult.messageId, phone: `***${normalized.slice(-4)}`,
  })
}

// ─── Email Executor ─────────────────────────────────────────────────────────

async function executeEmailSend(
  call: any, campaign: any, result: ExecutionResult,
): Promise<void> {
  const emailService = getEmailDripService()
  const buyerEmail = call.buyer.email
  if (!buyerEmail) { result.callsSkipped++; return }

  const buyerName = call.buyer.entityName
    || [call.buyer.firstName, call.buyer.lastName].filter(Boolean).join(' ') || 'Investor'

  const sequenceMap: Record<string, string> = {
    standard_qualification: 'qualification', deal_alert: 'deal_alert',
    reactivation: 'reactivation', follow_up: 'nurture',
  }
  const sequenceId = sequenceMap[campaign.scriptTemplate] || 'qualification'
  const nextStep = await emailService.getNextDripStep(campaign.id, call.buyerId, sequenceId)
  if (!nextStep) { result.callsSkipped++; return }

  const replyEmail = process.env.SENDGRID_FROM_EMAIL || 'deals@dealflowai.app'
  const mergeData: Record<string, string> = {
    buyerName, agentName: campaign.agentName || 'Alex',
    companyName: campaign.companyName || campaign.profile?.company || 'our company',
    market: campaign.market, replyEmail,
  }

  const sendResult = await emailService.send(buyerEmail, nextStep.step.subject, nextStep.step.bodyHtml, mergeData)
  if (!sendResult.success) {
    result.callsFailed++
    result.errors.push(`Call ${call.id}: Email failed — ${sendResult.error}`)
    return
  }

  if (nextStep.stepIndex > 0) {
    await prisma.campaignCall.create({
      data: {
        campaignId: campaign.id, buyerId: call.buyerId, phoneNumber: call.phoneNumber,
        channel: 'email', messageId: sendResult.messageId, messageSent: true,
        startedAt: new Date(), endedAt: new Date(), attemptNumber: nextStep.stepIndex + 1,
        aiSummary: `Email drip step ${nextStep.stepIndex + 1} sent`,
      },
    })
  } else {
    await prisma.campaignCall.update({
      where: { id: call.id },
      data: {
        channel: 'email', messageId: sendResult.messageId, messageSent: true,
        startedAt: new Date(), endedAt: new Date(), attemptNumber: 1,
        aiSummary: 'Email drip step 1 sent',
      },
    })
  }

  result.callsInitiated++
  logger.info('Email sent', {
    route: 'campaign-executor', campaignId: campaign.id, callId: call.id,
    messageId: sendResult.messageId, stepIndex: nextStep.stepIndex,
  })
}

// ─── Execute Campaign Batch ─────────────────────────────────────────────────

export async function executeCampaignBatch(campaignId: string): Promise<ExecutionResult> {
  const result: ExecutionResult = {
    callsInitiated: 0,
    callsSkipped: 0,
    callsFailed: 0,
    errors: [],
    nextBatchAt: null,
  }

  try {
    // ── 1. Fetch campaign with profile ────────────────────────────────────
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        profile: {
          select: { id: true, company: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    if (!campaign) {
      result.errors.push('Campaign not found')
      return result
    }

    // ── 2. Verify campaign is RUNNING ─────────────────────────────────────
    if (campaign.status !== 'RUNNING') {
      logger.info('Campaign batch skipped — not in RUNNING state', {
        route: 'campaign-executor', campaignId, status: campaign.status,
      })
      return result
    }

    const channelType = campaign.channel // VOICE | SMS | EMAIL | MULTI_CHANNEL

    // ── 3. Count active outreach (in-progress entries) ──────────────────
    const activeCalls = await prisma.campaignCall.count({
      where: { campaignId, startedAt: { not: null }, endedAt: null },
    })

    // ── 4. Calculate available slots ──────────────────────────────────────
    const maxSlots = channelType === 'VOICE' ? campaign.maxConcurrentCalls : 50
    const availableSlots = maxSlots - activeCalls
    if (availableSlots <= 0) {
      logger.debug('Campaign batch skipped — max concurrent reached', {
        route: 'campaign-executor', campaignId, activeCalls, maxSlots,
      })
      return result
    }

    // ── 4a. Process due callbacks for this profile ─────────────────────
    try {
      await processDueCallbacks(campaign.profileId)
    } catch (err) {
      logger.warn('Callback processing failed, continuing with batch', {
        route: 'campaign-executor', campaignId,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // ── 5. Fetch pending entries ──────────────────────────────────────────
    const retryThreshold = new Date(Date.now() - campaign.retryDelayHours * 60 * 60 * 1000)

    const pendingOrConditions: any[] = [
      { outcome: null, startedAt: null },
    ]

    if (channelType === 'VOICE' || channelType === 'MULTI_CHANNEL') {
      pendingOrConditions.push(
        { outcome: 'NO_ANSWER', attemptNumber: { lt: campaign.maxRetries + 1 }, endedAt: { lt: retryThreshold } },
        { outcome: 'VOICEMAIL', attemptNumber: { lt: campaign.maxRetries + 1 }, endedAt: { lt: retryThreshold } },
      )
    }

    if (channelType === 'EMAIL') {
      pendingOrConditions.push({ channel: 'email', messageSent: true, endedAt: { not: null } })
    }

    let pendingCalls = await prisma.campaignCall.findMany({
      where: { campaignId, OR: pendingOrConditions },
      include: {
        buyer: {
          select: {
            id: true, firstName: true, lastName: true, entityName: true,
            phone: true, email: true, state: true,
            preferredMarkets: true, preferredTypes: true, strategy: true,
            aiInsight: true, lastContactedAt: true,
          },
        },
      },
      orderBy: [{ attemptNumber: 'asc' }, { createdAt: 'asc' }],
      take: availableSlots * 2, // Fetch extra so smart scheduling has room
    })

    if (pendingCalls.length === 0) {
      logger.info('Campaign batch — no pending entries', {
        route: 'campaign-executor', campaignId, channel: channelType,
      })
      return result
    }

    // ── 5a. Smart scheduling reorder ────────────────────────────────────
    if (campaign.useSmartScheduling) {
      try {
        const optimized = await optimizeSchedule(campaignId)
        if (optimized.length > 0) {
          const orderMap = new Map(optimized.map((o, i) => [o.callId, i]))
          pendingCalls.sort((a, b) => {
            const ia = orderMap.get(a.id) ?? 9999
            const ib = orderMap.get(b.id) ?? 9999
            return ia - ib
          })
          logger.info('Smart scheduling applied', {
            route: 'campaign-executor', campaignId,
            topReason: optimized[0]?.reason,
            reordered: optimized.filter(o => o.priority <= 3).length,
          })
        }
      } catch (err) {
        logger.warn('Smart scheduling failed, using FIFO', {
          route: 'campaign-executor', campaignId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Limit to available slots after reordering
    pendingCalls = pendingCalls.slice(0, availableSlots)

    // ── 6. Process each entry based on channel type ─────────────────────
    for (const call of pendingCalls) {
      try {
        let targetChannel: 'voice' | 'sms' | 'email' = 'voice'

        if (channelType === 'VOICE') targetChannel = 'voice'
        else if (channelType === 'SMS') targetChannel = 'sms'
        else if (channelType === 'EMAIL') targetChannel = 'email'
        else if (channelType === 'MULTI_CHANNEL') {
          const action = await getNextChannelAction(campaignId, call.buyerId)
          if (!action) { result.callsSkipped++; continue }
          if (action.scheduledFor && action.scheduledFor > new Date()) {
            result.callsSkipped++
            if (!result.nextBatchAt || action.scheduledFor.toISOString() < result.nextBatchAt) {
              result.nextBatchAt = action.scheduledFor.toISOString()
            }
            continue
          }
          if (action.action === 'mark_unresponsive') {
            await prisma.campaignCall.update({
              where: { id: call.id },
              data: { outcome: 'NO_ANSWER', endedAt: new Date(), aiSummary: 'All channels exhausted — buyer unresponsive' },
            })
            result.callsSkipped++
            continue
          }
          targetChannel = action.channel
        }

        // Dispatch to channel executor
        if (targetChannel === 'voice' || targetChannel === 'sms') {
          const phone = call.buyer.phone || call.phoneNumber
          const { normalized, blocked } = await runComplianceCheck(
            phone, targetChannel, campaign.profileId, call.id,
            call.buyer.state, campaignId, call.buyerId, result,
          )
          if (blocked) continue

          if (targetChannel === 'voice') {
            await executeVoiceCall(call, campaign, normalized!, result)
          } else {
            await executeSMSSend(call, campaign, normalized!, result)
          }
        } else {
          await executeEmailSend(call, campaign, result)
        }

      } catch (err) {
        result.callsFailed++
        const errMsg = err instanceof Error ? err.message : String(err)
        result.errors.push(`Call ${call.id}: ${errMsg}`)
        logger.error('Failed to execute outreach', {
          route: 'campaign-executor', campaignId, callId: call.id,
          channel: channelType, error: errMsg,
        })
      }
    }

    logger.info('Campaign batch completed', {
      route: 'campaign-executor', campaignId, channel: channelType,
      initiated: result.callsInitiated, skipped: result.callsSkipped, failed: result.callsFailed,
    })

    return result
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    result.errors.push(`Batch execution error: ${errMsg}`)
    logger.error('Campaign batch execution failed', {
      route: 'campaign-executor',
      campaignId,
      error: errMsg,
    })
    return result
  }
}

// ─── Trigger Next Batch (fire-and-forget) ───────────────────────────────────
// Called by the webhook handler after a call completes.
// This creates the self-sustaining execution loop.

export function triggerNextBatch(campaignId: string): void {
  executeCampaignBatch(campaignId).catch(err => {
    logger.error('triggerNextBatch failed', {
      route: 'campaign-executor',
      campaignId,
      error: err instanceof Error ? err.message : String(err),
    })
  })
}
