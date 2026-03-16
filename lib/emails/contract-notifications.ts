/**
 * Contract Notification Email Templates
 *
 * Professional contract lifecycle emails: sent, viewed, signed, executed, voided.
 * Each wraps content in the master template.
 */

import {
  wrapInEmailTemplate,
  emailButton,
  emailDivider,
  emailHeading,
  emailText,
  emailSpacer,
  emailInfoRow,
  emailBanner,
  emailNote,
  fmtCurrency,
  fmtDate,
  brand,
} from './template'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export interface ContractEmailData {
  propertyAddress: string
  city: string
  state: string
  zip: string
  buyerName: string
  buyerEmail?: string | null
  contractPrice?: string | null
  assignmentFee?: string | null
  earnestMoney?: string | null
  closingDate?: string | null
  titleCompany?: string | null
  contractType: string
  wholesalerName: string
  wholesalerCompany?: string | null
  wholesalerEmail: string
  wholesalerPhone?: string | null
  voidReason?: string | null
  sentAt?: string | null
  viewedAt?: string | null
  signedAt?: string | null
  executedAt?: string | null
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.app'

/* ═══════════════════════════════════════════════
   CONTRACT SENT — to buyer
   ═══════════════════════════════════════════════ */

export function formatContractSentEmail(data: ContractEmailData): { subject: string; html: string } {
  const subject = `Contract Ready for Review — ${data.propertyAddress}`

  const termRows: string[] = []
  if (data.contractPrice) termRows.push(emailInfoRow('Contract Price', data.contractPrice, brand.navy))
  if (data.assignmentFee) termRows.push(emailInfoRow('Assignment Fee', data.assignmentFee, brand.blue))
  if (data.earnestMoney) termRows.push(emailInfoRow('Earnest Money', data.earnestMoney))
  if (data.closingDate) termRows.push(emailInfoRow('Closing Date', data.closingDate))
  if (data.titleCompany) termRows.push(emailInfoRow('Title Company', data.titleCompany))

  const contactInfo = [
    data.wholesalerEmail ? `<a href="mailto:${data.wholesalerEmail}" style="color:${brand.blue};text-decoration:none;">${data.wholesalerEmail}</a>` : '',
    data.wholesalerPhone ? `<a href="tel:${data.wholesalerPhone}" style="color:${brand.blue};text-decoration:none;">${data.wholesalerPhone}</a>` : '',
  ].filter(Boolean).join(' &middot; ')

  const bodyHtml = `
${emailHeading('A Contract Is Ready for Your Review')}
${emailText(`For the property at <strong style="color:${brand.navy};">${data.propertyAddress}, ${data.city}, ${data.state} ${data.zip}</strong>`)}

${emailSpacer(4)}
${emailBanner('Please review the terms below carefully', 'info')}

${termRows.length > 0 ? `
${emailHeading('Key Terms', { size: 'sm', color: brand.gray400 })}
${termRows.join('')}
${emailSpacer(8)}
` : ''}

${emailDivider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:4px 0 20px;">
  ${emailButton('Review Contract Details', `${APP_URL}/contracts`)}
</td></tr>
</table>

${emailNote(`This contract was prepared by <strong>${data.wholesalerCompany || data.wholesalerName}</strong>. Please review all terms carefully before signing. Contact ${data.wholesalerName} with any questions: ${contactInfo}`)}`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `Contract ready for your review — ${data.propertyAddress}, ${data.city}`,
    showFooterCTA: false,
  })

  return { subject, html }
}

/* ═══════════════════════════════════════════════
   CONTRACT VIEWED — to wholesaler
   ═══════════════════════════════════════════════ */

export function formatContractViewedEmail(data: ContractEmailData): { subject: string; html: string } {
  const subject = `${data.buyerName} Viewed Your Contract — ${data.propertyAddress}`

  const infoRows: string[] = []
  if (data.viewedAt) infoRows.push(emailInfoRow('Opened', fmtDate(data.viewedAt)))
  if (data.sentAt) infoRows.push(emailInfoRow('Originally Sent', fmtDate(data.sentAt)))
  infoRows.push(emailInfoRow('Property', `${data.propertyAddress}, ${data.city}`))
  infoRows.push(emailInfoRow('Contract Type', data.contractType))

  const bodyHtml = `
${emailHeading(`${data.buyerName} Viewed Your Contract`)}
${emailText(`Your contract for <strong style="color:${brand.navy};">${data.propertyAddress}</strong> has been opened and viewed.`)}

${emailBanner('Contract Viewed', 'info')}

${infoRows.join('')}

${emailDivider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:4px 0 20px;">
  ${emailButton('View Contract', `${APP_URL}/contracts`)}
</td></tr>
</table>

${emailNote('Consider following up to answer any questions they might have. Quick follow-ups lead to faster closings.')}`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `${data.buyerName} opened your contract for ${data.propertyAddress}`,
    showFooterCTA: true,
  })

  return { subject, html }
}

/* ═══════════════════════════════════════════════
   CONTRACT SIGNED — to wholesaler
   ═══════════════════════════════════════════════ */

