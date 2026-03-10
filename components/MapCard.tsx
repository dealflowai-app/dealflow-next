'use client'

import { useState, useEffect } from 'react'

type FilterType = 'all' | 'active' | 'sold'
type PinType = 'active' | 'hot' | 'sold' | 'fresh'

interface Pin {
  top: string
  left: string
  type: PinType
  label: string
  stemColor: string
  tipStyle?: React.CSSProperties
  tooltip: {
    addr: string
    rows: { key: string; val: string; valColor?: string }[]
  }
}

const pins: Pin[] = [
  {
    top: '44%', left: '20%', type: 'active', label: '$119K',
    stemColor: 'var(--blue-600)',
    tipStyle: { left: 0, transform: 'translateX(0)' },
    tooltip: {
      addr: '5512 Peachtree Rd, Atlanta GA',
      rows: [
        { key: 'Ask Price', val: '$119,000' },
        { key: 'ARV Est.', val: '$198,000' },
        { key: 'Type', val: 'SFR · 3/2' },
        { key: 'Status', val: 'Active', valColor: 'var(--blue-600)' },
      ],
    },
  },
  {
    top: '26%', left: '56%', type: 'hot', label: '🔥 $168K',
    stemColor: 'var(--red)',
    tipStyle: { bottom: 'auto', top: 'calc(100% + 10px)', transform: 'translateX(-40%)' },
    tooltip: {
      addr: '923 Cedar Lane, Tampa FL',
      rows: [
        { key: 'Ask Price', val: '$168,000' },
        { key: 'ARV Est.', val: '$265,000' },
        { key: 'Type', val: 'SFR · 4/2' },
        { key: 'Status', val: 'Hot deal', valColor: 'var(--red)' },
      ],
    },
  },
  {
    top: '55%', left: '14%', type: 'sold', label: 'Sold',
    stemColor: 'var(--green)',
    tipStyle: { left: 0, transform: 'translateX(0)' },
    tooltip: {
      addr: '816 Magnolia Way, Charlotte NC',
      rows: [
        { key: 'Sale Price', val: '$131,000' },
        { key: 'Assign Fee', val: '$16,200', valColor: 'var(--green)' },
        { key: 'Days closed', val: '11 days' },
        { key: 'Status', val: '✓ Closed', valColor: 'var(--green)' },
      ],
    },
  },
  {
    top: '44%', left: '76%', type: 'active', label: '$72K',
    stemColor: 'var(--blue-600)',
    tipStyle: { left: 'auto', right: 0, transform: 'translateX(0)' },
    tooltip: {
      addr: '7410 Lakeview Blvd, Indianapolis IN',
      rows: [
        { key: 'Ask Price', val: '$72,000' },
        { key: 'ARV Est.', val: '$121,000' },
        { key: 'Type', val: 'SFR · 3/1' },
        { key: 'Status', val: 'Active', valColor: 'var(--blue-600)' },
      ],
    },
  },
  {
    top: '72%', left: '47%', type: 'fresh', label: 'New · $64K',
    stemColor: 'var(--amber)',
    tipStyle: { transform: 'translateX(-40%)' },
    tooltip: {
      addr: '2091 Elm Street, Kansas City MO',
      rows: [
        { key: 'Ask Price', val: '$64,000' },
        { key: 'ARV Est.', val: '$109,000' },
        { key: 'Type', val: 'SFR · 3/1' },
        { key: 'Status', val: 'Just listed', valColor: 'var(--amber)' },
      ],
    },
  },
  {
    top: '18%', left: '84%', type: 'active', label: '$198K',
    stemColor: 'var(--blue-600)',
    tipStyle: { bottom: 'auto', top: 'calc(100% + 10px)', left: 'auto', right: 0, transform: 'translateX(0)' },
    tooltip: {
      addr: '1388 Sunset Blvd, Las Vegas NV',
      rows: [
        { key: 'Ask Price', val: '$198,000' },
        { key: 'ARV Est.', val: '$319,000' },
        { key: 'Type', val: 'SFR · 4/3' },
        { key: 'Status', val: 'Active', valColor: 'var(--blue-600)' },
      ],
    },
  },
]

