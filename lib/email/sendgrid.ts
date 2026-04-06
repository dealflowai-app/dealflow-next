/**
 * SendGrid Email Client
 *
 * Centralized email sending service. Uses the SendGrid v3 API directly
 * via fetch (no SDK dependency). Falls back to console logging when
 * SENDGRID_API_KEY is not configured.
 */

export interface EmailRecipient {
  email: string
  name?: string
}

export interface EmailAttachment {
  content: string // base64-encoded
  filename: string
  type: string // MIME type e.g. 'application/pdf'
  disposition?: 'attachment' | 'inline'
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[]
  from?: EmailRecipient // Override default sender
  subject: string
  html: string
  text?: string
  replyTo?: EmailRecipient
  categories?: string[] // SendGrid categories for analytics
  attachments?: EmailAttachment[]
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

function getConfig() {
  return {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'deals@dealflowai.app',
    fromName: process.env.SENDGRID_FROM_NAME || 'DealFlow AI',
  }
}

export function isSendGridConfigured(): boolean {
  return !!process.env.SENDGRID_API_KEY
}

/**
 * Send an email via SendGrid. Falls back to console logging in dev.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = getConfig()

  // Normalize recipients to array
  const recipients = Array.isArray(options.to) ? options.to : [options.to]

  if (!config.apiKey) {
    console.error(
      `[SendGrid] Email send attempted but SENDGRID_API_KEY is not configured. To: ${recipients.map((r) => r.email).join(', ')} | Subject: ${options.subject}`,
    )
    return { success: false, error: 'Email provider not configured. Set SENDGRID_API_KEY.' }
  }

  try {
    const personalizations = recipients.map((r) => ({
      to: [{ email: r.email, ...(r.name ? { name: r.name } : {}) }],
    }))

    const body: Record<string, unknown> = {
      personalizations,
      from: options.from
        ? { email: options.from.email, ...(options.from.name ? { name: options.from.name } : {}) }
        : { email: config.fromEmail, name: config.fromName },
      subject: options.subject,
      content: [
        ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
        { type: 'text/html', value: options.html },
      ],
    }

    if (options.replyTo) {
      body.reply_to = {
        email: options.replyTo.email,
        ...(options.replyTo.name ? { name: options.replyTo.name } : {}),
      }
    }

    if (options.categories?.length) {
      body.categories = options.categories.slice(0, 10) // SendGrid max 10
    }

    if (options.attachments?.length) {
      body.attachments = options.attachments.map((a) => ({
        content: a.content,
        filename: a.filename,
        type: a.type,
        disposition: a.disposition || 'attachment',
      }))
    }

    const res = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[SendGrid Error] ${res.status}: ${text}`)
      return { success: false, error: text || `SendGrid returned ${res.status}` }
    }

    const messageId = res.headers.get('x-message-id') || `sg_${Date.now()}`
    return { success: true, messageId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SendGrid request failed'
    console.error(`[SendGrid Error]`, message)
    return { success: false, error: message }
  }
}

/**
 * Send to multiple recipients individually (each gets their own copy).
 * Includes rate limiting between batches.
 */
export async function sendEmailBatch(
  recipients: EmailRecipient[],
  buildEmail: (recipient: EmailRecipient) => Omit<SendEmailOptions, 'to'>,
  options?: { batchSize?: number; delayMs?: number },
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const batchSize = options?.batchSize ?? 10
  const delayMs = options?.delayMs ?? 200
  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    const results = await Promise.allSettled(
      batch.map(async (recipient) => {
        const emailOpts = buildEmail(recipient)
        return sendEmail({ ...emailOpts, to: recipient })
      }),
    )

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.success) {
        sent++
      } else {
        failed++
        const err =
          r.status === 'fulfilled' ? r.value.error : r.reason?.message || 'Unknown error'
        errors.push(err || 'Send failed')
      }
    }

    // Rate limit between batches
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return { sent, failed, errors }
}
