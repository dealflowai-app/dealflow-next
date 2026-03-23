import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// ─── GET /api/notifications/count — unread notification count ────────────────

export async function GET() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const count = await prisma.notification.count({
    where: { profileId: profile.id, read: false },
  })

  return successResponse({ count })
}
