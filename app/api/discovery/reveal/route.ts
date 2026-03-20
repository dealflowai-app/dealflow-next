import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { enrichedSkipTrace } from '@/lib/skip-trace/enrich'
import { checkAllowance, recordUsage } from '@/lib/billing/allowances'
import { trackSkipTrace } from '@/lib/usage'
import { BatchDataApiError } from '@/lib/batchdata'

// ── POST /api/discovery/reveal ──

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const body = await req.json().catch(() => null)
    const propertyId = body?.propertyId
    if (!propertyId || typeof propertyId !== 'string') {
      return NextResponse.json(
        { error: 'propertyId is required' },
        { status: 400 },
      )
    }

    // 1. Look up the property from discovery cache
    const property = await prisma.discoveryProperty.findUnique({
      where: { id: propertyId },
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 },
      )
    }

    if (!property.ownerName) {
      return NextResponse.json(
        { error: 'No owner name on record for this property' },
        { status: 400 },
      )
    }

    const ownerName = property.ownerName
    const propertyAddress = property.addressLine1

    // 2. Check for cached (non-expired) reveal in ContactReveal table
    const existing = await prisma.contactReveal.findFirst({
      where: {
        ownerName,
        propertyAddress,
        expiresAt: { gt: new Date() },
      },
    })

    if (existing) {
      return NextResponse.json({
        reveal: toRevealResponse(existing),
        cached: true,
      })
    }

    // 3. Check allowance
    const allowance = await checkAllowance(profile.id, 'reveals')

    if (!allowance.allowed) {
      return NextResponse.json(
        {
          error: 'Reveal limit reached',
          limit: allowance.limit,
          used: allowance.used,
          upgradeRequired: !allowance.canOverage,
        },
        { status: 403 },
      )
    }

    // 4. Run enriched skip trace (trace + verify + DNC + TCPA)
    const result = await enrichedSkipTrace({
      street: propertyAddress,
      city: property.city,
      state: property.state,
      zip: property.zipCode ?? '',
      ownerName: property.ownerName ?? undefined,
    })

    // 5. Save to ContactReveal cache (backward compat)
    const reveal = await prisma.contactReveal.upsert({
      where: {
        ownerName_propertyAddress: { ownerName, propertyAddress },
      },
      create: {
        userId: profile.id,
        ownerName,
        propertyAddress,
        city: property.city,
        state: property.state,
        phones: result.phones as unknown as Prisma.InputJsonValue,
        emails: result.emails as unknown as Prisma.InputJsonValue,
        mailingAddress: result.mailingAddress
          ? (result.mailingAddress as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        confidence: result.confidence,
        provider: result.provider,
      },
      update: {
        phones: result.phones as unknown as Prisma.InputJsonValue,
        emails: result.emails as unknown as Prisma.InputJsonValue,
        mailingAddress: result.mailingAddress
          ? (result.mailingAddress as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        confidence: result.confidence,
        provider: result.provider,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    // 6. Also save to SkipTraceResult (enriched table with DNC/TCPA flags)
    const mobileCount = result.phones.filter((p) => p.type === 'mobile' && p.verified).length
    try {
      await prisma.skipTraceResult.upsert({
        where: {
          ownerName_propertyAddress: { ownerName, propertyAddress },
        },
        create: {
          userId: profile.id,
          propertyId,
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
          hasDoNotCall: result.phones.some((p) => p.doNotCall),
          hasLitigator: result.phones.some((p) => p.litigator),
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
          hasDoNotCall: result.phones.some((p) => p.doNotCall),
          hasLitigator: result.phones.some((p) => p.litigator),
          estimatedCost: result.estimatedCost,
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    } catch (err) {
      console.error('Failed to write SkipTraceResult:', err)
    }

    // 7. Record usage in allowance system + legacy usage table
    const usage = await recordUsage(profile.id, 'reveals', 1, result.estimatedCost)
    try {
      await trackSkipTrace(profile.id)
    } catch (err) {
      console.error('Legacy usage tracking failed for skip trace:', err)
    }

    return NextResponse.json({
      reveal: toRevealResponse(reveal),
      cached: false,
      usage: {
        used: usage.used,
        limit: usage.limit === -1 ? null : usage.limit,
        remaining: usage.remaining === -1 ? null : usage.remaining,
      },
      isOverage: usage.isOverage,
    })
  } catch (err) {
    if (err instanceof BatchDataApiError) {
      console.error(`BatchData error in reveal: ${err.status} ${err.endpoint}`)
      return NextResponse.json(
        { error: err.status === 429 ? 'Rate limit exceeded, try again shortly' : 'Skip trace provider error' },
        { status: err.status === 429 ? 429 : 502 },
      )
    }
    console.error('Discovery reveal error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ── Helper: shape the DB row into a clean API response ──

function toRevealResponse(row: {
  id: string
  ownerName: string
  propertyAddress: string
  phones: unknown
  emails: unknown
  mailingAddress: unknown
  confidence: number | null
  provider: string | null
  cachedAt: Date
}) {
  return {
    id: row.id,
    ownerName: row.ownerName,
    propertyAddress: row.propertyAddress,
    phones: row.phones ?? [],
    emails: row.emails ?? [],
    mailingAddress: row.mailingAddress ?? null,
    confidence: row.confidence ?? 0,
    provider: row.provider ?? 'unknown',
    cachedAt: row.cachedAt.toISOString(),
  }
}
