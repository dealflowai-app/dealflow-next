'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface NavProps {
  isAbout?: boolean
}

export default function Nav({ isAbout = false }: NavProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    if (isAbout) return

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
  }, [isAbout]) // isAbout is the only dep that changes the effect behavior

  function scrollToCta() {
    const el = document.getElementById('cta')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav
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
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--gray-200)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
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

      {/* Center links */}
      <div
        className="nav-center-links"
        style={{ display: 'flex', gap: 2 }}
      >
        {isAbout ? (
          <>
            <Link href="/#how" style={navLinkStyle(false)}>How it works</Link>
            <Link href="/#platform" style={navLinkStyle(false)}>Platform</Link>
            <Link href="/#who" style={navLinkStyle(false)}>Who it&apos;s for</Link>
            <div style={{ width: 1, height: 18, background: 'var(--gray-200)', margin: '0 6px', alignSelf: 'center' }} />
            <Link href="/about" style={navLinkStyle(true)}>About</Link>
          </>
        ) : (
          <>
            <Link href="#how" style={navLinkStyle(activeSection === 'how')}>How it works</Link>
            <Link href="#platform" style={navLinkStyle(activeSection === 'platform')}>Platform</Link>
            <Link href="#who" style={navLinkStyle(activeSection === 'who')}>Who it&apos;s for</Link>
            <div style={{ width: 1, height: 18, background: 'var(--gray-200)', margin: '0 6px', alignSelf: 'center' }} />
            <Link href="/about" style={navLinkStyle(false)}>About</Link>
          </>
        )}
      </div>

      {/* Right buttons */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
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
          }}
          onMouseEnter={e => {
            const t = e.currentTarget
            t.style.borderColor = 'var(--gray-300)'
            t.style.background = 'var(--gray-50)'
          }}
          onMouseLeave={e => {
            const t = e.currentTarget
            t.style.borderColor = 'var(--gray-200)'
            t.style.background = 'var(--white)'
          }}
        >
          Sign in
        </button>
        {isAbout ? (
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

      <style>{`
        @media (max-width: 860px) {
          .nav-center-links { display: none !important; }
        }
      `}</style>
    </nav>
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
