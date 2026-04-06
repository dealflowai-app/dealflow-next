import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendgrid'

/**
 * GET /api/admin/email -- fetch all users (for recipient picker)
 */
export async function GET() {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const users = await prisma.profile.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      tier: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ users })
}

/**
 * Build a plain, personal-looking HTML email (no branding, no images).
 * Gmail sorts these into Primary instead of Updates/Promotions.
 */
function buildPlainHtml(message: string): string {
  const paragraphs = message
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return '<br>'
      return `<p style="margin:0 0 8px;line-height:1.6;">${trimmed}</p>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;">
${paragraphs}
</body></html>`
}

/**
 * POST /api/admin/email -- send a personal email to selected users
 */
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const body = await req.json()
  const { recipientIds, subject, message, fromName } = body as {
    recipientIds: string[]
    subject: string
    message: string
    fromName?: string
  }

  if (!recipientIds?.length || !subject?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: 'recipientIds, subject, and message are required' },
      { status: 400 },
    )
  }

  const recipients = await prisma.profile.findMany({
    where: { id: { in: recipientIds } },
    select: { id: true, email: true, firstName: true, lastName: true },
  })

  if (!recipients.length) {
    return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 })
  }

  const results: { email: string; success: boolean; error?: string }[] = []

  for (const recipient of recipients) {
    const name = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ')
    const firstName = recipient.firstName || 'there'

    const personalizedMessage = message.replace(/\{\{firstName\}\}/g, firstName)
    const html = buildPlainHtml(personalizedMessage)
    const text = personalizedMessage

    const senderName = fromName?.trim() || 'Josh from DealFlow AI'

    const result = await sendEmail({
      to: { email: recipient.email, name: name || undefined },
      from: { email: 'josh@dealflowai.app', name: senderName },
      subject,
      html,
      text,
      replyTo: { email: 'dealflow.aiteam@gmail.com', name: senderName },
    })

    results.push({
      email: recipient.email,
      success: result.success,
      error: result.error,
    })
  }

  const sent = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return NextResponse.json({ sent, failed, results })
}
