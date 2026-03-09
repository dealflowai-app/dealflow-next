'use client'

import Image from 'next/image'
import Link from 'next/link'

const columns = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', href: '/#how' },
      { label: 'Platform', href: '/#platform' },
      { label: 'Who it\'s for', href: '/#who' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Join waitlist', href: '/#cta' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
]

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--gray-100)', background: 'var(--white)' }}>
      {/* Main grid */}
      <div
        className="footer-grid"
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: '56px 40px 40px',
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr 1fr 1fr',
          gap: 40,
        }}
      >
        {/* Brand col */}
        <div>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--gray-900)',
              textDecoration: 'none',
              marginBottom: 14,
            }}
          >
            <Image src="/Logo.png" alt="Dealflow AI logo" width={30} height={30} style={{ objectFit: 'contain' }} />
            Dealflow AI
          </Link>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', lineHeight: 1.65, maxWidth: 220, marginTop: 12 }}>
            Real estate deals, closed on autopilot. AI-powered sourcing, analysis, and outreach for serious investors.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 28 }}>
            © {new Date().getFullYear()} Dealflow AI
          </p>
        </div>

        {/* Link columns */}
        {columns.map((col) => (
          <div key={col.heading}>
            <p
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--gray-400)',
                marginBottom: 16,
              }}
            >
              {col.heading}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  style={{
                    fontSize: '0.87rem',
                    color: 'var(--gray-600)',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--gray-900)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--gray-600)' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div
        className="footer-bottom"
        style={{
          borderTop: '1px solid var(--gray-100)',
          padding: '18px 40px',
          maxWidth: 1160,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span style={{ fontSize: '0.76rem', color: 'var(--gray-400)' }}>
          Built for real estate professionals
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
            { label: 'Contact', href: '/contact' },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              style={{ fontSize: '0.76rem', color: 'var(--gray-400)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--gray-700)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--gray-400)' }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            padding: 40px 20px 32px !important;
          }
          .footer-bottom { padding: 18px 20px !important; }
        }
        @media (max-width: 520px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  )
}
