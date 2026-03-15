/**
 * Auto-Tag Rules Engine — Pure functions that evaluate buyer data against
 * tag rules. No database calls — all data passed in as arguments.
 */

import type { CallForScoring, MatchForScoring, OfferForScoring } from '@/lib/scoring'

// ─── INPUT TYPE ──────────────────────────────────────────────────────────────

export interface BuyerForTagging {
  buyerScore: number
  status: string
  cashPurchaseCount: number
  lastContactedAt: Date | null
  createdAt: Date
  phone: string | null
  email: string | null
  maxPrice: number | null
}

// ─── AUTO TAG DEFINITIONS ────────────────────────────────────────────────────

export interface AutoTagDef {
  name: string
  label: string
  color: string
  description: string
}

/** All auto-tag definitions with metadata for UI and Tag record creation */
export const AUTO_TAG_DEFINITIONS: AutoTagDef[] = [
  {
    name: 'repeat_closer',
    label: 'Repeat Closer',
    color: '#15803d',
    description: 'Buyer has 2+ accepted offers — proven closer',
  },
  {
    name: 'hot_lead',
    label: 'Hot Lead',
    color: '#dc2626',
    description: 'High score (75+), recently contacted (14 days), has phone',
  },
  {
    name: 'high_volume',
    label: 'High Volume Buyer',
    color: '#7c3aed',
    description: '10+ verified cash purchases on record',
  },
  {
    name: 'needs_deal',
    label: 'Needs a Deal',
    color: '#2563eb',
    description: 'Verified/high-confidence buyer with no recent deal matches',
  },
  {
    name: 'going_cold',
    label: 'Going Cold',
    color: '#f59e0b',
    description: 'Contacted 30-60 days ago with score below 50',
  },
  {
    name: 'no_contact_info',
    label: 'No Contact Info',
    color: '#6b7280',
    description: 'Missing both phone and email',
  },
  {
    name: 'stale',
    label: 'Stale',
    color: '#9ca3af',
    description: 'No contact in 90+ days and not a new buyer',
  },
  {
    name: 'new_buyer',
    label: 'New',
    color: '#06b6d4',
    description: 'Added to CRM within the last 7 days',
  },
  {
    name: 'whale',
    label: 'Whale',
    color: '#8b5cf6',
    description: 'Max price 500k+ or 15+ cash purchases',
  },
  {
    name: 'responsive',
    label: 'Responsive',
    color: '#10b981',
    description: '3+ qualified/callback outcomes out of 5+ total calls',
  },
]

// ─── INDIVIDUAL TAG RULES ────────────────────────────────────────────────────

