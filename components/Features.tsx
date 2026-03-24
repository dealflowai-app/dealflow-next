'use client'

import { useState, useEffect, useRef } from 'react'

/* ── AI call transcript data ─────────────────────────────── */
const callLines = [
  { from: 'ai', text: 'Hi David, this is Alex from Premier Acquisitions. I see you recently closed a cash deal in Atlanta. Are you still actively buying?', ts: '0:04' },
  { from: 'buyer', text: 'Yeah, definitely. Single family under $150K, Atlanta metro or surrounding areas.', ts: '0:14' },
  { from: 'ai', text: 'Got it. Are you looking to flip or hold for rental income?', ts: '0:22' },
  { from: 'buyer', text: 'Flip. I can close in 10 to 14 days if the numbers are right.', ts: '0:29' },
  { from: 'ai', text: 'Perfect. I have a deal that fits. Sending it over to you right now.', ts: '0:35' },
  { from: 'captured', text: 'SFR · Under $150K · Atlanta, GA · Flip · Close 10 to 14 days', ts: '0:37' },
] as const

const TIMINGS = [800, 3000, 4700, 6100, 7500, 9000]
const LOOP_RESET = 14000
const LOOP_RESTART = 1500
const WAVEFORM_DELAYS = [0.05, 0.2, 0.1, 0.3, 0.15, 0.25, 0.08, 0.18]

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

/* ── Step definitions ────────────────────────────────────── */
const steps = [
  {
    num: '01',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    title: 'Find Real Buyers',
    desc: 'DealFlow AI scans county deed records across 50+ US markets to surface verified cash buyers who have actually closed deals. Not scraped lists. Not aged data. Real buyers pulled from real transactions, updated continuously.',
    badge: 'Data advantage',
    Visual: VisualFindBuyers,
  },
  {
    num: '02',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012 .84h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.17a16 16 0 006.29 6.29l1.69-1.69a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
      </svg>
    ),
    title: 'Call & Qualify at Scale',
    desc: 'AI agents call dozens of buyers simultaneously while you sleep. Every conversation captures buy box, price range, close timeline, and strategy. All structured, all saved to your CRM automatically.',
    badge: 'Core feature',
    Visual: VisualAiCaller,
  },
  {
    num: '03',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Organize & Score',
    desc: 'Every qualified buyer flows into your CRM automatically. Dynamic scoring, auto-tagging, and smart segmentation sort your list into Active, Dormant, and High-Confidence tiers. The database builds itself from your calls.',
    badge: 'Automated',
    Visual: VisualOrganize,
  },
  {
    num: '04',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M3 9h18" /><path d="M9 21V9" />
      </svg>
    ),
    title: 'Match Deals Instantly',
    desc: 'Upload a deal and get instant comps, ARV, and profit projections. DealFlow AI scores the deal, then matches it to your highest-confidence buyers. Precision matching, not mass blasting.',
    badge: 'AI-powered',
    Visual: VisualMatch,
  },
  {
    num: '05',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: 'Close the Deal',
    desc: 'State-specific assignment contracts generated and auto-filled from your deal data. E-signatures collected, offers managed, and a full audit trail from negotiation to signed contract in one place.',
    badge: 'One-click',
    Visual: VisualClose,
  },
  {
    num: '06',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Ask AI',
    desc: 'An AI assistant with full context on your CRM, deals, campaigns, and market data. Ask for deal analysis, buyer recommendations, or strategy coaching. It sees everything your platform sees.',
    badge: 'Intelligence layer',
    Visual: VisualGPT,
  },
]

