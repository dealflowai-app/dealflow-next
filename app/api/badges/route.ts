import { NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { getBadgesWithProgress, checkAndAwardBadges } from '@/lib/badges'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    // Check and award any new badges first
    const newlyAwarded = await checkAndAwardBadges(profile.id)

    // Then get full badge data with progress
    const badges = await getBadgesWithProgress(profile.id)

    return NextResponse.json({ badges, newlyAwarded })
  } catch (err) {
    logger.error('[badges] GET error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
