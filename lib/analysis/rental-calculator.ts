/**
 * Rental Cash Flow Calculator
 *
 * Calculates monthly cash flow, cap rate, and cash-on-cash return for a
 * buy-and-hold rental scenario. Pure function, no DB or API calls.
 */

// ─── FINANCING ASSUMPTIONS ──────────────────────────────────────────────────

/** Down payment percentage for investment property */
export const DOWN_PAYMENT_PCT = 0.25

/** Mortgage interest rate (annual) */
export const MORTGAGE_RATE = 0.075

/** Mortgage term in years */
export const MORTGAGE_TERM_YEARS = 30

/** Monthly insurance per $100K of property value */
export const INSURANCE_PER_100K_MONTHLY = 85

/** Annual maintenance as percentage of property value */
export const MAINTENANCE_PCT = 0.01

/** Vacancy rate as percentage of rent */
export const VACANCY_PCT = 0.08

/** Property management fee as percentage of rent */
export const MGMT_FEE_PCT = 0.10

/** Buyer closing costs as percentage of purchase price */
export const BUYER_CLOSING_PCT = 0.03

/** Minimum monthly cash flow threshold */
export const MIN_MONTHLY_CASH_FLOW = 200

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface RentalAnalysis {
  monthlyRent: number
  monthlyRentRange: { low: number; high: number }

  monthlyExpenses: {
    mortgage: number
    taxes: number
    insurance: number
    maintenance: number
    vacancy: number
    propertyManagement: number
    total: number
  }

  monthlyCashFlow: number
  annualCashFlow: number
  cashOnCashReturn: number
  capRate: number

  totalCashNeeded: number
  breakEvenRent: number

  meetsMinCashFlow: boolean
}

export interface RentalInput {
  purchasePrice: number
  monthlyRent: number
  rentLow: number
  rentHigh: number
  repairCost: number
  assessedValue?: number | null
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Standard mortgage amortization: monthly P&I payment.
 * Formula: P * [r(1+r)^n] / [(1+r)^n - 1]
 */
function monthlyMortgagePayment(
  principal: number,
  annualRate: number,
  years: number,
): number {
  if (principal <= 0) return 0
  const r = annualRate / 12
  const n = years * 12
  if (r === 0) return Math.round(principal / n)
  const factor = Math.pow(1 + r, n)
  return Math.round((principal * r * factor) / (factor - 1))
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Calculate rental cash flow, cap rate, and cash-on-cash return.
 *
 * @param input - Purchase price, rent estimate, repair cost, and property details
 */
export function calculateRentalAnalysis(input: RentalInput): RentalAnalysis {
  const {
    purchasePrice,
    monthlyRent,
    rentLow,
    rentHigh,
    repairCost,
    assessedValue,
  } = input

  // Property value for calculations (purchase + repairs = total investment basis)
  const propertyValue = purchasePrice + repairCost

  // ── Financing ──

  const downPayment = Math.round(purchasePrice * DOWN_PAYMENT_PCT)
  const loanAmount = purchasePrice - downPayment
  const mortgage = monthlyMortgagePayment(loanAmount, MORTGAGE_RATE, MORTGAGE_TERM_YEARS)

  // ── Monthly expenses ──

  const taxBase = assessedValue ?? purchasePrice
  const taxes = Math.round((taxBase * 0.011) / 12)
  const insurance = Math.round((propertyValue / 100_000) * INSURANCE_PER_100K_MONTHLY)
  const maintenance = Math.round((propertyValue * MAINTENANCE_PCT) / 12)
  const vacancy = Math.round(monthlyRent * VACANCY_PCT)
  const propertyManagement = Math.round(monthlyRent * MGMT_FEE_PCT)

  const totalExpenses = mortgage + taxes + insurance + maintenance + vacancy + propertyManagement

  // ── Cash flow ──

  const monthlyCashFlow = monthlyRent - totalExpenses
  const annualCashFlow = monthlyCashFlow * 12

  // ── Returns ──

  const closingCosts = Math.round(purchasePrice * BUYER_CLOSING_PCT)
  const totalCashNeeded = downPayment + closingCosts + repairCost

  const cashOnCashReturn = totalCashNeeded > 0
    ? Math.round((annualCashFlow / totalCashNeeded) * 100 * 10) / 10
    : 0

  // Cap rate = NOI / property value (NOI excludes mortgage/financing)
  const annualNOI = (monthlyRent * 12) -
    ((taxes + insurance + maintenance + vacancy + propertyManagement) * 12)
  const capRate = propertyValue > 0
    ? Math.round((annualNOI / propertyValue) * 100 * 10) / 10
    : 0

  // Break-even rent (what rent covers all expenses)
  const breakEvenRent = Math.round(
    (mortgage + taxes + insurance + maintenance) /
    (1 - VACANCY_PCT - MGMT_FEE_PCT),
  )

  return {
    monthlyRent,
    monthlyRentRange: { low: rentLow, high: rentHigh },

    monthlyExpenses: {
      mortgage,
      taxes,
      insurance,
      maintenance,
      vacancy,
      propertyManagement,
      total: totalExpenses,
    },

    monthlyCashFlow,
    annualCashFlow,
    cashOnCashReturn,
    capRate,

    totalCashNeeded,
    breakEvenRent,

    meetsMinCashFlow: monthlyCashFlow >= MIN_MONTHLY_CASH_FLOW,
  }
}
