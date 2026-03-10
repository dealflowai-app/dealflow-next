'use client'

import { useState, useEffect } from 'react'

const engines = [
  { num: '01', name: 'Market Intelligence',   tagline: 'Know the market before it moves' },
  { num: '02', name: 'Buyer Intelligence',     tagline: 'A living database of verified cash buyers' },
  { num: '03', name: 'Property Discovery',     tagline: 'Surface off-market deals automatically' },
  { num: '04', name: 'Smart Deal Matching',    tagline: 'Right deal, right buyer, in seconds' },
  { num: '05', name: 'Outreach Automation',    tagline: 'AI calls hundreds of buyers while you sleep' },
  { num: '06', name: 'Transaction Center',     tagline: 'From first match to signed contract' },
]

/* ── 01 Market Intelligence ──────────────────────────────── */
function VisualMarket() {
  const bars = [62, 58, 71, 65, 79, 74, 88]
  const labels = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']
  return (
    <div style={{ padding: 28 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 20 }}>
        Atlanta, GA — Deal spread trend
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: '100%', height: h, background: i === bars.length - 1 ? 'var(--blue-600)' : 'var(--gray-200)', borderRadius: '4px 4px 0 0' }} />
            <div style={{ fontSize: '0.6rem', color: 'var(--gray-400)' }}>{labels[i]}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        {[
          { label: 'Avg ARV', val: '$218K', trend: '↑ 4%', up: true },
          { label: 'Avg spread', val: '$41K', trend: '↑ 11%', up: true },
          { label: 'Days to close', val: '8.3', trend: '↓ 2.1', up: false },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: '0.63rem', color: 'var(--gray-400)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>{s.val}</div>
            <div style={{ fontSize: '0.63rem', color: s.up ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>{s.trend} vs last mo.</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 02 Buyer Intelligence ───────────────────────────────── */
function VisualBuyers() {
  const buyers = [
    { initials: 'JM', bg: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', name: 'James M.', market: 'Atlanta, GA · SFR Flip', updated: 'Just now', score: 96, fresh: true },
    { initials: 'SR', bg: 'linear-gradient(135deg,#0ea5e9,#2563eb)', name: 'Sandra R.', market: 'Charlotte, NC · SFR Flip', updated: '2h ago', score: 84, fresh: false },
    { initials: 'DK', bg: 'linear-gradient(135deg,#6366f1,#3b82f6)', name: 'David K.', market: 'Tampa, FL · SFR Flip', updated: '1d ago', score: 71, fresh: false },
  ]
  return (
    <div style={{ padding: 28 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 16 }}>
        247 verified buyers · updated continuously
      </div>
      {buyers.map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: b.fresh ? 'var(--blue-50)' : 'var(--white)', border: `1px solid ${b.fresh ? 'var(--blue-100)' : 'var(--gray-100)'}`, borderRadius: 10, padding: '11px 14px', marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: b.bg, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, flexShrink: 0 }}>{b.initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--gray-900)' }}>{b.name}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--green)', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 4, padding: '1px 5px' }}>Verified</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 2 }}>{b.market} · {b.updated}</div>
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--blue-600)', letterSpacing: '-0.02em' }}>{b.score}%</div>
        </div>
      ))}
    </div>
  )
}

/* ── 03 Property Discovery ───────────────────────────────── */
function VisualDiscovery() {
  const props = [
    { addr: '2214 Briar Rd, Atlanta GA', status: 'Pre-foreclosure', label: '3 days ahead of market', dot: 'var(--red)' },
    { addr: '551 Oak St, Decatur GA',    status: 'Tax delinquent',  label: '6 days ahead of market', dot: 'var(--amber)' },
    { addr: '1092 Pine Ave, Smyrna GA', status: 'Probate',         label: '11 days ahead of market', dot: 'var(--blue-600)' },
  ]
  return (
    <div style={{ padding: 28 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 16 }}>
        Off-market signals · this week
      </div>
      {props.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--gray-100)', borderRadius: 10, padding: '11px 14px', marginBottom: 8, background: 'var(--white)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: '0.84rem', color: 'var(--gray-900)' }}>{p.addr}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 2 }}>{p.status} · {p.label}</div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 4, background: 'var(--gray-50)', borderRadius: 10, padding: '10px 14px', fontSize: '0.77rem', color: 'var(--gray-500)' }}>
        <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>14 new signals</span> found in your target market this week
      </div>
    </div>
  )
}

