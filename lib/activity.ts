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
    console.error('logActivity failed:', err)
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
    console.error('logBulkActivity failed:', err)
  }
}
