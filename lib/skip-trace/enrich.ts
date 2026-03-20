import { getBatchDataClient } from '@/lib/batchdata'
import { getSkipTraceProvider } from './providers'
import type { SkipTraceResult, SkipTracePhone } from './index'

export interface EnrichedPhone extends SkipTracePhone {
  verified: boolean
  doNotCall: boolean
  litigator: boolean
  carrier?: string
}

export interface EnrichedSkipTraceResult extends Omit<SkipTraceResult, 'phones'> {
  phones: EnrichedPhone[]
  estimatedCost: number
}

/**
 * Full skip trace enrichment pipeline:
 * 1. Skip trace (get raw phones + emails) — $0.07
 * 2. Phone verification (validate each number) — $0.007/phone
 * 3. DNC + TCPA litigator check — $0.004/phone
 *
 * Total cost: ~$0.081 for 1 property with 1 phone
 */
export async function enrichedSkipTrace(params: {
  street: string
  city: string
  state: string
  zip: string
  ownerName?: string
}): Promise<EnrichedSkipTraceResult> {
  const provider = getSkipTraceProvider()
  const batchdata = getBatchDataClient()

  // Step 1: Base skip trace
  const baseResult = await provider.lookup({
    entityName: params.ownerName,
    address: params.street,
    city: params.city,
    state: params.state,
    zip: params.zip,
  })

  let totalCost = 0.07 // base skip trace cost

  // Step 2+3: Enrich each phone with verification + DNC + TCPA
  const enrichedPhones: EnrichedPhone[] = []

  if (batchdata && baseResult.phones.length > 0) {
    for (const phone of baseResult.phones) {
      let verified = false
      let doNotCall = false
      let litigator = false
      let carrier: string | undefined

      try {
        const verifyResult = await batchdata.verifyPhone(phone.number)
        const verifyData = verifyResult.results?.properties?.[0]
        verified = verifyData?.valid ?? false
        carrier = verifyData?.carrier
        totalCost += 0.007
      } catch {
        // Verification failed — mark as unverified, don't block
      }

      try {
        const dncResult = await batchdata.checkDNC(phone.number)
        const dncData = dncResult.results?.properties?.[0]
        doNotCall = dncData?.doNotCall ?? false
        litigator = dncData?.litigator ?? false
        totalCost += 0.004
      } catch {
        // DNC check failed — default to safe (assume not DNC)
      }

      enrichedPhones.push({
        ...phone,
        verified,
        doNotCall,
        litigator,
        carrier,
      })
    }
  } else {
    // No BatchData client or no phones — return base phones without enrichment
    enrichedPhones.push(
      ...baseResult.phones.map((p) => ({
        ...p,
        verified: false,
        doNotCall: false,
        litigator: false,
      })),
    )
  }

  return {
    ...baseResult,
    phones: enrichedPhones,
    estimatedCost: Math.round(totalCost * 1000) / 1000,
  }
}
