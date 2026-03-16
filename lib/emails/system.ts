/**
 * System Email Templates
 *
 * Welcome, deal match notifications, and other system-level emails.
 */

import {
  wrapInEmailTemplate,
  emailButton,
  emailDivider,
  emailStatCard,
  emailHeading,
  emailText,
  emailSpacer,
  emailMatchBadge,
  emailInfoRow,
  emailBanner,
  fmtCurrency,
  brand,
} from './template'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.app'

/* ═══════════════════════════════════════════════
   WELCOME EMAIL — after signup
   ═══════════════════════════════════════════════ */

export interface WelcomeEmailData {
  firstName: string
  plan?: string
}

export function formatWelcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const stepIcon = (num: string, color: string) =>
    `<span style="display:inline-block;width:28px;height:28px;background-color:${color};color:${brand.white};font-family:${brand.font};font-size:13px;font-weight:700;line-height:28px;text-align:center;border-radius:50%;margin-right:12px;vertical-align:middle;">${num}</span>`

  const step = (num: string, color: string, title: string, desc: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
<tr>
  <td style="width:40px;vertical-align:top;padding-top:2px;">${stepIcon(num, color)}</td>
  <td style="vertical-align:top;">
    <span style="font-family:${brand.font};font-size:15px;font-weight:600;color:${brand.navy};display:block;margin-bottom:2px;">${title}</span>
    <span style="font-family:${brand.font};font-size:13px;color:${brand.gray500};line-height:1.5;">${desc}</span>
  </td>
</tr>
</table>`

  const bodyHtml = `
${emailHeading(`Welcome to DealFlow AI, ${data.firstName}`)}
${emailText('You now have access to the smartest wholesale deal platform on the market. No more juggling PropStream, dialers, CRMs, and contract tools separately.')}

${emailBanner('Your account is ready', 'success')}

${emailSpacer(8)}
${emailHeading('Get started in 3 steps', { size: 'sm', color: brand.gray400 })}

${step('1', brand.blue, 'Find Buyers', 'Search cash buyers in any market. Filter by property type, location, and buying history.')}
${step('2', brand.green, 'Analyze Deals', 'Get instant ARV estimates, comps, and deal scoring. Know if a deal is worth pursuing in seconds.')}
${step('3', '#8b5cf6', 'Match & Close', 'Let AI match your deals to the right buyers. Send deal blasts, manage contracts, and close faster.')}

${emailDivider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:4px 0 20px;">
  ${emailButton('Go to Your Dashboard', `${APP_URL}/dashboard`)}
</td></tr>
</table>

${emailText('Questions? Reply to this email — we read every message.', { align: 'center', size: '13px', color: brand.gray400 })}`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `Welcome to DealFlow AI, ${data.firstName}! Your wholesaling toolkit is ready.`,
    showFooterCTA: false,
  })

  const text = `Welcome to DealFlow AI, ${data.firstName}!\n\nYou now have access to the smartest wholesale deal platform on the market.\n\nGet started:\n1. Find Buyers — Search cash buyers in any market\n2. Analyze Deals — Get instant ARV and deal scoring\n3. Match & Close — Let AI match deals to the right buyers\n\nGo to your dashboard: ${APP_URL}/dashboard`

  return {
    subject: `Welcome to DealFlow AI, ${data.firstName}!`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   DEAL MATCH NOTIFICATION — buyer matched to deal
   ═══════════════════════════════════════════════ */

export interface DealMatchEmailData {
  buyerName: string
  propertyAddress: string
  city: string
  state: string
  zip: string
  propertyType: string
  askingPrice: number
  arv?: number | null
  spread?: number | null
  matchScore: number
  dealId: string
  wholesalerName?: string
  wholesalerEmail?: string
}

const TYPE_LABELS: Record<string, string> = {
  SFR: 'Single Family', MULTI_FAMILY: 'Multi-Family', CONDO: 'Condo/Townhome',
  LAND: 'Vacant Land', COMMERCIAL: 'Commercial', MOBILE_HOME: 'Mobile Home',
}

export function formatDealMatchEmail(data: DealMatchEmailData): { subject: string; html: string; text: string } {
  const typeLabel = TYPE_LABELS[data.propertyType] || data.propertyType
  const spread = data.spread ?? (data.arv ? data.arv - data.askingPrice : null)

  const statCards: string[] = [
    emailStatCard('Asking', fmtCurrency(data.askingPrice), brand.navy),
  ]
  if (data.arv) statCards.push(emailStatCard('ARV', fmtCurrency(data.arv), brand.blue))
  if (spread != null) statCards.push(emailStatCard('Spread', fmtCurrency(spread), spread >= 0 ? brand.green : brand.red))

  const bodyHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
<tr>
  <td>
    ${emailHeading(`New Deal Match`, { size: 'md' })}
  </td>
  <td align="right" style="vertical-align:top;padding-top:4px;">
    ${emailMatchBadge(data.matchScore)}
  </td>
</tr>
</table>

${emailText(`Hi ${data.buyerName}, a new deal matching your buy criteria is available.`)}

<!-- Property -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;">
<tr><td>
  <span style="font-family:${brand.font};font-size:18px;font-weight:700;color:${brand.navy};letter-spacing:-0.01em;">${data.propertyAddress}</span>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr><td>
  <span style="font-family:${brand.font};font-size:14px;color:${brand.gray500};">${data.city}, ${data.state} ${data.zip} &middot; ${typeLabel}</span>
</td></tr>
</table>

<!-- Stats -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.gray50};border:1px solid ${brand.gray200};border-radius:8px;margin:0 0 24px;">
<tr>${statCards.join('')}</tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:0 0 20px;">
  ${emailButton('View Deal Details', `${APP_URL}/deals/${data.dealId}`)}
</td></tr>
</table>

${data.wholesalerEmail ? emailText(`Reply directly to the wholesaler: <a href="mailto:${data.wholesalerEmail}" style="color:${brand.blue};text-decoration:none;font-weight:600;">${data.wholesalerEmail}</a>`, { align: 'center', size: '13px', color: brand.gray400 }) : ''}`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `${data.matchScore}% match: ${data.propertyAddress} — ${fmtCurrency(data.askingPrice)}`,
    showFooterCTA: false,
  })

  const text = `New Deal Match (${data.matchScore}% Match)\n\n${data.propertyAddress}\n${data.city}, ${data.state} ${data.zip} | ${typeLabel}\n\nAsking: ${fmtCurrency(data.askingPrice)}${data.arv ? `\nARV: ${fmtCurrency(data.arv)}` : ''}${spread != null ? `\nSpread: ${fmtCurrency(spread)}` : ''}\n\nView deal: ${APP_URL}/deals/${data.dealId}`

  return {
    subject: `${data.matchScore}% Match: ${data.propertyAddress}, ${data.city} — ${fmtCurrency(data.askingPrice)}`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   INQUIRY RECEIVED — marketplace inquiry notification
   ═══════════════════════════════════════════════ */

export interface InquiryEmailData {
  wholesalerName: string
  buyerName: string
  buyerEmail: string
  buyerPhone?: string | null
  propertyAddress: string
  city: string
  state: string
  listingPrice: number
  message?: string | null
  listingId: string
}

export function formatInquiryEmail(data: InquiryEmailData): { subject: string; html: string; text: string } {
  const infoRows = [
    emailInfoRow('Buyer', data.buyerName, brand.navy),
    emailInfoRow('Email', `<a href="mailto:${data.buyerEmail}" style="color:${brand.blue};text-decoration:none;">${data.buyerEmail}</a>`),
    ...(data.buyerPhone ? [emailInfoRow('Phone', `<a href="tel:${data.buyerPhone}" style="color:${brand.blue};text-decoration:none;">${data.buyerPhone}</a>`)] : []),
    emailInfoRow('Property', `${data.propertyAddress}, ${data.city}`),
    emailInfoRow('Listing Price', fmtCurrency(data.listingPrice), brand.navy),
  ]

  const bodyHtml = `
${emailHeading('New Inquiry Received')}
${emailText(`<strong style="color:${brand.navy};">${data.buyerName}</strong> is interested in your listing at <strong style="color:${brand.navy};">${data.propertyAddress}, ${data.city}, ${data.state}</strong>.`)}

${emailBanner('Respond quickly — fast replies close more deals', 'info')}

${infoRows.join('')}

${data.message ? `
${emailSpacer(8)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
<tr><td style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:16px 20px;">
  <span style="font-family:${brand.font};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${brand.gray400};display:block;margin-bottom:6px;">Message from Buyer</span>
  <span style="font-family:${brand.font};font-size:14px;color:${brand.gray700};line-height:1.5;font-style:italic;">&ldquo;${data.message}&rdquo;</span>
</td></tr>
</table>` : ''}

${emailDivider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:4px 0 20px;">
  ${emailButton('View Listing', `${APP_URL}/marketplace`)}
</td></tr>
</table>`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `${data.buyerName} inquired about ${data.propertyAddress}`,
    showFooterCTA: true,
  })

  const text = `New inquiry on ${data.propertyAddress}\n\nBuyer: ${data.buyerName}\nEmail: ${data.buyerEmail}${data.buyerPhone ? `\nPhone: ${data.buyerPhone}` : ''}${data.message ? `\nMessage: "${data.message}"` : ''}\n\nView listing: ${APP_URL}/marketplace`

  return {
    subject: `New Inquiry: ${data.buyerName} wants ${data.propertyAddress}`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   OFFER RECEIVED — new offer on a deal
   ═══════════════════════════════════════════════ */

export interface OfferEmailData {
  wholesalerName: string
  buyerName: string
  buyerEmail: string
  propertyAddress: string
  city: string
  state: string
  askingPrice: number
  offerAmount: number
  arv?: number | null
  message?: string | null
  dealId: string
}

export function formatOfferEmail(data: OfferEmailData): { subject: string; html: string; text: string } {
  const aboveAsk = data.offerAmount >= data.askingPrice
  const spread = data.arv ? data.arv - data.offerAmount : null

  const statCards = [
    emailStatCard('Offer', fmtCurrency(data.offerAmount), aboveAsk ? brand.green : brand.navy),
    emailStatCard('Asking', fmtCurrency(data.askingPrice), brand.gray500),
    ...(spread != null ? [emailStatCard('Spread', fmtCurrency(spread), spread >= 0 ? brand.green : brand.red)] : []),
  ]

  const bodyHtml = `
${emailHeading('New Offer Received')}
${emailText(`<strong style="color:${brand.navy};">${data.buyerName}</strong> submitted an offer of <strong style="color:${aboveAsk ? brand.green : brand.navy};">${fmtCurrency(data.offerAmount)}</strong> on <strong style="color:${brand.navy};">${data.propertyAddress}</strong>.`)}

${emailBanner(aboveAsk ? 'Offer at or above asking price!' : 'New offer to review', aboveAsk ? 'success' : 'info')}

<!-- Stats -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.gray50};border:1px solid ${brand.gray200};border-radius:8px;margin:0 0 20px;">
<tr>${statCards.join('')}</tr>
</table>

${emailInfoRow('Buyer', data.buyerName, brand.navy)}
${emailInfoRow('Contact', `<a href="mailto:${data.buyerEmail}" style="color:${brand.blue};text-decoration:none;">${data.buyerEmail}</a>`)}

${data.message ? `
${emailSpacer(8)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
<tr><td style="background-color:${brand.gray50};border-left:3px solid ${brand.gray300};border-radius:0 4px 4px 0;padding:12px 16px;">
  <span style="font-family:${brand.font};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${brand.gray400};display:block;margin-bottom:4px;">Buyer's Note</span>
  <span style="font-family:${brand.font};font-size:14px;color:${brand.gray600};line-height:1.5;">&ldquo;${data.message}&rdquo;</span>
</td></tr>
</table>` : ''}

${emailDivider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:4px 0 20px;">
  ${emailButton('Review Offer', `${APP_URL}/deals/${data.dealId}`)}
</td></tr>
</table>`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `${data.buyerName} offered ${fmtCurrency(data.offerAmount)} on ${data.propertyAddress}`,
    showFooterCTA: true,
  })

  const text = `New offer on ${data.propertyAddress}\n\nBuyer: ${data.buyerName} (${data.buyerEmail})\nOffer: ${fmtCurrency(data.offerAmount)}\nAsking: ${fmtCurrency(data.askingPrice)}${data.arv ? `\nARV: ${fmtCurrency(data.arv)}` : ''}${data.message ? `\nNote: "${data.message}"` : ''}\n\nView deal: ${APP_URL}/deals/${data.dealId}`

  return {
    subject: `New Offer: ${fmtCurrency(data.offerAmount)} on ${data.propertyAddress}`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   CAMPAIGN REPORT — after campaign completes
   ═══════════════════════════════════════════════ */

export interface CampaignReportData {
  wholesalerName: string
  campaignName: string
  totalContacted: number
  connected: number
  interested: number
  callbackRequested: number
  optedOut: number
  channel: string
  duration?: string | null
}

export function formatCampaignReportEmail(data: CampaignReportData): { subject: string; html: string; text: string } {
  const connectRate = data.totalContacted > 0 ? Math.round((data.connected / data.totalContacted) * 100) : 0
  const interestRate = data.connected > 0 ? Math.round((data.interested / data.connected) * 100) : 0

  const bodyHtml = `
${emailHeading(`Campaign Complete`)}
${emailText(`Your campaign <strong style="color:${brand.navy};">&ldquo;${data.campaignName}&rdquo;</strong> has finished. Here are the results:`)}

${emailBanner('Campaign Completed Successfully', 'success')}

<!-- Key metrics -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.gray50};border:1px solid ${brand.gray200};border-radius:8px;margin:0 0 20px;">
<tr>
  ${emailStatCard('Contacted', data.totalContacted.toString(), brand.navy)}
  ${emailStatCard('Connected', `${data.connected} (${connectRate}%)`, brand.blue)}
  ${emailStatCard('Interested', `${data.interested}`, data.interested > 0 ? brand.green : brand.gray400)}
</tr>
</table>

${emailInfoRow('Channel', data.channel)}
${emailInfoRow('Callback Requested', data.callbackRequested.toString())}
${emailInfoRow('Opted Out', data.optedOut.toString(), data.optedOut > 0 ? brand.red : undefined)}
${data.duration ? emailInfoRow('Duration', data.duration) : ''}

${emailDivider()}

${data.interested > 0
    ? emailText(`<strong style="color:${brand.green};">${data.interested} buyers</strong> expressed interest. Follow up quickly to convert these leads into deals!`)
    : emailText('Consider adjusting your target criteria or messaging for better results next time.')
  }

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:0 0 16px;">
  ${emailButton('View Full Report', `${APP_URL}/outreach`)}
</td></tr>
</table>`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `Campaign "${data.campaignName}" complete: ${data.interested} interested of ${data.totalContacted} contacted`,
    showFooterCTA: true,
  })

  const text = `Campaign Report: ${data.campaignName}\n\nChannel: ${data.channel}\nTotal Contacted: ${data.totalContacted}\nConnected: ${data.connected} (${connectRate}%)\nInterested: ${data.interested} (${interestRate}%)\nCallback Requested: ${data.callbackRequested}\nOpted Out: ${data.optedOut}\n\nView report: ${APP_URL}/outreach`

  return {
    subject: `Campaign Report: "${data.campaignName}" — ${data.interested} Interested`,
    html,
    text,
  }
}
