'use client'

import CinematicDemo from './CinematicDemo'

const DEMO_VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL

export default function Hero() {
  return (
    <>
      <div className="hero-outer">
        {/* Background image + overlay */}
        <div className="hero-bg" />
        <div className="hero-overlay" />

        {/* Content */}
        <div className="hero-content">
          {/* Eyebrow */}
          <p className="hero-eyebrow" style={{ opacity: 0, animation: 'fadeInHero 1s 0.15s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            Built for Real Estate Wholesalers
          </p>

          {/* Headline */}
          <h1 className="hero-h1" style={{ opacity: 0, animation: 'riseUpHero 1.2s 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            Close More Deals Without Doing More Work
          </h1>

          {/* Subtitle */}
          <p className="hero-sub" style={{ opacity: 0, animation: 'fadeInHero 1.2s 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            Find real buyers from county records. AI calls and qualifies them. Match them to your deals. Generate contracts. All on autopilot.
          </p>

          {/* Search bar CTA */}
          <div className="hero-cta-row" style={{ opacity: 0, animation: 'riseUpHero 1s 0.85s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            <a href="/signup" className="hero-search-bar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span className="hero-search-placeholder">Enter city to find cash buyers and off-market deals</span>
              <div className="hero-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </div>
            </a>
          </div>

          {/* Sign up CTA */}
          <div style={{ opacity: 0, animation: 'riseUpHero 1s 1s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            <a href="/signup" className="hero-btn-signup">
              Sign up free
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* Trust line */}
          <p className="hero-trust" style={{ opacity: 0, animation: 'fadeInHero 1s 1.15s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            Open to the public for a limited time.
          </p>
        </div>
      </div>

      {/* Product screenshot */}
      <div id="hero-demo" className="hero-screenshot-wrap reveal-scale">
        <div className="hero-browser-chrome">
          <div className="browser-dots">
            <span /><span /><span />
          </div>
          <div className="browser-url">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>dealflowai.app</span>
          </div>
          <div className="live-badge">
            <span className="live-dot" />
            Live
          </div>
        </div>
        {DEMO_VIDEO_URL ? (
          <video
            src={DEMO_VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', borderRadius: '0 0 16px 16px', display: 'block' }}
          />
        ) : (
          <CinematicDemo />
        )}
      </div>

      <style>{`
        .hero-outer {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          background-image: url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1920&q=80');
          background-size: cover;
          background-position: center 60%;
          z-index: 0;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(5,14,36,0.55) 0%, rgba(5,14,36,0.75) 50%, rgba(5,14,36,0.92) 100%);
          z-index: 1;
        }

        .hero-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 160px 40px 100px;
          max-width: 840px;
          margin: 0 auto;
          width: 100%;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-family: 'Satoshi', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.8);
          margin-bottom: 20px;
        }

        .hero-h1 {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: clamp(2.8rem, 5.5vw, 4.2rem);
          font-weight: 400;
          line-height: 1.08;
          letter-spacing: -0.035em;
          color: #ffffff;
          margin-bottom: 20px;
          max-width: 780px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-sub {
          font-family: 'Satoshi', sans-serif;
          font-size: 1.05rem;
          font-weight: 400;
          color: rgba(255,255,255,0.75);
          line-height: 1.7;
          max-width: 560px;
          margin: 0 auto 36px;
        }

        .hero-cta-row {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
          width: 100%;
        }

        .hero-search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          max-width: 560px;
          background: white;
          border-radius: 16px;
          padding: 10px 10px 10px 18px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 4px 24px rgba(5,14,36,0.12), 0 0 0 1px rgba(5,14,36,0.06);
        }
        .hero-search-bar:hover {
          box-shadow: 0 8px 32px rgba(5,14,36,0.18), 0 0 0 1px rgba(5,14,36,0.1);
          transform: translateY(-1px);
        }

        .hero-search-placeholder {
          flex: 1;
          font-family: 'Satoshi', sans-serif;
          font-size: 0.88rem;
          font-weight: 400;
          color: rgba(5,14,36,0.4);
          text-align: left;
        }

        .hero-search-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.2s ease;
        }
        .hero-search-bar:hover .hero-search-icon {
          background: #1e293b;
        }

        .hero-btn-signup {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.75);
          font-family: 'Satoshi', sans-serif;
          font-weight: 500;
          font-size: 0.9rem;
          padding: 10px 22px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.25);
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 8px;
        }
        .hero-btn-signup:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.45);
          color: white;
        }

        .hero-trust {
          font-family: 'Satoshi', sans-serif;
          font-size: 0.8rem;
          font-weight: 400;
          color: rgba(255,255,255,0.45);
        }

        /* Product screenshot */
        .hero-screenshot-wrap {
          max-width: 1060px;
          margin: 40px auto 0;
          padding: 0 40px 80px;
          position: relative;
          z-index: 3;
          opacity: 0;
          transform: translateY(60px) scale(0.92);
          transition: opacity 1s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, opacity;
        }
        .hero-screenshot-wrap.in {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .hero-browser-chrome {
          background: #1a1a2e;
          border-radius: 16px 16px 0 0;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .browser-dots {
          display: flex;
          gap: 7px;
        }
        .browser-dots span {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
        }
        .browser-dots span:first-child { background: #ff5f57; }
        .browser-dots span:nth-child(2) { background: #febc2e; }
        .browser-dots span:nth-child(3) { background: #28c840; }

        .browser-url {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 7px 14px;
          font-family: 'Satoshi', sans-serif;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.5);
        }

        @media (max-width: 768px) {
          .hero-content {
            padding: 130px 20px 70px;
          }
          .hero-search-bar {
            padding: 9px 9px 9px 14px;
          }
          .hero-search-placeholder {
            font-size: 0.78rem;
          }
          .hero-screenshot-wrap {
            padding: 0 12px 40px;
            margin-top: 20px;
          }
          .hero-browser-chrome {
            padding: 10px 12px;
            border-radius: 10px 10px 0 0;
            gap: 10px;
          }
          .browser-dots {
            gap: 5px;
          }
          .browser-dots span {
            width: 8px;
            height: 8px;
          }
          .browser-url {
            padding: 5px 10px;
            font-size: 0.68rem;
            border-radius: 6px;
          }
          .live-badge {
            font-size: 0.6rem;
          }
          .live-dot {
            width: 5px;
            height: 5px;
          }
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Satoshi', sans-serif;
          font-size: 0.68rem;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          margin-left: 8px;
        }
        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2563EB;
          animation: livePulse 2s ease infinite;
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(37,99,235,0); }
        }

        @keyframes mockupSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}


