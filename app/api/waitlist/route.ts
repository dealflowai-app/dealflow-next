import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { email, role, source } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.trim().toLowerCase(), role: role ?? null, source: source ?? 'hero' })

    if (error) {
      // Duplicate email - treat as success so we don't leak info
      if (error.code === '23505') {
        return NextResponse.json({ success: true, existing: true })
      }
      logger.error('Waitlist insert error', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Waitlist route error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
