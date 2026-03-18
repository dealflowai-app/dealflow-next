// ─── Inbound Call Routing Service ────────────────────────────────────────────
// Determines how to handle an inbound call: route to AI, forward to wholesaler,
// send to voicemail, or reject. Generates contextual AI scripts for known callers.

import { logger } from '@/lib/logger'
import { identifyCaller, type CallerIdentification } from './caller-id'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoutingDecision {
  action: 'ai_answer' | 'forward_to_wholesaler' | 'voicemail' | 'reject'
  aiScript?: string
  forwardNumber?: string
  voicemailGreeting?: string
  reason: string
  callerInfo: CallerIdentification
}

export interface InboundRoutingConfig {
  autoAnswer: boolean               // should AI answer calls from known buyers?
  forwardNumber: string | null      // wholesaler's personal phone
  forwardAfterRings: number         // rings before forwarding (0 = immediate)
  forwardOnlyDuring: {
    start: string                   // "09:00"
    end: string                     // "18:00"
    timezone: string
  } | null
  aiAnswerUnknown: boolean          // AI answer unknown callers?
  sendToVoicemailWhen: 'never' | 'after_hours' | 'unknown_callers' | 'always'
  companyName: string
  agentName: string
}

const TWO_PARTY_CONSENT_STATES = new Set([
  'CA', 'CT', 'FL', 'IL', 'MD', 'MA', 'MI', 'MT', 'NV', 'NH', 'OR', 'PA', 'WA',
])

export const DEFAULT_INBOUND_CONFIG: InboundRoutingConfig = {
  autoAnswer: false,
  forwardNumber: null,
  forwardAfterRings: 4,
  forwardOnlyDuring: { start: '09:00', end: '18:00', timezone: 'America/New_York' },
  aiAnswerUnknown: false,
  sendToVoicemailWhen: 'after_hours',
  companyName: 'our company',
  agentName: 'Alex',
}

// ─── Route Inbound Call ─────────────────────────────────────────────────────

export async function routeInboundCall(
  phone: string,
  profileId: string,
  config: InboundRoutingConfig,
): Promise<RoutingDecision> {
  const callerInfo = await identifyCaller(phone, profileId)
  const withinHours = isWithinForwardHours(config)

  // 1. Known buyer with scheduled callback → AI answer with callback context
  if (callerInfo.identified && callerInfo.scheduledCallback && config.autoAnswer) {
    return {
      action: 'ai_answer',
      aiScript: generateInboundScript(callerInfo, config, callerInfo.buyer?.status === 'ACTIVE' ? callerInfo.buyer?.markets[0] : undefined),
      reason: 'Known buyer with scheduled callback — AI answering',
      callerInfo,
    }
  }

  // 2. Known buyer + auto-answer enabled → AI answer with context
  if (callerInfo.identified && config.autoAnswer) {
    return {
      action: 'ai_answer',
      aiScript: generateInboundScript(callerInfo, config),
      reason: 'Known buyer — AI answering with context',
      callerInfo,
    }
  }

  // 3. Known buyer + forward number + within hours → forward to wholesaler
  if (callerInfo.identified && config.forwardNumber && withinHours) {
    return {
      action: 'forward_to_wholesaler',
      forwardNumber: config.forwardNumber,
      reason: 'Known buyer — forwarding to wholesaler',
      callerInfo,
    }
  }

  // 4. Known buyer + no forward + no AI → voicemail
  if (callerInfo.identified && !config.autoAnswer && !config.forwardNumber) {
    return {
      action: 'voicemail',
      voicemailGreeting: `Thank you for calling ${config.companyName}. We're not available right now but we see you called. We'll reach back out shortly. Please leave a message after the beep.`,
      reason: 'Known buyer — no AI or forwarding configured',
      callerInfo,
    }
  }

  // 5. Unknown caller + AI answer unknown enabled → AI qualification
  if (!callerInfo.identified && config.aiAnswerUnknown) {
    return {
      action: 'ai_answer',
      aiScript: generateUnknownCallerScript(config),
      reason: 'Unknown caller — AI answering for qualification',
      callerInfo,
    }
  }

  // 6. Unknown caller + forward within hours
  if (!callerInfo.identified && config.forwardNumber && withinHours) {
    return {
      action: 'forward_to_wholesaler',
      forwardNumber: config.forwardNumber,
      reason: 'Unknown caller — forwarding to wholesaler',
      callerInfo,
    }
  }

  // 7. After hours with forward configured but outside hours
  if (config.forwardNumber && !withinHours) {
    if (config.autoAnswer) {
      return {
        action: 'ai_answer',
        aiScript: callerInfo.identified
          ? generateInboundScript(callerInfo, config)
          : generateUnknownCallerScript(config),
        reason: 'After hours — AI answering',
        callerInfo,
      }
    }
    return {
      action: 'voicemail',
      voicemailGreeting: `Thank you for calling ${config.companyName}. We're currently outside business hours. Please leave a message and we'll get back to you.`,
      reason: 'After hours — voicemail',
      callerInfo,
    }
  }

  // 8. Default: voicemail
  return {
    action: 'voicemail',
    voicemailGreeting: `Thank you for calling ${config.companyName}. We're not available right now. Please leave a message after the beep.`,
    reason: 'Default — voicemail',
    callerInfo,
  }
}

