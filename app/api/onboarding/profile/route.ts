import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        firstName: true,
        lastName: true,
        company: true,
        phone: true,
        settings: true,
        onboardingCompleted: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (err) {
    logger.error('Profile fetch error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
