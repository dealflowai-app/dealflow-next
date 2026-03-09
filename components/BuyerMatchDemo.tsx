'use client'

import { useState, useEffect, useRef } from 'react'

const buyers = [
  {
    initials: 'JM',
    bg: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    name: 'James M.',
    tags: 'SFR · $80K–$150K · Flip · Atlanta, GA',
    score: 96,
  },
  {
    initials: 'SR',
    bg: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    name: 'Sandra R.',
    tags: 'SFR · $60K–$130K · Flip · Charlotte, NC',
    score: 84,
  },
  {
    initials: 'DK',
    bg: 'linear-gradient(135deg, #6366f1, #3b82f6)',
    name: 'David K.',
    tags: 'SFR · $70K–$120K · Flip · Tampa, FL',
    score: 71,
  },
]

export default function BuyerMatchDemo() {
  const [scores, setScores] = useState([0, 0, 0])
  const [fired, setFired] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired) {
          setFired(true)
          buyers.forEach((b, i) => {
            setTimeout(() => {
              setScores((prev) => {
                const next = [...prev]
                next[i] = b.score
                return next
              })
            }, 150 + i * 280)
          })
          obs.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [fired])

  return (
    <div
      ref={ref}
      className="match-section"
      style={{
        padding: '96px 40px',
        background: 'var(--gray-50)',
        borderTop: '1px solid var(--gray-100)',
        borderBottom: '1px solid var(--gray-100)',
      }}
    >
      <div
        className="match-grid"
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 72,
          alignItems: 'center',
        }}
      >
        {/* Left: widget */}
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--gray-200)',
            borderRadius: 18,
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Deal card */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--gray-100)' }}>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--gray-400)',
                marginBottom: 8,
              }}
            >
              Deal under contract
            </div>
            <div
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--gray-900)',
                marginBottom: 4,
              }}
            >
              816 Magnolia Way, Charlotte NC
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
              3/2 SFR · 1,340 sqft · Distressed · Ask $98,500
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {[
                { label: 'ARV', val: '$162,000', color: 'var(--gray-900)' },
                { label: 'Assign fee', val: '$12,500', color: 'var(--blue-600)' },
                { label: 'Close by', val: '14 days', color: 'var(--gray-900)' },
              ].map((chip) => (
                <div
                  key={chip.label}
                  style={{
                    background: 'var(--gray-50)',
                    border: '1px solid var(--gray-100)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    flex: 1,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.66rem', color: 'var(--gray-400)', marginBottom: 2 }}>{chip.label}</div>
                  <div
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: chip.color,
                      lineHeight: 1,
                    }}
                  >
                    {chip.val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Buyer matches */}
          <div style={{ padding: '16px 20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--gray-400)',
                }}
              >
                Top buyer matches
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>from 247 verified buyers</div>
            </div>

            {buyers.map((b, i) => (
              <div key={b.name} style={{ marginBottom: i < buyers.length - 1 ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: b.bg,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {b.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-900)', lineHeight: 1 }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 3 }}>{b.tags}</div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 800,
                      fontSize: '1.1rem',
                      color: 'var(--blue-600)',
                      minWidth: 44,
                      textAlign: 'right',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {scores[i]}%
                  </div>
                </div>
                <div
                  style={{
                    height: 6,
                    background: 'var(--gray-100)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginLeft: 42,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: i === 0
                        ? 'var(--blue-600)'
                        : i === 1
                        ? 'var(--blue-500)'
                        : 'var(--blue-400)',
                      borderRadius: 4,
                      width: `${scores[i]}%`,
                      transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid var(--gray-100)',
                fontSize: '0.75rem',
                color: 'var(--gray-400)',
              }}
            >
              Outreach sent to top 3 automatically · 244 others filtered out
            </div>
          </div>
        </div>

        {/* Right: text */}
        <div>
          <p
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--blue-600)',
              marginBottom: 14,
            }}
          >
            Smart deal matching
          </p>
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(1.9rem, 3vw, 2.8rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              color: 'var(--gray-900)',
              marginBottom: 18,
            }}
          >
            Right deal, right buyer.<br />
            <span style={{ color: 'var(--blue-600)' }}>Not a mass blast.</span>
          </h2>
          <p
            style={{
              fontSize: '0.97rem',
              color: 'var(--gray-500)',
              lineHeight: 1.7,
              marginBottom: 32,
              maxWidth: 420,
            }}
          >
            Upload a deal and the platform scores every buyer in your database across buy box, price fit, location, strategy, and close speed. Top matches get outreach instantly. Everyone else stays quiet.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Scores buyers across 5 criteria, not just a single filter',
              'Only matched buyers ever see your deal. No mass blasting.',
              'Outreach fires automatically the moment matches are found',
            ].map((text) => (
              <div
                key={text}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: '0.88rem',
                  color: 'var(--gray-700)',
                  lineHeight: 1.6,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'var(--blue-600)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  ✓
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .match-section { padding: 64px 20px !important; }
          .match-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </div>
  )
}
