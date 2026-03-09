'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--gray-100)',
        padding: '28px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 700,
          fontSize: '0.92rem',
          color: 'var(--gray-700)',
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        <Image
          src="/Logo.png"
          alt="Dealflow AI logo"
          width={28}
          height={28}
          style={{ objectFit: 'contain' }}
        />
        Dealflow AI
      </div>

      <div style={{ fontSize: '0.76rem', color: 'var(--gray-400)' }}>
        © 2025 Dealflow AI · Confidential
      </div>

      <div style={{ display: 'flex', gap: 22 }}>
        {[
          { href: '#', label: 'Privacy' },
          { href: '#', label: 'Terms' },
          { href: 'mailto:hello@dealflow.ai', label: 'Contact' },
        ].map((link) => (
          <Link
            key={link.label}
            href={link.href}
            style={{
              color: 'var(--gray-400)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--gray-700)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--gray-400)' }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <style>{`
        @media (max-width: 860px) {
          footer {
            padding: 24px 20px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>
    </footer>
  )
}
