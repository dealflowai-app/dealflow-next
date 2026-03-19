'use client'

import Image from 'next/image'
import Link from 'next/link'

const columns = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#how' },
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
    <footer style={{ borderTop: '1px solid var(--border-light)', background: 'var(--white)' }}>
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
              fontFamily: 'inherit',
              fontWeight: 500,
              fontSize: '0.97rem',
              color: 'var(--navy-heading)',
              textDecoration: 'none',
              marginBottom: 14,
            }}
          >
            <Image src="/Logo.png" alt="DealFlow AI logo" width={30} height={30} style={{ objectFit: 'contain' }} />
            DealFlow AI
          </Link>
          <p style={{ fontSize: 13, color: 'var(--body-text)', lineHeight: 1.65, maxWidth: 220, marginTop: 12 }}>
            Real estate deals, closed on autopilot. AI-powered sourcing, analysis, and outreach for serious investors.
          </p>
          <p style={{ fontSize: 11, color: 'var(--muted-text)', marginTop: 28 }} suppressHydrationWarning>
            © {new Date().getFullYear()} DealFlow AI
          </p>
        </div>

        {/* Link columns */}
        {columns.map((col) => (
          <div key={col.heading}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'var(--muted-text)',
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
                    fontSize: 13,
                    color: 'var(--body-text)',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--navy-heading)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--body-text)' }}
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
          borderTop: '1px solid var(--border-light)',
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
        <span style={{ fontSize: 11, color: 'var(--muted-text)' }}>
          Built for Real Estate Wholesalers
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
              style={{ fontSize: 11, color: 'var(--muted-text)', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--navy-heading)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-text)' }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
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
      ` }} />
    </footer>
  )
}
