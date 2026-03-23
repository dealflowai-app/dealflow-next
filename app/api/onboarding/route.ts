import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { formatWelcomeEmail } from '@/lib/emails'
import { stripe } from '@/lib/stripe'
import { seedDemoData } from '@/lib/demo-data'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { firstName, lastName, phone, primaryMarket, experienceLevel } = await request.json()

    const settings = {
      ...(primaryMarket && { primaryMarket }),
      ...(experienceLevel && { experienceLevel }),
    }

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, email: user.email!, firstName, lastName, phone, role: 'WHOLESALER', settings, onboardingCompleted: true },
      update: { firstName, lastName, phone, settings, onboardingCompleted: true },
    })

    // Mark profile as completed in user_metadata so middleware can check
    await supabase.auth.updateUser({
      data: { onboarded: true, phone: phone || null },
    })

    // Create Stripe customer and set up free trial
    try {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          userId: user.id,
          firstName: firstName || '',
          lastName: lastName || '',
        },
      })

      await prisma.profile.update({
        where: { id: profile.id },
        data: {
          stripeCustomerId: customer.id,
          tier: 'free',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        },
      })

      // Create initial usage record for the current period
      await prisma.usage.create({
        data: {
          userId: profile.id,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    } catch (stripeErr) {
      console.error('Stripe customer creation failed:', stripeErr)
      // Don't block onboarding if Stripe fails — customer can be created later
    }

    // Send welcome email (fire-and-forget)
    if (firstName && user.email) {
      const { subject, html, text } = formatWelcomeEmail({ firstName })
      sendEmail({
        to: { email: user.email, name: `${firstName} ${lastName || ''}`.trim() },
        subject,
        html,
        text,
        categories: ['onboarding', 'welcome'],
      }).catch((err) => console.error('Welcome email failed:', err))
    }

    // Seed demo data before responding so it's ready when dashboard loads
    try {
      await seedDemoData(profile.id)
    } catch (err) {
      console.error('Demo data seeding failed:', err)
    }

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
