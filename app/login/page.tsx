'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #edf4ff 0%, #f5f8ff 40%, #ffffff 70%)', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Image src="/Logo.png" alt="Dealflow AI" width={32} height={32} style={{ objectFit: 'contain' }} />
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
            Dealflow AI
          </span>
        </Link>
        <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
          No account?{' '}
          <Link href="/#hero-form" style={{ color: 'var(--blue-600)', fontWeight: 600, textDecoration: 'none' }}>
            Join the waitlist
          </Link>
        </span>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 20px 60px' }}>
        <div
          style={{
            background: 'var(--white)',
            borderRadius: 24,
            padding: '44px 40px',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 4px 40px rgba(0,0,0,0.09)',
            border: '1px solid var(--gray-100)',
          }}
          className="login-card"
        >
          {/* Icon */}
          <div style={{ width: 48, height: 48, borderRadius: 13, background: 'var(--blue-50)', border: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.7rem', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.1 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--gray-500)', marginBottom: 32, lineHeight: 1.5 }}>
            Sign in to access your deals, buyers, and platform tools.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6, letterSpacing: '0.01em' }}>
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                suppressHydrationWarning
                style={{
                  width: '100%',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 10,
                  padding: '11px 14px',
                  fontSize: '0.9rem',
                  color: 'var(--gray-900)',
                  background: 'var(--white)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                className="login-input"
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-700)', letterSpacing: '0.01em' }}>
                  Password
                </label>
                <Link href="#" style={{ fontSize: '0.75rem', color: 'var(--blue-600)', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  suppressHydrationWarning
                  style={{
                    width: '100%',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 10,
                    padding: '11px 42px 11px 14px',
                    fontSize: '0.9rem',
                    color: 'var(--gray-900)',
                    background: 'var(--white)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 0, display: 'flex' }}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9, padding: '10px 14px', fontSize: '0.82rem', color: '#b91c1c' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'var(--blue-400, #93c5fd)' : 'var(--blue-600)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '13px 24px',
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4,
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 20 }}>
            Don&apos;t have an account?{' '}
            <Link href="/#hero-form" style={{ color: 'var(--blue-600)', fontWeight: 600, textDecoration: 'none' }}>
              Request early access
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .login-input:focus {
          border-color: var(--blue-400, #93c5fd) !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .login-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @media (max-width: 480px) {
          .login-card { padding: 32px 24px !important; border-radius: 16px !important; }
        }
      `}</style>
    </div>
  )
}
