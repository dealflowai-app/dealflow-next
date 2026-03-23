import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const buyers = await prisma.cashBuyer.findMany({
      where: {
        profileId: profile.id,
        isOptedOut: false,
      },
      select: {
        firstName: true,
        lastName: true,
        entityName: true,
        phone: true,
        email: true,
        status: true,
        buyerScore: true,
        preferredMarkets: true,
        primaryPropertyType: true,
        buyerType: true,
        contactType: true,
        createdAt: true,
        tags: {
          select: {
            tag: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = buyers.map((b) => ({
      name: b.entityName || [b.firstName, b.lastName].filter(Boolean).join(' ') || '',
      email: b.email || '',
      phone: b.phone || '',
      status: b.status || '',
      score: b.buyerScore ?? '',
      market: (b.preferredMarkets || []).join('; '),
      type: b.buyerType || b.contactType || '',
      tags: b.tags.map((t) => t.tag.name).join('; '),
      created: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '',
    }))

    return NextResponse.json({ buyers: formatted })
  } catch (err) {
    console.error('GET /api/crm/buyers/export error:', err)
    return NextResponse.json(
      { error: 'Failed to export buyers', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
