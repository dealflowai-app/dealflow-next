/**
 * Email Digest Builder
 *
 * Collects NEW match alerts for buyers with daily/weekly alert frequency,
 * groups them by wholesaler profile, and sends a single digest email per
 * wholesaler summarizing all new matches since their last digest.
 */

import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendgrid'
import { logger } from '@/lib/logger'

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface DigestResult {
  profilesProcessed: number
  emailsSent: number
  alertsIncluded: number
  errors: number
}

interface DigestMatch {
  buyerName: string
  propertyAddress: string
  propertyCity: string
  propertyState: string
  matchScore: number
  alertId: string
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Send email digests for the given frequency.
 * Call with 'daily' every day at 8am, 'weekly' every Monday at 8am.
 */
export async function sendDigestEmails(
  frequency: 'daily' | 'weekly',
): Promise<DigestResult> {
  const result: DigestResult = {
    profilesProcessed: 0,
    emailsSent: 0,
    alertsIncluded: 0,
    errors: 0,
  }

  try {
    // Find all NEW match alerts for buyers with this frequency
    // that haven't been notified yet
    const alerts = await prisma.matchAlert.findMany({
      where: {
        status: 'NEW',
        notifiedAt: null,
        buyer: {
          alertsEnabled: true,
          alertFrequency: frequency,
        },
      },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            entityName: true,
            alertFrequency: true,
          },
        },
        property: {
          select: {
            addressLine1: true,
            city: true,
            state: true,
            zipCode: true,
            assessedValue: true,
            propertyType: true,
            bedrooms: true,
            bathrooms: true,
            sqft: true,
          },
        },
        profile: {
          select: {
            id: true,
            email: true,
            firstName: true,
            company: true,
          },
        },
      },
      orderBy: { matchScore: 'desc' },
      take: 1000,
    })

    if (alerts.length === 0) {
      logger.info(`Email digest (${frequency}): no pending alerts`)
      return result
    }

    // Group by profile
    const byProfile = new Map<string, {
      email: string
      name: string
      company: string | null
      matches: DigestMatch[]
      alertIds: string[]
    }>()

    for (const alert of alerts) {
      const profileId = alert.profileId
      let entry = byProfile.get(profileId)

      if (!entry) {
        entry = {
          email: alert.profile.email,
          name: alert.profile.firstName ?? 'there',
          company: alert.profile.company,
          matches: [],
          alertIds: [],
        }
        byProfile.set(profileId, entry)
      }

      const buyerName = alert.buyer.firstName
        ? `${alert.buyer.firstName} ${alert.buyer.lastName ?? ''}`.trim()
        : alert.buyer.entityName ?? 'A buyer'

      entry.matches.push({
        buyerName,
        propertyAddress: alert.property.addressLine1,
        propertyCity: alert.property.city,
        propertyState: alert.property.state,
        matchScore: alert.matchScore,
        alertId: alert.id,
      })
      entry.alertIds.push(alert.id)
    }

    // Send an email per profile
    const profileEntries = Array.from(byProfile.entries())
    for (const [profileId, data] of profileEntries) {
      try {
        result.profilesProcessed++

        const subject = data.matches.length === 1
          ? `New deal match for your buyer`
          : `${data.matches.length} new deal matches found`

        const html = buildDigestHtml(data.name, data.matches, frequency)

        await sendEmail({
          to: { email: data.email, name: data.name },
          subject,
          html,
          categories: ['digest', `digest_${frequency}`],
        })

        result.emailsSent++
        result.alertsIncluded += data.alertIds.length

        // Mark alerts as SENT
        await prisma.matchAlert.updateMany({
          where: { id: { in: data.alertIds } },
          data: { status: 'SENT', notifiedAt: new Date() },
        })

        // Update lastAlertSentAt on the buyers
        const buyerIds = alerts
          .filter(a => a.profileId === profileId)
          .map(a => a.buyerId)
        const uniqueBuyerIds = Array.from(new Set(buyerIds))

        await prisma.cashBuyer.updateMany({
          where: { id: { in: uniqueBuyerIds } },
          data: { lastAlertSentAt: new Date() },
        })

        // Create in-app notification too
        await prisma.notification.create({
          data: {
            profileId,
            type: 'match_alert',
            title: subject,
            body: `${data.matches.length} properties match your buyer criteria. Email digest sent.`,
            data: {
              matchAlertIds: data.alertIds,
              count: data.matches.length,
              digestFrequency: frequency,
            },
          },
        })
      } catch (err) {
        result.errors++
        logger.error('Email digest: failed to send for profile', {
          profileId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  } catch (err) {
    result.errors++
    logger.error('Email digest: fatal error', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  logger.info(`Email digest (${frequency}) complete`, { ...result })
  return result
}

// ─── HTML TEMPLATE ──────────────────────────────────────────────────────────

function buildDigestHtml(
  name: string,
  matches: DigestMatch[],
  frequency: string,
): string {
  const matchRows = matches.slice(0, 20).map(m => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
        <strong>${escapeHtml(m.propertyAddress)}</strong><br/>
        <span style="color: #6b7280; font-size: 13px;">
          ${escapeHtml(m.propertyCity)}, ${escapeHtml(m.propertyState)}
        </span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; color: #6b7280; font-size: 13px;">
        ${escapeHtml(m.buyerName)}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: center;">
        <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; ${
          m.matchScore >= 70 ? 'background: #eff6ff; color: #2563eb;' :
          m.matchScore >= 50 ? 'background: #fffbeb; color: #d97706;' :
          'background: #f3f4f6; color: #6b7280;'
        }">
          ${m.matchScore}%
        </span>
      </td>
    </tr>
  `).join('')

  const moreText = matches.length > 20
    ? `<p style="color: #6b7280; font-size: 13px; margin-top: 8px;">...and ${matches.length - 20} more matches</p>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background: #0B1224; padding: 24px 32px;">
        <h1 style="margin: 0; color: white; font-size: 18px; font-weight: 600;">
          DealFlow AI
        </h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; color: #111827; font-size: 15px;">
          Hi ${escapeHtml(name)},
        </p>
        <p style="margin: 0 0 24px; color: #374151; font-size: 15px;">
          Here's your ${frequency} deal match digest. We found
          <strong>${matches.length} ${matches.length === 1 ? 'property' : 'properties'}</strong>
          matching your buyer criteria.
        </p>

        <!-- Matches table -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Property</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Buyer</th>
              <th style="padding: 10px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Match</th>
            </tr>
          </thead>
          <tbody>
            ${matchRows}
          </tbody>
        </table>
        ${moreText}

        <!-- CTA -->
        <div style="margin-top: 24px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.dealflowai.com'}/discovery"
             style="display: inline-block; padding: 12px 32px; background: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View Matches
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
          You're receiving this because you have ${frequency} match alerts enabled.
          Manage alert preferences in your CRM settings.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
