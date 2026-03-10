import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
 
// PATCH /api/campaigns/[id] — update campaign status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, profileId: profile.id },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const { action } = await req.json()

    let updateData: Record<string, any> = {}

    switch (action) {
      case 'pause':
        updateData = { status: 'PAUSED' }
        break
      case 'resume':
        updateData = { status: 'RUNNING' }
        break
      case 'stop':
      case 'cancel':
        updateData = {
          status: 'CANCELLED',
          completedAt: new Date(),
        }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ campaign: updated })
  } catch (error) {
    console.error('Campaign PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

// GET /api/campaigns/[id] — get single campaign with calls
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, profileId: profile.id },
      include: {
        calls: {
          include: { buyer: true },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    })

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Campaign GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}