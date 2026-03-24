import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Handle OAuth code landing on homepage — redirect to auth callback
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/api/auth/callback'
    return NextResponse.redirect(url)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  const protectedPaths = ['/dashboard', '/community', '/marketplace', '/discovery', '/crm', '/outreach', '/contracts', '/gpt', '/settings', '/deals', '/admin']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + '/'))

  // Redirect unauthenticated users away from protected pages
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Handle /onboarding — redirect to the right place server-side
  if (request.nextUrl.pathname === '/onboarding') {
    const url = request.nextUrl.clone()
    if (user) {
      url.pathname = '/signup'
      url.searchParams.set('step', '2')
    } else {
      url.pathname = '/signup'
    }
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/signup']
  const isAuthPage = authPaths.some(p => request.nextUrl.pathname === p)
  const isSignupPage = request.nextUrl.pathname === '/signup'
  const isSignupStep2 = isSignupPage && request.nextUrl.searchParams.get('step') === '2'
  const onboarded = !!user?.user_metadata?.onboarded

  if (user && isAuthPage) {
    // Always allow signup step 2 (profile setup) unless already fully done
    if (isSignupStep2) {
      if (onboarded) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
      // Not onboarded — let them through to complete profile
    } else if (isSignupPage && !onboarded) {
      // Authenticated but not onboarded on /signup (no step) — send to step 2
      const url = request.nextUrl.clone()
      url.searchParams.set('step', '2')
      return NextResponse.redirect(url)
    } else {
      // Authenticated + onboarded on /login or /signup — go to dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // For authenticated users on protected pages, enforce onboarding
  if (user && isProtected && !onboarded) {
    const url = request.nextUrl.clone()
    url.pathname = '/signup'
    url.searchParams.set('step', '2')
    return NextResponse.redirect(url)
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

  // Set pathname header so server components can detect the current route
  supabaseResponse.headers.set('x-next-pathname', request.nextUrl.pathname)

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/community/:path*', '/marketplace/:path*', '/discovery/:path*', '/crm/:path*', '/outreach/:path*', '/contracts/:path*', '/gpt/:path*', '/settings/:path*', '/deals/:path*', '/admin/:path*', '/onboarding', '/welcome', '/login', '/signup', '/verify-email', '/verify-phone', '/analyzer'],
}