// ─── Time Window Check ──────────────────────────────────────────────────────

function isWithinForwardHours(config: InboundRoutingConfig): boolean {
  if (!config.forwardOnlyDuring) return true // no restriction = always within hours

  const { start, end, timezone } = config.forwardOnlyDuring
  try {
    const now = new Date()
    const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: false, timeZone: timezone })
    const parts = fmt.formatToParts(now)
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    const currentMinutes = hour * 60 + minute

    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes
  } catch {
    return true // if timezone parsing fails, assume within hours
  }
}

// ─── Inbound Script Generation ──────────────────────────────────────────────

export function generateInboundScript(
  callerInfo: CallerIdentification,
  config: { companyName: string; agentName: string },
  market?: string,
): string {
  const buyer = callerInfo.buyer!
  const state = market ? undefined : buyer.markets[0] // for consent check
  const needsDisclosure = state ? TWO_PARTY_CONSENT_STATES.has(state.toUpperCase()) : false

  const lines: string[] = [
    `You are ${config.agentName} answering the phone for ${config.companyName}. A buyer named ${buyer.name} is calling you back.`,
    '',
    `CONTEXT: ${callerInfo.context}`,
    '',
    `GREETING: "Hey ${buyer.name}! Thanks for calling back. This is ${config.agentName} from ${config.companyName}."`,
  ]

  if (needsDisclosure) {
    lines.push('', 'RECORDING DISCLOSURE: "Just so you know, this call may be recorded for quality purposes."')
  }

  if (callerInfo.scheduledCallback) {
    lines.push('', `This buyer had a scheduled callback. Acknowledge it: "I'm glad you called — I had you down for a callback. ${callerInfo.scheduledCallback.reason}"`)
  }

  if (callerInfo.previousCalls.length > 0) {
    const last = callerInfo.previousCalls[0]
    if (last.aiSummary) {
      lines.push('', `Last call summary: "${last.aiSummary}". Reference this naturally to show you remember them.`)
    }
  }

  if (callerInfo.matchedDeals.length > 0) {
    lines.push(
      '',
      `You have ${callerInfo.matchedDeals.length} deal(s) matching their criteria. Lead with the best match:`,
    )
    const best = callerInfo.matchedDeals[0]
    lines.push(`- ${best.address}, ${best.city}: ${best.propertyType}, asking $${(best.askingPrice / 1000).toFixed(0)}K, ${best.matchScore}% match to their buy box.`)
    lines.push('Pitch this deal naturally: "I actually have a property right now that fits exactly what you told me. Want me to run through the details?"')
  } else {
    lines.push(
      '',
      `No deals currently match their criteria. Instead, update their preferences:`,
      '"I wanted to check in and see if your criteria have changed at all. Are you still looking for the same types of properties?"',
      'Run through qualification: property types, price range, markets, strategy, close speed.',
    )
  }

  lines.push(
    '',
    'GOAL: Qualify the buyer, pitch matching deals if available, or update their buy box preferences. Be warm and appreciative that they called back.',
    'Keep the conversation natural and casual, like a real wholesaler. Do not sound scripted.',
  )

  return lines.join('\n')
}

export function generateUnknownCallerScript(
  config: { companyName: string; agentName: string },
): string {
  return [
    `You are ${config.agentName} answering the phone for ${config.companyName}, a real estate investment company.`,
    '',
    `GREETING: "Hello, thanks for calling ${config.companyName}. This is ${config.agentName}, how can I help you?"`,
    '',
    'RECORDING DISCLOSURE: "Just so you know, this call may be recorded."',
    '',
    'If they are calling about a specific deal or property:',
    '- Take down the details: address, what they heard, their interest level',
    '- Ask for their name, phone, email',
    '- Let them know someone will follow up with full details',
    '',
    'If they are a buyer or investor:',
    '- Run qualification: What types of properties? Price range? Which markets? Flip or hold? How fast can you close?',
    `- "We source off-market deals for cash buyers in the area. Would you like to be on our priority buyers list?"`,
    '- Get their name, email, preferred contact method',
    '',
    'If they are a seller or unclear intent:',
    `- Explain: "${config.companyName} works with real estate investors. We source off-market deals."`,
    '- If they have a property to sell: take the address, condition, asking price, and timeline',
    '- Let them know someone will review and follow up',
    '',
    'Always be professional, friendly, and helpful. You do not know who is calling so be adaptable.',
    'Keep responses concise and natural-sounding.',
  ].join('\n')
}