function daysSince(date: Date | null, now: Date): number {
  if (!date) return Infinity
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * "repeat_closer" — Buyer has 2+ offers with status ACCEPTED.
 */
function checkRepeatCloser(offers: OfferForScoring[]): boolean {
  return offers.filter((o) => o.status === 'ACCEPTED').length >= 2
}

/**
 * "hot_lead" — buyerScore >= 75 AND lastContactedAt within 14 days AND has phone.
 */
function checkHotLead(buyer: BuyerForTagging, now: Date): boolean {
  return buyer.buyerScore >= 75
    && daysSince(buyer.lastContactedAt, now) <= 14
    && !!buyer.phone
}

/**
 * "high_volume" — cashPurchaseCount >= 10.
 */
function checkHighVolume(buyer: BuyerForTagging): boolean {
  return buyer.cashPurchaseCount >= 10
}

/**
 * "needs_deal" — Status is RECENTLY_VERIFIED or HIGH_CONFIDENCE AND has 0
 * dealMatches in last 30 days.
 */
function checkNeedsDeal(buyer: BuyerForTagging, matches: MatchForScoring[]): boolean {
  if (buyer.status !== 'RECENTLY_VERIFIED' && buyer.status !== 'HIGH_CONFIDENCE') return false
  // No matches at all means they need a deal
  return matches.length === 0
}

/**
 * "going_cold" — Contacted 30-60 days ago AND buyerScore below 50.
 */
function checkGoingCold(buyer: BuyerForTagging, now: Date): boolean {
  const days = daysSince(buyer.lastContactedAt, now)
  return days >= 30 && days <= 60 && buyer.buyerScore < 50
}

/**
 * "no_contact_info" — Missing both phone AND email.
 */
function checkNoContactInfo(buyer: BuyerForTagging): boolean {
  return !buyer.phone && !buyer.email
}

/**
 * "stale" — lastContactedAt is 90+ days ago OR null, AND not a new buyer
 * (createdAt 14+ days ago).
 */
function checkStale(buyer: BuyerForTagging, now: Date): boolean {
  const contactDays = daysSince(buyer.lastContactedAt, now)
  const ageDays = daysSince(buyer.createdAt, now)
  return contactDays >= 90 && ageDays >= 14
}

/**
 * "new_buyer" — createdAt within last 7 days.
 */
function checkNewBuyer(buyer: BuyerForTagging, now: Date): boolean {
  return daysSince(buyer.createdAt, now) <= 7
}

/**
 * "whale" — maxPrice >= 500000 OR cashPurchaseCount >= 15.
 */
function checkWhale(buyer: BuyerForTagging): boolean {
  return (buyer.maxPrice != null && buyer.maxPrice >= 500000)
    || buyer.cashPurchaseCount >= 15
}

/**
 * "responsive" — 3+ campaign calls with outcome QUALIFIED or CALLBACK_REQUESTED
 * out of 5+ total calls.
 */
function checkResponsive(calls: CallForScoring[]): boolean {
  if (calls.length < 5) return false
  const positive = calls.filter(
    (c) => c.outcome === 'QUALIFIED' || c.outcome === 'CALLBACK_REQUESTED',
  ).length
  return positive >= 3
}

// ─── TAG EVALUATION MAP ──────────────────────────────────────────────────────

type TagChecker = (
  buyer: BuyerForTagging,
  calls: CallForScoring[],
  matches: MatchForScoring[],
  offers: OfferForScoring[],
  now: Date,
) => boolean

const TAG_RULES: Record<string, TagChecker> = {
  repeat_closer: (_b, _c, _m, o) => checkRepeatCloser(o),
  hot_lead: (b, _c, _m, _o, now) => checkHotLead(b, now),
  high_volume: (b) => checkHighVolume(b),
  needs_deal: (b, _c, m) => checkNeedsDeal(b, m),
  going_cold: (b, _c, _m, _o, now) => checkGoingCold(b, now),
  no_contact_info: (b) => checkNoContactInfo(b),
  stale: (b, _c, _m, _o, now) => checkStale(b, now),
  new_buyer: (b, _c, _m, _o, now) => checkNewBuyer(b, now),
  whale: (b) => checkWhale(b),
  responsive: (_b, c) => checkResponsive(c),
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Evaluate all auto-tag rules against a buyer and return the tag names that apply.
 * Pure function — no DB calls.
 */
export function evaluateAutoTags(
  buyer: BuyerForTagging,
  calls: CallForScoring[],
  matches: MatchForScoring[],
  offers: OfferForScoring[],
): string[] {
  const now = new Date()
  const result: string[] = []

  for (const [name, check] of Object.entries(TAG_RULES)) {
    if (check(buyer, calls, matches, offers, now)) {
      result.push(name)
    }
  }

  return result
}

/**
 * Evaluate a single auto-tag rule by name.
 * Returns true if the tag should be applied, false otherwise.
 */
export function evaluateSingleTag(
  tagName: string,
  buyer: BuyerForTagging,
  calls: CallForScoring[],
  matches: MatchForScoring[],
  offers: OfferForScoring[],
): boolean {
  const check = TAG_RULES[tagName]
  if (!check) return false
  return check(buyer, calls, matches, offers, new Date())
}
