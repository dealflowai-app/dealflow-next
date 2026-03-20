import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity'

interface SendGridEvent {
  event: string
  email: string
  timestamp: number
  campaignCallId?: string
  url?: string
  reason?: string
  type?: string
}

export async function POST(req: NextRequest) {
  try {
    const events: SendGridEvent[] = await req.json()

    for (const event of events) {
      const campaignCallId = event.campaignCallId

      switch (event.event) {
        case 'open':
          if (campaignCallId) {
            await prisma.campaignCall.update({
              where: { id: campaignCallId },
              data: { messageRead: true },
            }).catch(() => {})
          }
          break

        case 'click':
          if (campaignCallId) {
            await prisma.campaignCall.update({
              where: { id: campaignCallId },
              data: { messageRead: true },
            }).catch(() => {})
          }
          break

        case 'bounce':
        case 'dropped':
          if (campaignCallId) {
            await prisma.campaignCall.update({
              where: { id: campaignCallId },
              data: { outcome: 'WRONG_NUMBER', messageDelivered: false },
            }).catch(() => {})
          }
          break

        case 'unsubscribe':
        case 'spamreport': {
          const buyer = await prisma.cashBuyer.findFirst({
            where: { email: event.email, status: { not: 'DO_NOT_CALL' } },
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
                title: `Opted out via email (${event.event})`,
                metadata: { channel: 'email', event: event.event },
              })
            }
          }
          break
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('SendGrid webhook error:', err)
    return new Response('Error', { status: 500 })
  }
}