/* ── Visual 1: Find Real Buyers (map-style) ──────────────── */
function VisualFindBuyers() {
  const records = [
    { name: 'Marcus T.', loc: 'Fulton County, GA', type: 'Cash purchase · SFR', date: '3 days ago', amount: '$127,000' },
    { name: 'Lisa W.', loc: 'DeKalb County, GA', type: 'Cash purchase · Multi-fam', date: '5 days ago', amount: '$215,000' },
    { name: 'Rachel P.', loc: 'Cobb County, GA', type: 'Cash purchase · SFR', date: '8 days ago', amount: '$98,500' },
  ]
  return (
    <div>
      {/* Map header */}
      <div style={{ background: '#0f172a', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>Atlanta Metro</span>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>· 3 counties</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 100, padding: '3px 9px' }}>
          <span className="live-pill-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', display: 'inline-block' }} />
          <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#60A5FA', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Scanning</span>
        </div>
      </div>

      {/* Simulated map area */}
      <div style={{ background: '#1a2332', padding: '20px 18px', position: 'relative', minHeight: 80 }}>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
          {[
            { x: 0, label: 'Fulton', count: 12 },
            { x: 1, label: 'DeKalb', count: 8 },
            { x: 2, label: 'Cobb', count: 6 },
          ].map((pin) => (
            <div key={pin.x} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.2)', border: '2px solid rgba(37,99,235,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#60A5FA' }}>{pin.count}</span>
              </div>
              <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)' }}>{pin.label}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
          26 verified cash buyers found this week
        </div>
      </div>

      {/* Records list */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted-text)', marginBottom: 2 }}>
          Recent deed records
        </div>
        {records.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px', background: 'var(--white)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue-600)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--navy-heading)' }}>{r.name}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--blue-600)', background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 4, padding: '1px 5px' }}>Cash</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', marginTop: 2 }}>{r.loc} · {r.type} · {r.date}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--navy-heading)', letterSpacing: '-0.02em' }}>{r.amount}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Visual 2: AI Voice Caller (animated) ────────────────── */
