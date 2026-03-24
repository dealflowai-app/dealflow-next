import { getAuthProfile } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { seedDemoData } from '@/lib/demo-data'
import { logger } from '@/lib/logger'

export async function POST() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  try {
    // Check if demo data already exists
    const settings = (profile.settings as Record<string, unknown>) || {}
    if (settings.demoMode === true && settings.demoData) {
      return errorResponse(409, 'Demo data already seeded. Clear it first.')
    }

    const demoData = await seedDemoData(profile.id)
    return successResponse({ seeded: true, demoData }, 201)
  } catch (err) {
    logger.error('Demo seed error', { error: err instanceof Error ? err.message : String(err) })
    return errorResponse(500, 'Failed to seed demo data')
  }
}
