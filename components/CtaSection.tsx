'use client'

import { useState } from 'react'

export default function CtaSection() {
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: role || null, source: 'cta' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      id="cta"
      style={{
        padding: '96px 40px',
        background: 'var(--gray-50)',
        borderTop: '1px solid var(--gray-100)',
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--blue-600)',
            marginBottom: 14,
            display: 'block',
          }}
        >
          Early access
        </div>

        <h2
          style={{
            fontFamily: 'inherit',
            fontSize: 'clamp(2rem, 3.5vw, 3rem)',
            fontWeight: 600,
            letterSpacing: '-0.022em',
            color: 'var(--gray-900)',
            lineHeight: 1.1,
            marginBottom: 18,
          }}
        >
          Be the first to<br />close deals on{' '}
          <span style={{ color: 'var(--blue-600)' }}>autopilot</span>
        </h2>

        <p style={{ color: 'var(--gray-500)', fontSize: '1rem', marginBottom: 36 }}>
          Join the waitlist and lock in founding member pricing before we open to the public.
        </p>

        {!submitted ? (
          <>
            <form
              onSubmit={handleSubmit}
              className="cta-form-row"
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="email"
                placeholder="your@email.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--gray-200)',
                  color: 'var(--gray-900)',
                  padding: '12px 18px',
                  borderRadius: 10,
                  fontFamily: 'inherit',
                  fontSize: '0.92rem',
                  outline: 'none',
                  minWidth: 220,
                  flex: 1,
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.15s',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--blue-400)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--gray-200)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                }}
              />
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--gray-200)',
                  color: '#6b7280',
                  padding: '12px 16px',
                  borderRadius: 10,
                  fontFamily: 'inherit',
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <option value="" disabled>I am a...</option>
                <option value="wholesaler">Real estate wholesaler</option>
                <option value="agent">Agent</option>
                <option value="other">Other</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? 'var(--blue-400, #93c5fd)' : 'var(--blue-600)',
                  color: 'white',
                  padding: '12px 26px',
                  borderRadius: 10,
                  border: 'none',
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.1)',
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.background = 'var(--blue-700)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)'
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.background = 'var(--blue-600)'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 99, 235, 0.1)'
                }}
              >
                {loading ? 'Joining...' : 'Join the waitlist'}
              </button>
            </form>
            {error && (
              <p style={{ fontSize: '0.82rem', color: '#b91c1c', marginTop: 10 }}>{error}</p>
            )}
            <p style={{ fontSize: '0.76rem', color: 'var(--gray-400)', marginTop: 14 }}>
              No credit card. No commitment. Founding members get pricing locked in forever.
            </p>
          </>
        ) : (
          <div
            className="success-anim"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                background: 'var(--green)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: 'white',
              }}
            >
              ✓
            </div>
            <div
              style={{
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: '1.15rem',
                color: 'var(--gray-900)',
              }}
            >
              You&apos;re on the list.
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>
              We&apos;ll reach out with early access details soon.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 860px) {
          #cta { padding: 64px 20px !important; }
        }
        @media (max-width: 560px) {
          .cta-form-row { flex-direction: column; align-items: stretch; }
          .cta-form-row input,
          .cta-form-row select,
          .cta-form-row button { width: 100% !important; min-width: 0 !important; flex: none !important; }
        }
      `}</style>
    </div>
  )
}
