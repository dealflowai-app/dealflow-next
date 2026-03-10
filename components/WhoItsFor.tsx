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
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 'clamp(1.9rem, 3vw, 2.8rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.04em',
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
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1.85rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
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
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1.85rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--gray-900)',
          marginBottom: 14,
          lineHeight: 1.2,
        }}
      >
        See only deals<br />worth your time.
      </div>
      <p style={{ color: 'var(--gray-500)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 24 }}>
        Stop drowning in irrelevant deal flow. DealFlow AI filters everything and only surfaces what
        matches your criteria, with AI analysis on every property.
      </p>
      <CheckList
        items={[
          'Free access to the live deal map in your target markets',
          'AI deal analysis with ARV, profit margin, and confidence score',
          'Only see deals that match your actual buy box',
          'One-click offer system with auto-generated offer documents',
          'Negotiate and sign contracts entirely inside the platform',
          'Deal quality protection flags overpriced and daisy-chained deals',
        ]}
      />
    </div>
  )
}

function WhoVisualB() {
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
        Your personalized deal feed
      </div>
      {[
        { addr: '1847 Oak St, Atlanta GA', meta: '3/1 SFR · Flip · Matches criteria', price: '$87K', match: '98% match' },
        { addr: '334 Pine Ave, Decatur GA', meta: '4/2 SFR · Flip · Matches criteria', price: '$104K', match: '91% match' },
      ].map((deal, i) => (
        <div
          key={i}
          style={{
            background: 'white',
            border: '1px solid var(--gray-200)',
            borderRadius: 9,
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 7,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-900)' }}>{deal.addr}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 1 }}>{deal.meta}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--gray-900)' }}>{deal.price}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--blue-600)', fontWeight: 600 }}>{deal.match}</div>
          </div>
        </div>
      ))}
      <div
        style={{
          background: 'var(--blue-50)',
          border: '1px solid var(--blue-100)',
          borderRadius: 9,
          padding: '11px 13px',
          fontSize: '0.8rem',
          color: 'var(--gray-500)',
        }}
      >
        <span style={{ color: 'var(--blue-600)', fontWeight: 700 }}>247 deals</span>{' '}
        filtered out. They didn&apos;t match your buy box.
      </div>
    </div>
  )
}