function VisualAiCaller() {
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

  const nextLine = visible < callLines.length - 1 ? callLines[visible + 1] : null
  const showSpeaking = nextLine !== null && nextLine.from !== 'captured'
  const speakingIsAgent = nextLine?.from === 'ai'

  return (
    <div>
      {/* Call header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 100, padding: '3px 9px' }}>
            <span className="live-pill-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', display: 'inline-block' }} />
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#60A5FA', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Live</span>
          </div>
          <div style={{ fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700, color: '#60A5FA', letterSpacing: '0.04em' }}>
            {fmt(secs)}
          </div>
        </div>
      </div>

      {/* Speaker bar */}
      <div style={{ background: '#1e293b', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, transition: 'all 0.2s' }}>
        {showSpeaking ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {WAVEFORM_DELAYS.map((delay, i) => (
                <div key={i} style={{ width: 2.5, borderRadius: 2, background: speakingIsAgent ? '#60A5FA' : '#c084fc', animation: `wav 0.75s ${delay}s infinite`, height: 5 }} />
              ))}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {speakingIsAgent ? 'AI Agent speaking' : 'David K. speaking'}
            </span>
          </>
        ) : (
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {visible >= callLines.length - 1 ? 'Call complete' : 'Connecting...'}
          </span>
        )}
      </div>

      {/* Transcript */}
      <div style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted-text)' }}>
            Live transcript
          </span>
        </div>
        <div style={{ padding: '14px 18px', minHeight: 196, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {callLines.map((line, i) => {
            if (i > visible) return null
            if (line.from === 'captured') {
              return (
                <div key={i} className="vis-screen-active" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 10, padding: '10px 13px', marginTop: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <div>
                    <div style={{ fontSize: '0.69rem', fontWeight: 700, color: 'var(--blue-700)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Buy box captured
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--blue-900)', fontWeight: 500 }}>{line.text}</div>
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
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted-text)' }}>{line.ts}</span>
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--navy-heading)', lineHeight: 1.6, paddingLeft: 12 }}>
                  {line.text}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer stats */}
      <div style={{ padding: '11px 18px', background: 'var(--warm-gray)', display: 'flex', gap: 20, alignItems: 'center' }}>
        {[
          { val: '48', label: 'calls active', color: 'var(--blue-600)' },
          { val: '31', label: 'qualified', color: 'var(--accent)' },
          { val: '9', label: 'not buying', color: 'var(--muted-text)' },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: 'inherit', fontWeight: 800, fontSize: '1rem', color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.val}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Visual 3: Organize & Score ──────────────────────────── */
function VisualOrganize() {
  const buyers = [
    { initials: 'MT', bg: 'linear-gradient(135deg,#1D4ED8,#2563EB)', name: 'Marcus T.', market: 'Atlanta, GA · SFR Flip', score: 94, tag: 'High-Confidence', tagColor: 'var(--blue-700)', tagBg: 'var(--blue-50)', tagBorder: 'var(--blue-200)' },
    { initials: 'LW', bg: 'linear-gradient(135deg,#0ea5e9,#2563EB)', name: 'Lisa W.', market: 'Charlotte, NC · Multi-fam', score: 87, tag: 'Active', tagColor: 'var(--blue-600)', tagBg: 'var(--blue-50)', tagBorder: 'var(--blue-100)' },
    { initials: 'RP', bg: 'linear-gradient(135deg,#6366f1,#2563EB)', name: 'Rachel P.', market: 'Tampa, FL · SFR Hold', score: 72, tag: 'Dormant', tagColor: 'var(--body-text)', tagBg: 'var(--warm-gray)', tagBorder: 'var(--border-med)' },
  ]
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)' }}>
          Buyer pipeline · auto-updated
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Active', 'High-Conf.'].map((f, i) => (
            <span key={f} style={{ fontSize: '0.62rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: i === 0 ? 'var(--blue-50)' : 'transparent', color: i === 0 ? 'var(--blue-600)' : 'var(--muted-text)', border: `1px solid ${i === 0 ? 'var(--blue-100)' : 'var(--border-med)'}` }}>{f}</span>
          ))}
        </div>
      </div>
      {buyers.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border-light)', borderRadius: 10, padding: '11px 14px', marginBottom: 8, background: 'var(--white)' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, flexShrink: 0 }}>{b.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy-heading)' }}>{b.name}</span>
              <span style={{ fontSize: '0.58rem', fontWeight: 600, color: b.tagColor, background: b.tagBg, border: `1px solid ${b.tagBorder}`, borderRadius: 4, padding: '1px 6px' }}>{b.tag}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginTop: 2 }}>{b.market}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--blue-600)', letterSpacing: '-0.02em' }}>{b.score}%</div>
            <div style={{ width: 40, height: 4, background: 'var(--border-light)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${b.score}%`, background: 'var(--blue-600)', borderRadius: 2 }} />
            </div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 4, background: 'var(--cream)', borderRadius: 10, padding: '10px 14px', fontSize: '0.77rem', color: 'var(--body-text)' }}>
        <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>247 buyers</span> scored and segmented automatically from call data
      </div>
    </div>
  )
}

/* ── Visual 4: Match Deals Instantly ─────────────────────── */
function VisualMatch() {
  const [scores, setScores] = useState([0, 0, 0])
  const targets = [91, 85, 78]
  const colors = ['var(--blue-600)', 'var(--blue-500)', 'var(--blue-400)']
  const buyers = [
    { name: 'Carlos M.', tags: 'SFR · Flip · Atlanta' },
    { name: 'Priya S.', tags: 'SFR · Flip · Decatur' },
    { name: 'Nate D.', tags: 'SFR · Hold · Smyrna' },
  ]

  useEffect(() => {
    const timers = targets.map((t, i) =>
      setTimeout(() => setScores((prev) => { const n = [...prev]; n[i] = t; return n }), 200 + i * 300)
    )
    return () => timers.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)', marginBottom: 16 }}>
        4217 Elm St, Atlanta GA · Deal analysis
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'ARV', val: '$168K', color: 'var(--navy-heading)' },
          { label: 'Spread', val: '$47K', color: 'var(--accent)' },
          { label: 'Deal Score', val: '87/100', color: 'var(--blue-600)' },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, background: 'var(--warm-gray)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted-text)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: s.color, letterSpacing: '-0.02em' }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted-text)', marginBottom: 12 }}>
        Top matched buyers
      </div>
      {buyers.map((b, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy-heading)' }}>{b.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginLeft: 8 }}>{b.tags}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: colors[i], letterSpacing: '-0.02em' }}>{scores[i]}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: colors[i], borderRadius: 4, width: `${scores[i]}%`, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: '0.73rem', color: 'var(--muted-text)', borderTop: '1px solid var(--border-light)', paddingTop: 10, marginTop: 2 }}>
        244 buyers filtered out · Top 3 contacted automatically
      </div>
    </div>
  )
}

