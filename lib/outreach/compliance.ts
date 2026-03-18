// ─── TCPA Compliance Engine ──────────────────────────────────────────────────
// Central compliance gate. Every outreach action must pass through checkCompliance()
// before any call, SMS, or email is sent.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getRecipientTimezone, isWithinCallingHours } from './timezone-map'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComplianceCheckResult {
  allowed: boolean
  blocked: boolean
  reasons: ComplianceReason[]
  warnings: ComplianceWarning[]
  callingWindow: {
    canCallNow: boolean
    nextWindowStart: string | null
    nextWindowEnd: string | null
    timezone: string
    currentLocalTime: string
  }
  consentBasis: string
  checkTimestamp: string
  checkId: string
}

export interface ComplianceReason {
  code: string
  message: string
  severity: 'block' | 'warn'
}

export interface ComplianceWarning {
  code: string
  message: string
}

export type ComplianceChannel = 'voice' | 'sms' | 'email'

export interface ComplianceCheckOptions {
  isCallback?: boolean       // Skip recent contact throttle for callbacks
  skipCallingHours?: boolean // Skip calling hours check (e.g. for email)
  campaignId?: string
  buyerId?: string
  state?: string | null      // Recipient state for timezone lookup
}

// ─── Two-Party Consent States ────────────────────────────────────────────────
// States requiring all-party consent for recording. Update as laws change.

const TWO_PARTY_CONSENT_STATES = new Set([
  'CA', 'CT', 'FL', 'IL', 'MD', 'MA', 'MI', 'MT', 'NV', 'NH', 'OR', 'PA', 'WA',
])

// ─── In-Memory DNC Cache ────────────────────────────────────────────────────
// Cache the opt-out phone set in memory with a 5-minute refresh for fast lookups.

let dncCache: Set<string> = new Set()
let dncCacheLastRefresh = 0
const DNC_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getDNCSet(): Promise<Set<string>> {
  const now = Date.now()
  if (now - dncCacheLastRefresh < DNC_CACHE_TTL_MS && dncCache.size > 0) {
    return dncCache
  }

  try {
    const optOuts = await prisma.optOut.findMany({ select: { phone: true } })
    dncCache = new Set(optOuts.map(o => o.phone))
    dncCacheLastRefresh = now
  } catch (err) {
    logger.warn('Failed to refresh DNC cache, using stale cache', {
      route: 'compliance',
      error: err instanceof Error ? err.message : String(err),
    })
    // On failure, keep using whatever we have — never let cache failure block compliance
  }

  return dncCache
}

/** Force-refresh the DNC cache (call after opt-out/opt-in operations) */
export function invalidateDNCCache(): void {
  dncCacheLastRefresh = 0
}

// ─── Phone Normalization ────────────────────────────────────────────────────

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  // Handle +1 prefix
  const normalized = digits.length > 10 ? digits.slice(-10) : digits
  return normalized.length === 10 ? normalized : null
}

function isValidPhone(phone: string): boolean {
  return normalizePhone(phone) !== null
}

// ─── Generate Check ID ──────────────────────────────────────────────────────

function generateCheckId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `chk_${timestamp}_${random}`
}

// ─── Compliance Audit Logging (fire-and-forget) ─────────────────────────────

function logComplianceCheck(
  profileId: string,
  phone: string,
  channel: ComplianceChannel,
  result: ComplianceCheckResult,
  options?: ComplianceCheckOptions,
): void {
  // Fire-and-forget — never block the calling flow
  prisma.complianceLog.create({
    data: {
      profileId,
      phone,
      channel,
      action: result.blocked ? 'call_blocked' : 'call_allowed',
      result: result.blocked ? 'blocked' : result.warnings.length > 0 ? 'warning' : 'allowed',
      reasons: result.reasons.map(r => r.code),
      consentBasis: result.consentBasis || null,
      metadata: result as any,
      campaignId: options?.campaignId || null,
      buyerId: options?.buyerId || null,
    },
  }).catch(err => {
    logger.warn('Failed to write compliance log', {
      route: 'compliance',
      error: err instanceof Error ? err.message : String(err),
    })
  })
}

// ─── Main Compliance Check ──────────────────────────────────────────────────

