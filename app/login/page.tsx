'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import GoogleOAuthButton from '@/components/GoogleOAuthButton'
import { createClient } from '@/lib/supabase/client'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const SERIF = "'DM Serif Display', Georgia, serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BODY = 'rgba(5, 14, 36, 0.5)'
const MUTED = 'rgba(5, 14, 36, 0.35)'
const BORDER = '#E5E7EB'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: '#ffffff',
  fontFamily: F,
  fontSize: 15,
  color: NAVY,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const inputWithToggle: React.CSSProperties = {
  ...inputStyle,
  paddingRight: 42,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: NAVY,
  fontFamily: F,
  marginBottom: 6,
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [failCount, setFailCount] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [lockCountdown, setLockCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer for lockout
  useEffect(() => {
    if (lockedUntil) {
      const tick = () => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
        if (remaining <= 0) {
          setLockedUntil(null)
          setLockCountdown(0)
          if (timerRef.current) clearInterval(timerRef.current)
        } else {
          setLockCountdown(remaining)
        }
      }
      tick()
      timerRef.current = setInterval(tick, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [lockedUntil])

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email above, then click "Forgot password?"')
      return
    }
    setError('')
    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/reset-password')}`,
    })
    if (resetError) {
      setError(resetError.message)
    } else {
      setResetSent(true)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      const newCount = failCount + 1
      setFailCount(newCount)

      // Lock out after 5 failed attempts for 30 seconds
      if (newCount >= 5) {
        const lockDuration = 30 * 1000
        setLockedUntil(Date.now() + lockDuration)
        setError('Too many failed attempts. Please wait before trying again.')
        setFailCount(0)
      } else {
        setError(authError.message)
      }

      setLoading(false)
      return
    }

    setFailCount(0)
    window.location.href = '/dashboard'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', flexDirection: 'column', fontFamily: F }}>
      <Nav currentPage="login" />

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px 80px' }}>
        <div className="auth-card" style={{
          background: '#ffffff', borderRadius: 16, padding: '40px 36px',
          width: '100%', maxWidth: 400,
          boxShadow: '0 1px 2px rgba(5,14,36,0.06), 0 4px 16px rgba(5,14,36,0.04)',
          border: '1px solid rgba(5,14,36,0.06)',
        }}>
          <h1 style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 400, color: NAVY, letterSpacing: '-0.022em', marginBottom: 6, lineHeight: 1.15 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '0.9rem', color: BODY, marginBottom: 24, lineHeight: 1.6, fontFamily: F }}>
            Sign in to access your deals, buyers, and platform tools.
          </p>

          {/* Google OAuth */}
          <GoogleOAuthButton mode="login" />

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(5,14,36,0.08)' }} />
            <span style={{ fontSize: 12, color: 'rgba(5,14,36,0.35)', fontFamily: F, fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(5,14,36,0.08)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com"
                suppressHydrationWarning
                className="auth-input"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{ fontSize: 12, color: BLUE, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F }}
                >
                  {resetSent ? 'Reset link sent!' : 'Forgot password?'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Enter your password"
                  suppressHydrationWarning
                  className="auth-input"
                  style={inputWithToggle}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(5,14,36,0.3)', padding: 0, display: 'flex' }}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {/* Reset sent success */}
            {resetSent && !error && (
              <div style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: BLUE, lineHeight: 1.5, fontFamily: F }}>
                Check your email for a reset link.
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', lineHeight: 1.5, fontFamily: F }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || isLocked}
              className="auth-submit"
              style={{
                width: '100%', padding: 12, borderRadius: 10,
                background: (loading || isLocked) ? '#60A5FA' : BLUE,
                color: 'white', border: 'none',
                fontFamily: F, fontWeight: 600, fontSize: 15,
                cursor: (loading || isLocked) ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span className="auth-spinner" />
                  Signing in...
                </>
              ) : isLocked ? `Try again in ${lockCountdown}s` : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(5,14,36,0.4)', marginTop: 20, fontFamily: F }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .auth-input:focus {
          border-color: ${BLUE} !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }
        .auth-input::placeholder {
          color: rgba(5,14,36,0.35);
          font-family: ${F};
        }
        .auth-submit:hover:not(:disabled) {
          background: #1D4ED8 !important;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .auth-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @media (max-width: 480px) {
          .auth-card { padding: 28px 22px !important; border-radius: 14px !important; }
        }
      ` }} />
    </div>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
