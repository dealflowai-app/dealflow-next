/**
 * Buyer Intelligence Engine — Scoring Service
 *
 * Pure functions that compute a 0-100 buyer score from 6 weighted signals.
 * Supports per-user custom weights, manual overrides, tag bonuses, and
 * configurable status thresholds. No database calls — all data passed in.
 */

import type { BuyerStatus } from '@prisma/client'

// ─── SYSTEM DEFAULT WEIGHTS ────────────────────────────────────────────────────
// These are used when a user hasn't configured custom weights.

/** Default weight for cash purchase transaction history (max pts = weight value) */
export const DEFAULT_WEIGHT_TRANSACTION = 25
/** Default weight for recency of last contact/verification */
export const DEFAULT_WEIGHT_RECENCY = 20
/** Default weight for call pickup / qualification rate */
export const DEFAULT_WEIGHT_RESPONSIVENESS = 20
/** Default weight for profile completeness */
export const DEFAULT_WEIGHT_COMPLETENESS = 15
/** Default weight for deal match engagement */
export const DEFAULT_WEIGHT_ENGAGEMENT = 10
/** Default weight for closed-deal track record */
export const DEFAULT_WEIGHT_CLOSING = 10

// ─── SYSTEM DEFAULT THRESHOLDS ──────────────────────────────────────────────────

export const DEFAULT_HIGH_CONFIDENCE_MIN_SCORE = 75
export const DEFAULT_HIGH_CONFIDENCE_MAX_DAYS = 14
export const DEFAULT_RECENTLY_VERIFIED_MAX_DAYS = 14
export const DEFAULT_DORMANT_MIN_DAYS = 90
export const DEFAULT_DORMANT_MAX_SCORE = 20
export const DEFAULT_ACTIVE_MIN_SCORE = 40

// ─── SYSTEM DEFAULT DECAY MULTIPLIERS ───────────────────────────────────────────

export const DEFAULT_DECAY_30_60 = 0.9
export const DEFAULT_DECAY_60_90 = 0.75
export const DEFAULT_DECAY_90_180 = 0.5
export const DEFAULT_DECAY_180_PLUS = 0.25

// ─── INPUT TYPES ────────────────────────────────────────────────────────────────

/** Per-user scoring weights — all fields optional, falls back to defaults */
export interface ScoringWeights {
  transaction: number
  recency: number
  responsiveness: number
  completeness: number
  engagement: number
  closing: number
}

/** Per-user status thresholds — all optional, falls back to defaults */
export interface StatusThresholds {
  highConfidenceMinScore: number
  highConfidenceMaxDays: number
  recentlyVerifiedMaxDays: number
  dormantMinDays: number
  dormantMaxScore: number
  activeMinScore: number
}

/** Per-user decay multipliers — all optional, falls back to defaults */
export interface DecayConfig {
  decay30to60: number
  decay60to90: number
  decay90to180: number
  decay180plus: number
}

/** Custom tag definition with score bonus */
export interface CustomTagDef {
  tag: string
  label: string
  scoreBonus: number // positive or negative adjustment
}

/** Full per-user scoring configuration (from ScoringConfig model) */
export interface ScoringConfig {
  weights?: Partial<ScoringWeights>
  thresholds?: Partial<StatusThresholds>
  decay?: Partial<DecayConfig>
  customTags?: CustomTagDef[]
}

export interface BuyerForScoring {
  phone: string | null
  email: string | null
  preferredTypes: unknown[]
  strategy: string | null
  minPrice: number | null
  maxPrice: number | null
  preferredMarkets: string[]
  closeSpeedDays: number | null
  cashPurchaseCount: number
  lastContactedAt: Date | null
  lastVerifiedAt: Date | null
  // Manual override fields
  scorePinned: boolean
  scoreOverride: number | null
  scoreAdjustment: number
  customTags: string[]
}

export interface CallForScoring {
  outcome: string | null
}

export interface MatchForScoring {
  outreachSent: boolean
  viewed: boolean
  dealId: string
  buyerId: string
}

export interface OfferForScoring {
  status: string
  dealId: string
  buyerId: string
}

export interface ScoreBreakdown {
  transactionScore: number
  recencyScore: number
  responsivenessScore: number
  completenessScore: number
  engagementScore: number
  closingScore: number
  tagBonus: number
  manualAdjustment: number
  calculatedTotal: number
  /** Final score after overrides, adjustments, tag bonuses, clamped to 0-100 */
  total: number
  isPinned: boolean
  isOverridden: boolean
}

// ─── RESOLVE CONFIG WITH DEFAULTS ───────────────────────────────────────────────

