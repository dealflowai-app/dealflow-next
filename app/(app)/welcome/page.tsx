'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BODY = 'rgba(5, 14, 36, 0.5)'
const BORDER = 'rgba(5,14,36,0.08)'
const TOTAL_STEPS = 3

const markets = [
  'Phoenix, AZ',
  'Dallas, TX',
  'Atlanta, GA',
  'Houston, TX',
  'Tampa, FL',
  'Orlando, FL',
  'Charlotte, NC',
  'Miami, FL',
  'San Antonio, TX',
  'Las Vegas, NV',
  'Nashville, TN',
  'Jacksonville, FL',
  'Indianapolis, IN',
  'Columbus, OH',
  'Memphis, TN',
  'Denver, CO',
  'Austin, TX',
  'Raleigh, NC',
  'St. Louis, MO',
  'Kansas City, MO',
  'Cleveland, OH',
  'Detroit, MI',
  'Birmingham, AL',
  'Oklahoma City, OK',
  'Richmond, VA',
  'Baltimore, MD',
  'Philadelphia, PA',
  'Chicago, IL',
  'Minneapolis, MN',
  'Sacramento, CA',
  'Tucson, AZ',
  'El Paso, TX',
  'Fort Worth, TX',
  'Cincinnati, OH',
  'Pittsburgh, PA',
  'New Orleans, LA',
  'Louisville, KY',
  'Milwaukee, WI',
  'Knoxville, TN',
  'Savannah, GA',
]

const experienceOptions = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const focusOptions = [
  { value: 'wholesaling', label: 'Wholesaling' },
  { value: 'flipping', label: 'Flipping' },
  { value: 'both', label: 'Both' },
]

