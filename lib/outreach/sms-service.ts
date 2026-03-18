// ─── SMS Service ────────────────────────────────────────────────────────────
// Twilio SMS integration for outreach campaigns.
// Falls back to mock when TWILIO_ACCOUNT_SID is not set.

import { logger } from '@/lib/logger'
import { withRetry, CircuitBreaker } from '@/lib/resilience'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SMSMessage {
  to: string                       // phone number (E.164)
  body: string                     // message text (max 1600 chars for multi-segment)
  mediaUrl?: string                // MMS image URL (optional)
}

export interface SMSSendResult {
  success: boolean
  messageId: string | null         // Twilio SID
  segments: number                 // how many SMS segments this used
  cost: number                     // estimated cost
  error?: string
}

export interface SMSTemplate {
  id: string
  name: string
  body: string                     // with {{merge_fields}}
  category: 'deal_alert' | 'qualification' | 'follow_up' | 'reactivation' | 'custom'
}

// ─── Segment Calculation ────────────────────────────────────────────────────

const GSM_CHARS = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1B !"#¤%&'()*+,\-.\/0-9:;<=>?¡A-ZÄÖÑÜa-zäöñüà§]*$/

function countSegments(text: string): number {
  const isGSM = GSM_CHARS.test(text)
  const charLimit = isGSM ? 160 : 70
  const multiPartLimit = isGSM ? 153 : 67 // UDH header reduces per-segment capacity
  if (text.length <= charLimit) return 1
  return Math.ceil(text.length / multiPartLimit)
}

// ─── Template Merge ─────────────────────────────────────────────────────────

export function mergeTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match // leave {{field}} visible if missing
  })
}

// ─── Pre-built SMS Templates ────────────────────────────────────────────────

export const SMS_TEMPLATES: SMSTemplate[] = [
  {
    id: 'deal_alert',
    name: 'Deal Alert',
    category: 'deal_alert',
    body: `Hi {{buyerName}}, this is {{agentName}} from {{companyName}}. I just locked up a {{propertyType}} at {{dealAddress}} — asking {{askingPrice}}, ARV {{arv}}. Fits your buy box. Interested? Reply YES for the full breakdown or STOP to opt out.`,
  },
  {
    id: 'qualification',
    name: 'Buyer Qualification',
    category: 'qualification',
    body: `Hi {{buyerName}}, {{agentName}} from {{companyName}} here. We source off-market deals in {{market}} for cash buyers. Are you still actively looking for investment properties? Reply YES if interested, STOP to opt out.`,
  },
  {
    id: 'follow_up',
    name: 'Follow Up',
    category: 'follow_up',
    body: `Hey {{buyerName}}, following up from our conversation. I have a few new properties that match what you're looking for in {{market}}. Want me to send details? Reply YES or STOP to opt out.`,
  },
  {
    id: 'reactivation',
    name: 'Reactivation',
    category: 'reactivation',
    body: `Hi {{buyerName}}, it's been a while! {{agentName}} from {{companyName}}. We have fresh {{market}} deals — are you still buying? Reply YES to reconnect or STOP to opt out.`,
  },
]

// ─── Circuit Breaker ────────────────────────────────────────────────────────

const twilioCircuit = new CircuitBreaker({
  label: 'twilio-sms',
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
})

// ─── Twilio SMS Client ──────────────────────────────────────────────────────

const COST_PER_SEGMENT = 0.0079 // Twilio US outbound SMS cost estimate

class TwilioSMSClient {
  private accountSid: string
  private authToken: string
  private fromNumber: string

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid
    this.authToken = authToken
    this.fromNumber = fromNumber
  }

  private authHeader(): string {
    return 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
  }

  async sendSMS(message: SMSMessage): Promise<SMSSendResult> {
    const segments = countSegments(message.body)

    return twilioCircuit.execute(() =>
      withRetry(
        async () => {
          const params = new URLSearchParams({
            To: message.to,
            From: this.fromNumber,
            Body: message.body,
          })
          if (message.mediaUrl) {
            params.append('MediaUrl', message.mediaUrl)
          }

          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: this.authHeader(),
              },
              body: params,
            },
          )

          const data = await res.json()

          if (!res.ok) {
            throw new Error(`Twilio error ${res.status}: ${data.message || 'Send failed'}`)
          }

          return {
            success: true,
            messageId: data.sid as string,
            segments,
            cost: segments * COST_PER_SEGMENT,
          }
        },
        { maxRetries: 1, baseDelayMs: 2000, label: 'twilio-send-sms' },
      ),
    )
  }

  async getMessageStatus(messageId: string): Promise<string> {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${messageId}.json`,
      { headers: { Authorization: this.authHeader() } },
    )
    if (!res.ok) return 'unknown'
    const data = await res.json()
    return data.status || 'unknown'
  }
}

// ─── Mock Client ────────────────────────────────────────────────────────────

class MockSMSClient {
  async sendSMS(message: SMSMessage): Promise<SMSSendResult> {
    const segments = countSegments(message.body)
    const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    logger.info('[MOCK SMS] Message sent', {
      route: 'sms-mock',
      to: message.to,
      segments,
      messageId,
      bodyPreview: message.body.slice(0, 80),
    })
    return {
      success: true,
      messageId,
      segments,
      cost: segments * COST_PER_SEGMENT,
    }
  }

  async getMessageStatus(_messageId: string): Promise<string> {
    return 'delivered'
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

type ISMSClient = TwilioSMSClient | MockSMSClient

let _smsClient: ISMSClient | null = null

export function getSMSClient(): ISMSClient {
  if (_smsClient) return _smsClient

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (accountSid && authToken && fromNumber) {
    _smsClient = new TwilioSMSClient(accountSid, authToken, fromNumber)
    logger.info('Twilio SMS client initialized (live mode)')
  } else {
    _smsClient = new MockSMSClient()
    logger.info('Twilio SMS client initialized (mock mode — TWILIO_ACCOUNT_SID not set)')
  }

  return _smsClient
}

// ─── Bulk Send ──────────────────────────────────────────────────────────────

export async function sendBulkSMS(
  messages: SMSMessage[],
  batchSize = 20,
): Promise<SMSSendResult[]> {
  const client = getSMSClient()
  const results: SMSSendResult[] = []

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize)

    const batchResults = await Promise.allSettled(
      batch.map(msg => client.sendSMS(msg)),
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value)
      } else {
        results.push({
          success: false,
          messageId: null,
          segments: 0,
          cost: 0,
          error: r.reason?.message || 'Send failed',
        })
      }
    }

    // Rate limit: 1-second delay between batches
    if (i + batchSize < messages.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

// ─── Twilio Signature Validation ────────────────────────────────────────────

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return false

  // Build the data string: URL + sorted params
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }

  const crypto = require('crypto')
  const expected = crypto
    .createHmac('sha1', authToken)
    .update(data, 'utf-8')
    .digest('base64')

  return signature === expected
}
