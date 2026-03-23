/**
 * Email Templates — barrel export
 *
 * Usage:
 *   import { formatDealBlastEmail, formatWelcomeEmail } from '@/lib/emails'
 */

// Master template + helpers
export {
  wrapInEmailTemplate,
  emailButton,
  emailDivider,
  emailStatCard,
  emailInfoRow,
  emailHeading,
  emailText,
  emailSpacer,
  emailBanner,
  emailMatchBadge,
  emailNote,
  emailPill,
  fmtCurrency,
  fmtDate,
  brand,
} from './template'
export type { EmailTemplateOptions } from './template'

// Deal blast
export { formatDealBlastEmail } from './deal-blast'
export type { DealEmailData, BuyerEmailData } from './deal-blast'

// Contract notifications
export {
  formatContractSentEmail,
  formatContractViewedEmail,
  formatContractSignedEmail,
  formatContractExecutedEmail,
  formatContractVoidedEmail,
} from './contract-notifications'
export type { ContractEmailData } from './contract-notifications'

// System emails
export {
  formatWelcomeEmail,
  formatDealMatchEmail,
  formatInquiryEmail,
  formatOfferEmail,
  formatCampaignReportEmail,
} from './system'
export type {
  WelcomeEmailData,
  DealMatchEmailData,
  InquiryEmailData,
  OfferEmailData,
  CampaignReportData,
} from './system'

// Weekly digest
export { formatWeeklyDigest } from './weekly-digest'
export type { DigestData } from './weekly-digest'
