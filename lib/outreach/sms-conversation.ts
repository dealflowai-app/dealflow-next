// ─── SMS Conversation Service ──────────────────────────────────────────────
// Two-way SMS conversation threading. Manages conversation state, message
// classification, auto-replies, and mode switching (auto/manual/hybrid).
//
// All auto-replies include TCPA-compliant opt-out language.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getSMSClient, mergeTemplate } from './sms-service'
import { toE164 } from './bland-client'
import { processOptOut } from './opt-out'

// ─── Types ──────────────────────────────────────────────────────────────────

export type MessageClassification =
  | 'opt_out'
  | 'interested'
  | 'not_interested'
  | 'question'
  | 'callback_request'
  | 'address_response'
  | 'price_response'
  | 'other'

export type ConversationMode = 'auto' | 'manual' | 'hybrid'

export interface InboundMessageResult {
  conversationId: string
  messageId: string
  classification: MessageClassification
  autoReplied: boolean
  autoReplyText: string | null
  optedOut: boolean
}

export interface OutboundSendResult {
  messageId: string
  twilioSid: string | null
  success: boolean
  error?: string
}

export interface SMSQuickReply {
  id: string
  label: string
  body: string
  category: 'follow_up' | 'deal_info' | 'scheduling' | 'closing' | 'general'
}

// ─── Classification Keywords ────────────────────────────────────────────────

const STOP_KEYWORDS = new Set([
  'stop', 'unsubscribe', 'quit', 'cancel', 'end', 'opt out', 'optout',
  'remove', 'remove me', 'do not text', 'dont text', 'no more',
])

const INTERESTED_KEYWORDS = new Set([
  'yes', 'yeah', 'yep', 'yea', 'y', 'sure', 'ok', 'okay',
  'interested', 'send', 'send it', 'details', 'tell me more',
  'sounds good', 'lets talk', "let's talk", 'im in', "i'm in",
  'absolutely', 'for sure', 'definitely',
])

const NOT_INTERESTED_KEYWORDS = new Set([
  'no', 'nope', 'nah', 'pass', 'not interested', 'no thanks',
  'no thank you', 'not right now', 'not buying', 'no deals',
])

const CALLBACK_PATTERNS = [
  /call me/i, /give me a call/i, /call back/i, /callback/i,
  /can you call/i, /ring me/i, /phone me/i,
]

const QUESTION_PATTERNS = [
  /\?$/, /what .+\?/i, /how much/i, /where is/i, /when can/i,
  /who is/i, /can you/i, /do you have/i, /is there/i, /tell me about/i,
]

const ADDRESS_PATTERNS = [
  /\d{1,5}\s+[\w\s]+(?:st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|ct|court|way|pl|place)/i,
  /\d{5}(?:-\d{4})?/, // zip code
]

const PRICE_PATTERNS = [
  /\$[\d,]+/,
  /\d+k/i,
  /budget.{0,20}\d/i,
  /price.{0,20}\d/i,
  /range.{0,20}\d/i,
  /max.{0,20}\d/i,
  /min.{0,20}\d/i,
]

// ─── OPT-OUT FOOTER (TCPA compliance) ────────────────────────────────────

const OPT_OUT_FOOTER = '\n\nReply STOP to opt out.'

// ─── Classify Inbound Message ──────────────────────────────────────────────

export function classifyMessage(body: string): MessageClassification {
  const lower = body.trim().toLowerCase()

  // Check opt-out first (highest priority)
  if (STOP_KEYWORDS.has(lower)) return 'opt_out'
  const stopArr = Array.from(STOP_KEYWORDS)
  for (const kw of stopArr) {
    if (lower.includes(kw)) return 'opt_out'
  }

  // Not interested
  if (NOT_INTERESTED_KEYWORDS.has(lower)) return 'not_interested'

  // Interested / affirmative
  if (INTERESTED_KEYWORDS.has(lower)) return 'interested'

  // Callback request
  for (const pat of CALLBACK_PATTERNS) {
    if (pat.test(body)) return 'callback_request'
  }

  // Price response
  for (const pat of PRICE_PATTERNS) {
    if (pat.test(body)) return 'price_response'
  }

  // Address response
  for (const pat of ADDRESS_PATTERNS) {
    if (pat.test(body)) return 'address_response'
  }

  // Question
  for (const pat of QUESTION_PATTERNS) {
    if (pat.test(body)) return 'question'
  }

  return 'other'
}

