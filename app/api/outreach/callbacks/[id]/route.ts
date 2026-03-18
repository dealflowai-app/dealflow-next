import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

const VALID_STATUSES = ['scheduled', 'completed', 'missed', 'cancelled']

// Helper: fetch callback with ownership check
async function getCallbackWithAuth(callbackId: string, profileId: string) {
  const callback = await prisma.scheduledCallback.findUnique({
    where: { id: callbackId },
    include: {
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          entityName: true,
          phone: true,
          email: true,
          state: true,
          buyerScore: true,
        },
      },
    },
  })
  if (!callback) return { callback: null, error: 'Callback not found', status: 404 }
  if (callback.profileId !== profileId) return { callback: null, error: 'Callback not found', status: 404 }
  return { callback, error: null, status: 200 }
}

// GET /api/outreach/callbacks/[id] — Get a single callback
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const result = await getCallbackWithAuth(id, profile.id)
  if (!result.callback) return errorResponse(result.status, result.error!)

  return successResponse({ callback: result.callback })
}

// PATCH /api/outreach/callbacks/[id] — Update callback (reschedule, complete, cancel)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const result = await getCallbackWithAuth(id, profile.id)
  if (!result.callback) return errorResponse(result.status, result.error!)

  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
  if (body.status !== undefined) {
    v.enumValue('status', body.status, VALID_STATUSES, 'Status')
  }
  if (body.notes !== undefined) {
    v.string('notes', body.notes, { maxLength: 1000, label: 'Notes' })
  }
  if (body.reason !== undefined) {
    v.string('reason', body.reason, { maxLength: 500, label: 'Reason' })
  }
  if (!v.isValid()) return v.toResponse()

  const data: Record<string, unknown> = {}

  // Reschedule
  if (body.scheduledAt !== undefined) {
    if (result.callback.status !== 'scheduled') {
      return errorResponse(400, 'Can only reschedule callbacks with status "scheduled"')
    }
    const newTime = new Date(body.scheduledAt as string)
    if (isNaN(newTime.getTime())) return errorResponse(400, 'Invalid scheduled time')
    if (newTime < new Date()) return errorResponse(400, 'Scheduled time must be in the future')
    data.scheduledAt = newTime
  }

  // Status transition
  if (body.status !== undefined) {
    const current = result.callback.status
    const next = body.status as string

    // Only allow valid transitions
    const allowed: Record<string, string[]> = {
      scheduled: ['completed', 'missed', 'cancelled'],
      missed: ['scheduled'], // Can reschedule a missed callback
      completed: [],
      cancelled: ['scheduled'], // Can re-open a cancelled callback
    }

    if (!allowed[current]?.includes(next)) {
      return errorResponse(400, `Cannot transition from "${current}" to "${next}"`)
    }

    data.status = next
    if (next === 'completed') data.completedAt = new Date()
  }

  if (body.notes !== undefined) data.notes = body.notes
  if (body.reason !== undefined) data.reason = body.reason

  if (Object.keys(data).length === 0) {
    return errorResponse(400, 'No valid fields to update')
  }

  const updated = await prisma.scheduledCallback.update({
    where: { id },
    data,
    include: {
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          entityName: true,
          phone: true,
          email: true,
          state: true,
          buyerScore: true,
        },
      },
    },
  })

  return successResponse({ callback: updated })
}

// DELETE /api/outreach/callbacks/[id] — Delete a callback
export async function DELETE(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const result = await getCallbackWithAuth(id, profile.id)
  if (!result.callback) return errorResponse(result.status, result.error!)

  await prisma.scheduledCallback.delete({ where: { id } })

  return successResponse({ deleted: true })
}