export async function checkCompliance(
  phone: string,
  channel: ComplianceChannel,
  profileId: string,
  options?: ComplianceCheckOptions,
): Promise<ComplianceCheckResult> {
  const checkId = generateCheckId()
  const checkTimestamp = new Date().toISOString()
  const reasons: ComplianceReason[] = []
  const warnings: ComplianceWarning[] = []

  // Default calling window
  let callingWindow: ComplianceCheckResult['callingWindow'] = {
    canCallNow: true,
    nextWindowStart: null,
    nextWindowEnd: null,
    timezone: 'America/New_York',
    currentLocalTime: new Date().toISOString(),
  }

  let consentBasis = ''

  try {
    // ── 1. Phone validation ──────────────────────────────────────────────
    const normalized = normalizePhone(phone)
    if (!normalized) {
      reasons.push({
        code: 'INVALID_PHONE',
        message: `Phone number "${phone}" is not a valid 10-digit US number`,
        severity: 'block',
      })
      const result: ComplianceCheckResult = {
        allowed: false,
        blocked: true,
        reasons,
        warnings,
        callingWindow,
        consentBasis: '',
        checkTimestamp,
        checkId,
      }
      logComplianceCheck(profileId, phone, channel, result, options)
      return result
    }

    // ── 2. DNC list check ────────────────────────────────────────────────
    const dncSet = await getDNCSet()
    if (dncSet.has(normalized)) {
      reasons.push({
        code: 'DNC_LIST',
        message: 'Phone number is on the Do Not Call list',
        severity: 'block',
      })
    }

    // ── 3. Buyer opt-out check ───────────────────────────────────────────
    if (reasons.length === 0) {
      try {
        const optedOutBuyer = await prisma.cashBuyer.findFirst({
          where: {
            phone: { contains: normalized },
            OR: [
              { isOptedOut: true },
              { status: 'DO_NOT_CALL' },
            ],
          },
          select: { id: true },
        })

        if (optedOutBuyer) {
          reasons.push({
            code: 'OPT_OUT',
            message: 'Buyer has opted out of communications',
            severity: 'block',
          })
        }
      } catch {
        // Non-critical — DNC list check already covers the primary case
      }
    }

    // Fail-fast: if already blocked, return early
    if (reasons.length > 0) {
      const result: ComplianceCheckResult = {
        allowed: false,
        blocked: true,
        reasons,
        warnings,
        callingWindow,
        consentBasis: '',
        checkTimestamp,
        checkId,
      }
      logComplianceCheck(profileId, normalized, channel, result, options)
      return result
    }

    // ── 4. Recent contact throttle ───────────────────────────────────────
    if (!options?.isCallback) {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const recentCall = await prisma.campaignCall.findFirst({
          where: {
            phoneNumber: { contains: normalized },
            createdAt: { gte: twentyFourHoursAgo },
          },
          select: { id: true },
        })

        if (recentCall) {
          reasons.push({
            code: 'RECENT_CONTACT',
            message: 'This number was contacted within the last 24 hours',
            severity: 'block',
          })
        }
      } catch {
        // Non-critical — skip on query failure
      }
    }

    // ── 5. Calling hours check (voice and SMS only) ──────────────────────
    const recipientState = options?.state || null
    const timezone = getRecipientTimezone(normalized, recipientState)

    if (channel !== 'email') {
      const hoursResult = isWithinCallingHours(
        timezone,
        undefined,
        undefined,
        recipientState || undefined,
      )

      callingWindow = {
        canCallNow: hoursResult.allowed,
        nextWindowStart: hoursResult.nextWindowStart,
        nextWindowEnd: hoursResult.nextWindowEnd,
        timezone,
        currentLocalTime: hoursResult.currentLocalTime,
      }

      if (!hoursResult.allowed) {
        reasons.push({
          code: 'OUTSIDE_HOURS',
          message: `Outside calling hours (8am-9pm ${timezone}). Current local time: ${hoursResult.currentLocalTime}`,
          severity: 'block',
        })
      }
    } else {
      // Email — always within "calling hours"
      callingWindow = {
        canCallNow: true,
        nextWindowStart: null,
        nextWindowEnd: null,
        timezone,
        currentLocalTime: new Date().toISOString(),
      }
    }

    // ── 6. Two-party consent state check (voice only) ────────────────────
    if (channel === 'voice' && recipientState) {
      if (TWO_PARTY_CONSENT_STATES.has(recipientState.toUpperCase())) {
        warnings.push({
          code: 'TWO_PARTY_STATE',
          message: 'Recording disclosure required. AI script must announce recording at start of call.',
        })
      }
    } else if (channel === 'voice' && !recipientState) {
      // Try to determine state from area code for two-party check
      const areaCode = normalized.substring(0, 3)
      const stateFromArea = getStateFromAreaCode(areaCode)
      if (stateFromArea && TWO_PARTY_CONSENT_STATES.has(stateFromArea)) {
        warnings.push({
          code: 'TWO_PARTY_STATE',
          message: 'Recording disclosure required. AI script must announce recording at start of call.',
        })
      }
    }

    // ── 7. Per-phone daily limit ─────────────────────────────────────────
    if (reasons.length === 0) {
      try {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const dailyCallCount = await prisma.campaignCall.count({
          where: {
            phoneNumber: { contains: normalized },
            createdAt: { gte: startOfDay },
          },
        })

        if (dailyCallCount >= 3) {
          reasons.push({
            code: 'DAILY_LIMIT',
            message: `Daily call limit reached (${dailyCallCount}/3 attempts today)`,
            severity: 'block',
          })
        }
      } catch {
        // Non-critical
      }
    }

    // ── 8. Consent basis determination ───────────────────────────────────
    try {
      const buyer = await prisma.cashBuyer.findFirst({
        where: { phone: { contains: normalized } },
        select: {
          cashPurchaseCount: true,
          lastContactedAt: true,
          isOptedOut: true,
          source: true,
        },
      })

      if (buyer) {
        if (buyer.cashPurchaseCount > 0) {
          consentBasis = 'B2B exemption based on public real estate transaction records'
        } else if (buyer.lastContactedAt && !buyer.isOptedOut) {
          consentBasis = 'Prior business relationship'
        } else {
          consentBasis = 'B2B commercial communication — wholesaler assumes responsibility per ToS'
          warnings.push({
            code: 'WEAK_CONSENT_BASIS',
            message: 'No clear consent basis on file. Contact is allowed under B2B exemption but wholesaler bears compliance responsibility.',
          })
        }
      } else {
        consentBasis = 'No buyer record found — verify consent basis before outreach'
        warnings.push({
          code: 'NO_BUYER_RECORD',
          message: 'No CashBuyer record found for this phone number.',
        })
      }
    } catch {
      consentBasis = 'Unable to determine — consent check query failed'
    }

    // ── Build final result ───────────────────────────────────────────────
    const blocked = reasons.some(r => r.severity === 'block')
    const result: ComplianceCheckResult = {
      allowed: !blocked,
      blocked,
      reasons,
      warnings,
      callingWindow,
      consentBasis,
      checkTimestamp,
      checkId,
    }

    logComplianceCheck(profileId, normalized, channel, result, options)
    return result
  } catch (err) {
    // Compliance engine must never throw — return a safe blocked result
    logger.error('Compliance check failed unexpectedly', {
      route: 'compliance',
      error: err instanceof Error ? err.message : String(err),
    })

    const result: ComplianceCheckResult = {
      allowed: false,
      blocked: true,
      reasons: [{
        code: 'SYSTEM_ERROR',
        message: 'Compliance check failed due to system error. Contact blocked for safety.',
        severity: 'block',
      }],
      warnings,
      callingWindow,
      consentBasis: '',
      checkTimestamp,
      checkId,
    }

    logComplianceCheck(profileId, phone, channel, result, options)
    return result
  }
}

