export default function BuyersPage() {
  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1.75rem',
          fontWeight: 800,
          color: 'var(--gray-900)',
          letterSpacing: '-0.03em',
          marginBottom: 6,
        }}>
          Buyers
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>
          Cash buyers and investors matched to your deals.
        </p>
      </div>

      {/* Empty state */}
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--gray-100)',
        borderRadius: 16,
        padding: '72px 24px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 13,
          background: 'var(--gray-50)',
          border: '1px solid var(--gray-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: 'var(--gray-400)',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 7, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          No buyer matches yet
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', maxWidth: 360, margin: '0 auto' }}>
          Submit a deal and our AI will immediately start calling matched buyers in your area. Buyers will appear here once matched.
        </div>
      </div>
    </div>
  )
}
