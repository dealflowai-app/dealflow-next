import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// ─── PATCH /api/notifications/[id] — mark as read ───────────────────────────

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  const notification = await prisma.notification.findFirst({
    where: { id, profileId: profile.id },
  })

  if (!notification) {
    return errorResponse(404, 'Notification not found')
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  })

  return successResponse({ notification: updated })
}

// ─── DELETE /api/notifications/[id] — delete a notification ─────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  const notification = await prisma.notification.findFirst({
    where: { id, profileId: profile.id },
  })

  if (!notification) {
    return errorResponse(404, 'Notification not found')
  }

  await prisma.notification.delete({ where: { id } })

  return successResponse({ success: true })
}
