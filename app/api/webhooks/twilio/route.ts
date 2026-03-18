import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { triggerNextBatch } from '@/lib/outreach/campaign-executor'
import { validateTwilioSignature } from '@/lib/outreach/sms-service'
import { handleInboundMessage } from '@/lib/outreach/sms-conversation'

// ─── Twilio Inbound SMS Webhook ─────────────────────────────────────────────
// Handles inbound SMS messages from buyers with full conversation threading.
//
// Flow:
// 1. Validate Twilio signature
// 2. Parse From/Body/MessageSid
// 3. Find the profile that owns this Twilio number (via recent CampaignCall)
// 4. Route through SMS conversation service (classify, thread, auto-reply)
// 5. Update CampaignCall if linked to a campaign
// 6. Log activity on buyer

function normalizeInboundPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}

// TwiML XML response helper
function twimlResponse(message?: string): NextResponse {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

  return new NextResponse(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const from = formData.get('From') as string || ''
    const body = formData.get('Body') as string || ''
    const messageSid = formData.get('MessageSid') as string || ''

    if (!from || !body) {
      return twimlResponse()
    }

    // ── Validate Twilio signature ─────────────────────────────────────────
    const signature = req.headers.get('x-twilio-signature') || ''
    if (process.env.TWILIO_AUTH_TOKEN && signature) {
      const params: Record<string, string> = {}
      formData.forEach((value, key) => { params[key] = value as string })

      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/twilio`
      if (!validateTwilioSignature(webhookUrl, params, signature)) {
        logger.warn('Invalid Twilio signature', { route: '/api/webhooks/twilio' })
        return twimlResponse()
      }
    }

    // ── Find which profile owns this conversation ─────────────────────────
    const normalizedPhone = normalizeInboundPhone(from)

    // Check existing conversation first
    const existingConvo = await prisma.sMSConversation.findFirst({
      where: { phone: { contains: normalizedPhone } },
      select: { profileId: true },
      orderBy: { updatedAt: 'desc' },
    })

    let profileId = existingConvo?.profileId

    // Fall back to matching via CampaignCall
    if (!profileId) {
      const callRecord = await prisma.campaignCall.findFirst({
        where: {
          phoneNumber: { contains: normalizedPhone },
          channel: 'sms',
          messageSent: true,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { id: true, profileId: true, status: true } },
          buyer: { select: { id: true, phone: true, profileId: true } },
        },
      })

      profileId = callRecord?.campaign?.profileId || callRecord?.buyer?.profileId || undefined
    }

    if (!profileId) {
      logger.info('Inbound SMS — no matching profile found', {
        route: '/api/webhooks/twilio',
        from: `***${normalizedPhone.slice(-4)}`,
      })
      return twimlResponse()
    }

    // ── Route through conversation service ────────────────────────────────
    const result = await handleInboundMessage(profileId, from, body, messageSid)

    logger.info('Inbound SMS processed', {
      route: '/api/webhooks/twilio',
      from: `***${normalizedPhone.slice(-4)}`,
      classification: result.classification,
      conversationId: result.conversationId,
      autoReplied: result.autoReplied,
      optedOut: result.optedOut,
    })

    // ── Update linked CampaignCall if exists ──────────────────────────────
    const campaignCall = await prisma.campaignCall.findFirst({
      where: {
        phoneNumber: { contains: normalizedPhone },
        channel: 'sms',
        messageSent: true,
        outcome: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { select: { id: true, profileId: true, status: true } },
        buyer: { select: { id: true, profileId: true } },
      },
    })

    if (campaignCall) {
      // Map classification to CampaignCall outcome
      const outcomeMap: Record<string, string> = {
        opt_out: 'DO_NOT_CALL',
        interested: 'QUALIFIED',
        not_interested: 'NOT_BUYING',
        callback_request: 'CALLBACK_REQUESTED',
      }
      const outcome = outcomeMap[result.classification] || 'CALLBACK_REQUESTED'

      await prisma.campaignCall.update({
        where: { id: campaignCall.id },
        data: {
          outcome: outcome as any,
          responseText: body,
          responseAt: new Date(),
          ...(outcome !== 'CALLBACK_REQUESTED' ? { endedAt: new Date() } : {}),
        },
      })

      // Update campaign stats
      if (campaignCall.campaignId) {
        const statsUpdate: Record<string, any> = { callsCompleted: { increment: 1 } }
        if (outcome === 'QUALIFIED') statsUpdate.qualified = { increment: 1 }
        if (outcome === 'NOT_BUYING') statsUpdate.notBuying = { increment: 1 }

        await prisma.campaign.update({
          where: { id: campaignCall.campaignId },
          data: statsUpdate,
        })
      }

      // Log activity on buyer
      if (campaignCall.buyer) {
        const titleMap: Record<string, string> = {
          opt_out: 'Opted out via SMS',
          interested: 'Positive SMS response',
          not_interested: 'Declined via SMS',
          callback_request: 'Requested callback via SMS',
          question: 'Asked a question via SMS',
          address_response: 'Sent address info via SMS',
          price_response: 'Sent price info via SMS',
          other: 'SMS response (review needed)',
        }
        await prisma.activityEvent.create({
          data: {
            buyerId: campaignCall.buyer.id,
            profileId: campaignCall.campaign!.profileId,
            type: result.optedOut ? 'opt_out' : 'sms_response',
            title: titleMap[result.classification] || 'SMS response',
            detail: `Reply: "${body.slice(0, 200)}"`,
            metadata: {
              messageSid,
              campaignId: campaignCall.campaignId ?? undefined,
              classification: result.classification,
              conversationId: result.conversationId,
            },
          },
        })
      }

      // Trigger next batch if campaign is still running
      if (campaignCall.campaign?.status === 'RUNNING' && campaignCall.campaignId) {
        triggerNextBatch(campaignCall.campaignId)
      }
    }

    // ── Return TwiML ────────────────────────────────────────────────────
    // Auto-replies are sent via the SMS client, not TwiML, so we return empty
    // to avoid duplicate messages
    return twimlResponse()

  } catch (error) {
    logger.error('Twilio webhook processing failed', {
      route: '/api/webhooks/twilio',
      error: error instanceof Error ? error.message : String(error),
    })
    return twimlResponse()
  }
}