const floatDeals = [
  { price: '$119,000', addr: '5512 Peachtree Rd, Atlanta GA', tag: 'Active', tagBg: 'var(--blue-50)', tagColor: 'var(--blue-600)' },
  { price: '$168,000', addr: '923 Cedar Lane, Tampa FL', tag: 'Hot Deal', tagBg: '#fef2f2', tagColor: 'var(--red)' },
  { price: '$131,000', addr: '816 Magnolia Way, Charlotte NC', tag: 'Sold', tagBg: '#ecfdf5', tagColor: 'var(--green)' },
  { price: '$72,000', addr: '7410 Lakeview Blvd, Indianapolis IN', tag: 'Active', tagBg: 'var(--blue-50)', tagColor: 'var(--blue-600)' },
  { price: '$64,000', addr: '2091 Elm Street, Kansas City MO', tag: 'New Listing', tagBg: '#fffbeb', tagColor: '#92400e' },
  { price: '$198,000', addr: '1388 Sunset Blvd, Las Vegas NV', tag: 'Active', tagBg: 'var(--blue-50)', tagColor: 'var(--blue-600)' },
]

function getPinLabelBg(type: PinType): React.CSSProperties {
  if (type === 'hot') return { background: 'var(--red)', color: 'white', boxShadow: '0 3px 10px rgba(239,68,68,0.35)' }
  if (type === 'sold') return { background: 'var(--green)', color: 'white', boxShadow: '0 3px 10px rgba(16,185,129,0.35)' }
  if (type === 'fresh') return { background: 'var(--amber)', color: '#1a1a1a', boxShadow: '0 3px 10px rgba(245,158,11,0.35)' }
  return { background: 'var(--blue-600)', color: 'white', boxShadow: '0 3px 10px rgba(37,99,235,0.35)' }
}

function getArrowColor(type: PinType): string {
  if (type === 'hot') return 'var(--red)'
  if (type === 'sold') return 'var(--green)'
  if (type === 'fresh') return 'var(--amber)'
  return 'var(--blue-600)'
}

function PinComponent({ pin, visible }: { pin: Pin; visible: boolean }) {
  const [hovered, setHovered] = useState(false)
  const bgStyle = getPinLabelBg(pin.type)
  const arrowColor = getArrowColor(pin.type)

  return (
    <div
      style={{
        position: 'absolute',
        top: pin.top,
        left: pin.left,
        transform: hovered ? 'translate(-50%, -100%) scale(1.08)' : 'translate(-50%, -100%)',
        cursor: 'pointer',
        zIndex: hovered ? 9999 : 10,
        transition: 'transform 0.15s',
        display: visible ? 'flex' : 'none',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'visible',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label bubble */}
      <div
        style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          padding: '4px 9px',
          borderRadius: 7,
          border: '2px solid white',
          whiteSpace: 'nowrap',
          position: 'relative',
          display: 'block',
          ...bgStyle,
        }}
      >
        {pin.label}

        {/* Arrow */}
        <span
          style={{
            content: '""',
            position: 'absolute',
            bottom: -7,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `4px solid ${arrowColor}`,
            display: 'block',
          }}
        />

        {/* Tooltip */}
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 12px)',
            left: '50%',
            transform: 'translateX(-40%)',
            background: 'white',
            border: '1px solid var(--gray-200)',
            borderRadius: 10,
            padding: '12px 14px',
            boxShadow: 'var(--shadow-lg)',
            minWidth: 185,
            opacity: hovered ? 1 : 0,
            pointerEvents: 'none',
            transition: 'opacity 0.15s',
            zIndex: 9999,
            fontSize: '0.78rem',
            ...pin.tipStyle,
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--gray-900)', marginBottom: 7, fontSize: '0.8rem' }}>
            {pin.tooltip.addr}
          </div>
          {pin.tooltip.rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-500)', marginBottom: 2 }}>
              <span>{row.key}</span>
              <span style={{ fontWeight: 600, color: row.valColor || 'var(--gray-900)' }}>{row.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stem */}
      <div style={{ width: 2, height: 5, marginTop: -1, background: pin.stemColor }} />
    </div>
  )
}

