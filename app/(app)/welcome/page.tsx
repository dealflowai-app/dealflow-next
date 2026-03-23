'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const F = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BODY = 'rgba(5, 14, 36, 0.5)'
const BORDER = 'rgba(5,14,36,0.08)'
const TOTAL_STEPS = 5

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
]

const experienceLevels = [
  { value: 'beginner', label: 'Just starting out', sub: 'Learning the ropes', icon: '\u{1F331}' },
  { value: '1-2years', label: '1\u20132 years', sub: 'Gaining momentum', icon: '\u{1F4C8}' },
  { value: '3-5years', label: '3\u20135 years', sub: 'Consistently closing', icon: '\u{1F3AF}' },
  { value: '5+years', label: '5+ years', sub: 'Seasoned pro', icon: '\u{1F3C6}' },
]

const quickActions = [
  {
    title: 'Find Buyers',
    desc: 'Search for cash buyers in your target markets',
    href: '/discovery',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    title: 'Analyze a Deal',
    desc: 'Get comps, ARV, and a deal score instantly',
    href: '/analyzer',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: 'Explore Marketplace',
    desc: 'Browse deals posted by other wholesalers',
    href: '/marketplace',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    title: 'Join Community',
    desc: 'Connect with wholesalers in the feed',
    href: '/community',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

export default function WelcomePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [transitioning, setTransitioning] = useState(false)
  const [fadeClass, setFadeClass] = useState<'in' | 'out'>('in')

  // User data
  const [userName, setUserName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const [experience, setExperience] = useState('')
  const [saving, setSaving] = useState(false)

  // Pre-fill from existing profile data
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
      setPhone(user.user_metadata?.phone || user.phone || '')
    })

    // Also try to pre-fill from the onboarding API (which returns the profile)
    fetch('/api/onboarding/profile').then(res => {
      if (res.ok) return res.json()
      return null
    }).then(data => {
      if (data?.profile) {
        if (data.profile.firstName) { setFirstName(data.profile.firstName); setUserName(data.profile.firstName) }
        if (data.profile.lastName) setLastName(data.profile.lastName)
        if (data.profile.company) setCompany(data.profile.company)
        if (data.profile.phone) setPhone(data.profile.phone)
        if (data.profile.settings?.targetMarkets) {
          setSelectedMarkets(data.profile.settings.targetMarkets)
        }
        if (data.profile.settings?.experienceLevel) {
          setExperience(data.profile.settings.experienceLevel)
        }
      }
    }).catch(() => {})
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

  function toggleMarket(market: string) {
    setSelectedMarkets(prev =>
      prev.includes(market) ? prev.filter(m => m !== market) : [...prev, market]
    )
  }

  async function completeOnboarding(redirectTo?: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          company: company || undefined,
          phone: phone || undefined,
          targetMarkets: selectedMarkets.length > 0 ? selectedMarkets : undefined,
          experienceLevel: experience || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      // Start the product tour after navigating to dashboard
      const startTour = !redirectTo || redirectTo === '/dashboard'
      if (startTour) localStorage.setItem('dealflow-start-tour', 'true')
      router.replace(redirectTo || '/dashboard')
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      setSaving(false)
    }
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF9F6',
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

      {/* Step dots */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 32,
      }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            style={{
              width: step === i + 1 ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i + 1 <= step ? BLUE : 'rgba(5,14,36,0.1)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 600,
        background: '#FFFFFF',
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 4px 24px rgba(5,14,36,0.04), 0 1px 3px rgba(5,14,36,0.03)',
        padding: step === 5 ? '48px 40px' : '40px 40px',
        opacity: fadeClass === 'in' ? 1 : 0,
        transform: fadeClass === 'in' ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}>

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>

            <h1 style={{
              fontSize: 28,
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
              The all-in-one platform for real estate wholesalers. Find cash buyers,
              analyze deals, manage outreach, and close faster -all in one place.
            </p>

            <p style={{
              fontSize: 13,
              color: 'rgba(5,14,36,0.35)',
              margin: '0 0 28px',
            }}>
              Let&apos;s get your account set up in under 2 minutes.
            </p>

            <button
              onClick={() => goToStep(2)}
              style={{
                ...btnPrimary,
                width: '100%',
                maxWidth: 320,
                margin: '0 auto',
              }}
            >
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Step 2: Profile Setup ── */}
        {step === 2 && (
          <div>
            <h2 style={heading}>Set up your profile</h2>
            <p style={subheading}>Tell us a bit about yourself so we can personalize your experience.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="John"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(5,14,36,0.1)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(5,14,36,0.04)' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Last name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Smith"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(5,14,36,0.1)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(5,14,36,0.04)' }}
                />
              </div>
            </div>

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

            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Phone number <span style={{ color: 'rgba(5,14,36,0.3)', fontWeight: 400 }}>(optional)</span></label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                style={inputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(5,14,36,0.1)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(5,14,36,0.04)' }}
              />
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

        {/* ── Step 3: Target Markets ── */}
        {step === 3 && (
          <div>
            <h2 style={heading}>Your target markets</h2>
            <p style={subheading}>Select the markets you want to find cash buyers in. You can change these anytime.</p>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 16,
            }}>
              {markets.map(market => {
                const selected = selectedMarkets.includes(market)
                return (
                  <button
                    key={market}
                    onClick={() => toggleMarket(market)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 20,
                      border: `1.5px solid ${selected ? BLUE : 'rgba(5,14,36,0.1)'}`,
                      background: selected ? 'rgba(37,99,235,0.06)' : '#FFFFFF',
                      color: selected ? BLUE : NAVY,
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: F,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {selected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {market}
                  </button>
                )
              })}
            </div>

            {selectedMarkets.length > 0 && (
              <p style={{
                fontSize: 13,
                color: BLUE,
                fontWeight: 500,
                marginBottom: 16,
                fontFamily: F,
              }}>
                {selectedMarkets.length} market{selectedMarkets.length !== 1 ? 's' : ''} selected
              </p>
            )}

            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button onClick={() => goToStep(2)} style={btnSecondary}>
                Back
              </button>
              <button onClick={() => goToStep(4)} style={{ ...btnPrimary, flex: 1 }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Experience Level ── */}
        {step === 4 && (
          <div>
            <h2 style={heading}>Your experience level</h2>
            <p style={subheading}>This helps us tailor recommendations and resources to where you are in your journey.</p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 32,
            }}>
              {experienceLevels.map(level => {
                const selected = experience === level.value
                return (
                  <button
                    key={level.value}
                    onClick={() => setExperience(level.value)}
                    style={{
                      padding: '20px 16px',
                      borderRadius: 12,
                      border: `1.5px solid ${selected ? BLUE : 'rgba(5,14,36,0.08)'}`,
                      background: selected ? 'rgba(37,99,235,0.04)' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      transition: 'all 0.2s ease',
                      boxShadow: selected ? '0 0 0 3px rgba(37,99,235,0.08)' : '0 1px 3px rgba(5,14,36,0.03)',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{level.icon}</div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: selected ? BLUE : NAVY,
                      fontFamily: F,
                      marginBottom: 2,
                    }}>
                      {level.label}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: BODY,
                      fontFamily: F,
                    }}>
                      {level.sub}
                    </div>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => goToStep(3)} style={btnSecondary}>
                Back
              </button>
              <button
                onClick={() => goToStep(5)}
                style={{ ...btnPrimary, flex: 1 }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Tour Complete ── */}
        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 style={{
              ...heading,
              marginBottom: 8,
              textAlign: 'center' as const,
            }}>
              You&apos;re all set!
            </h2>

            <p style={{
              ...subheading,
              textAlign: 'center' as const,
              marginBottom: 32,
            }}>
              Your account is ready to go. Here are some things you can do right away:
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 32,
              textAlign: 'left' as const,
            }}>
              {quickActions.map(action => (
                <button
                  key={action.title}
                  onClick={() => completeOnboarding(action.href)}
                  disabled={saving}
                  style={{
                    padding: '16px',
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    background: '#FFFFFF',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    textAlign: 'left' as const,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(5,14,36,0.03)',
                    opacity: saving ? 0.6 : 1,
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
                  <div style={{ marginBottom: 8 }}>{action.icon}</div>
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
                    fontSize: 12,
                    color: BODY,
                    fontFamily: F,
                    lineHeight: 1.4,
                  }}>
                    {action.desc}
                  </div>
                </button>
              ))}
            </div>

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
      {step < 5 && (
        <button
          onClick={() => goToStep(5)}
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

/* ── Shared styles ─────────────────────────────── */

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
