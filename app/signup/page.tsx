'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import GoogleOAuthButton from '@/components/GoogleOAuthButton'
import { createClient } from '@/lib/supabase/client'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const SERIF = "'DM Serif Display', Georgia, serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BODY = 'rgba(5, 14, 36, 0.5)'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
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
  'Atlanta, GA',
  'Phoenix, AZ',
  'Tampa, FL',
  'Charlotte, NC',
  'Dallas, TX',
  'Orlando, FL',
  'Houston, TX',
  'Miami, FL',
  'Other',
]

const experienceLevels = [
  { value: 'new', label: 'New', sub: 'Just getting started' },
  { value: 'active', label: 'Active', sub: 'Closing deals regularly' },
  { value: 'experienced', label: 'Experienced', sub: '10+ deals closed' },
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

  const checks = [
    { met: password.length >= 8, text: '8+ characters' },
    { met: /[A-Z]/.test(password), text: 'Uppercase letter' },
    { met: /[a-z]/.test(password), text: 'Lowercase letter' },
    { met: /[0-9]/.test(password), text: 'Number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'Special character (!@#$...)' },
  ]

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= score ? color : 'rgba(5,14,36,0.08)',
              transition: 'background 0.25s ease',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 12, color, marginTop: 6, marginBottom: 0, fontFamily: F, fontWeight: 500, transition: 'color 0.25s' }}>
        {label}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
        {checks.map(c => (
          <span key={c.text} style={{
            fontSize: 11,
            fontFamily: F,
            color: c.met ? '#22C55E' : 'rgba(5,14,36,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'color 0.2s',
          }}>
            {c.met ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
            {c.text}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────── */

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="auth-spinner" style={{ width: 24, height: 24 }} />
      </div>
    }>
      <SignUpFlow />
    </Suspense>
  )
}

function SignUpFlow() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [direction] = useState<'forward' | 'backward'>('forward')
  const [animating] = useState(false)

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
  const [phone, setPhone] = useState('')
  const [primaryMarket, setPrimaryMarket] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')

  const [phoneError, setPhoneError] = useState('')

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
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          // Pre-fill name from Google metadata
          const fullName = user.user_metadata?.full_name || ''
          if (fullName) {
            const parts = fullName.split(' ')
            setFirstName(parts[0] || '')
            setLastName(parts.slice(1).join(' ') || '')
          }
          setStep(2)
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
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/signup?step=2')}`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Supabase returns a user with empty identities when the email is already taken
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('An account with this email already exists.')
      setLoading(false)
      return
    }

    setLoading(false)
    // Email confirmation is required — no session until confirmed
    // Go directly to verify-email; profile setup happens after verification
    router.push('/verify-email')
  }

  /* ── Step 2: Submit ─────────────────────────────────── */

  function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setPhoneError('')

    // Validate phone is required
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          primaryMarket: primaryMarket || null,
          experienceLevel: experienceLevel || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      setLoading(false)
      // Profile saved — go to phone verification
      router.push('/verify-phone')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const isAlreadyRegistered = error.toLowerCase().includes('already registered') || error.toLowerCase().includes('already exists')

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: F }}>
      {/* Logo — links back to landing page */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginTop: 40, marginBottom: 32 }}>
        <Image src="/Logo.png" alt="DealFlow AI logo" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <span style={{ fontFamily: F, fontWeight: 600, fontSize: '1.02rem', color: NAVY, letterSpacing: '-0.01em' }}>
          DealFlow AI
        </span>
      </Link>

      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Minimal step progress */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: s <= step ? BLUE : 'rgba(5,14,36,0.08)',
                  transition: 'background 0.4s ease',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {['Create account', 'Set up profile', 'Get started'].map((label, i) => (
                <span key={label} style={{
                  fontSize: 11,
                  fontWeight: i + 1 <= step ? 600 : 400,
                  color: i + 1 <= step ? NAVY : 'rgba(5,14,36,0.3)',
                  fontFamily: F,
                  transition: 'color 0.3s',
                  letterSpacing: '0.01em',
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Step content with transitions */}
          <div style={{ position: 'relative' }}>
            {/* ── STEP 1 ──────────────────────────────── */}
            <div
              className={`step-panel ${step === 1 ? 'step-active' : animating ? (direction === 'forward' ? 'step-exit-left' : 'step-exit-right') : 'step-hidden'}`}
              style={{ display: step === 1 || animating ? undefined : 'none' }}
            >
              <h1 style={{ fontFamily: SERIF, fontSize: '1.75rem', fontWeight: 400, color: NAVY, letterSpacing: '-0.022em', marginBottom: 6, lineHeight: 1.15, textAlign: 'center' }}>
                Create your account
              </h1>
              <p style={{ fontSize: '0.9rem', color: BODY, marginBottom: 20, lineHeight: 1.6, fontFamily: F, textAlign: 'center' }}>
                Start finding buyers and closing deals today.
              </p>

              {/* Google OAuth */}
              <div style={{
                borderRadius: 10,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}>
                <GoogleOAuthButton mode="signup" />
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '16px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(5,14,36,0.08)' }} />
                <span style={{ fontSize: 12, color: 'rgba(5,14,36,0.35)', fontFamily: F, fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(5,14,36,0.08)' }} />
              </div>

              <form onSubmit={showPasswordFields ? handleSignUp : (e) => {
                e.preventDefault()
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  setEmailError('Please enter a valid email address.')
                  return
                }
                setShowPasswordFields(true)
              }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Email */}
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
                    style={{
                      ...inputStyle,
                      borderColor: emailError ? '#EF4444' : undefined,
                    }}
                  />
                  {emailError && (
                    <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4, marginBottom: 0, fontFamily: F }}>{emailError}</p>
                  )}
                </div>

                {/* Password fields - revealed after email */}
                <div className={`password-reveal ${showPasswordFields ? 'password-reveal-show' : ''}`}>
                  {/* Password */}
                  <div style={{ marginBottom: 16 }}>
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
                      <button
                        type="button"
                        onClick={() => setShowPass(s => !s)}
                        tabIndex={showPasswordFields ? 0 : -1}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(5,14,36,0.3)', padding: 0, display: 'flex' }}
                      >
                        <EyeIcon open={showPass} />
                      </button>
                    </div>
                    <PasswordStrengthMeter password={password} />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label style={labelStyle}>Confirm password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        required={showPasswordFields}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setConfirmError('') }}
                        onBlur={() => {
                          if (confirmPassword && password !== confirmPassword) {
                            setConfirmError('Passwords do not match.')
                          }
                        }}
                        placeholder="Confirm your password"
                        className="auth-input"
                        style={{
                          ...inputWithToggle,
                          borderColor: confirmError ? '#EF4444' : undefined,
                        }}
                        autoComplete="new-password"
                        tabIndex={showPasswordFields ? 0 : -1}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(s => !s)}
                        tabIndex={showPasswordFields ? 0 : -1}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(5,14,36,0.3)', padding: 0, display: 'flex' }}
                      >
                        <EyeIcon open={showConfirm} />
                      </button>
                    </div>
                    {confirmError && (
                      <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4, marginBottom: 0, fontFamily: F }}>{confirmError}</p>
                    )}
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
                    width: '100%',
                    padding: '10px 20px',
                    borderRadius: 10,
                    background: loading ? '#60A5FA' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: 'white',
                    border: 'none',
                    fontFamily: F,
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: loading ? 'none' : '0 2px 8px rgba(37,99,235,0.25), 0 1px 2px rgba(37,99,235,0.15)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="auth-spinner" />
                      Creating account...
                    </>
                  ) : showPasswordFields ? 'Create account' : 'Continue'}
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

            {/* ── STEP 2 ──────────────────────────────── */}
            <div
              className={`step-panel ${step === 2 ? 'step-active' : animating ? (direction === 'forward' ? 'step-enter-right' : 'step-enter-left') : 'step-hidden'}`}
              style={{ display: step === 2 || animating ? undefined : 'none' }}
            >
              <h1 style={{ fontFamily: SERIF, fontSize: '1.75rem', fontWeight: 400, color: NAVY, letterSpacing: '-0.022em', marginBottom: 6, lineHeight: 1.15 }}>
                Set up your profile
              </h1>
              <p style={{ fontSize: '0.9rem', color: BODY, marginBottom: 20, lineHeight: 1.6, fontFamily: F }}>
                Tell us a bit about yourself to get started.
              </p>

              <form onSubmit={handleProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Name row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>First name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="auth-input"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Smith"
                      className="auth-input"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label style={labelStyle}>Phone number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => { setPhone(formatPhone(e.target.value)); setPhoneError('') }}
                    onBlur={() => {
                      const digits = phone.replace(/\D/g, '')
                      if (phone && digits.length < 10) {
                        setPhoneError('Please enter a valid 10-digit phone number.')
                      }
                    }}
                    placeholder="(555) 000-0000"
                    className="auth-input"
                    style={{
                      ...inputStyle,
                      borderColor: phoneError ? '#EF4444' : undefined,
                    }}
                  />
                  {phoneError ? (
                    <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4, marginBottom: 0, fontFamily: F }}>{phoneError}</p>
                  ) : (
                    <p style={{ fontSize: 11, color: 'rgba(5,14,36,0.35)', marginTop: 4, marginBottom: 0, fontFamily: F }}>
                      We&apos;ll send a verification code to this number
                    </p>
                  )}
                </div>

                {/* Primary market */}
                <div>
                  <label style={labelStyle}>Primary market</label>
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
                    {markets.map(m => (
                      <option key={m} value={m} style={{ color: NAVY }}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Experience level */}
                <div>
                  <label style={labelStyle}>Experience level</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {experienceLevels.map(lvl => {
                      const selected = experienceLevel === lvl.value
                      return (
                        <button
                          key={lvl.value}
                          type="button"
                          onClick={() => setExperienceLevel(lvl.value)}
                          className="exp-btn"
                          style={{
                            padding: '12px 8px',
                            borderRadius: 10,
                            border: selected ? `2px solid ${BLUE}` : '1px solid rgba(5,14,36,0.1)',
                            background: selected ? 'rgba(37,99,235,0.04)' : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                            boxShadow: selected ? '0 2px 8px rgba(37,99,235,0.1)' : '0 1px 2px rgba(5,14,36,0.04)',
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 600, color: selected ? BLUE : NAVY, fontFamily: F, marginBottom: 2 }}>
                            {lvl.label}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(5,14,36,0.4)', fontFamily: F }}>
                            {lvl.sub}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444', lineHeight: 1.5, fontFamily: F }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit"
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    borderRadius: 10,
                    background: loading ? '#60A5FA' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: 'white',
                    border: 'none',
                    fontFamily: F,
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: loading ? 'none' : '0 2px 8px rgba(37,99,235,0.25), 0 1px 2px rgba(37,99,235,0.15)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {loading ? (
                    <>
                      <span className="auth-spinner" />
                      Setting up...
                    </>
                  ) : 'Continue'}
                </button>
              </form>
            </div>

            {/* ── STEP 3 ──────────────────────────────── */}
            <div
              className={`step-panel ${step === 3 ? 'step-active' : 'step-hidden'}`}
              style={{ display: step === 3 ? undefined : 'none', textAlign: 'center', padding: '20px 0' }}
            >
              {/* Animated checkmark */}
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
                animation: 'scaleIn 0.5s cubic-bezier(0.16,1,0.3,1)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'checkDraw 0.6s 0.2s ease forwards', strokeDasharray: 24, strokeDashoffset: 24 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h1 style={{ fontFamily: SERIF, fontSize: '1.8rem', fontWeight: 400, color: NAVY, letterSpacing: '-0.022em', marginBottom: 8, lineHeight: 1.15 }}>
                Almost there!
              </h1>
              <p style={{ fontSize: '0.9rem', color: BODY, marginBottom: 20, lineHeight: 1.6, fontFamily: F }}>
                Just a couple more steps. We need to verify your email and phone number.
              </p>

              <button
                onClick={() => { router.push('/verify-email'); router.refresh() }}
                className="auth-submit"
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  color: 'white',
                  border: 'none',
                  fontFamily: F,
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.25), 0 1px 2px rgba(37,99,235,0.15)',
                  letterSpacing: '-0.01em',
                }}
              >
                Verify my account
              </button>
            </div>
          </div>
        </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Input focus */
        .auth-input:focus {
          border-color: ${BLUE} !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.06), 0 1px 2px rgba(5,14,36,0.04) !important;
        }
        .auth-input::placeholder {
          color: rgba(5,14,36,0.3);
          font-family: ${F};
        }

        /* Button hover */
        .auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37,99,235,0.3), 0 2px 4px rgba(37,99,235,0.15) !important;
        }
        .auth-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        /* Experience buttons */
        .exp-btn:hover {
          border-color: rgba(5,14,36,0.15) !important;
          box-shadow: 0 1px 4px rgba(5,14,36,0.06);
        }

        /* Spinner */
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

        /* Password reveal */
        .password-reveal {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease;
        }
        .password-reveal-show {
          max-height: 340px;
          opacity: 1;
        }

        /* Step transitions */
        .step-panel {
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .step-active {
          opacity: 1;
          transform: translateX(0);
        }
        .step-hidden {
          opacity: 0;
          pointer-events: none;
        }
        .step-exit-left {
          opacity: 0;
          transform: translateX(-30px);
        }
        .step-exit-right {
          opacity: 0;
          transform: translateX(30px);
        }
        .step-enter-right {
          opacity: 0;
          transform: translateX(30px);
        }
        .step-enter-left {
          opacity: 0;
          transform: translateX(-30px);
        }

        /* Success animations */
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }

        @media (max-width: 480px) {
          .auth-card-wrap {
            padding: 0 16px !important;
          }
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
