/**
 * Seed CRM — Populate the database with realistic, story-driven test data.
 *
 * Usage:
 *   npx tsx scripts/seed-crm.ts [profileId] [--clean]
 *
 * Flags:
 *   --clean  Truncate all seed data before re-seeding
 *
 * If no profileId is provided, uses the first profile in the database.
 */

import 'dotenv/config'
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

// ─── SEED DATA CONSTANTS ────────────────────────────────────────────────────

const MARKETS = [
  { label: 'Dallas, TX', city: 'Dallas', state: 'TX' },
  { label: 'Phoenix, AZ', city: 'Phoenix', state: 'AZ' },
  { label: 'Atlanta, GA', city: 'Atlanta', state: 'GA' },
  { label: 'Tampa, FL', city: 'Tampa', state: 'FL' },
]

const INDIVIDUAL_NAMES: [string, string][] = [
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
]

const STRATEGIES = ['FLIP', 'HOLD', 'BOTH'] as const
const PROPERTY_TYPES = ['SFR', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'CONDO'] as const
const CALL_OUTCOMES = ['QUALIFIED', 'NOT_BUYING', 'NO_ANSWER', 'VOICEMAIL', 'CALLBACK_REQUESTED'] as const

// Deterministic data for the first 6 buyers (story characters)
const STORY_BUYERS = [
  { marketIdx: 0, propType: 'SFR',          strategy: 'FLIP', minP: 100000, maxP: 250000, closeSpeed: 7,  score: 91, status: 'HIGH_CONFIDENCE',   purchases: 12, daysBack: 5  },
  { marketIdx: 2, propType: 'SFR',          strategy: 'HOLD', minP: 120000, maxP: 200000, closeSpeed: 14, score: 78, status: 'ACTIVE',             purchases: 5,  daysBack: 12 },
  { marketIdx: 2, propType: 'MULTI_FAMILY', strategy: 'FLIP', minP: 100000, maxP: 250000, closeSpeed: 10, score: 85, status: 'RECENTLY_VERIFIED',  purchases: 8,  daysBack: 3  },
  { marketIdx: 0, propType: 'SFR',          strategy: 'FLIP', minP: 80000,  maxP: 180000, closeSpeed: 21, score: 62, status: 'ACTIVE',             purchases: 3,  daysBack: 20 },
  { marketIdx: 2, propType: 'MULTI_FAMILY', strategy: 'HOLD', minP: 100000, maxP: 300000, closeSpeed: 14, score: 72, status: 'HIGH_CONFIDENCE',    purchases: 6,  daysBack: 8  },
  { marketIdx: 0, propType: 'SFR',          strategy: 'FLIP', minP: 150000, maxP: 250000, closeSpeed: 7,  score: 45, status: 'DORMANT',            purchases: 2,  daysBack: 75 },
]

// ─── Story-driven deals ─────────────────────────────────────────────────────
// Story 1: Completed deal (happy path)      — CLOSED
// Story 2: Deal in progress                 — UNDER_OFFER
// Story 3: New deal just entered            — DRAFT
// Story 4: Stale/problem deal               — CANCELLED
// Story 5: Active deal with listing         — ACTIVE
// Story 6: Active deal, contract sent       — ACTIVE

const DEAL_CONFIGS = [
  { address: '4217 Magnolia Ave',       city: 'Dallas',  state: 'TX', zip: '75215', propertyType: 'SFR',          status: 'CLOSED',      askingPrice: 185000, assignFee: 15000, arv: 265000, repairCost: 35000, confidence: 88, flipProfit: 45000, rentalCashFlow: 650,  beds: 3, baths: 2,   sqft: 1450, yearBuilt: 1985, condition: 'fair',       closedDaysAgo: 5 },
  { address: '1540 Peachtree St NE',    city: 'Atlanta', state: 'GA', zip: '30309', propertyType: 'SFR',          status: 'UNDER_OFFER', askingPrice: 155000, assignFee: 12000, arv: 225000, repairCost: 28000, confidence: 76, flipProfit: 42000, rentalCashFlow: 520,  beds: 4, baths: 2.5, sqft: 1800, yearBuilt: 1992, condition: 'good',       closedDaysAgo: null },
  { address: '7621 Camelback Rd',       city: 'Phoenix', state: 'AZ', zip: '85014', propertyType: 'SFR',          status: 'DRAFT',       askingPrice: 210000, assignFee: 18000, arv: 310000, repairCost: 45000, confidence: 82, flipProfit: 55000, rentalCashFlow: 700,  beds: 3, baths: 2,   sqft: 1600, yearBuilt: 2001, condition: 'distressed', closedDaysAgo: null },
  { address: '5501 Bay Shore Dr',       city: 'Tampa',   state: 'FL', zip: '33611', propertyType: 'SFR',          status: 'CANCELLED',   askingPrice: 175000, assignFee: 10000, arv: 240000, repairCost: 30000, confidence: 71, flipProfit: 35000, rentalCashFlow: 480,  beds: 3, baths: 1.5, sqft: 1200, yearBuilt: 1978, condition: 'fair',       closedDaysAgo: null },
  { address: '1820 E Roosevelt St',     city: 'Phoenix', state: 'AZ', zip: '85006', propertyType: 'MULTI_FAMILY', status: 'ACTIVE',      askingPrice: 195000, assignFee: 14000, arv: 280000, repairCost: 40000, confidence: 79, flipProfit: 48000, rentalCashFlow: 850,  beds: 4, baths: 2,   sqft: 2200, yearBuilt: 1968, condition: 'fair',       closedDaysAgo: null },
  { address: '892 Joseph E Boone Blvd', city: 'Atlanta', state: 'GA', zip: '30314', propertyType: 'SFR',          status: 'ACTIVE',      askingPrice: 140000, assignFee: 11000, arv: 210000, repairCost: 32000, confidence: 84, flipProfit: 38000, rentalCashFlow: 560,  beds: 3, baths: 2,   sqft: 1350, yearBuilt: 1995, condition: 'good',       closedDaysAgo: null },
]

