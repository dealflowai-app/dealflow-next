'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function OnboardingPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [primaryMarket, setPrimaryMarket] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          primaryMarket: primaryMarket || null,
          experienceLevel: experienceLevel || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', flexDirection: 'column', fontFamily: F }}>
      <Nav currentPage="onboarding" />

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px 80px' }}>
        <div className="auth-card" style={{
          background: '#ffffff', borderRadius: 16, padding: '40px 36px',
          width: '100%', maxWidth: 440,
          boxShadow: '0 1px 2px rgba(5,14,36,0.06), 0 4px 16px rgba(5,14,36,0.04)',
          border: '1px solid rgba(5,14,36,0.06)',
        }}>

          {/* Progress steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <StepIndicator step={1} label="Create account" status="done" />
            <StepLine />
            <StepIndicator step={2} label="Set up profile" status="current" />
            <StepLine />
            <StepIndicator step={3} label="Start using DealFlow" status="upcoming" />
          </div>

          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>

          <h1 style={{ fontFamily: SERIF, fontSize: '1.6rem', fontWeight: 400, color: NAVY, letterSpacing: '-0.022em', marginBottom: 6, lineHeight: 1.15 }}>
            Set up your account
          </h1>
          <p style={{ fontSize: '0.9rem', color: BODY, marginBottom: 28, lineHeight: 1.6, fontFamily: F }}>
            Tell us a bit about yourself to get started.
          </p>

          <form onSubmit={handleFinish} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <label style={labelStyle}>Phone (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="auth-input"
                style={inputStyle}
              />
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
                      style={{
                        padding: '12px 8px',
                        borderRadius: 10,
                        border: selected ? `2px solid ${BLUE}` : `1px solid ${BORDER}`,
                        background: selected ? 'rgba(37,99,235,0.04)' : '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'border-color 0.15s, background 0.15s',
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
                  Setting up...
                </>
              ) : 'Enter dashboard'}
            </button>
          </form>
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

/* ── Step indicator components ─────────────────────────── */

function StepIndicator({ step, label, status }: { step: number; label: string; status: 'done' | 'current' | 'upcoming' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: status === 'current' ? 1 : 'none' }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: status === 'done' ? BLUE : status === 'current' ? BLUE : 'rgba(5,14,36,0.06)',
        border: status === 'upcoming' ? '1px solid rgba(5,14,36,0.1)' : 'none',
      }}>
        {status === 'done' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: F,
            color: status === 'current' ? 'white' : 'rgba(5,14,36,0.3)',
          }}>{step}</span>
        )}
      </div>
      <span style={{
        fontSize: 12, fontWeight: 500, fontFamily: F, whiteSpace: 'nowrap',
        color: status === 'upcoming' ? 'rgba(5,14,36,0.3)' : status === 'current' ? NAVY : 'rgba(5,14,36,0.5)',
      }}>{label}</span>
    </div>
  )
}

function StepLine() {
  return <div style={{ flex: 1, height: 1, background: 'rgba(5,14,36,0.08)', minWidth: 16 }} />
}
