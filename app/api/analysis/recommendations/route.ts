import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { generateRecommendations } from '@/lib/analysis/recommendations'
import type { FullDealAnalysis } from '@/lib/analysis/deal-analyzer'

// ─── POST /api/analysis/recommendations ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const { profile, error: authError, status: authStatus } = await getAuthProfile()
  if (!profile) return errorResponse(authStatus, authError!)

  try {
    const body = await req.json()
    const analysis = body.analysis as FullDealAnalysis | undefined

    if (!analysis || !analysis.arv) {
      return errorResponse(400, 'Valid analysis data is required')
    }

    const recommendations = await generateRecommendations(analysis, profile.id)
    return successResponse({ recommendations })
  } catch (err) {
    return errorResponse(500, err instanceof Error ? err.message : 'Failed to generate recommendations')
  }
}
