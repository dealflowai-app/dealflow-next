'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const properties = [
  {
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '1847 Oak Street',
    city: 'Dallas',
    state: 'TX',
    zip: '75208',
    tag: 'SFR · Flip',
    ask: '$87,000',
    arv: '$148,000',
    fee: '$11,500',
    beds: 3,
    baths: 2,
    sqft: '1,420',
    dom: '2 days ago',
    status: 'Available',
  },
  {
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '5512 Peachtree Road',
    city: 'Atlanta',
    state: 'GA',
    zip: '30309',
    tag: 'SFR · Flip',
    ask: '$119,000',
    arv: '$198,000',
    fee: '$14,500',
    beds: 3,
    baths: 2,
    sqft: '1,540',
    dom: '1 day ago',
    status: 'Available',
  },
  {
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '2208 Sunridge Drive',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85015',
    tag: 'SFR · Flip',
    ask: '$145,000',
    arv: '$238,000',
    fee: '$18,000',
    beds: 3,
    baths: 2,
    sqft: '1,610',
    dom: '4 days ago',
    status: 'Available',
  },
  {
    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '7410 Lakeview Blvd',
    city: 'Indianapolis',
    state: 'IN',
    zip: '46226',
    tag: 'SFR · Flip',
    ask: '$72,000',
    arv: '$121,000',
    fee: '$9,800',
    beds: 3,
    baths: 1,
    sqft: '1,195',
    dom: '3 days ago',
    status: 'Under Review',
  },
  {
    img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '923 Cedar Lane',
    city: 'Tampa',
    state: 'FL',
    zip: '33603',
    tag: 'SFR · Hold',
    ask: '$168,000',
    arv: '$265,000',
    fee: '$21,000',
    beds: 4,
    baths: 2,
    sqft: '1,820',
    dom: '6 hours ago',
    status: 'Available',
  },
  {
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '3304 Chestnut Ave',
    city: 'Cleveland',
    state: 'OH',
    zip: '44113',
    tag: 'SFR · Flip',
    ask: '$58,000',
    arv: '$97,000',
    fee: '$8,500',
    beds: 3,
    baths: 1,
    sqft: '1,140',
    dom: '5 days ago',
    status: 'Available',
  },
  {
    img: 'https://images.unsplash.com/photo-1475275083424-b4ff42ded0af?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '816 Magnolia Way',
    city: 'Charlotte',
    state: 'NC',
    zip: '28205',
    tag: 'SFR · Flip',
    ask: '$131,000',
    arv: '$214,000',
    fee: '$16,200',
    beds: 3,
    baths: 2,
    sqft: '1,390',
    dom: '1 day ago',
    status: 'Available',
  },
  {
    img: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '415 Birchwood Drive',
    city: 'Memphis',
    state: 'TN',
    zip: '38103',
    tag: 'SFR · Hold',
    ask: '$78,000',
    arv: '$132,000',
    fee: '$11,000',
    beds: 4,
    baths: 2,
    sqft: '1,680',
    dom: '3 days ago',
    status: 'Available',
  },
  {
    img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '2091 Elm Street',
    city: 'Kansas City',
    state: 'MO',
    zip: '64108',
    tag: 'SFR · Flip',
    ask: '$64,000',
    arv: '$109,000',
    fee: '$9,200',
    beds: 3,
    baths: 1,
    sqft: '1,260',
    dom: '2 days ago',
    status: 'Available',
  },
  {
    img: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '744 Riverside Court',
    city: 'Detroit',
    state: 'MI',
    zip: '48209',
    tag: 'SFR · Flip',
    ask: '$41,000',
    arv: '$78,000',
    fee: '$7,400',
    beds: 3,
    baths: 1,
    sqft: '1,080',
    dom: '7 hours ago',
    status: 'Available',
  },
  {
    img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '1388 Sunset Boulevard',
    city: 'Las Vegas',
    state: 'NV',
    zip: '89101',
    tag: 'SFR · Flip',
    ask: '$198,000',
    arv: '$319,000',
    fee: '$22,500',
    beds: 4,
    baths: 3,
    sqft: '2,010',
    dom: '4 days ago',
    status: 'Under Review',
  },
  {
    img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=400&h=240&q=80',
    addr: '629 Maple Street',
    city: 'Pittsburgh',
    state: 'PA',
    zip: '15210',
    tag: 'SFR · Hold',
    ask: '$69,000',
    arv: '$116,000',
    fee: '$10,800',
    beds: 3,
    baths: 2,
    sqft: '1,320',
    dom: '5 days ago',
    status: 'Available',
  },
]

