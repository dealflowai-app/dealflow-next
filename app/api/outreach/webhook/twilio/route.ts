import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'
import { logger } from '@/lib/logger'

const OPT_OUT_PHRASES = ['stop', 'unsubscribe', 'remove me', 'do not call', 'opt out', 'take me off', 'cancel']

function isOptOut(message: string): boolean {
  const lower = message.toLowerCase().trim()
  return OPT_OUT_PHRASES.some(phrase => lower.includes(phrase))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData()
    const messageSid = body.get('MessageSid') as string | null
    const status = body.get('MessageStatus') as string | null
    const from = body.get('From') as string | null
    const bodyText = body.get('Body') as string | null

    // Update delivery status for outbound messages
    if (messageSid && status) {
      const statusMap: Record<string, string> = {
        delivered: 'COMPLETED',
        sent: 'IN_PROGRESS',
        failed: 'FAILED',
        undelivered: 'FAILED',
      }
      const mappedStatus = statusMap[status]
      if (mappedStatus) {
        await prisma.campaignCall.updateMany({
          where: { messageId: messageSid },
          data: {
            outcome: mappedStatus === 'COMPLETED' ? 'QUALIFIED' : mappedStatus === 'FAILED' ? 'WRONG_NUMBER' : undefined,
            messageDelivered: mappedStatus === 'COMPLETED' ? true : undefined,
          },
        })
      }
    }

    // Handle inbound replies (opt-out detection)
    if (bodyText && from) {
      if (isOptOut(bodyText)) {
        const normalized = from.replace(/\D/g, '')
        const phone10 = normalized.slice(-10)
        const buyer = await prisma.cashBuyer.findFirst({
          where: {
            phone: { contains: phone10 },
            status: { not: 'DO_NOT_CALL' },
          },
        })
        if (buyer) {
          await prisma.cashBuyer.update({
            where: { id: buyer.id },
            data: {
              status: 'DO_NOT_CALL',
              isOptedOut: true,
              optedOutAt: new Date(),
            },
          })
          if (buyer.profileId) {
            logActivity({
              profileId: buyer.profileId,
              buyerId: buyer.id,
              type: 'status_changed',
              title: 'Opted out via SMS',
              metadata: { reply: bodyText, channel: 'sms' },
            })
          }
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    logger.error('Twilio webhook error', { error: err instanceof Error ? err.message : String(err) })
    return new Response('Error', { status: 500 })
  }
}
