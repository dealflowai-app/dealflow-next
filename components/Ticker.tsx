const items = [
  'AI buyer discovery',
  'Automated qualification calls',
  'Smart deal matching',
  'Auto-generated contracts',
  'E-signatures built in',
  'All 50 states',
  'Deal quality protection',
]

export default function Ticker() {
  // Duplicate for seamless loop
  const doubled = [...items, ...items]

  return (
    <div
      style={{
        borderTop: '1px solid var(--gray-100)',
        borderBottom: '1px solid var(--gray-100)',
        padding: '11px 0',
        overflow: 'hidden',
        background: 'var(--gray-50)',
      }}
    >
      <div className="ticker-inner">
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              fontSize: '0.76rem',
              color: 'var(--gray-500)',
              fontWeight: 500,
            }}
          >
            <span style={{ color: 'var(--blue-400)', fontSize: '0.6rem' }}>●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
