import { AttomClient } from './client'

export { AttomClient } from './client'
export * from './types'

/**
 * Returns a configured AttomClient if ATTOM_API_KEY is set,
 * or null if the key is missing (safe for optional integration).
 */
export function getAttomClient(): AttomClient | null {
  const apiKey = process.env.ATTOM_API_KEY
  if (!apiKey) return null
  return new AttomClient(apiKey)
}
