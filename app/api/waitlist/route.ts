import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const { email, role, source } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.trim().toLowerCase(), role: role ?? null, source: source ?? 'hero' })

    if (error) {
      // Duplicate email — treat as success so we don't leak info
      if (error.code === '23505') {
        return NextResponse.json({ success: true, existing: true })
      }
      console.error('Waitlist insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Waitlist route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
