'use client'

import { useEffect, useRef, useState } from 'react'

/* ── Scroll-triggered visibility hook ── */
function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible] as const
}

/* ── AI call transcript data ── */
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

/* ── Pipeline step labels ── */
const pipelineSteps = ['Find Buyers', 'Call & Qualify', 'Organize & Score', 'Match Deals', 'Close the Deal', 'Ask AI']

/* ── Block config ── */
const blocks = [
  {
    eyebrow: 'DATA ADVANTAGE',
    heading: 'Find Real Buyers',
    body: 'DealFlow AI scans county deed records across 50+ US markets to surface verified cash buyers who have actually closed deals. Not scraped lists. Real buyers pulled from real transactions.',
    points: [
      'Real deed records, verified purchases',
      'Phone + email enrichment',
      'Filter by type, price, market, strategy',
    ],
    mockup: MockupFindBuyers,
  },
  {
    eyebrow: 'CORE FEATURE',
    heading: 'Call & Qualify at Scale',
    body: 'AI agents call dozens of buyers simultaneously while you sleep. Every conversation captures buy box, price range, close timeline, and strategy. All structured, all saved to your CRM automatically.',
    points: [
      'Natural AI voice, not robocalls',
      'Buy box captured automatically',
      'Live transcript + call recording',
    ],
    mockup: MockupAiCaller,
  },
  {
    eyebrow: 'AUTOMATED',
    heading: 'Organize & Score',
    body: 'Every qualified buyer flows into your CRM automatically. Dynamic scoring, auto-tagging, and smart segmentation sort your list into Active, Dormant, and High-Confidence tiers.',
    points: [
      'Auto-import from AI calls',
      'Dynamic confidence scoring',
      'Smart tags and segmentation',
    ],
    mockup: MockupOrganize,
  },
  {
    eyebrow: 'AI-POWERED',
    heading: 'Match Deals Instantly',
    body: 'Upload a deal and get instant comps, ARV, and profit projections. DealFlow AI scores the deal, then matches it to your highest-confidence buyers. Precision matching, not mass blasting.',
    points: [
      'Weighted ARV from scored comps',
      'AI buyer-deal matching',
      'Top 3 contacted automatically',
    ],
    mockup: MockupMatch,
  },
  {
    eyebrow: 'ONE-CLICK',
    heading: 'Close the Deal',
    body: 'State-specific assignment contracts generated and auto-filled from your deal data. E-signatures collected, offers managed, and a full audit trail from negotiation to signed contract.',
    points: [
      'Auto-generated contracts for all 50 states',
      'E-signatures + full audit trail',
      'Track every deal from match to close',
    ],
    mockup: MockupClose,
  },
  {
    eyebrow: 'INTELLIGENCE LAYER',
    heading: 'Ask AI',
    body: 'An AI assistant with full context on your CRM, deals, campaigns, and market data. Ask for deal analysis, buyer recommendations, or strategy coaching. It sees everything your platform sees.',
    points: [
      'Full account context awareness',
      'Deal analysis + buyer recommendations',
      'Strategy coaching on demand',
    ],
    mockup: MockupAskAI,
  },
]

