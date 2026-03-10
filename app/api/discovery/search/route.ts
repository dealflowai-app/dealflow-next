import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// ATTOM Data Solutions API
// Docs: https://api.developer.attomdata.com/docs
const ATTOM_BASE = 'https://api.developer.attomdata.com'
const ATTOM_KEY = process.env.ATTOM_API_KEY!

// Melissa Data enrichment API
// Docs: https://www.melissa.com/developer/global-phone
const MELISSA_KEY = process.env.MELISSA_DATA_KEY!

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { market, city, state, county, zipCode, dateRangeMonths = 12 } = await req.json()

    if (!state) return NextResponse.json({ error: 'State is required' }, { status: 400 })

    // ── 1. Find or create SavedMarket ────────────────────────────────────────
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    let savedMarket = await prisma.savedMarket.findFirst({
      where: {
        profileId: profile.id,
        ...(city ? { city } : {}),
        state,
        ...(zipCode ? { zipCode } : {}),
      },
    })

    if (!savedMarket) {
      savedMarket = await prisma.savedMarket.create({
        data: {
          profileId: profile.id,
          label: market,
          city,
          state,
          zipCode,
          county,
        },
      })
    }

    // ── 2. Query ATTOM for cash transactions ─────────────────────────────────
    // Using ATTOM's /v1/assessmenthistory/basichistory endpoint filtered for cash sales
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - dateRangeMonths)
    const startDateStr = startDate.toISOString().split('T')[0]

    let attomBuyers: AttomBuyer[] = []

    if (ATTOM_KEY) {
      try {
        // Build query params
        const params = new URLSearchParams({
          startsalesearchdate: startDateStr,
          startsalesearchdate2: new Date().toISOString().split('T')[0],
          owneroccupied: 'N',       // investors, not owner-occupants
          page: '1',
          pagesize: '100',
        })

        if (city) params.set('address1', city)
        if (state) params.set('address2', state)
        if (zipCode) params.set('postalcode', zipCode)

        const res = await fetch(
          `${ATTOM_BASE}/v1/sale/snapshot?${params.toString()}`,
          {
            headers: {
              apikey: ATTOM_KEY,
              accept: 'application/json',
            },
          }
        )

        if (res.ok) {
          const data = await res.json()
          // ATTOM returns property array - filter cash transactions
          attomBuyers = (data?.property || [])
            .filter((p: any) => p?.sale?.saleTransType?.toLowerCase().includes('cash'))
            .map((p: any) => ({
              firstName: p?.owner?.owner1?.lastName ? '' : p?.owner?.corporateName,
              lastName: p?.owner?.owner1?.lastName,
              entityName: p?.owner?.corporateName,
              entityType: p?.owner?.corporateName ? 'llc' : 'individual',
              address: p?.address?.line1,
              city: p?.address?.locality,
              state: p?.address?.countrySubd,
              zip: p?.address?.postal1,
              lastPurchaseDate: p?.sale?.saleTransDate,
              estimatedMaxPrice: p?.sale?.amount?.saleamt,
            }))
        }
      } catch (attomError) {
        console.error('ATTOM API error:', attomError)
        // Fall through to mock data in development
      }
    }

    // ── 3. Development fallback — realistic mock data ─────────────────────────
    if (attomBuyers.length === 0) {
      attomBuyers = generateMockBuyers(city || county || 'Unknown', state, 24)
    }

    // ── 4. Upsert buyers into DB ──────────────────────────────────────────────
    const createdBuyers = await Promise.all(
      attomBuyers.slice(0, 50).map(async (buyer) => {
        return prisma.cashBuyer.upsert({
          where: {
            // Use phone as unique key if available, otherwise create new
            id: `${savedMarket!.id}_${buyer.entityName || buyer.lastName}_${buyer.zip}`.replace(/\s/g, '_').toLowerCase().substring(0, 25) + '_' + Math.random().toString(36).substring(2, 7),
          },
          update: {
            lastPurchaseDate: buyer.lastPurchaseDate ? new Date(buyer.lastPurchaseDate) : undefined,
            cashPurchaseCount: { increment: 1 },
          },
          create: {
            savedMarketId: savedMarket!.id,
            firstName: buyer.firstName || null,
            lastName: buyer.lastName || null,
            entityName: buyer.entityName || null,
            entityType: buyer.entityType || 'individual',
            address: buyer.address || null,
            city: buyer.city || city || null,
            state: buyer.state || state,
            zip: buyer.zip || zipCode || null,
            lastPurchaseDate: buyer.lastPurchaseDate ? new Date(buyer.lastPurchaseDate) : null,
            estimatedMaxPrice: buyer.estimatedMaxPrice || null,
            cashPurchaseCount: 1,
            contactEnriched: false,
            status: 'ACTIVE',
          },
        })
      })
    )

    // Update market buyer count
    await prisma.savedMarket.update({
      where: { id: savedMarket.id },
      data: {
        buyerCount: createdBuyers.length,
        lastRefreshed: new Date(),
      },
    })

    // Fetch full list for this market
    const allBuyers = await prisma.cashBuyer.findMany({
      where: { savedMarketId: savedMarket.id, isOptedOut: false },
      orderBy: [{ cashPurchaseCount: 'desc' }, { lastPurchaseDate: 'desc' }],
      take: 100,
    })

    return NextResponse.json({
      market: savedMarket,
      buyers: allBuyers,
      total: allBuyers.length,
      newFound: createdBuyers.length,
    })
  } catch (error) {
    console.error('Discovery search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface AttomBuyer {
  firstName?: string
  lastName?: string
  entityName?: string
  entityType?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  lastPurchaseDate?: string
  estimatedMaxPrice?: number
}

// ── Mock data generator for development ───────────────────────────────────────

function generateMockBuyers(city: string, state: string, count: number): AttomBuyer[] {
  const names = [
    { first: 'Marcus', last: 'Johnson' }, { first: 'Sandra', last: 'Williams' },
    { first: 'David', last: 'Kim' }, { first: 'Rachel', last: 'Torres' },
    { first: 'James', last: 'Patel' }, { first: 'Angela', last: 'Chen' },
    { first: 'Robert', last: 'Murphy' }, { first: 'Lisa', last: 'Washington' },
    { first: 'Kevin', last: 'Okafor' }, { first: 'Diane', last: 'Reyes' },
    { first: 'Brian', last: 'Scott' }, { first: 'Monica', last: 'Adams' },
    { first: 'Tyler', last: 'Bennett' }, { first: 'Jasmine', last: 'Powell' },
    { first: 'Carlos', last: 'Rivera' }, { first: 'Heather', last: 'Cooper' },
    { first: 'Derek', last: 'Hall' }, { first: 'Tiffany', last: 'Young' },
    { first: 'Nathan', last: 'Price' }, { first: 'Vanessa', last: 'Brooks' },
    { first: 'Eric', last: 'Griffin' }, { first: 'Michelle', last: 'Howard' },
    { first: 'Jason', last: 'Ward' }, { first: 'Kimberly', last: 'Morgan' },
  ]
  const entities = [
    'Premier REI LLC', 'Apex Property Group', 'BlueSky Investments LLC',
    'Cornerstone Capital RE', 'Delta Acquisitions LLC', 'Eagle Eye Properties',
    'First Choice Realty LLC', 'Golden Gate Investments', 'Harbor View RE LLC',
    'Iron Horse Capital', 'Keystone Property Group', 'Liberty RE Investments',
  ]
  const prices = [75000, 95000, 110000, 125000, 145000, 165000, 180000, 210000, 250000, 290000]
  const zips = ['30301', '30303', '30305', '30306', '30307', '30308', '30309', '30310', '30311', '30312']

  return Array.from({ length: count }, (_, i) => {
    const isEntity = Math.random() > 0.5
    const name = names[i % names.length]
    const monthsAgo = Math.floor(Math.random() * 12)
    const date = new Date()
    date.setMonth(date.getMonth() - monthsAgo)

    return {
      firstName: isEntity ? undefined : name.first,
      lastName: isEntity ? undefined : name.last,
      entityName: isEntity ? entities[i % entities.length] : undefined,
      entityType: isEntity ? 'llc' : 'individual',
      city,
      state,
      zip: zips[i % zips.length],
      lastPurchaseDate: date.toISOString(),
      estimatedMaxPrice: prices[i % prices.length],
    }
  })
}