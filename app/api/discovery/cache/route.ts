import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

/**
 * DELETE /api/discovery/cache?city=Fullerton&state=CA
 * Clears cached discovery properties for a given location.
 * Used when cached data is stale and needs re-fetching.
 */
export async function DELETE(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const params = req.nextUrl.searchParams
  const city = params.get('city')
  const state = params.get('state')
  const zip = params.get('zip')

  if (!city && !zip) {
    return NextResponse.json({ error: 'Provide city or zip' }, { status: 400 })
  }

  const where = zip
    ? { OR: [{ searchZip: zip }, { zipCode: zip }] }
    : { OR: [{ searchCity: city!.toLowerCase() }, { city: city! }] }

  const deleted = await prisma.discoveryProperty.deleteMany({ where })

  return NextResponse.json({
    deleted: deleted.count,
    location: zip ?? `${city}, ${state}`,
  })
}
