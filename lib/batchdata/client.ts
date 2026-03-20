import { BatchDataNotConfiguredError, BatchDataApiError } from './errors'
import { logger } from '../logger'
import { withRetry, CircuitBreaker } from '../resilience'
import type {
  BatchDataSearchRequest,
  BatchDataLookupRequest,
  BatchDataSkipTraceRequest,
  BatchDataProperty,
  BatchDataSkipTraceResult,
  BatchDataOwnerProfile,
  BatchDataResponse,
} from './types'

const BASE_URL = 'https://api.batchdata.com/api/v1'

// ── Cost per API call (USD) ─────────────────────────────────────────────────

const ENDPOINT_COSTS: Record<string, number> = {
  '/property/search':        0.64,   // ACTUAL COST per result (full enrichment)
  '/property/lookup':        0.64,   // Same as search per result
  '/property/skip-trace':    0.07,   // Base skip trace
  '/property/owner-profile': 0.10,
  '/address/verify':         0.015,
  '/address/autocomplete':   0.00333,
  '/address/geocode':        0.0045,
  '/phone/verify':           0.007,
  '/phone/dnc':              0.002,
}

// ── Input validation ────────────────────────────────────────────────────────

interface AddressFields {
  street?: string
  city?: string
  state?: string
  zip?: string
}

function validateAddress(address: AddressFields, endpoint: string): void {
  const { street, city, state, zip } = address
  const hasStreet = street && street.trim().length > 0
  const hasCity = city && city.trim().length > 0
  const hasState = state && state.trim().length > 0
  const hasZip = zip && zip.trim().length > 0

  if (!hasStreet && !hasCity && !hasState && !hasZip) {
    throw new BatchDataApiError(
      'Address is empty — at least one field (street, city, state, zip) is required',
      400,
      endpoint,
      'VALIDATION_ERROR',
    )
  }

  if (hasState && state!.trim().length !== 2) {
    throw new BatchDataApiError(
      `Invalid state "${state}" — must be a 2-letter abbreviation`,
      400,
      endpoint,
      'VALIDATION_ERROR',
    )
  }

  if (hasZip && !/^\d{5}(-\d{4})?$/.test(zip!.trim())) {
    throw new BatchDataApiError(
      `Invalid zip "${zip}" — must be 5-digit or ZIP+4 format`,
      400,
      endpoint,
      'VALIDATION_ERROR',
    )
  }
}

function validateLookupRequests(
  requests: Array<{ address: AddressFields }>,
  endpoint: string,
): void {
  if (!requests || requests.length === 0) {
    throw new BatchDataApiError(
      'At least one address request is required',
      400,
      endpoint,
      'VALIDATION_ERROR',
    )
  }
  for (const req of requests) {
    validateAddress(req.address, endpoint)
  }
}

// ── Retry filter ────────────────────────────────────────────────────────────

function isRetryable(err: unknown): boolean {
  if (err instanceof BatchDataApiError) {
    // Retry on 429 (rate limit), 502/503/504 (server issues)
    return [429, 502, 503, 504].includes(err.status)
  }
  // Retry on network errors (fetch failures)
  if (err instanceof TypeError) return true
  return false
}

// ── Client ──────────────────────────────────────────────────────────────────

/**
 * Fully-typed BatchData API client.
 *
 * Every method handles auth, builds the correct POST endpoint,
 * and returns typed response data. Includes retry with exponential
 * backoff, circuit breaker protection, structured logging, and
 * per-call cost tracking.
 *
 * Set BATCHDATA_API_KEY in your environment to enable.
 */
export class BatchDataClient {
  private apiKey: string
  private circuit: CircuitBreaker

  constructor(apiKey: string) {
    if (!apiKey) throw new BatchDataNotConfiguredError()
    this.apiKey = apiKey
    this.circuit = new CircuitBreaker({
      label: 'batchdata',
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
    })
  }

  // ── Internal request helper ─────────────────────────────────────────────

