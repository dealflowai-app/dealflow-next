import { NextRequest, NextResponse } from 'next/server'
import { getAdminProfile } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAdminProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const url = new URL(req.url)
  const tab = url.searchParams.get('tab') || 'deals'
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 50)

  // --- KPI counts ---
  const [
    totalDeals,
    dealsByStatus,
    totalListings,
    activeListings,
    totalContracts,
    contractsByStatus,
  ] = await Promise.all([
    prisma.deal.count(),
    prisma.deal.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.marketplaceListing.count(),
    prisma.marketplaceListing.count({ where: { status: 'ACTIVE' } }),
    prisma.contract.count(),
    prisma.contract.groupBy({ by: ['status'], _count: { status: true } }),
  ])

  const dealStatusMap: Record<string, number> = {}
  for (const d of dealsByStatus) dealStatusMap[d.status] = d._count.status

  const contractStatusMap: Record<string, number> = {}
  for (const c of contractsByStatus) contractStatusMap[c.status] = c._count.status

  // --- Tab-specific data ---
  let items: any[] = []
  let total = 0

  if (tab === 'deals') {
    const [deals, count] = await Promise.all([
      prisma.deal.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          profile: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.deal.count(),
    ])
    items = deals.map((d) => ({
      id: d.id,
      address: `${d.address}, ${d.city}, ${d.state} ${d.zip}`,
      wholesaler: `${d.profile.firstName || ''} ${d.profile.lastName || ''}`.trim() || d.profile.email,
      wholesalerEmail: d.profile.email,
      status: d.status,
      arv: d.arv,
      askingPrice: d.askingPrice,
      assignFee: d.assignFee,
      createdAt: d.createdAt,
    }))
    total = count
  } else if (tab === 'listings') {
    const [listings, count] = await Promise.all([
      prisma.marketplaceListing.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          profile: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.marketplaceListing.count(),
    ])
    items = listings.map((l) => ({
      id: l.id,
      address: `${l.address}, ${l.city}, ${l.state} ${l.zip}`,
      listedBy: `${l.profile.firstName || ''} ${l.profile.lastName || ''}`.trim() || l.profile.email,
      listedByEmail: l.profile.email,
      askingPrice: l.askingPrice,
      arv: l.arv,
      assignFee: l.assignFee,
      spread: l.arv && l.askingPrice ? l.arv - l.askingPrice : null,
      status: l.status,
      viewCount: l.viewCount,
      inquiryCount: l.inquiryCount,
      createdAt: l.createdAt,
    }))
    total = count
  } else if (tab === 'contracts') {
    const [contracts, count] = await Promise.all([
      prisma.contract.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          profile: { select: { firstName: true, lastName: true, email: true } },
          deal: { select: { address: true, city: true, state: true, zip: true, assignFee: true } },
        },
      }),
      prisma.contract.count(),
    ])
    items = contracts.map((c) => ({
      id: c.id,
      address: c.deal ? `${c.deal.address}, ${c.deal.city}, ${c.deal.state} ${c.deal.zip}` : 'N/A',
      assignor: `${c.profile.firstName || ''} ${c.profile.lastName || ''}`.trim() || c.profile.email,
      assignorEmail: c.profile.email,
      templateName: c.templateName,
      fee: c.deal?.assignFee || null,
      status: c.status,
      createdAt: c.createdAt,
      sellerSignedAt: c.sellerSignedAt,
      buyerSignedAt: c.buyerSignedAt,
    }))
    total = count
  }

  return NextResponse.json({
    kpis: {
      totalDeals,
      dealStatus: dealStatusMap,
      totalListings,
      activeListings,
      totalContracts,
      contractStatus: contractStatusMap,
    },
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