/** Merge user config with system defaults */
export function resolveWeights(config?: ScoringConfig): ScoringWeights {
  return {
    transaction: config?.weights?.transaction ?? DEFAULT_WEIGHT_TRANSACTION,
    recency: config?.weights?.recency ?? DEFAULT_WEIGHT_RECENCY,
    responsiveness: config?.weights?.responsiveness ?? DEFAULT_WEIGHT_RESPONSIVENESS,
    completeness: config?.weights?.completeness ?? DEFAULT_WEIGHT_COMPLETENESS,
    engagement: config?.weights?.engagement ?? DEFAULT_WEIGHT_ENGAGEMENT,
    closing: config?.weights?.closing ?? DEFAULT_WEIGHT_CLOSING,
  }
}

export function resolveThresholds(config?: ScoringConfig): StatusThresholds {
  return {
    highConfidenceMinScore: config?.thresholds?.highConfidenceMinScore ?? DEFAULT_HIGH_CONFIDENCE_MIN_SCORE,
    highConfidenceMaxDays: config?.thresholds?.highConfidenceMaxDays ?? DEFAULT_HIGH_CONFIDENCE_MAX_DAYS,
    recentlyVerifiedMaxDays: config?.thresholds?.recentlyVerifiedMaxDays ?? DEFAULT_RECENTLY_VERIFIED_MAX_DAYS,
    dormantMinDays: config?.thresholds?.dormantMinDays ?? DEFAULT_DORMANT_MIN_DAYS,
    dormantMaxScore: config?.thresholds?.dormantMaxScore ?? DEFAULT_DORMANT_MAX_SCORE,
    activeMinScore: config?.thresholds?.activeMinScore ?? DEFAULT_ACTIVE_MIN_SCORE,
  }
}

export function resolveDecay(config?: ScoringConfig): DecayConfig {
  return {
    decay30to60: config?.decay?.decay30to60 ?? DEFAULT_DECAY_30_60,
    decay60to90: config?.decay?.decay60to90 ?? DEFAULT_DECAY_60_90,
    decay90to180: config?.decay?.decay90to180 ?? DEFAULT_DECAY_90_180,
    decay180plus: config?.decay?.decay180plus ?? DEFAULT_DECAY_180_PLUS,
  }
}

// ─── SCORING FUNCTIONS ──────────────────────────────────────────────────────────

/**
 * Transaction History — scores based on verified cash purchases from BatchData.
 * Thresholds scale proportionally to the configured weight.
 */
function scoreTransaction(cashPurchaseCount: number, maxPts: number): number {
  if (cashPurchaseCount >= 11) return maxPts
  if (cashPurchaseCount >= 6) return Math.round(maxPts * 0.88)
  if (cashPurchaseCount >= 3) return Math.round(maxPts * 0.72)
  if (cashPurchaseCount >= 1) return Math.round(maxPts * 0.40)
  return 0
}

/**
 * Recency — scores based on days since most recent contact or verification.
 */
function scoreRecency(lastContactedAt: Date | null, lastVerifiedAt: Date | null, maxPts: number): number {
  const latest = mostRecentDate(lastContactedAt, lastVerifiedAt)
  if (!latest) return 0

  const daysSince = daysBetween(latest, new Date())
  if (daysSince <= 7) return maxPts
  if (daysSince <= 14) return Math.round(maxPts * 0.80)
  if (daysSince <= 30) return Math.round(maxPts * 0.60)
  if (daysSince <= 60) return Math.round(maxPts * 0.30)
  if (daysSince <= 90) return Math.round(maxPts * 0.15)
  return 0
}

/**
 * Responsiveness — ratio of QUALIFIED/CALLBACK_REQUESTED outcomes to total calls.
 * Defaults to 50% of max pts (neutral) if no calls yet.
 */
function scoreResponsiveness(calls: CallForScoring[], maxPts: number): number {
  if (calls.length === 0) return Math.round(maxPts * 0.50)

  const positive = calls.filter(
    (c) => c.outcome === 'QUALIFIED' || c.outcome === 'CALLBACK_REQUESTED',
  ).length
  const rate = (positive / calls.length) * 100

  if (rate >= 80) return maxPts
  if (rate >= 60) return Math.round(maxPts * 0.80)
  if (rate >= 40) return Math.round(maxPts * 0.60)
  if (rate >= 20) return Math.round(maxPts * 0.30)
  return Math.round(maxPts * 0.10)
}

/**
 * Profile Completeness — awards proportional points for each populated field.
 * Total possible field points: 15. Result is scaled to the configured weight.
 */
