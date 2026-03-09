import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const { userId, email, firstName, lastName, phone, role } = await request.json()

    if (!userId || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!Object.values(Role).includes(role as Role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: { userId, email, firstName, lastName, phone, role: role as Role },
      update: { email, firstName, lastName, phone, role: role as Role },
    })

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
