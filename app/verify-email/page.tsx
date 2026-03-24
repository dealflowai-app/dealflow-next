'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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

  // Redirect to next step once confirmed
  const goToNextStep = useCallback(() => {
    if (confirmed) return
    setConfirmed(true)
    fetch('/api/auth/confirm-email', { method: 'POST' }).catch(() => {})
    setTimeout(() => {
      window.location.href = '/signup?step=2'
    }, 1500)
  }, [confirmed])

  useEffect(() => {
    // If user returned from email link, mark as confirmed
    if (searchParams.get('confirmed') === 'true') {
      goToNextStep()
      return
    }

    // Try to get email from URL params first (passed from signup)
    const urlEmail = searchParams.get('email')
    if (urlEmail) {
      setEmail(urlEmail)
    }

    // Also try to get email from authenticated user (e.g. OAuth flow)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email && !urlEmail) setEmail(session.user.email)
      // If user already confirmed via Supabase (e.g. Google OAuth), skip
      if (session?.user?.email_confirmed_at) {
        goToNextStep()
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Listen for auth state changes to detect email verification
  // This catches when the user clicks the verification link in another tab,
  // since Supabase shares session state via localStorage across tabs.
  useEffect(() => {
    if (confirmed) return

    const supabase = createClient()

    // Primary detection: auth state change listener (cross-tab via localStorage)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email_confirmed_at) {
        goToNextStep()
      }
    })

    // Fallback: poll getSession() every 5 seconds (local check, no API call)
    // This handles edge cases where the auth state event doesn't fire
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email_confirmed_at) {
        clearInterval(interval)
        goToNextStep()
      }
    }, 5000)

    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, goToNextStep])

  async function handleResend() {
    if (!email) {
      setError('No email address found. Please sign up again.')
      return
    }

    setResending(true)
    setError('')
    setResent(false)

    try {
      const supabase = createClient()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/verify-email?confirmed=true')}`,
        },
      })

      if (resendError) throw new Error(resendError.message)
      setResent(true)

      // Reset "sent" state after 30 seconds so they can resend again
      setTimeout(() => setResent(false), 30000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email')
    } finally {
      setResending(false)
    }
  }

  if (confirmed) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: F }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginTop: 40, marginBottom: 32 }}>
          <Image src="/Logo.png" alt="DealFlow AI logo" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
          <span style={{ fontFamily: F, fontWeight: 600, fontSize: '1.02rem', color: NAVY, letterSpacing: '-0.01em' }}>
            DealFlow AI
          </span>
        </Link>

        <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{
            background: '#ffffff', borderRadius: 'var(--dash-card-radius, 10px)', padding: '40px 36px',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(5,14,36,0.06), 0 4px 16px rgba(5,14,36,0.04)',
            border: '1px solid rgba(5,14,36,0.06)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'scaleIn 0.5s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: 'checkDraw 0.6s 0.2s ease forwards', strokeDasharray: 24, strokeDashoffset: 24 }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 400, color: NAVY, marginBottom: 8 }}>
              Email verified
            </h1>
            <p style={{ fontSize: '0.9rem', color: BODY, lineHeight: 1.6, fontFamily: F }}>
              Redirecting to profile setup...
            </p>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes checkDraw {
            to { stroke-dashoffset: 0; }
          }
        ` }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: F }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginTop: 40, marginBottom: 32 }}>
        <Image src="/Logo.png" alt="DealFlow AI logo" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <span style={{ fontFamily: F, fontWeight: 600, fontSize: '1.02rem', color: NAVY, letterSpacing: '-0.01em' }}>
          DealFlow AI
        </span>
      </Link>

      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{
          background: '#ffffff', borderRadius: 'var(--dash-card-radius, 10px)', padding: '40px 36px',
          textAlign: 'center',
          boxShadow: '0 1px 2px rgba(5,14,36,0.06), 0 4px 16px rgba(5,14,36,0.04)',
          border: '1px solid rgba(5,14,36,0.06)',
        }}>
          {/* Mail icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'scaleIn 0.4s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <h1 style={{ fontFamily: SERIF, fontSize: '1.65rem', fontWeight: 400, color: NAVY, marginBottom: 10, lineHeight: 1.15 }}>
            Check your email
          </h1>
          <p style={{ fontSize: '0.9rem', color: BODY, lineHeight: 1.6, fontFamily: F, marginBottom: 4 }}>
            We&apos;ve sent a verification link to
          </p>
          {email && (
            <p style={{ fontSize: '0.95rem', color: NAVY, fontWeight: 600, fontFamily: F, marginBottom: 20 }}>
              {email}
            </p>
          )}
          {!email && (
            <p style={{ fontSize: '0.95rem', color: NAVY, fontWeight: 600, fontFamily: F, marginBottom: 20 }}>
              your email address
            </p>
          )}
          <p style={{ fontSize: '0.85rem', color: 'rgba(5,14,36,0.4)', lineHeight: 1.7, fontFamily: F, marginBottom: 28 }}>
            Click the link in the email to verify your account.
            <br />
            Check your spam folder if you don&apos;t see it.
          </p>

          {/* Resend button */}
          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="auth-submit"
            style={{
              width: '100%', padding: '10px 20px', borderRadius: 10,
              background: resent ? 'rgba(34,197,94,0.06)' : resending ? '#60A5FA' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: resent ? '#22C55E' : 'white',
              border: resent ? '1px solid rgba(34,197,94,0.15)' : 'none',
              fontFamily: F, fontWeight: 600, fontSize: 15,
              cursor: (resending || resent) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: (resending || resent) ? 'none' : '0 2px 8px rgba(37,99,235,0.25), 0 1px 2px rgba(37,99,235,0.15)',
              letterSpacing: '-0.01em',
            }}
          >
            {resending ? (
              <>
                <span className="auth-spinner" />
                Sending...
              </>
            ) : resent ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verification email sent!
              </>
            ) : (
              <>
                Didn&apos;t receive it? Resend email
              </>
            )}
          </button>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', lineHeight: 1.5, fontFamily: F, marginTop: 12 }}>
              {error}
            </div>
          )}

          {/* Back to sign in link */}
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(5,14,36,0.4)', marginTop: 24, marginBottom: 0, fontFamily: F }}>
            <Link href="/login" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
        .auth-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37,99,235,0.3), 0 2px 4px rgba(37,99,235,0.15) !important;
        }
        .auth-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        @media (max-width: 480px) {
          .auth-card-wrap { padding: 0 16px !important; }
        }
      ` }} />
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #E5E7EB', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
