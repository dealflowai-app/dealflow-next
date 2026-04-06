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
 * Build the simplest possible HTML email — just line breaks, no styling.
 * Mimics what Gmail/Outlook generate when a person types an email.
 * This avoids Gmail categorizing it as promotional/updates.
 */
function buildPlainHtml(message: string): string {
  // Convert newlines to <br>, escape HTML entities
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<div dir="ltr">${escaped}</div>`
}

/**
 * POST /api/admin/email -- send a personal email to selected users
 */
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const body = await req.json()
  const { recipientIds, manualEmails, subject, message, fromName } = body as {
    recipientIds?: string[]
    manualEmails?: string[]
    subject: string
    message: string
    fromName?: string
  }

  const hasRecipients = (recipientIds?.length ?? 0) > 0 || (manualEmails?.length ?? 0) > 0

  if (!hasRecipients || !subject?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: 'At least one recipient, subject, and message are required' },
      { status: 400 },
    )
  }

  // Look up platform users by ID
  const dbRecipients = recipientIds?.length
    ? await prisma.profile.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
    : []

  const senderName = fromName?.trim() || 'Josh from DealFlow AI'
  const results: { email: string; success: boolean; error?: string }[] = []

  // Send to platform users (with firstName personalization)
  for (const recipient of dbRecipients) {
    const name = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ')
    const firstName = recipient.firstName || 'there'

    const personalizedMessage = message.replace(/\{\{firstName\}\}/g, firstName)
    const html = buildPlainHtml(personalizedMessage)
    const text = personalizedMessage

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

  // Send to manual email addresses
  for (const email of manualEmails ?? []) {
    const personalizedMessage = message.replace(/\{\{firstName\}\}/g, 'there')
    const html = buildPlainHtml(personalizedMessage)
    const text = personalizedMessage

    const result = await sendEmail({
      to: { email },
      from: { email: 'josh@dealflowai.app', name: senderName },
      subject,
      html,
      text,
      replyTo: { email: 'dealflow.aiteam@gmail.com', name: senderName },
    })

    results.push({
      email,
      success: result.success,
      error: result.error,
    })
  }

  const sent = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return NextResponse.json({ sent, failed, results })
}
