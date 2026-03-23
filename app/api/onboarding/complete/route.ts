import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, company, phone, targetMarkets, experienceLevel } = body

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

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Onboarding complete error:', err)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
}