// ─── Helper: Reverse lookup state from area code ────────────────────────────
// Simplified mapping for two-party consent check when state is not provided.

const AREA_CODE_STATE: Record<string, string> = {
  // California
  '209': 'CA', '213': 'CA', '310': 'CA', '323': 'CA', '341': 'CA', '408': 'CA',
  '415': 'CA', '424': 'CA', '442': 'CA', '510': 'CA', '530': 'CA', '559': 'CA',
  '562': 'CA', '619': 'CA', '626': 'CA', '628': 'CA', '650': 'CA', '657': 'CA',
  '661': 'CA', '669': 'CA', '707': 'CA', '714': 'CA', '747': 'CA', '760': 'CA',
  '805': 'CA', '818': 'CA', '831': 'CA', '858': 'CA', '909': 'CA', '916': 'CA',
  '925': 'CA', '949': 'CA', '951': 'CA',
  // Connecticut
  '203': 'CT', '475': 'CT', '860': 'CT',
  // Florida
  '239': 'FL', '305': 'FL', '321': 'FL', '352': 'FL', '386': 'FL', '407': 'FL',
  '561': 'FL', '689': 'FL', '727': 'FL', '754': 'FL', '772': 'FL', '786': 'FL',
  '813': 'FL', '850': 'FL', '863': 'FL', '904': 'FL', '941': 'FL', '954': 'FL',
  // Illinois
  '217': 'IL', '224': 'IL', '309': 'IL', '312': 'IL', '331': 'IL', '618': 'IL',
  '630': 'IL', '708': 'IL', '773': 'IL', '779': 'IL', '815': 'IL', '847': 'IL',
  '872': 'IL',
  // Maryland
  '240': 'MD', '301': 'MD', '410': 'MD', '443': 'MD', '667': 'MD',
  // Massachusetts
  '339': 'MA', '351': 'MA', '413': 'MA', '508': 'MA', '617': 'MA', '774': 'MA',
  '781': 'MA', '857': 'MA', '978': 'MA',
  // Michigan
  '231': 'MI', '248': 'MI', '269': 'MI', '313': 'MI', '517': 'MI', '586': 'MI',
  '616': 'MI', '734': 'MI', '810': 'MI', '947': 'MI',
  // Montana
  '406': 'MT',
  // Nevada
  '702': 'NV', '725': 'NV', '775': 'NV',
  // New Hampshire
  '603': 'NH',
  // Oregon
  '458': 'OR', '503': 'OR', '541': 'OR', '971': 'OR',
  // Pennsylvania
  '215': 'PA', '267': 'PA', '272': 'PA', '412': 'PA', '484': 'PA', '570': 'PA',
  '610': 'PA', '717': 'PA', '724': 'PA', '814': 'PA', '878': 'PA',
  // Washington
  '206': 'WA', '253': 'WA', '360': 'WA', '425': 'WA', '509': 'WA', '564': 'WA',
}

function getStateFromAreaCode(areaCode: string): string | null {
  return AREA_CODE_STATE[areaCode] || null
}
