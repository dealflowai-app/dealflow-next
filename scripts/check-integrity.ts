/**
 * Data Integrity Check — Verify all relationship invariants in the database.
 *
 * Usage:
 *   npx tsx scripts/check-integrity.ts
 *
 * This script is read-only — it never writes to the database.
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

// ─── Types ──────────────────────────────────────────────────────────────────

interface CheckResult {
  name: string
  passed: boolean
  detail?: string
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== DealFlow AI Data Integrity Check ===\n')

  // ── Entity counts ─────────────────────────────────────────────────────────
  const [
    deals, buyers, offers, contracts, contractVersions,
    listings, inquiries, matches, campaigns, calls,
    tags, buyerTags, activities, bbPosts, bbContacts,
  ] = await Promise.all([
    prisma.deal.findMany({ select: { id: true, status: true } }),
    prisma.cashBuyer.findMany({ select: { id: true, status: true, isOptedOut: true } }),
    prisma.offer.findMany({ select: { id: true, status: true, dealId: true, buyerId: true } }),
    prisma.contract.findMany({
      select: {
        id: true, status: true, dealId: true, offerId: true, profileId: true,
        sellerSignedAt: true, buyerSignedAt: true, voidedAt: true, voidReason: true, currentVersion: true,
      },
    }),
    prisma.contractVersion.findMany({ select: { id: true, contractId: true, version: true, changeType: true } }),
    prisma.marketplaceListing.findMany({ select: { id: true, status: true, dealId: true } }),
    prisma.marketplaceInquiry.findMany({ select: { id: true, listingId: true, status: true } }),
    prisma.dealMatch.findMany({
      select: { id: true, dealId: true, buyerId: true, matchScore: true, outreachSent: true, outreachSentAt: true },
    }),
    prisma.campaign.findMany({ select: { id: true, status: true } }),
    prisma.campaignCall.findMany({ select: { id: true } }),
    prisma.tag.findMany({ select: { id: true } }),
    prisma.buyerTag.findMany({ select: { id: true } }),
    prisma.activityEvent.findMany({ select: { id: true } }),
    prisma.buyerBoardPost.findMany({ select: { id: true, profileId: true, propertyTypes: true, markets: true } }),
    prisma.buyerBoardContact.findMany({ select: { id: true, postId: true, profileId: true } }),
  ])

  // Status breakdowns
  function countBy<T>(arr: T[], key: keyof T): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const item of arr) {
      const val = String(item[key])
      counts[val] = (counts[val] || 0) + 1
    }
    return counts
  }

  function formatCounts(counts: Record<string, number>): string {
    return Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')
  }

  console.log('Entities:')
  console.log(`  Deals:              ${deals.length} (${formatCounts(countBy(deals, 'status'))})`)
  console.log(`  Buyers:             ${buyers.length} (${buyers.filter(b => !b.isOptedOut).length} active, ${buyers.filter(b => b.isOptedOut).length} opted out)`)
  console.log(`  Offers:             ${offers.length} (${formatCounts(countBy(offers, 'status'))})`)
  console.log(`  Contracts:          ${contracts.length} (${formatCounts(countBy(contracts, 'status'))})`)
  console.log(`  Contract Versions:  ${contractVersions.length}`)
  console.log(`  Listings:           ${listings.length} (${formatCounts(countBy(listings, 'status'))})`)
  console.log(`  Inquiries:          ${inquiries.length} (${formatCounts(countBy(inquiries, 'status'))})`)
  console.log(`  Deal Matches:       ${matches.length}`)
  console.log(`  Campaigns:          ${campaigns.length}`)
  console.log(`  Campaign Calls:     ${calls.length}`)
  console.log(`  Tags:               ${tags.length} (${buyerTags.length} applied)`)
  console.log(`  Activity Events:    ${activities.length}`)
  console.log(`  Buyer Board Posts:  ${bbPosts.length} (${bbContacts.length} contacts)`)

  if (deals.length === 0 && buyers.length === 0) {
    console.log('\n  Database is empty — nothing to check.')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  // ── Build lookup maps ─────────────────────────────────────────────────────
  const dealMap = new Map(deals.map(d => [d.id, d]))
  const buyerMap = new Map(buyers.map(b => [b.id, b]))
  const offerMap = new Map(offers.map(o => [o.id, o]))
  const listingMap = new Map(listings.map(l => [l.id, l]))
  const bbPostMap = new Map(bbPosts.map(p => [p.id, p]))

  // Group helpers
  const offersByDeal = new Map<string, typeof offers>()
  for (const o of offers) {
    if (!offersByDeal.has(o.dealId)) offersByDeal.set(o.dealId, [])
    offersByDeal.get(o.dealId)!.push(o)
  }

  const versionsByContract = new Map<string, typeof contractVersions>()
  for (const v of contractVersions) {
    if (!versionsByContract.has(v.contractId)) versionsByContract.set(v.contractId, [])
    versionsByContract.get(v.contractId)!.push(v)
  }

  // ── Run checks ────────────────────────────────────────────────────────────
  const results: CheckResult[] = []

  function check(name: string, passed: boolean, detail?: string) {
    results.push({ name, passed, detail })
  }

  // --- DEALS ---
  const closedDeals = deals.filter(d => d.status === 'CLOSED')
  const closedDealsData = closedDeals.length > 0
    ? await prisma.deal.findMany({ where: { id: { in: closedDeals.map(d => d.id) } }, select: { id: true, closedAt: true } })
    : []

  const closedWithoutDate = closedDealsData.filter(d => !d.closedAt)
  check(
    'CLOSED deals have closedAt',
    closedWithoutDate.length === 0,
    closedWithoutDate.length > 0 ? `${closedWithoutDate.length} CLOSED deal(s) missing closedAt: ${closedWithoutDate.map(d => d.id).join(', ')}` : undefined,
  )

  const closedWithoutAccepted = closedDeals.filter(d => {
    const dealOffers = offersByDeal.get(d.id) || []
    return !dealOffers.some(o => o.status === 'ACCEPTED')
  })
  check(
    'CLOSED deals have at least one ACCEPTED offer',
    closedWithoutAccepted.length === 0,
    closedWithoutAccepted.length > 0 ? `${closedWithoutAccepted.length} CLOSED deal(s) without ACCEPTED offer: ${closedWithoutAccepted.map(d => d.id).join(', ')}` : undefined,
  )

  const activeDeals = deals.filter(d => d.status === 'ACTIVE' || d.status === 'DRAFT')
  const activeDealsData = activeDeals.length > 0
    ? await prisma.deal.findMany({ where: { id: { in: activeDeals.map(d => d.id) } }, select: { id: true, closedAt: true, status: true } })
    : []
  const activeWithClosedAt = activeDealsData.filter(d => d.closedAt)
  check(
    'ACTIVE/DRAFT deals do not have closedAt',
    activeWithClosedAt.length === 0,
    activeWithClosedAt.length > 0 ? `${activeWithClosedAt.length} ${activeWithClosedAt[0]?.status} deal(s) have closedAt set: ${activeWithClosedAt.map(d => d.id).join(', ')}` : undefined,
  )

  const cancelledDeals = deals.filter(d => d.status === 'CANCELLED')
  const cancelledWithActiveListing = cancelledDeals.filter(d =>
    listings.some(l => l.dealId === d.id && l.status === 'ACTIVE'),
  )
  check(
    'CANCELLED deals have no ACTIVE listings',
    cancelledWithActiveListing.length === 0,
    cancelledWithActiveListing.length > 0 ? `${cancelledWithActiveListing.length} CANCELLED deal(s) have ACTIVE listings: ${cancelledWithActiveListing.map(d => d.id).join(', ')}` : undefined,
  )

  // --- OFFERS ---
  const acceptedOffers = offers.filter(o => o.status === 'ACCEPTED')
  const acceptedOnWrongDeal = acceptedOffers.filter(o => {
    const deal = dealMap.get(o.dealId)
    return deal && !['CLOSED', 'UNDER_OFFER'].includes(deal.status)
  })
  check(
    'ACCEPTED offers link to CLOSED or UNDER_OFFER deals',
    acceptedOnWrongDeal.length === 0,
    acceptedOnWrongDeal.length > 0 ? acceptedOnWrongDeal.map(o => `Offer ${o.id} is ACCEPTED but deal ${o.dealId} is ${dealMap.get(o.dealId)?.status}`).join('; ') : undefined,
  )

  const pendingCountered = offers.filter(o => ['PENDING', 'COUNTERED'].includes(o.status))
  const pendingOnWrongDeal = pendingCountered.filter(o => {
    const deal = dealMap.get(o.dealId)
    return deal && !['ACTIVE', 'UNDER_OFFER'].includes(deal.status)
  })
  check(
    'PENDING/COUNTERED offers on ACTIVE or UNDER_OFFER deals',
    pendingOnWrongDeal.length === 0,
    pendingOnWrongDeal.length > 0 ? pendingOnWrongDeal.map(o => `Offer ${o.id} is ${o.status} but deal ${o.dealId} is ${dealMap.get(o.dealId)?.status}`).join('; ') : undefined,
  )

  const dealsWithMultipleAccepted: string[] = []
  offersByDeal.forEach((dealOffers, dealId) => {
    const accepted = dealOffers.filter(o => o.status === 'ACCEPTED')
    if (accepted.length > 1) dealsWithMultipleAccepted.push(dealId)
  })
  check(
    'No two ACCEPTED offers on the same deal',
    dealsWithMultipleAccepted.length === 0,
    dealsWithMultipleAccepted.length > 0 ? `Deal(s) with multiple ACCEPTED offers: ${dealsWithMultipleAccepted.join(', ')}` : undefined,
  )

  // --- CONTRACTS ---
  const executedContracts = contracts.filter(c => c.status === 'EXECUTED')
  const executedMissingSig = executedContracts.filter(c => !c.buyerSignedAt || !c.sellerSignedAt)
  check(
    'EXECUTED contracts have both signature timestamps',
    executedMissingSig.length === 0,
    executedMissingSig.length > 0 ? executedMissingSig.map(c => `Contract ${c.id}: missing ${!c.buyerSignedAt ? 'buyerSignedAt' : ''}${!c.buyerSignedAt && !c.sellerSignedAt ? ' and ' : ''}${!c.sellerSignedAt ? 'sellerSignedAt' : ''}`).join('; ') : undefined,
  )

  const executedWrongOffer = executedContracts.filter(c => {
    if (!c.offerId) return false
    const offer = offerMap.get(c.offerId)
    return offer && offer.status !== 'ACCEPTED'
  })
  check(
    'EXECUTED contracts link to ACCEPTED offers',
    executedWrongOffer.length === 0,
    executedWrongOffer.length > 0 ? executedWrongOffer.map(c => `Contract ${c.id} is EXECUTED but offer ${c.offerId} is ${offerMap.get(c.offerId!)?.status}`).join('; ') : undefined,
  )

  const executedWrongDeal = executedContracts.filter(c => {
    const deal = dealMap.get(c.dealId)
    return deal && deal.status !== 'CLOSED'
  })
  check(
    'EXECUTED contracts link to CLOSED deals',
    executedWrongDeal.length === 0,
    executedWrongDeal.length > 0 ? executedWrongDeal.map(c => `Contract ${c.id} (EXECUTED) links to deal ${c.dealId} which is ${dealMap.get(c.dealId)?.status} — expected CLOSED`).join('; ') : undefined,
  )

  const voidedContracts = contracts.filter(c => c.status === 'VOIDED')
  const voidedMissing = voidedContracts.filter(c => !c.voidedAt || !c.voidReason)
  check(
    'VOIDED contracts have voidedAt and voidReason',
    voidedMissing.length === 0,
    voidedMissing.length > 0 ? voidedMissing.map(c => `Contract ${c.id}: missing ${!c.voidedAt ? 'voidedAt' : ''}${!c.voidedAt && !c.voidReason ? ' and ' : ''}${!c.voidReason ? 'voidReason' : ''}`).join('; ') : undefined,
  )

  const draftContracts = contracts.filter(c => c.status === 'DRAFT')
  const draftWithSig = draftContracts.filter(c => c.buyerSignedAt || c.sellerSignedAt)
  check(
    'DRAFT contracts have no signature timestamps',
    draftWithSig.length === 0,
    draftWithSig.length > 0 ? draftWithSig.map(c => `Contract ${c.id} is DRAFT but has signature timestamps`).join('; ') : undefined,
  )

  // Contract versions
  const contractsWithoutV1 = contracts.filter(c => {
    const versions = versionsByContract.get(c.id) || []
    return !versions.some(v => v.version === 1)
  })
  check(
    'Every contract has at least version 1',
    contractsWithoutV1.length === 0,
    contractsWithoutV1.length > 0 ? `${contractsWithoutV1.length} contract(s) missing v1: ${contractsWithoutV1.map(c => c.id).join(', ')}` : undefined,
  )

  const contractsWithGaps: string[] = []
  contracts.forEach(c => {
    const versions = (versionsByContract.get(c.id) || []).sort((a, b) => a.version - b.version)
    for (let i = 0; i < versions.length; i++) {
      if (versions[i].version !== i + 1) {
        contractsWithGaps.push(c.id)
        break
      }
    }
  })
  check(
    'Contract version numbers are sequential (no gaps)',
    contractsWithGaps.length === 0,
    contractsWithGaps.length > 0 ? `${contractsWithGaps.length} contract(s) have version gaps: ${contractsWithGaps.join(', ')}` : undefined,
  )

  // --- MARKETPLACE LISTINGS ---
  const activeListings = listings.filter(l => l.status === 'ACTIVE')
  const activeListingWrongDeal = activeListings.filter(l => {
    const deal = dealMap.get(l.dealId)
    return deal && !['ACTIVE', 'UNDER_OFFER'].includes(deal.status)
  })
  check(
    'ACTIVE listings point to ACTIVE or UNDER_OFFER deals',
    activeListingWrongDeal.length === 0,
    activeListingWrongDeal.length > 0 ? activeListingWrongDeal.map(l => `Listing ${l.id} is ACTIVE but deal ${l.dealId} is ${dealMap.get(l.dealId)?.status}`).join('; ') : undefined,
  )

  const soldListings = listings.filter(l => l.status === 'SOLD')
  const soldListingWrongDeal = soldListings.filter(l => {
    const deal = dealMap.get(l.dealId)
    return deal && deal.status !== 'CLOSED'
  })
  check(
    'SOLD listings point to CLOSED deals',
    soldListingWrongDeal.length === 0,
    soldListingWrongDeal.length > 0 ? soldListingWrongDeal.map(l => `Listing ${l.id} is SOLD but deal ${l.dealId} is ${dealMap.get(l.dealId)?.status}`).join('; ') : undefined,
  )

  const orphanedListings = listings.filter(l => !dealMap.has(l.dealId))
  check(
    'All listings have valid deal references',
    orphanedListings.length === 0,
    orphanedListings.length > 0 ? `${orphanedListings.length} listing(s) reference non-existent deals: ${orphanedListings.map(l => l.id).join(', ')}` : undefined,
  )

  // --- MARKETPLACE INQUIRIES ---
  const orphanedInquiries = inquiries.filter(i => !listingMap.has(i.listingId))
  check(
    'All inquiries have valid listing references',
    orphanedInquiries.length === 0,
    orphanedInquiries.length > 0 ? `${orphanedInquiries.length} inquiry(s) reference non-existent listings` : undefined,
  )

  // --- DEAL MATCHES ---
  const optedOutBuyerIds = new Set(buyers.filter(b => b.isOptedOut).map(b => b.id))
  const dncBuyerIds = new Set(buyers.filter(b => b.status === 'DO_NOT_CALL').map(b => b.id))
  const matchesWithBadBuyers = matches.filter(m => optedOutBuyerIds.has(m.buyerId) || dncBuyerIds.has(m.buyerId))
  check(
    'No matches for opted-out or DO_NOT_CALL buyers',
    matchesWithBadBuyers.length === 0,
    matchesWithBadBuyers.length > 0 ? `${matchesWithBadBuyers.length} match(es) reference opted-out/DNC buyers` : undefined,
  )

  const matchesMissingSentAt = matches.filter(m => m.outreachSent && !m.outreachSentAt)
  check(
    'outreachSent=true has outreachSentAt set',
    matchesMissingSentAt.length === 0,
    matchesMissingSentAt.length > 0 ? `${matchesMissingSentAt.length} match(es) have outreachSent=true but no outreachSentAt` : undefined,
  )

  const matchesOutOfRange = matches.filter(m => m.matchScore < 0 || m.matchScore > 100)
  check(
    'Match scores are 0-100',
    matchesOutOfRange.length === 0,
    matchesOutOfRange.length > 0 ? `${matchesOutOfRange.length} match(es) have scores outside 0-100` : undefined,
  )

  // --- BUYER BOARD ---
  const postsWithNoMarkets = bbPosts.filter(p => !p.markets || p.markets.length === 0)
  check(
    'Buyer board posts have at least one market',
    postsWithNoMarkets.length === 0,
    postsWithNoMarkets.length > 0 ? `${postsWithNoMarkets.length} post(s) have no markets` : undefined,
  )

  const postsWithNoTypes = bbPosts.filter(p => !p.propertyTypes || p.propertyTypes.length === 0)
  check(
    'Buyer board posts have at least one property type',
    postsWithNoTypes.length === 0,
    postsWithNoTypes.length > 0 ? `${postsWithNoTypes.length} post(s) have no property types` : undefined,
  )

  const selfContacts = bbContacts.filter(c => {
    const post = bbPostMap.get(c.postId)
    return post && post.profileId === c.profileId
  })
  check(
    'Buyer board contacts are not from the post owner',
    selfContacts.length === 0,
    selfContacts.length > 0 ? `${selfContacts.length} contact(s) are from the same profile as the post` : undefined,
  )

  // --- ORPHANED RECORDS ---
  const orphanedOffers = offers.filter(o => !dealMap.has(o.dealId))
  check(
    'All offers have valid deal references',
    orphanedOffers.length === 0,
    orphanedOffers.length > 0 ? `${orphanedOffers.length} offer(s) reference non-existent deals` : undefined,
  )

  const orphanedMatches = matches.filter(m => !dealMap.has(m.dealId) || !buyerMap.has(m.buyerId))
  check(
    'All deal matches have valid deal and buyer references',
    orphanedMatches.length === 0,
    orphanedMatches.length > 0 ? `${orphanedMatches.length} match(es) reference non-existent deals or buyers` : undefined,
  )

  // ── Print results ─────────────────────────────────────────────────────────
  console.log('\nIntegrity Checks:')
  const passed = results.filter(r => r.passed)
  const failed = results.filter(r => !r.passed)

  for (const r of results) {
    const icon = r.passed ? '\u2713' : '\u2717'
    console.log(`  ${icon} ${r.name}`)
    if (!r.passed && r.detail) {
      console.log(`    ${r.detail}`)
    }
  }

  console.log(`\nSummary: ${passed.length} checks passed, ${failed.length} failed`)

  if (failed.length > 0) {
    process.exitCode = 1
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error('Integrity check failed:', err)
  process.exit(1)
})
