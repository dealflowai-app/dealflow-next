/**
 * Seed CRM — Populate the database with realistic test data.
 *
 * Usage:
 *   npx tsx scripts/seed-crm.ts [profileId]
 *
 * If no profileId is provided, uses the first profile in the database.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomPhone(): string {
  const area = pick(['214', '469', '972', '404', '770', '678', '602', '480', '623'])
  return `${area}${randomInt(2000000, 9999999)}`
}

function randomEmail(first: string, last: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'protonmail.com', 'icloud.com']
  const sep = pick(['.', '_', ''])
  return `${first.toLowerCase()}${sep}${last.toLowerCase()}@${pick(domains)}`
}

function entityEmail(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `info@${slug.slice(0, 14)}.com`
}

// ─── SEED DATA ───────────────────────────────────────────────────────────────

const MARKETS = [
  { label: 'Dallas, TX', city: 'Dallas', state: 'TX' },
  { label: 'Phoenix, AZ', city: 'Phoenix', state: 'AZ' },
  { label: 'Atlanta, GA', city: 'Atlanta', state: 'GA' },
]

const INDIVIDUAL_NAMES = [
  ['Marcus', 'Johnson'], ['Sandra', 'Williams'], ['David', 'Chen'],
  ['Jessica', 'Rivera'], ['Kevin', 'Nguyen'], ['Tanya', 'Brooks'],
  ['Ryan', 'Mitchell'], ['Aisha', 'Davis'], ['Carlos', 'Medina'],
  ['Lisa', 'Park'], ['Derrick', 'Jones'], ['Rachel', 'Martinez'],
  ['Travis', 'King'], ['Angela', 'Scott'], ['Omar', 'Bryant'],
  ['Stephanie', 'Lee'], ['Brandon', 'Harris'], ['Natasha', 'Patel'],
  ['Jordan', 'Baker'], ['Megan', 'Foster'], ['Andre', 'Washington'],
  ['Diana', 'Torres'], ['Corey', 'Robinson'], ['Vanessa', 'Clark'],
  ['Tyrone', 'Adams'], ['Christina', 'Hall'], ['Derek', 'Young'],
  ['Monica', 'Allen'], ['Keith', 'Wright'], ['Laura', 'Green'],
]

const LLC_NAMES = [
  'Apex Property Group', 'Iron Horse Capital', 'Sunbelt Ventures',
  'Magnolia Homes', 'Patriot Property Partners', 'Red Oak Investments',
  'Canyon View Holdings', 'Golden State Acquisitions', 'Metro Cash Buyers',
  'Peachtree Capital', 'Copper Canyon RE', 'Lone Star Holdings',
  'Verde Property Group', 'Liberty Home Buyers', 'Pinnacle RE Investments',
  'Atlas Property Solutions', 'Horizon Land Group', 'Summit Acquisition Corp',
  'Trident Real Estate', 'Eagle Rock Ventures',
]

const STRATEGIES = ['FLIP', 'HOLD', 'BOTH'] as const
const PROPERTY_TYPES = ['SFR', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'CONDO'] as const
const STATUSES = ['ACTIVE', 'HIGH_CONFIDENCE', 'RECENTLY_VERIFIED', 'DORMANT'] as const
const CALL_OUTCOMES = ['QUALIFIED', 'NOT_BUYING', 'NO_ANSWER', 'VOICEMAIL', 'CALLBACK_REQUESTED'] as const

const DEAL_ADDRESSES = [
  { address: '4217 Magnolia Ave', city: 'Dallas', state: 'TX', zip: '75215' },
  { address: '1820 E Roosevelt St', city: 'Phoenix', state: 'AZ', zip: '85006' },
  { address: '892 Joseph E Boone Blvd', city: 'Atlanta', state: 'GA', zip: '30314' },
  { address: '3405 Colonial Dr', city: 'Dallas', state: 'TX', zip: '75216' },
]

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const profileId = process.argv[2] || null

  let profile: { id: string; email: string }
  if (profileId) {
    const found = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!found) {
      console.error(`Profile ${profileId} not found.`)
      process.exit(1)
    }
    profile = found
  } else {
    const found = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!found) {
      console.error('No profiles in the database. Create a user account first.')
      process.exit(1)
    }
    profile = found
  }
  console.log(`Using profile: ${profile.id} (${profile.email})`)

  // Idempotency check
  const existingCount = await prisma.cashBuyer.count({
    where: { profileId: profile.id, isOptedOut: false },
  })
  if (existingCount >= 30) {
    console.log(`Profile already has ${existingCount} buyers. Skipping seed to avoid duplicates.`)
    console.log('To re-seed, delete existing buyers first.')
    process.exit(0)
  }

  // ─── 1. SavedMarkets ───────────────────────────────────────────────────────
  console.log('\n1. Creating saved markets...')
  const marketIds: Record<string, string> = {}
  for (const m of MARKETS) {
    const existing = await prisma.savedMarket.findFirst({
      where: { profileId: profile.id, label: m.label },
    })
    if (existing) {
      marketIds[m.label] = existing.id
      console.log(`  ✓ ${m.label} (already exists)`)
    } else {
      const created = await prisma.savedMarket.create({
        data: { profileId: profile.id, label: m.label, city: m.city, state: m.state },
      })
      marketIds[m.label] = created.id
      console.log(`  + ${m.label}`)
    }
  }

  // ─── 2. CashBuyers ────────────────────────────────────────────────────────
  console.log('\n2. Creating cash buyers...')
  const buyerIds: string[] = []
  const buyerNames: string[] = []

  // 30 individuals
  for (let i = 0; i < 30; i++) {
    const [first, last] = INDIVIDUAL_NAMES[i % INDIVIDUAL_NAMES.length]
    const market = MARKETS[i % 3]
    const hasPhone = Math.random() > 0.1 // 90% have phone
    const hasEmail = Math.random() > 0.3  // 70% have email
    const daysBack = randomInt(0, 120)
    const purchaseCount = pick([0, 0, 1, 1, 2, 3, 3, 5, 7, 8, 10, 12, 15, 20, 25])
    const score = pick([12, 18, 25, 35, 42, 48, 55, 62, 68, 72, 78, 82, 88, 91, 95])
    const strategy = pick([...STRATEGIES])
    const propType = pick([...PROPERTY_TYPES])
    const minP = pick([50000, 80000, 100000, 120000, 150000, 200000])
    const maxP = minP + pick([50000, 80000, 100000, 150000, 200000, 300000])
    const closeSpeed = pick([7, 10, 14, 21, 30, null])
    const status = pick([...STATUSES])
    const phone = hasPhone ? randomPhone() : null
    const email = hasEmail ? randomEmail(first, last) : null

    const buyer = await prisma.cashBuyer.create({
      data: {
        profileId: profile.id,
        savedMarketId: marketIds[market.label],
        firstName: first,
        lastName: last,
        entityType: 'individual',
        phone,
        email,
        address: `${randomInt(100, 9999)} ${pick(['Oak', 'Elm', 'Maple', 'Cedar', 'Pine', 'Main', 'Travis', 'Peachtree'])} ${pick(['St', 'Ave', 'Dr', 'Ln', 'Blvd'])}`,
        city: market.city,
        state: market.state,
        zip: `${randomInt(10000, 99999)}`,
        cashPurchaseCount: purchaseCount,
        lastPurchaseDate: purchaseCount > 0 ? daysAgo(randomInt(10, 365)) : null,
        estimatedMinPrice: minP,
        estimatedMaxPrice: maxP,
        primaryPropertyType: propType as never,
        status: status as never,
        contactEnriched: !!(phone && email),
        enrichedAt: phone && email ? daysAgo(randomInt(0, 60)) : null,
        buyerScore: score,
        lastContactedAt: daysBack < 100 ? daysAgo(daysBack) : null,
        lastVerifiedAt: daysBack < 30 ? daysAgo(daysBack) : null,
        preferredMarkets: Math.random() > 0.2 ? [market.city] : [],
        preferredTypes: Math.random() > 0.3 ? [propType as never] : [],
        strategy: strategy as never,
        minPrice: minP,
        maxPrice: maxP,
        closeSpeedDays: closeSpeed,
        proofOfFundsVerified: Math.random() > 0.5,
        notes: Math.random() > 0.6 ? `${first} prefers ${strategy.toLowerCase()} deals in ${market.city}. Closing speed: ${closeSpeed ?? 'flexible'} days.` : null,
      },
    })
    buyerIds.push(buyer.id)
    buyerNames.push(`${first} ${last}`)
    process.stdout.write('.')
  }

  // 18 LLCs
  for (let i = 0; i < 18; i++) {
    const name = LLC_NAMES[i % LLC_NAMES.length]
    const market = MARKETS[i % 3]
    const hasPhone = Math.random() > 0.15
    const hasEmail = Math.random() > 0.25
    const daysBack = randomInt(0, 100)
    const purchaseCount = pick([0, 2, 4, 6, 8, 10, 14, 18, 22])
    const score = pick([15, 30, 45, 55, 65, 72, 80, 88, 93])
    const strategy = pick([...STRATEGIES])
    const propType = pick([...PROPERTY_TYPES])
    const minP = pick([100000, 150000, 200000, 250000, 300000, 400000])
    const maxP = minP + pick([100000, 200000, 300000, 500000])
    const closeSpeed = pick([7, 10, 14, 21, null])
    const status = pick([...STATUSES])
    const phone = hasPhone ? randomPhone() : null
    const email = hasEmail ? entityEmail(name) : null

    const buyer = await prisma.cashBuyer.create({
      data: {
        profileId: profile.id,
        savedMarketId: marketIds[market.label],
        entityName: `${name} LLC`,
        entityType: 'llc',
        phone,
        email,
        city: market.city,
        state: market.state,
        zip: `${randomInt(10000, 99999)}`,
        cashPurchaseCount: purchaseCount,
        lastPurchaseDate: purchaseCount > 0 ? daysAgo(randomInt(10, 300)) : null,
        estimatedMinPrice: minP,
        estimatedMaxPrice: maxP,
        primaryPropertyType: propType as never,
        status: status as never,
        contactEnriched: !!(phone && email),
        enrichedAt: phone && email ? daysAgo(randomInt(0, 45)) : null,
        buyerScore: score,
        lastContactedAt: daysBack < 90 ? daysAgo(daysBack) : null,
        lastVerifiedAt: daysBack < 20 ? daysAgo(daysBack) : null,
        preferredMarkets: Math.random() > 0.15 ? [market.city] : [],
        preferredTypes: Math.random() > 0.2 ? [propType as never] : [],
        strategy: strategy as never,
        minPrice: minP,
        maxPrice: maxP,
        closeSpeedDays: closeSpeed,
        proofOfFundsVerified: Math.random() > 0.4,
      },
    })
    buyerIds.push(buyer.id)
    buyerNames.push(`${name} LLC`)
    process.stdout.write('.')
  }
  console.log(`\n  Created ${buyerIds.length} buyers`)

  // ─── 3. Campaign + CampaignCalls ──────────────────────────────────────────
  console.log('\n3. Creating campaign and calls...')
  const campaign = await prisma.campaign.create({
    data: {
      profileId: profile.id,
      name: 'Q1 DFW Outreach',
      market: 'Dallas, TX',
      status: 'COMPLETED',
      totalBuyers: 15,
      callsCompleted: 15,
      qualified: 6,
      notBuying: 3,
      noAnswer: 4,
      totalTalkTime: 2700,
      startedAt: daysAgo(30),
      completedAt: daysAgo(25),
    },
  })

  const callBuyerIndices = Array.from({ length: 15 }, (_, i) => i)
  for (const idx of callBuyerIndices) {
    const outcome = pick([...CALL_OUTCOMES])
    const dur = outcome === 'NO_ANSWER' ? 0 : outcome === 'VOICEMAIL' ? 30 : randomInt(60, 420)
    await prisma.campaignCall.create({
      data: {
        campaignId: campaign.id,
        buyerId: buyerIds[idx],
        phoneNumber: randomPhone(),
        outcome: outcome as never,
        durationSecs: dur,
        aiSummary: outcome === 'QUALIFIED'
          ? `Buyer is interested in SFR deals. Budget $${randomInt(80, 250)}K. Can close in ${pick([7, 10, 14])} days.`
          : outcome === 'NOT_BUYING'
            ? 'Buyer is no longer active in this market.'
            : null,
        startedAt: daysAgo(randomInt(25, 35)),
        endedAt: daysAgo(randomInt(25, 35)),
      },
    })
  }
  console.log(`  Created 1 campaign with ${callBuyerIndices.length} calls`)

  // ─── 4. Deals ─────────────────────────────────────────────────────────────
  console.log('\n4. Creating deals...')
  const dealIds: string[] = []
  for (const addr of DEAL_ADDRESSES) {
    const asking = randomInt(120000, 350000)
    const deal = await prisma.deal.create({
      data: {
        profileId: profile.id,
        address: addr.address,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        propertyType: pick(['SFR', 'MULTI_FAMILY']) as never,
        askingPrice: asking,
        assignFee: randomInt(8000, 25000),
        arv: asking + randomInt(40000, 120000),
        repairCost: randomInt(15000, 60000),
        confidenceScore: randomInt(55, 95),
        flipProfit: randomInt(15000, 65000),
        rentalCashFlow: randomInt(200, 800),
        status: pick(['ACTIVE', 'UNDER_OFFER', 'CLOSED']) as never,
        beds: pick([2, 3, 3, 4]),
        baths: pick([1, 1.5, 2, 2.5]),
        sqft: randomInt(900, 2800),
        yearBuilt: randomInt(1960, 2010),
        condition: pick(['distressed', 'fair', 'good']),
      },
    })
    dealIds.push(deal.id)
    console.log(`  + ${addr.address}, ${addr.city} ${addr.state}`)
  }

  // ─── 5. DealMatches ───────────────────────────────────────────────────────
  console.log('\n5. Creating deal matches...')
  const matchPairs = new Set<string>()
  let matchCount = 0
  for (let i = 0; i < 10; i++) {
    const dealId = dealIds[i % dealIds.length]
    const buyerId = buyerIds[randomInt(0, 20)] // top 20 buyers
    const key = `${dealId}:${buyerId}`
    if (matchPairs.has(key)) continue
    matchPairs.add(key)

    await prisma.dealMatch.create({
      data: {
        dealId,
        buyerId,
        matchScore: randomInt(40, 98),
        buyBoxScore: randomInt(30, 100),
        priceScore: randomInt(40, 100),
        strategyScore: randomInt(20, 100),
        timingScore: randomInt(30, 100),
        closeProbScore: randomInt(20, 95),
        outreachSent: Math.random() > 0.3,
        viewed: Math.random() > 0.5,
      },
    })
    matchCount++
  }
  console.log(`  Created ${matchCount} deal matches`)

  // ─── 6. Offers ─────────────────────────────────────────────────────────────
  console.log('\n6. Creating offers...')
  const offerConfigs = [
    { status: 'ACCEPTED' as const, terms: 'Cash, as-is, 7-day close' },
    { status: 'PENDING' as const, terms: 'Cash, inspection contingency, 14-day close' },
    { status: 'REJECTED' as const, terms: 'Cash, seller to cover closing costs, 21-day close' },
  ]
  for (let i = 0; i < offerConfigs.length; i++) {
    const cfg = offerConfigs[i]
    await prisma.offer.create({
      data: {
        dealId: dealIds[i % dealIds.length],
        buyerId: buyerIds[i],
        amount: randomInt(150000, 320000),
        terms: cfg.terms,
        status: cfg.status as never,
        message: cfg.status === 'ACCEPTED'
          ? 'Great deal, happy to move forward.'
          : cfg.status === 'REJECTED'
            ? 'Price is too high for this area.'
            : 'Interested, pending final review.',
        closeDate: daysAgo(-randomInt(7, 30)), // future date
      },
    })
    console.log(`  + Offer (${cfg.status}) from ${buyerNames[i]}`)
  }

  // ─── 7. Activity Events ───────────────────────────────────────────────────
  console.log('\n7. Creating activity events...')
  const activityData: Array<{
    buyerId: string
    profileId: string
    type: string
    title: string
    detail?: string
    createdAt: Date
  }> = []

  // Created events for all buyers
  for (let i = 0; i < buyerIds.length; i++) {
    activityData.push({
      buyerId: buyerIds[i],
      profileId: profile.id,
      type: 'created',
      title: `Buyer ${buyerNames[i]} added to CRM`,
      createdAt: daysAgo(randomInt(7, 90)),
    })
  }

  // Call events for called buyers
  for (let i = 0; i < 15; i++) {
    activityData.push({
      buyerId: buyerIds[i],
      profileId: profile.id,
      type: 'call_completed',
      title: `AI call completed — ${pick(['Qualified', 'Not Buying', 'No Answer', 'Voicemail'])}`,
      detail: `Call duration: ${randomInt(1, 7)} min. ${pick(['Buyer interested in SFR deals.', 'Left voicemail.', 'No answer after 3 rings.', 'Buyer not currently buying.'])}`,
      createdAt: daysAgo(randomInt(5, 35)),
    })
  }

  // Score update events
  for (let i = 0; i < 10; i++) {
    const oldScore = randomInt(20, 60)
    const newScore = randomInt(50, 95)
    activityData.push({
      buyerId: buyerIds[i],
      profileId: profile.id,
      type: 'score_updated',
      title: `Score updated from ${oldScore} to ${newScore}`,
      createdAt: daysAgo(randomInt(1, 20)),
    })
  }

  // Deal matched events
  for (let i = 0; i < 6; i++) {
    activityData.push({
      buyerId: buyerIds[i],
      profileId: profile.id,
      type: 'deal_matched',
      title: `Matched to deal at ${DEAL_ADDRESSES[i % DEAL_ADDRESSES.length].address}`,
      detail: `Match score: ${randomInt(60, 95)}%`,
      createdAt: daysAgo(randomInt(2, 25)),
    })
  }

  await prisma.activityEvent.createMany({
    data: activityData.map((a) => ({
      buyerId: a.buyerId,
      profileId: a.profileId,
      type: a.type,
      title: a.title,
      detail: a.detail ?? null,
      createdAt: a.createdAt,
    })),
  })
  console.log(`  Created ${activityData.length} activity events`)

  // ─── 8. Run auto-tagging ──────────────────────────────────────────────────
  console.log('\n8. Running auto-tagging...')
  // Import the tag definitions and upsert them
  const AUTO_TAG_DEFS = [
    { name: 'repeat_closer', label: 'Repeat Closer', color: '#15803d', description: 'Buyer has 2+ accepted offers' },
    { name: 'hot_lead', label: 'Hot Lead', color: '#dc2626', description: 'High score, recently contacted, has phone' },
    { name: 'high_volume', label: 'High Volume Buyer', color: '#7c3aed', description: '10+ verified cash purchases' },
    { name: 'needs_deal', label: 'Needs a Deal', color: '#2563eb', description: 'Verified buyer with no deal matches' },
    { name: 'going_cold', label: 'Going Cold', color: '#f59e0b', description: 'Contacted 30-60 days ago, low score' },
    { name: 'no_contact_info', label: 'No Contact Info', color: '#6b7280', description: 'Missing phone and email' },
    { name: 'stale', label: 'Stale', color: '#9ca3af', description: 'No contact in 90+ days' },
    { name: 'new_buyer', label: 'New', color: '#06b6d4', description: 'Added within last 7 days' },
    { name: 'whale', label: 'Whale', color: '#8b5cf6', description: 'Max price 500k+ or 15+ purchases' },
    { name: 'responsive', label: 'Responsive', color: '#10b981', description: '3+ qualified outcomes out of 5+ calls' },
  ]

  for (const def of AUTO_TAG_DEFS) {
    await prisma.tag.upsert({
      where: { profileId_name: { profileId: profile.id, name: def.name } },
      create: { profileId: profile.id, name: def.name, label: def.label, color: def.color, type: 'auto', description: def.description },
      update: { label: def.label, color: def.color, description: def.description },
    })
  }
  console.log(`  Upserted ${AUTO_TAG_DEFS.length} auto-tag definitions`)

  // Apply tags based on simple checks (lightweight version of the full engine)
  let tagsApplied = 0
  const allBuyers = await prisma.cashBuyer.findMany({
    where: { profileId: profile.id, isOptedOut: false },
    include: {
      campaignCalls: { select: { outcome: true } },
      dealMatches: { select: { outreachSent: true, viewed: true, dealId: true, buyerId: true } },
      offers: { select: { status: true, dealId: true, buyerId: true } },
    },
  })

  const tagRecords = await prisma.tag.findMany({
    where: { profileId: profile.id, type: 'auto' },
  })
  const tagIdMap = new Map(tagRecords.map((t) => [t.name, t.id]))

  for (const buyer of allBuyers) {
    const now = new Date()
    const daysSinceContact = buyer.lastContactedAt
      ? Math.floor((now.getTime() - buyer.lastContactedAt.getTime()) / 86400000)
      : Infinity
    const daysSinceCreated = Math.floor((now.getTime() - buyer.createdAt.getTime()) / 86400000)
    const acceptedOffers = buyer.offers.filter((o) => o.status === 'ACCEPTED').length
    const qualifiedCalls = buyer.campaignCalls.filter(
      (c) => c.outcome === 'QUALIFIED' || c.outcome === 'CALLBACK_REQUESTED'
    ).length

    const tagsToApply: string[] = []

    if (acceptedOffers >= 2) tagsToApply.push('repeat_closer')
    if (buyer.buyerScore >= 75 && daysSinceContact <= 14 && buyer.phone) tagsToApply.push('hot_lead')
    if (buyer.cashPurchaseCount >= 10) tagsToApply.push('high_volume')
    if (['RECENTLY_VERIFIED', 'HIGH_CONFIDENCE'].includes(buyer.status) && buyer.dealMatches.length === 0) tagsToApply.push('needs_deal')
    if (daysSinceContact >= 30 && daysSinceContact <= 60 && buyer.buyerScore < 50) tagsToApply.push('going_cold')
    if (!buyer.phone && !buyer.email) tagsToApply.push('no_contact_info')
    if (daysSinceContact >= 90 && daysSinceCreated >= 14) tagsToApply.push('stale')
    if (daysSinceCreated <= 7) tagsToApply.push('new_buyer')
    if ((buyer.maxPrice != null && buyer.maxPrice >= 500000) || buyer.cashPurchaseCount >= 15) tagsToApply.push('whale')
    if (buyer.campaignCalls.length >= 5 && qualifiedCalls >= 3) tagsToApply.push('responsive')

    for (const tagName of tagsToApply) {
      const tagId = tagIdMap.get(tagName)
      if (!tagId) continue
      try {
        await prisma.buyerTag.create({
          data: { buyerId: buyer.id, tagId, autoApplied: true },
        })
        tagsApplied++
      } catch {
        // unique constraint — already exists, skip
      }
    }
  }
  console.log(`  Applied ${tagsApplied} auto-tags`)

  // ─── Done ─────────────────────────────────────────────────────────────────
  console.log('\n✓ Seed complete!')
  console.log(`  ${buyerIds.length} buyers`)
  console.log(`  ${DEAL_ADDRESSES.length} deals`)
  console.log(`  ${matchCount} deal matches`)
  console.log(`  ${offerConfigs.length} offers`)
  console.log(`  ${activityData.length} activity events`)
  console.log(`  ${tagsApplied} auto-tags`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
