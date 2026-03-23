import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const { id } = await params

    const view = await prisma.savedView.findUnique({ where: { id } })
    if (!view || view.profileId !== profile.id) {
      return errorResponse(404, 'Saved view not found')
    }

    await prisma.savedView.delete({ where: { id } })

    return successResponse({ deleted: true })
  } catch {
    return errorResponse(500, 'Failed to delete saved view')
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const { id } = await params
    const { body, error: parseError } = await parseBody(req)
    if (!body) return errorResponse(400, parseError!)

    const view = await prisma.savedView.findUnique({ where: { id } })
    if (!view || view.profileId !== profile.id) {
      return errorResponse(404, 'Saved view not found')
    }

    const data: Record<string, unknown> = {}
    if (typeof body.notify === 'boolean') data.notify = body.notify
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()

    const updated = await prisma.savedView.update({
      where: { id },
      data,
    })

    return successResponse({ view: updated })
  } catch {
    return errorResponse(500, 'Failed to update saved view')
  }
}
