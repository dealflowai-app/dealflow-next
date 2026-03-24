import { getAuthProfile } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { clearDemoData } from '@/lib/demo-data'
import { logger } from '@/lib/logger'

export async function POST() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  try {
    const result = await clearDemoData(profile.id)
    return successResponse(result)
  } catch (err) {
    logger.error('Demo clear error', { error: err instanceof Error ? err.message : String(err) })
    return errorResponse(500, 'Failed to clear demo data')
  }
}
