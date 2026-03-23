import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { generateReferralCode } from '@/lib/referrals'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendgrid'

/**
 * POST /api/referrals/invite
 * Sends a referral invite email to the specified address.
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError || 'Invalid request body')

  const email = (body.email as string)?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse(400, 'A valid email address is required')
  }

  // Prevent self-referral
  if (email === profile.email.toLowerCase()) {
    return errorResponse(400, 'You cannot refer yourself')
  }

  // Check if already referred this email
  const existing = await prisma.referral.findFirst({
    where: {
      referrerId: profile.id,
      referredEmail: email,
    },
  })

  if (existing) {
    return errorResponse(409, 'This email has already been invited')
  }

  // Ensure we have a referral code
  const code = await generateReferralCode(profile.id)
  const referralLink = `https://app.dealflow.ai/signup?ref=${code}`

  // Create the referral record
  await prisma.referral.create({
    data: {
      referrerId: profile.id,
      referredEmail: email,
      code,
      status: 'PENDING',
    },
  })

  // Send the invite email
  const referrerName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'A fellow wholesaler'

  await sendEmail({
    to: { email },
    subject: `${referrerName} invited you to DealFlow AI`,
    html: `
      <div style="font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #0B1224; margin-bottom: 8px;">You've been invited to DealFlow AI</h1>
        <p style="font-size: 16px; color: #4B5563; line-height: 1.6; margin-bottom: 24px;">
          ${referrerName} thinks you'd love DealFlow AI &mdash; the all-in-one platform for real estate wholesalers.
          Find cash buyers, run AI outreach campaigns, analyze deals, and close faster.
        </p>
        <a href="${referralLink}"
           style="display: inline-block; background: #2563EB; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
          Join DealFlow AI
        </a>
        <p style="font-size: 13px; color: #9CA3AF; margin-top: 32px;">
          Both you and ${referrerName} will earn rewards when you sign up and start closing deals.
        </p>
      </div>
    `,
    text: `${referrerName} invited you to DealFlow AI. Sign up here: ${referralLink}`,
    categories: ['referral-invite'],
  })

  return successResponse({ sent: true, email })
}