export default function PropertyStrip() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const doubled = [...properties, ...properties]

  return (
    <div
      style={{
        borderTop: '1px solid var(--gray-100)',
        borderBottom: '1px solid var(--gray-100)',
        background: 'var(--white)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: 1160,
          margin: '0 auto',
          padding: '20px 40px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        className="prop-strip-header"
      >
        <p style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
          Active deals on the platform
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 20, padding: '4px 12px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--blue-600)' }}>Live · Nationwide deals</span>
        </div>
      </div>

      {/* Scrolling strip */}
      <div style={{ paddingBottom: 24 }}>
        <div className="prop-strip-track">
          {doubled.map((p, i) => (
            <div
              key={i}
              className="prop-card"
              onClick={() => setShowModal(true)}
            >
              {/* Photo */}
              <div style={{ position: 'relative', width: '100%', height: 160, overflow: 'hidden' }}>
                <img
                  src={p.img}
                  alt={p.addr}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                  className="prop-card-img"
                />
                {/* Status badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: p.status === 'Available' ? 'rgba(22,163,74,0.92)' : 'rgba(234,179,8,0.92)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 6,
                    padding: '3px 9px',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: 'white',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  {p.status}
                </div>
                {/* Type badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    color: 'white',
                    letterSpacing: '0.04em',
                  }}
                >
                  {p.tag}
                </div>
                {/* Hover overlay */}
                <div className="prop-card-overlay">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>View Listing</span>
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: '12px 14px 14px' }}>
                {/* Ask price */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '1.08rem', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
                    {p.ask}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)', fontWeight: 500 }}>
                    Listed {p.dom}
                  </div>
                </div>

                {/* Address */}
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-800)', lineHeight: 1.3, marginBottom: 2 }}>
                  {p.addr}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginBottom: 10 }}>
                  {p.city}, {p.state} {p.zip}
                </div>

                {/* Beds / Baths / Sqft */}
                <div style={{ display: 'flex', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--gray-100)', fontSize: '0.75rem', color: 'var(--gray-600)', fontWeight: 500 }}>
                  <span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{p.beds}</span> bd
                  </span>
                  <span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{p.baths}</span> ba
                  </span>
                  <span>
                    <span style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{p.sqft}</span> sqft
                  </span>
                </div>

                {/* ARV + Fee */}
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--gray-400)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>ARV</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: 'var(--blue-600)' }}>{p.arv}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--gray-400)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assignment fee</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: 'var(--green)' }}>{p.fee}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Login gate modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'var(--white)',
              borderRadius: 20,
              padding: '40px 36px',
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--blue-50)', border: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>

            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 10, letterSpacing: '-0.02em' }}>
              Sign in to view this listing
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--gray-500)', lineHeight: 1.6, marginBottom: 28 }}>
              Full listing details, contact information, and deal documents are available to verified platform members.
            </p>

            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                background: 'var(--blue-600)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '13px 24px',
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                marginBottom: 12,
                transition: 'background 0.2s',
              }}
            >
              Sign in to your account
            </button>
            <button
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                background: 'transparent',
                color: 'var(--gray-500)',
                border: '1px solid var(--gray-200)',
                borderRadius: 12,
                padding: '12px 24px',
                fontFamily: 'inherit',
                fontWeight: 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <style>{`
        .prop-strip-track {
          display: flex;
          gap: 16px;
          padding: 4px 40px;
          animation: propscroll 60s linear infinite;
          width: max-content;
        }
        .prop-strip-track:hover {
          animation-play-state: paused;
        }
        @keyframes propscroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .prop-card {
          width: 260px;
          flex-shrink: 0;
          background: var(--white);
          border: 1px solid var(--gray-100);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.07);
          cursor: pointer;
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
        .prop-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.13);
          transform: translateY(-2px);
        }
        .prop-card:hover .prop-card-img {
          transform: scale(1.04);
        }
        .prop-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(37,99,235,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .prop-card:hover .prop-card-overlay {
          opacity: 1;
        }
        @media (max-width: 860px) {
          .prop-strip-header { padding: 16px 20px 12px !important; flex-direction: column; align-items: flex-start !important; gap: 8px; }
          .prop-strip-track { padding-left: 20px !important; }
        }
      `}</style>
    </div>
  )
}
