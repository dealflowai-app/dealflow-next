import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

// ─── GET /api/analysis/history/[id] — Load full cached analysis ─────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  const { id } = await params

  try {
    const entry = await prisma.analysisCache.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!entry) return errorResponse(404, 'Analysis not found')

    return successResponse({
      analysis: entry.result,
      isExpired: entry.expiresAt <= new Date(),
      cachedAt: entry.cachedAt.toISOString(),
      rawAddress: entry.rawAddress,
    })
  } catch (err) {
    logger.error('Failed to load cached analysis', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
      cacheId: id,
    })
    return errorResponse(500, 'Internal server error')
  }
}

// ─── DELETE /api/analysis/history/[id] — Delete single cached analysis ──────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  const { id } = await params

  try {
    const entry = await prisma.analysisCache.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true },
    })
    if (!entry) return errorResponse(404, 'Analysis not found')

    await prisma.analysisCache.delete({ where: { id } })

    return successResponse({ success: true })
  } catch (err) {
    logger.error('Failed to delete cached analysis', {
      error: err instanceof Error ? err.message : String(err),
      userId: profile.id,
      cacheId: id,
    })
    return errorResponse(500, 'Internal server error')
  }
}
