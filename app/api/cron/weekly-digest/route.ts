import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendgrid'
import { formatWeeklyDigest } from '@/lib/emails/weekly-digest'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

// ─── GET /api/cron/weekly-digest ─────────────────────────────────────────────
// Triggered weekly (every Monday at 8 AM) by Vercel Cron or external scheduler.
// Protected by x-cron-secret header.

export async function GET(req: NextRequest) {
  // ── Auth ──
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')
  const authBearer = req.headers.get('authorization')

  // Accept either x-cron-secret header or Bearer token — secret must be configured
  const isAuthorized =
    !!cronSecret && (
      headerSecret === cronSecret ||
      authBearer === `Bearer ${cronSecret}`
    )

  if (!isAuthorized) {
    return errorResponse(401, 'Unauthorized')
  }

  const result = {
    profilesProcessed: 0,
    emailsSent: 0,
    skipped: 0,
    errors: 0,
  }

  try {
    // ── Fetch all onboarded profiles ──
    const profiles = await prisma.profile.findMany({
      where: { onboardingCompleted: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        settings: true,
      },
    })

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    for (const profile of profiles) {
      result.profilesProcessed++

      try {
        // ── Check email preferences ──
        const settings = (profile.settings as Record<string, unknown>) || {}
        const emailPrefs = (settings.emailPreferences as Record<string, boolean>) || {}

        // Skip if user has explicitly disabled weekly digest
        if (emailPrefs.weeklyDigest === false) {
          result.skipped++
          continue
        }

        // ── Aggregate past 7 days of activity ──

        // Count new buyers
        const newBuyers = await prisma.cashBuyer.count({
          where: {
            profileId: profile.id,
            createdAt: { gte: sevenDaysAgo },
          },
        })

        // Count deals created
        const dealsCreated = await prisma.deal.count({
          where: {
            profileId: profile.id,
            createdAt: { gte: sevenDaysAgo },
          },
        })

        // Get deals whose status changed (updated in last 7 days but created before)
        // We check updatedAt vs createdAt to detect status changes
        const updatedDeals = await prisma.deal.findMany({
          where: {
            profileId: profile.id,
            updatedAt: { gte: sevenDaysAgo },
          },
          select: {
            address: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        })

        // For status changes, we track deals that were updated but not just created
        // Since there's no status history model, we report current status for recently updated deals
        const dealsStatusChanged = updatedDeals
          .filter(d => {
            // Only include deals where updatedAt is meaningfully after createdAt
            // (indicating a status change, not just initial creation)
            const createdMs = d.createdAt.getTime()
            const updatedMs = d.updatedAt.getTime()
            return updatedMs - createdMs > 60_000 // more than 1 minute apart
          })
          .map(d => ({
            address: d.address,
            oldStatus: 'DRAFT', // Best guess without history table
            newStatus: d.status,
          }))

        // Count campaigns completed/sent in last 7 days
        const campaignsSent = await prisma.campaign.count({
          where: {
            profileId: profile.id,
            OR: [
              { createdAt: { gte: sevenDaysAgo } },
              {
                status: 'COMPLETED',
                updatedAt: { gte: sevenDaysAgo },
              },
            ],
          },
        })

        // Count responses (campaign calls with outcomes in last 7 days)
        const responsesReceived = await prisma.campaignCall.count({
          where: {
            campaign: { profileId: profile.id },
            outcome: { not: null },
            createdAt: { gte: sevenDaysAgo },
          },
        })

        // ── Format and send ──
        const digestData = {
          firstName: profile.firstName || 'there',
          newBuyers,
          dealsCreated,
          dealsStatusChanged,
          campaignsSent,
          responsesReceived,
        }

        const { subject, html, text } = formatWeeklyDigest(digestData)

        const sendResult = await sendEmail({
          to: { email: profile.email, name: profile.firstName || undefined },
          subject,
          html,
          text,
          categories: ['weekly-digest'],
        })

        if (sendResult.success) {
          result.emailsSent++
        } else {
          result.errors++
          logger.error('Weekly digest: send failed', {
            profileId: profile.id,
            error: sendResult.error,
          })
        }
      } catch (err) {
        result.errors++
        logger.error('Weekly digest: profile processing error', {
          profileId: profile.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  } catch (err) {
    logger.error('Weekly digest: fatal error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(500, 'Internal server error')
  }

  logger.info('Weekly digest complete', { ...result })

  return successResponse({
    success: true,
    ...result,
  })
}
