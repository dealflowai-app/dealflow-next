import type { SkipTraceProvider } from './index'
import { MockSkipTraceProvider } from './mock-provider'
import { BatchSkipTracingProvider } from './batch-provider'
import { MelissaDataProvider } from './melissa-provider'

/**
 * Factory that returns the configured skip trace provider.
 *
 * Reads SKIP_TRACE_PROVIDER env var:
 *  - "mock" or undefined → MockSkipTraceProvider (default for dev)
 *  - "batch"             → BatchSkipTracingProvider
 *  - "melissa"           → MelissaDataProvider
 */
export function getSkipTraceProvider(): SkipTraceProvider {
  const provider = process.env.SKIP_TRACE_PROVIDER ?? 'mock'

  switch (provider) {
    case 'mock':
      return new MockSkipTraceProvider()
    case 'batch':
      return new BatchSkipTracingProvider()
    case 'melissa':
      return new MelissaDataProvider()
    default:
      throw new Error(`Unknown skip trace provider: "${provider}"`)
  }
}
