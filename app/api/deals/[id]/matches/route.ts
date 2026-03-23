import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { findMatchingBuyers } from '@/lib/buyer-matching'

/**
 * GET /api/deals/[id]/matches
 *
 * Returns the top 10 matching buyers for a deal using the smart
 * buyer matching algorithm (market 40pts, price 25pts, strategy 20pts,
 * buyer score 15pts).
 *
 * Auth required — scoped to the authenticated user's profile.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) {
      return NextResponse.json({ error }, { status })
    }

    const { id } = await params

    const matches = await findMatchingBuyers(id, profile.id)

    return NextResponse.json({ matches })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (message === 'Deal not found') {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    console.error('GET /api/deals/[id]/matches failed:', message)
    return NextResponse.json(
      { error: 'Failed to find matching buyers', detail: message },
      { status: 500 },
    )
  }
}
