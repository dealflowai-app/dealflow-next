'use client'

import Image from 'next/image'

const carouselCards = [
  { title: 'New Wholesalers', desc: 'Start building your buyer list from scratch with AI-powered discovery' },
  { title: 'Solo Operators', desc: 'Run your entire operation from one dashboard. No team needed.' },
  { title: 'Multi-Market', desc: 'Manage buyers and deals across 3+ markets simultaneously' },
  { title: 'High Volume', desc: 'Close 10+ deals/month with AI campaigns running 24/7' },
  { title: 'Virtual Wholesale', desc: 'Wholesale in any US market without being there. AI does the calling.' },
]

const replacedTools = [
  { name: 'PropStream', category: 'data' },
  { name: 'REIRail', category: 'dialer' },
  { name: 'Podio', category: 'CRM' },
  { name: 'BatchLeads', category: 'lists' },
  { name: 'DocuSign', category: 'contracts' },
]

export default function WhoItsFor() {
  return (
    <div
      id="who"
      style={{ padding: '96px 40px', background: 'var(--white)' }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div className="reveal" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', fontFamily: "'Satoshi', sans-serif" }}>
            Who it&apos;s for
          </div>
        </div>
        <h2
          className="reveal"
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(1.9rem, 3vw, 2.8rem)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.022em',
            color: 'var(--navy-heading)',
            textTransform: 'capitalize',
          }}
        >
          Built for wholesalers who <span style={{ color: 'var(--accent)' }}>close</span>
        </h2>
        <p className="reveal" style={{ fontSize: '0.97rem', color: 'var(--body-text)', lineHeight: 1.7, marginTop: 14, maxWidth: 520, fontFamily: "'Satoshi', sans-serif" }}>
          Stop juggling spreadsheets, dialers, and CRMs. One platform to find buyers, run AI outreach, and close deals faster.
        </p>

        <div
          className="who-panel"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 52,
            alignItems: 'center',
            marginTop: 42,
          }}
        >
          <div className="reveal-left">
            <WhoLeft />
          </div>
          <div className="reveal-right">
            <WhoVisual />
          </div>
        </div>

        {/* Replace your entire stack */}
        <div className="reveal" style={{ marginTop: 80, textAlign: 'center' }}>
          <h3 style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
            fontWeight: 400,
            color: 'var(--navy-heading)',
            marginBottom: 32,
          }}>
            Replace your entire stack
          </h3>
          <div className="stagger-children" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            {replacedTools.map((tool) => (
              <div key={tool.name} className="strike-pill" style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--warm-gray)',
                border: '1px solid var(--border-light)',
                borderRadius: 10,
                padding: '10px 18px',
              }}>
                <span style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: 'var(--muted-text)',
                }}>
                  {tool.name}
                </span>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  color: 'var(--muted-text)',
                  background: 'var(--border-light)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontFamily: "'Satoshi', sans-serif",
                }}>
                  {tool.category}
                </span>
              </div>
            ))}
          </div>
          <div className="reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'Satoshi', sans-serif", fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}>
                All in one platform
              </span>
              <Image src="/Logo.png" alt="DealFlow AI" width={24} height={24} style={{ objectFit: 'contain' }} />
            </span>
          </div>
        </div>

        {/* Auto-scrolling carousel */}
        <div style={{ marginTop: 72, overflow: 'hidden' }}>
          <div className="carousel-track">
            {[...carouselCards, ...carouselCards].map((card, i) => (
              <div key={i} style={{
                width: 280,
                flexShrink: 0,
                background: 'var(--white)',
                border: '1px solid var(--border-light)',
                borderRadius: 16,
                padding: '24px 22px',
              }}>
                <h4 style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: '1rem',
                  fontWeight: 400,
                  color: 'var(--navy-heading)',
                  marginBottom: 8,
                }}>
                  {card.title}
                </h4>
                <p style={{
                  fontFamily: "'Satoshi', sans-serif",
                  fontSize: '0.85rem',
                  fontWeight: 400,
                  color: 'var(--body-text)',
                  lineHeight: 1.6,
                }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          #who { padding: 64px 20px !important; }
          .who-panel { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function CheckList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--body-text)', fontFamily: "'Satoshi', sans-serif" }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4.5L3.5 7.5L9.5 1" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {item}
        </div>
      ))}
    </div>
  )
}

function WhoLeft() {
  return (
    <div>
      <div
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: '-0.022em',
          color: 'var(--navy-heading)',
          marginBottom: 14,
          lineHeight: 1.2,
        }}
      >
        Close more deals.<br />Work less hours.
      </div>
      <p style={{ color: 'var(--body-text)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 24, fontFamily: "'Satoshi', sans-serif" }}>
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

function WhoVisual() {
  return (
    <div
      style={{
        background: 'var(--warm-gray)',
        border: '1px solid var(--border-light)',
        borderRadius: 16,
        padding: 26,
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)', marginBottom: 16, fontFamily: "'Satoshi', sans-serif" }}>
        Before DealFlow AI
      </div>
      {[
        'Manual list calling, mostly voicemail',
        'Mass blasting 500 irrelevant contacts',
        'Deadline passes, earnest money lost',
      ].map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--body-text)', marginBottom: 8, fontFamily: "'Satoshi', sans-serif" }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>✕</span>
          {text}
        </div>
      ))}
      <div style={{ height: 1, background: 'var(--border-light)', margin: '16px 0' }} />
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 16, fontFamily: "'Satoshi', sans-serif" }}>
        After DealFlow AI
      </div>
      {[
        'AI calls 50 buyers while you grab coffee',
        'Only matched buyers see your deal',
        'Qualified offer received within 72 hours',
      ].map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--body-text)', marginBottom: 8, fontFamily: "'Satoshi', sans-serif" }}>
          <span style={{ color: 'var(--accent)', fontSize: 13 }}>✓</span>
          {text}
        </div>
      ))}
    </div>
  )
}
