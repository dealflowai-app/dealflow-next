/**
 * Admin Notification Emails
 *
 * Sends email alerts to the site owner (ADMIN_NOTIFICATION_EMAIL) when
 * important events happen: new signups, subscription changes, failed
 * payments, etc.
 */

import { sendEmail } from './sendgrid'
import { baseLayout, greeting, infoCard, statusBanner, ctaButton, textBlock, divider } from './templates'
import { logger } from '@/lib/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.app'

function getAdminEmail(): string | null {
  return process.env.ADMIN_NOTIFICATION_EMAIL || null
}

/** Fire-and-forget admin notification — never throws, never blocks */
async function notifyAdmin(options: {
  subject: string
  html: string
  text: string
  categories?: string[]
}) {
  const adminEmail = getAdminEmail()
  if (!adminEmail) return

  try {
    await sendEmail({
      to: { email: adminEmail, name: 'DealFlow AI Admin' },
      subject: options.subject,
      html: options.html,
      text: options.text,
      categories: ['admin-notification', ...(options.categories || [])],
    })
  } catch (err) {
    logger.error('Admin notification failed', {
      subject: options.subject,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/* ═══════════════════════════════════════════════
   NEW USER REGISTRATION
   ═══════════════════════════════════════════════ */

export interface NewUserNotificationData {
  firstName: string
  lastName?: string
  email: string
  phone?: string | null
  primaryMarket?: string | null
  experienceLevel?: string | null
}

export function notifyAdminNewUser(data: NewUserNotificationData) {
  const fullName = `${data.firstName} ${data.lastName || ''}`.trim()

  const rows = [
    { label: 'Name', value: fullName },
    { label: 'Email', value: data.email },
    ...(data.phone ? [{ label: 'Phone', value: data.phone }] : []),
    ...(data.primaryMarket ? [{ label: 'Market', value: data.primaryMarket }] : []),
    ...(data.experienceLevel ? [{ label: 'Experience', value: data.experienceLevel }] : []),
  ]

  const html = baseLayout(
    `
${greeting('Admin', `A new user just signed up for DealFlow AI.`)}

${statusBanner('New User Registration', 'success')}

${infoCard('User Details', rows)}

${textBlock(`They've been set up with a free tier and 14-day trial.`)}

${ctaButton('View in Stripe', 'https://dashboard.stripe.com/customers')}
`,
    {
      headerRight: 'New Signup',
      preheader: `New signup: ${fullName} (${data.email})`,
    },
  )

  const text = `New User Registration\n\nName: ${fullName}\nEmail: ${data.email}${data.phone ? `\nPhone: ${data.phone}` : ''}${data.primaryMarket ? `\nMarket: ${data.primaryMarket}` : ''}${data.experienceLevel ? `\nExperience: ${data.experienceLevel}` : ''}`

  return notifyAdmin({
    subject: `New Signup: ${fullName} (${data.email})`,
    html,
    text,
    categories: ['new-user'],
  })
}

/* ═══════════════════════════════════════════════
   NEW SUBSCRIPTION (checkout completed)
   ═══════════════════════════════════════════════ */

export interface SubscriptionNotificationData {
  email: string
  name?: string
  tier: string
  status: string
  profileId: string
}

export function notifyAdminNewSubscription(data: SubscriptionNotificationData) {
  const tierLabel = data.tier.charAt(0).toUpperCase() + data.tier.slice(1)
  const displayName = data.name || data.email

  const rows = [
    { label: 'User', value: displayName },
    { label: 'Email', value: data.email },
    { label: 'Plan', value: tierLabel, color: '#059669' },
    { label: 'Status', value: data.status },
  ]

  const html = baseLayout(
    `
${greeting('Admin', `A user just subscribed to a paid plan.`)}

${statusBanner(`New ${tierLabel} Subscription`, 'success')}

${infoCard('Subscription Details', rows)}

${ctaButton('View in Stripe', 'https://dashboard.stripe.com/subscriptions')}
`,
    {
      headerRight: 'New Subscription',
      preheader: `${displayName} subscribed to ${tierLabel}`,
    },
  )

  const text = `New Subscription\n\nUser: ${displayName}\nEmail: ${data.email}\nPlan: ${tierLabel}\nStatus: ${data.status}`

  return notifyAdmin({
    subject: `New Subscription: ${displayName} → ${tierLabel}`,
    html,
    text,
    categories: ['subscription'],
  })
}

/* ═══════════════════════════════════════════════
   SUBSCRIPTION CANCELLED
   ═══════════════════════════════════════════════ */

export interface CancellationNotificationData {
  email: string
  name?: string
  previousTier: string
  profileId: string
}

export function notifyAdminCancellation(data: CancellationNotificationData) {
  const tierLabel = data.previousTier.charAt(0).toUpperCase() + data.previousTier.slice(1)
  const displayName = data.name || data.email

  const rows = [
    { label: 'User', value: displayName },
    { label: 'Email', value: data.email },
    { label: 'Previous Plan', value: tierLabel },
  ]

  const html = baseLayout(
    `
${greeting('Admin', `A user just cancelled their subscription.`)}

${statusBanner('Subscription Cancelled', 'warning')}

${infoCard('Details', rows)}

${textBlock('Their account has been reverted to the free tier. Consider reaching out to understand why they cancelled.')}

${ctaButton('View in Stripe', 'https://dashboard.stripe.com/subscriptions?status=canceled')}
`,
    {
      headerRight: 'Cancellation',
      preheader: `${displayName} cancelled their ${tierLabel} subscription`,
    },
  )

  const text = `Subscription Cancelled\n\nUser: ${displayName}\nEmail: ${data.email}\nPrevious Plan: ${tierLabel}\n\nAccount reverted to free tier.`

  return notifyAdmin({
    subject: `Cancellation: ${displayName} left ${tierLabel}`,
    html,
    text,
    categories: ['cancellation'],
  })
}

/* ═══════════════════════════════════════════════
   PAYMENT RECEIVED
   ═══════════════════════════════════════════════ */

export interface PaymentNotificationData {
  email: string
  name?: string
  amount: number // cents
  currency: string
  tier?: string
}

export function notifyAdminPayment(data: PaymentNotificationData) {
  const displayName = data.name || data.email
  const amountStr = `$${(data.amount / 100).toFixed(2)}`

  const rows = [
    { label: 'User', value: displayName },
    { label: 'Amount', value: amountStr, color: '#059669' },
    ...(data.tier ? [{ label: 'Plan', value: data.tier.charAt(0).toUpperCase() + data.tier.slice(1) }] : []),
  ]

  const html = baseLayout(
    `
${greeting('Admin', `A payment was received.`)}

${statusBanner(`Payment: ${amountStr}`, 'success')}

${infoCard('Payment Details', rows)}

${ctaButton('View in Stripe', 'https://dashboard.stripe.com/payments')}
`,
    {
      headerRight: 'Payment',
      preheader: `Payment received: ${amountStr} from ${displayName}`,
    },
  )

  const text = `Payment Received\n\nUser: ${displayName}\nAmount: ${amountStr}${data.tier ? `\nPlan: ${data.tier}` : ''}`

  return notifyAdmin({
    subject: `Payment: ${amountStr} from ${displayName}`,
    html,
    text,
    categories: ['payment'],
  })
}

/* ═══════════════════════════════════════════════
   PAYMENT FAILED
   ═══════════════════════════════════════════════ */

export interface PaymentFailedNotificationData {
  email: string
  name?: string
  amount: number // cents
  currency: string
  invoiceUrl?: string | null
}

export function notifyAdminPaymentFailed(data: PaymentFailedNotificationData) {
  const displayName = data.name || data.email
  const amountStr = `$${(data.amount / 100).toFixed(2)}`

  const rows = [
    { label: 'User', value: displayName },
    { label: 'Email', value: data.email },
    { label: 'Amount Due', value: amountStr, color: '#b91c1c' },
  ]

  const html = baseLayout(
    `
${greeting('Admin', `A payment just failed. The user's account has been marked as past due.`)}

${statusBanner('Payment Failed', 'error')}

${infoCard('Details', rows)}

${textBlock('Stripe will automatically retry the payment. If it continues to fail, consider reaching out to the user.')}

${ctaButton('View in Stripe', 'https://dashboard.stripe.com/payments?status=requires_payment_method')}
`,
    {
      headerRight: 'Payment Failed',
      preheader: `Payment failed: ${amountStr} from ${displayName}`,
    },
  )

  const text = `Payment Failed\n\nUser: ${displayName}\nEmail: ${data.email}\nAmount Due: ${amountStr}\n\nAccount marked as past due. Stripe will retry automatically.`

  return notifyAdmin({
    subject: `Payment Failed: ${amountStr} from ${displayName}`,
    html,
    text,
    categories: ['payment-failed'],
  })
}
