'use client'

import { useState, useEffect, useRef } from 'react'

const steps = [
  {
    name: 'Choose your market',
    desc: 'Enter any city, county, or zip in the US. The system instantly knows which public records to pull and which buyers are actively purchasing there. Run multiple markets on higher tiers.',
  },
  {
    name: 'Find verified cash buyers',
    desc: 'We scan county property records and surface everyone who bought real estate with cash in the last 6–12 months. Proven buyers with real transaction history — not a generic purchased list.',
  },
  {
    name: 'AI calls and qualifies them',
    desc: 'AI voice agents call dozens of buyers simultaneously. Natural conversations that capture buy box, price range, property type, and close speed — all saved automatically, nothing missed.',
  },
  {
    name: 'Smart deal matching',
    desc: 'Upload a property. The platform finds the exact buyers who match on preference, price, strategy, and close probability. Your deal goes to the right people — not a mass blast to everyone.',
  },
  {
    name: 'Contract and close',
    desc: 'Buyers make offers inside the platform. You negotiate, accept, and the system generates your assignment contract with state-specific legal language. E-signatures collected. Deal done.',
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
      style={{
        maxWidth: 1160,
        margin: '0 auto',
        padding: '96px 40px',
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14 }}>
        How it works
      </div>
      <h2
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 'clamp(1.9rem, 3vw, 2.8rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.04em',
          color: 'var(--gray-900)',
        }}
      >
        From market to <span style={{ color: 'var(--blue-600)' }}>closed deal</span> in 5 steps
      </h2>
      <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.7, marginTop: 14, maxWidth: 520 }}>
        Everything a full disposition team does — running automatically the moment you turn it on.
      </p>

      <div
        className="how-layout-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr',
          gap: 60,
          marginTop: 56,
          alignItems: 'start',
        }}
      >
        {/* Steps col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {steps.map((step, i) => (
            <div
              key={i}
              onClick={() => goStep(i)}
              style={{
                display: 'flex',
                gap: 16,
                padding: '18px 16px',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: `1px solid ${current === i ? 'var(--gray-200)' : 'transparent'}`,
                background: current === i ? 'var(--white)' : 'transparent',
                boxShadow: current === i ? 'var(--shadow-sm)' : 'none',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (current !== i) e.currentTarget.style.background = 'var(--gray-50)'
              }}
              onMouseLeave={e => {
                if (current !== i) e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* Progress line */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: 'var(--gray-100)',
                  borderRadius: '0 3px 3px 0',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="step-prog-fill"
                  style={{ height: current === i ? `${progress}%` : '0%' }}
                />
              </div>

              {/* Circle */}
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: current === i ? 'var(--blue-600)' : 'var(--gray-100)',
                  color: current === i ? 'white' : 'var(--gray-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {i + 1}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--gray-900)', marginBottom: 4 }}>
                  {step.name}
                </div>
                {current === i && (
                  <div style={{ fontSize: '0.84rem', color: 'var(--gray-500)', lineHeight: 1.6 }}>
                    {step.desc}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Vis panel */}
        <div
          className="vis-panel-desktop"
          style={{
            position: 'sticky',
            top: 82,
            background: 'var(--white)',
            border: '1px solid var(--gray-200)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: 'var(--shadow)',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: '13px 18px',
              borderBottom: '1px solid var(--gray-100)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', marginLeft: 4 }}>
              {panelTitles[current]}
            </div>
          </div>

          <div style={{ padding: 22, minHeight: 320 }}>
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

function VisScreen0() {
  return (
    <div className="vis-screen-active">
      {/* Mini map */}
      <div style={{ background: '#edf2f9', borderRadius: 10, height: 170, position: 'relative', overflow: 'hidden', marginBottom: 14 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.65) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
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
              position: 'absolute',
              width: 12,
              height: 12,
              borderRadius: '50%',
              border: '2px solid white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              background: p.bg,
              top: p.top,
              left: p.left,
              animationDelay: p.delay,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: 'var(--gray-900)' }}>Dallas, TX</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 2 }}>Market selected</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { num: '247', numColor: 'var(--blue-600)', label: 'Active buyers' },
          { num: '31', numColor: 'var(--gray-900)', label: 'Live deals' },
          { num: '$14K', numColor: 'var(--green)', label: 'Avg assign fee' },
        ].map((chip, i) => (
          <div key={i} style={{ flex: 1, background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: chip.numColor, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {chip.num}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 3 }}>{chip.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VisScreen1() {
  return (
    <div className="vis-screen-active">
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 12 }}>
        Verified cash buyers — Dallas, TX
      </div>
      {[
        { initials: 'JM', bg: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', name: 'James M.', tag: 'SFR · $80K–$150K · Flip · North Dallas', score: 94 },
        { initials: 'SR', bg: 'linear-gradient(135deg, #0ea5e9, #2563eb)', name: 'Sandra R.', tag: 'Multi-fam · $200K–$400K · Hold · Irving', score: 87 },
        { initials: 'DK', bg: 'linear-gradient(135deg, #6366f1, #3b82f6)', name: 'David K.', tag: 'SFR · $60K–$120K · Flip · Mesquite', score: 79 },
      ].map((buyer, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 9, padding: '11px 13px', marginBottom: 7 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', color: 'white', flexShrink: 0, background: buyer.bg }}>
            {buyer.initials}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-900)' }}>{buyer.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 1 }}>{buyer.tag}</div>
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: 'var(--blue-600)', marginLeft: 'auto' }}>
            {buyer.score}
          </div>
        </div>
      ))}
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 8, textAlign: 'center' }}>
        + 244 more verified buyers in database
      </div>
    </div>
  )
}

