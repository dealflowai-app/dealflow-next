'use client'

import { useEffect, useRef } from 'react'

const engines = [
  {
    num: '01',
    name: 'Market Intelligence',
    desc: 'Tracks local pricing trends, buyer demand imbalances, and signals like foreclosures in real time. The context layer every other engine depends on.',
    delay: 0,
  },
  {
    num: '02',
    name: 'Buyer Intelligence',
    desc: 'A living CRM that discovers, verifies, and scores buyers continuously. Every call and message updates buyer profiles automatically. Zero manual upkeep.',
    delay: 0.07,
  },
  {
    num: '03',
    name: 'Property Discovery',
    desc: 'Turns buyer demand into targeted property supply. Scans public records to surface off-market opportunities before they hit the open market.',
    delay: 0.14,
  },
  {
    num: '04',
    name: 'Smart Deal Matching',
    desc: 'The core of the platform. Scores every buyer-deal pair on buy box, price fit, strategy, and close probability, then acts on the best matches automatically.',
    delay: 0.21,
  },
  {
    num: '05',
    name: 'Outreach Automation',
    desc: 'Replaces all manual calling, texting, and follow-up. AI voice agents and SMS campaigns run on their own and report back structured buyer data after every interaction.',
    delay: 0.28,
  },
  {
    num: '06',
    name: 'Transaction Center',
    desc: 'Handles contracts, e-signatures, the private deal marketplace, and reputation scoring. From first match to signed contract, entirely inside one place.',
    delay: 0.35,
  },
]

export default function Platform() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    cardRefs.current.forEach((el) => {
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

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
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.04em',
            color: 'var(--gray-900)',
          }}
        >
          Six engines. <span style={{ color: 'var(--blue-600)' }}>One system.</span>
        </h2>
        <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.7, marginTop: 14, maxWidth: 520 }}>
          Each engine feeds the next. No module works alone. That&apos;s what makes it a platform, not another tool.
        </p>

        <div
          className="eng-grid-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
            marginTop: 52,
          }}
        >
          {engines.map((eng, i) => (
            <div
              key={i}
              ref={el => { cardRefs.current[i] = el }}
              className="reveal"
              style={{
                background: 'var(--white)',
                border: '1px solid var(--gray-200)',
                borderRadius: 14,
                padding: 26,
                transition: `all 0.2s, opacity 0.55s ease ${eng.delay}s, transform 0.55s ease ${eng.delay}s`,
                transitionDelay: `${eng.delay}s`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--blue-200)'
                e.currentTarget.style.boxShadow = 'var(--shadow)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--gray-200)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-400)', marginBottom: 14 }}>
                {eng.num}
              </div>
              <div style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: '0.97rem', color: 'var(--gray-900)', marginBottom: 8 }}>
                {eng.name}
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--gray-500)', lineHeight: 1.65 }}>
                {eng.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          #platform { padding: 64px 20px !important; }
          .eng-grid-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
