'use client'

import { useState } from 'react'
import Image from 'next/image'

const listings = [
  {
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '5512 Peachtree Rd',
    city: 'Atlanta, GA',
    specs: '3 bd · 2 ba · 1,240 sqft',
    type: 'SFR · Flip',
    ask: '$87,500',
    arv: '$142K',
    fee: '+$14,500',
    status: 'New',
    statusColor: 'var(--blue-600)',
    statusBg: 'var(--blue-50)',
    wholesaler: 'Jordan M.',
    posted: '2h ago',
  },
  {
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '816 Magnolia Way',
    city: 'Atlanta, GA',
    specs: '3 bd · 2 ba · 1,340 sqft',
    type: 'SFR · Flip',
    ask: '$98,500',
    arv: '$162K',
    fee: '+$16,200',
    status: 'Hot',
    statusColor: 'var(--red)',
    statusBg: '#fef2f2',
    wholesaler: 'Alyssa T.',
    posted: '4h ago',
  },
  {
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '923 Cedar Lane',
    city: 'Atlanta, GA',
    specs: '4 bd · 2 ba · 1,720 sqft',
    type: 'SFR · Flip',
    ask: '$112,000',
    arv: '$195K',
    fee: '+$21,000',
    status: 'New',
    statusColor: 'var(--blue-600)',
    statusBg: 'var(--blue-50)',
    wholesaler: 'DeShawn P.',
    posted: '6h ago',
  },
]

const pins: [number, number][] = [[28, 35], [58, 55], [72, 28]]

