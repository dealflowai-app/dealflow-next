'use client'

import { useState } from 'react'
import MapCard from './MapCard'

const recentDeals = [
  { addr: '5512 Peachtree Rd, Atlanta GA', fee: '+$14,500', ago: 'Closed 3 days ago' },
  { addr: '816 Magnolia Way, Charlotte NC', fee: '+$16,200', ago: 'Closed 6 days ago' },
  { addr: '923 Cedar Lane, Tampa FL', fee: '+$21,000', ago: 'Closed 9 days ago' },
]

const roles = [
  { value: 'wholesaler', label: 'Real estate wholesaler' },
  { value: 'buyer', label: 'Cash buyer / investor' },
  { value: 'agent', label: 'Agent / broker' },
  { value: 'other', label: 'Other' },
]

export default function Hero() {
  const [step, setStep] = useState<'email' | 'role' | 'done'>('email')
  const [heroEmail, setHeroEmail] = useState('')
  const [heroLoading, setHeroLoading] = useState(false)
  const [heroError, setHeroError] = useState('')

  function handleHeroSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStep('role')
  }

  async function handleRolePick(role: string) {
    setHeroLoading(true)
    setHeroError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: heroEmail, role, source: 'hero' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setStep('done')
    } catch (err: unknown) {
      setHeroError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setStep('email')
    } finally {
      setHeroLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--white)' }}>
      <div
        className="hero-grid"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '108px 48px 80px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 72,
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        {/* LEFT */}
        <div>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--gray-500)',
            marginBottom: 30,
            letterSpacing: '-0.003em',
          }}>
            <span
              className="eyebrow-dot"
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }}
            />
            Early access open
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(2.6rem, 4.2vw, 3.8rem)',
            fontWeight: 700,
            lineHeight: 1.06,
            letterSpacing: '-0.04em',
            color: 'var(--gray-900)',
            marginBottom: 20,
          }}>
            Real estate deals,<br />
            closed on{' '}
            <span style={{ color: 'var(--blue-600)' }}>autopilot.</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.05rem',
            color: 'var(--gray-500)',
            lineHeight: 1.65,
            maxWidth: 440,
            marginBottom: 36,
            fontWeight: 400,
            letterSpacing: '-0.01em',
          }}>
            DealFlow AI finds verified cash buyers, calls them with AI voice agents,
            qualifies them, and matches them to your deals — automatically.
          </p>

          {/* Email step */}
          {step === 'email' && (
            <div style={{ maxWidth: 420 }}>
              <form id="hero-form" onSubmit={handleHeroSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  required
                  value={heroEmail}
                  onChange={e => setHeroEmail(e.target.value)}
                  suppressHydrationWarning
                  style={{
                    flex: 1,
                    border: '1px solid var(--gray-200)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: '15px',
                    color: 'var(--gray-900)',
                    background: 'var(--white)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    letterSpacing: '-0.003em',
                    minWidth: 0,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--gray-400)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--gray-200)' }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'var(--gray-900)',
                    color: 'var(--white)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 20px',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.02em',
                    flexShrink: 0,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  Get early access
                </button>
              </form>
              {heroError && (
                <p style={{ fontSize: '13px', color: 'var(--red)', marginTop: 10 }}>{heroError}</p>
              )}
              <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: 14, letterSpacing: '-0.003em' }}>
                No credit card. Founding members lock in pricing forever.
              </p>
            </div>
          )}

          {/* Role step */}
          {step === 'role' && (
            <div style={{ maxWidth: 380, animation: 'fadeUp 0.3s ease both' }}>
              <p style={{ fontSize: '15px', color: 'var(--gray-500)', marginBottom: 14, letterSpacing: '-0.003em' }}>
                What best describes you?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {roles.map(r => (
                  <button
                    key={r.value}
                    onClick={() => handleRolePick(r.value)}
                    disabled={heroLoading}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--white)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 10,
                      fontFamily: 'inherit',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: 'var(--gray-900)',
                      cursor: heroLoading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      letterSpacing: '-0.003em',
                      opacity: heroLoading ? 0.6 : 1,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!heroLoading) {
                        e.currentTarget.style.borderColor = 'var(--gray-400)'
                        e.currentTarget.style.background = 'var(--gray-50)'
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--gray-200)'
                      e.currentTarget.style.background = 'var(--white)'
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Done step */}
          {step === 'done' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              animation: 'fadeUp 0.3s ease both',
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 16,
                flexShrink: 0,
              }}>
                ✓
              </div>
              <div>
                <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
                  You&apos;re on the list.
                </p>
                <p style={{ fontSize: '14px', color: 'var(--gray-500)', letterSpacing: '-0.003em' }}>
                  We&apos;ll reach out with early access details soon.
                </p>
              </div>
            </div>
          )}

          {/* Recent closings */}
          <div style={{ marginTop: 44 }}>
            <p style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--gray-400)',
              marginBottom: 12,
            }}>
              Recent closings on the platform
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentDeals.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-100)',
                    borderRadius: 10,
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-900)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.addr}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: 1 }}>{d.ago}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green)', letterSpacing: '-0.02em', flexShrink: 0 }}>
                    {d.fee}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Map */}
        <div style={{ width: '100%' }}>
          <MapCard />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            padding: 96px 24px 64px !important;
            gap: 48px !important;
            min-height: auto !important;
          }
        }
      `}</style>
    </div>
  )
}
