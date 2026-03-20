import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { getCurrentAllowance } from '@/lib/billing/allowances'

export async function GET(_req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const allowance = await getCurrentAllowance(profile.id)

  const fmt = (used: number, limit: number) => ({
    used,
    limit: limit === -1 ? null : limit,
    remaining: limit === -1 ? null : Math.max(0, limit - used),
  })

  return NextResponse.json({
    reveals: fmt(allowance.revealsUsed, allowance.revealsAllowed),
    callMinutes: fmt(allowance.callMinutesUsed, allowance.callMinutesAllowed),
    sms: fmt(allowance.smsUsed, allowance.smsAllowed),
    analyses: fmt(allowance.analysesUsed, allowance.analysesAllowed),
    estimatedCost: allowance.estimatedCost,
    period: {
      start: allowance.periodStart.toISOString(),
      end: allowance.periodEnd.toISOString(),
    },
  })
}
