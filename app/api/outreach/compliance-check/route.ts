import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { checkCompliance } from '@/lib/outreach'

// POST /api/outreach/compliance-check — Run full compliance check
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  const phone = body.phone as string | undefined
  const channel = body.channel as string | undefined
  const state = body.state as string | undefined

  if (!phone) return errorResponse(400, 'Phone number is required')
  if (!channel || !['voice', 'sms', 'email'].includes(channel)) {
    return errorResponse(400, 'Channel must be "voice", "sms", or "email"')
  }

  const result = await checkCompliance(phone, channel as any, profile.id, {
    state: state || null,
    campaignId: body.campaignId as string | undefined,
    buyerId: body.buyerId as string | undefined,
  })

  return successResponse(result as any)
}
