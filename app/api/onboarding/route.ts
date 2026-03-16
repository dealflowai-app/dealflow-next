import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { formatWelcomeEmail } from '@/lib/emails'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { firstName, lastName, phone } = await request.json()

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, email: user.email!, firstName, lastName, phone, role: 'WHOLESALER' },
      update: { firstName, lastName, phone },
    })

    // Send welcome email (fire-and-forget)
    if (firstName && user.email) {
      const { subject, html, text } = formatWelcomeEmail({ firstName })
      sendEmail({
        to: { email: user.email, name: `${firstName} ${lastName || ''}`.trim() },
        subject,
        html,
        text,
        categories: ['onboarding', 'welcome'],
      }).catch((err) => console.error('Welcome email failed:', err))
    }

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
