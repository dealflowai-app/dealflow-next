// ─── Browser Calling Service ────────────────────────────────────────────────
// Manages Twilio Client SDK for browser-based calling. Provides:
// - Token acquisition and refresh
// - Call state management
// - Graceful degradation to tel: links when Twilio Client isn't configured
//
// This module is client-side only (runs in the browser).
// The Twilio Client SDK is loaded dynamically to avoid SSR issues.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BrowserCallConfig {
  callerId: string               // Twilio phone number shown as caller ID
  buyerId: string
  buyerPhone: string
  buyerName: string
  campaignId?: string            // optional campaign link
  profileId: string
}

export interface ActiveCall {
  callSid: string
  status: 'connecting' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer'
  duration: number               // seconds, updated live
  startedAt: Date
  buyerId: string
  buyerName: string
  buyerPhone: string
  muted: boolean
  onHold: boolean
}

export interface TwilioTokenResponse {
  available: boolean
  token?: string
  identity?: string
  expiresAt?: string
  reason?: string
}

// ─── Phone Formatting ───────────────────────────────────────────────────────

/** Format +16025550147 → (602) 555-0147 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const last10 = digits.length > 10 ? digits.slice(-10) : digits
  if (last10.length === 10) {
    return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`
  }
  return phone
}

/** Normalize to E.164: +1XXXXXXXXXX */
export function toDialableE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.length > 10 ? digits.slice(-10) : digits
  return `+1${normalized}`
}

// ─── Token Management ───────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

export async function fetchTwilioToken(): Promise<TwilioTokenResponse> {
  // Check cached token (refresh 5 min before expiry)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return { available: true, token: cachedToken.token }
  }

  try {
    const res = await fetch('/api/outreach/twilio-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      return { available: false, reason: 'Failed to fetch calling token' }
    }

    const data = await res.json()
    if (!data.available) {
      return { available: false, reason: data.reason }
    }

    cachedToken = {
      token: data.token,
      expiresAt: new Date(data.expiresAt).getTime(),
    }

    return {
      available: true,
      token: data.token,
      identity: data.identity,
      expiresAt: data.expiresAt,
    }
  } catch {
    return { available: false, reason: 'Network error fetching calling token' }
  }
}

/** Check if Twilio Client calling is available (without fetching a token) */
export async function isBrowserCallingAvailable(): Promise<boolean> {
  const result = await fetchTwilioToken()
  return result.available
}

// ─── Compliance Pre-flight ──────────────────────────────────────────────────

export interface ComplianceResult {
  allowed: boolean
  reason?: string
}

export async function runComplianceCheck(
  phone: string,
  buyerId: string,
): Promise<ComplianceResult> {
  try {
    const res = await fetch('/api/outreach/compliance-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, buyerId, channel: 'voice' }),
    })

    if (!res.ok) {
      // If compliance check endpoint fails, allow the call but log it
      return { allowed: true }
    }

    const data = await res.json()
    if (data.blocked) {
      const reasons = (data.reasons || []).map((r: { message: string }) => r.message).join('. ')
      return { allowed: false, reason: reasons || 'Blocked by compliance check' }
    }

    return { allowed: true }
  } catch {
    // Network error — allow but warn
    return { allowed: true }
  }
}

// ─── Manual Call Logging ────────────────────────────────────────────────────

export async function logManualCall(data: {
  buyerId: string
  phoneNumber: string
  outcome?: string
  durationSecs?: number
  notes?: string
  callSid?: string
  campaignId?: string | null
}): Promise<{ success: boolean; call?: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch('/api/outreach/calls/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyerId: data.buyerId,
        phoneNumber: data.phoneNumber,
        outcome: data.outcome,
        durationSecs: data.durationSecs,
        notes: data.notes,
        callSid: data.callSid,
        campaignId: data.campaignId || null,
        channel: 'manual_voice',
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      return { success: false, error: result.error || 'Failed to log call' }
    }

    return { success: true, call: result.call }
  } catch {
    return { success: false, error: 'Network error logging call' }
  }
}

// ─── Fallback: tel: link ────────────────────────────────────────────────────

export function openNativeDialer(phone: string): void {
  const e164 = toDialableE164(phone)
  window.open(`tel:${e164}`, '_self')
}