// ─── CLEAN ──────────────────────────────────────────────────────────────────

async function cleanSeedData(profileId: string) {
  console.log('Cleaning seed data...')

  // Gather IDs for nested deletes
  const dealIds = (await prisma.deal.findMany({ where: { profileId }, select: { id: true } })).map(d => d.id)
  const listingIds = (await prisma.marketplaceListing.findMany({ where: { profileId }, select: { id: true } })).map(l => l.id)
  const contractIds = (await prisma.contract.findMany({ where: { profileId }, select: { id: true } })).map(c => c.id)
  const campaignIds = (await prisma.campaign.findMany({ where: { profileId }, select: { id: true } })).map(c => c.id)

  // Delete in reverse dependency order
  let r
  r = await prisma.buyerBoardContact.deleteMany({ where: { post: { profileId } } })
  if (r.count) console.log(`  Removed ${r.count} buyer board contacts`)

  r = await prisma.buyerBoardPost.deleteMany({ where: { profileId } })
  if (r.count) console.log(`  Removed ${r.count} buyer board posts`)

  r = await prisma.marketplaceInquiry.deleteMany({ where: { listingId: { in: listingIds } } })
  if (r.count) console.log(`  Removed ${r.count} marketplace inquiries`)

  r = await prisma.marketplaceListing.deleteMany({ where: { profileId } })
  if (r.count) console.log(`  Removed ${r.count} marketplace listings`)

  r = await prisma.contractVersion.deleteMany({ where: { contractId: { in: contractIds } } })
  if (r.count) console.log(`  Removed ${r.count} contract versions`)

  r = await prisma.contract.deleteMany({ where: { profileId } })
  if (r.count) console.log(`  Removed ${r.count} contracts`)

  r = await prisma.offer.deleteMany({ where: { dealId: { in: dealIds } } })
  if (r.count) console.log(`  Removed ${r.count} offers`)

  r = await prisma.dealMatch.deleteMany({ where: { dealId: { in: dealIds } } })
  if (r.count) console.log(`  Removed ${r.count} deal matches`)

  r = await prisma.deal.deleteMany({ where: { profileId } })
  if (r.count) console.log(`  Removed ${r.count} deals`)

  r = await prisma.buyerTag.deleteMany({ where: { tag: { profileId } } })
  if (r.count) console.log(`  Removed ${r.count} buyer tags`)

  r = await prisma.tag.deleteMany({ where: { profileId } })
  if (r.count) console.log(`  Removed ${r.count} tags`)

  r = await prisma.activityEvent.deleteMany({ where: { profileId } })
  if (r.count) console.log(`  Removed ${r.count} activity events`)

  r = await prisma.campaignCall.deleteMany({ where: { campaignId: { in: campaignIds } } })
  if (r.count) console.log(`  Removed ${r.count} campaign calls`)

  r = await prisma.campaign.deleteMany({ where: { profileId } })
  if (r.count) console.log(`  Removed ${r.count} campaigns`)

  r = await prisma.cashBuyer.deleteMany({ where: { profileId } })
  if (r.count) console.log(`  Removed ${r.count} cash buyers`)

  r = await prisma.savedMarket.deleteMany({ where: { profileId } })
  if (r.count) console.log(`  Removed ${r.count} saved markets`)

  // Delete seed contact profiles (created for buyer board contacts)
  r = await prisma.profile.deleteMany({ where: { userId: { startsWith: 'seed_bb_contact_' } } })
  if (r.count) console.log(`  Removed ${r.count} seed contact profiles`)

  console.log('  Clean complete.\n')
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now()

  // Parse args
  const isClean = process.argv.includes('--clean')
  const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith('--'))
  const profileId = positionalArgs[0] || null

  // Find profile
  let profile: { id: string; email: string; firstName: string | null; lastName: string | null; phone: string | null; company: string | null }
  if (profileId) {
    const found = await prisma.profile.findUnique({ where: { id: profileId } })
    if (!found) { console.error(`Profile ${profileId} not found.`); process.exit(1) }
    profile = found
  } else {
    const found = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!found) { console.error('No profiles in the database. Create a user account first.'); process.exit(1) }
    profile = found
  }

  console.log('\n=== DealFlow AI Seed ===')
  console.log(`Profile: ${profile.id} (${profile.email})`)
  if (isClean) console.log('Mode:    --clean (truncate and re-seed)')
  console.log()

  // Clean or idempotency check
  if (isClean) {
    await cleanSeedData(profile.id)
  } else {
    const count = await prisma.cashBuyer.count({ where: { profileId: profile.id } })
    if (count >= 30) {
      console.log(`Already seeded (${count} buyers exist). Run with --clean to re-seed.`)
      process.exit(0)
    }
  }

  // ─── 1. SavedMarkets ──────────────────────────────────────────────────────
  console.log('1. Creating saved markets...')
  const marketIds: Record<string, string> = {}
  for (const m of MARKETS) {
    const existing = await prisma.savedMarket.findFirst({
      where: { profileId: profile.id, label: m.label },
    })
    if (existing) {
      marketIds[m.label] = existing.id
    } else {
      const created = await prisma.savedMarket.create({
        data: { profileId: profile.id, label: m.label, city: m.city, state: m.state },
      })
      marketIds[m.label] = created.id
    }
  }
  console.log(`   ${MARKETS.length} markets`)

  // ─── 2. CashBuyers ────────────────────────────────────────────────────────
  console.log('2. Creating cash buyers...')
  const buyerIds: string[] = []
  const buyerNames: string[] = []

  // 30 individuals
  for (let i = 0; i < 30; i++) {
    const [first, last] = INDIVIDUAL_NAMES[i]
    const sb = i < STORY_BUYERS.length ? STORY_BUYERS[i] : null
    const marketIdx = sb ? sb.marketIdx : (i % 3)
    const market = MARKETS[marketIdx]
    const hasPhone = Math.random() > 0.1
    const hasEmail = Math.random() > 0.3
    const purchases = sb ? sb.purchases : pick([0, 0, 1, 1, 2, 3, 3, 5, 7, 8, 10, 12, 15, 20, 25])
    const score = sb ? sb.score : pick([12, 18, 25, 35, 42, 48, 55, 62, 68, 72, 78, 82, 88, 91, 95])
    const strategy = sb ? sb.strategy : pick([...STRATEGIES])
    const propType = sb ? sb.propType : pick([...PROPERTY_TYPES])
    const minP = sb ? sb.minP : pick([50000, 80000, 100000, 120000, 150000, 200000])
    const maxP = sb ? sb.maxP : (minP + pick([50000, 80000, 100000, 150000, 200000, 300000]))
    const closeSpeed = sb ? sb.closeSpeed : pick([7, 10, 14, 21, 30, null])
    const status = sb ? sb.status : pick(['ACTIVE', 'HIGH_CONFIDENCE', 'RECENTLY_VERIFIED', 'DORMANT'])
    const daysBack = sb ? sb.daysBack : randomInt(0, 120)
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
        cashPurchaseCount: purchases,
        lastPurchaseDate: purchases > 0 ? daysAgo(randomInt(10, 365)) : null,
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
        notes: sb ? `${first} prefers ${strategy.toLowerCase()} deals in ${market.city}. Closing speed: ${closeSpeed ?? 'flexible'} days.` : null,
      },
    })
    buyerIds.push(buyer.id)
    buyerNames.push(`${first} ${last}`)
    process.stdout.write('.')
  }

  // 18 LLCs
  for (let i = 0; i < 18; i++) {
    const name = LLC_NAMES[i]
    const market = MARKETS[i % 3]
    const hasPhone = Math.random() > 0.15
    const hasEmail = Math.random() > 0.25
    const daysBack = randomInt(0, 100)
    const purchases = pick([0, 2, 4, 6, 8, 10, 14, 18, 22])
    const score = pick([15, 30, 45, 55, 65, 72, 80, 88, 93])
    const strategy = pick([...STRATEGIES])
    const propType = pick([...PROPERTY_TYPES])
    const minP = pick([100000, 150000, 200000, 250000, 300000, 400000])
    const maxP = minP + pick([100000, 200000, 300000, 500000])
    const closeSpeed = pick([7, 10, 14, 21, null])
    const status = pick(['ACTIVE', 'HIGH_CONFIDENCE', 'RECENTLY_VERIFIED', 'DORMANT'])
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
        cashPurchaseCount: purchases,
        lastPurchaseDate: purchases > 0 ? daysAgo(randomInt(10, 300)) : null,
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
  console.log(`\n   ${buyerIds.length} buyers (30 individual + 18 LLC)`)

  // ─── 3. Campaign + CampaignCalls ──────────────────────────────────────────
  console.log('3. Creating campaign and calls...')
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

  for (let idx = 0; idx < 15; idx++) {
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
  console.log('   1 campaign, 15 calls')

  // ─── 4. Deals (story-driven) ──────────────────────────────────────────────
  console.log('4. Creating deals...')
  const dealIds: string[] = []
  for (const cfg of DEAL_CONFIGS) {
    const deal = await prisma.deal.create({
      data: {
        profileId: profile.id,
        address: cfg.address,
        city: cfg.city,
        state: cfg.state,
        zip: cfg.zip,
        propertyType: cfg.propertyType as never,
        askingPrice: cfg.askingPrice,
        assignFee: cfg.assignFee,
        arv: cfg.arv,
        repairCost: cfg.repairCost,
        confidenceScore: cfg.confidence,
        flipProfit: cfg.flipProfit,
        rentalCashFlow: cfg.rentalCashFlow,
        status: cfg.status as never,
        closedAt: cfg.closedDaysAgo != null ? daysAgo(cfg.closedDaysAgo) : null,
        beds: cfg.beds,
        baths: cfg.baths,
        sqft: cfg.sqft,
        yearBuilt: cfg.yearBuilt,
        condition: cfg.condition,
      },
    })
    dealIds.push(deal.id)
    console.log(`   + ${cfg.address}, ${cfg.city} ${cfg.state} [${cfg.status}]`)
  }

  // ─── 5. DealMatches (story-driven) ────────────────────────────────────────
  console.log('5. Creating deal matches...')
  // [dealIdx, buyerIdx, score, outreachSent]
  const MATCH_CONFIGS: [number, number, number, boolean][] = [
    // Story 1: CLOSED deal — 5 matches, outreach to top 3
    [0, 0, 95, true], [0, 1, 78, true], [0, 2, 72, true], [0, 3, 65, false], [0, 4, 58, false],
    // Story 2: UNDER_OFFER deal — 4 matches, outreach to 2
    [1, 1, 88, true], [1, 5, 75, true], [1, 6, 62, false], [1, 7, 55, false],
    // Story 5: ACTIVE deal — 3 matches, no outreach yet
    [4, 2, 82, false], [4, 8, 70, false], [4, 9, 61, false],
    // Story 6: ACTIVE deal — 3 matches, outreach to 1
    [5, 4, 85, true], [5, 10, 68, false], [5, 11, 54, false],
  ]

  for (const [dealIdx, buyerIdx, score, sent] of MATCH_CONFIGS) {
    await prisma.dealMatch.create({
      data: {
        dealId: dealIds[dealIdx],
        buyerId: buyerIds[buyerIdx],
        matchScore: score,
        buyBoxScore: Math.min(100, score + randomInt(-5, 10)),
        priceScore: Math.min(100, score + randomInt(-10, 5)),
        strategyScore: Math.min(100, score + randomInt(-8, 8)),
        timingScore: Math.min(100, score + randomInt(-12, 5)),
        closeProbScore: Math.min(100, score + randomInt(-15, 3)),
        outreachSent: sent,
        outreachSentAt: sent ? daysAgo(randomInt(3, 20)) : null,
        viewed: sent ? Math.random() > 0.3 : false,
        viewedAt: sent && Math.random() > 0.3 ? daysAgo(randomInt(1, 15)) : null,
      },
    })
  }
  console.log(`   ${MATCH_CONFIGS.length} deal matches`)

  // ─── 6. Offers (story-driven) ─────────────────────────────────────────────
  console.log('6. Creating offers...')
  // Story 1: CLOSED deal — ACCEPTED + REJECTED
  // Story 2: UNDER_OFFER deal — PENDING + COUNTERED
  // Story 4: CANCELLED deal — WITHDRAWN
  // Story 6: ACTIVE deal — PENDING
  const OFFER_CONFIGS = [
    { dealIdx: 0, buyerIdx: 0, amount: 195000, status: 'ACCEPTED',  terms: 'Cash, as-is, 7-day close',                       msg: 'Great property — moving forward immediately.',         signedAt: daysAgo(7) },
    { dealIdx: 0, buyerIdx: 3, amount: 170000, status: 'REJECTED',  terms: 'Cash, seller to cover closing costs, 21-day close', msg: 'Price is too high for this area.',                     signedAt: null },
    { dealIdx: 1, buyerIdx: 1, amount: 165000, status: 'PENDING',   terms: 'Cash, inspection contingency, 14-day close',       msg: 'Interested, pending final review.',                     signedAt: null },
    { dealIdx: 1, buyerIdx: 2, amount: 158000, status: 'COUNTERED', terms: 'Cash, 10-day close, reduced to $158K',             msg: 'Can we negotiate on the assignment fee?',              signedAt: null },
    { dealIdx: 3, buyerIdx: 5, amount: 165000, status: 'WITHDRAWN', terms: 'Cash, as-is, 10-day close',                        msg: 'Deal fell through — title issue discovered.',          signedAt: null },
    { dealIdx: 5, buyerIdx: 4, amount: 148000, status: 'PENDING',   terms: 'Cash, as-is, 14-day close',                        msg: 'Looking to close quickly on this one.',                signedAt: null },
  ]

  const offerIds: string[] = []
  for (const cfg of OFFER_CONFIGS) {
    const offer = await prisma.offer.create({
      data: {
        dealId: dealIds[cfg.dealIdx],
        buyerId: buyerIds[cfg.buyerIdx],
        amount: cfg.amount,
        terms: cfg.terms,
        status: cfg.status as never,
        message: cfg.msg,
        closeDate: daysAgo(-randomInt(7, 30)),
        signedAt: cfg.signedAt,
      },
    })
    offerIds.push(offer.id)
    console.log(`   + Offer (${cfg.status}) from ${buyerNames[cfg.buyerIdx]} on deal ${cfg.dealIdx}`)
  }

  // ─── 7. Contracts (story-driven) ──────────────────────────────────────────
  console.log('7. Creating contracts...')

  const CONTRACT_TEMPLATES: Record<string, string> = {
    TX: 'Texas Assignment of Contract',
    AZ: 'Arizona Assignment of Contract',
    GA: 'Georgia Assignment of Contract',
    FL: 'Florida Assignment of Contract',
  }

  // [offerIdx, dealIdx, status, sellerSignedDaysAgo, buyerSignedDaysAgo, voidedDaysAgo, voidReason]
  const CONTRACT_CONFIGS = [
    { offerIdx: 0, dealIdx: 0, status: 'EXECUTED' as const, sellerSigned: daysAgo(8),  buyerSigned: daysAgo(6),  voidedAt: null,      voidReason: null },
    { offerIdx: 2, dealIdx: 1, status: 'DRAFT'    as const, sellerSigned: null,         buyerSigned: null,         voidedAt: null,      voidReason: null },
    { offerIdx: 4, dealIdx: 3, status: 'VOIDED'   as const, sellerSigned: daysAgo(20),  buyerSigned: null,         voidedAt: daysAgo(12), voidReason: 'Title defect discovered during closing — liens on property.' },
    { offerIdx: 5, dealIdx: 5, status: 'SENT'     as const, sellerSigned: null,         buyerSigned: null,         voidedAt: null,      voidReason: null },
  ]

  const contractIds: string[] = []
  for (const cfg of CONTRACT_CONFIGS) {
    const dealCfg = DEAL_CONFIGS[cfg.dealIdx]
    const offerCfg = OFFER_CONFIGS[cfg.offerIdx]
    const sellerName = pick(['John A. Whitfield', 'Maria T. Gonzalez', 'Robert L. Chen', 'Patricia D. Brooks'])
    const titleCompany = pick(['First American Title', 'Fidelity National Title', 'Chicago Title Insurance', 'Stewart Title'])

    const contract = await prisma.contract.create({
      data: {
        profileId: profile.id,
        dealId: dealIds[cfg.dealIdx],
        offerId: offerIds[cfg.offerIdx],
        templateName: CONTRACT_TEMPLATES[dealCfg.state] ?? 'Standard Assignment of Contract',
        status: cfg.status,
        documentUrl: cfg.status !== 'DRAFT' ? `https://docs.dealflow.ai/contracts/${offerIds[cfg.offerIdx]}.pdf` : null,
        sellerSignedAt: cfg.sellerSigned,
        buyerSignedAt: cfg.buyerSigned,
        voidedAt: cfg.voidedAt,
        voidReason: cfg.voidReason,
        filledData: {
          sellerName,
          buyerName: buyerNames[offerCfg.buyerIdx],
          propertyAddress: `${dealCfg.address}, ${dealCfg.city}, ${dealCfg.state} ${dealCfg.zip}`,
          purchasePrice: offerCfg.amount,
          assignmentFee: dealCfg.assignFee,
          closingDate: daysAgo(-randomInt(7, 30)).toISOString().split('T')[0],
          titleCompany,
          earnestMoney: randomInt(1000, 5000),
          terms: offerCfg.terms,
        },
      },
    })
    contractIds.push(contract.id)
    console.log(`   + Contract (${cfg.status}) for ${dealCfg.address}`)
  }

  // ─── 8. Contract Versions ─────────────────────────────────────────────────
  console.log('8. Creating contract versions...')
  let cvCount = 0

  // Helper to create a version
  async function createCV(contractId: string, version: number, changeType: string, summary: string, fields: string[] = [], prev: Record<string, unknown> = {}, filledData?: unknown, docUrl?: string | null) {
    await prisma.contractVersion.create({
      data: {
        contractId,
        version,
        filledData: filledData ?? undefined,
        documentUrl: docUrl ?? undefined,
        changeType,
        changeSummary: summary,
        changedFields: fields,
        previousValues: Object.keys(prev).length > 0 ? prev : undefined,
        changedBy: profile.id,
      },
    })
    cvCount++
  }

  // Contract 0 (EXECUTED): v1 created → v2 fields → v3 SENT → v4 EXECUTED
  await createCV(contractIds[0], 1, 'created', 'Contract created')
  await createCV(contractIds[0], 2, 'fields_updated', 'Updated earnest money and closing date', ['earnestMoney', 'closingDate'], { earnestMoney: 2000, closingDate: 'TBD' })
  await createCV(contractIds[0], 3, 'status_changed', 'Status changed from DRAFT to SENT')
  await createCV(contractIds[0], 4, 'status_changed', 'Status changed from SENT to EXECUTED')
  await prisma.contract.update({ where: { id: contractIds[0] }, data: { currentVersion: 4 } })

  // Contract 1 (DRAFT): v1 created
  await createCV(contractIds[1], 1, 'created', 'Contract created')

  // Contract 2 (VOIDED): v1 created → v2 VOIDED
  await createCV(contractIds[2], 1, 'created', 'Contract created')
  await createCV(contractIds[2], 2, 'status_changed', 'Status changed from DRAFT to VOIDED — title defect')
  await prisma.contract.update({ where: { id: contractIds[2] }, data: { currentVersion: 2 } })

  // Contract 3 (SENT): v1 created → v2 SENT
  await createCV(contractIds[3], 1, 'created', 'Contract created')
  await createCV(contractIds[3], 2, 'status_changed', 'Status changed from DRAFT to SENT')
  await prisma.contract.update({ where: { id: contractIds[3] }, data: { currentVersion: 2 } })

  console.log(`   ${cvCount} contract versions`)

  // ─── 9. Activity Events ───────────────────────────────────────────────────
  console.log('9. Creating activity events...')
  const activityData: Array<{
    buyerId: string; profileId: string; type: string; title: string; detail?: string; createdAt: Date
  }> = []

  // Buyer creation events
  for (let i = 0; i < buyerIds.length; i++) {
    activityData.push({
      buyerId: buyerIds[i], profileId: profile.id, type: 'created',
      title: `Buyer ${buyerNames[i]} added to CRM`,
      createdAt: daysAgo(randomInt(7, 90)),
    })
  }

  // Campaign call events
  for (let i = 0; i < 15; i++) {
    activityData.push({
      buyerId: buyerIds[i], profileId: profile.id, type: 'call_completed',
      title: `AI call completed — ${pick(['Qualified', 'Not Buying', 'No Answer', 'Voicemail'])}`,
      detail: `Call duration: ${randomInt(1, 7)} min.`,
      createdAt: daysAgo(randomInt(5, 35)),
    })
  }

  // Score update events
  for (let i = 0; i < 10; i++) {
    activityData.push({
      buyerId: buyerIds[i], profileId: profile.id, type: 'score_updated',
      title: `Score updated from ${randomInt(20, 60)} to ${randomInt(50, 95)}`,
      createdAt: daysAgo(randomInt(1, 20)),
    })
  }

  // Deal match events (one per match)
  for (const [dealIdx, buyerIdx] of MATCH_CONFIGS) {
    activityData.push({
      buyerId: buyerIds[buyerIdx], profileId: profile.id, type: 'deal_matched',
      title: `Matched to deal at ${DEAL_CONFIGS[dealIdx].address}`,
      detail: `Match score: ${MATCH_CONFIGS.find(m => m[0] === dealIdx && m[1] === buyerIdx)?.[2]}%`,
      createdAt: daysAgo(randomInt(2, 25)),
    })
  }

  // Offer events
  for (const cfg of OFFER_CONFIGS) {
    activityData.push({
      buyerId: buyerIds[cfg.buyerIdx], profileId: profile.id, type: 'offer_received',
      title: `Offer ($${(cfg.amount / 1000).toFixed(0)}K, ${cfg.status}) on ${DEAL_CONFIGS[cfg.dealIdx].address}`,
      createdAt: daysAgo(randomInt(2, 15)),
    })
  }

  // Contract events
  for (let i = 0; i < CONTRACT_CONFIGS.length; i++) {
    const cc = CONTRACT_CONFIGS[i]
    activityData.push({
      buyerId: buyerIds[OFFER_CONFIGS[cc.offerIdx].buyerIdx], profileId: profile.id, type: 'contract_created',
      title: `Contract (${cc.status}) created for ${DEAL_CONFIGS[cc.dealIdx].address}`,
      createdAt: daysAgo(randomInt(1, 12)),
    })
  }

  await prisma.activityEvent.createMany({
    data: activityData.map(a => ({
      buyerId: a.buyerId, profileId: a.profileId, type: a.type,
      title: a.title, detail: a.detail ?? null, createdAt: a.createdAt,
    })),
  })
  console.log(`   ${activityData.length} activity events`)

  // ─── 10. Auto-Tags ────────────────────────────────────────────────────────
  console.log('10. Running auto-tagging...')
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

  let tagsApplied = 0
  const allBuyers = await prisma.cashBuyer.findMany({
    where: { profileId: profile.id, isOptedOut: false },
    include: {
      campaignCalls: { select: { outcome: true } },
      dealMatches: { select: { outreachSent: true, viewed: true, dealId: true, buyerId: true } },
      offers: { select: { status: true, dealId: true, buyerId: true } },
    },
  })

  const tagRecords = await prisma.tag.findMany({ where: { profileId: profile.id, type: 'auto' } })
  const tagIdMap = new Map(tagRecords.map(t => [t.name, t.id]))

  for (const buyer of allBuyers) {
    const now = new Date()
    const daysSinceContact = buyer.lastContactedAt
      ? Math.floor((now.getTime() - buyer.lastContactedAt.getTime()) / 86400000)
      : Infinity
    const daysSinceCreated = Math.floor((now.getTime() - buyer.createdAt.getTime()) / 86400000)
    const acceptedOffers = buyer.offers.filter(o => o.status === 'ACCEPTED').length
    const qualifiedCalls = buyer.campaignCalls.filter(
      c => c.outcome === 'QUALIFIED' || c.outcome === 'CALLBACK_REQUESTED',
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
        await prisma.buyerTag.create({ data: { buyerId: buyer.id, tagId, autoApplied: true } })
        tagsApplied++
      } catch {
        // unique constraint — already exists
      }
    }
  }
  console.log(`   ${AUTO_TAG_DEFS.length} tag definitions, ${tagsApplied} tags applied`)

  // ─── 11. Marketplace Listings (story-driven) ─────────────────────────────
  console.log('11. Creating marketplace listings...')

  const LISTING_CONFIGS = [
    // Story 1: CLOSED deal → SOLD listing
    { dealIdx: 0, status: 'SOLD'    as const, views: 180, inquiries: 12, soldDaysAgo: 5 },
    // Story 2: UNDER_OFFER deal → ACTIVE listing
    { dealIdx: 1, status: 'ACTIVE'  as const, views: 65,  inquiries: 4,  soldDaysAgo: null },
    // Story 4: CANCELLED deal → EXPIRED listing
    { dealIdx: 3, status: 'EXPIRED' as const, views: 25,  inquiries: 1,  soldDaysAgo: null },
    // Story 5: ACTIVE deal → ACTIVE listing
    { dealIdx: 4, status: 'ACTIVE'  as const, views: 35,  inquiries: 2,  soldDaysAgo: null },
    // Story 6: ACTIVE deal → PAUSED listing
    { dealIdx: 5, status: 'PAUSED'  as const, views: 15,  inquiries: 1,  soldDaysAgo: null },
  ]

  const HEADLINES = [
    'Investor Special — Below Market Value!',
    'Cash Buyer Dream — Quick Close Available',
    'Distressed Property — Priced to Move',
    'High-Equity Flip Opportunity',
    'Turnkey Rental w/ Positive Cash Flow',
  ]

  const listingIds: string[] = []
  for (let i = 0; i < LISTING_CONFIGS.length; i++) {
    const cfg = LISTING_CONFIGS[i]
    const dealCfg = DEAL_CONFIGS[cfg.dealIdx]

    const listing = await prisma.marketplaceListing.create({
      data: {
        profileId: profile.id,
        dealId: dealIds[cfg.dealIdx],
        status: cfg.status as never,
        address: dealCfg.address,
        city: dealCfg.city,
        state: dealCfg.state,
        zip: dealCfg.zip,
        propertyType: dealCfg.propertyType as never,
        askingPrice: dealCfg.askingPrice,
        assignFee: dealCfg.assignFee,
        arv: dealCfg.arv,
        repairCost: dealCfg.repairCost,
        flipProfit: dealCfg.flipProfit,
        rentalCashFlow: dealCfg.rentalCashFlow,
        beds: dealCfg.beds,
        baths: dealCfg.baths,
        sqft: dealCfg.sqft,
        yearBuilt: dealCfg.yearBuilt,
        condition: dealCfg.condition,
        confidenceScore: dealCfg.confidence,
        headline: HEADLINES[i],
        description: `Great opportunity in ${dealCfg.city}, ${dealCfg.state}. ${dealCfg.beds}bd/${dealCfg.baths}ba, ${dealCfg.sqft} sqft. ARV estimated at $${(dealCfg.arv / 1000).toFixed(0)}K.`,
        viewCount: cfg.views,
        inquiryCount: cfg.inquiries,
        publishedAt: daysAgo(randomInt(5, 30)),
        soldAt: cfg.soldDaysAgo != null ? daysAgo(cfg.soldDaysAgo) : null,
      },
    })
    listingIds.push(listing.id)
    console.log(`   + Listing (${cfg.status}) — ${dealCfg.address}`)
  }

  // ─── 12. Marketplace Inquiries ────────────────────────────────────────────
  console.log('12. Creating marketplace inquiries...')

  const INQUIRY_NAMES = ['Alex Turner', 'Priya Sharma', 'Dante Williams', 'Keiko Nakamura', 'Rachel Adams', 'Malik Jefferson']
  const INQUIRY_MESSAGES = [
    'Interested in this property. Can you send more details?',
    'What is the current condition? Any major repairs needed?',
    'I can close in 7 days cash. Is the price negotiable?',
    'Looking for rentals in this area. What are the projected rents?',
    'Does this have a clear title? Can you send comps?',
    'I have proof of funds ready. What is the assignment fee?',
  ]

  // Inquiries on ACTIVE listings only (listing index 1 = deal 1, index 3 = deal 4)
  const INQUIRY_CONFIGS: { listingIdx: number; nameIdx: number; status: 'NEW' | 'CONTACTED' | 'CLOSED' }[] = [
    { listingIdx: 1, nameIdx: 0, status: 'NEW' },
    { listingIdx: 1, nameIdx: 1, status: 'NEW' },
    { listingIdx: 1, nameIdx: 2, status: 'CONTACTED' },
    { listingIdx: 3, nameIdx: 3, status: 'NEW' },
    { listingIdx: 3, nameIdx: 4, status: 'CONTACTED' },
    // One CLOSED inquiry on the SOLD listing
    { listingIdx: 0, nameIdx: 5, status: 'CLOSED' },
  ]

  for (const cfg of INQUIRY_CONFIGS) {
    await prisma.marketplaceInquiry.create({
      data: {
        listingId: listingIds[cfg.listingIdx],
        buyerName: INQUIRY_NAMES[cfg.nameIdx],
        buyerEmail: `${INQUIRY_NAMES[cfg.nameIdx].toLowerCase().replace(' ', '.')}@${pick(['gmail.com', 'outlook.com', 'yahoo.com'])}`,
        buyerPhone: Math.random() > 0.3 ? randomPhone() : null,
        message: INQUIRY_MESSAGES[cfg.nameIdx],
        status: cfg.status,
        createdAt: daysAgo(randomInt(1, 15)),
      },
    })
  }
  console.log(`   ${INQUIRY_CONFIGS.length} marketplace inquiries`)

  // ─── 13. Buyer Board Posts + Contacts ─────────────────────────────────────
  console.log('13. Creating buyer board posts...')

  const bbPosts = [
    { displayName: 'Derrick J.',   buyerType: 'Cash Buyer', propertyTypes: ['SFR'],               markets: ['Atlanta, GA', 'Decatur, GA'],              strategy: 'FLIP', minPrice: 80000,  maxPrice: 150000, closeSpeedDays: 10, proofOfFunds: true,  description: 'Experienced flipper with 15+ completed projects in metro Atlanta. Can close fast with no contingencies.' },
    { displayName: 'Angela S.',    buyerType: 'Landlord',   propertyTypes: ['LAND'],              markets: ['Maricopa County, AZ', 'Pinal County, AZ'], strategy: 'HOLD', minPrice: null,    maxPrice: 80000,  closeSpeedDays: 30, proofOfFunds: true,  description: 'Building land portfolio across Arizona. Prefers parcels with road access and utilities nearby.' },
    { displayName: 'Omar B.',      buyerType: 'Cash Buyer', propertyTypes: ['MULTI_FAMILY'],      markets: ['Tampa, FL', 'Hillsborough County, FL'],    strategy: 'HOLD', minPrice: 200000, maxPrice: 400000, closeSpeedDays: 14, proofOfFunds: true,  description: 'Looking for 2-4 unit properties in Tampa Bay area. Has funding lined up for multiple acquisitions.' },
    { displayName: 'Christine L.', buyerType: 'Flipper',    propertyTypes: ['SFR'],               markets: ['Dallas, TX', 'Fort Worth, TX'],             strategy: 'FLIP', minPrice: 100000, maxPrice: 200000, closeSpeedDays: 7,  proofOfFunds: true,  description: 'DFW-based flipper with own crew. Can close in 7 days. Prefers properties that need light-to-moderate rehab.' },
    { displayName: 'Jamaal W.',    buyerType: 'Cash Buyer', propertyTypes: ['SFR', 'CONDO'],      markets: ['Phoenix, AZ', 'Scottsdale, AZ'],           strategy: 'BOTH', minPrice: 100000, maxPrice: 250000, closeSpeedDays: 14, proofOfFunds: false, description: null },
    { displayName: 'Rachel M.',    buyerType: 'Developer',  propertyTypes: ['LAND', 'COMMERCIAL'],markets: ['Atlanta, GA', 'Dallas, TX'],                strategy: 'HOLD', minPrice: 50000,  maxPrice: 500000, closeSpeedDays: 21, proofOfFunds: true,  description: 'Development company acquiring land and small commercial properties for ground-up builds.' },
  ]

  const thirtyDaysOut = new Date()
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

  let bbCount = 0
  for (const bp of bbPosts) {
    const post = await prisma.buyerBoardPost.create({
      data: {
        profileId: profile.id,
        displayName: bp.displayName,
        buyerType: bp.buyerType,
        propertyTypes: bp.propertyTypes,
        markets: bp.markets,
        strategy: bp.strategy,
        minPrice: bp.minPrice,
        maxPrice: bp.maxPrice,
        closeSpeedDays: bp.closeSpeedDays,
        proofOfFunds: bp.proofOfFunds,
        description: bp.description,
        viewCount: randomInt(3, 45),
        contactCount: 0,
        expiresAt: thirtyDaysOut,
      },
    })

    // Add contacts to the first 3 posts (from different profiles)
    if (bbCount < 3) {
      const contactDefs = [
        { first: 'Mike', last: 'Thompson', company: 'Sunbelt Deals LLC', email: 'mike@sunbeltdeals.com' },
        { first: 'Sarah', last: 'Chen', company: null, email: 'sarah.chen@gmail.com' },
        { first: 'James', last: 'Rodriguez', company: 'Metro Wholesale Group', email: 'james@metrowholesale.com' },
        { first: 'Kim', last: 'Patel', company: 'KP Investments', email: 'kim@kpinvestments.com' },
      ]
      const numContacts = bbCount === 0 ? 2 : 1
      for (let ci = 0; ci < numContacts; ci++) {
        const cn = contactDefs[bbCount + ci]
        let contactProfile = await prisma.profile.findFirst({ where: { email: cn.email } })
        if (!contactProfile) {
          contactProfile = await prisma.profile.create({
            data: {
              userId: `seed_bb_contact_${bbCount}_${ci}`,
              email: cn.email,
              firstName: cn.first,
              lastName: cn.last,
              company: cn.company,
              role: 'WHOLESALER',
            },
          })
        }
        await prisma.buyerBoardContact.create({
          data: {
            postId: post.id,
            profileId: contactProfile.id,
            message: pick([
              'I have a SFR in that area that matches this criteria. Can we talk?',
              'Just closed on a property nearby and have another one that might work.',
              'I have a deal under contract that fits this buy box perfectly. DM me for details.',
              "Got a pocket listing that matches — what's the best way to reach you?",
            ]),
            status: pick(['NEW', 'NEW', 'RESPONDED']),
          },
        })
        await prisma.buyerBoardPost.update({
          where: { id: post.id },
          data: { contactCount: { increment: 1 } },
        })
      }
    }
    bbCount++
  }
  console.log(`   ${bbCount} posts, ${bbCount < 3 ? 2 + bbCount : 4} contacts`)

  // ─── Summary ──────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('\n' + '='.repeat(50))
  console.log('  Seed complete!')
  console.log('='.repeat(50))
  console.log(`  Buyers:                ${buyerIds.length} (30 individual + 18 LLC)`)
  console.log(`  Saved Markets:         ${MARKETS.length}`)
  console.log(`  Campaign:              1 (15 calls)`)
  console.log(`  Deals:                 ${DEAL_CONFIGS.length} (${DEAL_CONFIGS.map(d => d.status).join(', ')})`)
  console.log(`  Deal Matches:          ${MATCH_CONFIGS.length}`)
  console.log(`  Offers:                ${OFFER_CONFIGS.length} (${OFFER_CONFIGS.map(o => o.status).join(', ')})`)
  console.log(`  Contracts:             ${CONTRACT_CONFIGS.length} (${CONTRACT_CONFIGS.map(c => c.status).join(', ')})`)
  console.log(`  Contract Versions:     ${cvCount}`)
  console.log(`  Activity Events:       ${activityData.length}`)
  console.log(`  Tags:                  ${AUTO_TAG_DEFS.length} defs, ${tagsApplied} applied`)
  console.log(`  Marketplace Listings:  ${LISTING_CONFIGS.length} (${LISTING_CONFIGS.map(l => l.status).join(', ')})`)
  console.log(`  Marketplace Inquiries: ${INQUIRY_CONFIGS.length}`)
  console.log(`  Buyer Board Posts:     ${bbCount}`)
  console.log('='.repeat(50))
  console.log(`  Seeded in ${elapsed}s`)
  console.log('='.repeat(50))

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
