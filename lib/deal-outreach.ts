/**
 * Deal Blast Outreach Service
 *
 * Pluggable provider pattern for sending deal details to matched buyers
 * via SMS (Twilio) and email (SendGrid). Falls back to mock providers
 * when API keys are not configured.
 */

import { formatDealBlastEmail } from '@/lib/emails'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface OutreachProvider {
  sendSMS(to: string, message: string): Promise<SendResult>
  sendEmail(to: string, subject: string, html: string): Promise<SendResult>
}

export interface DealForOutreach {
  id: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  beds: number | null
  baths: number | null
  sqft: number | null
  yearBuilt: number | null
  condition: string | null
  askingPrice: number
  arv: number | null
  repairCost: number | null
  assignFee: number | null
  flipProfit: number | null
}

export interface BuyerForOutreach {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  phone: string | null
  email: string | null
}

export type OutreachChannel = 'sms' | 'email'

export interface OutreachResult {
  buyerId: string
  sms?: SendResult
  email?: SendResult
}

/* ═══════════════════════════════════════════════
   UNCONFIGURED PROVIDER (fails loudly)
   ═══════════════════════════════════════════════ */

const unconfiguredProvider: OutreachProvider = {
  async sendSMS() {
    console.error('[OUTREACH] SMS send attempted but Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.')
    return { success: false, error: 'SMS provider not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.' }
  },
  async sendEmail() {
    console.error('[OUTREACH] Email send attempted but SendGrid is not configured. Set SENDGRID_API_KEY.')
    return { success: false, error: 'Email provider not configured. Set SENDGRID_API_KEY.' }
  },
}

/* ═══════════════════════════════════════════════
   TWILIO SMS PROVIDER
   ═══════════════════════════════════════════════ */

function createTwilioProvider(): OutreachProvider['sendSMS'] {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const fromNumber = process.env.TWILIO_PHONE_NUMBER!

  return async (to: string, message: string): Promise<SendResult> => {
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          },
          body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
        },
      )
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.message || 'Twilio send failed' }
      return { success: true, messageId: data.sid }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Twilio error' }
    }
  }
}

/* ═══════════════════════════════════════════════
   SENDGRID EMAIL PROVIDER
   ═══════════════════════════════════════════════ */

function createSendGridProvider(): OutreachProvider['sendEmail'] {
  const apiKey = process.env.SENDGRID_API_KEY!
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'deals@dealflowai.app'
  const fromName = process.env.SENDGRID_FROM_NAME || 'DealFlow AI'

  return async (to: string, subject: string, html: string): Promise<SendResult> => {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: text || 'SendGrid send failed' }
      }
      const messageId = res.headers.get('x-message-id') || `sg_${Date.now()}`
      return { success: true, messageId }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'SendGrid error' }
    }
  }
}

/* ═══════════════════════════════════════════════
   PROVIDER SELECTION
   ═══════════════════════════════════════════════ */

const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)
const hasSendGrid = !!process.env.SENDGRID_API_KEY

const provider: OutreachProvider = {
  sendSMS: hasTwilio ? createTwilioProvider() : unconfiguredProvider.sendSMS,
  sendEmail: hasSendGrid ? createSendGridProvider() : unconfiguredProvider.sendEmail,
}

export function getEmailSender(): OutreachProvider['sendEmail'] {
  return provider.sendEmail
}

/* ═══════════════════════════════════════════════
   MESSAGE FORMATTERS
   ═══════════════════════════════════════════════ */

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return 'N/A'
  return '$' + n.toLocaleString()
}

const typeLabels: Record<string, string> = {
  SFR: 'SFR', MULTI_FAMILY: 'Multi-Family', CONDO: 'Condo',
  LAND: 'Land', COMMERCIAL: 'Commercial', MOBILE_HOME: 'Mobile Home',
}

export function formatDealSMS(deal: DealForOutreach): string {
  const parts = [
    `New Deal: ${deal.address}, ${deal.city} ${deal.state} ${deal.zip}`,
    `${typeLabels[deal.propertyType] || deal.propertyType}`,
  ]
  if (deal.beds != null || deal.baths != null) {
    parts.push(`${deal.beds ?? '?'}bd/${deal.baths ?? '?'}ba`)
  }
  parts.push(`Asking ${fmtCurrency(deal.askingPrice)}`)
  if (deal.arv != null) parts.push(`ARV ${fmtCurrency(deal.arv)}`)
  if (deal.arv != null) {
    const spread = deal.arv - deal.askingPrice
    parts.push(`Spread ${fmtCurrency(spread)}`)
  }
  parts.push('Reply YES for details')
  return parts.join(' | ')
}

export function formatDealEmail(deal: DealForOutreach, buyer: BuyerForOutreach, matchScore: number): string {
  return formatDealBlastEmail(deal, buyer, matchScore)
}

/* ═══════════════════════════════════════════════
   MAIN SEND FUNCTION
   ═══════════════════════════════════════════════ */

export async function sendDealToBuyer(
  deal: DealForOutreach,
  buyer: BuyerForOutreach,
  matchScore: number,
  options?: { channels?: OutreachChannel[] },
): Promise<OutreachResult> {
  const channels = options?.channels || ['sms', 'email']
  const result: OutreachResult = { buyerId: buyer.id }

  if (channels.includes('sms') && buyer.phone) {
    result.sms = await provider.sendSMS(buyer.phone, formatDealSMS(deal))
  }

  if (channels.includes('email') && buyer.email) {
    const subject = `New Deal: ${deal.address}, ${deal.city} ${deal.state}`
    result.email = await provider.sendEmail(
      buyer.email,
      subject,
      formatDealEmail(deal, buyer, matchScore),
    )
  }

  return result
}

/* ═══════════════════════════════════════════════
   BATCH SEND (with rate limiting)
   ═══════════════════════════════════════════════ */

export async function sendDealToBuyersBatch(
  deal: DealForOutreach,
  buyers: { buyer: BuyerForOutreach; matchScore: number }[],
  options?: { channels?: OutreachChannel[]; batchSize?: number; delayMs?: number },
): Promise<OutreachResult[]> {
  const batchSize = options?.batchSize ?? 10
  const delayMs = options?.delayMs ?? 500
  const results: OutreachResult[] = []

  for (let i = 0; i < buyers.length; i += batchSize) {
    const batch = buyers.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map(({ buyer, matchScore }) =>
        sendDealToBuyer(deal, buyer, matchScore, options),
      ),
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value)
      } else {
        results.push({ buyerId: 'unknown', sms: { success: false, error: r.reason?.message } })
      }
    }

    if (i + batchSize < buyers.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}
