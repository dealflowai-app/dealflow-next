import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

/**
 * GET /api/crm/buyers/[id]/notes
 *
 * List all notes (activity events where type = "note_added") for a buyer.
 * Paginated via cursor.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params
    const searchParams = req.nextUrl.searchParams
    const cursor = searchParams.get('cursor') || undefined
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const buyer = await prisma.cashBuyer.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true },
    })
    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const notes = await prisma.activityEvent.findMany({
      where: { buyerId: id, profileId: profile.id, type: 'note_added' },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    const hasMore = notes.length > limit
    if (hasMore) notes.pop()

    const nextCursor = notes.length > 0 ? notes[notes.length - 1].id : null

    return NextResponse.json({
      notes,
      pagination: {
        nextCursor: hasMore ? nextCursor : null,
        hasMore,
        count: notes.length,
      },
    })
  } catch (err) {
    console.error('GET /api/crm/buyers/[id]/notes error:', err)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

/**
 * POST /api/crm/buyers/[id]/notes
 *
 * Create a new note for a buyer.
 * Body: { text: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    let body: { text?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const text = body.text?.trim()
    if (!text) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 })
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: 'Note text must be 5000 characters or less' }, { status: 400 })
    }

    const buyer = await prisma.cashBuyer.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true },
    })
    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const note = await prisma.activityEvent.create({
      data: {
        buyerId: id,
        profileId: profile.id,
        type: 'note_added',
        title: 'Note added',
        detail: text,
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (err) {
    console.error('POST /api/crm/buyers/[id]/notes error:', err)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