function FloatCard() {
  const [idx, setIdx] = useState(0)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setOpacity(0)
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % floatDeals.length)
        setOpacity(1)
      }, 300)
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  const deal = floatDeals[idx]

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 12,
        zIndex: 20,
        background: 'white',
        border: '1px solid var(--gray-200)',
        borderRadius: 10,
        padding: '10px 13px',
        boxShadow: 'var(--shadow)',
        fontSize: '0.76rem',
        transition: 'opacity 0.3s ease',
        opacity,
      }}
    >
      <div style={{ fontFamily: 'inherit', fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>
        {deal.price}
      </div>
      <div style={{ color: 'var(--gray-500)', marginTop: 1 }}>{deal.addr}</div>
      <div
        style={{
          display: 'inline-flex',
          marginTop: 6,
          background: deal.tagBg,
          color: deal.tagColor,
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 100,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {deal.tag}
      </div>
    </div>
  )
}

export default function MapCard() {
  const [filter, setFilter] = useState<FilterType>('all')

  function isPinVisible(pin: Pin) {
    if (filter === 'all') return true
    if (filter === 'sold') return pin.type === 'sold'
    if (filter === 'active') return pin.type === 'active' || pin.type === 'fresh' || pin.type === 'hot'
    return true
  }

  return (
    <div
      style={{
        borderRadius: 18,
        border: '1px solid var(--gray-200)',
        boxShadow: 'var(--shadow-lg)',
        background: 'var(--white)',
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--gray-100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '18px 18px 0 0',
          background: 'var(--white)',
          position: 'relative',
          zIndex: 2,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gray-500)' }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Live Deal Map · Nationwide
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: 100,
            }}
          >
            <span
              className="live-pill-dot"
              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}
            />
            Live
          </span>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'active', 'sold'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 11px',
                borderRadius: 6,
                fontSize: '0.72rem',
                fontWeight: 600,
                border: `1px solid ${filter === f ? 'var(--blue-600)' : 'var(--gray-200)'}`,
                background: filter === f ? 'var(--blue-600)' : 'var(--gray-50)',
                color: filter === f ? 'var(--white)' : 'var(--gray-500)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Map Canvas */}
      <div
        className="map-canvas-wrap"
        style={{
          height: 355,
          position: 'relative',
          background: '#edf2f9',
          overflow: 'visible',
        }}
      >
        {/* Background layer — clipped */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#edf2f9' }}>
          {/* Grid lines */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />
          {/* Horizontal roads */}
          <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.85)', height: 8, left: 0, right: 0, top: '32%' }} />
          <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.85)', height: 8, left: 0, right: 0, top: '62%' }} />
          {/* Vertical roads */}
          <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.85)', width: 8, top: 0, bottom: 0, left: '28%' }} />
          <div style={{ position: 'absolute', background: 'rgba(255,255,255,0.85)', width: 8, top: 0, bottom: 0, left: '64%' }} />
          {/* City blocks */}
          {[
            { top: '6%', left: '3%', width: '22%', height: '23%' },
            { top: '6%', left: '32%', width: '28%', height: '23%' },
            { top: '6%', left: '67%', width: '24%', height: '23%' },
            { top: '36%', left: '3%', width: '22%', height: '22%' },
            { top: '36%', left: '32%', width: '28%', height: '22%' },
            { top: '36%', left: '67%', width: '24%', height: '22%' },
            { top: '67%', left: '3%', width: '22%', height: '22%' },
            { top: '67%', left: '32%', width: '28%', height: '22%' },
            { top: '67%', left: '67%', width: '24%', height: '22%' },
          ].map((b, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                background: 'rgba(196,214,235,0.55)',
                borderRadius: 3,
                top: b.top,
                left: b.left,
                width: b.width,
                height: b.height,
              }}
            />
          ))}
        </div>

        {/* Pins — overflow visible */}
        {pins.map((pin, i) => (
          <PinComponent key={i} pin={pin} visible={isPinVisible(pin)} />
        ))}

        {/* Floating deal card */}
        <FloatCard />

        {/* AI Status bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--blue-600)',
            padding: '9px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {[0, 0.12, 0.24, 0.36, 0.48].map((delay, i) => (
              <div
                key={i}
                className="wave-b"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'white' }}>
              AI calling active · Nationwide
            </div>
            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.65)' }}>
              Qualifying buyers for active listings
            </div>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.18)',
              color: 'white',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 100,
            }}
          >
            48 calls live
          </div>
        </div>
      </div>

      {/* Map footer */}
      <div
        style={{
          padding: '11px 18px',
          borderTop: '1px solid var(--gray-100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '0 0 18px 18px',
          background: 'var(--white)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { color: 'var(--blue-600)', label: 'Active' },
            { color: 'var(--red)', label: 'Hot' },
            { color: 'var(--amber)', label: 'New' },
            { color: 'var(--green)', label: 'Sold' },
          ].map((item) => (
            <div
              key={item.label}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: 'var(--gray-500)' }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--blue-600)',
            background: 'var(--blue-50)',
            padding: '3px 10px',
            borderRadius: 100,
          }}
        >
          247 buyers in market
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .map-canvas-wrap { height: 270px !important; }
        }
      `}</style>
    </div>
  )
}
