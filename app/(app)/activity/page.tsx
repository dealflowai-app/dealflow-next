export default function ActivityPage() {
  return (
    <div style={{ padding: '36px 40px', maxWidth: 1080 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1.45rem',
          fontWeight: 500,
          color: '#111827',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Activity
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
          AI call logs, buyer matches, and deal milestones.
        </p>
      </div>

      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '72px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#9ca3af',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#374151', marginBottom: 8 }}>
          No activity yet
        </div>
        <div style={{ fontSize: '0.82rem', color: '#9ca3af', maxWidth: 360, margin: '0 auto' }}>
          Activity will appear here once the AI starts making calls and matching buyers to your deals.
        </div>
      </div>
    </div>
  )
}
