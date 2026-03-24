import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logger } from '@/lib/logger'

const VALID_SCOPES = ['deals:read', 'buyers:read', 'marketplace:read', '*']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    // Verify the key belongs to this user
    const existing = await prisma.apiKey.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!existing) return NextResponse.json({ error: 'API key not found' }, { status: 404 })

    const body = await req.json()
    const { name, scopes, active } = body as {
      name?: string
      scopes?: string[]
      active?: boolean
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 })
      }
      data.name = name.trim()
    }
    if (scopes !== undefined) {
      if (!Array.isArray(scopes) || scopes.length === 0) {
        return NextResponse.json({ error: 'At least one scope is required' }, { status: 400 })
      }
      const invalidScopes = scopes.filter((s) => !VALID_SCOPES.includes(s))
      if (invalidScopes.length > 0) {
        return NextResponse.json(
          { error: `Invalid scopes: ${invalidScopes.join(', ')}. Valid scopes: ${VALID_SCOPES.join(', ')}` },
          { status: 400 },
        )
      }
      data.scopes = scopes
    }
    if (active !== undefined) {
      if (typeof active !== 'boolean') {
        return NextResponse.json({ error: 'Active must be a boolean' }, { status: 400 })
      }
      data.active = active
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data,
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
    })

    return NextResponse.json(updated)
  } catch (err) {
    logger.error('PATCH /api/keys/[id] error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    // Verify the key belongs to this user
    const existing = await prisma.apiKey.findFirst({
      where: { id, profileId: profile.id },
    })
    if (!existing) return NextResponse.json({ error: 'API key not found' }, { status: 404 })

    await prisma.apiKey.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('DELETE /api/keys/[id] error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
