import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/chat/conversations/:id — load a single conversation
export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await context.params

    const conversation = await prisma.chatConversation.findFirst({
      where: { id, profileId: profile.id },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    return NextResponse.json(conversation)
  } catch (err) {
    console.error('GET /api/chat/conversations/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to load conversation' },
      { status: 500 },
    )
  }
}

// PATCH /api/chat/conversations/:id — update conversation
export async function PATCH(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await context.params
    const body = await req.json()

    // Verify ownership
    const existing = await prisma.chatConversation.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    // Only allow updating specific fields
    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.messages !== undefined) data.messages = body.messages
    if (body.summary !== undefined) data.summary = body.summary
    if (body.pinned !== undefined) data.pinned = body.pinned

    const updated = await prisma.chatConversation.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        summary: true,
        pinned: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /api/chat/conversations/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 },
    )
  }
}

// DELETE /api/chat/conversations/:id — delete a conversation
export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await context.params

    // Verify ownership
    const existing = await prisma.chatConversation.findFirst({
      where: { id, profileId: profile.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    await prisma.chatConversation.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/chat/conversations/[id] error:', err)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 },
    )
  }
}
