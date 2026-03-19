'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const SERIF = "'DM Serif Display', Georgia, serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BODY = 'rgba(5, 14, 36, 0.5)'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    // If user returned from email link, mark as confirmed
    if (searchParams.get('confirmed') === 'true') {
      setConfirmed(true)
      // Update profile emailVerified flag
      fetch('/api/auth/confirm-email', { method: 'POST' }).catch(() => {})
      setTimeout(() => {
        router.push('/verify-phone')
        router.refresh()
      }, 2000)
      return
    }

    // Get user email for display
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
      // If user already confirmed via Supabase (e.g. Google OAuth), skip
      if (user?.email_confirmed_at) {
        setConfirmed(true)
        fetch('/api/auth/confirm-email', { method: 'POST' }).catch(() => {})
        setTimeout(() => {
          router.push('/verify-phone')
          router.refresh()
        }, 1500)
      }
    })
  }, [searchParams, router])

  async function handleResend() {
    setResending(true)
    setError('')
    setResent(false)

    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend')
      setResent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend')
    } finally {
      setResending(false)
    }
  }

  if (confirmed) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', flexDirection: 'column', fontFamily: F }}>
        <Nav currentPage="signup" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
          <div className="auth-card" style={{
            background: '#ffffff', borderRadius: 16, padding: '40px 36px',
            width: '100%', maxWidth: 420, textAlign: 'center',
            boxShadow: '0 1px 2px rgba(5,14,36,0.06), 0 4px 16px rgba(5,14,36,0.04)',
            border: '1px solid rgba(5,14,36,0.06)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 400, color: NAVY, marginBottom: 8 }}>
              Email verified
            </h1>
            <p style={{ fontSize: '0.9rem', color: BODY, lineHeight: 1.6, fontFamily: F }}>
              Redirecting to phone verification...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', flexDirection: 'column', fontFamily: F }}>
      <Nav currentPage="signup" />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <div className="auth-card" style={{
          background: '#ffffff', borderRadius: 16, padding: '40px 36px',
          width: '100%', maxWidth: 420, textAlign: 'center',
          boxShadow: '0 1px 2px rgba(5,14,36,0.06), 0 4px 16px rgba(5,14,36,0.04)',
          border: '1px solid rgba(5,14,36,0.06)',
        }}>
          {/* Mail icon */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 22px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <h1 style={{ fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 400, color: NAVY, marginBottom: 8, lineHeight: 1.15 }}>
            Check your email
          </h1>
          <p style={{ fontSize: '0.9rem', color: BODY, lineHeight: 1.6, fontFamily: F, marginBottom: 6 }}>
            We sent a verification link to
          </p>
          {email && (
            <p style={{ fontSize: '0.95rem', color: NAVY, fontWeight: 600, fontFamily: F, marginBottom: 24 }}>
              {email}
            </p>
          )}
          <p style={{ fontSize: '0.85rem', color: 'rgba(5,14,36,0.4)', lineHeight: 1.6, fontFamily: F, marginBottom: 28 }}>
            Click the link in the email to verify your account. Check your spam folder if you don&apos;t see it.
          </p>

          {/* Resend */}
          <button
            onClick={handleResend}
            disabled={resending || resent}
            style={{
              width: '100%', padding: 12, borderRadius: 10,
              background: resent ? 'rgba(34,197,94,0.08)' : resending ? '#60A5FA' : BLUE,
              color: resent ? '#22C55E' : 'white',
              border: resent ? '1px solid rgba(34,197,94,0.2)' : 'none',
              fontFamily: F, fontWeight: 600, fontSize: 15,
              cursor: (resending || resent) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {resending ? (
              <>
                <span className="auth-spinner" />
                Sending...
              </>
            ) : resent ? 'Verification email sent!' : 'Resend verification email'}
          </button>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', lineHeight: 1.5, fontFamily: F, marginTop: 12 }}>
              {error}
            </div>
          )}

          <p style={{ fontSize: 12, color: 'rgba(5,14,36,0.35)', marginTop: 20, fontFamily: F }}>
            Wrong email? Sign out and create a new account.
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
