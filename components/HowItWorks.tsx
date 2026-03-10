'use client'

import { useState, useEffect, useRef } from 'react'

const steps = [
  {
    num: '01',
    name: 'Choose your market',
    badge: '~30 seconds',
    desc: 'Enter any city, county, or zip in the US. The system knows which public records to pull and which buyers are actively purchasing there.',
  },
  {
    num: '02',
    name: 'Discover verified cash buyers',
    badge: 'Automated',
    desc: 'We scan county property records for everyone who bought real estate with cash in the last 6–12 months. Proven buyers, real transaction history.',
  },
  {
    num: '03',
    name: 'AI qualifies every buyer',
    badge: 'While you sleep',
    desc: 'AI voice agents call dozens of buyers simultaneously — capturing buy box, price range, strategy, and close timeline. All saved automatically.',
  },
  {
    num: '04',
    name: 'Match your deal to the right buyer',
    badge: 'Instant',
    desc: 'Upload a property. The platform scores every buyer across 5 criteria and routes your deal only to matched buyers. No mass blasting.',
  },
  {
    num: '05',
    name: 'Contract and close inside the platform',
    badge: '< 14 days',
    desc: 'Buyers make offers inside the platform. You negotiate, accept, and the system generates a state-specific assignment contract. E-signatures collected.',
  },
]

const panelTitles = ['Market selection', 'Buyer discovery', 'AI qualification', 'Deal matching', 'Contract & close']

const STEP_DURATION = 5000

