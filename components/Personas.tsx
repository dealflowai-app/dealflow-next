'use client'

import { useState } from 'react'
import Link from 'next/link'

const wholesalerSteps = [
  {
    n: '01',
    title: 'Choose your market',
    body: 'Enter a city, county, or zip code. The system immediately knows which public records to search and which buyers to find. Multiple markets can run simultaneously on higher tiers.',
  },
  {
    n: '02',
    title: 'Find real cash buyers',
    body: 'We scan county property records and surface people who have actually purchased real estate with cash in the last 6–12 months. Real buyers with real purchase history, not generic list contacts.',
  },
  {
    n: '03',
    title: 'Deploy AI buyer calls',
    body: 'AI voice agents call dozens of buyers simultaneously. They introduce your company, confirm active buying status, ask about price range, property type, and strategy, all without you lifting a finger.',
  },
  {
    n: '04',
    title: 'Auto-organize your buyer list',
    body: 'Every verified buyer is saved to your private list and tagged by type, price range, and location. A living database that gets more accurate every campaign.',
  },
  {
    n: '05',
    title: 'Smart deal distribution',
    body: 'Upload a deal under contract. The system analyzes it and sends outreach only to buyers whose criteria match. Precision targeting, not mass blasting.',
  },
  {
    n: '06',
    title: 'Manage offers in one place',
    body: 'Buyers respond through the platform. Negotiate and accept offers without email chains or phone tag.',
  },
  {
    n: '07',
    title: 'Contract signed, deal closed',
    body: 'The platform generates the assignment contract automatically and collects e-signatures from both parties. No Word docs, no printing, no waiting.',
  },
]

const buyerSteps = [
  {
    n: '01',
    title: 'Build your buyer profile',
    body: 'Tell us what you invest in: which cities, what price range, single-family or multifamily, flip or hold. Your profile filters everything you see so you only get relevant deals.',
  },
  {
    n: '02',
    title: 'See your live deal map',
    body: 'A real-time map of your target area with active deals plotted on it. Every pin is a deal that matches your profile. Deals outside your criteria are simply not shown.',
  },
  {
    n: '03',
    title: 'Get full AI deal analysis',
    body: 'Click any deal and get ARV estimates, flip profit projections, rental cash flow, and a confidence score based on available comps. No more doing the math yourself.',
  },
  {
    n: '04',
    title: 'Make an offer in one click',
    body: 'If a deal looks good, submit your offer directly through the platform. Contracts are generated and signed electronically when you agree on terms.',
  },
]

export default function Personas() {
  const [active, setActive] = useState<'wholesaler' | 'buyer'>('wholesaler')
  const steps = active === 'wholesaler' ? wholesalerSteps : buyerSteps

  return (
    <div className="personas-outer" style={{ padding: '96px 40px', background: 'var(--white)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>

        {/* Header + tab switcher */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, marginBottom: 56 }}>
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14 }}>
              How it works for you
            </p>
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
              {active === 'wholesaler'
                ? <>Disposition on <span style={{ color: 'var(--blue-600)' }}>autopilot</span></>
                : <>The signal, <span style={{ color: 'var(--blue-600)' }}>not the noise</span></>
              }
            </h2>
          </div>

          {/* Toggle */}
          <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 10, padding: 4, gap: 4 }}>
            {(['wholesaler', 'buyer'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  background: active === tab ? 'var(--white)' : 'transparent',
                  color: active === tab ? 'var(--gray-900)' : 'var(--gray-500)',
                  boxShadow: active === tab ? 'var(--shadow)' : 'none',
                }}
              >
                {tab === 'wholesaler' ? 'Wholesalers' : 'Cash buyers'}
              </button>
            ))}
          </div>
        </div>

        {/* Context blurb */}
        <p style={{ fontSize: '0.95rem', color: 'var(--gray-500)', lineHeight: 1.7, maxWidth: 600, marginBottom: 48 }}>
          {active === 'wholesaler'
            ? 'Most wholesalers spend 70% of their week on buyer outreach: calling stale lists, sending mass blasts, and watching deadlines pass. DealFlow AI handles all of it automatically the moment you activate a campaign.'
            : 'Cash buyers get flooded with irrelevant deals from wholesalers who never asked what they actually want. DealFlow AI filters the entire market to show you only deals that match your exact criteria.'
          }
        </p>

        {/* Steps grid */}
        <div
          className="steps-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: active === 'wholesaler' ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)',
            gap: 2,
          }}
        >
          {steps.map((step, i) => (
            <div
              key={step.n}
              style={{
                padding: '28px 24px',
                background: i === 0 ? 'var(--blue-600)' : i % 2 === 0 ? 'var(--gray-50)' : 'var(--white)',
                border: '1px solid var(--gray-100)',
                borderRadius: i === 0 ? '12px 0 0 12px' : i === steps.length - 1 ? '0 12px 12px 0' : 0,
              }}
            >
              <p
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: i === 0 ? 'rgba(255,255,255,0.3)' : 'var(--gray-200)',
                  marginBottom: 12,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {step.n}
              </p>
              <p
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: i === 0 ? 'var(--white)' : 'var(--gray-900)',
                  marginBottom: 10,
                  lineHeight: 1.3,
                }}
              >
                {step.title}
              </p>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: i === 0 ? 'rgba(255,255,255,0.8)' : 'var(--gray-500)',
                  lineHeight: 1.65,
                }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div style={{ marginTop: 40, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/#cta"
            style={{
              padding: '11px 24px',
              borderRadius: 9,
              fontSize: '0.9rem',
              fontWeight: 600,
              textDecoration: 'none',
              background: 'var(--blue-600)',
              color: 'var(--white)',
              transition: 'background 0.15s',
            }}
          >
            {active === 'wholesaler' ? 'Start closing faster' : 'Browse deals free'}
          </Link>
          <Link
            href="/pricing"
            style={{
              fontSize: '0.87rem',
              color: 'var(--blue-600)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            See pricing →
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .personas-outer { padding: 64px 20px !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid > div { border-radius: 8px !important; }
        }
        @media (max-width: 520px) {
          .steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