export default function ProductShowcase() {
  const [activeStep, setActiveStep] = useState(-1)
  const blockRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const els = blockRefs.current.filter(Boolean) as HTMLDivElement[]
    if (els.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.idx)
            if (!isNaN(idx)) setActiveStep(prev => Math.max(prev, idx))
          }
        })
      },
      { threshold: 0.15 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <section id="product-showcase" style={{ padding: '120px 40px 60px', background: 'var(--cream)', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        {/* Section header */}
        <div className="reveal" style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 14,
          }}>
            THE PLATFORM
          </div>
          <h2 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.022em',
            color: 'var(--navy-heading)',
            marginBottom: 14,
          }}>
            One platform. Every tool you need.
          </h2>
          <p style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: '0.95rem',
            color: 'var(--body-text)',
            lineHeight: 1.7,
            maxWidth: 520,
            margin: '0 auto',
          }}>
            Six steps. One connected system. Every engine feeds the next so nothing falls through the cracks.
          </p>
        </div>

        {/* How it works pipeline connector */}
        <div className="reveal pipeline-connector">
          {pipelineSteps.map((step, i) => (
            <div key={step} className="pipeline-step-wrap">
              <div className={`pipeline-step${activeStep >= i ? ' pipeline-step-active' : ''}`}>
                <span className="pipeline-num">{i + 1}</span>
                <span className="pipeline-label">{step}</span>
              </div>
              {i < pipelineSteps.length - 1 && <div className={`pipeline-line${activeStep > i ? ' pipeline-line-active' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Alternating blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 120 }}>
          {blocks.map((block, i) => {
            const isReversed = i % 2 === 1
            const Mockup = block.mockup
            return (
              <div ref={el => { blockRefs.current[i] = el }} data-idx={i} key={i} className="showcase-block" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
                {/* Text side */}
                <div className={isReversed ? 'reveal-right showcase-block-text showcase-order-2' : 'reveal-left showcase-block-text'} style={{ order: isReversed ? 2 : 1 }}>
                  <div className="reveal reveal-delay-1" style={{
                    display: 'inline-block',
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    background: 'var(--accent-bg)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: 20,
                    padding: '4px 12px',
                    marginBottom: 16,
                  }}>
                    {block.eyebrow}
                  </div>
                  <h3 style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: 'clamp(1.6rem, 2.5vw, 2.1rem)',
                    fontWeight: 400,
                    color: 'var(--navy-heading)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                    marginBottom: 16,
                  }}>
                    {block.heading}
                  </h3>
                  <p style={{
                    fontFamily: "'Satoshi', sans-serif",
                    fontSize: '0.92rem',
                    fontWeight: 400,
                    color: 'var(--body-text)',
                    lineHeight: 1.7,
                    marginBottom: 24,
                  }}>
                    {block.body}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {block.points.map((p, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--body-text)', fontFamily: "'Satoshi', sans-serif" }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mockup side */}
                <div className={isReversed ? 'reveal-left showcase-block-mockup' : 'reveal-right showcase-block-mockup reveal-delay-2'} style={{ order: isReversed ? 1 : 2 }}>
                  <div style={{
                    background: 'var(--white)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--dash-card-radius, 10px)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                  }}>
                    <Mockup />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .pipeline-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 80px;
          flex-wrap: wrap;
          gap: 4px 0;
        }
        .pipeline-step-wrap {
          display: flex;
          align-items: center;
        }
        .pipeline-step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 100px;
          border: 1px solid var(--border-light);
          background: var(--white);
          transition: all 0.5s ease;
        }
        .pipeline-step-active {
          border-color: var(--accent-border);
          background: var(--accent-bg);
        }
        .pipeline-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 700;
          font-family: 'Satoshi', sans-serif;
          background: var(--border-light);
          color: var(--muted-text);
          transition: all 0.5s ease;
        }
        .pipeline-step-active .pipeline-num {
          background: var(--accent);
          color: white;
        }
        .pipeline-label {
          font-family: 'Satoshi', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--muted-text);
          transition: color 0.5s ease;
        }
        .pipeline-step-active .pipeline-label {
          color: var(--accent);
        }
        .pipeline-line {
          width: 28px;
          height: 2px;
          background: var(--border-light);
          margin: 0 4px;
          transition: background 0.5s ease;
        }
        .pipeline-line-active {
          background: var(--accent);
        }
        @keyframes showcaseFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wav {
          0%, 100% { height: 5px; }
          50% { height: 16px; }
        }
        @media (max-width: 860px) {
          #product-showcase { padding: 80px 20px 40px !important; }
          .showcase-block {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .showcase-block-text { order: 1 !important; }
          .showcase-block-mockup { order: 2 !important; }
          .pipeline-connector { display: none; }
        }
      ` }} />
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MOCKUP 1: Find Buyers - Map + deed records
   ══════════════════════════════════════════════════════════════════ */
function MockupFindBuyers() {
  const [ref, visible] = useInView(0.2)
  const records = [
    { name: 'Marcus T.', loc: 'Fulton County, GA', type: 'Cash purchase · SFR', date: '3 days ago', amount: '$127,000' },
    { name: 'Lisa W.', loc: 'DeKalb County, GA', type: 'Cash purchase · Multi-fam', date: '5 days ago', amount: '$215,000' },
    { name: 'Rachel P.', loc: 'Cobb County, GA', type: 'Cash purchase · SFR', date: '8 days ago', amount: '$98,500' },
  ]
  return (
    <div ref={ref}>
      {/* Map header */}
      <div style={{ background: '#0f172a', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'white', fontFamily: "'Satoshi', sans-serif" }}>Atlanta Metro</span>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'Satoshi', sans-serif" }}>· 3 counties</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 100, padding: '3px 9px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', display: 'inline-block', animation: visible ? 'livePulse 2s ease infinite' : undefined }} />
          <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#60A5FA', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: "'Satoshi', sans-serif" }}>Scanning</span>
        </div>
      </div>

      {/* Simulated map area */}
      <div style={{ background: '#1a2332', padding: '20px 18px' }}>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
          {[{ label: 'Fulton', count: 12 }, { label: 'DeKalb', count: 8 }, { label: 'Cobb', count: 6 }].map((pin) => (
            <div key={pin.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.2)', border: '2px solid rgba(37,99,235,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#60A5FA', fontFamily: "'Satoshi', sans-serif" }}>{pin.count}</span>
              </div>
              <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'Satoshi', sans-serif" }}>{pin.label}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: "'Satoshi', sans-serif", transition: 'all 0.4s ease' }}>
          {visible ? '27' : '26'} verified cash buyers found this week
        </div>
      </div>

      {/* Records list */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted-text)', marginBottom: 2, fontFamily: "'Satoshi', sans-serif" }}>
          Recent deed records
        </div>
        {records.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 14px', background: 'var(--white)',
            opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity 0.4s ${0.3 + i * 0.15}s ease, transform 0.4s ${0.3 + i * 0.15}s ease`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue-600)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--navy-heading)', fontFamily: "'Satoshi', sans-serif" }}>{r.name}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--blue-600)', background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 4, padding: '1px 5px', fontFamily: "'Satoshi', sans-serif" }}>Cash</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', marginTop: 2, fontFamily: "'Satoshi', sans-serif" }}>{r.loc} · {r.type} · {r.date}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--navy-heading)', fontFamily: "'Satoshi', sans-serif" }}>{r.amount}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MOCKUP 2: AI Caller - Animated call transcript
   ══════════════════════════════════════════════════════════════════ */
function MockupAiCaller() {
  const [visible, setVisible] = useState(-1)
  const [secs, setSecs] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)

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
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          run()
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      timers.current.forEach(clearTimeout)
      if (ticker.current) clearInterval(ticker.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nextLine = visible < callLines.length - 1 ? callLines[visible + 1] : null
  const showSpeaking = nextLine !== null && nextLine.from !== 'captured'
  const speakingIsAgent = nextLine?.from === 'ai'

  return (
    <div ref={containerRef}>
      {/* Call header */}
      <div style={{ background: '#0f172a', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 3px rgba(37,99,235,0.3)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012 .84h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.17a16 16 0 006.29 6.29l1.69-1.69a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.87rem', fontWeight: 600, color: 'white', lineHeight: 1, marginBottom: 4, fontFamily: "'Satoshi', sans-serif" }}>
            David K. · +1 (214) 555-0147
          </div>
          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', fontFamily: "'Satoshi', sans-serif" }}>
            Atlanta, GA · AI outreach campaign
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 100, padding: '3px 9px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60A5FA', display: 'inline-block', animation: 'livePulse 2s ease infinite' }} />
            <span style={{ fontSize: '0.64rem', fontWeight: 700, color: '#60A5FA', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: "'Satoshi', sans-serif" }}>Live</span>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60A5FA', letterSpacing: '0.04em', fontFamily: "'Satoshi', sans-serif" }}>
            {fmt(secs)}
          </div>
        </div>
      </div>

      {/* Speaker detection bar */}
      <div style={{ background: '#1e293b', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, transition: 'all 0.2s' }}>
        {showSpeaking ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {WAVEFORM_DELAYS.map((delay, i) => (
                <div key={i} style={{ width: 2.5, borderRadius: 2, background: speakingIsAgent ? '#60A5FA' : '#c084fc', animation: `wav 0.75s ${delay}s infinite`, height: 5 }} />
              ))}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Satoshi', sans-serif" }}>
              {speakingIsAgent ? 'AI Agent speaking' : 'David K. speaking'}
            </span>
          </>
        ) : (
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Satoshi', sans-serif" }}>
            {visible >= callLines.length - 1 ? 'Call complete' : 'Connecting...'}
          </span>
        )}
      </div>

      {/* Live transcript */}
      <div style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted-text)', fontFamily: "'Satoshi', sans-serif" }}>
            Live transcript
          </span>
        </div>
        <div style={{ padding: '14px 18px', minHeight: 196, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {callLines.map((line, i) => {
            if (i > visible) return null
            if (line.from === 'captured') {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 10, padding: '10px 13px', marginTop: 2, animation: 'showcaseFadeIn 0.3s ease' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <div>
                    <div style={{ fontSize: '0.69rem', fontWeight: 700, color: 'var(--blue-700)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Satoshi', sans-serif" }}>
                      Buy box captured
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--blue-900)', fontWeight: 500, fontFamily: "'Satoshi', sans-serif" }}>{line.text}</div>
                  </div>
                </div>
              )
            }
            const isAi = line.from === 'ai'
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, animation: 'showcaseFadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: isAi ? 'var(--blue-500)' : '#a855f7', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.67rem', fontWeight: 700, color: isAi ? 'var(--blue-600)' : '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Satoshi', sans-serif" }}>
                    {isAi ? 'Agent' : 'David K.'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted-text)', fontFamily: "'Satoshi', sans-serif" }}>{line.ts}</span>
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--navy-heading)', lineHeight: 1.6, paddingLeft: 12, fontFamily: "'Satoshi', sans-serif" }}>
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
            <span style={{ fontWeight: 800, fontSize: '1rem', color: s.color, letterSpacing: '-0.02em', lineHeight: 1, fontFamily: "'Satoshi', sans-serif" }}>{s.val}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', fontFamily: "'Satoshi', sans-serif" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MOCKUP 3: Organize & Score - Buyer pipeline with avatars
   ══════════════════════════════════════════════════════════════════ */
function MockupOrganize() {
  const [ref, visible] = useInView(0.2)
  const buyers = [
    { initials: 'MT', bg: 'linear-gradient(135deg,#1D4ED8,#2563EB)', name: 'Marcus T.', market: 'Atlanta, GA · SFR Flip', score: 94, tag: 'High-Confidence', tagColor: 'var(--blue-700)', tagBg: 'var(--blue-50)', tagBorder: 'var(--blue-200)' },
    { initials: 'LW', bg: 'linear-gradient(135deg,#0ea5e9,#2563EB)', name: 'Lisa W.', market: 'Charlotte, NC · Multi-fam', score: 87, tag: 'Active', tagColor: 'var(--blue-600)', tagBg: 'var(--blue-50)', tagBorder: 'var(--blue-100)' },
    { initials: 'RP', bg: 'linear-gradient(135deg,#6366f1,#2563EB)', name: 'Rachel P.', market: 'Tampa, FL · SFR Hold', score: 72, tag: 'Dormant', tagColor: 'var(--body-text)', tagBg: 'var(--warm-gray)', tagBorder: 'var(--border-med)' },
  ]
  return (
    <div ref={ref} style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)', fontFamily: "'Satoshi', sans-serif" }}>
          Buyer pipeline · auto-updated
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Active', 'High-Conf.'].map((f, i) => (
            <span key={f} style={{ fontSize: '0.62rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: i === 0 ? 'var(--blue-50)' : 'transparent', color: i === 0 ? 'var(--blue-600)' : 'var(--muted-text)', border: `1px solid ${i === 0 ? 'var(--blue-100)' : 'var(--border-med)'}`, fontFamily: "'Satoshi', sans-serif" }}>{f}</span>
          ))}
        </div>
      </div>
      {buyers.map((b, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          border: '1px solid var(--border-light)', borderRadius: 10, padding: '11px 14px', marginBottom: 8, background: 'var(--white)',
          opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-12px)',
          transition: `opacity 0.4s ${0.2 + i * 0.15}s ease, transform 0.4s ${0.2 + i * 0.15}s ease`,
        }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, flexShrink: 0, fontFamily: "'Satoshi', sans-serif" }}>{b.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy-heading)', fontFamily: "'Satoshi', sans-serif" }}>{b.name}</span>
              <span style={{ fontSize: '0.58rem', fontWeight: 600, color: b.tagColor, background: b.tagBg, border: `1px solid ${b.tagBorder}`, borderRadius: 4, padding: '1px 6px', fontFamily: "'Satoshi', sans-serif" }}>{b.tag}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginTop: 2, fontFamily: "'Satoshi', sans-serif" }}>{b.market}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--blue-600)', letterSpacing: '-0.02em', fontFamily: "'Satoshi', sans-serif" }}>{b.score}%</div>
            <div style={{ width: 40, height: 4, background: 'var(--border-light)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: visible ? `${b.score}%` : '0%', background: 'var(--blue-600)', borderRadius: 2, transition: `width 0.8s ${0.4 + i * 0.2}s ease-out` }} />
            </div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 4, background: 'var(--warm-gray)', borderRadius: 10, padding: '10px 14px', fontSize: '0.77rem', color: 'var(--body-text)', fontFamily: "'Satoshi', sans-serif" }}>
        <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>247 buyers</span> scored and segmented automatically from call data
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MOCKUP 4: Match Deals - Deal analysis + matched buyers
   ══════════════════════════════════════════════════════════════════ */
function MockupMatch() {
  const [ref, visible] = useInView(0.2)
  const [scores, setScores] = useState([0, 0, 0])
  const targets = [91, 85, 78]
  const colors = ['var(--blue-600)', 'var(--blue-500)', 'var(--blue-400)']
  const buyers = [
    { name: 'Carlos M.', tags: 'SFR · Flip · Atlanta' },
    { name: 'Priya S.', tags: 'SFR · Flip · Decatur' },
    { name: 'Nate D.', tags: 'SFR · Hold · Smyrna' },
  ]

  useEffect(() => {
    if (!visible) return
    const t = targets.map((target, i) =>
      setTimeout(() => setScores((prev) => { const n = [...prev]; n[i] = target; return n }), 400 + i * 300)
    )
    return () => t.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  return (
    <div ref={ref} style={{ padding: 24 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)', marginBottom: 16, fontFamily: "'Satoshi', sans-serif" }}>
        4217 Elm St, Atlanta GA · Deal analysis
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'ARV', val: '$168K', color: 'var(--navy-heading)' },
          { label: 'Spread', val: '$47K', color: 'var(--accent)' },
          { label: 'Deal Score', val: '87/100', color: 'var(--blue-600)' },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, background: 'var(--warm-gray)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '10px 8px', textAlign: 'center',
            opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity 0.4s ${0.2 + i * 0.12}s ease, transform 0.4s ${0.2 + i * 0.12}s ease`,
          }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted-text)', marginBottom: 4, fontFamily: "'Satoshi', sans-serif" }}>{s.label}</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: s.color, letterSpacing: '-0.02em', fontFamily: "'Satoshi', sans-serif" }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted-text)', marginBottom: 12, fontFamily: "'Satoshi', sans-serif" }}>
        Top matched buyers
      </div>
      {buyers.map((b, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy-heading)', fontFamily: "'Satoshi', sans-serif" }}>{b.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)', marginLeft: 8, fontFamily: "'Satoshi', sans-serif" }}>{b.tags}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: colors[i], letterSpacing: '-0.02em', fontFamily: "'Satoshi', sans-serif" }}>{scores[i]}%</span>
          </div>
          <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: colors[i], borderRadius: 4, width: `${scores[i]}%`, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: '0.73rem', color: 'var(--muted-text)', borderTop: '1px solid var(--border-light)', paddingTop: 10, marginTop: 2, fontFamily: "'Satoshi', sans-serif" }}>
        244 buyers filtered out · Top 3 contacted automatically
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MOCKUP 5: Close the Deal - Transaction tracker + badges
   ══════════════════════════════════════════════════════════════════ */
function MockupClose() {
  const [ref, visible] = useInView(0.2)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!visible) return
    const t = [
      setTimeout(() => setStep(1), 400),
      setTimeout(() => setStep(2), 800),
      setTimeout(() => setStep(3), 1200),
    ]
    return () => t.forEach(clearTimeout)
  }, [visible])

  const stages = [
    { label: 'Matched', done: step >= 1 },
    { label: 'Offer sent', done: step >= 2 },
    { label: 'Signed', done: step >= 3 },
    { label: 'Closing', done: false, active: step >= 3 },
    { label: 'Done', done: false },
  ]

  return (
    <div ref={ref} style={{ padding: 24 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)', marginBottom: 20, fontFamily: "'Satoshi', sans-serif" }}>
        1840 Birch Dr, Marietta GA · Transaction
      </div>

      {/* 5-step progress tracker */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
        {stages.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < stages.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.64rem', fontWeight: 700,
                background: s.done ? 'var(--blue-600)' : s.active ? 'var(--white)' : 'var(--border-light)',
                border: s.active ? '2px solid var(--blue-600)' : 'none',
                color: s.done ? 'white' : s.active ? 'var(--blue-600)' : 'var(--muted-text)',
                transition: 'all 0.4s ease', flexShrink: 0,
              }}>
                {s.done ? '\u2713' : i + 1}
              </div>
              <div style={{ fontSize: '0.56rem', color: s.done || s.active ? 'var(--navy-heading)' : 'var(--muted-text)', fontWeight: s.active ? 600 : 400, whiteSpace: 'nowrap', fontFamily: "'Satoshi', sans-serif", transition: 'color 0.4s ease' }}>{s.label}</div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: 1, height: 2, background: s.done ? 'var(--blue-600)' : 'var(--border-med)', marginBottom: 20, marginLeft: 4, marginRight: 4, transition: 'background 0.4s ease' }} />
            )}
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ background: 'var(--warm-gray)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted-text)', marginBottom: 2, fontFamily: "'Satoshi', sans-serif" }}>Fee</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent)', letterSpacing: '-0.02em', fontFamily: "'Satoshi', sans-serif" }}>+$12,800</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted-text)', marginBottom: 2, fontFamily: "'Satoshi', sans-serif" }}>Days</div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--navy-heading)', fontFamily: "'Satoshi', sans-serif" }}>9</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted-text)', marginBottom: 2, fontFamily: "'Satoshi', sans-serif" }}>E-sign</div>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--blue-600)', fontFamily: "'Satoshi', sans-serif" }}>Complete &#10003;</div>
        </div>
      </div>

      {/* Completion badges */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Contract auto-filled', icon: '\u2713' },
          { label: 'Signatures collected', icon: '\u2713' },
          { label: 'Audit trail saved', icon: '\u2713' },
        ].map((item) => (
          <div key={item.label} style={{ flex: 1, background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', fontSize: '0.68rem', color: 'var(--blue-900)', fontWeight: 500, fontFamily: "'Satoshi', sans-serif" }}>
            <span style={{ color: 'var(--blue-700)', marginRight: 4 }}>{item.icon}</span>{item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MOCKUP 6: Ask AI - Chatbot with full account context
   ══════════════════════════════════════════════════════════════════ */
function MockupAskAI() {
  const [ref, visible] = useInView(0.2)
  const messages = [
    { from: 'user', text: 'I just got a lead on 4217 Elm St. Should I pursue it or pass?' },
    { from: 'ai', text: 'Based on your market data, this property has a 67% spread with an ARV of $168K. I matched it against your CRM and Carlos M. is a 91% fit. He closed a similar deal in this zip code last month. I\'d recommend sending the deal package now.' },
  ]
  return (
    <div ref={ref} style={{ padding: 24 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)', marginBottom: 16, fontFamily: "'Satoshi', sans-serif" }}>
        Ask AI · Full account context
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: `opacity 0.4s ${0.2 + i * 0.3}s ease, transform 0.4s ${0.2 + i * 0.3}s ease`,
          }}>
            <div style={{ fontSize: '0.67rem', fontWeight: 700, color: m.from === 'ai' ? 'var(--blue-600)' : 'var(--body-text)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Satoshi', sans-serif" }}>
              {m.from === 'ai' ? 'Ask AI' : 'You'}
            </div>
            <div style={{ background: m.from === 'ai' ? 'var(--blue-50)' : 'var(--warm-gray)', border: `1px solid ${m.from === 'ai' ? 'var(--blue-100)' : 'var(--border-light)'}`, borderRadius: 10, padding: '10px 14px', fontSize: '0.82rem', color: 'var(--navy-heading)', lineHeight: 1.6, fontFamily: "'Satoshi', sans-serif" }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['CRM data', 'Market comps', 'Call history', 'Deal pipeline'].map((tag, i) => (
          <span key={tag} style={{
            fontSize: '0.62rem', fontWeight: 600, color: 'var(--blue-600)', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 20, padding: '3px 10px', fontFamily: "'Satoshi', sans-serif",
            opacity: visible ? 1 : 0, transition: `opacity 0.3s ${0.6 + i * 0.1}s ease`,
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
