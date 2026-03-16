import type {
  SkipTraceProvider,
  SkipTraceLookupParams,
  SkipTraceResult,
} from './index'

/**
 * Melissa Data provider stub.
 *
 * Requires MELISSA_API_KEY environment variable.
 * See: https://www.melissa.com/developer
 */
export class MelissaDataProvider implements SkipTraceProvider {
  readonly name = 'melissa'
  private apiKey: string

  constructor() {
    const key = process.env.MELISSA_API_KEY
    if (!key) {
      throw new Error(
        'Melissa Data not configured — set MELISSA_API_KEY environment variable',
      )
    }
    this.apiKey = key
  }

  async lookup(_params: SkipTraceLookupParams): Promise<SkipTraceResult> {
    // TODO: Implement Melissa Data API integration
    // GET https://personator.melissadata.net/v3/WEB/ContactVerify/doContactVerify
    // Params: { id: this.apiKey, ... }
    void this.apiKey
    throw new Error('Melissa Data provider not yet implemented')
  }
}
