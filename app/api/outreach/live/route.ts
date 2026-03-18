import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { getActiveCalls } from '@/lib/outreach/live-call-service'

// GET /api/outreach/live — List all active calls for this profile
// Polled by the frontend every 3-5 seconds when Live Monitor is open
export async function GET() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const calls = await getActiveCalls(profile.id)

  return successResponse({
    calls,
    activeCount: calls.length,
    timestamp: new Date().toISOString(),
  })
}
