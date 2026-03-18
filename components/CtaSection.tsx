'use client'

import Image from 'next/image'

export default function CtaSection() {
  return (
    <div
      id="cta"
      style={{
        position: 'relative',
        padding: '72px 40px',
        background: '#0B1224',
        overflow: 'hidden',
      }}
    >
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
            fontSize: 'clamp(1.8rem, 3vw, 2.3rem)',
            fontWeight: 400,
            letterSpacing: '-0.022em',
            color: 'white',
            lineHeight: 1.15,
            marginBottom: 28,
          }}
        >
          Ready to Close More Deals?
        </h2>

        <a
          href="/signup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#2563EB',
            color: 'white',
            fontFamily: "'Satoshi', sans-serif",
            fontWeight: 600,
            fontSize: '0.92rem',
            padding: '12px 28px',
            borderRadius: 12,
            border: 'none',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
          }}
        >
          Get started free
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <style>{`
        @media (max-width: 860px) {
          #cta { padding: 56px 20px !important; }
        }
      `}</style>
    </div>
  )
}
