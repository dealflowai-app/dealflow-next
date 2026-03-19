import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only mark verified if Supabase confirms the email is confirmed
    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: 'Email not yet confirmed' }, { status: 400 })
    }

    await prisma.profile.updateMany({
      where: { userId: user.id },
      data: { emailVerified: true },
    })

    return NextResponse.json({ verified: true })
  } catch (err) {
    console.error('Confirm email error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