// ─── Auto-Reply Templates ──────────────────────────────────────────────────

const AUTO_REPLIES: Record<string, string> = {
  interested:
    "Great to hear you're interested! I'll get you the details shortly. What areas are you currently buying in?",
  not_interested:
    "No problem at all. If things change, feel free to reach out anytime. We're always finding new deals.",
  question:
    "Good question! Let me look into that and get back to you shortly.",
  callback_request:
    "Absolutely — I'll give you a call soon. What time works best for you today?",
  address_response:
    "Got it, thanks! Let me pull up what I have in that area and I'll follow up shortly.",
  price_response:
    "Thanks for sharing your budget. Let me see what I have that fits and I'll send some options over.",
  other:
    "Thanks for your message! I'll review and get back to you shortly.",
}

// ─── Find or Create Conversation ───────────────────────────────────────────

export async function findOrCreateConversation(
  profileId: string,
  phone: string,
  opts?: { buyerId?: string; campaignId?: string },
): Promise<string> {
  // Try to find existing conversation
  const existing = await prisma.sMSConversation.findUnique({
    where: { profileId_phone: { profileId, phone } },
    select: { id: true },
  })

  if (existing) return existing.id

  // Find buyer by phone if not provided
  let buyerId = opts?.buyerId
  if (!buyerId) {
    const buyer = await prisma.cashBuyer.findFirst({
      where: { profileId, phone: { contains: phone.replace(/\D/g, '').slice(-10) } },
      select: { id: true },
    })
    if (buyer) buyerId = buyer.id
  }

  const convo = await prisma.sMSConversation.create({
    data: {
      profileId,
      buyerId: buyerId || null,
      phone,
      campaignId: opts?.campaignId || null,
    },
  })

  return convo.id
}

// ─── Record Inbound Message ────────────────────────────────────────────────

export async function handleInboundMessage(
  profileId: string,
  fromPhone: string,
  body: string,
  twilioSid?: string,
): Promise<InboundMessageResult> {
  const classification = classifyMessage(body)

  // Find or create conversation
  const conversationId = await findOrCreateConversation(profileId, fromPhone)

  // Get conversation mode
  const convo = await prisma.sMSConversation.findUnique({
    where: { id: conversationId },
    select: { mode: true, buyerId: true, campaignId: true },
  })
  const mode = (convo?.mode || 'auto') as ConversationMode

  // Save inbound message
  const msg = await prisma.sMSMessage.create({
    data: {
      conversationId,
      direction: 'inbound',
      from: fromPhone,
      to: process.env.TWILIO_PHONE_NUMBER || '',
      body,
      twilioSid: twilioSid || null,
      status: 'received',
      aiClassification: classification,
    },
  })

  // Update conversation snapshot
  await prisma.sMSConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageBody: body.slice(0, 200),
      lastMessageAt: new Date(),
      lastMessageDir: 'inbound',
      unreadCount: { increment: 1 },
      status: 'active',
    },
  })

  // Handle opt-out
  if (classification === 'opt_out') {
    await processOptOut(fromPhone, {
      reason: `SMS opt-out: "${body}"`,
      source: 'sms_stop',
      profileId,
    })

    // Send confirmation
    const optOutReply = "You've been removed. You won't receive further messages from us."
    await sendAutoReply(conversationId, fromPhone, optOutReply, msg.id)

    // Close the conversation
    await prisma.sMSConversation.update({
      where: { id: conversationId },
      data: { status: 'closed', mode: 'manual' },
    })

    return {
      conversationId,
      messageId: msg.id,
      classification,
      autoReplied: true,
      autoReplyText: optOutReply,
      optedOut: true,
    }
  }

  // Auto-reply if in auto or hybrid mode
  let autoReplied = false
  let autoReplyText: string | null = null

  if (mode === 'auto' || mode === 'hybrid') {
    autoReplyText = AUTO_REPLIES[classification] || AUTO_REPLIES.other
    autoReplyText += OPT_OUT_FOOTER

    await sendAutoReply(conversationId, fromPhone, autoReplyText, msg.id)
    autoReplied = true

    // Update the inbound message to mark it was auto-replied
    await prisma.sMSMessage.update({
      where: { id: msg.id },
      data: { aiAutoReplied: true },
    })

    // In hybrid mode, if it's a complex question or callback request, flag for manual review
    if (mode === 'hybrid' && (classification === 'question' || classification === 'callback_request' || classification === 'other')) {
      // Keep unread so wholesaler sees it
      logger.info('Hybrid mode: flagged for manual follow-up', {
        route: 'sms-conversation', conversationId, classification,
      })
    }
  }

  return {
    conversationId,
    messageId: msg.id,
    classification,
    autoReplied,
    autoReplyText,
    optedOut: false,
  }
}

