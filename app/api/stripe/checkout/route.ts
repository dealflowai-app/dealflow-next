import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { priceId } = await req.json()
    if (!priceId) return NextResponse.json({ error: 'Price ID required' }, { status: 400 })

    // Get or create Stripe customer
    const dbUser = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let customerId = dbUser.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await prisma.profile.update({
        where: { id: dbUser.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Determine tier from price ID for metadata
    let tier = 'starter'
    if (priceId === process.env.STRIPE_PRO_PRICE_ID) tier = 'pro'
    else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID || priceId === process.env.STRIPE_BUSINESS_PRICE_ID) tier = 'enterprise'

    // 7-day free trial for new subscribers (no active subscription)
    const isNewSubscriber = !dbUser.stripeSubscriptionId || dbUser.tier === 'free'

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.nextUrl.origin}/dashboard?upgraded=true`,
      cancel_url: `${req.nextUrl.origin}/pricing`,
      subscription_data: {
        trial_period_days: isNewSubscriber ? 7 : undefined,
        metadata: {
          userId: user.id,
          tier,
        },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
