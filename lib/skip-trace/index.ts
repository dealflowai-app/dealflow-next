/** Phone number returned by skip tracing */
export interface SkipTracePhone {
  number: string
  type: 'mobile' | 'landline' | 'voip'
  score: number // 0-100 confidence for this specific phone
}

/** Email address returned by skip tracing */
export interface SkipTraceEmail {
  address: string
  type: 'personal' | 'business'
  score: number // 0-100 confidence for this specific email
}

/** Mailing address returned by skip tracing */
export interface SkipTraceMailingAddress {
  line1: string
  city: string
  state: string
  zip: string
}

/** Full result from a skip trace lookup */
export interface SkipTraceResult {
  phones: SkipTracePhone[]
  emails: SkipTraceEmail[]
  mailingAddress: SkipTraceMailingAddress | null
  confidence: number  // 0-100 overall match confidence
  provider: string    // which service provided this data
  cachedAt: string    // ISO date
}

/** Lookup parameters for skip tracing */
export interface SkipTraceLookupParams {
  firstName?: string
  lastName?: string
  entityName?: string
  address: string
  city: string
  state: string
  zip?: string
}

/** Provider-agnostic interface — implement this for each skip trace vendor */
export interface SkipTraceProvider {
  readonly name: string
  lookup(params: SkipTraceLookupParams): Promise<SkipTraceResult>
}
