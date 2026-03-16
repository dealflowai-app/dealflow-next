/**
 * Quick SendGrid test script
 *
 * Usage: npx tsx scripts/test-email.ts your-email@gmail.com
 *
 * Sends a test welcome email to verify SendGrid is working.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

const TO_EMAIL = process.argv[2]

if (!TO_EMAIL) {
  console.error('Usage: npx tsx scripts/test-email.ts <your-email>')
  process.exit(1)
}

const API_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'deals@dealflowai.app'
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'DealFlow AI'

if (!API_KEY) {
  console.error('SENDGRID_API_KEY is not set in .env.local')
  process.exit(1)
}

console.log(`Sending test email...`)
console.log(`  From: ${FROM_NAME} <${FROM_EMAIL}>`)
console.log(`  To:   ${TO_EMAIL}`)
console.log()

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
<tr><td style="background:#0B1224;padding:24px 32px;">
  <table width="100%"><tr>
    <td style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.01em;">DealFlow AI</td>
    <td align="right" style="color:#9ca3af;font-size:13px;">Test Email</td>
  </tr></table>
</td></tr>
<tr><td style="padding:28px 32px;">
  <p style="margin:0 0 16px;font-size:15px;color:#374151;">SendGrid is working!</p>
  <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
    This is a test email from DealFlow AI. If you're reading this, your SendGrid integration is configured correctly.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;">
    <tr><td style="padding:16px 20px;text-align:center;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#059669;">Email Delivery Confirmed</p>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Sent by DealFlow AI &middot; Test Email</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`

async function main() {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: TO_EMAIL }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: 'DealFlow AI — SendGrid Test',
      content: [{ type: 'text/html', value: html }],
    }),
  })

  if (res.ok) {
    const messageId = res.headers.get('x-message-id') || 'unknown'
    console.log(`Email sent successfully!`)
    console.log(`  Message ID: ${messageId}`)
    console.log(`  Check your inbox (and spam folder) for the test email.`)
  } else {
    const text = await res.text()
    console.error(`SendGrid error (${res.status}):`)
    console.error(text)
  }
}

main().catch(console.error)
