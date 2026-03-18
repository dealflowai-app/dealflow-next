'use client'

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const SERIF = "'DM Serif Display', Georgia, serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BODY = 'rgba(5, 14, 36, 0.5)'
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

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    window.location.href = '/onboarding'
  }

  const isAlreadyRegistered = error.toLowerCase().includes('already registered')

  function clearError() { setError('') }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', flexDirection: 'column', fontFamily: F }}>
      <Nav currentPage="signup" />

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px 80px' }}>
        <div className="auth-card" style={{
          background: '#ffffff', borderRadius: 16, padding: '40px 36px',
          width: '100%', maxWidth: 400,
          boxShadow: '0 1px 2px rgba(5,14,36,0.06), 0 4px 16px rgba(5,14,36,0.04)',
          border: '1px solid rgba(5,14,36,0.06)',
        }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>

          <h1 style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 400, color: NAVY, letterSpacing: '-0.022em', marginBottom: 6, lineHeight: 1.15 }}>
            Create your account
          </h1>
          <p style={{ fontSize: '0.9rem', color: BODY, marginBottom: 28, lineHeight: 1.6, fontFamily: F }}>
            Start finding buyers and closing deals today.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); clearError() }}
                placeholder="you@example.com"
                suppressHydrationWarning
                className="auth-input"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); clearError() }}
                  placeholder="Create a password"
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
              <p style={{ fontSize: 12, color: 'rgba(5,14,36,0.35)', marginTop: 5, marginBottom: 0, fontFamily: F }}>
                At least 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}>Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); clearError() }}
                  placeholder="Confirm your password"
                  suppressHydrationWarning
                  className="auth-input"
                  style={inputWithToggle}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(5,14,36,0.3)', padding: 0, display: 'flex' }}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', lineHeight: 1.5, fontFamily: F }}>
                {error}
                {isAlreadyRegistered && (
                  <>
                    {' '}
                    <Link href="/login" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Sign in instead?</Link>
                  </>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="auth-submit"
              style={{
                width: '100%', padding: 12, borderRadius: 10,
                background: loading ? '#60A5FA' : BLUE,
                color: 'white', border: 'none',
                fontFamily: F, fontWeight: 600, fontSize: 15,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span className="auth-spinner" />
                  Creating account...
                </>
              ) : 'Create account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(5,14,36,0.4)', marginTop: 16, lineHeight: 1.6, fontFamily: F }}>
            By creating an account, you agree to our{' '}
            <Link href="/terms" style={{ color: BLUE, textDecoration: 'none' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" style={{ color: BLUE, textDecoration: 'none' }}>Privacy Policy</Link>.
          </p>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(5,14,36,0.4)', marginTop: 16, fontFamily: F }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>

      <style>{`
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
      `}</style>
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
