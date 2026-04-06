import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { seedDemoData } from '@/lib/demo-data'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, company, phone, targetMarkets, experienceLevel, focus } = body

    // Fetch existing profile to merge settings
    const existing = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { settings: true },
    })

    const existingSettings = (existing?.settings as Record<string, unknown>) || {}
    const mergedSettings = {
      ...existingSettings,
      ...(targetMarkets && { targetMarkets }),
      ...(experienceLevel && { experienceLevel }),
      ...(focus && { focus }),
    }

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email: user.email!,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        phone: phone || null,
        role: 'WHOLESALER',
        onboardingCompleted: true,
        settings: mergedSettings,
      },
      update: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(company && { company }),
        ...(phone && { phone }),
        onboardingCompleted: true,
        settings: mergedSettings,
      },
    })

    // Mark onboarding complete in Supabase user metadata so middleware allows access
    await supabase.auth.updateUser({
      data: { onboarded: true },
    })

    // Seed demo data before responding so it's ready when dashboard loads
    try {
      await seedDemoData(profile.id)
    } catch (err) {
      logger.error('Demo data seeding failed', { error: err instanceof Error ? err.message : String(err) })
    }

    return NextResponse.json({ profile })
  } catch (err) {
    logger.error('Onboarding complete error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
}
