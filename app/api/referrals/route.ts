import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { generateReferralCode, getReferralStats, getReferralList } from '@/lib/referrals'

/**
 * GET /api/referrals
 * Returns the authenticated user's referral code, link, stats, and referral list.
 */
export async function GET() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const [code, stats, referrals] = await Promise.all([
    generateReferralCode(profile.id),
    getReferralStats(profile.id),
    getReferralList(profile.id),
  ])

  return successResponse({
    referralCode: code,
    referralLink: `https://app.dealflow.ai/signup?ref=${code}`,
    stats,
    referrals,
  })
}

/**
 * POST /api/referrals
 * Creates or retrieves the referral code for the authenticated user.
 */
export async function POST() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const code = await generateReferralCode(profile.id)

  return successResponse({
    referralCode: code,
    referralLink: `https://app.dealflow.ai/signup?ref=${code}`,
  })
}
