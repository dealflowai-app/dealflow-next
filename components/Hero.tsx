'use client'

import { useState } from 'react'

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
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '120px 24px 100px',
      background: 'var(--white)',
      textAlign: 'center',
    }}>

      {/* Status pill */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--gray-500)',
        marginBottom: 40,
        letterSpacing: '-0.003em',
      }}>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--green)',
          display: 'inline-block',
          flexShrink: 0,
        }} className="eyebrow-dot" />
        Early access open
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: 'clamp(3rem, 7vw, 5.5rem)',
        fontWeight: 700,
        lineHeight: 1.04,
        letterSpacing: '-0.04em',
        color: 'var(--gray-900)',
        maxWidth: 760,
        marginBottom: 28,
      }}>
        Real estate deals,<br />closed on autopilot.
      </h1>

      {/* Subheadline */}
      <p style={{
        fontSize: 'clamp(1rem, 2vw, 1.2rem)',
        color: 'var(--gray-500)',
        lineHeight: 1.6,
        maxWidth: 500,
        marginBottom: 52,
        fontWeight: 400,
        letterSpacing: '-0.01em',
      }}>
        DealFlow AI finds verified cash buyers, calls them with AI voice agents,
        qualifies them, and matches them to your deals — automatically.
      </p>

      {/* Email step */}
      {step === 'email' && (
        <div className="hero-form-wrap">
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
                padding: '13px 16px',
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
                padding: '13px 22px',
                fontFamily: 'inherit',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.02em',
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.82' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Get early access
            </button>
          </form>
          {heroError && (
            <p style={{ fontSize: '13px', color: 'var(--red)', marginTop: 10, textAlign: 'center' }}>{heroError}</p>
          )}
          <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: 18, letterSpacing: '-0.003em' }}>
            No credit card. Founding members lock in pricing forever.
          </p>
        </div>
      )}

      {/* Role step */}
      {step === 'role' && (
        <div className="hero-form-wrap" style={{ animation: 'fadeUp 0.3s ease both' }}>
          <p style={{ fontSize: '15px', color: 'var(--gray-500)', marginBottom: 16, letterSpacing: '-0.003em' }}>
            What best describes you?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {roles.map(r => (
              <button
                key={r.value}
                onClick={() => handleRolePick(r.value)}
                disabled={heroLoading}
                style={{
                  padding: '13px 18px',
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
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          animation: 'fadeUp 0.3s ease both',
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 18,
          }}>
            ✓
          </div>
          <p style={{ fontSize: '20px', fontWeight: 600, color: 'var(--gray-900)', letterSpacing: '-0.03em' }}>
            You&apos;re on the list.
          </p>
          <p style={{ fontSize: '15px', color: 'var(--gray-500)', letterSpacing: '-0.003em' }}>
            We&apos;ll reach out with early access details soon.
          </p>
        </div>
      )}

      <style>{`
        .hero-form-wrap {
          width: 100%;
          max-width: 460px;
        }
        @media (max-width: 560px) {
          .hero-form-wrap form {
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  )
}
