import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronSecret } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find campaigns scheduled to run now
    const due = await prisma.campaign.findMany({
      where: {
        status: 'DRAFT',
        scheduledAt: { lte: new Date() },
      },
    })

    let processed = 0

    for (const campaign of due) {
      // Transition to RUNNING
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'RUNNING', startedAt: new Date() },
      })

      // Trigger campaign execution via the execute endpoint
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
        await fetch(`${baseUrl}/api/outreach/campaigns/${campaign.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        processed++
      } catch (err) {
        logger.error(`Failed to execute campaign ${campaign.id}`, { error: err instanceof Error ? err.message : String(err) })
        // Revert to DRAFT if execution trigger fails
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'DRAFT' },
        })
      }
    }

    return NextResponse.json({ processed, due: due.length })
  } catch (err) {
    logger.error('Campaign cron error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
