'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

export default function GoogleOAuthButton({ mode }: { mode: 'login' | 'signup' }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const supabase = createClient()
    const redirectTo = mode === 'signup'
      ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/signup?step=2')}`
      : `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/dashboard')}`

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        width: '100%',
        padding: 12,
        borderRadius: 10,
        border: '1px solid #E5E7EB',
        background: '#ffffff',
        fontFamily: F,
        fontWeight: 500,
        fontSize: 15,
        color: '#0B1224',
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => {
        if (!loading) (e.currentTarget.style.background = '#F9FAFB')
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#ffffff'
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.08 24.08 0 0 0 0 21.56l7.98-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      {loading
        ? 'Redirecting...'
        : mode === 'signup'
          ? 'Continue with Google'
          : 'Sign in with Google'}
    </button>
  )
}
