'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
 
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <>
      <Nav isAbout />
      <main style={{ paddingTop: 62 }}>
        <div
          style={{
            maxWidth: 680,
            margin: '0 auto',
            padding: '72px 40px 100px',
          }}
        >
          {/* Header */}
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--blue-600)',
              marginBottom: 16,
            }}
          >
            Get in touch
          </p>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--gray-900)',
              marginBottom: 16,
              lineHeight: 1.1,
            }}
          >
            Contact Us
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--gray-500)', lineHeight: 1.7, marginBottom: 48 }}>
            Have a question, feedback, or want to learn more about Dealflow AI? We&apos;d love to hear from you.
          </p>

          {submitted ? (
            <div
              style={{
                background: 'var(--blue-50)',
                border: '1px solid var(--blue-100)',
                borderRadius: 14,
                padding: '40px 36px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 16 }}>✓</div>
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: 'var(--gray-900)',
                  marginBottom: 10,
                }}
              >
                Message sent!
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--gray-600)' }}>
                We&apos;ll get back to you at <strong>{form.email}</strong> within 1–2 business days.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="contact-name-row">
                <div>
                  <label style={labelStyle}>Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Subject</label>
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  required
                >
                  <option value="">Select a topic…</option>
                  <option value="beta">Beta program inquiry</option>
                  <option value="partnership">Partnership</option>
                  <option value="press">Press & media</option>
                  <option value="support">Support</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Tell us what's on your mind…"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 140 }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '13px 28px',
                  borderRadius: 10,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--white)',
                  background: 'var(--blue-600)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '-0.01em',
                  transition: 'background 0.15s',
                  alignSelf: 'flex-start',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-700)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue-600)' }}
              >
                Send message
              </button>
            </form>
          )}

          {/* Alt contact */}
          <div
            style={{
              marginTop: 56,
              paddingTop: 40,
              borderTop: '1px solid var(--gray-100)',
              display: 'flex',
              gap: 32,
              flexWrap: 'wrap',
            }}
          >
            {[
              { label: 'Email', value: 'hello@dealflow.ai', href: 'mailto:hello@dealflow.ai' },
              { label: 'Based in', value: 'Dallas, TX', href: null },
            ].map((item) => (
              <div key={item.label}>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: 6 }}>
                  {item.label}
                </p>
                {item.href ? (
                  <a href={item.href} style={{ fontSize: '0.95rem', color: 'var(--blue-600)', textDecoration: 'none' }}>
                    {item.value}
                  </a>
                ) : (
                  <p style={{ fontSize: '0.95rem', color: 'var(--gray-700)' }}>{item.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />

      <style>{`
        @media (max-width: 520px) {
          .contact-name-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 500,
  color: 'var(--gray-700)',
  marginBottom: 7,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 9,
  border: '1px solid var(--gray-200)',
  fontSize: '0.9rem',
  color: 'var(--gray-900)',
  background: 'var(--white)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