function scoreCompleteness(buyer: BuyerForScoring, maxPts: number): number {
  let rawPts = 0
  if (buyer.phone) rawPts += 3
  if (buyer.email) rawPts += 3
  if (buyer.preferredTypes && buyer.preferredTypes.length > 0) rawPts += 2
  if (buyer.strategy) rawPts += 2
  if (buyer.minPrice != null && buyer.maxPrice != null) rawPts += 2
  if (buyer.preferredMarkets && buyer.preferredMarkets.length > 0) rawPts += 2
  if (buyer.closeSpeedDays != null) rawPts += 1
  // Scale to configured weight (raw max is 15)
  return Math.round((rawPts / 15) * maxPts)
}

/**
 * Deal Engagement — counts deal matches where outreach was sent AND
 * buyer viewed the deal or submitted an offer.
 */
function scoreEngagement(matches: MatchForScoring[], offers: OfferForScoring[], maxPts: number): number {
  const offerDealIds = new Set(offers.map((o) => `${o.buyerId}:${o.dealId}`))

  const engagements = matches.filter((m) => {
    if (!m.outreachSent) return false
    if (m.viewed) return true
    return offerDealIds.has(`${m.buyerId}:${m.dealId}`)
  }).length

  if (engagements >= 4) return maxPts
  if (engagements >= 2) return Math.round(maxPts * 0.70)
  if (engagements >= 1) return Math.round(maxPts * 0.40)
  return 0
}

/**
 * Closing Track Record — counts offers with ACCEPTED status.
 */
function scoreClosing(offers: OfferForScoring[], maxPts: number): number {
  const accepted = offers.filter((o) => o.status === 'ACCEPTED').length
  if (accepted >= 4) return maxPts
  if (accepted >= 2) return Math.round(maxPts * 0.70)
  if (accepted >= 1) return Math.round(maxPts * 0.40)
  return 0
}

/**
 * Tag Bonus — sums score bonuses from custom tags applied to this buyer.
 */
function scoreTagBonus(buyerTags: string[], tagDefs: CustomTagDef[]): number {
  if (!tagDefs || tagDefs.length === 0 || buyerTags.length === 0) return 0

  const defMap = new Map(tagDefs.map((t) => [t.tag, t.scoreBonus]))
  let bonus = 0
  for (const tag of buyerTags) {
    bonus += defMap.get(tag) ?? 0
  }
  return bonus
}

// ─── MAIN SCORING FUNCTION ─────────────────────────────────────────────────────

/**
 * Calculate a buyer's 0-100 score from 6 weighted signals plus manual adjustments.
 *
 * If the buyer has `scoreOverride` set, that value is used as-is (plus tag bonus
 * and adjustment, clamped to 0-100). If `scorePinned` is true, the score won't
 * change during bulk rescores (handled by callers, not this function).
 *
 * @param buyer - Buyer record with profile and override fields
 * @param calls - CampaignCall records for this buyer
 * @param matches - DealMatch records for this buyer
 * @param offers - Offer records for this buyer
 * @param config - Optional per-user scoring configuration
 */
export function calculateBuyerScore(
  buyer: BuyerForScoring,
  calls: CallForScoring[],
  matches: MatchForScoring[],
  offers: OfferForScoring[],
  config?: ScoringConfig,
): ScoreBreakdown {
  const w = resolveWeights(config)
  const tagDefs = config?.customTags ?? []

  const transactionScore = scoreTransaction(buyer.cashPurchaseCount, w.transaction)
  const recencyScore = scoreRecency(buyer.lastContactedAt, buyer.lastVerifiedAt, w.recency)
  const responsivenessScore = scoreResponsiveness(calls, w.responsiveness)
  const completenessScore = scoreCompleteness(buyer, w.completeness)
  const engagementScore = scoreEngagement(matches, offers, w.engagement)
  const closingScore = scoreClosing(offers, w.closing)

  const tagBonus = scoreTagBonus(buyer.customTags, tagDefs)
  const manualAdjustment = buyer.scoreAdjustment ?? 0
  const isOverridden = buyer.scoreOverride != null

  const calculatedTotal = transactionScore + recencyScore + responsivenessScore +
    completenessScore + engagementScore + closingScore

  // If manually overridden, use override as base instead of calculated total
  const baseScore = isOverridden ? buyer.scoreOverride! : calculatedTotal
  const total = clamp(baseScore + tagBonus + manualAdjustment, 0, 100)

  return {
    transactionScore,
    recencyScore,
    responsivenessScore,
    completenessScore,
    engagementScore,
    closingScore,
    tagBonus,
    manualAdjustment,
    calculatedTotal,
    total,
    isPinned: buyer.scorePinned,
    isOverridden,
  }
}

