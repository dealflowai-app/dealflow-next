/**
 * Deal Blast Outreach Service
 *
 * Pluggable provider pattern for sending deal details to matched buyers
 * via SMS (Twilio) and email (SendGrid). Falls back to mock providers
 * when API keys are not configured.
 */

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
   MOCK PROVIDER
   ═══════════════════════════════════════════════ */

const mockProvider: OutreachProvider = {
  async sendSMS(to, message) {
    console.log(`[MOCK SMS] To: ${to} | Message: ${message.slice(0, 120)}...`)
    return { success: true, messageId: `mock_sms_${Date.now()}` }
  },
  async sendEmail(to, subject, html) {
    console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | HTML length: ${html.length}`)
    return { success: true, messageId: `mock_email_${Date.now()}` }
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
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'deals@dealflowai.com'

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
          from: { email: fromEmail, name: 'DealFlow AI' },
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
  sendSMS: hasTwilio ? createTwilioProvider() : mockProvider.sendSMS,
  sendEmail: hasSendGrid ? createSendGridProvider() : mockProvider.sendEmail,
}

/* ═══════════════════════════════════════════════
   MESSAGE FORMATTERS
   ═══════════════════════════════════════════════ */

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return 'N/A'
  return '$' + n.toLocaleString()
}

function buyerDisplayName(b: BuyerForOutreach): string {
  return [b.firstName, b.lastName].filter(Boolean).join(' ') || b.entityName || 'Investor'
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
  const spread = deal.arv != null ? deal.arv - deal.askingPrice : null
  const typeLabel = typeLabels[deal.propertyType] || deal.propertyType
  const name = buyerDisplayName(buyer)

  const scoreBg = matchScore >= 80 ? '#ecfdf5' : matchScore >= 60 ? '#eff6ff' : '#fffbeb'
  const scoreColor = matchScore >= 80 ? '#059669' : matchScore >= 60 ? '#2563eb' : '#d97706'
  const scoreBorder = matchScore >= 80 ? '#a7f3d0' : matchScore >= 60 ? '#bfdbfe' : '#fde68a'

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

<!-- Header -->
<tr><td style="background:#0B1224;padding:24px 32px;">
  <table width="100%"><tr>
    <td style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.01em;">DealFlow AI</td>
    <td align="right" style="background:${scoreBg};color:${scoreColor};border:1px solid ${scoreBorder};border-radius:20px;padding:4px 14px;font-size:13px;font-weight:700;">${matchScore}% Match</td>
  </tr></table>
</td></tr>

<!-- Greeting -->
<tr><td style="padding:28px 32px 0;">
  <p style="margin:0 0 4px;font-size:15px;color:#374151;">Hi ${name},</p>
  <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">A new deal matching your buy criteria is available:</p>
</td></tr>

<!-- Property Card -->
<tr><td style="padding:20px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#0B1224;">${deal.address}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;">${deal.city}, ${deal.state} ${deal.zip} · ${typeLabel}</p>

      <!-- Property details -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          ${deal.beds != null ? `<td style="font-size:13px;color:#6b7280;padding:2px 0;"><strong style="color:#374151;">${deal.beds}</strong> Beds</td>` : ''}
          ${deal.baths != null ? `<td style="font-size:13px;color:#6b7280;padding:2px 0;"><strong style="color:#374151;">${deal.baths}</strong> Baths</td>` : ''}
          ${deal.sqft != null ? `<td style="font-size:13px;color:#6b7280;padding:2px 0;"><strong style="color:#374151;">${deal.sqft.toLocaleString()}</strong> sqft</td>` : ''}
          ${deal.yearBuilt != null ? `<td style="font-size:13px;color:#6b7280;padding:2px 0;">Built <strong style="color:#374151;">${deal.yearBuilt}</strong></td>` : ''}
        </tr>
      </table>

      <!-- Financials -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;padding-top:12px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Asking Price</td>
          <td align="right" style="padding:6px 0;font-size:14px;font-weight:600;color:#0B1224;">${fmtCurrency(deal.askingPrice)}</td>
        </tr>
        ${deal.arv != null ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">ARV</td>
          <td align="right" style="padding:6px 0;font-size:14px;font-weight:600;color:#0B1224;">${fmtCurrency(deal.arv)}</td>
        </tr>` : ''}
        ${spread != null ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Spread</td>
          <td align="right" style="padding:6px 0;font-size:14px;font-weight:700;color:#059669;">${fmtCurrency(spread)}</td>
        </tr>` : ''}
        ${deal.repairCost != null ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Est. Repair</td>
          <td align="right" style="padding:6px 0;font-size:14px;font-weight:600;color:#0B1224;">${fmtCurrency(deal.repairCost)}</td>
        </tr>` : ''}
        ${deal.flipProfit != null ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Flip Profit</td>
          <td align="right" style="padding:6px 0;font-size:14px;font-weight:700;color:#059669;">${fmtCurrency(deal.flipProfit)}</td>
        </tr>` : ''}
        ${deal.assignFee != null ? `<tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Assignment Fee</td>
          <td align="right" style="padding:6px 0;font-size:14px;font-weight:600;color:#2563eb;">${fmtCurrency(deal.assignFee)}</td>
        </tr>` : ''}
      </table>
    </td></tr>
  </table>
</td></tr>

<!-- CTA -->
<tr><td align="center" style="padding:8px 32px 28px;">
  <a href="#" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">View Deal Details</a>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.5;">
    Sent by DealFlow AI · You're receiving this because you match the deal criteria.<br>
    <a href="#" style="color:#9ca3af;">Unsubscribe</a> · <a href="#" style="color:#9ca3af;">Manage preferences</a>
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`
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
        // Should rarely happen since sendDealToBuyer handles errors internally
        results.push({ buyerId: 'unknown', sms: { success: false, error: r.reason?.message } })
      }
    }

    // Rate limit delay between batches (skip after last batch)
    if (i + batchSize < buyers.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}
