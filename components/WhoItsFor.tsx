'use client'

export default function WhoItsFor() {
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
          Built for wholesalers who <span style={{ color: 'var(--blue-600)' }}>close</span>
        </h2>
        <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.7, marginTop: 14, maxWidth: 520 }}>
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

function WhoLeft() {
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

function WhoVisual() {
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
