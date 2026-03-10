'use client'

import { useState } from 'react'

const allListings = [
  {
    city: 'Atlanta, GA',
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '5512 Peachtree Rd, Atlanta GA',
    specs: '3 bd · 2 ba · 1,240 sqft',
    type: 'SFR · Flip',
    ask: '$87,500',
    arv: '$142K',
    fee: '+$14,500',
    status: 'New',
    statusColor: 'var(--blue-600)',
    statusBg: 'var(--blue-50)',
  },
  {
    city: 'Atlanta, GA',
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '816 Magnolia Way, Atlanta GA',
    specs: '3 bd · 2 ba · 1,340 sqft',
    type: 'SFR · Flip',
    ask: '$98,500',
    arv: '$162K',
    fee: '+$16,200',
    status: 'Hot',
    statusColor: 'var(--red)',
    statusBg: '#fef2f2',
  },
  {
    city: 'Atlanta, GA',
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '923 Cedar Lane, Atlanta GA',
    specs: '4 bd · 2 ba · 1,720 sqft',
    type: 'SFR · Flip',
    ask: '$112,000',
    arv: '$195K',
    fee: '+$21,000',
    status: 'New',
    statusColor: 'var(--blue-600)',
    statusBg: 'var(--blue-50)',
  },
  {
    city: 'Charlotte, NC',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '334 Pine Ave, Charlotte NC',
    specs: '3 bd · 1 ba · 1,100 sqft',
    type: 'SFR · Flip',
    ask: '$79,000',
    arv: '$128K',
    fee: '+$12,500',
    status: 'Hot',
    statusColor: 'var(--red)',
    statusBg: '#fef2f2',
  },
  {
    city: 'Charlotte, NC',
    img: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '1847 Oak St, Charlotte NC',
    specs: '4 bd · 2 ba · 1,580 sqft',
    type: 'SFR · Flip',
    ask: '$104,000',
    arv: '$171K',
    fee: '+$19,800',
    status: 'New',
    statusColor: 'var(--blue-600)',
    statusBg: 'var(--blue-50)',
  },
  {
    city: 'Charlotte, NC',
    img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '209 Elm Dr, Charlotte NC',
    specs: '3 bd · 2 ba · 1,290 sqft',
    type: 'SFR · Hold',
    ask: '$91,000',
    arv: '$148K',
    fee: '+$15,000',
    status: 'New',
    statusColor: 'var(--blue-600)',
    statusBg: 'var(--blue-50)',
  },
  {
    city: 'Tampa, FL',
    img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '4421 Bayshore Blvd, Tampa FL',
    specs: '3 bd · 2 ba · 1,460 sqft',
    type: 'SFR · Flip',
    ask: '$118,000',
    arv: '$198K',
    fee: '+$22,500',
    status: 'Hot',
    statusColor: 'var(--red)',
    statusBg: '#fef2f2',
  },
  {
    city: 'Tampa, FL',
    img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '811 Hillsborough Ave, Tampa FL',
    specs: '2 bd · 1 ba · 980 sqft',
    type: 'SFR · Flip',
    ask: '$64,500',
    arv: '$105K',
    fee: '+$11,000',
    status: 'New',
    statusColor: 'var(--blue-600)',
    statusBg: 'var(--blue-50)',
  },
  {
    city: 'Tampa, FL',
    img: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '2203 Dale Mabry Hwy, Tampa FL',
    specs: '4 bd · 3 ba · 2,010 sqft',
    type: 'SFR · Hold',
    ask: '$142,000',
    arv: '$230K',
    fee: '+$27,000',
    status: 'New',
    statusColor: 'var(--blue-600)',
    statusBg: 'var(--blue-50)',
  },
  {
    city: 'Phoenix, AZ',
    img: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '3310 W Indian School Rd, Phoenix AZ',
    specs: '3 bd · 2 ba · 1,380 sqft',
    type: 'SFR · Flip',
    ask: '$195,000',
    arv: '$318K',
    fee: '+$31,000',
    status: 'Hot',
    statusColor: 'var(--red)',
    statusBg: '#fef2f2',
  },
  {
    city: 'Dallas, TX',
    img: 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=400&h=220&q=75',
    addr: '5826 Gaston Ave, Dallas TX',
    specs: '3 bd · 1 ba · 1,120 sqft',
    type: 'SFR · Flip',
    ask: '$148,000',
    arv: '$241K',
    fee: '+$24,500',
    status: 'New',
    statusColor: 'var(--blue-600)',
    statusBg: 'var(--blue-50)',
  },
]

