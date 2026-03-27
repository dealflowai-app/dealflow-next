import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sendEmail, isSendGridConfigured } from '@/lib/email'
import {
  formatWelcomeEmail,
  formatInquiryEmail,
  formatOfferEmail,
  formatCampaignReportEmail,
  formatDealMatchEmail,
} from '@/lib/emails'
import { logger } from '@/lib/logger'
import type {
  WelcomeEmailData,
  InquiryEmailData,
  OfferEmailData,
  CampaignReportData,
  DealMatchEmailData,
} from '@/lib/emails'

// ─── POST /api/email/send ───────────────────────────────────────────────────
// Send an email using a named template. Auth required.
//
// Body: { template: string, data: Record<string, unknown>, to?: { email, name } }
//
// Templates: 'welcome', 'inquiry', 'offer', 'campaign-report', 'deal-match'

type TemplateResult = { subject: string; html: string; text?: string }

function buildFromTemplate(
  template: string,
  data: Record<string, unknown>,
): TemplateResult | null {
  switch (template) {
    case 'welcome':
      return formatWelcomeEmail(data as unknown as WelcomeEmailData)
    case 'inquiry':
      return formatInquiryEmail(data as unknown as InquiryEmailData)
    case 'offer':
      return formatOfferEmail(data as unknown as OfferEmailData)
    case 'campaign-report':
      return formatCampaignReportEmail(data as unknown as CampaignReportData)
    case 'deal-match':
      return formatDealMatchEmail(data as unknown as DealMatchEmailData)
    default:
      return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Rate limit: 10 emails per minute per user
    const rl = rateLimit(`email-send:${profile.id}`, 10, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { template, data, to } = body as {
      template?: string
      data?: Record<string, unknown>
      to?: { email: string; name?: string }
    }

    if (!template || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: template, data' },
        { status: 400 },
      )
    }

    const emailContent = buildFromTemplate(template, data)
    if (!emailContent) {
      return NextResponse.json(
        { error: `Unknown template: ${template}. Available: welcome, inquiry, offer, campaign-report, deal-match` },
        { status: 400 },
      )
    }

    // Default recipient is the requesting user
    const recipient = to || { email: profile.email, name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || undefined }

    if (!recipient.email) {
      return NextResponse.json({ error: 'No recipient email provided' }, { status: 400 })
    }

    const result = await sendEmail({
      to: recipient,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      categories: [`template:${template}`],
    })

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      configured: isSendGridConfigured(),
      ...(result.error ? { error: result.error } : {}),
    })
  } catch (err) {
    logger.error('POST /api/email/send error', { route: '/api/email/send', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to send email', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── GET /api/email/send ────────────────────────────────────────────────────
// Check if SendGrid is configured. Auth required.

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    return NextResponse.json({
      configured: isSendGridConfigured(),
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'deals@dealflowai.app',
    })
  } catch (err) {
    logger.error('GET /api/email/send error', { route: '/api/email/send', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
