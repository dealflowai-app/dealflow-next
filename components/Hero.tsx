'use client'

import { useState } from 'react'

const roles = [
  { value: 'wholesaler', label: 'Real estate wholesaler', icon: '🏚️' },
  { value: 'agent', label: 'Agent / broker', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '👋' },
]

export default function Hero() {
  const [city, setCity] = useState('')
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [step, setStep] = useState<'email' | 'role' | 'done'>('email')
  const [heroEmail, setHeroEmail] = useState('')
  const [heroLoading, setHeroLoading] = useState(false)
  const [heroError, setHeroError] = useState('')

  function handleEmailSubmit(e: React.FormEvent) {
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
      {/* Background image + overlay */}
      <div className="hero-bg" />
      <div className="hero-overlay" />

      {/* Content */}
      <div className="hero-content">
        {/* Eyebrow */}
        <div className="hero-eyebrow">
          <span className="eyebrow-dot" />
          Early access open now
        </div>

        {/* Headline */}
        <h1 className="hero-h1">
          Automating Real Estate{' '}
          <span className="hero-h1-accent">Wholesaling</span>
        </h1>

        {/* Subtext */}
        <p className="hero-sub">
          Let our AI do the heavy lifting. DealFlow AI analyzes thousands of off-market data points to beat your competitors and hand you the highest margin deals instantly.
        </p>

        {/* City search box */}
        <div className="hero-search-wrap">
          <div className="hero-search-box">
            <svg className="hero-search-map-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
            <input
              type="text"
              placeholder="Enter city to find cash buyers and off-market deals"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="hero-search-input"
            />
            <button className="hero-search-btn" aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Join Waitlist */}
        {!showWaitlist && step !== 'done' && (
          <button
            className="hero-waitlist-btn"
            onClick={() => setShowWaitlist(true)}
          >
            Join the waitlist
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        )}

        {/* Waitlist form */}
        {showWaitlist && step === 'email' && (
          <div className="hero-waitlist-form-wrap">
            <form onSubmit={handleEmailSubmit} className="hero-waitlist-form">
              <input
                type="email"
                placeholder="Enter your email"
                required
                value={heroEmail}
                onChange={e => setHeroEmail(e.target.value)}
                className="hero-email-input"
              />
              <button type="submit" className="hero-email-submit">
                Get early access
              </button>
            </form>
            {heroError && <p className="hero-error">{heroError}</p>}
          </div>
        )}

        {showWaitlist && step === 'role' && (
          <div className="hero-role-step">
            <p className="role-eyebrow">One quick question</p>
            <p className="role-question">What best describes you?</p>
            <div className="role-list">
              {roles.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleRolePick(r.value)}
                  disabled={heroLoading}
                  className="hero-role-btn"
                >
                  <span suppressHydrationWarning>{r.icon}</span>
                  {r.label}
                  {heroLoading
                    ? <span className="hero-spinner" style={{ marginLeft: 'auto' }} />
                    : (
                      <svg style={{ marginLeft: 'auto', opacity: 0.4 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="hero-success">
            <div className="hero-success-check">✓</div>
            <span>You&apos;re on the list. We&apos;ll be in touch soon.</span>
          </div>
        )}

        {/* Trust stats */}
        <div className="hero-trust">
          {[
            { num: '$15B+', label: 'Annual wholesale market' },
            { num: '2M+', label: 'Off-market deals / yr' },
            { num: '72 hrs', label: 'Avg. time to first offer' },
          ].map((item, i) => (
            <div key={i} className="hero-trust-item">
              <div className="hero-trust-num">{item.num}</div>
              <div className="hero-trust-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hero-outer {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80');
          background-size: cover;
          background-position: center 60%;
          z-index: 0;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(5,10,20,0.55) 0%, rgba(5,10,20,0.42) 50%, rgba(5,10,20,0.60) 100%);
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 120px 40px 80px;
          max-width: 760px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #bfdbfe;
          margin-bottom: 20px;
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          display: inline-block;
        }

        .hero-h1 {
          font-size: clamp(2.2rem, 4.5vw, 3.8rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.025em;
          color: #ffffff;
          margin-bottom: 20px;
        }

        .hero-h1-accent {
          color: #ffffff
        }

        .hero-sub {
          font-size: 1rem;
          color: rgba(255,255,255,0.72);
          line-height: 1.7;
          max-width: 540px;
          margin: 0 auto 36px;
          background: rgba(5,10,20,0.08);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          border-radius: 10px;
          padding: 12px 18px;
          font-weight: 400;
        }

        /* Search box */
        .hero-search-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .hero-search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.97);
          border-radius: 14px;
          padding: 6px 6px 6px 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 560px;
        }

        .hero-search-map-icon {
          color: #6b7280;
          flex-shrink: 0;
        }

        .hero-search-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-family: inherit;
          font-size: 0.92rem;
          color: #111827;
          min-width: 0;
        }

        .hero-search-input::placeholder {
          color: #9ca3af;
        }

        .hero-search-btn {
          background: #1e3a5f;
          color: white;
          border: none;
          border-radius: 10px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .hero-search-btn:hover {
          background: #2563EB;
        }

        /* Waitlist button */
        .hero-waitlist-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          padding: 11px 22px;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 40px;
        }

        .hero-waitlist-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.5);
          color: white;
        }

        /* Waitlist email form */
        .hero-waitlist-form-wrap {
          margin-bottom: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .hero-waitlist-form {
          display: flex;
          gap: 6px;
          background: rgba(255,255,255,0.97);
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          width: 100%;
          max-width: 460px;
        }

        .hero-email-input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-family: inherit;
          font-size: 0.9rem;
          color: #111827;
          padding: 10px 14px;
          min-width: 0;
        }

        .hero-email-submit {
          background: #111827;
          color: white;
          border: none;
          border-radius: 9px;
          padding: 10px 18px;
          font-family: inherit;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .hero-email-submit:hover {
          background: #374151;
        }

        .hero-error {
          font-size: 0.76rem;
          color: #fca5a5;
        }

        /* Role step */
        .hero-role-step {
          max-width: 400px;
          margin: 0 auto 40px;
          animation: roleIn 0.3s cubic-bezier(0.16,1,0.3,1) both;
          text-align: left;
        }

        .role-eyebrow {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #bfdbfe;
          margin-bottom: 8px;
        }

        .role-question {
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          margin-bottom: 12px;
        }

        .role-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hero-role-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 11px;
          padding: 12px 16px;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 500;
          color: #1f2937;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
          width: 100%;
        }

        .hero-role-btn:hover:not(:disabled) {
          background: white;
          transform: translateX(2px);
        }

        /* Success */
        .hero-success {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          background: rgba(240,253,244,0.15);
          border: 1px solid rgba(74,222,128,0.4);
          border-radius: 10px;
          padding: 12px 20px;
          max-width: 400px;
          margin: 0 auto 40px;
          color: #bbf7d0;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .hero-success-check {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #22c55e;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          flex-shrink: 0;
        }

        /* Trust row */
        .hero-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          flex-wrap: wrap;
          margin-top: 20px;
          padding-top: 32px;
          border-top: 1px solid rgba(255,255,255,0.12);
        }

        .hero-trust-item {
          text-align: center;
        }

        .hero-trust-num {
          font-size: 1.4rem;
          font-weight: 800;
          color: white;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .hero-trust-label {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.5);
          margin-top: 3px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .hero-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top-color: #374151;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes roleIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .hero-content {
            padding: 100px 16px 60px;
          }
          .hero-trust {
            gap: 24px;
          }
          .hero-search-box {
            padding: 5px 5px 5px 12px;
          }
        }
      `}</style>
    </div>
  )
}
