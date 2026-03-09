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

export default function Hero() {
  const [heroSubmitted, setHeroSubmitted] = useState(false)

  function handleHeroSubmit(e: React.FormEvent) {
    e.preventDefault()
    setHeroSubmitted(true)
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
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(2.4rem, 3.8vw, 3.6rem)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.04em',
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
            Dealflow AI finds verified cash buyers, calls them with AI voice agents, qualifies them,
            and matches them to your deals automatically, so you close faster with less work.
          </p>

          {!heroSubmitted ? (
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
                      background: 'var(--blue-600)',
                      color: 'var(--white)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 20px',
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      whiteSpace: 'nowrap',
                      letterSpacing: '-0.01em',
                      flexShrink: 0,
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
                    Get early access
                  </button>
                </div>
              </form>
              <p style={{ fontSize: '0.76rem', color: 'var(--gray-400)' }}>
                No credit card. Founding members lock in pricing forever.
              </p>
            </>
          ) : (
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
                      fontFamily: "'Bricolage Grotesque', sans-serif",
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
          @keyframes dealIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .deal-card { opacity: 0; animation: dealIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .deal-card-0 { animation-delay: 0.5s; }
          .deal-card-1 { animation-delay: 0.75s; }
          .deal-card-2 { animation-delay: 1.0s; }
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
