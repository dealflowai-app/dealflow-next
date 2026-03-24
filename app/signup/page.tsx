'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import GoogleOAuthButton from '@/components/GoogleOAuthButton'
import { createClient } from '@/lib/supabase/client'
import { Target, TrendingUp, Search, Zap } from 'lucide-react'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const SERIF = "'DM Serif Display', Georgia, serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BODY = 'rgba(5, 14, 36, 0.5)'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid rgba(5,14,36,0.1)',
  background: '#ffffff',
  fontFamily: F,
  fontSize: 15,
  color: NAVY,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxShadow: '0 1px 2px rgba(5,14,36,0.04)',
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

const markets = [
  'Atlanta, GA', 'Phoenix, AZ', 'Tampa, FL', 'Charlotte, NC',
  'Dallas, TX', 'Orlando, FL', 'Houston, TX', 'Miami, FL',
  'San Antonio, TX', 'Las Vegas, NV', 'Denver, CO', 'Nashville, TN',
  'Jacksonville, FL', 'Memphis, TN', 'Indianapolis, IN', 'Other',
]

const goals = [
  { value: 'first_deal', icon: <Target className="w-[18px] h-[18px]" style={{ color: '#2563EB' }} />, label: 'Close my first deal', desc: 'New to wholesaling' },
  { value: 'scale', icon: <TrendingUp className="w-[18px] h-[18px]" style={{ color: '#2563EB' }} />, label: 'Scale my business', desc: 'Already closing deals' },
  { value: 'find_buyers', icon: <Search className="w-[18px] h-[18px]" style={{ color: '#2563EB' }} />, label: 'Find cash buyers', desc: 'Need more buyers' },
  { value: 'automate', icon: <Zap className="w-[18px] h-[18px]" style={{ color: '#2563EB' }} />, label: 'Automate outreach', desc: 'Save time on calls' },
]

/* ── Password strength ──────────────────────────────── */

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[a-z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++

  if (s <= 1) return { score: 1, label: 'Weak', color: '#EF4444' }
  if (s === 2) return { score: 2, label: 'Fair', color: '#F59E0B' }
  if (s === 3) return { score: 3, label: 'Good', color: '#84CC16' }
  return { score: 4, label: 'Strong', color: '#22C55E' }
}

function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null
  const { score, label, color } = getPasswordStrength(password)

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? color : 'rgba(5,14,36,0.08)',
            transition: 'background 0.25s ease',
          }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color, marginTop: 5, marginBottom: 0, fontFamily: F, fontWeight: 500 }}>{label}</p>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────── */

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="auth-spinner" style={{ width: 24, height: 24 }} />
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } } .auth-spinner { border: 2px solid rgba(5,14,36,0.1); border-top-color: #2563EB; border-radius: 50%; animation: spin 0.7s linear infinite; }' }} />
      </div>
    }>
      <SignUpFlow />
    </Suspense>
  )
}

