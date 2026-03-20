'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface NavProps {
  isAbout?: boolean
  currentPage?: 'about' | 'pricing' | 'login' | 'signup' | 'onboarding'
  forceWhite?: boolean
}

export default function Nav({ isAbout = false, currentPage, forceWhite = false }: NavProps) {
  const activePage = currentPage ?? (isAbout ? 'about' : undefined)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 60)

      if (!activePage) {
        const sections = ['product-showcase', 'who']
        let active: string | null = null
        sections.forEach((id) => {
          const el = document.getElementById(id)
          if (el && el.getBoundingClientRect().top <= 80) active = id
        })
        setActiveSection(active)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activePage])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const hasLightHero = !!activePage
  const showWhiteNav = isScrolled || forceWhite
  const darkText = isScrolled || hasLightHero || forceWhite

  const mobileLinks = activePage
    ? [
        { label: 'Platform', href: '/#product-showcase' },
        { label: "Who it's for", href: '/#who' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'About', href: '/about' },
      ]
    : [
        { label: 'Platform', href: '#product-showcase' },
        { label: "Who it's for", href: '#who' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'About', href: '/about' },
      ]

  return (
    <>
      {/* ===== DESKTOP NAV - floating pill ===== */}
      <nav
        className="nav-desktop-wrap"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          padding: '14px 24px',
          pointerEvents: 'none',
        }}
      >
        <div
          className="nav-pill"
          style={{
            width: '100%',
            maxWidth: isScrolled ? 720 : 1160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${isScrolled ? 7 : (hasLightHero ? 10 : 11)}px ${isScrolled ? 16 : (hasLightHero ? 20 : 24)}px`,
            borderRadius: isScrolled ? 16 : 14,
            background: showWhiteNav ? '#ffffff' : 'rgba(255,255,255,0)',
            boxShadow: isScrolled
              ? 'rgba(5,14,36,0.08) 0px 2px 4px, rgba(5,14,36,0.05) 0px 8px 24px'
              : showWhiteNav && !isScrolled
                ? 'rgba(5,14,36,0.06) 0px 1px 2px, rgba(5,14,36,0.04) 0px 2px 8px'
                : 'none',
            transition: 'max-width 0.55s cubic-bezier(0.22, 1, 0.36, 1), padding 0.5s cubic-bezier(0.22, 1, 0.36, 1), background 0.4s ease, box-shadow 0.4s ease, border-radius 0.45s ease, border-color 0.4s ease',
            pointerEvents: 'auto',
            position: 'relative' as const,
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              fontFamily: 'inherit',
              fontWeight: 500,
              fontSize: '1.02rem',
              color: darkText ? 'var(--navy-heading)' : 'white',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Image src="/Logo.png" alt="DealFlow AI logo" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
            DealFlow AI
            <span className="nav-beta-badge" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: '0.68rem', fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase',
              color: 'var(--blue-600)', background: 'var(--blue-50)', border: '1px solid var(--blue-100)',
              borderRadius: 20, padding: isScrolled ? '0' : '2px 8px', lineHeight: 1,
              opacity: isScrolled ? 0 : 1,
              width: isScrolled ? 0 : 'auto',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.35s ease, width 0.5s cubic-bezier(0.22, 1, 0.36, 1), padding 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            }}>Beta</span>
          </Link>

          {/* Center links */}
          <div className="nav-center-links" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: 2 }}>
            {activePage ? (
              <>
                <Link href="/#product-showcase" style={navLinkStyle(false, darkText)}>Platform</Link>
                <Link href="/#who" style={navLinkStyle(false, darkText)}>Who it&apos;s for</Link>
                <div style={{ width: 1, height: 18, background: darkText ? 'var(--border-med)' : 'rgba(255,255,255,0.2)', margin: '0 6px', alignSelf: 'center', transition: 'background 0.35s ease' }} />
                <Link href="/pricing" style={navLinkStyle(activePage === 'pricing', darkText)}>Pricing</Link>
                <Link href="/about" style={navLinkStyle(activePage === 'about', darkText)}>About</Link>
              </>
            ) : (
              <>
                <Link href="#product-showcase" style={navLinkStyle(activeSection === 'product-showcase', darkText)}>Platform</Link>
                <Link href="#who" style={navLinkStyle(activeSection === 'who', darkText)}>Who it&apos;s for</Link>
                <div style={{ width: 1, height: 18, background: darkText ? 'var(--border-med)' : 'rgba(255,255,255,0.2)', margin: '0 6px', alignSelf: 'center', transition: 'background 0.35s ease' }} />
                <Link href="/pricing" style={navLinkStyle(false, darkText)}>Pricing</Link>
                <Link href="/about" style={navLinkStyle(false, darkText)}>About</Link>
              </>
            )}
          </div>

          {/* Right buttons */}
          <div className="nav-right-desktop" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/login" style={{
              padding: isScrolled ? '0' : '7px 14px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 500,
              color: darkText ? 'var(--body-text)' : 'rgba(255,255,255,0.85)',
              border: isScrolled ? 'none' : (darkText ? '1px solid var(--border-med)' : '1px solid rgba(255,255,255,0.25)'),
              background: 'transparent', fontFamily: 'inherit',
              transition: 'opacity 0.35s ease, width 0.5s cubic-bezier(0.22, 1, 0.36, 1), padding 0.5s cubic-bezier(0.22, 1, 0.36, 1), color 0.4s ease, border-color 0.4s ease',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              opacity: isScrolled ? 0 : 1,
              width: isScrolled ? 0 : 'auto',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}>Sign in</Link>
            <Link href="/signup" style={{
                padding: '7px 14px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
                color: 'white', border: 'none', background: '#2563EB', fontFamily: 'inherit',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', letterSpacing: '-0.01em',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2563EB' }}
            >Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ===== MOBILE NAV - single expanding card (Eden style) ===== */}
      <div
        className="nav-mobile-bar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          display: 'none',
          padding: '10px 12px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            borderRadius: 14,
            background: showWhiteNav || menuOpen ? '#ffffff' : 'rgba(255,255,255,0)',
            boxShadow: showWhiteNav || menuOpen
              ? 'rgba(5,14,36,0.08) 0px 2px 8px, rgba(5,14,36,0.04) 0px 1px 2px'
              : 'none',
            transition: 'background 0.5s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.45s ease',
            pointerEvents: 'auto',
            overflow: 'hidden',
          }}
        >
          {/* Header row - logo + hamburger/X */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 10px 10px 16px',
            }}
          >
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontWeight: 600, fontSize: '0.97rem',
                color: darkText || menuOpen ? 'var(--navy-heading)' : 'white',
                textDecoration: 'none', letterSpacing: '-0.01em',
                transition: 'color 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <Image src="/Logo.png" alt="DealFlow AI logo" width={26} height={26} style={{ objectFit: 'contain' }} />
              DealFlow AI
              <span style={{
                fontSize: '0.62rem', fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase',
                color: 'var(--blue-600)', background: 'var(--blue-50)', border: '1px solid var(--blue-100)',
                borderRadius: 20, padding: '2px 7px', lineHeight: 1,
              }}>Beta</span>
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 10,
                border: '1px solid',
                borderColor: darkText || menuOpen ? 'rgba(5,14,36,0.1)' : 'rgba(255,255,255,0.15)',
                background: darkText || menuOpen ? 'rgba(5,14,36,0.03)' : 'rgba(255,255,255,0.06)',
                cursor: 'pointer', position: 'relative',
                transition: 'background 0.5s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <span className={`hamburger-line hamburger-top${menuOpen ? ' open' : ''}`}
                style={{ background: darkText || menuOpen ? 'var(--navy-heading)' : 'white' }} />
              <span className={`hamburger-line hamburger-bot${menuOpen ? ' open' : ''}`}
                style={{ background: darkText || menuOpen ? 'var(--navy-heading)' : 'white' }} />
            </button>
          </div>

          {/* Expandable menu content */}
          <div
            className="nav-mobile-content"
            style={{
              display: 'grid',
              gridTemplateRows: menuOpen ? '1fr' : '0fr',
              transition: 'grid-template-rows 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
          <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? 'translateY(0)' : 'translateY(-8px)',
              transition: menuOpen
                ? 'opacity 0.35s ease 0.08s, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.05s'
                : 'opacity 0.2s ease, transform 0.25s ease',
            }}
          >
            {/* Links */}
            <div style={{ padding: '4px 20px 0' }}>
              {mobileLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="mobile-link"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '5px 0',
                    fontSize: '0.88rem',
                    fontWeight: 400,
                    color: 'var(--navy-heading)',
                    textDecoration: 'none',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link
                href="/login"
                className="btn-login"
                onClick={() => setMenuOpen(false)}
                style={{
                  width: '100%', padding: '8px', borderRadius: 10,
                  fontSize: '0.88rem', fontWeight: 500, color: 'var(--navy-heading)',
                  border: '1px solid rgba(5,14,36,0.12)', background: 'rgba(5,14,36,0.02)',
                  textDecoration: 'none', textAlign: 'center', display: 'block',
                  fontFamily: 'inherit',
                }}
              >Sign In</Link>
              <Link
                  href="/signup"
                  className="btn-cta"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 10,
                    fontSize: '0.88rem', fontWeight: 600, color: 'white',
                    background: '#2563EB', textDecoration: 'none',
                    textAlign: 'center', display: 'block',
                  }}
                >Get Started</Link>
            </div>
          </div>
          </div>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      <div
        className="nav-mobile-overlay"
        onClick={() => setMenuOpen(false)}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 100,
          background: 'rgba(5,14,36,0.1)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .hamburger-line {
          position: absolute;
          left: 50%;
          width: 18px;
          height: 2px;
          margin-left: -9px;
          border-radius: 2px;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hamburger-top { top: 50%; transform: translateY(-4px); }
        .hamburger-bot { top: 50%; transform: translateY(3px); }
        .hamburger-top.open { transform: translateY(-0.5px) rotate(45deg); }
        .hamburger-bot.open { transform: translateY(-0.5px) rotate(-45deg); }

        .mobile-link { transition: opacity 0.2s ease; }
        .mobile-link:hover { opacity: 0.55; }

        .btn-login { transition: background 0.2s ease, border-color 0.2s ease; }
        .btn-login:hover { background: rgba(5,14,36,0.06) !important; border-color: rgba(5,14,36,0.18) !important; }

        .btn-cta { transition: background 0.2s ease, transform 0.2s ease; }
        .btn-cta:hover { background: #1D4ED8 !important; }

        @media (max-width: 860px) {
          .nav-desktop-wrap { display: none !important; }
          .nav-mobile-bar { display: flex !important; }
        }
        @media (min-width: 861px) {
          .nav-mobile-bar { display: none !important; }
          .nav-mobile-overlay { display: none !important; }
        }
      ` }} />
    </>
  )
}

function navLinkStyle(active: boolean, whiteNav: boolean): React.CSSProperties {
  return {
    padding: '6px 13px',
    borderRadius: 7,
    fontSize: '14.5px',
    fontWeight: 500,
    color: whiteNav
      ? (active ? 'var(--navy-heading)' : 'var(--body-text)')
      : (active ? 'white' : 'rgba(255,255,255,0.78)'),
    background: active && whiteNav ? 'rgba(5,14,36,0.04)' : 'transparent',
    textDecoration: 'none',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  }
}
