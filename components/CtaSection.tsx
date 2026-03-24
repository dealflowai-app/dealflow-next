'use client'

import Image from 'next/image'

export default function CtaSection() {
  return (
    <div
      id="cta"
      style={{
        position: 'relative',
        padding: '80px 40px',
        background: 'linear-gradient(180deg, #0B1224 0%, #0F1B3A 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
      }} />

      {/* Accent glow */}
      <div style={{
        position: 'absolute',
        top: '-60%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Faint logo in background */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 0.03,
        pointerEvents: 'none',
      }}>
        <Image src="/Logo.png" alt="" width={240} height={240} style={{ objectFit: 'contain' }} />
      </div>

      <div
        className="reveal"
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 580,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
            fontWeight: 400,
            letterSpacing: '-0.022em',
            color: 'white',
            lineHeight: 1.15,
            marginBottom: 14,
          }}
        >
          Ready to Close More Deals?
        </h2>

        <p style={{
          fontFamily: "var(--dash-font, 'Satoshi', sans-serif)",
          fontSize: '0.92rem',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.65,
          maxWidth: 440,
          margin: '0 auto',
        }}>
          Join the platform built to help wholesalers find buyers, automate outreach, and close deals faster.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginTop: 32 }}>
          <a
            href="/signup"
            className="cta-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--dash-blue, #2563EB)',
              color: 'white',
              fontFamily: "var(--dash-font, 'Satoshi', sans-serif)",
              fontWeight: 600,
              fontSize: '0.9rem',
              padding: '9px 24px',
              borderRadius: 'var(--dash-card-radius, 10px)',
              border: 'none',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
            }}
          >
            Start free
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="/pricing"
            className="cta-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: "var(--dash-font, 'Satoshi', sans-serif)",
              fontWeight: 500,
              fontSize: '0.88rem',
              padding: '9px 20px',
              borderRadius: 'var(--dash-card-radius, 10px)',
              border: '1px solid rgba(255,255,255,0.12)',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            View pricing
          </a>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .cta-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(37, 99, 235, 0.45) !important;
        }
        .cta-secondary:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.25) !important;
          color: white !important;
        }
        @media (max-width: 860px) {
          #cta { padding: 56px 20px !important; }
        }
      ` }} />
    </div>
  )
}