export default function WelcomePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [fadeClass, setFadeClass] = useState<'in' | 'out'>('in')
  const [transitioning, setTransitioning] = useState(false)

  // User data
  const [userName, setUserName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [primaryMarket, setPrimaryMarket] = useState('')
  const [experience, setExperience] = useState('')
  const [focus, setFocus] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login')
        return
      }
      const fullName = user.user_metadata?.full_name || ''
      const fn = user.user_metadata?.first_name || fullName.split(' ')[0] || ''
      const ln = user.user_metadata?.last_name || fullName.split(' ').slice(1).join(' ') || ''
      setUserName(fn || 'there')
      setFirstName(fn)
      setLastName(ln)
    })

    fetch('/api/onboarding/profile').then(res => {
      if (res.ok) return res.json()
      return null
    }).then(data => {
      if (data?.profile) {
        if (data.profile.firstName) { setFirstName(data.profile.firstName); setUserName(data.profile.firstName) }
        if (data.profile.lastName) setLastName(data.profile.lastName)
        if (data.profile.company) setCompany(data.profile.company)
        if (data.profile.settings?.targetMarkets?.[0]) setPrimaryMarket(data.profile.settings.targetMarkets[0])
        if (data.profile.settings?.experienceLevel) setExperience(data.profile.settings.experienceLevel)
        if (data.profile.settings?.focus) setFocus(data.profile.settings.focus)
      }
    }).catch((err) => {
      console.warn('Failed to load existing profile:', err)
    })
  }, [router])

  function goToStep(nextStep: number) {
    if (transitioning) return
    setTransitioning(true)
    setFadeClass('out')
    setTimeout(() => {
      setStep(nextStep)
      setFadeClass('in')
      setTimeout(() => setTransitioning(false), 300)
    }, 250)
  }

  async function completeOnboarding(redirectTo: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          company: company || undefined,
          targetMarkets: primaryMarket ? [primaryMarket] : undefined,
          experienceLevel: experience || undefined,
          focus: focus || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      localStorage.setItem('dealflow-start-tour', 'true')
      window.location.href = redirectTo
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      setSaveError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9FAFB',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: F,
      padding: '40px 20px',
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'rgba(5,14,36,0.06)',
        zIndex: 50,
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: BLUE,
          borderRadius: '0 2px 2px 0',
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>

      {/* Step indicators */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        marginBottom: 32,
      }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: F,
              background: i + 1 <= step ? BLUE : '#FFFFFF',
              color: i + 1 <= step ? '#FFFFFF' : 'rgba(5,14,36,0.3)',
              border: i + 1 <= step ? 'none' : '1.5px solid rgba(5,14,36,0.12)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: i + 1 === step ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
            }}>
              {i + 1 < step ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div style={{
                width: 48,
                height: 2,
                background: i + 1 < step ? BLUE : 'rgba(5,14,36,0.08)',
                transition: 'background 0.4s ease',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 600,
        background: '#FFFFFF',
        borderRadius: 'var(--dash-card-radius, 10px)',
        border: `1px solid ${BORDER}`,
        boxShadow: '0 4px 24px rgba(5,14,36,0.04), 0 1px 3px rgba(5,14,36,0.03)',
        padding: '48px 40px',
        opacity: fadeClass === 'in' ? 1 : 0,
        transform: fadeClass === 'in' ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>

            <h1 style={{
              fontSize: 26,
              fontWeight: 700,
              color: NAVY,
              margin: '0 0 8px',
              fontFamily: F,
              letterSpacing: '-0.02em',
            }}>
              Welcome to DealFlow AI{userName && userName !== 'there' ? `, ${userName}` : ''}
            </h1>

            <p style={{
              fontSize: 15,
              color: BODY,
              lineHeight: 1.6,
              margin: '0 0 32px',
              maxWidth: 420,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              Your all-in-one platform for real estate wholesaling.
            </p>

            <div style={{
              textAlign: 'left',
              maxWidth: 360,
              margin: '0 auto 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              {[
                { text: 'Find verified cash buyers in any market' },
                { text: 'Analyze deals with instant comps and ARV' },
                { text: 'Manage outreach, contracts, and closings' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(37,99,235,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span style={{
                    fontSize: 14,
                    color: NAVY,
                    fontFamily: F,
                    fontWeight: 500,
                  }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => goToStep(2)}
              style={{
                ...btnPrimary,
                width: '100%',
                maxWidth: 320,
                margin: '0 auto',
              }}
            >
              Let&apos;s get started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Step 2: Tell us about you */}
        {step === 2 && (
          <div>
            <h2 style={heading}>Tell us about you</h2>
            <p style={subheading}>This helps us personalize your experience.</p>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Company name <span style={{ color: 'rgba(5,14,36,0.3)', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Wholesale LLC"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(5,14,36,0.1)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(5,14,36,0.04)' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Primary market</label>
              <select
                value={primaryMarket}
                onChange={e => setPrimaryMarket(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: 'none' as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230B1224' opacity='0.4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                  cursor: 'pointer',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(5,14,36,0.1)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(5,14,36,0.04)' }}
              >
                <option value="">Select a market</option>
                {markets.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Experience level</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {experienceOptions.map(opt => {
                  const selected = experience === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setExperience(opt.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: `1.5px solid ${selected ? BLUE : 'rgba(5,14,36,0.1)'}`,
                        background: selected ? 'rgba(37,99,235,0.05)' : '#FFFFFF',
                        color: selected ? BLUE : NAVY,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: F,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>What do you mainly do?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {focusOptions.map(opt => {
                  const selected = focus === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setFocus(opt.value)}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: `1.5px solid ${selected ? BLUE : 'rgba(5,14,36,0.1)'}`,
                        background: selected ? 'rgba(37,99,235,0.05)' : '#FFFFFF',
                        color: selected ? BLUE : NAVY,
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: F,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => goToStep(1)} style={btnSecondary}>
                Back
              </button>
              <button onClick={() => goToStep(3)} style={{ ...btnPrimary, flex: 1 }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: You're all set */}
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 4px 12px rgba(34,197,94,0.25)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 style={{
              ...heading,
              textAlign: 'center' as const,
              marginBottom: 8,
            }}>
              You&apos;re all set!
            </h2>

            <p style={{
              ...subheading,
              textAlign: 'center' as const,
              marginBottom: 28,
            }}>
              Your account is ready. We&apos;ve loaded demo data so you can explore right away.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 28,
              textAlign: 'left',
            }}>
              {[
                { title: 'Explore Dashboard', desc: 'See your analytics and activity at a glance', href: '/dashboard' },
                { title: 'Find Buyers', desc: 'Search for cash buyers in your target market', href: '/discovery' },
                { title: 'Create First Deal', desc: 'Analyze a property and get instant comps', href: '/deals/analyze' },
              ].map(action => (
                <button
                  key={action.title}
                  onClick={() => completeOnboarding(action.href)}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    background: '#FFFFFF',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(5,14,36,0.03)',
                    opacity: saving ? 0.6 : 1,
                    textAlign: 'left' as const,
                    width: '100%',
                  }}
                  onMouseEnter={e => {
                    if (!saving) {
                      e.currentTarget.style.borderColor = BLUE
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.1)'
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = BORDER
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(5,14,36,0.03)'
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: NAVY,
                      fontFamily: F,
                      marginBottom: 2,
                    }}>
                      {action.title}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: BODY,
                      fontFamily: F,
                    }}>
                      {action.desc}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 12 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>

            {saveError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#B91C1C',
                fontSize: 13,
                fontFamily: F,
                marginBottom: 12,
                textAlign: 'center',
              }}>
                {saveError}
              </div>
            )}

            <button
              onClick={() => completeOnboarding('/dashboard')}
              disabled={saving}
              style={{
                ...btnPrimary,
                width: '100%',
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Setting up...' : 'Go to Dashboard'}
              {!saving && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Skip link */}
      {step < 3 && (
        <button
          onClick={() => goToStep(3)}
          style={{
            marginTop: 20,
            background: 'none',
            border: 'none',
            color: 'rgba(5,14,36,0.3)',
            fontSize: 13,
            fontFamily: F,
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: 8,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(5,14,36,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(5,14,36,0.3)' }}
        >
          Skip for now
        </button>
      )}
    </div>
  )
}

/* Shared styles */

const heading: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#0B1224',
  margin: '0 0 6px',
  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
  letterSpacing: '-0.01em',
}

const subheading: React.CSSProperties = {
  fontSize: 14,
  color: 'rgba(5, 14, 36, 0.5)',
  lineHeight: 1.6,
  margin: '0 0 28px',
  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: '#0B1224',
  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid rgba(5,14,36,0.1)',
  background: '#ffffff',
  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
  fontSize: 15,
  color: '#0B1224',
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxShadow: '0 1px 2px rgba(5,14,36,0.04)',
}

const btnPrimary: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: 10,
  border: 'none',
  background: '#2563EB',
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
  cursor: 'pointer',
  transition: 'background 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
}

const btnSecondary: React.CSSProperties = {
  padding: '12px 20px',
  borderRadius: 10,
  border: '1px solid rgba(5,14,36,0.1)',
  background: '#FFFFFF',
  color: '#0B1224',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
  cursor: 'pointer',
  transition: 'all 0.2s',
}
