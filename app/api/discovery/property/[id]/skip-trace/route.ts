import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { enrichedSkipTrace } from '@/lib/skip-trace/enrich'
import { checkAllowance, recordUsage } from '@/lib/billing/allowances'
import { trackSkipTrace } from '@/lib/usage'
import { BatchDataApiError } from '@/lib/batchdata'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

/** Check if a cached skip-trace result exists (free — no credit charged) */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await context.params

    const property = await prisma.discoveryProperty.findUnique({ where: { id } })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (!property.ownerName) {
      return NextResponse.json({ cached: false })
    }

    const cached = await prisma.skipTraceResult.findFirst({
      where: {
        ownerName: property.ownerName,
        propertyAddress: property.addressLine1,
        expiresAt: { gt: new Date() },
      },
    })

    if (cached) {
      return NextResponse.json({
        cached: true,
        result: formatResult(cached),
      })
    }

    return NextResponse.json({ cached: false })
  } catch (err) {
    logger.error('Skip trace cache check error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await context.params

    // 1. Look up the property
    const property = await prisma.discoveryProperty.findUnique({ where: { id } })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (!property.ownerName) {
      return NextResponse.json(
        { error: 'No owner name on record for this property' },
        { status: 400 },
      )
    }

    const ownerName = property.ownerName
    const propertyAddress = property.addressLine1

    // 2. Check cache (non-expired)
    const cached = await prisma.skipTraceResult.findFirst({
      where: {
        ownerName,
        propertyAddress,
        expiresAt: { gt: new Date() },
      },
    })

    if (cached) {
      return NextResponse.json({
        result: formatResult(cached),
        cached: true,
        cost: 0,
      })
    }

    // 3. Check allowance
    const allowance = await checkAllowance(profile.id, 'reveals')

    if (!allowance.allowed) {
      return NextResponse.json({
        error: 'Monthly reveal limit reached',
        limit: allowance.limit,
        used: allowance.used,
        upgradeRequired: !allowance.canOverage,
      }, { status: 403 })
    }

    // 4. Run enriched skip trace
    const result = await enrichedSkipTrace({
      street: property.addressLine1,
      city: property.city,
      state: property.state,
      zip: property.zipCode ?? '',
      ownerName: property.ownerName ?? undefined,
    })

    // 5. Cache result
    const mobileCount = result.phones.filter((p) => p.type === 'mobile' && p.verified).length
    const hasDoNotCall = result.phones.some((p) => p.doNotCall)
    const hasLitigator = result.phones.some((p) => p.litigator)

    const skipTraceRecord = await prisma.skipTraceResult.upsert({
      where: {
        ownerName_propertyAddress: { ownerName, propertyAddress },
      },
      create: {
        userId: profile.id,
        propertyId: id,
        ownerName,
        propertyAddress,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        phones: result.phones as unknown as Prisma.InputJsonValue,
        emails: result.emails as unknown as Prisma.InputJsonValue,
        mailingAddress: result.mailingAddress
          ? (result.mailingAddress as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        confidence: result.confidence,
        provider: result.provider,
        phoneCount: result.phones.length,
        emailCount: result.emails.length,
        mobileCount,
        hasDoNotCall,
        hasLitigator,
        estimatedCost: result.estimatedCost,
      },
      update: {
        phones: result.phones as unknown as Prisma.InputJsonValue,
        emails: result.emails as unknown as Prisma.InputJsonValue,
        mailingAddress: result.mailingAddress
          ? (result.mailingAddress as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        confidence: result.confidence,
        phoneCount: result.phones.length,
        emailCount: result.emails.length,
        mobileCount,
        hasDoNotCall,
        hasLitigator,
        estimatedCost: result.estimatedCost,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // 6. Record usage in allowance system + legacy usage table
    const usage = await recordUsage(profile.id, 'reveals', 1, result.estimatedCost)
    try {
      await trackSkipTrace(profile.id)
    } catch (err) {
      logger.error('Legacy usage tracking failed for skip trace', { error: err instanceof Error ? err.message : String(err) })
    }

    // 7. Return result
    return NextResponse.json({
      result: formatResult(skipTraceRecord),
      cached: false,
      cost: result.estimatedCost,
      usage: {
        used: usage.used,
        limit: usage.limit === -1 ? null : usage.limit,
        remaining: usage.remaining === -1 ? null : usage.remaining,
      },
      isOverage: usage.isOverage,
    })
  } catch (err) {
    if (err instanceof BatchDataApiError) {
      logger.error(`BatchData skip trace error: ${err.status} ${err.endpoint}`)
      return NextResponse.json(
        { error: err.status === 429 ? 'Rate limit exceeded, try again shortly' : 'Skip trace provider error' },
        { status: err.status === 429 ? 429 : 502 },
      )
    }
    logger.error('Skip trace error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function formatResult(record: {
  id: string
  ownerName: string
  propertyAddress: string
  phones: unknown
  emails: unknown
  mailingAddress: unknown
  confidence: number
  provider: string
  phoneCount: number
  emailCount: number
  mobileCount: number
  hasDoNotCall: boolean
  hasLitigator: boolean
  cachedAt: Date
  expiresAt: Date
}) {
  return {
    id: record.id,
    ownerName: record.ownerName,
    propertyAddress: record.propertyAddress,
    phones: record.phones,
    emails: record.emails,
    mailingAddress: record.mailingAddress,
    confidence: record.confidence,
    provider: record.provider,
    phoneCount: record.phoneCount,
    emailCount: record.emailCount,
    mobileCount: record.mobileCount,
    hasDoNotCall: record.hasDoNotCall,
    hasLitigator: record.hasLitigator,
    cachedAt: record.cachedAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
  }
}