/* ── Visual 5: Close the Deal ────────────────────────────── */
function VisualClose() {
  const stages: { label: string; done: boolean; active?: boolean }[] = [
    { label: 'Matched', done: true },
    { label: 'Offer sent', done: true },
    { label: 'Signed', done: true },
    { label: 'Closing', done: false, active: true },
    { label: 'Done', done: false },
  ]
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)', marginBottom: 20 }}>
        1840 Birch Dr, Marietta GA · Transaction
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
        {stages.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < stages.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.64rem', background: s.done ? 'var(--blue-600)' : s.active ? 'var(--white)' : 'var(--border-light)', border: s.active ? '2px solid var(--blue-600)' : 'none', color: s.done ? 'white' : s.active ? 'var(--blue-600)' : 'var(--muted-text)', fontWeight: 700, flexShrink: 0 }}>
                {s.done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: '0.56rem', color: s.done || s.active ? 'var(--navy-heading)' : 'var(--muted-text)', fontWeight: s.active ? 600 : 400, whiteSpace: 'nowrap' }}>{s.label}</div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: 1, height: 2, background: s.done ? 'var(--blue-600)' : 'var(--border-med)', marginBottom: 20, marginLeft: 4, marginRight: 4 }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ background: 'var(--warm-gray)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted-text)', marginBottom: 2 }}>Fee</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent)', letterSpacing: '-0.02em' }}>+$12,800</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted-text)', marginBottom: 2 }}>Days</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--navy-heading)' }}>9</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted-text)', marginBottom: 2 }}>E-sign</div>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--blue-600)' }}>Complete ✓</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Contract auto-filled', icon: '✓' },
          { label: 'Signatures collected', icon: '✓' },
          { label: 'Audit trail saved', icon: '✓' },
        ].map((item) => (
          <div key={item.label} style={{ flex: 1, background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', fontSize: '0.68rem', color: 'var(--blue-900)', fontWeight: 500 }}>
            <span style={{ color: 'var(--blue-700)', marginRight: 4 }}>{item.icon}</span>{item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Visual 6: Ask AI ──────────────────────────────── */
function VisualGPT() {
  const messages = [
    { from: 'user', text: 'I just got a lead on 4217 Elm St. Should I pursue it or pass?' },
    { from: 'ai', text: 'Based on your market data, this property has a 67% spread with an ARV of $168K. I matched it against your CRM and Carlos M. is a 91% fit. He closed a similar deal in this zip code last month. I\'d recommend sending the deal package now.' },
  ]
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)', marginBottom: 16 }}>
        Ask AI · Full account context
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: '0.67rem', fontWeight: 700, color: m.from === 'ai' ? 'var(--blue-600)' : 'var(--body-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {m.from === 'ai' ? 'Ask AI' : 'You'}
            </div>
            <div style={{ background: m.from === 'ai' ? 'var(--blue-50)' : 'var(--warm-gray)', border: `1px solid ${m.from === 'ai' ? 'var(--blue-100)' : 'var(--border-light)'}`, borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem', color: 'var(--navy-heading)', lineHeight: 1.6 }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['CRM data', 'Market comps', 'Call history', 'Deal pipeline'].map((tag) => (
          <span key={tag} style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--blue-600)', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 20, padding: '3px 10px' }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Main Features component ─────────────────────────────── */
const AUTO_ADVANCE_MS = 4000

export default function Features() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const sectionRef = useRef<HTMLDivElement>(null)
  const isVisible = useRef(true)
  const timerStart = useRef(Date.now())
  const rafRef = useRef<number>(0)
  const ActiveVisual = steps[active].Visual

  // Auto-advance timer with progress bar
  useEffect(() => {
    timerStart.current = Date.now()
    setProgress(0)

    function tick() {
      if (!isVisible.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const elapsed = Date.now() - timerStart.current
      const pct = Math.min(elapsed / AUTO_ADVANCE_MS, 1)
      setProgress(pct)
      if (pct >= 1) {
        setActive((prev) => (prev + 1) % steps.length)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  // Stop auto-advance when section scrolls out of view
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { isVisible.current = entry.isIntersecting },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function handleTabClick(i: number) {
    setActive(i)
    timerStart.current = Date.now()
    setProgress(0)
  }

  return (
    <div
      id="how"
      ref={sectionRef}
      style={{
        padding: '96px 40px',
        background: 'var(--white)',
        borderTop: '1px solid var(--border-light)',
      }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        {/* Header */}
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14, fontFamily: "'Satoshi', sans-serif" }}>
            How it works
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(1.9rem, 3vw, 2.8rem)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.022em', color: 'var(--navy-heading)', marginBottom: 14, textTransform: 'capitalize' }}>
            From county records to <span style={{ color: 'var(--accent)' }}>signed contracts.</span>
          </h2>
          <p style={{ fontSize: '0.97rem', color: 'var(--body-text)', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
            Six steps. One connected system. Every engine feeds the next so nothing falls through the cracks.
          </p>
        </div>

        {/* Pipeline tabs */}
        <div className="features-tabs stagger-children" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 44, gap: 6, flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => handleTabClick(i)}
              className="features-tab-btn"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 14px',
                borderRadius: 10,
                border: active === i ? '1px solid var(--accent)' : '1px solid var(--border-med)',
                background: active === i ? 'var(--accent-bg)' : 'var(--white)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                fontWeight: active === i ? 600 : 500,
                color: active === i ? 'var(--accent)' : 'var(--body-text)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <span style={{ color: 'currentColor' }}>{s.icon}</span>
              <span className="features-tab-label">{s.title}</span>
              {active === i && (
                <div className="features-tab-progress" style={{ width: `${progress * 100}%` }} />
              )}
            </button>
          ))}
        </div>

        {/* Active step detail */}
        <div className="features-detail reveal" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 48, alignItems: 'start' }}>
          {/* Left: description */}
          <div style={{ paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--blue-50)', border: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-600)' }}>
                {steps[active].icon}
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--blue-600)', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {steps[active].badge}
              </span>
            </div>
            <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, fontWeight: 400, color: 'var(--navy-heading)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 14 }}>
              {steps[active].title}
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--body-text)', lineHeight: 1.7 }}>
              {steps[active].desc}
            </p>

            {/* Step indicator dots */}
            <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleTabClick(i)}
                  style={{
                    width: active === i ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: active === i ? 'var(--accent)' : i < active ? 'var(--accent-bright)' : 'var(--border-med)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right: visual */}
          <div style={{ background: 'var(--white)', border: '1px solid var(--border-light)', borderRadius: 'var(--dash-card-radius, 10px)', overflow: 'hidden', boxShadow: 'var(--shadow)', minHeight: 280 }}>
            <div className="vis-screen-active" key={active} style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <ActiveVisual />
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 860px) {
          #how { padding: 64px 20px !important; }
          .features-detail { grid-template-columns: 1fr !important; gap: 24px !important; }
          .features-tab-label { display: none; }
          .features-tabs { gap: 4px !important; flex-wrap: wrap !important; }
          .features-tab-btn { padding: 8px 10px !important; }
        }
        @media (max-width: 520px) {
          .features-tab-btn span:first-child { display: none; }
        }
      ` }} />
    </div>
  )
}
