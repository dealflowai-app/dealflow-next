import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


export async function POST(request: Request) {
  try {
    const { userId, email, firstName, lastName, phone, role } = await request.json()

    if (!userId || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validRoles = ['WHOLESALER', 'BUYER', 'BOTH']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: { userId, email, firstName, lastName, phone, role: role as any },
      update: { email, firstName, lastName, phone, role: role as any },
    })

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
