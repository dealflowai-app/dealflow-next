import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import type { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const page = req.nextUrl.searchParams.get('page')
    if (!page || !['crm', 'deals', 'discovery'].includes(page)) {
      return errorResponse(400, 'page query param required (crm or deals)')
    }

    const views = await prisma.savedView.findMany({
      where: { profileId: profile.id, page },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse({ views })
  } catch {
    return errorResponse(500, 'Failed to fetch saved views')
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return errorResponse(status, error!)

    const { body, error: parseError } = await parseBody(req)
    if (!body) return errorResponse(400, parseError!)

    const { page, name, filters, isDefault } = body as {
      page?: string
      name?: string
      filters?: Record<string, unknown>
      isDefault?: boolean
    }

    if (!page || !['crm', 'deals', 'discovery'].includes(page)) {
      return errorResponse(400, 'page is required (crm or deals)')
    }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse(400, 'name is required')
    }
    if (!filters || typeof filters !== 'object') {
      return errorResponse(400, 'filters object is required')
    }

    // If setting as default, unset any existing default for this page
    if (isDefault) {
      await prisma.savedView.updateMany({
        where: { profileId: profile.id, page, isDefault: true },
        data: { isDefault: false },
      })
    }

    const view = await prisma.savedView.create({
      data: {
        profileId: profile.id,
        page,
        name: name.trim(),
        filters: filters as Prisma.InputJsonValue,
        isDefault: isDefault || false,
      },
    })

    return successResponse({ view }, 201)
  } catch {
    return errorResponse(500, 'Failed to create saved view')
  }
}
