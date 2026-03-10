'use client'

import { useState, useEffect, useRef } from 'react'

const lines = [
  { from: 'ai', text: 'Hi David, this is Alex from Premier Acquisitions. I see you recently closed a cash deal in Atlanta. Are you still actively buying?', ts: '0:04' },
  { from: 'buyer', text: 'Yeah, definitely. Single family under $150K, Atlanta metro or surrounding areas.', ts: '0:14' },
  { from: 'ai', text: 'Got it. Are you looking to flip or hold for rental income?', ts: '0:22' },
  { from: 'buyer', text: 'Flip. I can close in 10 to 14 days if the numbers are right.', ts: '0:29' },
  { from: 'ai', text: 'Perfect. I have a deal that fits. Sending it over to you right now.', ts: '0:35' },
  { from: 'captured', text: 'SFR · Under $150K · Atlanta, GA · Flip · Close 10–14 days', ts: '0:37' },
] as const

const TIMINGS = [800, 3000, 4700, 6100, 7500, 9000]
const LOOP_RESET = 14000
const LOOP_RESTART = 1500

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

const WAVEFORM_DELAYS = [0.05, 0.2, 0.1, 0.3, 0.15, 0.25, 0.08, 0.18]

export default function AiCallDemo() {
  const [visible, setVisible] = useState(-1)
  const [secs, setSecs] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null)

  function run() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (ticker.current) clearInterval(ticker.current)
    setVisible(-1)
    setSecs(0)

    ticker.current = setInterval(() => setSecs((s) => s + 1), 1000)

    TIMINGS.forEach((ms, i) => {
      timers.current.push(setTimeout(() => setVisible(i), ms))
    })
    timers.current.push(
      setTimeout(() => {
        if (ticker.current) clearInterval(ticker.current)
        timers.current.push(setTimeout(run, LOOP_RESTART))
      }, LOOP_RESET)
    )
  }

  useEffect(() => {
    run()
    return () => {
      timers.current.forEach(clearTimeout)
      if (ticker.current) clearInterval(ticker.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Who speaks next (determines waveform color + label)
  const nextLine = visible < lines.length - 1 ? lines[visible + 1] : null
  const showSpeaking = nextLine !== null && nextLine.from !== 'captured'
  const speakingIsAgent = nextLine?.from === 'ai'

  return (
    <div
      className="ai-call-section"
      style={{ padding: '96px 40px', background: 'var(--white)', borderTop: '1px solid var(--gray-100)' }}
    >
      <div
        className="ai-call-grid"
        style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'flex-start' }}
      >
        {/* Left: text */}
        <div style={{ position: 'sticky', top: 120, alignSelf: 'start' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14 }}>
            AI voice outreach
          </p>
          <h2
            style={{
              fontFamily: 'inherit',
              fontSize: 'clamp(1.9rem, 3vw, 2.8rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              color: 'var(--gray-900)',
              marginBottom: 18,
            }}
          >
            Your AI calls buyers<br />
            while you <span style={{ color: 'var(--blue-600)' }}>sleep</span>
          </h2>
          <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.7, marginBottom: 32, maxWidth: 420 }}>
            The moment you activate a campaign, AI voice agents call dozens of buyers simultaneously, capturing their buy box, price range, and close timeline. You wake up to a qualified list, nothing missed.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Calls 50+ buyers simultaneously with no queue and no wait',
              'Captures buy box, price range, and close speed on every call',
              'All structured buyer data saved to your database automatically',
            ].map((text) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.88rem', color: 'var(--gray-700)', lineHeight: 1.6 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--blue-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0, marginTop: 2 }}>
                  ✓
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: call widget */}
        <div style={{ background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>

          {/* Call header — dark phone-call style */}
          <div style={{ background: '#0f172a', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 3px rgba(37,99,235,0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012 .84h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.17a16 16 0 006.29 6.29l1.69-1.69a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.87rem', fontWeight: 600, color: 'white', lineHeight: 1, marginBottom: 4 }}>
                David K. · +1 (214) 555-0147
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
                Atlanta, GA · AI outreach campaign
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 100, padding: '3px 9px' }}>
                <span className="live-pill-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#4ade80', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Live</span>
              </div>
              <div style={{ fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700, color: '#4ade80', letterSpacing: '0.04em' }}>
                {fmt(secs)}
              </div>
            </div>
          </div>

          {/* Active speaker bar */}
          <div
            style={{
              background: '#1e293b',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minHeight: 36,
              transition: 'all 0.2s',
            }}
          >
            {showSpeaking ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {WAVEFORM_DELAYS.map((delay, i) => (
                    <div
                      key={i}
                      style={{
                        width: 2.5,
                        borderRadius: 2,
                        background: speakingIsAgent ? '#60a5fa' : '#c084fc',
                        animation: `wav 0.75s ${delay}s infinite`,
                        height: 5,
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {speakingIsAgent ? 'AI Agent speaking' : 'David K. speaking'}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {visible >= lines.length - 1 ? 'Call complete' : 'Connecting...'}
              </span>
            )}
          </div>

          {/* Transcript */}
          <div style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--gray-100)' }}>
              <span style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--gray-400)' }}>
                Live transcript
              </span>
            </div>
            <div style={{ padding: '14px 18px', minHeight: 196, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {lines.map((line, i) => {
                if (i > visible) return null

                if (line.from === 'captured') {
                  return (
                    <div
                      key={i}
                      className="vis-screen-active"
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 13px', marginTop: 2 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <div>
                        <div style={{ fontSize: '0.69rem', fontWeight: 700, color: '#16a34a', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Buy box captured
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 500 }}>{line.text}</div>
                      </div>
                    </div>
                  )
                }

                const isAi = line.from === 'ai'
                return (
                  <div key={i} className="vis-screen-active" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: isAi ? 'var(--blue-500)' : '#a855f7', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.67rem', fontWeight: 700, color: isAi ? 'var(--blue-600)' : '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {isAi ? 'Agent' : 'David K.'}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>{line.ts}</span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--gray-700)', lineHeight: 1.6, paddingLeft: 12 }}>
                      {line.text}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer stats */}
          <div style={{ padding: '11px 18px', background: 'var(--gray-50)', display: 'flex', gap: 20, alignItems: 'center' }}>
            {[
              { val: '48', label: 'calls active', color: 'var(--blue-600)' },
              { val: '31', label: 'qualified', color: 'var(--green)' },
              { val: '9', label: 'not buying', color: 'var(--gray-400)' },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: 'inherit', fontWeight: 800, fontSize: '1rem', color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {s.val}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .ai-call-section { padding: 64px 20px !important; }
          .ai-call-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </div>
  )
}