export default function LiveDealMap() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  return (
    <div style={{ borderTop: '1px solid var(--border-light)', padding: '80px 40px', background: 'var(--cream)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        {/* Section header */}
        <div className="reveal" style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12, fontFamily: "'Satoshi', sans-serif" }}>
            Marketplace
          </div>
          <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(1.9rem, 3vw, 2.8rem)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.022em', color: 'var(--navy-heading)', marginBottom: 14 }}>
            Your Deals, Visible to <span style={{ color: 'var(--accent)' }}>Thousands of Buyers</span>
          </h2>
          <p style={{ fontSize: '0.97rem', color: 'var(--body-text)', lineHeight: 1.65, maxWidth: 520, fontFamily: "'Satoshi', sans-serif" }}>
            List your deals on the DealFlow marketplace. Verified buyers browse by market, see your comps and assignment fees, and submit offers directly.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600, marginTop: 10, fontFamily: "'Satoshi', sans-serif" }}>
            47 active deals across 5 markets
          </p>
        </div>

        {/* Two-column layout */}
        <div className="ldm-layout" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
          {/* LEFT: listings */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listings.map((l, i) => {
                const isActive = activeIdx === i
                const isHovered = hoveredIdx === i
                return (
                  <div
                    key={i}
                    onClick={() => setActiveIdx(activeIdx === i ? null : i)}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      background: isActive ? 'var(--accent-bg)' : 'var(--white)',
                      border: `1px solid ${isActive ? 'var(--accent-border)' : isHovered ? 'var(--border-med)' : 'var(--border-light)'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      overflow: 'hidden',
                      display: 'flex',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ position: 'relative', width: 85, minHeight: 90, flexShrink: 0, overflow: 'hidden', background: 'var(--warm-gray)' }}>
                      <Image src={l.img} alt={l.addr} fill sizes="85px" style={{ objectFit: 'cover' }} />
                      <span style={{
                        position: 'absolute', top: 5, left: 5,
                        fontSize: '0.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: l.statusColor, background: l.statusBg, borderRadius: 3, padding: '2px 5px',
                      }}>
                        {l.status}
                      </span>
                    </div>
                    {/* Details */}
                    <div style={{ flex: 1, padding: '8px 10px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--navy-heading)', lineHeight: 1.3 }}>{l.addr}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--navy-heading)', flexShrink: 0 }}>{l.ask}</div>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)', marginTop: 2 }}>{l.specs} · {l.type}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--muted-text)' }}>ARV <span style={{ fontWeight: 600 }}>{l.arv}</span></span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700 }}>{l.fee}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Browse marketplace CTA */}
            <a
              href="/marketplace"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', marginTop: 14,
                background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10,
                padding: '12px 20px', fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: '0.84rem',
                textDecoration: 'none', cursor: 'pointer', transition: 'opacity 0.15s',
              }}
            >
              Browse the marketplace
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* RIGHT: map */}
          <div style={{ position: 'sticky', top: 90 }}>
            <MapVisual hoveredIdx={hoveredIdx} activeIdx={activeIdx} onHover={setHoveredIdx} onSelect={setActiveIdx} />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .ldm-layout { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </div>
  )
}

function MapVisual({
  hoveredIdx,
  activeIdx,
  onHover,
  onSelect,
}: {
  hoveredIdx: number | null
  activeIdx: number | null
  onHover: (i: number | null) => void
  onSelect: (i: number | null) => void
}) {
  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: 'var(--warm-gray)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow)', height: 420 }}>
      {/* Map background */}
      <svg width="100%" height="100%" viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, display: 'block' }}>
        <defs>
          <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f0e8" />
            <stop offset="100%" stopColor="#ede8df" />
          </linearGradient>
        </defs>
        <rect width="600" height="420" fill="url(#mapBg)" />
        {/* Building footprints */}
        <rect x="0" y="0" width="155" height="130" fill="#e8e2d6" rx="2" />
        <rect x="170" y="0" width="120" height="95" fill="#e8e2d6" rx="2" />
        <rect x="310" y="0" width="290" height="80" fill="#e8e2d6" rx="2" />
        <rect x="0" y="155" width="100" height="120" fill="#e8e2d6" rx="2" />
        <rect x="120" y="130" width="140" height="100" fill="#e8e2d6" rx="2" />
        <rect x="280" y="100" width="110" height="90" fill="#e8e2d6" rx="2" />
        <rect x="410" y="95" width="190" height="115" fill="#e8e2d6" rx="2" />
        <rect x="0" y="295" width="130" height="125" fill="#e8e2d6" rx="2" />
        <rect x="150" y="250" width="120" height="130" fill="#e8e2d6" rx="2" />
        <rect x="290" y="210" width="150" height="110" fill="#e8e2d6" rx="2" />
        <rect x="460" y="230" width="140" height="130" fill="#e8e2d6" rx="2" />
        {/* Park */}
        <rect x="310" y="220" width="135" height="110" rx="8" fill="#d4dfc7" />
        {/* Roads */}
        <rect x="0" y="125" width="600" height="20" fill="#f0ebe2" />
        <rect x="0" y="240" width="600" height="16" fill="#f0ebe2" />
        <rect x="155" y="0" width="18" height="420" fill="#f0ebe2" />
        <rect x="290" y="0" width="16" height="420" fill="#f0ebe2" />
        <rect x="455" y="0" width="18" height="420" fill="#f0ebe2" />
        {/* Minor streets */}
        <rect x="0" y="60" width="600" height="4" fill="#ede8df" />
        <rect x="0" y="195" width="600" height="4" fill="#ede8df" />
        <rect x="0" y="290" width="600" height="4" fill="#ede8df" />
        <rect x="50" y="0" width="4" height="420" fill="#ede8df" />
        <rect x="100" y="0" width="4" height="420" fill="#ede8df" />
        <rect x="225" y="0" width="4" height="420" fill="#ede8df" />
        <rect x="350" y="0" width="4" height="420" fill="#ede8df" />
        <rect x="520" y="0" width="4" height="420" fill="#ede8df" />
        <line x1="0" y1="320" x2="320" y2="0" stroke="#f0ebe2" strokeWidth="12" />
      </svg>

      {/* City label */}
      <div style={{
        position: 'absolute', top: 14, left: 14,
        background: 'white', borderRadius: 8, padding: '6px 12px',
        fontSize: '0.76rem', fontWeight: 600, color: 'var(--navy-heading)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', gap: 6, zIndex: 20,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
        </svg>
        Atlanta, GA
      </div>

      {/* Live badge */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        background: 'white', borderRadius: 8, padding: '6px 10px',
        fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-600)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', gap: 5, zIndex: 20,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
        Live
      </div>

      {/* Listing count */}
      <div style={{
        position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--warm-gray)', borderRadius: 8, padding: '6px 12px',
        fontSize: '0.68rem', fontWeight: 600, color: 'var(--gray-500)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 20,
      }}>
        3 listings in this area
      </div>

      {/* Pins */}
      {pins.map(([x, y], i) => {
        const listing = listings[i]
        if (!listing) return null
        const isActive = activeIdx === i
        const isHovered = hoveredIdx === i
        const highlight = isActive || isHovered
        return (
          <div
            key={i}
            onClick={() => onSelect(activeIdx === i ? null : i)}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            style={{
              position: 'absolute', left: `${x}%`, top: `${y}%`,
              transform: 'translate(-50%, -100%)', cursor: 'pointer',
              zIndex: highlight ? 30 : 10,
            }}
          >
            {/* Tooltip */}
            {highlight && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                background: 'white', borderRadius: 10, padding: '10px 14px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: 190, pointerEvents: 'none', whiteSpace: 'nowrap',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--navy-heading)', marginBottom: 2 }}>{listing.addr}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', marginBottom: 6 }}>{listing.specs}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--body-text)', fontWeight: 500 }}>{listing.ask}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700 }}>{listing.fee}</span>
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--muted-text)', borderTop: '1px solid var(--border-light)', paddingTop: 4 }}>
                  Listed by {listing.wholesaler} · {listing.posted}
                </div>
                <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, background: 'white', rotate: '45deg', boxShadow: '2px 2px 4px rgba(0,0,0,0.06)' }} />
              </div>
            )}
            {/* Pin */}
            <div style={{
              width: highlight ? 34 : 28, height: highlight ? 34 : 28,
              borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
              background: isActive ? 'var(--blue-600)' : listing.status === 'Hot' ? 'var(--red)' : 'var(--accent)',
              border: '2.5px solid white',
              boxShadow: highlight ? '0 4px 14px rgba(37,99,235,0.35)' : '0 2px 8px rgba(37,99,235,0.25)',
              transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ transform: 'rotate(45deg)', color: 'white', fontWeight: 800, fontSize: '0.62rem', lineHeight: 1 }}>{i + 1}</span>
            </div>
          </div>
        )
      })}

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.0) 100%)',
        padding: '30px 20px 14px', textAlign: 'center', zIndex: 20,
      }}>
        <p style={{ fontSize: '0.74rem', color: 'var(--gray-500)' }}>3+ deals in Atlanta, GA</p>
      </div>
    </div>
  )
}
