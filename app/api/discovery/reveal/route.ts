import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { getSkipTraceProvider } from '@/lib/skip-trace/providers'
import type { SkipTraceResult } from '@/lib/skip-trace'

// ── Tier limits (reveals per calendar month) ──

const TIER_LIMITS: Record<string, number> = {
  free: 0,
  starter: 50,
  pro: 500,
  enterprise: Infinity,
}

function getTierLimit(_profileId: string): number {
  // TODO: Look up the user's subscription tier from Stripe/billing table.
  // For now, default to starter tier so reveals work during development.
  const tier = process.env.DEFAULT_TIER ?? 'starter'
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free
}

// ── Parse owner name into first/last or entity ──

function parseOwnerName(name: string): {
  firstName?: string
  lastName?: string
  entityName?: string
} {
  const lower = name.toLowerCase()
  const entityKeywords = ['llc', 'l.l.c', 'corp', 'inc', 'trust', 'holdings', 'capital', 'properties', 'lp', 'ltd']
  if (entityKeywords.some(kw => lower.includes(kw))) {
    return { entityName: name }
  }
  // Try "LAST, FIRST" format (common in public records)
  const commaMatch = name.match(/^(.+?),\s*(.+?)$/)
  if (commaMatch) {
    return { firstName: commaMatch[2].trim(), lastName: commaMatch[1].trim() }
  }
  // Try "FIRST LAST" format
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
  }
  return { lastName: name.trim() }
}

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

    // 2. Check for cached (non-expired) reveal
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

    // 3. Check usage limits
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const usedThisMonth = await prisma.contactReveal.count({
      where: {
        userId: profile.id,
        cachedAt: { gte: monthStart },
      },
    })

    const limit = getTierLimit(profile.id)
    if (usedThisMonth >= limit) {
      return NextResponse.json(
        {
          error: 'Reveal limit reached',
          limit,
          used: usedThisMonth,
          upgrade: true,
        },
        { status: 403 },
      )
    }

    // 4. Call skip trace provider
    const provider = getSkipTraceProvider()
    const nameParts = parseOwnerName(ownerName)
    const result: SkipTraceResult = await provider.lookup({
      ...nameParts,
      address: propertyAddress,
      city: property.city,
      state: property.state,
      zip: property.zipCode ?? undefined,
    })

    // 5. Save to cache (upsert in case of race condition on unique constraint)
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

    return NextResponse.json({
      reveal: toRevealResponse(reveal),
      cached: false,
      usage: { used: usedThisMonth + 1, limit },
    })
  } catch (err) {
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