const cities = ['Atlanta, GA', 'Charlotte, NC', 'Tampa, FL', 'Phoenix, AZ', 'Dallas, TX']

// Pin positions [x%, y%] per city listing index
const pinPositions: Record<string, [number, number][]> = {
  'Atlanta, GA':   [[28, 35], [58, 55], [72, 28]],
  'Charlotte, NC': [[32, 50], [65, 32], [22, 68]],
  'Tampa, FL':     [[55, 52], [28, 38], [70, 68]],
  'Phoenix, AZ':   [[48, 44]],
  'Dallas, TX':    [[52, 47]],
}

interface Listing {
  city: string
  img: string
  addr: string
  specs: string
  type: string
  ask: string
  arv: string
  fee: string
  status: string
  statusColor: string
  statusBg: string
}

function MapVisual({
  results,
  pins,
  hoveredIdx,
  activeIdx,
  city,
  onHover,
  onSelect,
}: {
  results: Listing[]
  pins: [number, number][]
  hoveredIdx: number | null
  activeIdx: number | null
  city: string
  onHover: (i: number | null) => void
  onSelect: (i: number | null) => void
}) {
  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow)', height: 540 }}>
      {/* Map background */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 600 540"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      >
        {/* Base fill */}
        <rect width="600" height="540" fill="#eae9e0" />

        {/* City blocks */}
        <rect x="0"   y="0"   width="155" height="130" fill="#e0dfcf" />
        <rect x="170" y="0"   width="120" height="95"  fill="#e0dfcf" />
        <rect x="310" y="0"   width="290" height="80"  fill="#e0dfcf" />
        <rect x="0"   y="155" width="100" height="120" fill="#e0dfcf" />
        <rect x="120" y="130" width="140" height="100" fill="#e0dfcf" />
        <rect x="280" y="100" width="110" height="90"  fill="#e0dfcf" />
        <rect x="410" y="95"  width="190" height="115" fill="#e0dfcf" />
        <rect x="0"   y="295" width="130" height="100" fill="#e0dfcf" />
        <rect x="150" y="250" width="120" height="130" fill="#e0dfcf" />
        <rect x="290" y="210" width="150" height="110" fill="#e0dfcf" />
        <rect x="460" y="230" width="140" height="130" fill="#e0dfcf" />
        <rect x="0"   y="415" width="180" height="125" fill="#e0dfcf" />
        <rect x="200" y="400" width="130" height="140" fill="#e0dfcf" />
        <rect x="350" y="360" width="100" height="180" fill="#e0dfcf" />
        <rect x="470" y="380" width="130" height="160" fill="#e0dfcf" />

        {/* Park / green area */}
        <rect x="310" y="220" width="135" height="110" rx="8" fill="#c8d5b5" />
        <rect x="130" y="300" width="110" height="90"  rx="6" fill="#d0d9bc" />

        {/* Main roads - horizontal */}
        <rect x="0"   y="125" width="600" height="22" fill="white" opacity="0.95" />
        <rect x="0"   y="240" width="600" height="18" fill="white" opacity="0.9"  />
        <rect x="0"   y="345" width="600" height="22" fill="white" opacity="0.95" />
        <rect x="0"   y="410" width="600" height="14" fill="white" opacity="0.85" />

        {/* Main roads - vertical */}
        <rect x="155" y="0" width="20"  height="540" fill="white" opacity="0.95" />
        <rect x="290" y="0" width="18"  height="540" fill="white" opacity="0.9"  />
        <rect x="455" y="0" width="20"  height="540" fill="white" opacity="0.95" />
        <rect x="100" y="0" width="12"  height="540" fill="white" opacity="0.8"  />
        <rect x="395" y="0" width="12"  height="540" fill="white" opacity="0.8"  />

        {/* Minor roads */}
        <rect x="0"   y="60"  width="600" height="8" fill="white" opacity="0.6" />
        <rect x="0"   y="195" width="600" height="8" fill="white" opacity="0.6" />
        <rect x="0"   y="290" width="600" height="8" fill="white" opacity="0.6" />
        <rect x="0"   y="465" width="600" height="8" fill="white" opacity="0.6" />
        <rect x="50"  y="0" width="8" height="540" fill="white" opacity="0.55" />
        <rect x="225" y="0" width="8" height="540" fill="white" opacity="0.55" />
        <rect x="350" y="0" width="8" height="540" fill="white" opacity="0.55" />
        <rect x="520" y="0" width="8" height="540" fill="white" opacity="0.55" />

        {/* Diagonal road */}
        <line x1="0" y1="420" x2="320" y2="0" stroke="white" strokeWidth="14" opacity="0.7" />

        {/* Road center lines */}
        <line x1="0" y1="136" x2="600" y2="136" stroke="#e8e2d0" strokeWidth="1" strokeDasharray="12,10" />
        <line x1="165" y1="0" x2="165" y2="540" stroke="#e8e2d0" strokeWidth="1" strokeDasharray="12,10" />
        <line x1="300" y1="0" x2="300" y2="540" stroke="#e8e2d0" strokeWidth="1" strokeDasharray="12,10" />
      </svg>

      {/* City label chip */}
      <div style={{
        position: 'absolute', top: 14, left: 14,
        background: 'white', borderRadius: 8, padding: '6px 12px',
        fontSize: '0.76rem', fontWeight: 600, color: 'var(--gray-700)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', gap: 6,
        zIndex: 20,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
        </svg>
        {city}
      </div>

      {/* Live badge */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        background: 'white', borderRadius: 8, padding: '6px 10px',
        fontSize: '0.68rem', fontWeight: 700, color: 'var(--gray-600)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        display: 'flex', alignItems: 'center', gap: 5,
        zIndex: 20,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
        Live
      </div>

      {/* Pins */}
      {pins.map(([x, y], i) => {
        const listing = results[i]
        if (!listing) return null
        const isActive  = activeIdx  === i
        const isHovered = hoveredIdx === i
        const highlight = isActive || isHovered
        return (
          <div
            key={i}
            onClick={() => onSelect(activeIdx === i ? null : i)}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -100%)',
              cursor: 'pointer',
              zIndex: highlight ? 30 : 10,
            }}
          >
            {/* Tooltip */}
            {highlight && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'white',
                borderRadius: 10,
                padding: '10px 14px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                width: 170,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--gray-900)', marginBottom: 2 }}>
                  {listing.addr.split(',')[0]}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', marginBottom: 6 }}>{listing.specs}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)', fontWeight: 500 }}>{listing.ask}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--green)', fontWeight: 700 }}>{listing.fee}</span>
                </div>
                {/* Arrow */}
                <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, background: 'white', rotate: '45deg', boxShadow: '2px 2px 4px rgba(0,0,0,0.06)' }} />
              </div>
            )}

            {/* Pin body */}
            <div style={{
              width: highlight ? 34 : 28,
              height: highlight ? 34 : 28,
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              background: isActive ? 'var(--blue-600)' : listing.status === 'Hot' ? 'var(--red)' : '#1d1d1f',
              border: '2.5px solid white',
              boxShadow: highlight ? '0 4px 14px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.25)',
              transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ transform: 'rotate(45deg)', color: 'white', fontWeight: 800, fontSize: '0.62rem', lineHeight: 1 }}>
                {i + 1}
              </span>
            </div>
          </div>
        )
      })}

      {/* Bottom CTA gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.0) 100%)',
        padding: '48px 20px 18px',
        textAlign: 'center',
        zIndex: 20,
      }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: 10 }}>
          Sign in to view full details and contact wholesalers
        </p>
        <a
          href="/login"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#1d1d1f', color: 'white',
            borderRadius: 10, padding: '9px 22px',
            fontSize: '0.84rem', fontWeight: 600,
            textDecoration: 'none', letterSpacing: '-0.01em',
          }}
        >
          Get access
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  )
}

export default function LiveDealMap() {
  const [search, setSearch]     = useState('Atlanta, GA')
  const [input, setInput]       = useState('Atlanta, GA')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [activeIdx, setActiveIdx]   = useState<number | null>(null)

  const results = allListings.filter(l =>
    l.city.toLowerCase().includes(search.toLowerCase()) ||
    l.addr.toLowerCase().includes(search.toLowerCase())
  )

  const pins: [number, number][] = pinPositions[search] ?? results.map((_, i) => [25 + i * 22, 35 + i * 18] as [number, number])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(input)
    setActiveIdx(null)
    setHoveredIdx(null)
  }

  function handleCityClick(c: string) {
    setSearch(c)
    setInput(c)
    setActiveIdx(null)
    setHoveredIdx(null)
  }

  return (
    <div style={{ borderTop: '1px solid var(--gray-100)', padding: '96px 40px', background: 'var(--gray-50)' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>

        {/* Section header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 12 }}>
            Live deal map
          </div>
          <h2 style={{ fontFamily: 'inherit', fontSize: 'clamp(1.9rem, 3vw, 2.8rem)', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.022em', color: 'var(--gray-900)', marginBottom: 14 }}>
            Find active deals in any market.
          </h2>
          <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.65, maxWidth: 400 }}>
            Enter a city to browse live wholesale deals available right now.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="ldm-layout" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

          {/* LEFT: search + listings */}
          <div>
            {/* Search */}
            <form
              onSubmit={handleSearch}
              style={{ display: 'flex', gap: 8, background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 14, padding: 5, marginBottom: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '0 10px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Enter city, state (e.g. Atlanta, GA)"
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--gray-900)' }}
                />
              </div>
              <button
                type="submit"
                style={{ background: '#1d1d1f', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'opacity 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                Search
              </button>
            </form>

            {/* City pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
              {cities.map(c => (
                <button
                  key={c}
                  onClick={() => handleCityClick(c)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid var(--gray-200)', background: search === c ? 'var(--gray-900)' : 'var(--white)', color: search === c ? 'white' : 'var(--gray-500)', fontSize: '0.75rem', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Count label */}
            {results.length > 0 && (
              <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 12 }}>
                {results.length} active deal{results.length !== 1 ? 's' : ''} · {search}
              </div>
            )}

            {/* Listing cards */}
            <div className="ldm-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 440, overflowY: 'auto', paddingRight: 2 }}>
              {results.length > 0 ? results.map((l, i) => {
                const isActive  = activeIdx  === i
                const isHovered = hoveredIdx === i
                return (
                  <div
                    key={i}
                    onClick={() => setActiveIdx(activeIdx === i ? null : i)}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      background: isActive ? 'var(--blue-50)' : 'var(--white)',
                      border: `1px solid ${isActive ? 'var(--blue-200)' : isHovered ? 'var(--gray-300)' : 'var(--gray-200)'}`,
                      borderRadius: 12,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Pin number */}
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: isActive ? 'var(--blue-600)' : l.status === 'Hot' ? 'var(--red)' : 'var(--gray-100)',
                      color: isActive || l.status === 'Hot' ? 'white' : 'var(--gray-500)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.68rem', fontWeight: 800, flexShrink: 0, marginTop: 1,
                      transition: 'all 0.15s',
                    }}>
                      {i + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--gray-900)', lineHeight: 1.3 }}>{l.addr.split(',')[0]}</div>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: l.statusColor, background: l.statusBg, borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
                          {l.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', marginTop: 2 }}>{l.specs} · {l.type}</div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                        <div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--gray-400)', marginBottom: 1 }}>Ask</div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--gray-900)', letterSpacing: '-0.01em' }}>{l.ask}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--gray-400)', marginBottom: 1 }}>ARV</div>
                          <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--gray-600)' }}>{l.arv}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--gray-400)', marginBottom: 1 }}>Fee</div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--green)', letterSpacing: '-0.01em' }}>{l.fee}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--gray-400)', fontSize: '0.88rem' }}>
                  No deals found for &ldquo;{search}&rdquo; — try Atlanta, Charlotte, or Tampa.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: map */}
          <div style={{ position: 'sticky', top: 90 }}>
            <MapVisual
              results={results}
              pins={pins}
              hoveredIdx={hoveredIdx}
              activeIdx={activeIdx}
              city={search}
              onHover={setHoveredIdx}
              onSelect={setActiveIdx}
            />
          </div>
        </div>
      </div>

      <style>{`
        .ldm-list::-webkit-scrollbar { width: 4px; }
        .ldm-list::-webkit-scrollbar-track { background: transparent; }
        .ldm-list::-webkit-scrollbar-thumb { background: var(--gray-200); border-radius: 2px; }

        @media (max-width: 900px) {
          .ldm-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