/* ── 04 Smart Deal Matching ──────────────────────────────── */
function VisualMatching() {
  const [scores, setScores] = useState([0, 0, 0])
  const targets = [96, 84, 71]
  const colors = ['var(--blue-600)', 'var(--blue-500)', 'var(--blue-400)']
  const rows = [
    { name: 'James M.', tags: 'SFR · Flip · Atlanta' },
    { name: 'Sandra R.', tags: 'SFR · Flip · Charlotte' },
    { name: 'David K.', tags: 'SFR · Flip · Tampa' },
  ]

  useEffect(() => {
    const timers = targets.map((t, i) =>
      setTimeout(() => setScores((prev) => { const n = [...prev]; n[i] = t; return n }), 200 + i * 300)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={{ padding: 28 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 16 }}>
        Deal scored against 247 buyers
      </div>
      {rows.map((b, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--gray-900)' }}>{b.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginLeft: 8 }}>{b.tags}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: colors[i], letterSpacing: '-0.02em' }}>{scores[i]}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: colors[i], borderRadius: 4, width: `${scores[i]}%`, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
          </div>
        </div>
      ))}
      <div style={{ fontSize: '0.73rem', color: 'var(--gray-400)', borderTop: '1px solid var(--gray-100)', paddingTop: 12, marginTop: 4 }}>
        244 buyers filtered out · Top 3 contacted automatically
      </div>
    </div>
  )
}

/* ── 05 Outreach Automation ──────────────────────────────── */
function VisualOutreach() {
  const calls = [
    { initials: 'JM', name: 'James M.',  status: 'Answered · High interest',      statusColor: 'var(--green)',    time: '0:47' },
    { initials: 'SR', name: 'Sandra R.', status: 'Answered · Reviewing numbers',  statusColor: 'var(--blue-600)', time: '0:31' },
    { initials: 'DK', name: 'David K.',  status: 'Voicemail left',                statusColor: 'var(--gray-400)', time: '0:22' },
  ]
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)' }}>
          AI campaign · Live
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          {[1, 2, 3, 4, 5].map((k) => (
            <div key={k} className="wave-b" style={{ animationDelay: `${k * 0.15}s` }} />
          ))}
        </div>
      </div>
      {calls.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--gray-100)', borderRadius: 10, padding: '11px 14px', marginBottom: 8, background: 'var(--white)' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-500)', flexShrink: 0 }}>
            {c.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: '0.84rem', color: 'var(--gray-900)' }}>{c.name}</div>
            <div style={{ fontSize: '0.7rem', color: c.statusColor, marginTop: 2, fontWeight: 500 }}>{c.status}</div>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{c.time}</div>
        </div>
      ))}
      <div style={{ marginTop: 4, background: 'var(--gray-50)', borderRadius: 10, padding: '10px 14px', fontSize: '0.77rem', color: 'var(--gray-500)' }}>
        <span style={{ color: 'var(--green)', fontWeight: 600 }}>48 calls</span> completed · <span style={{ color: 'var(--blue-600)', fontWeight: 600 }}>9 interested</span> · You slept through all of it
      </div>
    </div>
  )
}

/* ── 06 Transaction Center ───────────────────────────────── */
function VisualTransaction() {
  const stages = [
    { label: 'Match found',    done: true,  active: false },
    { label: 'Offer sent',     done: true,  active: false },
    { label: 'Countersigned',  done: true,  active: false },
    { label: 'Under contract', done: false, active: true  },
    { label: 'Closed',         done: false, active: false },
  ]
  return (
    <div style={{ padding: 28 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 24 }}>
        816 Magnolia Way · Transaction in progress
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {stages.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < stages.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', background: s.done ? 'var(--blue-600)' : s.active ? 'var(--white)' : 'var(--gray-100)', border: s.active ? '2px solid var(--blue-600)' : 'none', color: s.done ? 'white' : s.active ? 'var(--blue-600)' : 'var(--gray-400)', fontWeight: 700, flexShrink: 0 }}>
                {s.done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: '0.58rem', color: s.done || s.active ? 'var(--gray-700)' : 'var(--gray-400)', fontWeight: s.active ? 600 : 400, whiteSpace: 'nowrap', textAlign: 'center', maxWidth: 56 }}>
                {s.label}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: 1, height: 2, background: s.done ? 'var(--blue-600)' : 'var(--gray-200)', marginBottom: 22, marginLeft: 4, marginRight: 4 }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.63rem', color: 'var(--gray-400)', marginBottom: 2 }}>Assignment fee</div>
          <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--green)', letterSpacing: '-0.02em' }}>+$14,500</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.63rem', color: 'var(--gray-400)', marginBottom: 2 }}>Days to close</div>
          <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>11</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.63rem', color: 'var(--gray-400)', marginBottom: 2 }}>E-signature</div>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--blue-600)' }}>Complete ✓</div>
        </div>
      </div>
    </div>
  )
}

const VISUALS = [VisualMarket, VisualBuyers, VisualDiscovery, VisualMatching, VisualOutreach, VisualTransaction]

export default function Platform() {
  const [active, setActive] = useState(0)
  const ActiveVisual = VISUALS[active]

  return (
    <div
      id="platform"
      style={{
        padding: '96px 40px',
        background: 'var(--gray-50)',
        borderTop: '1px solid var(--gray-100)',
        borderBottom: '1px solid var(--gray-100)',
      }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14 }}>
          The platform
        </div>
        <h2
          style={{
            fontFamily: 'inherit',
            fontSize: 'clamp(1.9rem, 3vw, 2.8rem)',
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-0.022em',
            color: 'var(--gray-900)',
          }}
        >
          Six engines. <span style={{ color: 'var(--blue-600)' }}>One system.</span>
        </h2>
        <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.7, marginTop: 14, maxWidth: 520 }}>
          Each engine feeds the next. No module works alone. That&apos;s what makes it a platform, not another tool.
        </p>

        <div
          className="plat-layout"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20, marginTop: 52, alignItems: 'start' }}
        >
          {/* Engine list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {engines.map((eng, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 16px',
                  borderRadius: 12,
                  border: 'none',
                  borderLeft: `2px solid ${active === i ? 'var(--blue-600)' : 'transparent'}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: active === i ? 'var(--white)' : 'transparent',
                  boxShadow: active === i ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: active === i ? 'var(--blue-600)' : 'var(--gray-400)', width: 18, flexShrink: 0 }}>
                  {eng.num}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.87rem', color: active === i ? 'var(--gray-900)' : 'var(--gray-500)', lineHeight: 1.3 }}>
                    {eng.name}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--gray-400)', marginTop: 2, lineHeight: 1.4 }}>
                    {eng.tagline}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Visual panel */}
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--gray-200)',
              borderRadius: 18,
              overflow: 'hidden',
              boxShadow: 'var(--shadow)',
              minHeight: 280,
            }}
          >
            <div className="vis-screen-active" key={active}>
              <ActiveVisual />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          #platform { padding: 64px 20px !important; }
          .plat-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
