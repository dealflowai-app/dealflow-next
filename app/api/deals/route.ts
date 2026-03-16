import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import type { PropertyType, DealStatus } from '@prisma/client'

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const deals = await prisma.deal.findMany({
      where: { profileId: profile.id },
      include: {
        matches: {
          select: { id: true, matchScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ deals })
  } catch (err) {
    console.error('GET /api/deals error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch deals', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body.address || !body.city || !body.state || !body.zip || !body.askingPrice) {
      return NextResponse.json(
        { error: 'address, city, state, zip, and askingPrice are required' },
        { status: 400 },
      )
    }

    const deal = await prisma.deal.create({
      data: {
        profileId: profile.id,
        address: body.address as string,
        city: body.city as string,
        state: body.state as string,
        zip: body.zip as string,
        propertyType: ((body.propertyType as string) || 'SFR') as PropertyType,
        beds: body.beds != null ? Number(body.beds) : null,
        baths: body.baths != null ? Number(body.baths) : null,
        sqft: body.sqft != null ? Number(body.sqft) : null,
        yearBuilt: body.yearBuilt != null ? Number(body.yearBuilt) : null,
        condition: (body.condition as string) || null,
        askingPrice: Number(body.askingPrice),
        assignFee: body.assignFee != null ? Number(body.assignFee) : null,
        closeByDate: body.closeByDate ? new Date(body.closeByDate as string) : null,
        arv: body.arv != null ? Number(body.arv) : null,
        repairCost: body.repairCost != null ? Number(body.repairCost) : null,
        notes: (body.notes as string) || null,
        status: 'ACTIVE' as DealStatus,
      },
    })

    return NextResponse.json({ deal }, { status: 201 })
  } catch (err) {
    console.error('POST /api/deals error:', err)
    return NextResponse.json(
      { error: 'Failed to create deal', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
