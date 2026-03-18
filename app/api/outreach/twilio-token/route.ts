import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

// ─── Twilio Client Token Endpoint ───────────────────────────────────────────
// Generates a Twilio AccessToken with VoiceGrant for browser-based calling.
// The token allows the Twilio Client SDK (WebRTC) to make outbound calls.
//
// Required env:
//   TWILIO_ACCOUNT_SID   — Twilio account SID
//   TWILIO_AUTH_TOKEN     — Twilio auth token (used as API key secret)
//   TWILIO_API_KEY_SID    — Twilio API key SID (for token signing)
//   TWILIO_API_KEY_SECRET — Twilio API key secret
//   TWILIO_TWIML_APP_SID  — TwiML App SID that points to our voice webhook
//
// If any are missing, returns { available: false } so the client degrades to tel: links.

const TOKEN_TTL = 3600 // 1 hour

export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const apiKeySid = process.env.TWILIO_API_KEY_SID
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

  if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
    return successResponse({
      available: false,
      reason: 'Twilio Client not configured. Calls will use your phone dialer.',
    })
  }

  try {
    // Build a Twilio AccessToken with VoiceGrant manually (no SDK dependency)
    const identity = profile.id
    const now = Math.floor(Date.now() / 1000)
    const exp = now + TOKEN_TTL

    // JWT header
    const header = { cty: 'twilio-fpa;v=1', typ: 'JWT', alg: 'HS256' }

    // JWT payload — Twilio AccessToken format
    const payload = {
      jti: `${apiKeySid}-${now}`,
      iss: apiKeySid,
      sub: accountSid,
      exp,
      nbf: now,
      grants: {
        identity,
        voice: {
          outgoing: {
            application_sid: twimlAppSid,
          },
        },
      },
    }

    // Sign the token
    const encodedHeader = base64url(JSON.stringify(header))
    const encodedPayload = base64url(JSON.stringify(payload))
    const signature = base64url(
      crypto
        .createHmac('sha256', apiKeySecret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest(),
    )

    const token = `${encodedHeader}.${encodedPayload}.${signature}`

    logger.info('Twilio Client token generated', {
      route: '/api/outreach/twilio-token',
      userId: profile.id,
    })

    return successResponse({
      available: true,
      token,
      identity,
      expiresAt: new Date(exp * 1000).toISOString(),
    })
  } catch (err) {
    logger.error('Failed to generate Twilio token', {
      route: '/api/outreach/twilio-token',
      error: err instanceof Error ? err.message : String(err),
    })
    return errorResponse(500, 'Failed to generate calling token')
  }
}

// Base64url encoding (no padding, URL-safe)
function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
