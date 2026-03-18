import { prisma } from '@/lib/prisma'
import { normalizeAddress } from '@/lib/address'
import { logger } from '@/lib/logger'
import type { PropertyAnalysis } from './property-lookup'
import type { FullDealAnalysis } from './deal-analyzer'

// ─── Address Key Normalization ──────────────────────────────────────────────

export function normalizeAddressKey(address: string): string {
  return normalizeAddress(address)
}

// ─── Cache Lookup ───────────────────────────────────────────────────────────

export async function getCachedAnalysis(
  profileId: string,
  address: string,
): Promise<PropertyAnalysis | null> {
  const addressKey = normalizeAddressKey(address)

  try {
    const entry = await prisma.analysisCache.findUnique({
      where: {
        profileId_addressKey: { profileId, addressKey },
      },
    })

    if (!entry || entry.expiresAt <= new Date()) {
      return null
    }

    // If the cache contains a FullDealAnalysis (from cacheFullAnalysis),
    // extract the PropertyAnalysis from it
    const result = entry.result as Record<string, unknown>
    if (result.property && result.arv && result.repairs) {
      return result.property as unknown as PropertyAnalysis
    }

    return entry.result as unknown as PropertyAnalysis
  } catch (err) {
    logger.warn('Analysis cache lookup failed', {
      error: err instanceof Error ? err.message : String(err),
      addressKey,
    })
    return null
  }
}

// ─── Cache Write ────────────────────────────────────────────────────────────

export async function cacheAnalysis(
  profileId: string,
  address: string,
  result: PropertyAnalysis,
): Promise<void> {
  const addressKey = normalizeAddressKey(address)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

  // Serialize to plain JSON value compatible with Prisma's Json type
  const jsonResult = JSON.parse(JSON.stringify(result))

  try {
    await prisma.analysisCache.upsert({
      where: {
        profileId_addressKey: { profileId, addressKey },
      },
      create: {
        profileId,
        addressKey,
        rawAddress: address,
        result: jsonResult,
        apiCalls: result.meta.apiCallsUsed,
        cachedAt: now,
        expiresAt,
      },
      update: {
        rawAddress: address,
        result: jsonResult,
        apiCalls: result.meta.apiCallsUsed,
        cachedAt: now,
        expiresAt,
      },
    })
  } catch (err) {
    // Cache write failure is non-critical — log and continue
    logger.warn('Analysis cache write failed', {
      error: err instanceof Error ? err.message : String(err),
      addressKey,
    })
  }
}

// ─── Full Analysis Cache Write ───────────────────────────────────────────────

/**
 * Update the cache entry with the complete FullDealAnalysis result.
 * Called after runFullAnalysis completes — overwrites the PropertyAnalysis
 * stored earlier by analyzeProperty with the full analysis including ARV,
 * flip, rental, deal score, market intel, and AI summary.
 */
export async function cacheFullAnalysis(
  profileId: string,
  address: string,
  result: FullDealAnalysis,
): Promise<void> {
  const addressKey = normalizeAddressKey(address)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const jsonResult = JSON.parse(JSON.stringify(result))

  try {
    await prisma.analysisCache.upsert({
      where: {
        profileId_addressKey: { profileId, addressKey },
      },
      create: {
        profileId,
        addressKey,
        rawAddress: address,
        result: jsonResult,
        cachedAt: now,
        expiresAt,
      },
      update: {
        result: jsonResult,
        cachedAt: now,
        expiresAt,
      },
    })
  } catch (err) {
    logger.warn('Full analysis cache write failed', {
      error: err instanceof Error ? err.message : String(err),
      addressKey,
    })
  }
}
