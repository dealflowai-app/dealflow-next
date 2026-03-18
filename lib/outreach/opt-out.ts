// ─── Opt-Out Processing Service ──────────────────────────────────────────────
// Handles DNC list management: opt-outs, opt-ins, bulk import, and querying.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizePhone, invalidateDNCCache } from './compliance'

// ─── Types ──────────────────────────────────────────────────────────────────

export type OptOutSource = 'call_request' | 'sms_stop' | 'manual' | 'webhook' | 'import'

export interface OptOutEntry {
  id: string
  phone: string
  email: string | null
  reason: string | null
  source: string | null
  createdAt: Date
}

// ─── Process Opt-Out ────────────────────────────────────────────────────────

export async function processOptOut(
  phone: string,
  options?: {
    email?: string
    reason?: string
    source?: OptOutSource
    profileId?: string
  },
): Promise<{ success: boolean; alreadyOptedOut: boolean }> {
  try {
    const normalized = normalizePhone(phone)
    if (!normalized) {
      return { success: false, alreadyOptedOut: false }
    }

    // 1. Upsert into OptOut table
    let alreadyOptedOut = false
    try {
      await prisma.optOut.create({
        data: {
          phone: normalized,
          email: options?.email || null,
          reason: options?.reason || null,
          source: options?.source || null,
        },
      })
    } catch (err: any) {
      // Unique constraint violation = already exists
      if (err?.code === 'P2002') {
        alreadyOptedOut = true
        // Update reason/source if provided
        if (options?.reason || options?.source) {
          await prisma.optOut.update({
            where: { phone: normalized },
            data: {
              ...(options.reason ? { reason: options.reason } : {}),
              ...(options.source ? { source: options.source } : {}),
            },
          }).catch(() => { /* non-critical */ })
        }
      } else {
        throw err
      }
    }

    // 2. Update ALL CashBuyer records with this phone
    await prisma.cashBuyer.updateMany({
      where: {
        phone: { contains: normalized },
      },
      data: {
        isOptedOut: true,
        optedOutAt: new Date(),
        status: 'DO_NOT_CALL',
      },
    })

    // 3. Cancel any pending/queued CampaignCall records
    // Find campaigns that are RUNNING or DRAFT with calls for this phone
    await prisma.campaignCall.updateMany({
      where: {
        phoneNumber: { contains: normalized },
        outcome: null, // Only pending calls (no outcome yet)
      },
      data: {
        outcome: 'DO_NOT_CALL',
        endedAt: new Date(),
      },
    })

    // 4. Log the opt-out event
    if (options?.profileId) {
      prisma.complianceLog.create({
        data: {
          profileId: options.profileId,
          phone: normalized,
          channel: 'voice',
          action: 'opt_out',
          result: 'blocked',
          reasons: ['OPT_OUT'],
          metadata: {
            source: options.source || 'unknown',
            reason: options.reason || null,
            alreadyOptedOut,
          },
        },
      }).catch(err => {
        logger.warn('Failed to write opt-out compliance log', {
          route: 'opt-out',
          error: err instanceof Error ? err.message : String(err),
        })
      })
    }

    // 5. Invalidate DNC cache
    invalidateDNCCache()

    return { success: true, alreadyOptedOut }
  } catch (err) {
    logger.error('processOptOut failed', {
      route: 'opt-out',
      error: err instanceof Error ? err.message : String(err),
    })
    return { success: false, alreadyOptedOut: false }
  }
}

// ─── Process Opt-In (Remove from DNC) ───────────────────────────────────────

export async function processOptIn(
  phone: string,
  profileId: string,
): Promise<{ success: boolean }> {
  try {
    const normalized = normalizePhone(phone)
    if (!normalized) {
      return { success: false }
    }

    // Remove from OptOut table
    await prisma.optOut.delete({
      where: { phone: normalized },
    }).catch(err => {
      // Ignore if not found
      if (err?.code !== 'P2025') throw err
    })

    // Update CashBuyer records belonging to this profile back to ACTIVE
    await prisma.cashBuyer.updateMany({
      where: {
        phone: { contains: normalized },
        profileId,
      },
      data: {
        isOptedOut: false,
        optedOutAt: null,
        status: 'ACTIVE',
      },
    })

    // Log the opt-in event
    prisma.complianceLog.create({
      data: {
        profileId,
        phone: normalized,
        channel: 'voice',
        action: 'opt_in',
        result: 'allowed',
        reasons: ['OPT_IN'],
        metadata: { removedFromDNC: true },
      },
    }).catch(err => {
      logger.warn('Failed to write opt-in compliance log', {
        route: 'opt-out',
        error: err instanceof Error ? err.message : String(err),
      })
    })

    // Invalidate DNC cache
    invalidateDNCCache()

    return { success: true }
  } catch (err) {
    logger.error('processOptIn failed', {
      route: 'opt-out',
      error: err instanceof Error ? err.message : String(err),
    })
    return { success: false }
  }
}

// ─── Bulk Import DNC List ───────────────────────────────────────────────────

export async function importDNCList(
  phones: string[],
  profileId: string,
): Promise<{ added: number; skipped: number; invalid: number }> {
  let added = 0
  let skipped = 0
  let invalid = 0

  for (const phone of phones) {
    const normalized = normalizePhone(phone)
    if (!normalized) {
      invalid++
      continue
    }

    const result = await processOptOut(normalized, {
      source: 'import',
      reason: 'Bulk DNC import',
      profileId,
    })

    if (result.success) {
      if (result.alreadyOptedOut) {
        skipped++
      } else {
        added++
      }
    } else {
      invalid++
    }
  }

  // Log the import event
  prisma.complianceLog.create({
    data: {
      profileId,
      phone: 'bulk_import',
      channel: 'voice',
      action: 'dnc_import',
      result: 'allowed',
      reasons: [],
      metadata: {
        totalPhones: phones.length,
        added,
        skipped,
        invalid,
      },
    },
  }).catch(err => {
    logger.warn('Failed to write DNC import compliance log', {
      route: 'opt-out',
      error: err instanceof Error ? err.message : String(err),
    })
  })

  return { added, skipped, invalid }
}

// ─── Get DNC List ───────────────────────────────────────────────────────────

export async function getDNCList(
  profileId: string,
  options?: { limit?: number; offset?: number; search?: string },
): Promise<{ entries: OptOutEntry[]; total: number }> {
  try {
    const limit = options?.limit || 50
    const offset = options?.offset || 0
    const search = options?.search?.replace(/\D/g, '') || undefined

    const where = search
      ? { phone: { contains: search } }
      : {}

    const [entries, total] = await Promise.all([
      prisma.optOut.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.optOut.count({ where }),
    ])

    return { entries, total }
  } catch (err) {
    logger.error('getDNCList failed', {
      route: 'opt-out',
      error: err instanceof Error ? err.message : String(err),
    })
    return { entries: [], total: 0 }
  }
}
