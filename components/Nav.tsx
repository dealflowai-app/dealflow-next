'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface NavProps {
  isAbout?: boolean
  currentPage?: 'about' | 'pricing'
}

export default function Nav({ isAbout = false, currentPage }: NavProps) {
  const activePage = currentPage ?? (isAbout ? 'about' : undefined)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (activePage) return

    const sections = ['how', 'platform', 'who']

    function updateNav() {
      let active: string | null = null
      sections.forEach((id) => {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 80) active = id
      })
      setActiveSection(active)
    }

    window.addEventListener('scroll', updateNav, { passive: true })
    updateNav()
    return () => window.removeEventListener('scroll', updateNav)
  }, [isAbout])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  function scrollToCta() {
    setMenuOpen(false)
    const el = document.getElementById('cta')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const mobileLinks = activePage
    ? [
        { label: 'How it works', href: '/#how' },
        { label: 'Platform', href: '/#platform' },
        { label: "Who it's for", href: '/#who' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'About', href: '/about' },
      ]
    : [
        { label: 'How it works', href: '#how' },
        { label: 'Platform', href: '#platform' },
        { label: "Who it's for", href: '#who' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'About', href: '/about' },
      ]

  return (
    <>
      <nav
        className="site-nav"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 62,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--gray-200)',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: '1.05rem',
            color: 'var(--gray-900)',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          <Image
            src="/Logo.png"
            alt="Dealflow AI logo"
            width={36}
            height={36}
            style={{ objectFit: 'contain', flexShrink: 0 }}
          />
          Dealflow AI
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--blue-600)',
              background: 'var(--blue-50)',
              border: '1px solid var(--blue-100)',
              borderRadius: 20,
              padding: '2px 8px',
              lineHeight: 1,
            }}
          >
            Beta
          </span>
        </Link>

        {/* Center links — desktop only */}
        <div
          className="nav-center-links"
          style={{ display: 'flex', gap: 2 }}
        >
          {activePage ? (
            <>
              <Link href="/#how" style={navLinkStyle(false)}>How it works</Link>
              <Link href="/#platform" style={navLinkStyle(false)}>Platform</Link>
              <Link href="/#who" style={navLinkStyle(false)}>Who it&apos;s for</Link>
              <div style={{ width: 1, height: 18, background: 'var(--gray-200)', margin: '0 6px', alignSelf: 'center' }} />
              <Link href="/pricing" style={navLinkStyle(activePage === 'pricing')}>Pricing</Link>
              <Link href="/about" style={navLinkStyle(activePage === 'about')}>About</Link>
            </>
          ) : (
            <>
              <Link href="#how" style={navLinkStyle(activeSection === 'how')}>How it works</Link>
              <Link href="#platform" style={navLinkStyle(activeSection === 'platform')}>Platform</Link>
              <Link href="#who" style={navLinkStyle(activeSection === 'who')}>Who it&apos;s for</Link>
              <div style={{ width: 1, height: 18, background: 'var(--gray-200)', margin: '0 6px', alignSelf: 'center' }} />
              <Link href="/pricing" style={navLinkStyle(false)}>Pricing</Link>
              <Link href="/about" style={navLinkStyle(false)}>About</Link>
            </>
          )}
        </div>

        {/* Right buttons — desktop only */}
        <div className="nav-right-desktop" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/login"
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--gray-700)',
              border: '1px solid var(--gray-200)',
              background: 'var(--white)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Sign in
          </Link>
          {activePage ? (
            <Link
              href="/#cta"
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--white)',
                border: 'none',
                background: 'var(--blue-600)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                letterSpacing: '-0.01em',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Join waitlist
            </Link>
          ) : (
            <button
              onClick={scrollToCta}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--white)',
                border: 'none',
                background: 'var(--blue-600)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-700)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue-600)' }}
            >
              Join waitlist
            </button>
          )}
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 9,
            border: '1px solid var(--gray-200)',
            background: 'var(--white)',
            cursor: 'pointer',
            color: 'var(--gray-700)',
            flexShrink: 0,
          }}
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`nav-mobile-overlay${menuOpen ? ' open' : ''}`}
        style={{
          position: 'fixed',
          top: 62,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99,
          background: 'var(--white)',
          overflowY: 'auto',
          display: 'none',
          flexDirection: 'column',
          paddingBottom: 40,
        }}
      >
        {/* Nav links */}
        <div style={{ padding: '4px 16px 0' }}>
          {mobileLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                padding: '15px 8px',
                fontSize: '1rem',
                fontWeight: 500,
                color: 'var(--gray-800)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--gray-100)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            style={{
              padding: '13px',
              borderRadius: 10,
              fontSize: '0.95rem',
              fontWeight: 500,
              color: 'var(--gray-700)',
              border: '1px solid var(--gray-200)',
              background: 'var(--white)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'block',
            }}
          >
            Sign in
          </Link>
          {activePage ? (
            <Link
              href="/#cta"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '13px',
                borderRadius: 10,
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--white)',
                background: 'var(--blue-600)',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'block',
              }}
            >
              Join waitlist
            </Link>
          ) : (
            <button
              onClick={scrollToCta}
              style={{
                padding: '13px',
                borderRadius: 10,
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--white)',
                border: 'none',
                background: 'var(--blue-600)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Join waitlist
            </button>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .site-nav { padding: 0 20px !important; }
          .nav-center-links { display: none !important; }
          .nav-right-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-mobile-overlay.open { display: flex !important; }
        }
      `}</style>
    </>
  )
}

function navLinkStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 13px',
    borderRadius: 7,
    fontSize: '0.85rem',
    fontWeight: 500,
    color: active ? 'var(--gray-900)' : 'var(--gray-500)',
    background: active ? 'var(--gray-100)' : 'transparent',
    textDecoration: 'none',
    transition: 'all 0.15s',
  }
}