function SignUpFlow() {
  const searchParams = useSearchParams()

  const [step, setStep] = useState(1)

  // Step 1
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [showPasswordFields, setShowPasswordFields] = useState(false)

  // Step 2
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [primaryMarket, setPrimaryMarket] = useState('')
  const [goal, setGoal] = useState('')

  // Shared
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check for OAuth return (step=2 in URL)
  useEffect(() => {
    const urlStep = searchParams.get('step')
    const urlError = searchParams.get('error')

    if (urlError === 'auth_failed') {
      setError('Google sign-in failed. Please try again.')
    }

    if (urlStep === '2') {
      const supabase = createClient()
      // Try getSession first (local, faster), fall back to getUser
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        let user = session?.user
        if (!user) {
          const { data } = await supabase.auth.getUser()
          user = data.user ?? undefined
        }
        if (user) {
          const fullName = user.user_metadata?.full_name || ''
          if (fullName) {
            const parts = fullName.split(' ')
            setFirstName(parts[0] || '')
            setLastName(parts.slice(1).join(' ') || '')
          }
          setStep(2)
        } else {
          // No session — user needs to sign in first
          setError('Please sign in or create an account first.')
        }
      })
    }
  }, [searchParams])

  /* ── Step 1: Submit ─────────────────────────────────── */

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEmailError('')
    setConfirmError('')

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/verify-email?confirmed=true')}`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('An account with this email already exists.')
      setLoading(false)
      return
    }

    // If email is already confirmed (auto-confirm enabled or re-signup), skip verify-email
    if (data.session && data.user?.email_confirmed_at) {
      window.location.href = '/signup?step=2'
      return
    }

    setLoading(false)
    window.location.href = `/verify-email?email=${encodeURIComponent(email)}`
  }

  /* ── Step 2: Submit ─────────────────────────────────── */

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!firstName.trim()) {
      setError('Please enter your first name.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim() || undefined,
          targetMarkets: primaryMarket ? [primaryMarket] : undefined,
          focus: goal || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      // Trigger product tour on first visit, then go to dashboard
      localStorage.setItem('dealflow-start-tour', 'true')
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const isAlreadyRegistered = error.toLowerCase().includes('already registered') || error.toLowerCase().includes('already exists')

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: F }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginTop: 40, marginBottom: 16 }}>
        <Image src="/Logo.png" alt="DealFlow AI logo" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <span style={{ fontFamily: F, fontWeight: 600, fontSize: '1.02rem', color: NAVY, letterSpacing: '-0.01em' }}>
          DealFlow AI
        </span>
      </Link>

      <div style={{ width: '100%', maxWidth: 440, padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Step indicator */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {[
              { num: 1, label: 'Account' },
              { num: 2, label: 'Profile' },
            ].map((s, i) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 1 : undefined }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, fontFamily: F,
                  background: s.num < step ? '#22C55E' : s.num === step ? BLUE : 'rgba(5,14,36,0.06)',
                  color: s.num <= step ? 'white' : 'rgba(5,14,36,0.3)',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                }}>
                  {s.num < step ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : s.num}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: s.num === step ? 600 : 400,
                  color: s.num <= step ? NAVY : 'rgba(5,14,36,0.3)',
                  fontFamily: F, marginLeft: 8, whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
                {i < 1 && (
                  <div style={{
                    flex: 1, height: 1, marginLeft: 16, marginRight: 16,
                    background: step > 1 ? '#22C55E' : 'rgba(5,14,36,0.08)',
                    transition: 'background 0.3s ease',
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP 1: Create Account ──────────────────── */}
        {step === 1 && (
          <div className="step-fade-in">
            <div style={{
              background: '#ffffff', borderRadius: 'var(--dash-card-radius, 10px)', padding: '32px 28px',
              boxShadow: 'var(--shadow, 0 4px 16px rgba(0,0,0,0.07))',
              border: '1px solid rgba(5,14,36,0.06)',
            }}>
              <h1 style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 400, color: NAVY, letterSpacing: '-0.02em', marginBottom: 6, lineHeight: 1.15 }}>
                Create your account
              </h1>
              <p style={{ fontSize: '0.88rem', color: BODY, marginBottom: 22, lineHeight: 1.6, fontFamily: F }}>
                Start finding buyers and closing deals.
              </p>

              <GoogleOAuthButton mode="signup" />

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(5,14,36,0.06)' }} />
                <span style={{ fontSize: 12, color: 'rgba(5,14,36,0.3)', fontFamily: F, fontWeight: 500 }}>or continue with email</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(5,14,36,0.06)' }} />
              </div>

              <form onSubmit={showPasswordFields ? handleSignUp : (e) => {
                e.preventDefault()
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  setEmailError('Please enter a valid email address.')
                  return
                }
                setShowPasswordFields(true)
              }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(''); setError('') }}
                    onBlur={() => {
                      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        setEmailError('Please enter a valid email address.')
                      }
                    }}
                    placeholder="you@example.com"
                    className="auth-input"
                    style={{ ...inputStyle, borderColor: emailError ? '#EF4444' : undefined }}
                  />
                  {emailError && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4, marginBottom: 0, fontFamily: F }}>{emailError}</p>}
                </div>

                <div className={`password-reveal ${showPasswordFields ? 'password-reveal-show' : ''}`}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        required={showPasswordFields}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        placeholder="Create a password"
                        className="auth-input"
                        style={inputWithToggle}
                        autoComplete="new-password"
                        autoFocus={showPasswordFields}
                      />
                      <button type="button" onClick={() => setShowPass(s => !s)} tabIndex={showPasswordFields ? 0 : -1}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(5,14,36,0.3)', padding: 0, display: 'flex' }}>
                        <EyeIcon open={showPass} />
                      </button>
                    </div>
                    <PasswordStrengthMeter password={password} />
                  </div>

                  <div>
                    <label style={labelStyle}>Confirm password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        required={showPasswordFields}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setConfirmError('') }}
                        onBlur={() => {
                          if (confirmPassword && password !== confirmPassword) setConfirmError('Passwords do not match.')
                        }}
                        placeholder="Confirm your password"
                        className="auth-input"
                        style={{ ...inputWithToggle, borderColor: confirmError ? '#EF4444' : undefined }}
                        autoComplete="new-password"
                        tabIndex={showPasswordFields ? 0 : -1}
                      />
                      <button type="button" onClick={() => setShowConfirm(s => !s)} tabIndex={showPasswordFields ? 0 : -1}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(5,14,36,0.3)', padding: 0, display: 'flex' }}>
                        <EyeIcon open={showConfirm} />
                      </button>
                    </div>
                    {confirmError && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4, marginBottom: 0, fontFamily: F }}>{confirmError}</p>}
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', lineHeight: 1.5, fontFamily: F }}>
                    {error}
                    {isAlreadyRegistered && <>{' '}<Link href="/login" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Sign in instead?</Link></>}
                  </div>
                )}

                <button type="submit" disabled={loading} className="auth-submit" style={{
                  width: '100%', padding: '11px 20px', borderRadius: 10,
                  background: loading ? '#60A5FA' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: 'white', border: 'none', fontFamily: F, fontWeight: 600, fontSize: 15,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 2px 8px rgba(37,99,235,0.25), 0 1px 2px rgba(37,99,235,0.15)',
                }}>
                  {loading ? <><span className="auth-spinner" />Creating account...</> : showPasswordFields ? 'Create account' : 'Continue with email'}
                </button>
              </form>
            </div>

            <p style={{ textAlign: 'center', fontSize: 11.5, color: 'rgba(5,14,36,0.35)', marginTop: 16, lineHeight: 1.6, fontFamily: F }}>
              By creating an account, you agree to our{' '}
              <Link href="/terms" style={{ color: 'rgba(5,14,36,0.5)', textDecoration: 'underline' }}>Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: 'rgba(5,14,36,0.5)', textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(5,14,36,0.4)', marginTop: 12, fontFamily: F }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: BLUE, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>
        )}

        {/* ── STEP 2: Profile Setup ───────────────────── */}
        {step === 2 && (
          <div className="step-fade-in">
            <div style={{
              background: '#ffffff', borderRadius: 'var(--dash-card-radius, 10px)', padding: '32px 28px',
              boxShadow: 'var(--shadow, 0 4px 16px rgba(0,0,0,0.07))',
              border: '1px solid rgba(5,14,36,0.06)',
            }}>
              <h1 style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 400, color: NAVY, letterSpacing: '-0.02em', marginBottom: 6, lineHeight: 1.15 }}>
                Tell us about you
              </h1>
              <p style={{ fontSize: '0.88rem', color: BODY, marginBottom: 24, lineHeight: 1.6, fontFamily: F }}>
                We&apos;ll personalize your experience based on your answers.
              </p>

              <form onSubmit={handleProfile} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Name row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>First name <span style={{ color: '#EF4444' }}>*</span></label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="auth-input"
                      style={inputStyle}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="auth-input"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Primary market */}
                <div>
                  <label style={labelStyle}>What market do you wholesale in?</label>
                  <select
                    value={primaryMarket}
                    onChange={e => setPrimaryMarket(e.target.value)}
                    className="auth-input"
                    style={{
                      ...inputStyle,
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230B1224' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 14px center',
                      paddingRight: 36,
                      color: primaryMarket ? NAVY : 'rgba(5,14,36,0.35)',
                    }}
                  >
                    <option value="" disabled>Select your market...</option>
                    {markets.map(m => <option key={m} value={m} style={{ color: NAVY }}>{m}</option>)}
                  </select>
                </div>

                {/* Goal */}
                <div>
                  <label style={labelStyle}>What&apos;s your main goal?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {goals.map(g => {
                      const selected = goal === g.value
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setGoal(g.value)}
                          className="goal-btn"
                          style={{
                            padding: '14px 12px',
                            borderRadius: 12,
                            border: selected ? `2px solid ${BLUE}` : '1px solid rgba(5,14,36,0.08)',
                            background: selected ? 'rgba(37,99,235,0.03)' : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            boxShadow: selected ? '0 0 0 1px rgba(37,99,235,0.1), 0 2px 8px rgba(37,99,235,0.08)' : '0 1px 2px rgba(5,14,36,0.03)',
                          }}
                        >
                          <div style={{ marginBottom: 6 }}>{g.icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: selected ? BLUE : NAVY, fontFamily: F, marginBottom: 2, lineHeight: 1.3 }}>
                            {g.label}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(5,14,36,0.4)', fontFamily: F }}>
                            {g.desc}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', lineHeight: 1.5, fontFamily: F }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="auth-submit" style={{
                  width: '100%', padding: '11px 20px', borderRadius: 10,
                  background: loading ? '#60A5FA' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: 'white', border: 'none', fontFamily: F, fontWeight: 600, fontSize: 15,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 2px 8px rgba(37,99,235,0.25), 0 1px 2px rgba(37,99,235,0.15)',
                }}>
                  {loading ? (
                    <>
                      <span className="auth-spinner" />
                      Setting up your account...
                    </>
                  ) : (
                    <>
                      Get started
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGoal('')
                    setPrimaryMarket('')
                    handleProfile(new Event('submit') as unknown as React.FormEvent)
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: 'rgba(5,14,36,0.35)', fontFamily: F,
                    textAlign: 'center', padding: '4px 0',
                    transition: 'color 0.15s',
                  }}
                  className="skip-btn"
                >
                  Skip for now
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .auth-input:focus {
          border-color: ${BLUE} !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.06), 0 1px 2px rgba(5,14,36,0.04) !important;
        }
        .auth-input::placeholder { color: rgba(5,14,36,0.3); font-family: ${F}; }
        .auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37,99,235,0.3), 0 2px 4px rgba(37,99,235,0.15) !important;
        }
        .auth-submit:active:not(:disabled) { transform: translateY(0); }
        .goal-btn:hover { border-color: rgba(5,14,36,0.15) !important; box-shadow: 0 2px 6px rgba(5,14,36,0.06) !important; }
        .skip-btn:hover { color: rgba(5,14,36,0.6) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .auth-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .password-reveal {
          max-height: 0; opacity: 0; overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease;
        }
        .password-reveal-show { max-height: 340px; opacity: 1; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .step-fade-in { animation: fadeSlideIn 0.4s cubic-bezier(0.16,1,0.3,1); }
        @media (max-width: 480px) {
          .goal-btn { padding: 12px 10px !important; }
        }
      ` }} />
    </div>
  )
}

/* ── Shared components ────────────────────────────────── */

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
