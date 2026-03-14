import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { userId, email, firstName, lastName, phone } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: { userId, email, firstName, lastName, phone, role: 'WHOLESALER' },
      update: { email, firstName, lastName, phone },
    })

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