// ─── STATUS DETERMINATION ───────────────────────────────────────────────────────

/**
 * Determine the appropriate BuyerStatus based on score, contact recency,
 * and per-user configurable thresholds.
 *
 * Priority order:
 * 1. HIGH_CONFIDENCE — score >= threshold AND contacted within N days
 * 2. RECENTLY_VERIFIED — contacted within N days (regardless of score)
 * 3. DORMANT — contacted N+ days ago OR score < threshold
 * 4. ACTIVE — score >= threshold AND contacted within dormant window
 * 5. Default ACTIVE
 */
export function determineBuyerStatus(
  score: number,
  lastContactedAt: Date | null,
  lastVerifiedAt: Date | null,
  config?: ScoringConfig,
): BuyerStatus {
  const t = resolveThresholds(config)
  const latest = mostRecentDate(lastContactedAt, lastVerifiedAt)
  const daysSince = latest ? daysBetween(latest, new Date()) : Infinity

  if (score >= t.highConfidenceMinScore && daysSince <= t.highConfidenceMaxDays) return 'HIGH_CONFIDENCE'
  if (daysSince <= t.recentlyVerifiedMaxDays) return 'RECENTLY_VERIFIED'
  if (daysSince > t.dormantMinDays || score < t.dormantMaxScore) return 'DORMANT'
  if (score >= t.activeMinScore && daysSince <= t.dormantMinDays) return 'ACTIVE'
  return 'ACTIVE'
}

// ─── SCORE DECAY ────────────────────────────────────────────────────────────────

/**
 * Apply time-based decay to a buyer score based on how long since last contact.
 * Uses per-user configurable decay multipliers.
 *
 * Returns the decayed score rounded to the nearest integer (minimum 0).
 */
export function applyScoreDecay(
  currentScore: number,
  lastContactedAt: Date | null,
  config?: ScoringConfig,
): number {
  if (!lastContactedAt) return 0

  const d = resolveDecay(config)
  const daysSince = daysBetween(lastContactedAt, new Date())

  if (daysSince < 30) return currentScore
  if (daysSince < 60) return Math.max(0, Math.round(currentScore * d.decay30to60))
  if (daysSince < 90) return Math.max(0, Math.round(currentScore * d.decay60to90))
  if (daysSince < 180) return Math.max(0, Math.round(currentScore * d.decay90to180))
  return Math.max(0, Math.round(currentScore * d.decay180plus))
}

// ─── HELPERS ────────────────────────────────────────────────────────────────────

/**
 * Convert a ScoringConfig DB row into the ScoringConfig interface used by pure functions.
 */
export function dbConfigToScoringConfig(row: {
  weightTransaction?: number | null
  weightRecency?: number | null
  weightResponsiveness?: number | null
  weightCompleteness?: number | null
  weightEngagement?: number | null
  weightClosing?: number | null
  highConfidenceMinScore?: number | null
  highConfidenceMaxDays?: number | null
  recentlyVerifiedMaxDays?: number | null
  dormantMinDays?: number | null
  dormantMaxScore?: number | null
  activeMinScore?: number | null
  decay30to60?: number | null
  decay60to90?: number | null
  decay90to180?: number | null
  decay180plus?: number | null
  customTags?: unknown
} | null): ScoringConfig | undefined {
  if (!row) return undefined

  return {
    weights: {
      transaction: row.weightTransaction ?? undefined,
      recency: row.weightRecency ?? undefined,
      responsiveness: row.weightResponsiveness ?? undefined,
      completeness: row.weightCompleteness ?? undefined,
      engagement: row.weightEngagement ?? undefined,
      closing: row.weightClosing ?? undefined,
    },
    thresholds: {
      highConfidenceMinScore: row.highConfidenceMinScore ?? undefined,
      highConfidenceMaxDays: row.highConfidenceMaxDays ?? undefined,
      recentlyVerifiedMaxDays: row.recentlyVerifiedMaxDays ?? undefined,
      dormantMinDays: row.dormantMinDays ?? undefined,
      dormantMaxScore: row.dormantMaxScore ?? undefined,
      activeMinScore: row.activeMinScore ?? undefined,
    },
    decay: {
      decay30to60: row.decay30to60 ?? undefined,
      decay60to90: row.decay60to90 ?? undefined,
      decay90to180: row.decay90to180 ?? undefined,
      decay180plus: row.decay180plus ?? undefined,
    },
    customTags: Array.isArray(row.customTags) ? row.customTags as CustomTagDef[] : undefined,
  }
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function mostRecentDate(a: Date | null, b: Date | null): Date | null {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  return a.getTime() > b.getTime() ? a : b
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