export default function HowItWorks() {
  const [current, setCurrent] = useState(0)
  const [progress, setProgress] = useState(0)
  const progRef = useRef<NodeJS.Timeout | null>(null)
  const nextRef = useRef<NodeJS.Timeout | null>(null)

  function goStep(i: number) {
    if (progRef.current) clearInterval(progRef.current)
    if (nextRef.current) clearTimeout(nextRef.current)
    setCurrent(i)
    setProgress(0)

    let p = 0
    progRef.current = setInterval(() => {
      p += (50 / STEP_DURATION) * 100
      setProgress(Math.min(p, 100))
      if (p >= 100) {
        if (progRef.current) clearInterval(progRef.current)
        nextRef.current = setTimeout(() => goStep((i + 1) % 5), 200)
      }
    }, 50)
  }

  useEffect(() => {
    goStep(0)
    return () => {
      if (progRef.current) clearInterval(progRef.current)
      if (nextRef.current) clearTimeout(nextRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      id="how"
      style={{ maxWidth: 1160, margin: '0 auto', padding: '96px 40px' }}
    >
      {/* Header */}
      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14 }}>
        How it works for you
      </div>
      <h2
        style={{
          fontFamily: 'inherit',
          fontSize: 'clamp(1.9rem, 3vw, 2.8rem)',
          fontWeight: 500,
          lineHeight: 1.1,
          letterSpacing: '-0.022em',
          color: 'var(--gray-900)',
        }}
      >
        Disposition on <span style={{ color: 'var(--blue-600)' }}>autopilot.</span>
      </h2>
      <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.7, marginTop: 16, maxWidth: 480 }}>
        The signal, not the noise.
      </p>

      <div
        className="how-layout-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 56, marginTop: 56, alignItems: 'start' }}
      >
        {/* Steps */}
        <div style={{ position: 'relative' }}>
          {/* Vertical connector line */}
          <div
            style={{
              position: 'absolute',
              left: 18,
              top: 15,
              bottom: 15,
              width: 1,
              background: 'var(--gray-200)',
              zIndex: 0,
            }}
          />
          {/* Progress fill on connector */}
          <div
            style={{
              position: 'absolute',
              left: 18,
              top: 15,
              width: 1,
              background: 'var(--blue-600)',
              zIndex: 1,
              height: `${(current / (steps.length - 1)) * 100}%`,
              transition: 'height 0.4s ease',
            }}
          />

          {steps.map((step, i) => (
            <div
              key={i}
              onClick={() => goStep(i)}
              style={{
                display: 'flex',
                gap: 18,
                padding: '16px 16px 16px 0',
                cursor: 'pointer',
                position: 'relative',
                zIndex: 2,
              }}
            >
              {/* Circle */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: current === i ? 'var(--blue-600)' : i < current ? 'var(--blue-100)' : 'var(--white)',
                  border: `1.5px solid ${current === i ? 'var(--blue-600)' : i < current ? 'var(--blue-200)' : 'var(--gray-200)'}`,
                  color: current === i ? 'white' : i < current ? 'var(--blue-600)' : 'var(--gray-400)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  flexShrink: 0,
                  transition: 'all 0.25s',
                  position: 'relative',
                  zIndex: 3,
                }}
              >
                {i < current ? '✓' : i + 1}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingTop: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: current === i ? 8 : 0 }}>
                  <div
                    style={{
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      color: current === i ? 'var(--gray-900)' : 'var(--gray-500)',
                      transition: 'color 0.2s',
                      lineHeight: 1.3,
                    }}
                  >
                    {step.name}
                  </div>
                  {current === i && (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        color: 'var(--blue-600)',
                        background: 'var(--blue-50)',
                        border: '1px solid var(--blue-100)',
                        borderRadius: 20,
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {step.badge}
                    </span>
                  )}
                </div>
                {current === i && (
                  <div
                    className="vis-screen-active"
                    style={{ fontSize: '0.84rem', color: 'var(--gray-500)', lineHeight: 1.65 }}
                  >
                    {step.desc}
                  </div>
                )}
                {/* Step progress bar */}
                {current === i && (
                  <div
                    style={{
                      marginTop: 12,
                      height: 2,
                      background: 'var(--gray-100)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'var(--blue-600)',
                        transition: 'width 0.05s linear',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Visual panel */}
        <div
          className="vis-panel-desktop"
          style={{
            position: 'sticky',
            top: 82,
            background: 'var(--white)',
            border: '1px solid var(--gray-200)',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: 'var(--shadow)',
          }}
        >
          {/* Panel chrome */}
          <div
            style={{
              padding: '12px 18px',
              borderBottom: '1px solid var(--gray-100)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--gray-50)',
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
            </div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', fontWeight: 500, color: 'var(--gray-500)', letterSpacing: '-0.01em' }}>
              {panelTitles[current]}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === current ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === current ? 'var(--blue-600)' : i < current ? 'var(--blue-200)' : 'var(--gray-200)',
                    transition: 'all 0.25s',
                    cursor: 'pointer',
                  }}
                  onClick={() => goStep(i)}
                />
              ))}
            </div>
          </div>

          <div style={{ padding: 24, minHeight: 320 }}>
            {current === 0 && <VisScreen0 />}
            {current === 1 && <VisScreen1 />}
            {current === 2 && <VisScreen2 />}
            {current === 3 && <VisScreen3 />}
            {current === 4 && <VisScreen4 />}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .how-layout-grid { grid-template-columns: 1fr !important; }
          .vis-panel-desktop { display: none !important; }
          #how { padding: 64px 20px !important; }
        }
      `}</style>
    </div>
  )
}

/* ── Step 1: Market ────────────────────────────────────────── */
function VisScreen0() {
  return (
    <div className="vis-screen-active">
      <div style={{ background: '#edf2f9', borderRadius: 12, height: 160, position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {[
          { top: '35%', left: '40%', bg: 'var(--blue-600)', delay: '0s' },
          { top: '55%', left: '62%', bg: 'var(--blue-500)', delay: '0.4s' },
          { top: '28%', left: '68%', bg: 'var(--red)', delay: '0.8s' },
          { top: '65%', left: '28%', bg: 'var(--green)', delay: '0.3s' },
          { top: '48%', left: '22%', bg: 'var(--amber)', delay: '0.6s' },
        ].map((p, i) => (
          <div
            key={i}
            className="mini-pin-dot"
            style={{
              position: 'absolute', width: 11, height: 11, borderRadius: '50%',
              border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.14)',
              background: p.bg, top: p.top, left: p.left, animationDelay: p.delay,
            }}
          />
        ))}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>Nationwide</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--gray-500)', marginTop: 2 }}>All US markets active</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { num: '247', color: 'var(--blue-600)', label: 'Active buyers' },
          { num: '31',  color: 'var(--gray-900)', label: 'Live deals' },
          { num: '$14K', color: 'var(--green)',   label: 'Avg assign fee' },
        ].map((chip) => (
          <div key={chip.label} style={{ flex: 1, background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: chip.color, letterSpacing: '-0.025em', lineHeight: 1 }}>{chip.num}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', marginTop: 4 }}>{chip.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Step 2: Buyer discovery ───────────────────────────────── */
function VisScreen1() {
  return (
    <div className="vis-screen-active">
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 14 }}>
        Verified cash buyers · Discovered from public records
      </div>
      {[
        { initials: 'JM', bg: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', name: 'James M.',  tag: 'SFR · $80K–$150K · Flip · Atlanta, GA',       score: 94 },
        { initials: 'SR', bg: 'linear-gradient(135deg,#0ea5e9,#2563eb)', name: 'Sandra R.', tag: 'Multi-fam · $200K–$400K · Hold · Tampa, FL',    score: 87 },
        { initials: 'DK', bg: 'linear-gradient(135deg,#6366f1,#3b82f6)', name: 'David K.',  tag: 'SFR · $60K–$120K · Flip · Charlotte, NC',       score: 79 },
      ].map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1px solid var(--gray-100)', borderRadius: 10, padding: '11px 13px', marginBottom: 8, background: 'var(--white)' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>
            {b.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--gray-900)' }}>{b.name}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--green)', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 5px' }}>Verified</span>
            </div>
            <div style={{ fontSize: '0.71rem', color: 'var(--gray-400)', marginTop: 2 }}>{b.tag}</div>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--blue-600)', letterSpacing: '-0.02em' }}>{b.score}</div>
        </div>
      ))}
      <div style={{ fontSize: '0.73rem', color: 'var(--gray-400)', textAlign: 'center', marginTop: 4 }}>
        + 244 more buyers in your database
      </div>
    </div>
  )
}

/* ── Step 3: AI calls ──────────────────────────────────────── */
function VisScreen2() {
  return (
    <div className="vis-screen-active">
      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '14px 16px', fontSize: '0.82rem', color: 'var(--gray-500)', lineHeight: 1.75, marginBottom: 14 }}>
        <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>AI Agent:</span>
        {' '}&ldquo;Hi, this is Alex from Premier Acquisitions. I see you recently closed a cash deal in Charlotte — are you looking for more properties in the Carolinas?&rdquo;
        <br /><br />
        <span style={{ color: 'var(--gray-900)', fontWeight: 500 }}>David K.:</span>
        {' '}&ldquo;Yeah, single family, under $120k, Charlotte metro...&rdquo;
        <br /><br />
        <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>AI Agent:</span>
        {' '}&ldquo;Got it. Are you looking to flip or hold?&rdquo;
      </div>
      <div style={{ background: 'var(--white)', border: '1px solid var(--gray-100)', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--gray-400)' }}>Live</div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          {[0, 0.12, 0.24, 0.36, 0.48, 0.6].map((delay, i) => (
            <div key={i} className="cbar-w" style={{ animationDelay: `${delay}s` }} />
          ))}
        </div>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--blue-600)', marginLeft: 'auto' }}>48 calls active</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: '31 qualified', color: 'var(--green)', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: '9 not buying', color: 'var(--red)', bg: '#fef2f2', border: '#fecaca' },
          { label: '8 in progress', color: 'var(--gray-400)', bg: 'var(--gray-50)', border: 'var(--gray-200)' },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '7px 10px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: s.color }}>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Step 4: Deal matching ─────────────────────────────────── */
function VisScreen3() {
  return (
    <div className="vis-screen-active">
      <div style={{ border: '1px solid var(--gray-100)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, background: 'var(--gray-50)' }}>
        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--gray-900)' }}>816 Magnolia Way, Charlotte NC</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 3 }}>3/2 SFR · 1,340 sqft · Distressed · Ask $98,500 · ARV $162K</div>
      </div>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 12 }}>
        Top buyer matches
      </div>
      {[
        { name: 'James M.',  pct: 96, color: 'var(--blue-600)' },
        { name: 'David K.',  pct: 84, color: 'var(--blue-500)' },
        { name: 'Marcus T.', pct: 71, color: 'var(--blue-400)' },
      ].map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--gray-700)', width: 70 }}>{m.name}</div>
          <div style={{ flex: 1, height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: m.color, borderRadius: 3, width: `${m.pct}%` }} />
          </div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: m.color, width: 34, textAlign: 'right' }}>{m.pct}%</div>
        </div>
      ))}
      <div style={{ fontSize: '0.73rem', color: 'var(--gray-400)', borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
        Outreach sent to top 3 automatically · 244 others filtered out
      </div>
    </div>
  )
}

/* ── Step 5: Contract & close ──────────────────────────────── */
function VisScreen4() {
  const [signText, setSignText] = useState('Sign as seller')
  const [sendText, setSendText] = useState('Send to buyer')

  return (
    <div className="vis-screen-active">
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 14 }}>
        Auto-generated assignment contract
      </div>
      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '4px 14px', marginBottom: 14 }}>
        {[
          { k: 'Property',       v: '816 Magnolia Way, Charlotte NC',  c: undefined },
          { k: 'Assignment fee', v: '$16,200',                          c: 'var(--blue-600)' },
          { k: 'Assignee',       v: 'James M.',                         c: undefined },
          { k: 'Closing date',   v: '14 days from execution',           c: undefined },
          { k: 'Template',       v: 'NC-04 · Attorney reviewed',        c: undefined },
        ].map((row, i, arr) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
            <span style={{ fontSize: '0.77rem', color: 'var(--gray-500)' }}>{row.k}</span>
            <span style={{ fontSize: '0.79rem', fontWeight: 600, color: row.c || 'var(--gray-900)' }}>{row.v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setSignText('✓ Signed')}
          style={{ flex: 1, padding: '10px 0', borderRadius: 9, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', border: 'none', background: 'var(--gray-900)', color: 'white', transition: 'background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-700)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--gray-900)' }}
        >
          {signText}
        </button>
        <button
          onClick={() => setSendText('✓ Sent')}
          style={{ flex: 1, padding: '10px 0', borderRadius: 9, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-700)', transition: 'background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-50)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)' }}
        >
          {sendText}
        </button>
      </div>
    </div>
  )
}
