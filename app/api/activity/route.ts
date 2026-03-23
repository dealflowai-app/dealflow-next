import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'

export async function GET() {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const logs = await prisma.activityLog.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        metadata: true,
        createdAt: true,
      },
    })

    return NextResponse.json(logs)
  } catch (err) {
    console.error('[activity] GET error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
