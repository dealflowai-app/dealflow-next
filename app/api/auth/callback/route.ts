import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getSafeRedirect(next: string | null): string {
  if (!next) return ''
  // Only allow relative paths starting with / — block protocol-relative URLs and external domains
  if (!next.startsWith('/') || next.startsWith('//')) return ''
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = getSafeRedirect(searchParams.get('next'))

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If an explicit next param was provided, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Otherwise, determine destination based on user state
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const isOAuth = user.app_metadata?.provider !== 'email'

        if (!user.user_metadata?.onboarded) {
          return NextResponse.redirect(`${origin}/signup?step=2`)
        }

        // Skip phone verification for OAuth users (already verified via Google etc.)
        if (!isOAuth && !user.user_metadata?.phone_verified) {
          return NextResponse.redirect(`${origin}/verify-phone`)
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Auth failed — redirect to signup with error
  return NextResponse.redirect(`${origin}/signup?error=auth_failed`)
}
