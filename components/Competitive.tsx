const competitors = [
  {
    name: 'PropStream',
    does: 'Property data and contact lists',
    cannot: 'No buyer outreach, no qualification, no deal matching',
  },
  {
    name: 'InvestorLift',
    does: 'Marketplace where wholesalers post deals',
    cannot: 'Passive listing only. No AI calls, no buyer verification.',
  },
  {
    name: 'REIRail',
    does: 'Dialer and CRM for investors',
    cannot: 'Manual calling only. No AI agents, no buyer discovery.',
  },
  {
    name: 'BatchLeads',
    does: 'Skip tracing and seller lead data',
    cannot: 'Focused on finding sellers, not buyers. No marketplace.',
  },
  {
    name: 'DealMachine',
    does: 'Driving for dollars and lead tracking',
    cannot: 'Acquisition side only. No help with disposition at all.',
  },
]

export default function Competitive() {
  return (
    <div
      className="section"
      style={{
        padding: '96px 40px',
        background: 'var(--gray-50)',
        borderTop: '1px solid var(--gray-100)',
        borderBottom: '1px solid var(--gray-100)',
      }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ maxWidth: 640, marginBottom: 56 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 14 }}>
            Why DealFlow AI
          </p>
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(1.9rem, 3vw, 2.8rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              color: 'var(--gray-900)',
              marginBottom: 16,
            }}
          >
            Every other tool stops halfway
          </h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--gray-500)', lineHeight: 1.7 }}>
            Existing platforms give you data and leave all the actual work to you. DealFlow AI is the first platform that finds buyers, calls them, qualifies them, matches them to your deals, and closes the contract from end to end.
          </p>
        </div>

        {/* Two-column layout: table + callout */}
        <div className="comp-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>

          {/* Competitor table */}
          <div className="comp-table-scroll" style={{ border: '1px solid var(--gray-200)', borderRadius: 14, overflow: 'hidden', background: 'var(--white)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ textAlign: 'left', padding: '13px 20px', fontSize: '0.77rem', fontWeight: 600, color: 'var(--gray-500)' }}>Platform</th>
                  <th style={{ textAlign: 'left', padding: '13px 20px', fontSize: '0.77rem', fontWeight: 600, color: 'var(--gray-500)' }}>What it does</th>
                  <th style={{ textAlign: 'left', padding: '13px 20px', fontSize: '0.77rem', fontWeight: 600, color: 'var(--red)' }}>What it can&apos;t do</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c, i) => (
                  <tr key={c.name} style={{ borderBottom: i < competitors.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: '0.87rem', color: 'var(--gray-800)', whiteSpace: 'nowrap' }}>{c.name}</td>
                    <td style={{ padding: '14px 20px', fontSize: '0.84rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>{c.does}</td>
                    <td style={{ padding: '14px 20px', fontSize: '0.84rem', color: 'var(--gray-500)', lineHeight: 1.5 }}>{c.cannot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DealFlow AI callout */}
          <div
            style={{
              background: 'var(--blue-600)',
              borderRadius: 14,
              padding: '32px 28px',
              color: 'white',
            }}
          >
            <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 14 }}>
              DealFlow AI
            </p>
            <p
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: '1.3rem',
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                marginBottom: 20,
              }}
            >
              Replaces all of them and does the work none of them will
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Finds verified cash buyers from public records',
                'AI calls and qualifies buyers automatically',
                'Matches deals to the right buyers by criteria',
                'Distributes deals and collects offers',
                'Generates and signs assignment contracts',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,0.8)', flexShrink: 0, marginTop: 2 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.15)', fontSize: '0.82rem', opacity: 0.75, fontStyle: 'italic', lineHeight: 1.6 }}>
              &ldquo;DealFlow AI doesn&apos;t compete with any single tool. It replaces the combination of all of them.&rdquo;
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1000px) {
          .comp-layout { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 860px) {
          .section { padding: 64px 20px !important; }
          .comp-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .comp-table-scroll table { min-width: 520px; font-size: 0.8rem; }
        }
      `}</style>
    </div>
  )
}
