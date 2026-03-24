import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ─── GET /api/messages/users?q=search — search users to message ──────────────

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return successResponse({ users: [] })

  try {
    const users = await prisma.profile.findMany({
      where: {
        id: { not: profile.id },
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        company: true,
      },
      take: 10,
    })

    return successResponse({ users })
  } catch (err) {
    logger.error('GET /api/messages/users error', { route: '/api/messages/users', error: err instanceof Error ? err.message : String(err) })
    return errorResponse(500, 'Failed to search users')
  }
}
