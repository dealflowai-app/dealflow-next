import type {
  SkipTraceProvider,
  SkipTraceLookupParams,
  SkipTraceResult,
} from './index'

/**
 * BatchSkipTracing provider stub.
 *
 * Requires BATCH_API_KEY environment variable.
 * See: https://batchskiptracing.com/api
 */
export class BatchSkipTracingProvider implements SkipTraceProvider {
  readonly name = 'batch'
  private apiKey: string

  constructor() {
    const key = process.env.BATCH_API_KEY
    if (!key) {
      throw new Error(
        'BatchSkipTracing not configured — set BATCH_API_KEY environment variable',
      )
    }
    this.apiKey = key
  }

  async lookup(_params: SkipTraceLookupParams): Promise<SkipTraceResult> {
    // TODO: Implement BatchSkipTracing API integration
    // POST https://api.batchskiptracing.com/v1/lookup
    // Headers: { Authorization: `Bearer ${this.apiKey}` }
    void this.apiKey
    throw new Error('BatchSkipTracing provider not yet implemented')
  }
}
