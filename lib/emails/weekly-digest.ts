/**
 * Weekly Digest Email Template
 *
 * Sent every Monday morning to active wholesalers. Summarizes the past 7 days:
 * new buyers found, deals created, deal status changes, campaigns, responses.
 */

import {
  wrapInEmailTemplate,
  emailButton,
  emailDivider,
  emailStatCard,
  emailHeading,
  emailText,
  emailSpacer,
  emailNote,
  brand,
} from './template'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.app'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export interface DigestData {
  firstName: string
  newBuyers: number
  dealsCreated: number
  dealsStatusChanged: { address: string; oldStatus: string; newStatus: string }[]
  campaignsSent: number
  responsesReceived: number
  marketInsight?: string // Optional AI-generated insight
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function getDateRange(): { start: string; end: string } {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { start: fmt(weekAgo), end: fmt(now) }
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  UNDER_OFFER: 'Under Offer',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
}

function friendlyStatus(s: string): string {
  return STATUS_LABELS[s] || s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/* ═══════════════════════════════════════════════
   FORMATTER
   ═══════════════════════════════════════════════ */

export function formatWeeklyDigest(data: DigestData): {
  subject: string
  html: string
  text: string
} {
  const { start, end } = getDateRange()
  const hasActivity =
    data.newBuyers > 0 ||
    data.dealsCreated > 0 ||
    data.campaignsSent > 0 ||
    data.responsesReceived > 0 ||
    data.dealsStatusChanged.length > 0

  // ── KPI stat cards ──
  const kpiRowHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.gray50};border:1px solid ${brand.gray200};border-radius:8px;margin:0 0 24px;">
<tr>
  ${emailStatCard('New Buyers', data.newBuyers.toString(), data.newBuyers > 0 ? brand.blue : brand.gray400)}
  ${emailStatCard('Deals Created', data.dealsCreated.toString(), data.dealsCreated > 0 ? brand.green : brand.gray400)}
</tr>
<tr>
  ${emailStatCard('Campaigns Sent', data.campaignsSent.toString(), data.campaignsSent > 0 ? brand.blue : brand.gray400)}
  ${emailStatCard('Responses', data.responsesReceived.toString(), data.responsesReceived > 0 ? brand.green : brand.gray400)}
</tr>
</table>`

  // ── Deal status changes ──
  let statusChangesHtml = ''
  if (data.dealsStatusChanged.length > 0) {
    const rows = data.dealsStatusChanged.slice(0, 10).map(
      (d) => `
<tr>
  <td style="padding:10px 12px;border-bottom:1px solid ${brand.gray100};font-family:${brand.font};font-size:13px;color:${brand.navy};font-weight:600;">
    ${escapeHtml(d.address)}
  </td>
  <td style="padding:10px 12px;border-bottom:1px solid ${brand.gray100};font-family:${brand.font};font-size:13px;color:${brand.gray500};text-align:center;">
    <span style="text-decoration:line-through;color:${brand.gray400};">${friendlyStatus(d.oldStatus)}</span>
    <span style="color:${brand.gray300};margin:0 4px;">&rarr;</span>
    <span style="color:${brand.navy};font-weight:600;">${friendlyStatus(d.newStatus)}</span>
  </td>
</tr>`,
    ).join('')

    statusChangesHtml = `
${emailHeading('Deal Status Changes', { size: 'sm', color: brand.gray400 })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${brand.gray200};border-radius:8px;overflow:hidden;margin:0 0 24px;">
<tr style="background-color:${brand.gray50};">
  <th style="padding:8px 12px;text-align:left;font-family:${brand.font};font-size:11px;font-weight:600;color:${brand.gray500};text-transform:uppercase;letter-spacing:0.05em;">Property</th>
  <th style="padding:8px 12px;text-align:center;font-family:${brand.font};font-size:11px;font-weight:600;color:${brand.gray500};text-transform:uppercase;letter-spacing:0.05em;">Status Change</th>
</tr>
${rows}
</table>`

    if (data.dealsStatusChanged.length > 10) {
      statusChangesHtml += emailText(
        `...and ${data.dealsStatusChanged.length - 10} more changes`,
        { size: '13px', color: brand.gray400, align: 'center' },
      )
    }
  }

  // ── Market insight ──
  const insightHtml = data.marketInsight
    ? `${emailDivider()}
${emailHeading('Market Insight', { size: 'sm', color: brand.gray400 })}
${emailNote(data.marketInsight)}`
    : ''

  // ── No activity fallback ──
  const noActivityHtml = !hasActivity
    ? emailText(
        'No major activity this week. Ready to get things moving? Start by finding new buyers or creating a deal below.',
        { color: brand.gray500 },
      )
    : ''

  // ── Quick actions ──
  const quickActionsHtml = `
${emailDivider()}
${emailHeading('Quick Actions', { size: 'sm', color: brand.gray400 })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
  <td align="center" style="padding:4px 6px 16px;">
    ${emailButton('View Dashboard', `${APP_URL}/dashboard`)}
  </td>
</tr>
<tr>
  <td align="center" style="padding:4px 6px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
    <tr>
      <td style="padding:0 6px;">
        <a href="${APP_URL}/find-buyers" style="display:inline-block;background-color:${brand.white};color:${brand.blue};font-family:${brand.font};font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:6px;border:1px solid ${brand.blue};line-height:1;">Find Buyers</a>
      </td>
      <td style="padding:0 6px;">
        <a href="${APP_URL}/deals/new" style="display:inline-block;background-color:${brand.white};color:${brand.blue};font-family:${brand.font};font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:6px;border:1px solid ${brand.blue};line-height:1;">Create Deal</a>
      </td>
    </tr>
    </table>
  </td>
</tr>
</table>`

  // ── Assemble ──
  const bodyHtml = `
${emailHeading(`Your Weekly Summary`, { align: 'center' })}
${emailText(`${start} &ndash; ${end}`, { align: 'center', size: '14px', color: brand.gray400 })}

${emailSpacer(8)}
${noActivityHtml}
${kpiRowHtml}
${statusChangesHtml}
${insightHtml}
${quickActionsHtml}

${emailSpacer(8)}
${emailText('Manage your email preferences in <a href="' + APP_URL + '/settings" style="color:' + brand.blue + ';text-decoration:none;font-weight:500;">Settings</a>.', { align: 'center', size: '12px', color: brand.gray400 })}`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `Your DealFlow AI weekly summary (${start} – ${end}): ${data.newBuyers} new buyers, ${data.dealsCreated} deals created`,
    showFooterCTA: false,
  })

  // ── Plain text fallback ──
  const statusChangesText = data.dealsStatusChanged.length > 0
    ? '\nDeal Status Changes:\n' +
      data.dealsStatusChanged
        .slice(0, 10)
        .map(d => `  ${d.address}: ${friendlyStatus(d.oldStatus)} → ${friendlyStatus(d.newStatus)}`)
        .join('\n') +
      '\n'
    : ''

  const text = `Your Weekly Summary (${start} – ${end})

Hi ${data.firstName},

Here's what happened this week:
- New Buyers: ${data.newBuyers}
- Deals Created: ${data.dealsCreated}
- Campaigns Sent: ${data.campaignsSent}
- Responses Received: ${data.responsesReceived}
${statusChangesText}${data.marketInsight ? `\nMarket Insight: ${data.marketInsight}\n` : ''}
Quick Links:
- Dashboard: ${APP_URL}/dashboard
- Find Buyers: ${APP_URL}/find-buyers
- Create Deal: ${APP_URL}/deals/new

Manage preferences: ${APP_URL}/settings`

  return {
    subject: `Weekly Summary: ${data.newBuyers} new buyers, ${data.dealsCreated} deals — ${start}–${end}`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
