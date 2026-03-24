import { NextRequest } from 'next/server'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { runBackgroundMatcher } from '@/lib/matching/background-matcher'

// ─── GET /api/cron/match — Run background deal matcher ──────────────────────
// Protected by a secret token. Called by Vercel Cron or external scheduler.
// Recommended schedule: every 6 hours

export async function GET(req: NextRequest) {
  // Verify cron secret — always required
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse(401, 'Unauthorized')
  }

  const result = await runBackgroundMatcher()

  return successResponse({
    success: true,
    ...result,
  })
}
