'use client'

import { useState } from 'react'

type Tab = 'w' | 'b'

export default function WhoItsFor() {
  const [activeTab, setActiveTab] = useState<Tab>('w')

  return (
    <div
      id="who"
      style={{ padding: '96px 40px' }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14 }}>
          Who it&apos;s for
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
          Built for <span style={{ color: 'var(--blue-600)' }}>both sides</span> of the deal
        </h2>
        <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.7, marginTop: 14, maxWidth: 520 }}>
          More wholesalers bring more buyers. More buyers mean faster closings. A marketplace that gets better as it grows.
        </p>

        {/* Tabs */}
        <div
          className="who-tabs"
          style={{
            display: 'flex',
            gap: 4,
            background: 'var(--gray-100)',
            borderRadius: 10,
            padding: 4,
            width: 'fit-content',
            marginTop: 42,
            marginBottom: 40,
          }}
        >
          {([
            { id: 'w', label: 'Real estate wholesalers' },
            { id: 'b', label: 'Cash buyers & investors' },
          ] as { id: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 20px',
                borderRadius: 7,
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === tab.id ? 'var(--white)' : 'transparent',
                color: activeTab === tab.id ? 'var(--gray-900)' : 'var(--gray-500)',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Wholesalers panel */}
        {activeTab === 'w' && (
          <div
            className="who-panel-show"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 52,
              alignItems: 'center',
            }}
          >
            <WhoLeftW />
            <WhoVisualW />
          </div>
        )}

        {/* Buyers panel */}
        {activeTab === 'b' && (
          <div
            className="who-panel-show"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 52,
              alignItems: 'center',
            }}
          >
            <WhoLeftB />
            <WhoVisualB />
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 860px) {
          #who { padding: 64px 20px !important; }
          .who-panel-show { grid-template-columns: 1fr !important; }
          .who-tabs { width: 100% !important; }
          .who-tabs button { flex: 1; padding: 8px 12px !important; font-size: 0.8rem !important; }
        }
      `}</style>
    </div>
  )
}

function CheckList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.87rem', color: 'var(--gray-700)' }}>
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
              marginTop: 1,
            }}
          >
            ✓
          </div>
          {item}
        </div>
      ))}
    </div>
  )
}

function WhoLeftW() {
  return (
    <div>
      <div
        style={{
          fontFamily: 'inherit',
          fontSize: '1.85rem',
          fontWeight: 600,
          letterSpacing: '-0.022em',
          color: 'var(--gray-900)',
          marginBottom: 14,
          lineHeight: 1.2,
        }}
      >
        Close more deals.<br />Work less hours.
      </div>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 24 }}>
        Your business lives and dies on finding the right buyer before your contract deadline.
        DealFlow AI automates the part that kills most wholesalers: the disposition.
      </p>
      <CheckList
        items={[
          'AI calls hundreds of buyers simultaneously while you sleep',
          'Only contacts proven cash buyers with verified purchase history',
          'Buyer preferences captured and organized automatically',
          'Your deal goes to exactly the right people, not a mass blast',
          'Contracts generated and signed inside the platform',
          'Works for all 5 wholesale models across every US market',
        ]}
      />
    </div>
  )
}

function WhoVisualW() {
  return (
    <div
      style={{
        background: 'var(--gray-50)',
        border: '1px solid var(--gray-200)',
        borderRadius: 14,
        padding: 26,
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 16 }}>
        Before DealFlow AI
      </div>
      {[
        'Manual list calling, mostly voicemail',
        'Mass blasting 500 irrelevant contacts',
        'Deadline passes, earnest money lost',
      ].map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '0.84rem', color: 'var(--gray-700)', marginBottom: 8 }}>
          <span style={{ color: 'var(--red)', fontSize: 13 }}>✕</span>
          {text}
        </div>
      ))}
      <div style={{ height: 1, background: 'var(--gray-200)', margin: '16px 0' }} />
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 16 }}>
        After DealFlow AI
      </div>
      {[
        'AI calls 50 buyers while you grab coffee',
        'Only matched buyers see your deal',
        'Qualified offer received within 72 hours',
      ].map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '0.84rem', color: 'var(--gray-700)', marginBottom: 8 }}>
          <span style={{ color: 'var(--green)', fontSize: 13 }}>✓</span>
          {text}
        </div>
      ))}
    </div>
  )
}

function WhoLeftB() {
  return (
    <div>
      <div
        style={{
          fontFamily: 'inherit',
          fontSize: '1.85rem',
          fontWeight: 600,
          letterSpacing: '-0.022em',
          color: 'var(--gray-900)',
          marginBottom: 14,
          lineHeight: 1.2,
        }}
      >
        Every deal that fits.<br />None of the noise.
      </div>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 24 }}>
        Cash buyers get flooded with irrelevant deals from wholesalers who never asked what they want.
        DealFlow AI filters the entire market to your exact criteria — and runs the numbers before you even open a deal.
      </p>
      <CheckList
        items={[
          'Set your buy box once: market, price range, property type, exit strategy',
          '200+ deals filtered out daily that don\'t match — you see only what fits',
          'Full AI analysis on every deal: ARV, flip profit, rental cash flow, confidence score',
          'Premium buyers get first access before deals reach the broader pool',
          'Submit offers in one click — contracts auto-generated and e-signed in the platform',
          'Deal quality protection flags overpriced listings and daisy-chain assignments',
        ]}
      />
    </div>
  )
}

function WhoVisualB() {
  return (
    <div
      style={{
        background: 'var(--white)',
        border: '1px solid var(--gray-200)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Deal header */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 8px', borderRadius: 4 }}>
            Matches your buy box
          </span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: '#10b981', color: 'white', padding: '3px 8px', borderRadius: 4 }}>
            Early access
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.97rem', color: 'white', marginBottom: 3 }}>816 Magnolia Way</div>
        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)' }}>Charlotte, NC · 3/2 SFR · Flip / Hold</div>
      </div>

      {/* AI Analysis */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14 }}>
          AI Deal Analysis
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
          {[
            { label: 'Asking price', val: '$238,000', color: 'var(--gray-900)' },
            { label: 'Est. ARV', val: '$312,000', color: 'var(--gray-900)' },
            { label: 'Est. flip profit', val: '$52,400', color: 'var(--green)' },
            { label: 'AI confidence', val: '94%', color: 'var(--blue-600)' },
          ].map((m) => (
            <div key={m.label} style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--gray-400)', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: m.color, letterSpacing: '-0.02em' }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Comps */}
        <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--gray-400)', marginBottom: 9 }}>3 nearby comps · avg $310K</div>
          {[
            { addr: '802 Maple St', price: '$308K', ago: '18 days ago' },
            { addr: '1104 Birch Ave', price: '$316K', ago: '34 days ago' },
          ].map((c) => (
            <div key={c.addr} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 5 }}>
              <span style={{ color: 'var(--gray-600)' }}>{c.addr}</span>
              <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{c.price} <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>{c.ago}</span></span>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, background: 'var(--blue-600)', color: 'white', border: 'none', borderRadius: 9, padding: '11px 16px', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em' }}>
            Make offer →
          </button>
          <button style={{ background: 'var(--white)', color: 'var(--gray-600)', border: '1px solid var(--gray-200)', borderRadius: 9, padding: '11px 16px', fontSize: '0.86rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
