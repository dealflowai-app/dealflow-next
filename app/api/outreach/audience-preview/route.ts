import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { buildAudience } from '@/lib/outreach/audience-builder'
import type { ComplianceChannel } from '@/lib/outreach'

const CHANNELS: ComplianceChannel[] = ['voice', 'sms', 'email']

// POST /api/outreach/audience-preview — Preview audience without creating a campaign
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  if (!body.filter || typeof body.filter !== 'object') {
    return errorResponse(400, 'Filter object is required')
  }

  const channel = (body.channel as ComplianceChannel) || 'voice'
  if (!CHANNELS.includes(channel)) {
    return errorResponse(400, 'Channel must be "voice", "sms", or "email"')
  }

  const result = await buildAudience(profile.id, body.filter as any, channel, {
    previewOnly: true,
    limit: 5000,
  })

  return successResponse({
    totalMatched: result.totalMatched,
    totalAfterDNC: result.totalAfterDNC,
    removedDNC: result.removedDNC,
    removedNoPhone: result.removedNoPhone,
    removedNoEmail: result.removedNoEmail,
    estimatedCost: result.estimatedCost,
    topBuyers: result.buyers.slice(0, 5).map(b => ({
      id: b.id,
      name: b.name,
      buyerScore: b.buyerScore,
      status: b.status,
      complianceStatus: b.complianceStatus,
    })),
  })
}
