import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ callId: string }> }

// GET /api/outreach/intelligence/call/[callId] — Single call intelligence
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { callId } = await params

  const intel = await prisma.callIntelligence.findUnique({
    where: { callId },
  })

  if (!intel) return errorResponse(404, 'No intelligence data for this call')
  if (intel.profileId !== profile.id) return errorResponse(404, 'Not found')

  return successResponse({ intelligence: intel })
}
