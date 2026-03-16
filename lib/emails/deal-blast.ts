/**
 * Deal Blast Email Template
 *
 * Sent to matched buyers when a wholesaler blasts a deal.
 * Designed to be scannable: key numbers first, details second, clear CTA.
 */

import {
  wrapInEmailTemplate,
  emailButton,
  emailDivider,
  emailStatCard,
  emailInfoRow,
  emailHeading,
  emailText,
  emailSpacer,
  emailMatchBadge,
  emailPill,
  emailNote,
  fmtCurrency,
  brand,
} from './template'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export interface DealEmailData {
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
  rentalCashFlow?: number | null
  closeByDate?: string | null
  wholesalerName?: string
  wholesalerCompany?: string | null
  wholesalerEmail?: string
  wholesalerPhone?: string | null
}

export interface BuyerEmailData {
  firstName: string | null
  lastName: string | null
  entityName: string | null
}

const TYPE_LABELS: Record<string, string> = {
  SFR: 'Single Family',
  MULTI_FAMILY: 'Multi-Family',
  CONDO: 'Condo/Townhome',
  LAND: 'Vacant Land',
  COMMERCIAL: 'Commercial',
  MOBILE_HOME: 'Mobile Home',
}

const CONDITION_COLORS: Record<string, string> = {
  distressed: '#dc2626',
  fair: '#d97706',
  good: '#2563eb',
  excellent: '#16a34a',
}

/* ═══════════════════════════════════════════════
   FORMATTER
   ═══════════════════════════════════════════════ */

export function formatDealBlastEmail(
  deal: DealEmailData,
  buyer: BuyerEmailData,
  matchScore?: number,
): string {
  const buyerName = [buyer.firstName, buyer.lastName].filter(Boolean).join(' ') || buyer.entityName || 'Investor'
  const spread = deal.arv != null ? deal.arv - deal.askingPrice : null
  const typeLabel = TYPE_LABELS[deal.propertyType] || deal.propertyType

  // Match score badge row
  const matchBadgeHtml = matchScore != null ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr>
  <td style="font-family:${brand.font};font-size:14px;color:${brand.gray500};">New deal for you, ${buyerName}</td>
  <td align="right">${emailMatchBadge(matchScore)}</td>
</tr>
</table>` : `
${emailText(`New deal for you, ${buyerName}`)}`

  // Property hero
  const pills = [
    emailPill(typeLabel),
    ...(deal.condition ? [emailPill(
      deal.condition.charAt(0).toUpperCase() + deal.condition.slice(1),
      CONDITION_COLORS[deal.condition.toLowerCase()],
    )] : []),
  ].join('')

  const heroHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px;">
<tr><td>
  <span style="font-family:${brand.font};font-size:20px;font-weight:700;color:${brand.navy};line-height:1.3;letter-spacing:-0.02em;">${deal.address}</span>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
<tr><td>
  <span style="font-family:${brand.font};font-size:14px;color:${brand.gray500};">${deal.city}, ${deal.state} ${deal.zip}</span>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
<tr><td>${pills}</td></tr>
</table>`

  // Key numbers row
  const statCards: string[] = [
    emailStatCard('Asking Price', fmtCurrency(deal.askingPrice), brand.navy),
  ]
  if (deal.arv != null) {
    statCards.push(emailStatCard('ARV', fmtCurrency(deal.arv), brand.blue))
  }
  if (spread != null) {
    statCards.push(emailStatCard('Spread', fmtCurrency(spread), spread >= 0 ? brand.green : brand.red))
  }

  const statsRowHtml = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.gray50};border:1px solid ${brand.gray200};border-radius:8px;">
<tr>${statCards.join('')}</tr>
</table>`

  // Property details
  const detailRows: string[] = []
  if (deal.beds != null) detailRows.push(emailInfoRow('Bedrooms', deal.beds.toString()))
  if (deal.baths != null) detailRows.push(emailInfoRow('Bathrooms', deal.baths.toString()))
  if (deal.sqft != null) detailRows.push(emailInfoRow('Square Feet', deal.sqft.toLocaleString()))
  if (deal.yearBuilt != null) detailRows.push(emailInfoRow('Year Built', deal.yearBuilt.toString()))
  if (deal.condition) detailRows.push(emailInfoRow('Condition', deal.condition.charAt(0).toUpperCase() + deal.condition.slice(1)))
  if (deal.closeByDate) detailRows.push(emailInfoRow('Close By', deal.closeByDate))
  if (deal.repairCost != null) detailRows.push(emailInfoRow('Est. Repair Cost', fmtCurrency(deal.repairCost)))

  const detailsHtml = detailRows.length > 0 ? `
${emailHeading('Property Details', { size: 'sm', color: brand.gray400 })}
${detailRows.join('')}` : ''

  // Flip/rental analysis
  const analysisCards: string[] = []
  if (deal.flipProfit != null) {
    analysisCards.push(emailStatCard('Est. Flip Profit', fmtCurrency(deal.flipProfit), deal.flipProfit >= 0 ? brand.green : brand.red))
  }
  if (deal.assignFee != null) {
    analysisCards.push(emailStatCard('Assignment Fee', fmtCurrency(deal.assignFee), brand.blue))
  }
  if (deal.rentalCashFlow != null) {
    analysisCards.push(emailStatCard('Monthly Cash Flow', fmtCurrency(deal.rentalCashFlow), brand.green))
  }

  const analysisHtml = analysisCards.length > 0 ? `
${emailDivider()}
${emailHeading('Investment Analysis', { size: 'sm', color: brand.gray400 })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${brand.gray50};border:1px solid ${brand.gray200};border-radius:8px;">
<tr>${analysisCards.join('')}</tr>
</table>` : ''

  // CTA
  const replySubject = encodeURIComponent(`Interest in ${deal.address}, ${deal.city} ${deal.state}`)
  const replyEmail = deal.wholesalerEmail || ''
  const ctaHtml = `
${emailSpacer(8)}
${emailHeading('Interested in this deal?', { size: 'sm' })}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:4px 0 16px;">
  ${emailButton('Reply to This Deal', `mailto:${replyEmail}?subject=${replySubject}`)}
</td></tr>
</table>
${deal.wholesalerPhone ? emailText(`Or call <a href="tel:${deal.wholesalerPhone}" style="color:${brand.blue};text-decoration:none;font-weight:600;">${deal.wholesalerPhone}</a>`, { align: 'center', size: '13px' }) : ''}`

  // Footer note
  const sender = deal.wholesalerCompany || deal.wholesalerName || 'a wholesaler'
  const footerNote = emailNote(`This deal was matched to you based on your buy box preferences. Sent by ${sender} via DealFlow AI.`)

  // Assemble
  const bodyHtml = `
${matchBadgeHtml}
${heroHtml}
${statsRowHtml}
${detailsHtml ? emailDivider() + detailsHtml : ''}
${analysisHtml}
${emailDivider()}
${ctaHtml}
${emailSpacer(8)}
${footerNote}`

  return wrapInEmailTemplate(bodyHtml, {
    previewText: `New deal: ${deal.address}, ${deal.city} — ${fmtCurrency(deal.askingPrice)}${deal.arv ? ` | ARV ${fmtCurrency(deal.arv)}` : ''}`,
    showFooterCTA: false,
  })
}
