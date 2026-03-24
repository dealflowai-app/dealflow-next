import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { generateApiKey } from '@/lib/api-key-auth'
import { logger } from '@/lib/logger'

const VALID_SCOPES = ['deals:read', 'buyers:read', 'marketplace:read', '*']

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const keys = await prisma.apiKey.findMany({
      where: { profileId: profile.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ keys })
  } catch (err) {
    logger.error('GET /api/keys error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const { name, scopes, expiresAt } = body as {
      name?: string
      scopes?: string[]
      expiresAt?: string
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json({ error: 'At least one scope is required' }, { status: 400 })
    }

    const invalidScopes = scopes.filter((s) => !VALID_SCOPES.includes(s))
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(', ')}. Valid scopes: ${VALID_SCOPES.join(', ')}` },
        { status: 400 },
      )
    }

    // Limit number of keys per user
    const existingCount = await prisma.apiKey.count({ where: { profileId: profile.id } })
    if (existingCount >= 10) {
      return NextResponse.json({ error: 'Maximum of 10 API keys allowed per account' }, { status: 400 })
    }

    const { key, keyHash, keyPrefix } = generateApiKey()

    const apiKey = await prisma.apiKey.create({
      data: {
        profileId: profile.id,
        name: name.trim(),
        keyHash,
        keyPrefix,
        scopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        active: true,
        createdAt: true,
      },
    })

    // Return the actual key ONCE — it cannot be retrieved again
    return NextResponse.json({ ...apiKey, key }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/keys error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
