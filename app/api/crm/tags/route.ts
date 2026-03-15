import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAuthProfile } from '@/lib/auth'

/**
 * GET /api/crm/tags
 *
 * List all tags for the current user (auto and manual) with buyer counts.
 */
export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const tags = await prisma.tag.findMany({
      where: { profileId: profile.id },
      include: {
        _count: { select: { buyers: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        label: t.label,
        color: t.color,
        type: t.type,
        description: t.description,
        buyerCount: t._count.buyers,
        createdAt: t.createdAt,
      })),
    })
  } catch (err) {
    console.error('GET /api/crm/tags error:', err)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

/**
 * POST /api/crm/tags
 *
 * Create a manual tag. Body: { name, label, color, description? }
 */
export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const body = await req.json()

    if (!body.name || !body.label || !body.color) {
      return NextResponse.json(
        { error: 'name, label, and color are required' },
        { status: 400 },
      )
    }

    // Normalize name to snake_case
    const name = body.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

    if (!name) {
      return NextResponse.json(
        { error: 'name must contain at least one alphanumeric character' },
        { status: 400 },
      )
    }

    const existing = await prisma.tag.findUnique({
      where: { profileId_name: { profileId: profile.id, name } },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Tag "${name}" already exists`, existingId: existing.id },
        { status: 409 },
      )
    }

    const tag = await prisma.tag.create({
      data: {
        profileId: profile.id,
        name,
        label: body.label,
        color: body.color,
        type: 'manual',
        description: body.description || null,
      },
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 })
    }
    console.error('POST /api/crm/tags error:', err)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}
