import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { seedDemoData } from '@/lib/demo-data'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
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

    const profile = await prisma.profile.update({
      where: { userId: user.id },
      data: {
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

    // Seed demo data (fire-and-forget) so user has sample data to explore
    seedDemoData(profile.id).catch((err) =>
      console.error('Demo data seeding failed:', err)
    )

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Onboarding complete error:', err)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
}