export function formatContractSignedEmail(data: ContractEmailData): { subject: string; html: string } {
  const subject = `Signature Received — ${data.buyerName} signed for ${data.propertyAddress}`

  const infoRows: string[] = []
  infoRows.push(emailInfoRow('Buyer', data.buyerName, brand.navy))
  if (data.signedAt) infoRows.push(emailInfoRow('Signed', fmtDate(data.signedAt), brand.green))
  infoRows.push(emailInfoRow('Property', `${data.propertyAddress}, ${data.city}`))
  if (data.contractPrice) infoRows.push(emailInfoRow('Contract Price', data.contractPrice, brand.navy))

  const bodyHtml = `
${emailHeading('Signature Received!')}
${emailText(`<strong style="color:${brand.navy};">${data.buyerName}</strong> has signed the contract for <strong style="color:${brand.navy};">${data.propertyAddress}, ${data.city} ${data.state}</strong>. The contract is ready for final execution.`)}

${emailBanner('Buyer has signed — ready to execute', 'success')}

${infoRows.join('')}

${emailDivider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:4px 0 20px;">
  ${emailButton('Execute Contract', `${APP_URL}/contracts`, brand.green)}
</td></tr>
</table>

${emailNote('Once you confirm execution, both parties will be notified and the deal will be marked as closed.')}`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `${data.buyerName} signed the contract for ${data.propertyAddress} — ready to execute`,
    showFooterCTA: true,
  })

  return { subject, html }
}

/* ═══════════════════════════════════════════════
   CONTRACT EXECUTED — to both buyer and wholesaler
   ═══════════════════════════════════════════════ */

export function formatContractExecutedEmail(
  data: ContractEmailData,
  recipient: 'buyer' | 'wholesaler',
): { subject: string; html: string } {
  const subject = `Deal Closed — ${data.propertyAddress}`

  const termRows: string[] = []
  termRows.push(emailInfoRow('Property', `${data.propertyAddress}, ${data.city} ${data.state}`))
  if (data.contractPrice) termRows.push(emailInfoRow('Contract Price', data.contractPrice, brand.navy))
  if (data.assignmentFee && recipient === 'wholesaler') {
    termRows.push(emailInfoRow('Assignment Fee', data.assignmentFee, brand.green))
  }
  if (data.closingDate) termRows.push(emailInfoRow('Closing Date', data.closingDate))
  if (data.titleCompany) termRows.push(emailInfoRow('Title Company', data.titleCompany))

  const recipientName = recipient === 'buyer' ? data.buyerName : data.wholesalerName

  const personalNote = recipient === 'buyer'
    ? `Your closing is scheduled${data.closingDate ? ` for <strong>${data.closingDate}</strong>` : ''}${data.titleCompany ? ` at <strong>${data.titleCompany}</strong>` : ''}. Your wholesaler ${data.wholesalerName} will be in touch with next steps.`
    : `The contract for <strong style="color:${brand.navy};">${data.propertyAddress}</strong> has been fully executed.${data.assignmentFee ? ` Your assignment fee of <strong style="color:${brand.green};">${data.assignmentFee}</strong> is locked in.` : ''}`

  const bodyHtml = `
${emailHeading('Deal Closed — Congratulations!', { color: brand.green })}
${emailText(`Hi ${recipientName},`)}
${emailText(personalNote)}

${emailBanner('Contract Successfully Executed', 'success')}

${termRows.join('')}

${emailDivider()}

<!-- Parties -->
${emailHeading('Parties', { size: 'sm', color: brand.gray400 })}
${emailInfoRow('Assignor', data.wholesalerCompany || data.wholesalerName)}
${emailInfoRow('Assignee', data.buyerName)}

${emailDivider()}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:4px 0 20px;">
  ${emailButton('Download Contract PDF', `${APP_URL}/contracts`)}
</td></tr>
</table>`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `Congratulations! The contract for ${data.propertyAddress} has been executed.`,
    showFooterCTA: true,
  })

  return { subject, html }
}

/* ═══════════════════════════════════════════════
   CONTRACT VOIDED — to buyer
   ═══════════════════════════════════════════════ */

export function formatContractVoidedEmail(data: ContractEmailData): { subject: string; html: string } {
  const subject = `Contract Update — ${data.propertyAddress}`

  const contactInfo = [
    data.wholesalerEmail ? `<a href="mailto:${data.wholesalerEmail}" style="color:${brand.blue};text-decoration:none;">${data.wholesalerEmail}</a>` : '',
    data.wholesalerPhone ? `<a href="tel:${data.wholesalerPhone}" style="color:${brand.blue};text-decoration:none;">${data.wholesalerPhone}</a>` : '',
  ].filter(Boolean).join(' &middot; ')

  const bodyHtml = `
${emailHeading('Contract Update')}
${emailText(`Hi ${data.buyerName},`)}
${emailText(`The contract for <strong style="color:${brand.navy};">${data.propertyAddress}, ${data.city}, ${data.state} ${data.zip}</strong> has been cancelled.`)}

${data.voidReason ? `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr><td style="background-color:${brand.gray50};border:1px solid ${brand.gray200};border-radius:6px;padding:16px 20px;">
  <span style="font-family:${brand.font};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:${brand.gray400};display:block;margin-bottom:6px;">Reason</span>
  <span style="font-family:${brand.font};font-size:14px;color:${brand.gray700};line-height:1.5;">${data.voidReason}</span>
</td></tr>
</table>` : ''}

${emailDivider()}

${emailText('If you have questions about this update, please reach out.')}
${emailText(`<strong>${data.wholesalerName}</strong>${data.wholesalerCompany ? ` (${data.wholesalerCompany})` : ''}<br/>${contactInfo}`, { size: '13px', color: brand.gray500 })}`

  const html = wrapInEmailTemplate(bodyHtml, {
    previewText: `The contract for ${data.propertyAddress} has been updated`,
    showFooterCTA: false,
  })

  return { subject, html }
}
