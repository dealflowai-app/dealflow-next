/**
 * Activity Logger — Fire-and-forget activity event recording.
 *
 * Usage:
 *   logActivity({ buyerId, profileId, type: 'edited', title: 'Email updated', metadata: { field: 'email' } })
 *
 * All functions swallow errors so they never break the calling route.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

export interface ActivityInput {
  buyerId: string
  profileId: string
  type: string
  title: string
  detail?: string
  metadata?: Record<string, unknown>
  createdAt?: Date // allow backdating for backfill
}

/**
 * Log a single activity event. Fire-and-forget — never throws.
 */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        buyerId: input.buyerId,
        profileId: input.profileId,
        type: input.type,
        title: input.title,
        detail: input.detail ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      },
    })
  } catch (err) {
    logger.error('logActivity failed', { type: input.type, buyerId: input.buyerId, error: err instanceof Error ? err.message : String(err) })
  }
}

/**
 * Log multiple activity events in one DB call. Fire-and-forget — never throws.
 */
export async function logBulkActivity(inputs: ActivityInput[]): Promise<void> {
  if (inputs.length === 0) return
  try {
    await prisma.activityEvent.createMany({
      data: inputs.map((input) => ({
        buyerId: input.buyerId,
        profileId: input.profileId,
        type: input.type,
        title: input.title,
        detail: input.detail ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      })),
    })
  } catch (err) {
    logger.error('logBulkActivity failed', { count: inputs.length, error: err instanceof Error ? err.message : String(err) })
  }
}

/* ─── Account-level Activity Log ──────────────────────────────────────────── */

/**
 * Log an account-level activity (not tied to a specific buyer).
 * Fire-and-forget — errors are caught silently so callers are never blocked.
 *
 * Types: DEAL_CREATED, BUYER_ADDED, BUYER_IMPORTED, CAMPAIGN_SENT,
 *        DEAL_STATUS_CHANGED, CONTRACT_CREATED, POST_CREATED
 */
export async function logAccountActivity(
  profileId: string,
  type: string,
  title: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        profileId,
        type,
        title,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    })
  } catch (err) {
    // Never breaks the caller, but log so failures are observable
    logger.error('logAccountActivity failed', { profileId, type, error: err instanceof Error ? err.message : String(err) })
  }
}
