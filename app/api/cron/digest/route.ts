import { NextRequest } from 'next/server'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { sendDigestEmails } from '@/lib/notifications/email-digest'

// ─── GET /api/cron/digest — Send email digests ──────────────────────────────
// Protected by a secret token. Called by Vercel Cron or external scheduler.
//
// Schedule:
//   Daily digests: every day at 8:00 AM (UTC or user TZ)
//   Weekly digests: every Monday at 8:00 AM
//
// Pass ?frequency=daily or ?frequency=weekly

export async function GET(req: NextRequest) {
  // Verify cron secret — always required
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse(401, 'Unauthorized')
  }

  const frequency = req.nextUrl.searchParams.get('frequency')

  if (frequency !== 'daily' && frequency !== 'weekly') {
    return errorResponse(400, 'frequency must be "daily" or "weekly"')
  }

  const result = await sendDigestEmails(frequency)

  return successResponse({
    success: true,
    frequency,
    ...result,
  })
}
