import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendgrid'
import {
  wrapInEmailTemplate,
  emailHeading,
  emailText,
  emailButton,
  emailDivider,
} from '@/lib/emails/template'

/**
 * GET /api/admin/email — fetch all users (for recipient picker)
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
 * POST /api/admin/email — send an email to selected users
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

  // Build the HTML email using the branded template
  const paragraphs = message
    .split('\n')
    .filter((line: string) => line.trim())
    .map((line: string) => emailText(line))
    .join('')

  const bodyHtml = `
    ${emailHeading(subject, { size: 'md' })}
    ${paragraphs}
    ${emailDivider()}
    ${emailButton('Go to Dashboard', 'https://dealflowai.app/dashboard')}
  `

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: subject,
    showFooterCTA: false,
  })

  const plainText = message

  // Send to each recipient
  const results: { email: string; success: boolean; error?: string }[] = []

  for (const recipient of recipients) {
    const name = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ')
    // Replace {{firstName}} placeholder
    const personalizedHtml = html.replace(/\{\{firstName\}\}/g, recipient.firstName || 'there')
    const personalizedText = plainText.replace(/\{\{firstName\}\}/g, recipient.firstName || 'there')

    const result = await sendEmail({
      to: { email: recipient.email, name: name || undefined },
      subject,
      html: personalizedHtml,
      text: personalizedText,
      replyTo: fromName
        ? { email: 'dealflow.aiteam@gmail.com', name: fromName }
        : undefined,
      categories: ['admin-email'],
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
