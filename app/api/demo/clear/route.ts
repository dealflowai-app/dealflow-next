import { getAuthProfile } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { clearDemoData } from '@/lib/demo-data'

export async function POST() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  try {
    const result = await clearDemoData(profile.id)
    return successResponse(result)
  } catch (err) {
    console.error('Demo clear error:', err)
    return errorResponse(500, 'Failed to clear demo data')
  }
}