function VisScreen2() {
  return (
    <div className="vis-screen-active">
      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 10, padding: 13, fontSize: '0.8rem', color: 'var(--gray-500)', lineHeight: 1.75, marginBottom: 11 }}>
        <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>AI Agent:</span> &ldquo;Hi, this is Alex from Premier Acquisitions. I see you recently closed a cash deal in Mesquite — are you looking for more properties in Dallas?&rdquo;<br /><br />
        <span style={{ color: 'var(--gray-900)' }}>David K.:</span> &ldquo;Yeah, single family, under $120k, preferably Mesquite or North Dallas...&rdquo;<br /><br />
        <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>AI Agent:</span> &ldquo;Got it. Are you looking to flip or hold for rental income?&rdquo;
      </div>
      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 9, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: '0.74rem', color: 'var(--gray-400)', minWidth: 46 }}>Live</div>
        {[0, 0.12, 0.24, 0.36, 0.48, 0.6].map((delay, i) => (
          <div key={i} className="cbar-w" style={{ animationDelay: `${delay}s` }} />
        ))}
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--blue-600)', marginLeft: 'auto' }}>48 calls active</div>
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: '0.76rem' }}>
        <span style={{ color: 'var(--green)' }}>✓ 31 qualified</span>
        <span style={{ color: 'var(--red)' }}>✗ 9 not buying</span>
        <span style={{ color: 'var(--gray-400)' }}>⟳ 8 in progress</span>
      </div>
    </div>
  )
}

function VisScreen3() {
  return (
    <div className="vis-screen-active">
      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 9, padding: '12px 14px', marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-900)' }}>4821 Maple Ave, Dallas TX</div>
        <div style={{ fontSize: '0.73rem', color: 'var(--gray-500)', marginTop: 2 }}>3/2 SFR · 1,340 sqft · Distressed · Ask $98,500 · ARV $162K</div>
      </div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 10 }}>
        Top buyer matches
      </div>
      {[
        { name: 'James M.', pct: 96 },
        { name: 'David K.', pct: 84 },
        { name: 'Marcus T.', pct: 71 },
      ].map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)', minWidth: 74 }}>{m.name}</div>
          <div style={{ flex: 1, height: 7, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--blue-600)', borderRadius: 4, width: `${m.pct}%`, transition: 'width 1s ease' }} />
          </div>
          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--blue-600)', minWidth: 32, textAlign: 'right' }}>{m.pct}%</div>
        </div>
      ))}
      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 10 }}>
        Outreach sent to top 3 matched buyers automatically
      </div>
    </div>
  )
}

function VisScreen4() {
  const [signText, setSignText] = useState('Sign as seller')
  const [sendText, setSendText] = useState('Send to buyer')

  return (
    <div className="vis-screen-active">
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 12 }}>
        Auto-generated assignment contract
      </div>
      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 10, padding: 14 }}>
        {[
          { k: 'Property', v: '4821 Maple Ave, Dallas TX', vColor: undefined },
          { k: 'Assignment fee', v: '$12,500', vColor: 'var(--blue-600)' },
          { k: 'Assignee', v: 'James M.', vColor: undefined },
          { k: 'Closing date', v: '14 days from execution', vColor: undefined },
          { k: 'Template', v: 'Texas TX-04 · Attorney reviewed', vColor: undefined },
        ].map((row, i, arr) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--gray-100)' : 'none',
            }}
          >
            <span style={{ fontSize: '0.77rem', color: 'var(--gray-500)' }}>{row.k}</span>
            <span style={{ fontSize: '0.79rem', fontWeight: 600, color: row.vColor || 'var(--gray-900)' }}>{row.v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
        <button
          onClick={() => setSignText('✓ Signed')}
          style={{ flex: 1, padding: 10, borderRadius: 8, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s', border: 'none', background: 'var(--blue-600)', color: 'white' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-700)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue-600)' }}
        >
          {signText}
        </button>
        <button
          onClick={() => setSendText('✓ Sent')}
          style={{ flex: 1, padding: 10, borderRadius: 8, fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s', border: 'none', background: 'var(--gray-100)', color: 'var(--gray-700)' }}
        >
          {sendText}
        </button>
      </div>
    </div>
  )
}
