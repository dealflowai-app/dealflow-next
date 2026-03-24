'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const SERIF = "'DM Serif Display', Georgia, serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BODY = 'rgba(5, 14, 36, 0.5)'
const BORDER = '#E5E7EB'

export default function VerifyPhonePage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendCooldown])

  // Auto-redirect after verification
  useEffect(() => {
    if (verified) {
      const t = setTimeout(() => {
        // Full page load so the server layout renders with sidebar
        window.location.href = '/dashboard'
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [verified, router])

  // Check if already verified, not logged in, or missing onboarding
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      // Already verified — skip to dashboard
      if (user.user_metadata?.phone_verified) {
        window.location.href = '/dashboard'
        return
      }
      // Not onboarded yet — go to profile setup first
      if (!user.user_metadata?.onboarded) {
        router.push('/signup?step=2')
        return
      }
      // Auto-send OTP if phone is already known from onboarding
      if (user.user_metadata?.phone) {
        const digits = user.user_metadata.phone.replace(/\D/g, '').replace(/^1/, '')
        if (digits.length === 10) {
          const formatted = formatPhone(digits)
          setPhone(formatted)
          // Auto-send the code so user doesn't have to enter phone again
          setSending(true)
          fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: formatted }),
          })
            .then(res => res.json())
            .then(data => {
              if (data.error) {
                setError(data.error)
              } else {
                setCodeSent(true)
                setResendCooldown(120)
              }
            })
            .catch(() => setError('Failed to send code'))
            .finally(() => setSending(false))
        }
      }
    })
  }, [router])

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  async function handleSendOTP() {
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number.')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')
      setCodeSent(true)
      setResendCooldown(120) // 2 min cooldown
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setSending(false)
    }
  }

  function handleCodeChange(index: number, value: string) {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6)
      const newCode = [...code]
      for (let i = 0; i < 6; i++) {
        newCode[i] = digits[i] || ''
      }
      setCode(newCode)
      setError('')
      const nextFocus = Math.min(digits.length, 5)
      inputRefs.current[nextFocus]?.focus()

      // Auto-submit if all 6 digits entered
      if (digits.length === 6) {
        handleVerify(newCode.join(''))
      }
      return
    }

    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError('')

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all filled
    if (value && newCode.every(d => d)) {
      handleVerify(newCode.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify(otpCode?: string) {
    const codeStr = otpCode || code.join('')
    if (codeStr.length !== 6) {
      setError('Please enter all 6 digits.')
      return
    }

    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeStr }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setVerified(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  if (verified) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', fontFamily: F }}>
        <Nav currentPage="signup" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
          <div className="auth-card" style={{
            background: '#ffffff', borderRadius: 'var(--dash-card-radius, 10px)', padding: '40px 36px',
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
              Phone verified
            </h1>
            <p style={{ fontSize: '0.9rem', color: BODY, lineHeight: 1.6, fontFamily: F }}>
              You&apos;re all set! Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', fontFamily: F }}>
      <Nav currentPage="signup" />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <div className="auth-card" style={{
          background: '#ffffff', borderRadius: 'var(--dash-card-radius, 10px)', padding: '40px 36px',
          width: '100%', maxWidth: 420,
          boxShadow: '0 1px 2px rgba(5,14,36,0.06), 0 4px 16px rgba(5,14,36,0.04)',
          border: '1px solid rgba(5,14,36,0.06)',
        }}>
          {/* Phone icon */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 22px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>

          <h1 style={{ fontFamily: SERIF, fontSize: '1.5rem', fontWeight: 400, color: NAVY, marginBottom: 6, lineHeight: 1.15, textAlign: 'center' }}>
            {codeSent ? 'Enter verification code' : 'Verify your phone'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: BODY, marginBottom: 24, lineHeight: 1.6, fontFamily: F, textAlign: 'center' }}>
            {codeSent
              ? `We sent a 6-digit code to ${formatPhone(phone)}`
              : 'We\'ll send a verification code to confirm your number.'
            }
          </p>

          {!codeSent ? (
            /* Phone number input */
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: NAVY, fontFamily: F, marginBottom: 6 }}>
                Phone number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => { setPhone(formatPhone(e.target.value)); setError('') }}
                placeholder="(555) 000-0000"
                className="auth-input"
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: `1px solid ${error ? '#EF4444' : BORDER}`,
                  background: '#ffffff', fontFamily: F, fontSize: 15, color: NAVY,
                  outline: 'none', boxSizing: 'border-box' as const,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', lineHeight: 1.5, fontFamily: F, marginTop: 12 }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSendOTP}
                disabled={sending}
                className="auth-submit"
                style={{
                  width: '100%', padding: 12, borderRadius: 10, marginTop: 16,
                  background: sending ? '#60A5FA' : BLUE,
                  color: 'white', border: 'none',
                  fontFamily: F, fontWeight: 600, fontSize: 15,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {sending ? (
                  <>
                    <span className="auth-spinner" />
                    Sending code...
                  </>
                ) : 'Send verification code'}
              </button>
            </div>
          ) : (
            /* OTP code input */
            <div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={e => {
                      e.preventDefault()
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                      if (pasted) handleCodeChange(0, pasted)
                    }}
                    className="otp-input"
                    style={{
                      width: 48, height: 56, textAlign: 'center' as const,
                      fontSize: 22, fontWeight: 700, fontFamily: F, color: NAVY,
                      borderRadius: 10,
                      border: `1.5px solid ${error ? '#EF4444' : digit ? BLUE : BORDER}`,
                      outline: 'none',
                      background: digit ? 'rgba(37,99,235,0.03)' : '#ffffff',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  />
                ))}
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', lineHeight: 1.5, fontFamily: F, marginBottom: 16, textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button
                onClick={() => handleVerify()}
                disabled={verifying || code.some(d => !d)}
                className="auth-submit"
                style={{
                  width: '100%', padding: 12, borderRadius: 10,
                  background: verifying ? '#60A5FA' : BLUE,
                  color: 'white', border: 'none',
                  fontFamily: F, fontWeight: 600, fontSize: 15,
                  cursor: verifying ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: code.some(d => !d) && !verifying ? 0.6 : 1,
                }}
              >
                {verifying ? (
                  <>
                    <span className="auth-spinner" />
                    Verifying...
                  </>
                ) : 'Verify phone number'}
              </button>

              {/* Resend */}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                {resendCooldown > 0 ? (
                  <p style={{ fontSize: 13, color: 'rgba(5,14,36,0.4)', fontFamily: F }}>
                    Resend code in {resendCooldown}s
                  </p>
                ) : (
                  <button
                    onClick={handleSendOTP}
                    disabled={sending}
                    style={{ background: 'none', border: 'none', fontSize: 13, color: BLUE, fontWeight: 600, cursor: 'pointer', fontFamily: F }}
                  >
                    Resend code
                  </button>
                )}

                <button
                  onClick={() => { setCodeSent(false); setCode(['', '', '', '', '', '']); setError('') }}
                  style={{ display: 'block', margin: '8px auto 0', background: 'none', border: 'none', fontSize: 12, color: 'rgba(5,14,36,0.4)', cursor: 'pointer', fontFamily: F }}
                >
                  Change phone number
                </button>
              </div>
            </div>
          )}
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
        .otp-input:focus {
          border-color: ${BLUE} !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.08);
        }
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
