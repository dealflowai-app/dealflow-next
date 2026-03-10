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

export default function LiveDealMap() {
  const [search, setSearch] = useState('Atlanta, GA')
  const [input, setInput] = useState('Atlanta, GA')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const results = allListings.filter(l =>
    l.city.toLowerCase().includes(search.toLowerCase()) ||
    l.addr.toLowerCase().includes(search.toLowerCase())
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(input)
  }

  return (
    <div
      style={{
        borderTop: '1px solid var(--gray-100)',
        padding: '96px 40px',
        background: 'var(--gray-50)',
      }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue-600)', marginBottom: 12 }}>
            Live deal map
          </div>
          <h2
            style={{
              fontFamily: 'inherit',
              fontSize: 'clamp(1.9rem, 3vw, 2.8rem)',
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: '-0.022em',
              color: 'var(--gray-900)',
              marginBottom: 14,
            }}
          >
            Find active deals in any market.
          </h2>
          <p style={{ fontSize: '0.97rem', color: 'var(--gray-500)', lineHeight: 1.65, maxWidth: 400, margin: '0 auto 28px' }}>
            Enter a city to browse live wholesale deals available right now.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            style={{
              display: 'flex',
              gap: 8,
              background: 'var(--white)',
              border: '1px solid var(--gray-200)',
              borderRadius: 14,
              padding: 5,
              maxWidth: 480,
              margin: '0 auto 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '0 10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Enter city, state (e.g. Atlanta, GA)"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  color: 'var(--gray-900)',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: '#1d1d1f',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                fontFamily: 'inherit',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Search
            </button>
          </form>

          {/* City pills */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {cities.map(c => (
              <button
                key={c}
                onClick={() => { setSearch(c); setInput(c) }}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: '1px solid var(--gray-200)',
                  background: search === c ? 'var(--gray-900)' : 'var(--white)',
                  color: search === c ? 'white' : 'var(--gray-500)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 16 }}>
              {results.length} active deal{results.length !== 1 ? 's' : ''} · {search}
            </div>
            <div
              className="ldm-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
            >
              {results.map((l, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--gray-200)',
                    borderRadius: 16,
                    overflow: 'hidden',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    setHoveredIdx(i)
                    e.currentTarget.style.boxShadow = 'var(--shadow)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    setHoveredIdx(null)
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {hoveredIdx === i && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15,15,20,0.55)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        borderRadius: 16,
                      }}
                    >
                      <a
                        href="/login"
                        style={{
                          background: 'white',
                          color: '#1d1d1f',
                          fontFamily: 'inherit',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          padding: '10px 22px',
                          borderRadius: 10,
                          textDecoration: 'none',
                          letterSpacing: '-0.01em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        View listing
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </a>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit' }}>
                        Sign in to access full details
                      </span>
                    </div>
                  )}
                  <div style={{ position: 'relative' }}>
                    <img src={l.img} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                    <span
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: l.statusColor,
                        background: l.statusBg,
                        borderRadius: 6,
                        padding: '3px 8px',
                      }}
                    >
                      {l.status}
                    </span>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--gray-900)', marginBottom: 3, lineHeight: 1.3 }}>{l.addr}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginBottom: 12 }}>{l.specs} · {l.type}</div>
                    <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--gray-100)', paddingTop: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--gray-400)', marginBottom: 2 }}>Ask price</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>{l.ask}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--gray-400)', marginBottom: 2 }}>ARV</div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--gray-600)' }}>{l.arv}</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--gray-400)', marginBottom: 2 }}>Assign fee</div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--green)', letterSpacing: '-0.01em' }}>{l.fee}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)', fontSize: '0.9rem' }}>
            No deals found for &ldquo;{search}&rdquo; — try Atlanta, Charlotte, or Tampa.
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            textAlign: 'center',
            padding: '16px',
            border: '1px dashed var(--gray-200)',
            borderRadius: 14,
            fontSize: '0.82rem',
            color: 'var(--gray-400)',
          }}
        >
          Sign up to see full deal details, contact wholesalers, and get notified of new deals in {search}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .ldm-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .ldm-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
