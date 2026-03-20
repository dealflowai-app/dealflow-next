import type {
  SkipTraceProvider,
  SkipTraceLookupParams,
  SkipTraceResult,
} from './index'
import { getBatchDataClient } from '../batchdata'
import type { BatchDataClient } from '../batchdata'

/**
 * Skip trace provider backed by the BatchData API.
 *
 * Requires BATCHDATA_API_KEY environment variable.
 * Uses POST /property/skip-trace endpoint ($0.081/result).
 */
export class BatchSkipTracingProvider implements SkipTraceProvider {
  readonly name = 'batchdata'
  private client: BatchDataClient

  constructor() {
    const client = getBatchDataClient()
    if (!client) {
      throw new Error(
        'BatchData not configured — set BATCHDATA_API_KEY environment variable',
      )
    }
    this.client = client
  }

  async lookup(params: SkipTraceLookupParams): Promise<SkipTraceResult> {
    const response = await this.client.skipTrace({
      requests: [
        {
          address: {
            street: params.address,
            city: params.city,
            state: params.state,
            zip: params.zip ?? '',
          },
        },
      ],
    })

    const result = response.results?.properties?.[0]

    if (!result) {
      return {
        phones: [],
        emails: [],
        mailingAddress: null,
        confidence: 0,
        provider: this.name,
        cachedAt: new Date().toISOString(),
      }
    }

    return {
      phones: (result.phones ?? []).map((p) => ({
        number: p.number ?? '',
        type: p.type ?? 'landline',
        score: p.verified ? 90 : 50,
      })),
      emails: (result.emails ?? []).map((e) => ({
        address: e.address ?? '',
        type: (e.type === 'business' ? 'business' : 'personal') as 'personal' | 'business',
        score: e.verified ? 85 : 40,
      })),
      mailingAddress: result.mailingAddress
        ? {
            line1: result.mailingAddress.street ?? '',
            city: result.mailingAddress.city ?? '',
            state: result.mailingAddress.state ?? '',
            zip: result.mailingAddress.zip ?? '',
          }
        : null,
      confidence: result.phones?.length ? 75 : result.emails?.length ? 50 : 10,
      provider: this.name,
      cachedAt: new Date().toISOString(),
    }
  }
}
