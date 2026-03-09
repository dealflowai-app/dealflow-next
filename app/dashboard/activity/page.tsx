export default function ActivityPage() {
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
          Activity
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>
          AI call logs, buyer matches, and deal milestones.
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
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 7, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          No activity yet
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)', maxWidth: 360, margin: '0 auto' }}>
          Activity will appear here once the AI starts making calls and matching buyers to your deals.
        </div>
      </div>
    </div>
  )
}
