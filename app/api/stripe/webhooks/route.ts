import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { createAllowanceForPeriod } from '@/lib/billing/allowances'
import Stripe from 'stripe'

// Disable body parsing so we can verify the raw signature
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Helpers ─────────────────────────────────────────────────

function priceIdToTier(priceId: string): string {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return 'business'
  // Backward compat for old enterprise price
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return 'business'
  return 'free'
}

async function findProfileByCustomerId(customerId: string) {
  return prisma.profile.findFirst({
    where: { stripeCustomerId: customerId },
  })
}

/** Extract current_period_start/end from the first subscription item */
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0]
  return {
    periodStart: item.current_period_start,
    periodEnd: item.current_period_end,
  }
}

/** Extract subscription ID from an invoice's parent (new Stripe API structure) */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details
  if (!details) return null
  return typeof details.subscription === 'string'
    ? details.subscription
    : details.subscription?.id ?? null
}

// ── Event handlers ──────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id
  const tier = priceIdToTier(priceId || '')
  const period = getSubscriptionPeriod(subscription)

  const profile = await findProfileByCustomerId(customerId)
  if (!profile) {
    console.error('No profile found for Stripe customer:', customerId)
    return
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      tier,
      tierStatus: subscription.status === 'trialing' ? 'trialing' : 'active',
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      currentPeriodEnd: new Date(period.periodEnd * 1000),
    },
  })

  // Create Usage record (legacy)
  await prisma.usage.upsert({
    where: {
      userId_periodStart: {
        userId: profile.id,
        periodStart: new Date(period.periodStart * 1000),
      },
    },
    update: {},
    create: {
      userId: profile.id,
      periodStart: new Date(period.periodStart * 1000),
      periodEnd: new Date(period.periodEnd * 1000),
    },
  })

  // Create UsageAllowance for this billing period
  const effectiveTier = subscription.status === 'trialing' ? 'trial' : tier
  await createAllowanceForPeriod(
    profile.id,
    effectiveTier,
    new Date(period.periodStart * 1000),
    new Date(period.periodEnd * 1000),
  )

  console.log(`Profile ${profile.id} subscribed to ${tier} (${subscription.status})`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id
  const tier = priceIdToTier(priceId || '')
  const period = getSubscriptionPeriod(subscription)

  const profile = await findProfileByCustomerId(customerId)
  if (!profile) return

  let tierStatus = 'active'
  if (subscription.status === 'trialing') tierStatus = 'trialing'
  else if (subscription.status === 'past_due') tierStatus = 'past_due'
  else if (subscription.status === 'canceled' || subscription.status === 'unpaid') tierStatus = 'cancelled'

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      tier: tierStatus === 'cancelled' ? 'free' : tier,
      tierStatus,
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      currentPeriodEnd: new Date(period.periodEnd * 1000),
    },
  })

  // Update allowance if tier changed
  if (tierStatus !== 'cancelled') {
    const effectiveTier = tierStatus === 'trialing' ? 'trial' : tier
    await createAllowanceForPeriod(
      profile.id,
      effectiveTier,
      new Date(period.periodStart * 1000),
      new Date(period.periodEnd * 1000),
    )
  }

  console.log(`Profile ${profile.id} subscription updated: ${tier} (${tierStatus})`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const profile = await findProfileByCustomerId(customerId)
  if (!profile) return

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      tier: 'free',
      tierStatus: 'cancelled',
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
    },
  })

  // Zero out allowances for current period
  const now = new Date()
  const currentAllowance = await prisma.usageAllowance.findFirst({
    where: {
      profileId: profile.id,
      periodStart: { lte: now },
      periodEnd: { gt: now },
    },
  })
  if (currentAllowance) {
    await prisma.usageAllowance.update({
      where: { id: currentAllowance.id },
      data: {
        revealsAllowed: 0,
        callMinutesAllowed: 0,
        smsAllowed: 0,
        analysesAllowed: 0,
      },
    })
  }

  console.log(`Profile ${profile.id} subscription cancelled, reverted to free`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const profile = await findProfileByCustomerId(customerId)
  if (!profile) return

  await prisma.paymentHistory.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: {
      status: 'paid',
      paidAt: new Date(),
    },
    create: {
      userId: profile.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      description: invoice.lines.data[0]?.description || 'DealFlow AI subscription',
      invoiceUrl: invoice.hosted_invoice_url,
      paidAt: new Date(),
    },
  })

  // If the subscription was past_due, mark it active again
  if (profile.tierStatus === 'past_due') {
    await prisma.profile.update({
      where: { id: profile.id },
      data: { tierStatus: 'active' },
    })
  }

  // Reset usage for new billing period — create fresh allowance
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const period = getSubscriptionPeriod(subscription)
    const tier = priceIdToTier(subscription.items.data[0]?.price.id || '')

    // Legacy Usage record
    await prisma.usage.upsert({
      where: {
        userId_periodStart: {
          userId: profile.id,
          periodStart: new Date(period.periodStart * 1000),
        },
      },
      update: {},
      create: {
        userId: profile.id,
        periodStart: new Date(period.periodStart * 1000),
        periodEnd: new Date(period.periodEnd * 1000),
      },
    })

    // Fresh UsageAllowance for the new period
    await createAllowanceForPeriod(
      profile.id,
      tier,
      new Date(period.periodStart * 1000),
      new Date(period.periodEnd * 1000),
    )
  }

  console.log(`Payment recorded for profile ${profile.id}: $${(invoice.amount_paid / 100).toFixed(2)}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const profile = await findProfileByCustomerId(customerId)
  if (!profile) return

  await prisma.profile.update({
    where: { id: profile.id },
    data: { tierStatus: 'past_due' },
  })

  await prisma.paymentHistory.upsert({
    where: { stripeInvoiceId: invoice.id },
    update: { status: 'failed' },
    create: {
      userId: profile.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      description: 'Payment failed',
      invoiceUrl: invoice.hosted_invoice_url,
    },
  })

  console.log(`Payment failed for profile ${profile.id}`)
}

// ── Main handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
