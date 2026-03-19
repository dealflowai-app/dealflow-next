import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/community', '/marketplace', '/buyers', '/crm', '/outreach', '/analyzer', '/contracts', '/gpt', '/settings', '/deals', '/admin']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + '/'))

  const verificationPaths = ['/verify-email', '/verify-phone']
  const isVerificationPage = verificationPaths.some(p => request.nextUrl.pathname === p)

  // Redirect unauthenticated users away from protected pages and verification pages
  if (!user && (isProtected || isVerificationPage)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages (unless completing signup step 2)
  const authPaths = ['/login', '/signup']
  const isAuthPage = authPaths.some(p => request.nextUrl.pathname === p)
  const isSignupStep2 = request.nextUrl.pathname === '/signup' && request.nextUrl.searchParams.get('step') === '2'

  if (user && isAuthPage && !isSignupStep2) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // If fully verified user hits signup step 2, send to dashboard
  if (user && isSignupStep2 && user.user_metadata?.phone_verified) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // For authenticated users on protected pages, enforce email + phone verification
  if (user && isProtected) {
    const emailConfirmed = !!user.email_confirmed_at
    const phoneVerified = !!user.user_metadata?.phone_verified

    if (!emailConfirmed) {
      const url = request.nextUrl.clone()
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }

    if (!phoneVerified) {
      const url = request.nextUrl.clone()
      url.pathname = '/verify-phone'
      return NextResponse.redirect(url)
    }
  }

  // If user is on verify-email but already verified email, push to profile setup or dashboard
  if (user && request.nextUrl.pathname === '/verify-email') {
    if (user.email_confirmed_at) {
      const url = request.nextUrl.clone()
      if (user.user_metadata?.phone_verified) {
        url.pathname = '/dashboard'
      } else {
        // Go to profile setup, then phone verification
        url.pathname = '/signup'
        url.searchParams.set('step', '2')
      }
      return NextResponse.redirect(url)
    }
  }

  // If user is on verify-phone but already verified phone, push to dashboard
  if (user && request.nextUrl.pathname === '/verify-phone') {
    if (user.user_metadata?.phone_verified) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/community/:path*', '/marketplace/:path*', '/buyers/:path*', '/crm/:path*', '/outreach/:path*', '/analyzer/:path*', '/contracts/:path*', '/gpt/:path*', '/settings/:path*', '/deals/:path*', '/admin/:path*', '/login', '/signup', '/verify-email', '/verify-phone'],
}
