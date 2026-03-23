import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Handle OAuth code landing on homepage — redirect to auth callback
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/api/auth/callback'
    return NextResponse.redirect(url)
  }
 
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

  // For authenticated users on protected pages, enforce onboarding only
  // Email and phone verification are soft-gated (reminder banner on dashboard)
  if (user && isProtected) {
    const onboarded = !!user.user_metadata?.onboarded

    if (!onboarded) {
      const url = request.nextUrl.clone()
      url.pathname = '/signup'
      url.searchParams.set('step', '2')
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

  // Set pathname header so server components can detect the current route
  supabaseResponse.headers.set('x-next-pathname', request.nextUrl.pathname)

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/community/:path*', '/marketplace/:path*', '/discovery/:path*', '/crm/:path*', '/outreach/:path*', '/contracts/:path*', '/gpt/:path*', '/settings/:path*', '/deals/:path*', '/admin/:path*', '/onboarding', '/welcome', '/login', '/signup', '/verify-email', '/verify-phone', '/analyzer'],
}
