import type { SkipTraceProvider } from './index'
import { MockSkipTraceProvider } from './mock-provider'
import { BatchSkipTracingProvider } from './batch-provider'

/**
 * Factory that returns the configured skip trace provider.
 *
 * Reads SKIP_TRACE_PROVIDER env var:
 *  - "mock" or undefined → MockSkipTraceProvider (default for dev)
 *  - "batch" / "batchdata" → BatchSkipTracingProvider (backed by BatchData API)
 */
export function getSkipTraceProvider(): SkipTraceProvider {
  const provider = process.env.SKIP_TRACE_PROVIDER ?? 'mock'

  switch (provider) {
    case 'mock':
      return new MockSkipTraceProvider()
    case 'batch':
    case 'batchdata':
      return new BatchSkipTracingProvider()
    default:
      throw new Error(`Unknown skip trace provider: "${provider}"`)
  }
}
