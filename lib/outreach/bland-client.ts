// ─── Bland AI Client ─────────────────────────────────────────────────────────
// Typed wrapper for the Bland AI call initiation API.
// Falls back to a mock client when BLAND_API_KEY is not set.

import { logger } from '@/lib/logger'
import { withRetry, CircuitBreaker, fetchWithTimeout } from '@/lib/resilience'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BlandCallRequest {
  phone_number: string             // E.164 format: +1XXXXXXXXXX
  task: string                     // full script/prompt for the AI agent
  voice_id?: number
  reduce_latency?: boolean
  wait_for_greeting?: boolean
  record?: boolean
  max_duration?: number            // max call length in minutes
  transfer_phone_number?: string
  webhook?: string
  metadata?: Record<string, string>
  language?: string
  voice_settings?: {
    speed?: number                 // 0.5-2.0
    stability?: number             // 0-1
  }
}

export interface BlandCallResponse {
  call_id: string
  status: string
  message: string
}

export interface BlandCallStatus {
  call_id: string
  status: string
  duration: number
  completed: boolean
  transcript?: string
  recording_url?: string
}

// ─── Circuit Breaker ────────────────────────────────────────────────────────

const blandCircuit = new CircuitBreaker({
  label: 'bland-ai',
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
})

// ─── Bland API Client ───────────────────────────────────────────────────────

const BLAND_BASE_URL = 'https://api.bland.ai/v1'

class BlandAPIClient {
  private apiKey: string
  private webhookUrl: string

  constructor(apiKey: string, webhookUrl: string) {
    this.apiKey = apiKey
    this.webhookUrl = webhookUrl
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }
  }

  async initiateCall(request: BlandCallRequest): Promise<BlandCallResponse> {
    const body = {
      ...request,
      record: true,
      webhook: this.webhookUrl,
      reduce_latency: request.reduce_latency ?? true,
      wait_for_greeting: request.wait_for_greeting ?? true,
      language: request.language ?? 'en',
    }

    return blandCircuit.execute(() =>
      withRetry(
        async () => {
          const res = await fetchWithTimeout(`${BLAND_BASE_URL}/calls`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(body),
            timeoutMs: 15_000,
          })

          if (!res.ok) {
            const errText = await res.text().catch(() => 'Unknown error')
            throw new Error(`Bland API error ${res.status}: ${errText}`)
          }

          return res.json() as Promise<BlandCallResponse>
        },
        { maxRetries: 1, baseDelayMs: 2000, label: 'bland-initiate-call' },
      ),
    )
  }

  async getCallStatus(callId: string): Promise<BlandCallStatus> {
    return withRetry(
      async () => {
        const res = await fetchWithTimeout(`${BLAND_BASE_URL}/calls/${callId}`, {
          headers: this.headers(),
          timeoutMs: 8_000,
        })

        if (!res.ok) {
          throw new Error(`Bland API error ${res.status}`)
        }

        return res.json() as Promise<BlandCallStatus>
      },
      { maxRetries: 1, baseDelayMs: 1000, label: 'bland-call-status' },
    )
  }

  async endCall(callId: string): Promise<void> {
    await withRetry(
      async () => {
        const res = await fetchWithTimeout(`${BLAND_BASE_URL}/calls/${callId}/end`, {
          method: 'POST',
          headers: this.headers(),
          timeoutMs: 5_000,
        })

        if (!res.ok) {
          const errText = await res.text().catch(() => 'Unknown error')
          throw new Error(`Failed to end call ${callId}: ${errText}`)
        }
      },
      { maxRetries: 2, baseDelayMs: 1000, label: 'bland-end-call' },
    ).catch((err) => {
      // Log but don't throw — endCall is best-effort
      logger.error('Failed to end Bland call after retries', { callId, error: err instanceof Error ? err.message : String(err) })
    })
  }

  async getCallTranscript(callId: string): Promise<string | null> {
    try {
      return await withRetry(
        async () => {
          const res = await fetchWithTimeout(`${BLAND_BASE_URL}/calls/${callId}/transcript`, {
            headers: this.headers(),
            timeoutMs: 8_000,
          })

          if (!res.ok) return null

          const data = await res.json()
          return data.transcript || null
        },
        { maxRetries: 2, baseDelayMs: 1000, label: 'bland-transcript' },
      )
    } catch (err) {
      logger.warn('Failed to fetch Bland transcript after retries', { callId, error: err instanceof Error ? err.message : String(err) })
      return null
    }
  }
}

// ─── Mock Client (no API key) ───────────────────────────────────────────────

class MockBlandClient {
  async initiateCall(request: BlandCallRequest): Promise<BlandCallResponse> {
    const callId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    logger.info(`[MOCK BLAND] Initiating call to ${request.phone_number}`, {
      route: 'bland-mock',
      callId,
      metadata: request.metadata,
    })

    return {
      call_id: callId,
      status: 'queued',
      message: 'Mock call queued (BLAND_API_KEY not set)',
    }
  }

  async getCallStatus(callId: string): Promise<BlandCallStatus> {
    return {
      call_id: callId,
      status: 'completed',
      duration: 0,
      completed: true,
    }
  }

  async endCall(_callId: string): Promise<void> {
    // no-op
  }

  async getCallTranscript(_callId: string): Promise<string | null> {
    return null
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

type IBlandClient = BlandAPIClient | MockBlandClient

let _client: IBlandClient | null = null

export function getBlandClient(): IBlandClient {
  if (_client) return _client

  const apiKey = process.env.BLAND_API_KEY
  const webhookUrl = process.env.BLAND_WEBHOOK_URL || ''

  if (apiKey) {
    _client = new BlandAPIClient(apiKey, webhookUrl)
    logger.info('Bland AI client initialized (live mode)')
  } else {
    _client = new MockBlandClient()
    logger.info('Bland AI client initialized (mock mode — BLAND_API_KEY not set)')
  }

  return _client
}

// ─── Phone Formatting ───────────────────────────────────────────────────────

/** Convert a 10-digit phone to E.164 format: +1XXXXXXXXXX */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.length > 10 ? digits.slice(-10) : digits
  return `+1${normalized}`
}
