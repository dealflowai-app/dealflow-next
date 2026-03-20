import { BatchDataClient } from './client'

export { BatchDataClient } from './client'
export * from './types'
export * from './errors'

/**
 * Returns a configured BatchDataClient if BATCHDATA_API_KEY is set,
 * or null if the key is missing.
 */
export function getBatchDataClient(): BatchDataClient | null {
  const apiKey = process.env.BATCHDATA_API_KEY
  if (!apiKey) return null
  return new BatchDataClient(apiKey)
}
