const stats = [
  { value: '$15B+', label: 'Est. wholesale market' },
  { value: '2M+', label: 'Off-market deals/yr' },
  { value: '70%', label: 'Wholesalers on manual outreach' },
  { value: '0', label: 'Platforms doing all of this' },
]

export default function MarketStats() {
  return (
    <div
      style={{
        borderTop: '1px solid var(--gray-100)',
        borderBottom: '1px solid var(--gray-100)',
        background: 'var(--gray-50)',
      }}
    >
      <div
        className="stats-grid"
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: '0 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: '36px 24px',
              borderRight: i < stats.length - 1 ? '1px solid var(--gray-200)' : 'none',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 'clamp(1.8rem, 2.8vw, 2.4rem)',
                fontWeight: 800,
                color: s.value === '0' ? 'var(--blue-600)' : 'var(--gray-900)',
                letterSpacing: '-0.03em',
                marginBottom: 6,
                lineHeight: 1,
              }}
            >
              {s.value}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', lineHeight: 1.4 }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 860px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stats-grid > div { border-right: none !important; border-bottom: 1px solid var(--gray-200); }
          .stats-grid > div:nth-child(odd) { border-right: 1px solid var(--gray-200) !important; }
          .stats-grid > div:nth-last-child(-n+2) { border-bottom: none; }
        }
      `}</style>
    </div>
  )
}
