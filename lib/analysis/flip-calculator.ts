/**
 * Flip Profit Calculator
 *
 * Calculates net profit, ROI, holding costs, and closing costs for a
 * fix-and-flip scenario. All assumptions are clearly named constants.
 * Pure function, no DB or API calls.
 */

import type { RepairEstimate } from './repair-estimator'

// ─── FINANCING ASSUMPTIONS ──────────────────────────────────────────────────

/** Hard money annual interest rate (interest-only) */
export const HARD_MONEY_RATE = 0.12

/** Monthly insurance per $100K of property value */
export const INSURANCE_PER_100K_MONTHLY = 100

/** Monthly utility estimate (flat) */
export const UTILITIES_MONTHLY = 200

/** Buyer-side closing costs as percentage of purchase price */
export const BUYER_CLOSING_PCT = 0.015

/** Seller-side closing costs as percentage of ARV (commissions, title, transfer) */
export const SELLER_CLOSING_PCT = 0.06

/** Estimated hold time in months by condition */
export const HOLD_MONTHS: Record<string, number> = {
  distressed: 6,
  fair: 4,
  good: 3,
  excellent: 3,
}

/** Default hold time when condition is unknown */
export const DEFAULT_HOLD_MONTHS = 4

/** Minimum spread percentage for a wholesale deal to be considered viable */
export const MIN_SPREAD_PCT = 0.25

/** Minimum net profit threshold */
export const MIN_NET_PROFIT = 20_000

/** Minimum ROI threshold */
export const MIN_ROI_PCT = 15

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface FlipAnalysis {
  purchasePrice: number
  repairCost: number
  repairCostRange: { low: number; high: number }
  arv: number
  arvRange: { low: number; high: number }

  holdingCosts: {
    months: number
    monthlyPayment: number
    insurance: number
    taxes: number
    utilities: number
    total: number
  }

  closingCosts: {
    buyerClosing: number
    sellerClosing: number
    total: number
  }

  totalInvestment: number
  grossProfit: number
  netProfit: number
  netProfitLow: number
  netProfitHigh: number
  roi: number
  roiAnnualized: number

  assignmentFee: number | null
  wholesalerProfit: number | null
  endBuyerProfit: number
  endBuyerROI: number

  meetsMinSpread: boolean
  meetsMinProfit: boolean
  meetsMinROI: boolean
}

export interface FlipInput {
  purchasePrice: number
  arv: number
  arvLow: number
  arvHigh: number
  repairs: RepairEstimate
  condition?: string | null
  assessedValue?: number | null
  assignmentFee?: number | null
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Calculate flip profit, ROI, holding costs, and closing costs.
 *
 * @param input - Purchase price, ARV, repair estimate, and optional overrides
 */
export function calculateFlipProfit(input: FlipInput): FlipAnalysis {
  const {
    purchasePrice,
    arv,
    arvLow,
    arvHigh,
    repairs,
    condition,
    assessedValue,
    assignmentFee,
  } = input

  const repairCost = repairs.total
  const holdMonths = HOLD_MONTHS[condition ?? ''] ?? DEFAULT_HOLD_MONTHS

  // ── Holding costs ──

  const monthlyPayment = Math.round((purchasePrice * HARD_MONEY_RATE) / 12)
  const insurance = Math.round((purchasePrice / 100_000) * INSURANCE_PER_100K_MONTHLY)

  // Monthly taxes: use assessed value if available, otherwise estimate from purchase price
  const taxBase = assessedValue ?? purchasePrice
  // Rough national average: ~1.1% of value per year
  const monthlyTaxes = Math.round((taxBase * 0.011) / 12)

  const monthlyHolding = monthlyPayment + insurance + monthlyTaxes + UTILITIES_MONTHLY
  const totalHolding = monthlyHolding * holdMonths

  // ── Closing costs ──

  const buyerClosing = Math.round(purchasePrice * BUYER_CLOSING_PCT)
  const sellerClosing = Math.round(arv * SELLER_CLOSING_PCT)
  const totalClosing = buyerClosing + sellerClosing

  // ── Profit calculations ──

  const totalInvestment = purchasePrice + repairCost + totalHolding + totalClosing
  const grossProfit = arv - purchasePrice
  const netProfit = arv - totalInvestment

  // Pessimistic: low ARV, high repairs
  const totalInvestmentHigh = purchasePrice + repairs.totalHigh +
    (monthlyHolding * holdMonths) + totalClosing
  const netProfitLow = arvLow - totalInvestmentHigh

  // Optimistic: high ARV, low repairs
  const totalInvestmentLow = purchasePrice + repairs.totalLow +
    (monthlyHolding * holdMonths) + totalClosing
  const netProfitHigh = arvHigh - totalInvestmentLow

  const roi = totalInvestment > 0
    ? Math.round((netProfit / totalInvestment) * 100 * 10) / 10
    : 0
  const roiAnnualized = holdMonths > 0
    ? Math.round((roi * (12 / holdMonths)) * 10) / 10
    : 0

  // ── Wholesale-specific ──

  const fee = assignmentFee ?? null
  const wholesalerProfit = fee
  const endBuyerInvestment = totalInvestment + (fee ?? 0)
  const endBuyerProfit = netProfit - (fee ?? 0)
  const endBuyerROI = endBuyerInvestment > 0
    ? Math.round((endBuyerProfit / endBuyerInvestment) * 100 * 10) / 10
    : 0

  // ── Threshold checks ──

  const spreadPct = arv > 0 ? (arv - purchasePrice) / arv : 0
  const meetsMinSpread = spreadPct >= MIN_SPREAD_PCT
  const meetsMinProfit = netProfit >= MIN_NET_PROFIT
  const meetsMinROI = roi >= MIN_ROI_PCT

  return {
    purchasePrice,
    repairCost,
    repairCostRange: { low: repairs.totalLow, high: repairs.totalHigh },
    arv,
    arvRange: { low: arvLow, high: arvHigh },

    holdingCosts: {
      months: holdMonths,
      monthlyPayment,
      insurance,
      taxes: monthlyTaxes,
      utilities: UTILITIES_MONTHLY,
      total: totalHolding,
    },

    closingCosts: {
      buyerClosing,
      sellerClosing,
      total: totalClosing,
    },

    totalInvestment,
    grossProfit,
    netProfit,
    netProfitLow,
    netProfitHigh,
    roi,
    roiAnnualized,

    assignmentFee: fee,
    wholesalerProfit,
    endBuyerProfit,
    endBuyerROI,

    meetsMinSpread,
    meetsMinProfit,
    meetsMinROI,
  }
}
