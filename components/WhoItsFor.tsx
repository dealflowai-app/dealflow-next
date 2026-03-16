'use client'

export default function WhoItsFor() {
  return (
    <div
      id="who"
      style={{ padding: '96px 40px', background: 'var(--white)' }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>
          Who it&apos;s for
        </div>
        <h2
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
        <p style={{ fontSize: '0.97rem', color: 'var(--body-text)', lineHeight: 1.7, marginTop: 14, maxWidth: 520 }}>
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
          <WhoLeft />
          <WhoVisual />
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
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: 'var(--body-text)' }}>
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
      <p style={{ color: 'var(--body-text)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 24 }}>
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
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-text)', marginBottom: 16 }}>
        Before DealFlow AI
      </div>
      {[
        'Manual list calling, mostly voicemail',
        'Mass blasting 500 irrelevant contacts',
        'Deadline passes, earnest money lost',
      ].map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--body-text)', marginBottom: 8 }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>✕</span>
          {text}
        </div>
      ))}
      <div style={{ height: 1, background: 'var(--border-light)', margin: '16px 0' }} />
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 16 }}>
        After DealFlow AI
      </div>
      {[
        'AI calls 50 buyers while you grab coffee',
        'Only matched buyers see your deal',
        'Qualified offer received within 72 hours',
      ].map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, color: 'var(--body-text)', marginBottom: 8 }}>
          <span style={{ color: '#16a34a', fontSize: 13 }}>✓</span>
          {text}
        </div>
      ))}
    </div>
  )
}
