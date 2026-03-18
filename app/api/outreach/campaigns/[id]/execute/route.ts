import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { executeCampaignBatch } from '@/lib/outreach/campaign-executor'

type Params = { params: Promise<{ id: string }> }

// POST /api/outreach/campaigns/[id]/execute — Manually trigger batch execution
export async function POST(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params

  const campaign = await prisma.campaign.findUnique({ where: { id } })
  if (!campaign || campaign.profileId !== profile.id) {
    return errorResponse(404, 'Campaign not found')
  }

  if (campaign.status !== 'RUNNING') {
    return errorResponse(400, `Campaign is ${campaign.status}. Only RUNNING campaigns can be executed.`)
  }

  const result = await executeCampaignBatch(id)

  return successResponse({
    ...result,
    message: `Initiated ${result.callsInitiated} calls, skipped ${result.callsSkipped}, failed ${result.callsFailed}`,
  })
}
