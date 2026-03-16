/**
 * Email Module — barrel export
 *
 * Usage:
 *   import { sendEmail, welcomeEmail } from '@/lib/email'
 */

export { sendEmail, sendEmailBatch, isSendGridConfigured } from './sendgrid'
export type { SendEmailOptions, SendEmailResult, EmailRecipient, EmailAttachment } from './sendgrid'

export {
  // Templates
  welcomeEmail,
  inquiryReceivedEmail,
  offerReceivedEmail,
  campaignReportEmail,
  dealAlertEmail,
  generalNotificationEmail,
  // Shared components (for custom templates)
  baseLayout,
  greeting,
  ctaButton,
  infoCard,
  statusBanner,
  textBlock,
  divider,
} from './templates'

export type {
  WelcomeEmailData,
  InquiryEmailData,
  OfferEmailData,
  CampaignReportData,
  DealAlertEmailData,
  GeneralNotificationData,
} from './templates'