  private async request<T>(endpoint: string, body: unknown): Promise<T> {
    const start = Date.now()
    const cost = ENDPOINT_COSTS[endpoint] ?? 0

    logger.info(`BatchData request: POST ${endpoint}`, {
      endpoint,
      estimatedCost: `$${cost.toFixed(4)}`,
    })

    const result = await this.circuit.execute(() =>
      withRetry(
        async () => {
          const url = `${BASE_URL}${endpoint}`

          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(body),
          })

          if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}))
            throw new BatchDataApiError(
              errorBody?.status?.text || errorBody?.status?.message || errorBody?.message || `BatchData API error (${res.status})`,
              res.status,
              endpoint,
              errorBody?.status?.code?.toString(),
            )
          }

          const json = await res.json()

          // Normalize response: some endpoints return results as an array,
          // others return { properties: [...] }. Normalize to { properties: [...] }.
          if (json.results && Array.isArray(json.results)) {
            json.results = { properties: json.results }
          }

          return json as T
        },
        {
          maxRetries: 2,
          baseDelayMs: 500,
          maxDelayMs: 5_000,
          shouldRetry: isRetryable,
          label: `batchdata:${endpoint}`,
        },
      ),
    )

    const durationMs = Date.now() - start
    logger.info(`BatchData response: ${endpoint}`, {
      endpoint,
      durationMs,
      estimatedCost: `$${cost.toFixed(4)}`,
    })

    return result
  }

  // ── 1. Property Search ──────────────────────────────────────────────────
  // POST /property/search
  // Used by: Discovery search
  // Cost: ~$0.64 per result (full enrichment — search returns everything)
  // IMPORTANT: Always set a limit to control costs

  async searchProperties(params: BatchDataSearchRequest): Promise<BatchDataResponse<BatchDataProperty>> {
    const body = {
      searchCriteria: params.searchCriteria,
      ...(params.propertyType ? { propertyType: params.propertyType } : {}),
      limit: params.limit ?? 25,  // Default to 25, NEVER unlimited
    }

    return this.request<BatchDataResponse<BatchDataProperty>>(
      '/property/search',
      body,
    )
  }

  // ── 2. Property Lookup ──────────────────────────────────────────────────
  // POST /property/lookup
  // Used by: Property detail view (Tier 1+2)
  // Cost: varies by datasets requested ($0.01 - $0.34 depending on datasets)

  async lookupProperty(params: BatchDataLookupRequest): Promise<BatchDataResponse<BatchDataProperty>> {
    validateLookupRequests(params.requests, '/property/lookup')
    return this.request<BatchDataResponse<BatchDataProperty>>(
      '/property/lookup',
      params,
    )
  }

  // ── 3. Skip Trace ──────────────────────────────────────────────────────
  // POST /property/skip-trace
  // Used by: Contact reveal feature (Tier 3)
  // Cost: $0.07 per result + $0.007 phone verify + $0.002 DNC + $0.002 TCPA
  // Max 100 properties per request

  async skipTrace(params: BatchDataSkipTraceRequest): Promise<BatchDataResponse<BatchDataSkipTraceResult>> {
    validateLookupRequests(params.requests, '/property/skip-trace')
    if (params.requests.length > 100) {
      throw new BatchDataApiError(
        `Skip trace batch too large (${params.requests.length}) — max 100 per request`,
        400,
        '/property/skip-trace',
        'VALIDATION_ERROR',
      )
    }
    return this.request<BatchDataResponse<BatchDataSkipTraceResult>>(
      '/property/skip-trace',
      params,
    )
  }

  // ── 4. Owner Profile ───────────────────────────────────────────────────
  // POST /owners/by-property or /owners/search
  // Used by: Owner portfolio view (Tier 4)
  // Cost: $0.10 (search) or $2.00 (standalone profile)
  // TRIAL: verify which endpoint to use and exact path

  async getOwnerProfile(address: {
    street: string
    city: string
    state: string
    zip: string
  }): Promise<BatchDataResponse<BatchDataOwnerProfile>> {
    validateAddress(address, '/property/owner-profile')
    return this.request<BatchDataResponse<BatchDataOwnerProfile>>(
      '/property/owner-profile',
      { requests: [{ address }] },
    )
  }

  // ── 5. Address Verification ─────────────────────────────────────────────
  // Cost: $0.015 per result
  // Used by: data quality on import, search bar validation

  async verifyAddress(address: {
    street: string
    city: string
    state: string
    zip: string
  }): Promise<BatchDataResponse<{ verified: boolean; standardized?: Record<string, string> }>> {
    validateAddress(address, '/address/verify')
    return this.request('/address/verify', { requests: [{ address }] })
  }

  // ── 6. Address Autocomplete ─────────────────────────────────────────────
  // Cost: $0.00333 per result
  // Used by: Discovery search bar UX

  async autocompleteAddress(query: string): Promise<BatchDataResponse<{ suggestions: Array<{ address: string }> }>> {
    if (!query || query.trim().length === 0) {
      throw new BatchDataApiError(
        'Autocomplete query is empty',
        400,
        '/address/autocomplete',
        'VALIDATION_ERROR',
      )
    }
    // TRIAL: verify endpoint path and request shape
    return this.request('/address/autocomplete', { query })
  }

  // ── 7. Geocode ──────────────────────────────────────────────────────────
  // Cost: $0.0045 per result (rooftop)
  // Used by: Map pin placement when lat/lng missing from search results

  async geocode(address: {
    street: string
    city: string
    state: string
    zip: string
  }): Promise<BatchDataResponse<{ latitude: number; longitude: number }>> {
    validateAddress(address, '/address/geocode')
    return this.request('/address/geocode', { requests: [{ address }] })
  }

  // ── 8. Phone Verification ──────────────────────────────────────────────
  // Cost: $0.007 per result
  // Used by: Skip trace enrichment (called after skip trace to verify numbers)

  async verifyPhone(phoneNumber: string): Promise<BatchDataResponse<{
    number: string
    valid: boolean
    type: 'mobile' | 'landline' | 'voip'
    carrier?: string
  }>> {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      throw new BatchDataApiError(
        'Phone number is empty',
        400,
        '/phone/verify',
        'VALIDATION_ERROR',
      )
    }
    return this.request('/phone/verify', { requests: [{ phoneNumber }] })
  }

  // ── 9. Phone DNC Check ─────────────────────────────────────────────────
  // Cost: $0.002 per result
  // Used by: TCPA compliance before outreach

  async checkDNC(phoneNumber: string): Promise<BatchDataResponse<{
    number: string
    doNotCall: boolean
    litigator: boolean
  }>> {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      throw new BatchDataApiError(
        'Phone number is empty',
        400,
        '/phone/dnc',
        'VALIDATION_ERROR',
      )
    }
    return this.request('/phone/dnc', { requests: [{ phoneNumber }] })
  }
}
