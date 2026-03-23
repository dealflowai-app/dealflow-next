import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const deals = await prisma.deal.findMany({
      where: { profileId: profile.id },
      include: {
        matches: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = deals.map((d) => ({
      address: `${d.address}, ${d.city}, ${d.state} ${d.zip}`,
      price: d.askingPrice,
      arv: d.arv ?? '',
      spread: d.arv != null ? d.arv - d.askingPrice : '',
      status: d.status,
      matches: d.matches.length,
      created: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '',
    }))

    return NextResponse.json({ deals: formatted })
  } catch (err) {
    console.error('GET /api/deals/export error:', err)
    return NextResponse.json(
      { error: 'Failed to export deals', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
