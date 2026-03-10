'use client'

import { useState } from 'react'
import MapCard from './MapCard'

const recentDeals = [
  {
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=96&h=68&q=75',
    addr: '5512 Peachtree Rd, Atlanta GA',
    fee: '+$14,500',
    ago: 'Closed 3 days ago',
  },
  {
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=96&h=68&q=75',
    addr: '816 Magnolia Way, Charlotte NC',
    fee: '+$16,200',
    ago: 'Closed 6 days ago',
  },
  {
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=96&h=68&q=75',
    addr: '923 Cedar Lane, Tampa FL',
    fee: '+$21,000',
    ago: 'Closed 9 days ago',
  },
]

const roles = [
  { value: 'wholesaler', label: 'Real estate wholesaler', icon: '🏚️' },
  { value: 'buyer', label: 'Cash buyer / investor', icon: '💰' },
  { value: 'agent', label: 'Agent / broker', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '👋' },
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
    <div className="hero-outer">
      <div
        style={{
          padding: '104px 40px 80px',
          maxWidth: 1160,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 64,
          alignItems: 'center',
          minHeight: '100vh',
        }}
        className="hero-grid"
      >
        {/* LEFT */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--blue-600)',
              marginBottom: 22,
            }}
          >
            <span
              className="eyebrow-dot"
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}
            />
            Early access open now
          </div>

          <h1
            style={{
              fontFamily: 'inherit',
              fontSize: 'clamp(2.4rem, 3.8vw, 3.6rem)',
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: '-0.022em',
              color: 'var(--gray-900)',
              marginBottom: 20,
            }}
          >
            Real estate deals,<br />
            closed on{' '}
            <span style={{ color: 'var(--blue-600)' }}>autopilot</span>
          </h1>

          <p
            style={{
              fontSize: '1rem',
              color: 'var(--gray-500)',
              lineHeight: 1.7,
              maxWidth: 440,
              marginBottom: 36,
              fontWeight: 400,
            }}
          >
            DealFlow AI finds verified cash buyers, calls them with AI voice agents, qualifies them,
            and matches them to your deals automatically, so you close faster with less work.
          </p>

          {step === 'email' && (
            <>
              <form id="hero-form" onSubmit={handleHeroSubmit}>
                <div
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 14,
                    padding: 4,
                    display: 'flex',
                    gap: 6,
                    boxShadow: 'var(--shadow)',
                    maxWidth: 460,
                    marginBottom: 14,
                  }}
                >
                  <input
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={heroEmail}
                    onChange={e => setHeroEmail(e.target.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      color: 'var(--gray-900)',
                      padding: '10px 14px',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'var(--gray-900)',
                      color: 'var(--white)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 20px',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      whiteSpace: 'nowrap',
                      letterSpacing: '-0.01em',
                      flexShrink: 0,
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--gray-700)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--gray-900)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.12)'
                    }}
                  >
                    Get early access
                  </button>
                </div>
              </form>
              {heroError && (
                <p style={{ fontSize: '0.76rem', color: 'var(--red)', marginBottom: 6 }}>{heroError}</p>
              )}
              <p style={{ fontSize: '0.76rem', color: 'var(--gray-400)' }}>
                No credit card. Founding members lock in pricing forever.
              </p>
            </>
          )}

          {step === 'role' && (
            <div className="hero-role-step" style={{ maxWidth: 460 }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 10 }}>
                One quick question
              </p>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gray-800)', marginBottom: 14 }}>
                What best describes you?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {roles.map(r => (
                  <button
                    key={r.value}
                    onClick={() => handleRolePick(r.value)}
                    disabled={heroLoading}
                    className="hero-role-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: 'var(--white)',
                      border: '1px solid var(--gray-200)',
                      borderRadius: 11,
                      padding: '12px 16px',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: 'var(--gray-800)',
                      cursor: heroLoading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s',
                      opacity: heroLoading ? 0.6 : 1,
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }} suppressHydrationWarning>{r.icon}</span>
                    {r.label}
                    {heroLoading ? <span className="hero-spinner" style={{ marginLeft: 'auto' }} /> : (
                      <svg style={{ marginLeft: 'auto', opacity: 0.3 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'done' && (
            <div
              className="success-anim"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '12px 16px',
                maxWidth: 460,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#166534' }}>
                You&apos;re on the list. We&apos;ll be in touch soon.
              </span>
            </div>
          )}

          {/* Recent closings */}
          <div style={{ marginTop: 28 }}>
            <p style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 9 }}>
              Recent closings on the platform
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentDeals.map((d, i) => (
                <div
                  key={i}
                  className={`deal-card deal-card-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    background: 'rgba(255,255,255,0.92)',
                    border: '1px solid var(--gray-100)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                  }}
                >
                  <img
                    src={d.img}
                    alt=""
                    style={{ width: 52, height: 38, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.81rem', fontWeight: 600, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.addr}
                    </div>
                    <div style={{ fontSize: '0.69rem', color: 'var(--gray-400)', marginTop: 1 }}>{d.ago}</div>
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--green)', flexShrink: 0 }}>
                    {d.fee}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              marginTop: 28,
              flexWrap: 'wrap',
            }}
          >
            {[
              { num: '$15B+', label: 'Annual wholesale market' },
              null,
              { num: '2M+', label: 'Off-market deals / yr' },
              null,
              { num: '72 hrs', label: 'Avg. time to first offer' },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="hero-trust-divider" style={{ width: 1, height: 32, background: 'var(--gray-200)' }} />
              ) : (
                <div key={i}>
                  <div
                    style={{
                      fontFamily: 'inherit',
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: 'var(--gray-900)',
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                    }}
                  >
                    {item.num}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{item.label}</div>
                </div>
              )
            )}
          </div>
        </div>

        {/* RIGHT: Map card */}
        <div>
          <MapCard />
        </div>

        <style>{`
          .hero-outer {
            background: linear-gradient(160deg, #edf4ff 0%, #f5f8ff 30%, #ffffff 60%);
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .hero-spinner {
            width: 14px; height: 14px;
            border: 2px solid rgba(255,255,255,0.4);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
            flex-shrink: 0;
          }
          @keyframes dealIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .deal-card { opacity: 0; animation: dealIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .deal-card-0 { animation-delay: 0.5s; }
          .deal-card-1 { animation-delay: 0.75s; }
          .deal-card-2 { animation-delay: 1.0s; }
          .hero-role-btn:hover:not(:disabled) {
            border-color: var(--blue-300, #93c5fd) !important;
            background: #f0f6ff !important;
            transform: translateX(2px);
          }
          .hero-role-step {
            animation: roleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
          }
          @keyframes roleIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 860px) {
            .hero-grid {
              grid-template-columns: 1fr !important;
              padding: 90px 20px 60px !important;
              gap: 40px !important;
              min-height: auto !important;
            }
            .hero-trust-divider { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  )
}
