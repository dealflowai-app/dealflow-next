/**
 * Contract Notification Service
 *
 * Sends email notifications on contract status changes.
 * Uses the shared SendGrid/mock email provider from deal-outreach.ts.
 * Designed for fire-and-forget usage — never throws.
 */

import { getEmailSender } from '@/lib/deal-outreach'
import type { SendResult } from '@/lib/deal-outreach'
import {
  type ContractEmailData,
  formatContractSentEmail,
  formatContractExecutedEmail,
  formatContractVoidedEmail,
} from './emails'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type ContractNotificationType = 'SENT' | 'EXECUTED' | 'VOIDED'

export interface NotificationResult {
  success: boolean
  recipients: string[]
  errors?: string[]
  timestamp: string
}

export interface NotificationLogEntry {
  type: ContractNotificationType
  recipients: string[]
  success: boolean
  timestamp: string
  errors?: string[]
}

interface ContractForNotification {
  id: string
  templateName: string
  status: string
  voidReason?: string | null
  filledData?: Record<string, string> | null
  deal: {
    address: string
    city: string
    state: string
    zip: string
    askingPrice: number
    assignFee?: number | null
  }
  offer?: {
    amount: number
    buyer?: {
      firstName?: string | null
      lastName?: string | null
      entityName?: string | null
      email?: string | null
    } | null
  } | null
}

interface ProfileForNotification {
  firstName?: string | null
  lastName?: string | null
  email: string
  company?: string | null
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function fmtCurrency(n: number | null | undefined): string | null {
  if (n == null) return null
  return '$' + n.toLocaleString()
}

function buildEmailData(
  contract: ContractForNotification,
  profile: ProfileForNotification,
): ContractEmailData {
  const buyer = contract.offer?.buyer
  const buyerName =
    [buyer?.firstName, buyer?.lastName].filter(Boolean).join(' ') ||
    buyer?.entityName ||
    'Buyer'

  const filledData = contract.filledData ?? {}
  const wholesalerName =
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Wholesaler'

  return {
    propertyAddress: contract.deal.address,
    city: contract.deal.city,
    state: contract.deal.state,
    zip: contract.deal.zip,
    buyerName,
    buyerEmail: buyer?.email,
    contractPrice: fmtCurrency(contract.offer?.amount ?? contract.deal.askingPrice),
    assignmentFee: fmtCurrency(contract.deal.assignFee),
    closingDate: filledData.closing_date || filledData.closingDate || null,
    titleCompany: filledData.title_company || filledData.titleCompany || null,
    contractType: contract.templateName,
    wholesalerName,
    wholesalerCompany: profile.company,
    wholesalerEmail: profile.email,
    voidReason: contract.voidReason,
  }
}

/* ═══════════════════════════════════════════════
   MAIN SEND FUNCTION
   ═══════════════════════════════════════════════ */

export async function sendContractNotification(
  type: ContractNotificationType,
  contract: ContractForNotification,
  profile: ProfileForNotification,
): Promise<NotificationResult> {
  const timestamp = new Date().toISOString()
  const sendEmail = getEmailSender()
  const emailData = buildEmailData(contract, profile)

  const recipients: string[] = []
  const errors: string[] = []
  const sends: Promise<{ to: string; result: SendResult }>[] = []

  const buyerEmail = contract.offer?.buyer?.email

  switch (type) {
    case 'SENT': {
      if (buyerEmail) {
        const { subject, html } = formatContractSentEmail(emailData)
        sends.push(
          sendEmail(buyerEmail, subject, html).then((result) => ({ to: buyerEmail, result })),
        )
      }
      break
    }

    case 'EXECUTED': {
      if (buyerEmail) {
        const { subject, html } = formatContractExecutedEmail(emailData, 'buyer')
        sends.push(
          sendEmail(buyerEmail, subject, html).then((result) => ({ to: buyerEmail, result })),
        )
      }
      // Also notify the wholesaler
      const { subject, html } = formatContractExecutedEmail(emailData, 'wholesaler')
      sends.push(
        sendEmail(profile.email, subject, html).then((result) => ({
          to: profile.email,
          result,
        })),
      )
      break
    }

    case 'VOIDED': {
      if (buyerEmail) {
        const { subject, html } = formatContractVoidedEmail(emailData)
        sends.push(
          sendEmail(buyerEmail, subject, html).then((result) => ({ to: buyerEmail, result })),
        )
      }
      break
    }
  }

  if (sends.length === 0) {
    return { success: true, recipients: [], timestamp }
  }

  const results = await Promise.allSettled(sends)

  for (const r of results) {
    if (r.status === 'fulfilled') {
      recipients.push(r.value.to)
      if (!r.value.result.success) {
        errors.push(`${r.value.to}: ${r.value.result.error || 'Send failed'}`)
      }
    } else {
      errors.push(r.reason?.message || 'Unknown send error')
    }
  }

  return {
    success: errors.length === 0,
    recipients,
    timestamp,
    ...(errors.length > 0 ? { errors } : {}),
  }
}
