// ─── A/B Test Statistical Significance Calculator ────────────────────────────
// Z-test for proportions — no external stats library needed

/** Result of a significance test between two campaign variants */
export interface ABTestResult {
  /** Variant A conversion rate (0–1) */
  rateA: number
  /** Variant B conversion rate (0–1) */
  rateB: number
  /** Absolute difference (rateB - rateA) */
  absoluteDiff: number
  /** Relative lift ((rateB - rateA) / rateA) as a percentage */
  relativeLift: number
  /** Z-score of the test */
  zScore: number
  /** Two-tailed p-value */
  pValue: number
  /** Confidence level (1 - pValue) as a percentage */
  confidence: number
  /** Whether the result is statistically significant at the given alpha */
  isSignificant: boolean
  /** Which variant is winning: 'A' | 'B' | 'none' */
  winner: 'A' | 'B' | 'none'
  /** Minimum additional samples needed per variant for significance (0 if already significant) */
  samplesNeeded: number
}

export interface ABTestInput {
  /** Number of successes (e.g. qualified leads) in variant A */
  successA: number
  /** Total trials (e.g. calls completed) in variant A */
  totalA: number
  /** Number of successes in variant B */
  successB: number
  /** Total trials in variant B */
  totalB: number
  /** Significance level — default 0.05 (95% confidence) */
  alpha?: number
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 * Accurate to ~1.5×10⁻⁷.
 */
function normalCDF(z: number): number {
  if (z < -8) return 0
  if (z > 8) return 1

  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = z < 0 ? -1 : 1
  const x = Math.abs(z) / Math.SQRT2
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

/**
 * Inverse normal CDF approximation (Beasley-Springer-Moro).
 * Used for power analysis.
 */
function normalInvCDF(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  if (p === 0.5) return 0

  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00,
  ]
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01,
  ]
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00,
  ]
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00,
  ]

  const pLow = 0.02425
  const pHigh = 1 - pLow

  let q: number, r: number

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  } else if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
}

/**
 * Run a two-proportion Z-test comparing variant A vs variant B.
 */
export function runABTest(input: ABTestInput): ABTestResult {
  const { successA, totalA, successB, totalB, alpha = 0.05 } = input

  // Rates
  const rateA = totalA > 0 ? successA / totalA : 0
  const rateB = totalB > 0 ? successB / totalB : 0
  const absoluteDiff = rateB - rateA
  const relativeLift = rateA > 0 ? ((rateB - rateA) / rateA) * 100 : 0

  // Not enough data
  if (totalA < 2 || totalB < 2) {
    return {
      rateA, rateB, absoluteDiff, relativeLift,
      zScore: 0, pValue: 1, confidence: 0,
      isSignificant: false, winner: 'none',
      samplesNeeded: calculateMinSampleSize(rateA || 0.1, rateB || 0.1, alpha),
    }
  }

  // Pooled proportion under H₀
  const pooled = (successA + successB) / (totalA + totalB)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / totalA + 1 / totalB))

  if (se === 0) {
    return {
      rateA, rateB, absoluteDiff, relativeLift,
      zScore: 0, pValue: 1, confidence: 0,
      isSignificant: false, winner: 'none', samplesNeeded: 0,
    }
  }

  const zScore = absoluteDiff / se
  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))
  const confidence = Math.round((1 - pValue) * 10000) / 100 // e.g. 95.23
  const isSignificant = pValue < alpha

  let winner: 'A' | 'B' | 'none' = 'none'
  if (isSignificant) {
    winner = rateB > rateA ? 'B' : 'A'
  }

  const samplesNeeded = isSignificant
    ? 0
    : calculateMinSampleSize(rateA || 0.1, rateB || 0.1, alpha)

  return {
    rateA, rateB, absoluteDiff, relativeLift,
    zScore: Math.round(zScore * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    confidence,
    isSignificant, winner, samplesNeeded,
  }
}

/**
 * Calculate minimum sample size per group needed to detect a given difference
 * with 80% power at the specified alpha (two-tailed).
 */
export function calculateMinSampleSize(
  baseRate: number,
  targetRate: number,
  alpha: number = 0.05,
  power: number = 0.8,
): number {
  if (baseRate <= 0 || baseRate >= 1) return 0
  if (targetRate <= 0 || targetRate >= 1) return 0
  if (baseRate === targetRate) return Infinity

  const zAlpha = normalInvCDF(1 - alpha / 2)
  const zBeta = normalInvCDF(power)

  const p1 = baseRate
  const p2 = targetRate
  const pBar = (p1 + p2) / 2

  const numerator = (zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
    zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
  const denominator = (p1 - p2) ** 2

  return Math.ceil(numerator / denominator)
}

/**
 * Build A/B test results from two campaigns' raw stats.
 * Convenience wrapper used by the API route.
 */
export function compareFromCampaignStats(
  statsA: { qualified: number; callsCompleted: number },
  statsB: { qualified: number; callsCompleted: number },
  alpha?: number,
): ABTestResult {
  return runABTest({
    successA: statsA.qualified,
    totalA: statsA.callsCompleted,
    successB: statsB.qualified,
    totalB: statsB.callsCompleted,
    alpha,
  })
}
