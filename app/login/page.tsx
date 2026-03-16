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
    <div style={{ minHeight: '100vh', background: 'var(--cream, #FAF9F6)', display: 'flex', flexDirection: 'column' }}>

      {/* Top nav — floating pill style */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '14px 24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderRadius: 14,
            background: '#ffffff',
            boxShadow: 'rgba(5,14,36,0.06) 0px 1px 2px, rgba(5,14,36,0.04) 0px 2px 8px',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontFamily: 'inherit',
              fontWeight: 500,
              fontSize: '1.02rem',
              color: 'var(--navy-heading, #0B1224)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            <Image
              src="/Logo.png"
              alt="DealFlow AI logo"
              width={28}
              height={28}
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />
            DealFlow AI
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.68rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--blue-600, #2563EB)',
                background: 'var(--blue-50, #EFF6FF)',
                border: '1px solid var(--blue-100, #DBEAFE)',
                borderRadius: 20,
                padding: '2px 8px',
                lineHeight: 1,
              }}
            >
              Beta
            </span>
          </Link>
          <span style={{ fontSize: '0.85rem', color: 'var(--body-text, #4B5563)' }}>
            No account?{' '}
            <Link href="/#cta" style={{ color: 'var(--blue-600, #2563EB)', fontWeight: 600, textDecoration: 'none' }}>
              Join the waitlist
            </Link>
          </span>
        </div>
      </div>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 20px 80px' }}>
        <div
          className="login-card"
          style={{
            background: 'var(--white, #ffffff)',
            borderRadius: 16,
            padding: '40px 36px',
            width: '100%',
            maxWidth: 400,
            boxShadow: 'rgba(5,14,36,0.06) 0px 1px 2px, rgba(5,14,36,0.04) 0px 4px 16px',
            border: '1px solid var(--border-light, #F0F0F0)',
          }}
        >
          {/* Icon */}
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--blue-50, #EFF6FF)', border: '1px solid var(--blue-100, #DBEAFE)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600, #2563EB)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.6rem', fontWeight: 400, color: 'var(--navy-heading, #0B1224)', letterSpacing: '-0.022em', marginBottom: 6, lineHeight: 1.15 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--body-text, #4B5563)', marginBottom: 28, lineHeight: 1.6 }}>
            Sign in to access your deals, buyers, and platform tools.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: 'var(--navy-heading, #0B1224)', marginBottom: 5, letterSpacing: '0.01em' }}>
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
                  border: '1px solid var(--border-med, #E5E7EB)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: '0.88rem',
                  color: 'var(--navy-heading, #0B1224)',
                  background: 'var(--white, #ffffff)',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--navy-heading, #0B1224)', letterSpacing: '0.01em' }}>
                  Password
                </label>
                <Link href="#" style={{ fontSize: '0.74rem', color: 'var(--blue-600, #2563EB)', textDecoration: 'none', fontWeight: 500 }}>
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
                    border: '1px solid var(--border-med, #E5E7EB)',
                    borderRadius: 10,
                    padding: '10px 42px 10px 14px',
                    fontSize: '0.88rem',
                    color: 'var(--navy-heading, #0B1224)',
                    background: 'var(--white, #ffffff)',
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
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-text, #9CA3AF)', padding: 0, display: 'flex' }}
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
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 14px', fontSize: '0.82rem', color: '#b91c1c', lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit"
              style={{
                width: '100%',
                background: loading ? '#60A5FA' : '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '11px 24px',
                fontFamily: 'inherit',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 2,
                transition: 'background 0.2s ease',
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

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted-text, #9CA3AF)', marginTop: 20 }}>
            Don&apos;t have an account?{' '}
            <Link href="/#cta" style={{ color: 'var(--blue-600, #2563EB)', fontWeight: 600, textDecoration: 'none' }}>
              Request early access
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .login-input:focus {
          border-color: var(--blue-400, #60A5FA) !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }
        .login-input::placeholder {
          color: var(--muted-text, #9CA3AF);
        }
        .login-submit:hover:not(:disabled) {
          background: #1D4ED8 !important;
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
          .login-card { padding: 28px 22px !important; border-radius: 14px !important; }
        }
      `}</style>
    </div>
  )
}
