/**
 * Email Templates
 *
 * Professional HTML email templates for all DealFlow AI notifications.
 * Uses inline CSS for maximum email client compatibility.
 * Consistent DealFlow AI branding across all templates.
 */

/* ═══════════════════════════════════════════════
   BASE LAYOUT
   ═══════════════════════════════════════════════ */

const BRAND = {
  navy: '#0B1224',
  blue: '#2563eb',
  green: '#059669',
  red: '#b91c1c',
  amber: '#d97706',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
  white: '#ffffff',
  bg: '#f9fafb',
}

interface LayoutOptions {
  headerRight?: string
  preheader?: string // Hidden preheader text for inbox preview
}

export function baseLayout(content: string, options?: LayoutOptions): string {
  const preheader = options?.preheader
    ? `<span style="display:none;font-size:1px;color:${BRAND.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${options.preheader}</span>`
    : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${preheader}
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:${BRAND.white};border-radius:12px;border:1px solid ${BRAND.gray200};overflow:hidden;">

<!-- Header -->
<tr><td style="background:${BRAND.navy};padding:24px 32px;">
  <table width="100%"><tr>
    <td style="color:${BRAND.white};font-size:18px;font-weight:600;letter-spacing:-0.01em;">DealFlow AI</td>
    ${options?.headerRight ? `<td align="right" style="color:${BRAND.gray400};font-size:13px;">${options.headerRight}</td>` : ''}
  </tr></table>
</td></tr>

${content}

<!-- Footer -->
<tr><td style="padding:20px 32px;border-top:1px solid ${BRAND.gray200};">
  <p style="margin:0;font-size:12px;color:${BRAND.gray400};text-align:center;line-height:1.5;">
    Sent by DealFlow AI &middot; Built for wholesalers, by wholesalers.<br>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.com'}" style="color:${BRAND.gray400};">Visit Dashboard</a>
    &middot; <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.com'}/settings" style="color:${BRAND.gray400};">Email Preferences</a>
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

/* ═══════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════ */

export function greeting(name: string, message: string): string {
  return `<tr><td style="padding:28px 32px 0;">
  <p style="margin:0 0 4px;font-size:15px;color:${BRAND.gray700};">Hi ${name},</p>
  <p style="margin:0 0 20px;font-size:14px;color:${BRAND.gray500};line-height:1.6;">${message}</p>
</td></tr>`
}

export function ctaButton(text: string, href: string, color?: string): string {
  return `<tr><td align="center" style="padding:8px 32px 28px;">
  <a href="${href}" style="display:inline-block;background:${color || BRAND.blue};color:${BRAND.white};text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">${text}</a>
</td></tr>`
}

export function infoCard(title: string, rows: { label: string; value: string; color?: string }[]): string {
  const rowsHtml = rows
    .map(
      (r) => `<tr>
    <td style="padding:5px 0;font-size:13px;color:${BRAND.gray500};">${r.label}</td>
    <td align="right" style="padding:5px 0;font-size:14px;font-weight:600;color:${r.color || BRAND.navy};">${r.value}</td>
  </tr>`,
    )
    .join('')

  return `<tr><td style="padding:16px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border:1px solid ${BRAND.gray200};border-radius:10px;overflow:hidden;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND.gray400};">${title}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
    </td></tr>
  </table>
</td></tr>`
}

export function statusBanner(
  text: string,
  type: 'success' | 'warning' | 'error' | 'info',
): string {
  const styles = {
    success: { bg: '#ecfdf5', border: '#a7f3d0', color: BRAND.green },
    warning: { bg: '#fffbeb', border: '#fde68a', color: BRAND.amber },
    error: { bg: '#fef2f2', border: '#fecaca', color: BRAND.red },
    info: { bg: '#eff6ff', border: '#bfdbfe', color: BRAND.blue },
  }
  const s = styles[type]

  return `<tr><td style="padding:0 32px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${s.bg};border:1px solid ${s.border};border-radius:10px;">
    <tr><td style="padding:16px 20px;text-align:center;">
      <p style="margin:0;font-size:15px;font-weight:600;color:${s.color};">${text}</p>
    </td></tr>
  </table>
</td></tr>`
}

export function textBlock(text: string): string {
  return `<tr><td style="padding:0 32px 16px;">
  <p style="margin:0;font-size:14px;color:${BRAND.gray500};line-height:1.6;">${text}</p>
</td></tr>`
}

export function divider(): string {
  return `<tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid ${BRAND.gray200};margin:0;"></td></tr>`
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return 'N/A'
  return '$' + n.toLocaleString()
}

/* ═══════════════════════════════════════════════
   WELCOME EMAIL — after signup / onboarding
   ═══════════════════════════════════════════════ */

export interface WelcomeEmailData {
  firstName: string
  plan?: string
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string; text: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.com'

  const html = baseLayout(
    `
${greeting(data.firstName, 'Welcome to DealFlow AI! Your all-in-one platform for real estate wholesaling is ready to go.')}

${statusBanner('Account Created Successfully', 'success')}

${infoCard('Quick Start Guide', [
  { label: '1. Find Buyers', value: 'Search cash buyers in your market' },
  { label: '2. Build Your List', value: 'Import & organize buyer contacts' },
  { label: '3. Analyze Deals', value: 'Get ARV, comps & deal scores' },
  { label: '4. Send Outreach', value: 'AI voice, SMS & email campaigns' },
])}

${textBlock('DealFlow AI replaces your PropStream, dialer, CRM, and contract tools with one integrated platform. Start by searching for cash buyers in your target market.')}

${ctaButton('Go to Dashboard', `${appUrl}/dashboard`)}
`,
    {
      headerRight: 'Welcome',
      preheader: `Welcome to DealFlow AI, ${data.firstName}! Your wholesaling toolkit is ready.`,
    },
  )

  const text = `Welcome to DealFlow AI, ${data.firstName}!\n\nYour all-in-one platform for real estate wholesaling is ready.\n\nQuick Start:\n1. Find Buyers - Search cash buyers in your market\n2. Build Your List - Import & organize contacts\n3. Analyze Deals - Get ARV, comps & deal scores\n4. Send Outreach - AI voice, SMS & email campaigns\n\nGo to your dashboard: ${appUrl}/dashboard`

  return {
    subject: `Welcome to DealFlow AI, ${data.firstName}!`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   MARKETPLACE INQUIRY — buyer inquired on a listing
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

export function inquiryReceivedEmail(data: InquiryEmailData): { subject: string; html: string; text: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.com'

  const rows = [
    { label: 'Buyer', value: data.buyerName },
    { label: 'Email', value: data.buyerEmail, color: '#2563eb' as string },
    ...(data.buyerPhone ? [{ label: 'Phone', value: data.buyerPhone }] : []),
    { label: 'Property', value: `${data.propertyAddress}, ${data.city}` },
    { label: 'Listing Price', value: fmtCurrency(data.listingPrice), color: '#0B1224' as string },
  ]

  const html = baseLayout(
    `
${greeting(data.wholesalerName, `<strong style="color:${BRAND.gray700};">${data.buyerName}</strong> is interested in your listing at <strong style="color:${BRAND.gray700};">${data.propertyAddress}, ${data.city}, ${data.state}</strong>.`)}

${statusBanner('New Inquiry Received', 'info')}

${infoCard('Inquiry Details', rows)}

${data.message ? `<tr><td style="padding:0 32px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;">
    <tr><td style="padding:16px 20px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${BRAND.gray400};">Message from Buyer</p>
      <p style="margin:0;font-size:14px;color:${BRAND.gray700};line-height:1.5;font-style:italic;">"${data.message}"</p>
    </td></tr>
  </table>
</td></tr>` : ''}

${textBlock('Respond quickly — buyers who get a reply within 5 minutes are 10x more likely to close.')}

${ctaButton('View Listing', `${appUrl}/marketplace`)}
`,
    {
      headerRight: 'Marketplace',
      preheader: `${data.buyerName} inquired about ${data.propertyAddress}`,
    },
  )

  const text = `New inquiry on ${data.propertyAddress}\n\nBuyer: ${data.buyerName}\nEmail: ${data.buyerEmail}${data.buyerPhone ? `\nPhone: ${data.buyerPhone}` : ''}${data.message ? `\nMessage: "${data.message}"` : ''}\n\nView listing: ${appUrl}/marketplace`

  return {
    subject: `New Inquiry: ${data.buyerName} wants ${data.propertyAddress}`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   OFFER RECEIVED — buyer submitted offer on a deal
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

export function offerReceivedEmail(data: OfferEmailData): { subject: string; html: string; text: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.com'
  const spread = data.arv ? data.arv - data.offerAmount : null
  const aboveAsk = data.offerAmount >= data.askingPrice

  const rows = [
    { label: 'Offer Amount', value: fmtCurrency(data.offerAmount), color: aboveAsk ? BRAND.green : BRAND.navy },
    { label: 'Asking Price', value: fmtCurrency(data.askingPrice) },
    ...(data.arv ? [{ label: 'ARV', value: fmtCurrency(data.arv) }] : []),
    ...(spread != null ? [{ label: 'Spread (ARV - Offer)', value: fmtCurrency(spread), color: BRAND.green }] : []),
    { label: 'Buyer', value: data.buyerName },
    { label: 'Contact', value: data.buyerEmail, color: BRAND.blue },
  ]

  const html = baseLayout(
    `
${greeting(data.wholesalerName, `<strong style="color:${BRAND.gray700};">${data.buyerName}</strong> submitted an offer of <strong style="color:${BRAND.green};">${fmtCurrency(data.offerAmount)}</strong> on <strong style="color:${BRAND.gray700};">${data.propertyAddress}</strong>.`)}

${statusBanner(aboveAsk ? 'Offer At or Above Asking!' : 'New Offer Received', aboveAsk ? 'success' : 'info')}

${infoCard('Offer Summary', rows)}

${data.message ? textBlock(`<strong>Buyer's note:</strong> "${data.message}"`) : ''}

${ctaButton('Review Offer', `${appUrl}/deals/${data.dealId}`)}
`,
    {
      headerRight: 'Deals',
      preheader: `${data.buyerName} offered ${fmtCurrency(data.offerAmount)} on ${data.propertyAddress}`,
    },
  )

  const text = `New offer on ${data.propertyAddress}\n\nBuyer: ${data.buyerName} (${data.buyerEmail})\nOffer: ${fmtCurrency(data.offerAmount)}\nAsking: ${fmtCurrency(data.askingPrice)}${data.arv ? `\nARV: ${fmtCurrency(data.arv)}` : ''}${data.message ? `\nNote: "${data.message}"` : ''}\n\nView deal: ${appUrl}/deals/${data.dealId}`

  return {
    subject: `New Offer: ${fmtCurrency(data.offerAmount)} on ${data.propertyAddress}`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   CAMPAIGN REPORT — summary after campaign completes
   ═══════════════════════════════════════════════ */

export interface CampaignReportData {
  wholesalerName: string
  campaignName: string
  totalContacted: number
  connected: number
  interested: number
  callbackRequested: number
  optedOut: number
  channel: string // 'AI Voice' | 'Email' | 'SMS'
  duration?: string | null
  campaignId?: string
}

export function campaignReportEmail(data: CampaignReportData): { subject: string; html: string; text: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.com'
  const connectRate = data.totalContacted > 0 ? Math.round((data.connected / data.totalContacted) * 100) : 0
  const interestRate = data.connected > 0 ? Math.round((data.interested / data.connected) * 100) : 0

  const rows = [
    { label: 'Channel', value: data.channel },
    { label: 'Total Contacted', value: data.totalContacted.toString() },
    { label: 'Connected', value: `${data.connected} (${connectRate}%)`, color: BRAND.blue },
    { label: 'Interested', value: `${data.interested} (${interestRate}%)`, color: BRAND.green },
    { label: 'Callback Requested', value: data.callbackRequested.toString() },
    { label: 'Opted Out', value: data.optedOut.toString(), color: data.optedOut > 0 ? BRAND.red : BRAND.navy },
    ...(data.duration ? [{ label: 'Duration', value: data.duration }] : []),
  ]

  const html = baseLayout(
    `
${greeting(data.wholesalerName, `Your campaign <strong style="color:${BRAND.gray700};">"${data.campaignName}"</strong> has completed. Here's the summary:`)}

${statusBanner('Campaign Completed', 'success')}

${infoCard('Campaign Results', rows)}

${data.interested > 0 ? textBlock(`<strong>${data.interested} buyers</strong> expressed interest. Follow up quickly to convert these leads into deals!`) : textBlock('Consider adjusting your target criteria or messaging for better results next time.')}

${ctaButton('View Full Report', `${appUrl}/outreach`)}
`,
    {
      headerRight: 'Outreach',
      preheader: `Campaign "${data.campaignName}" complete: ${data.interested} interested out of ${data.totalContacted} contacted`,
    },
  )

  const text = `Campaign Report: ${data.campaignName}\n\nChannel: ${data.channel}\nTotal Contacted: ${data.totalContacted}\nConnected: ${data.connected} (${connectRate}%)\nInterested: ${data.interested} (${interestRate}%)\nCallback Requested: ${data.callbackRequested}\nOpted Out: ${data.optedOut}\n\nView full report: ${appUrl}/outreach`

  return {
    subject: `Campaign Report: "${data.campaignName}" — ${data.interested} Interested`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   DEAL MATCH ALERT — new deal matches buyer criteria
   ═══════════════════════════════════════════════ */

export interface DealAlertEmailData {
  buyerName: string
  buyerEmail: string
  propertyAddress: string
  city: string
  state: string
  zip: string
  propertyType: string
  beds?: number | null
  baths?: number | null
  sqft?: number | null
  askingPrice: number
  arv?: number | null
  repairCost?: number | null
  matchScore: number
  dealId: string
}

export function dealAlertEmail(data: DealAlertEmailData): { subject: string; html: string; text: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.com'
  const spread = data.arv ? data.arv - data.askingPrice : null

  const scoreBg = data.matchScore >= 80 ? '#ecfdf5' : data.matchScore >= 60 ? '#eff6ff' : '#fffbeb'
  const scoreColor = data.matchScore >= 80 ? BRAND.green : data.matchScore >= 60 ? BRAND.blue : BRAND.amber
  const scoreBorder = data.matchScore >= 80 ? '#a7f3d0' : data.matchScore >= 60 ? '#bfdbfe' : '#fde68a'

  const typeLabels: Record<string, string> = {
    SFR: 'Single Family', MULTI_FAMILY: 'Multi-Family', CONDO: 'Condo',
    LAND: 'Vacant Land', COMMERCIAL: 'Commercial', MOBILE_HOME: 'Mobile Home',
  }

  const detailParts = [
    ...(data.beds != null ? [`${data.beds} Beds`] : []),
    ...(data.baths != null ? [`${data.baths} Baths`] : []),
    ...(data.sqft != null ? [`${data.sqft.toLocaleString()} sqft`] : []),
  ]

  const rows = [
    { label: 'Asking Price', value: fmtCurrency(data.askingPrice) },
    ...(data.arv ? [{ label: 'ARV', value: fmtCurrency(data.arv) }] : []),
    ...(spread != null ? [{ label: 'Spread', value: fmtCurrency(spread), color: BRAND.green }] : []),
    ...(data.repairCost ? [{ label: 'Est. Repair', value: fmtCurrency(data.repairCost) }] : []),
  ]

  const html = baseLayout(
    `
<!-- Match Score Header -->
<tr><td style="padding:28px 32px 0;">
  <table width="100%"><tr>
    <td>
      <p style="margin:0 0 4px;font-size:15px;color:${BRAND.gray700};">Hi ${data.buyerName},</p>
      <p style="margin:0;font-size:14px;color:${BRAND.gray500};line-height:1.5;">A new deal matching your buy criteria is available:</p>
    </td>
    <td align="right" valign="top">
      <span style="display:inline-block;background:${scoreBg};color:${scoreColor};border:1px solid ${scoreBorder};border-radius:20px;padding:6px 16px;font-size:14px;font-weight:700;">${data.matchScore}% Match</span>
    </td>
  </tr></table>
</td></tr>

<!-- Property Card -->
<tr><td style="padding:20px 32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border:1px solid ${BRAND.gray200};border-radius:10px;overflow:hidden;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:${BRAND.navy};">${data.propertyAddress}</p>
      <p style="margin:0 0 12px;font-size:13px;color:${BRAND.gray400};">${data.city}, ${data.state} ${data.zip} &middot; ${typeLabels[data.propertyType] || data.propertyType}</p>
      ${detailParts.length ? `<p style="margin:0 0 16px;font-size:13px;color:${BRAND.gray500};">${detailParts.join(' &middot; ')}</p>` : ''}
    </td></tr>
  </table>
</td></tr>

${infoCard('Deal Financials', rows)}

${ctaButton('View Deal Details', `${appUrl}/deals/${data.dealId}`)}
`,
    {
      headerRight: 'Deal Alert',
      preheader: `${data.matchScore}% match: ${data.propertyAddress} — ${fmtCurrency(data.askingPrice)}`,
    },
  )

  const text = `New Deal Alert (${data.matchScore}% Match)\n\n${data.propertyAddress}\n${data.city}, ${data.state} ${data.zip}\n${typeLabels[data.propertyType] || data.propertyType}${detailParts.length ? ` | ${detailParts.join(' | ')}` : ''}\n\nAsking: ${fmtCurrency(data.askingPrice)}${data.arv ? `\nARV: ${fmtCurrency(data.arv)}` : ''}${spread != null ? `\nSpread: ${fmtCurrency(spread)}` : ''}\n\nView deal: ${appUrl}/deals/${data.dealId}`

  return {
    subject: `${data.matchScore}% Match: ${data.propertyAddress}, ${data.city} ${data.state} — ${fmtCurrency(data.askingPrice)}`,
    html,
    text,
  }
}

/* ═══════════════════════════════════════════════
   GENERAL NOTIFICATION — flexible for any use case
   ═══════════════════════════════════════════════ */

export interface GeneralNotificationData {
  recipientName: string
  subject: string
  headline: string
  body: string
  ctaText?: string
  ctaUrl?: string
  bannerText?: string
  bannerType?: 'success' | 'warning' | 'error' | 'info'
}

export function generalNotificationEmail(data: GeneralNotificationData): { subject: string; html: string; text: string } {
  const html = baseLayout(
    `
${greeting(data.recipientName, data.headline)}

${data.bannerText ? statusBanner(data.bannerText, data.bannerType || 'info') : ''}

${textBlock(data.body)}

${data.ctaText && data.ctaUrl ? ctaButton(data.ctaText, data.ctaUrl) : ''}
`,
    { preheader: data.headline },
  )

  const text = `Hi ${data.recipientName},\n\n${data.headline}\n\n${data.body}${data.ctaUrl ? `\n\n${data.ctaText}: ${data.ctaUrl}` : ''}`

  return { subject: data.subject, html, text }
}