// ─── Send Auto-Reply ───────────────────────────────────────────────────────

async function sendAutoReply(
  conversationId: string,
  toPhone: string,
  body: string,
  inReplyToId: string,
): Promise<void> {
  const smsClient = getSMSClient()
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || ''

  try {
    const result = await smsClient.sendSMS({ to: toE164(toPhone), body })

    await prisma.sMSMessage.create({
      data: {
        conversationId,
        direction: 'outbound',
        from: fromNumber,
        to: toPhone,
        body,
        sentBy: 'ai',
        twilioSid: result.messageId,
        status: result.success ? 'sent' : 'failed',
      },
    })

    // Update conversation snapshot
    await prisma.sMSConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageBody: body.slice(0, 200),
        lastMessageAt: new Date(),
        lastMessageDir: 'outbound',
      },
    })
  } catch (err) {
    logger.error('Auto-reply send failed', {
      route: 'sms-conversation', conversationId, inReplyToId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ─── Send Manual Message (wholesaler) ──────────────────────────────────────

export async function sendManualMessage(
  conversationId: string,
  body: string,
): Promise<OutboundSendResult> {
  const convo = await prisma.sMSConversation.findUnique({
    where: { id: conversationId },
    select: { phone: true, status: true },
  })

  if (!convo) {
    return { messageId: '', twilioSid: null, success: false, error: 'Conversation not found' }
  }
  if (convo.status === 'closed') {
    return { messageId: '', twilioSid: null, success: false, error: 'Conversation is closed (buyer opted out)' }
  }

  // Add opt-out footer to manual messages too (TCPA)
  const fullBody = body + OPT_OUT_FOOTER

  const smsClient = getSMSClient()
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || ''

  try {
    const result = await smsClient.sendSMS({ to: toE164(convo.phone), body: fullBody })

    const msg = await prisma.sMSMessage.create({
      data: {
        conversationId,
        direction: 'outbound',
        from: fromNumber,
        to: convo.phone,
        body: fullBody,
        sentBy: 'wholesaler',
        twilioSid: result.messageId,
        status: result.success ? 'sent' : 'failed',
      },
    })

    // Update conversation snapshot
    await prisma.sMSConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageBody: fullBody.slice(0, 200),
        lastMessageAt: new Date(),
        lastMessageDir: 'outbound',
      },
    })

    return {
      messageId: msg.id,
      twilioSid: result.messageId,
      success: result.success,
      error: result.success ? undefined : result.error,
    }
  } catch (err) {
    return {
      messageId: '',
      twilioSid: null,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Switch Conversation Mode ──────────────────────────────────────────────

export async function setConversationMode(
  conversationId: string,
  mode: ConversationMode,
): Promise<void> {
  await prisma.sMSConversation.update({
    where: { id: conversationId },
    data: { mode },
  })

  logger.info('Conversation mode changed', {
    route: 'sms-conversation', conversationId, mode,
  })
}

// ─── Mark Conversation Read ────────────────────────────────────────────────

export async function markConversationRead(conversationId: string): Promise<void> {
  await prisma.sMSConversation.update({
    where: { id: conversationId },
    data: { unreadCount: 0 },
  })
}

// ─── Record Outbound Campaign SMS in Thread ────────────────────────────────
// Called by campaign executor to thread outbound campaign messages.

export async function recordOutboundCampaignSMS(
  profileId: string,
  toPhone: string,
  body: string,
  twilioSid: string | null,
  opts?: { buyerId?: string; campaignId?: string },
): Promise<string> {
  const conversationId = await findOrCreateConversation(profileId, toPhone, opts)
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || ''

  await prisma.sMSMessage.create({
    data: {
      conversationId,
      direction: 'outbound',
      from: fromNumber,
      to: toPhone,
      body,
      sentBy: 'system',
      twilioSid,
      status: twilioSid ? 'sent' : 'failed',
    },
  })

  await prisma.sMSConversation.update({
    where: { id: conversationId },
    data: {
      lastMessageBody: body.slice(0, 200),
      lastMessageAt: new Date(),
      lastMessageDir: 'outbound',
      campaignId: opts?.campaignId || undefined,
    },
  })

  return conversationId
}

// ─── Quick Reply Templates ─────────────────────────────────────────────────

export const QUICK_REPLIES: SMSQuickReply[] = [
  {
    id: 'qr_interested_followup',
    label: 'Send Deal Details',
    category: 'deal_info',
    body: "Hi {{buyerName}}! Here are the details on that deal:\n\n{{dealAddress}}\nAsking: {{askingPrice}}\nARV: {{arv}}\n\nWant to schedule a walkthrough or make an offer?",
  },
  {
    id: 'qr_schedule_call',
    label: 'Schedule a Call',
    category: 'scheduling',
    body: "Hey {{buyerName}}, I'd love to chat about some deals that match your criteria. What time works best for a quick 5-minute call today?",
  },
  {
    id: 'qr_new_deal',
    label: 'New Deal Alert',
    category: 'deal_info',
    body: "Hey {{buyerName}}, just got a new property under contract that I think fits what you're looking for. It's a {{propertyType}} in {{market}}. Want the details?",
  },
  {
    id: 'qr_check_in',
    label: 'Check In',
    category: 'follow_up',
    body: "Hi {{buyerName}}, just checking in! Are you still actively looking for investment properties in {{market}}? I've got some fresh deals coming in this week.",
  },
  {
    id: 'qr_offer_followup',
    label: 'Offer Follow-Up',
    category: 'closing',
    body: "Hi {{buyerName}}, following up on that property at {{dealAddress}}. Any thoughts? The seller is looking to close quickly — happy to discuss terms if you're interested.",
  },
  {
    id: 'qr_thanks',
    label: 'Thank You',
    category: 'general',
    body: "Thanks for getting back to me, {{buyerName}}! I'll look into this and follow up with you shortly.",
  },
  {
    id: 'qr_proof_of_funds',
    label: 'Request POF',
    category: 'closing',
    body: "Great news, {{buyerName}}! Before we move forward, could you send over your proof of funds? This can be a bank statement, LOC letter, or hard money pre-approval.",
  },
  {
    id: 'qr_under_contract',
    label: 'Under Contract Update',
    category: 'closing',
    body: "Hi {{buyerName}}, just wanted to let you know that the property at {{dealAddress}} is now under contract. I'll keep you posted on similar deals as they come in!",
  },
]

export function mergeQuickReply(
  templateBody: string,
  data: Record<string, string>,
): string {
  return mergeTemplate(templateBody, data) + OPT_OUT_FOOTER
}
