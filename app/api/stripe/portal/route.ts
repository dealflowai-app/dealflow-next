import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 5 portal requests per minute per user
    const rl = rateLimit(`stripe-portal:${user.id}`, 5, 60_000)
    if (!rl.allowed) return rateLimitResponse(rl.resetAt)

    const dbUser = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!dbUser?.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${req.nextUrl.origin}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error('Stripe portal error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}
