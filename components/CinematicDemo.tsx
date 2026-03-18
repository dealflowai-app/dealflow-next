'use client'

import React, { useState, useEffect, useRef } from 'react'

/* ── Constants ──────────────────────────────────────────── */
const F = "'Satoshi',-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif"
const NAVY = '#0B1224'
const BLUE = '#2563EB'
const BL = '#60A5FA'
const PURP = '#8b5cf6'
const CREAM = '#F9FAFB'
const BD = '#E5E7EB'
const MT = 'rgba(5,14,36,0.45)'

const SCENES = [
  { dur: 7000, label: 'Find Buyers', nav: 3 },
  { dur: 5500, label: 'Buyer CRM', nav: 4 },
  { dur: 9500, label: 'AI Outreach', nav: 5 },
  { dur: 7500, label: 'Analyze Deal', nav: 6 },
  { dur: 6000, label: 'Ask AI', nav: 9 },
  { dur: 5000, label: 'Close Deal', nav: 8 },
]
const STEP_LABELS = ['Find Buyers', 'AI Outreach', 'Analyze Deal', 'Ask AI', 'Close Deal']
const SCENE_TO_STEP = [0, 0, 1, 2, 3, 4]
const MOBILE_IDX = [0, 2, 5]

/* Cursor keyframes per scene */
/* Cursor keyframes per scene — x,y relative to 800x480 viewport (sidebar=120px) */
const CK: { t: number; x: number; y: number }[][] = [
  /* S0 Find Buyers: search bar → search btn → buyer card → add to CRM */
  [{ t: 0, x: 550, y: 250 }, { t: 400, x: 280, y: 55 }, { t: 2500, x: 455, y: 55 }, { t: 4200, x: 300, y: 165 }, { t: 5600, x: 465, y: 172 }],
  /* S1 Buyer CRM: checkbox rows → send outreach → dropdown */
  [{ t: 0, x: 400, y: 100 }, { t: 800, x: 148, y: 230 }, { t: 1800, x: 148, y: 262 }, { t: 2300, x: 148, y: 294 }, { t: 3500, x: 280, y: 198 }, { t: 4200, x: 280, y: 225 }],
  /* S2 AI Outreach: watches campaign auto-run */
  [{ t: 0, x: 500, y: 130 }],
  /* S3 Analyze Deal: address input → analyze btn → save deal */
  [{ t: 0, x: 500, y: 240 }, { t: 500, x: 300, y: 55 }, { t: 2800, x: 455, y: 55 }, { t: 6800, x: 460, y: 420 }],
  /* S4 Ask AI: chat input → send btn → action btn */
  [{ t: 0, x: 500, y: 400 }, { t: 500, x: 430, y: 445 }, { t: 2500, x: 630, y: 445 }, { t: 5500, x: 320, y: 380 }],
  /* S5 Contract: send for signature btn */
  [{ t: 0, x: 400, y: 220 }, { t: 800, x: 380, y: 380 }],
]
const CL: number[][] = [
  [800, 2800, 5000, 6200],
  [1500, 2200, 2600, 4000, 4500],
  [],
  [1000, 3500, 7500],
  [1000, 2700, 5800],
  [1500],
]


/* ── Helpers ────────────────────────────────────────────── */
function tv(text: string, start: number, t: number, spd = 80) {
  if (t < start) return ''
  return text.slice(0, Math.min(Math.floor((t - start) / spd), text.length))
}
function td(text: string, start: number, t: number, spd = 80) {
  return t >= start + text.length * spd
}
function getCur(tl: { t: number; x: number; y: number }[], t: number) {
  let r = tl[0]
  for (const k of tl) { if (t >= k.t) r = k; else break }
  return r
}
function isClicking(clicks: number[], t: number) {
  return clicks.some(c => t >= c && t < c + 400)
}
function isPressing(clicks: number[], t: number) {
  return clicks.some(c => t >= c && t < c + 100)
}

const Caret = () => <span style={{ display: 'inline-block', width: 1, height: '1em', background: NAVY, marginLeft: 1, animation: 'cursorBlink 0.8s infinite', verticalAlign: 'text-bottom' }} />

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: 'white', fontSize: size * 0.38, fontWeight: 600, fontFamily: F }}>{initials}</span>
    </div>
  )
}

/* ── Cursor ─────────────────────────────────────────────── */
function DemoCursor({ x, y, clicking, pressing }: { x: number; y: number; clicking: boolean; pressing: boolean }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, zIndex: 50, pointerEvents: 'none',
      willChange: 'transform, left, top',
      transform: pressing ? 'scale(0.85)' : 'scale(1)',
      transition: 'left 0.3s cubic-bezier(0.22,0.61,0.36,1), top 0.3s cubic-bezier(0.22,0.61,0.36,1), transform 0.1s ease',
    }}>
      <svg width="11" height="14" viewBox="0 0 16 20" fill="none">
        <path d="M0.5 0.5L0.5 16.5L4.5 12.5L8 19.5L10.5 18.5L7 11.5L12.5 11.5L0.5 0.5Z" fill="white" stroke="black" strokeWidth="1" />
      </svg>
      {clicking && <div style={{ position: 'absolute', top: -8, left: -8, width: 28, height: 28, borderRadius: '50%', border: '1.5px solid rgba(37,99,235,0.3)', animation: 'clickRipple 0.4s ease-out forwards' }} />}
    </div>
  )
}

/* ── Sidebar ────────────────────────────────────────────── */
/* Icons match Lucide React icons used in the real sidebar (viewBox 0 0 24 24) */
const SW = 1.7
const SIDEBAR_NAV: { label: string; icon: React.ReactNode }[] = [
  /* LayoutDashboard */ { label: 'Dashboard', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg> },
  /* MessagesSquare */ { label: 'Feed', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 01-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 012 2z" /><path d="M18 9h2a2 2 0 012 2v11l-4-4h-6a2 2 0 01-2-2v-1" /></svg> },
  /* Store */ { label: 'Marketplace', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l2-4h16l2 4" /><path d="M2 7v13a1 1 0 001 1h18a1 1 0 001-1V7" /><path d="M9 21V11h6v10" /></svg> },
  /* UserSearch */ { label: 'Find Buyers', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="4" /><path d="M10.3 15H7a4 4 0 00-4 4v2" /><circle cx="17" cy="17" r="3" /><path d="m21 21-1.9-1.9" /></svg> },
  /* Users */ { label: 'Buyer List', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg> },
  /* PhoneOutgoing */ { label: 'Outreach', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 8 22 2 16 2" /><line x1="16" y1="8" x2="22" y2="2" /><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" /></svg> },
  /* Calculator */ { label: 'Analyze Deal', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="16" y1="14" x2="16" y2="18" /><line x1="8" y1="10" x2="8" y2="10.01" /><line x1="12" y1="10" x2="12" y2="10.01" /><line x1="16" y1="10" x2="16" y2="10.01" /><line x1="8" y1="14" x2="8" y2="14.01" /><line x1="12" y1="14" x2="12" y2="14.01" /><line x1="8" y1="18" x2="8" y2="18.01" /><line x1="12" y1="18" x2="12" y2="18.01" /></svg> },
  /* FolderOpen */ { label: 'My Deals', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M6 14l1.45-2.9A2 2 0 019.24 10H20a2 2 0 011.94 2.5l-1.55 6a2 2 0 01-1.93 1.5H4a2 2 0 01-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H20a2 2 0 012 2v2" /></svg> },
  /* FileSignature */ { label: 'Contracts', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M20 19.5v.5a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2h8.5L18 5.5" /><polyline points="14 2 14 8 20 8" /><path d="M11.378 15.626a1 1 0 11-3 1.002c-.561-1.68 1.03-5.397 1.03-5.397" /></svg> },
  /* Sparkles */ { label: 'Ask AI', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /></svg> },
]

function DemoSidebar({ activeIdx }: { activeIdx: number }) {
  return (
    <div style={{ width: 120, background: 'white', borderRight: `1px solid ${BD}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '10px 10px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <img src="/Logo.png" alt="" width={24} height={24} style={{ borderRadius: 6, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, fontFamily: F, letterSpacing: '-0.01em', lineHeight: 1 }}>DealFlow AI</span>
      </div>
      {/* Menu label */}
      <div style={{ padding: '6px 12px 4px', fontSize: 7.5, fontWeight: 600, color: 'rgba(5,14,36,0.28)', fontFamily: F, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Menu</div>
      {/* Nav items */}
      <div style={{ flex: 1, padding: '0 5px', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {SIDEBAR_NAV.map((item, i) => {
          const active = i === activeIdx
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 7px', borderRadius: 6,
              background: active ? 'rgba(37,99,235,0.08)' : 'transparent',
              color: active ? BLUE : 'rgba(5,14,36,0.5)',
              transition: 'all 0.25s ease',
            }}>
              <div style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
              <span style={{ fontSize: 9.5, fontWeight: active ? 600 : 500, fontFamily: F, whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>
          )
        })}
      </div>
      {/* Settings */}
      <div style={{ padding: '4px 5px', borderTop: `1px solid ${BD}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px', borderRadius: 6, color: 'rgba(5,14,36,0.45)' }}>
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
          <span style={{ fontSize: 9.5, fontWeight: 500, fontFamily: F }}>Settings</span>
        </div>
      </div>
      {/* User */}
      <div style={{ padding: '4px 8px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 7.5, fontWeight: 600, color: BLUE, fontFamily: F }}>AR</span>
        </div>
        <span style={{ fontSize: 8.5, color: NAVY, fontFamily: F, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Alex Rivera</span>
      </div>
    </div>
  )
}

/* ── Scene 0: Find Buyers ───────────────────────────────── */
function S0({ t }: { t: number }) {
  const q = 'Atlanta, GA'
  const typed = tv(q, 800, t, 55)
  const typeDone = td(q, 800, t, 55)
  const focused = t >= 800 && t < 2800
  const btnPressed = t >= 2800 && t < 2900
  const searching = t >= 3000 && t < 3300
  const hasResults = t >= 3300
  const showPins = t >= 3900
  const hoverIdx = t >= 4500 && t < 6500 ? 0 : -1
  const showDetail = t >= 5000 && t < 6200
  const addClicked = t >= 6200
  const showToast = t >= 6200 && t < 7700
  const activeFilter = t >= 2800 ? 2 : 0

  const buyers = [
    { name: 'Marcus Thompson', init: 'MT', county: 'Fulton County, GA', detail: 'Cash  ·  SFR  ·  3 days ago  ·  4 properties', price: '$127,000', score: 92 },
    { name: 'Lisa Wang', init: 'LW', county: 'DeKalb County, GA', detail: 'Cash  ·  Multi-fam  ·  5 days ago  ·  7 properties', price: '$215,000', score: 85 },
    { name: 'Rachel Patel', init: 'RP', county: 'Cobb County, GA', detail: 'Cash  ·  SFR  ·  8 days ago  ·  2 properties', price: '$98,500', score: 78 },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', position: 'relative' }}>
      {/* Left panel */}
      <div style={{ width: '55%', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', borderRight: `1px solid ${BD}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: F }}>Find Buyers</div>
            <div style={{ fontSize: 10, color: MT, fontFamily: F }}>Search county records for verified cash buyers</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, fontFamily: F, background: 'white', color: MT, border: `1px solid ${BD}`, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16M4 12h10M4 20h6" /></svg>
              Filters
            </span>
            <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, fontFamily: F, background: 'white', color: MT, border: `1px solid ${BD}`, fontWeight: 500 }}>Export</span>
          </div>
        </div>
        {/* Search row */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'white', borderRadius: 8, padding: '7px 10px', border: focused ? `2px solid ${BLUE}` : `1px solid ${BD}`, boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.25)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <span style={{ fontSize: 12, fontFamily: F, color: typed ? NAVY : 'rgba(5,14,36,0.3)', lineHeight: 1 }}>
              {typed || 'Search city or zip code...'}{t >= 1000 && !typeDone && <Caret />}
            </span>
          </div>
          <button style={{ background: btnPressed ? '#1d4ed8' : BLUE, color: 'white', border: 'none', borderRadius: 8, padding: '0 14px', fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'default', transform: btnPressed ? 'scale(0.97)' : 'scale(1)', transition: 'background 0.1s, transform 0.1s', whiteSpace: 'nowrap' }}>Search</button>
        </div>
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[
            { label: 'All', active: activeFilter === 0 },
            { label: 'SFR', active: false },
            { label: 'Cash Buyers', active: activeFilter === 2 },
            { label: 'Absentee', active: false },
            { label: 'High Equity', active: false },
          ].map(p => (
            <span key={p.label} style={{ fontSize: 9.5, fontWeight: 500, padding: '3px 9px', borderRadius: 5, fontFamily: F, background: p.active ? 'rgba(37,99,235,0.08)' : 'white', color: p.active ? BLUE : MT, border: p.active ? '1px solid rgba(37,99,235,0.2)' : `1px solid ${BD}`, transition: 'all 0.2s' }}>{p.label}</span>
          ))}
        </div>
        {/* Results header */}
        <div style={{ fontSize: 10.5, fontWeight: 500, color: MT, fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {searching ? (
              <>
                <div style={{ width: 12, height: 12, border: '1.5px solid rgba(5,14,36,0.15)', borderTopColor: NAVY, borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                Searching county records...
              </>
            ) : hasResults ? (
              <span><span style={{ fontWeight: 600, color: NAVY }}>26</span> verified buyers in Atlanta, GA</span>
            ) : (
              '0 buyers found'
            )}
          </div>
          {hasResults && <span style={{ fontSize: 9.5, color: 'rgba(5,14,36,0.3)' }}>Showing 1-3</span>}
        </div>
        {/* Buyer cards */}
        {hasResults && buyers.map((b, i) => (
          <div key={b.name} style={{
            background: 'white', borderRadius: 8, border: `1px solid ${hoverIdx === i ? 'rgba(37,99,235,0.25)' : BD}`,
            padding: '9px 10px', display: 'flex', gap: 9, position: 'relative' as const,
            boxShadow: hoverIdx === i ? '0 4px 14px rgba(5,14,36,0.07)' : 'none',
            transform: hoverIdx === i ? 'translateY(-1px)' : 'none',
            animation: `demoSlideUp 0.3s ease ${i * 0.15}s both`,
            transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
          }}>
            <Avatar initials={b.init} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: NAVY, fontFamily: F }}>{b.name}</span>
                <span style={{ fontSize: 8, fontWeight: 600, color: BLUE, background: 'rgba(37,99,235,0.07)', padding: '1px 6px', borderRadius: 3, fontFamily: F }}>Cash</span>
                <span style={{ fontSize: 8, fontWeight: 600, color: PURP, background: 'rgba(139,92,246,0.07)', padding: '1px 6px', borderRadius: 3, fontFamily: F }}>Score {b.score}</span>
              </div>
              <div style={{ fontSize: 9.5, color: MT, fontFamily: F, marginTop: 2 }}>{b.county}</div>
              <div style={{ fontSize: 9, color: 'rgba(5,14,36,0.3)', fontFamily: F, marginTop: 1 }}>{b.detail}</div>
            </div>
            <div style={{ textAlign: 'right' as const, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: NAVY, fontFamily: F }}>{b.price}</div>
              {i === 0 && addClicked ? (
                <div style={{ fontSize: 9.5, color: BLUE, fontFamily: F, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
                  Added
                </div>
              ) : (
                <div style={{ fontSize: 9.5, color: BLUE, fontFamily: F, fontWeight: 500 }}>Add to CRM +</div>
              )}
            </div>
            {/* Detail tooltip */}
            {i === 0 && showDetail && !addClicked && (
              <div style={{ position: 'absolute', right: -4, top: -48, background: 'white', borderRadius: 8, boxShadow: '0 6px 20px rgba(5,14,36,0.12)', border: `1px solid ${BD}`, padding: '7px 12px', zIndex: 5, animation: 'demoSlideUp 0.2s ease', display: 'flex', gap: 12, fontSize: 10, fontFamily: F, whiteSpace: 'nowrap' }}>
                <div><span style={{ color: MT, fontSize: 9 }}>Score</span><div style={{ color: BLUE, fontWeight: 700 }}>{b.score}/100</div></div>
                <div><span style={{ color: MT, fontSize: 9 }}>Type</span><div style={{ color: NAVY, fontWeight: 600 }}>SFR</div></div>
                <div><span style={{ color: MT, fontSize: 9 }}>Avg Close</span><div style={{ color: NAVY, fontWeight: 600 }}>10 days</div></div>
                <div><span style={{ color: MT, fontSize: 9 }}>Portfolio</span><div style={{ color: NAVY, fontWeight: 600 }}>4 props</div></div>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Right panel: map */}
      <div style={{ width: '45%', background: '#eae8e0', position: 'relative', overflow: 'hidden' }}>
        {/* Map grid lines (roads) */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          {/* Major roads */}
          <rect x="0" y="160" width="100%" height="3" fill="rgba(255,255,255,0.7)" />
          <rect x="130" y="0" width="3" height="100%" fill="rgba(255,255,255,0.7)" />
          {/* Minor roads */}
          <rect x="0" y="80" width="100%" height="1.5" fill="rgba(255,255,255,0.45)" />
          <rect x="0" y="240" width="100%" height="1.5" fill="rgba(255,255,255,0.45)" />
          <rect x="0" y="320" width="100%" height="1.5" fill="rgba(255,255,255,0.45)" />
          <rect x="0" y="400" width="100%" height="1.5" fill="rgba(255,255,255,0.45)" />
          <rect x="55" y="0" width="1.5" height="100%" fill="rgba(255,255,255,0.45)" />
          <rect x="210" y="0" width="1.5" height="100%" fill="rgba(255,255,255,0.45)" />
          <rect x="275" y="0" width="1.5" height="100%" fill="rgba(255,255,255,0.45)" />
          {/* Building blocks */}
          <rect x="60" y="85" width="65" height="70" rx="2" fill="rgba(200,196,186,0.5)" />
          <rect x="140" y="170" width="65" height="65" rx="2" fill="rgba(200,196,186,0.5)" />
          <rect x="60" y="250" width="55" height="60" rx="2" fill="rgba(200,196,186,0.5)" />
          <rect x="220" y="85" width="50" height="65" rx="2" fill="rgba(200,196,186,0.5)" />
          <rect x="140" y="330" width="55" height="60" rx="2" fill="rgba(200,196,186,0.5)" />
          <rect x="220" y="250" width="50" height="55" rx="2" fill="rgba(200,196,186,0.4)" />
          {/* Road labels */}
          <text x="15" y="155" fontSize="7" fill="rgba(0,0,0,0.2)" fontFamily={F}>Peachtree St</text>
          <text x="135" y="20" fontSize="7" fill="rgba(0,0,0,0.2)" fontFamily={F} transform="rotate(90 135 20)">Elm St</text>
        </svg>
        {/* Map pins */}
        {showPins && [
          { x: '28%', y: '28%', d: 0, label: 'MT' },
          { x: '58%', y: '52%', d: 150, label: 'LW' },
          { x: '72%', y: '22%', d: 300, label: 'RP' },
          { x: '40%', y: '70%', d: 400, label: '' },
          { x: '82%', y: '55%', d: 500, label: '' },
        ].map((p, i) => (
          <div key={i} style={{
            position: 'absolute', left: p.x, top: p.y, transform: `translate(-50%, -50%) ${hoverIdx === 0 && i === 0 ? 'scale(1.3)' : 'scale(1)'}`,
            animation: `fadeIn 0.3s ease ${p.d}ms both`,
            transition: 'transform 0.3s ease',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <div style={{ width: i < 3 ? 14 : 8, height: i < 3 ? 14 : 8, borderRadius: '50%', background: BLUE, border: '2.5px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }} />
            {p.label && hoverIdx === 0 && i === 0 && (
              <div style={{ background: NAVY, color: 'white', fontSize: 8, fontWeight: 600, fontFamily: F, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', animation: 'demoSlideUp 0.2s ease' }}>{p.label} - $127K</div>
            )}
          </div>
        ))}
        {/* Zoom controls */}
        <div style={{ position: 'absolute', right: 8, top: 8, display: 'flex', flexDirection: 'column', gap: 1, background: 'white', borderRadius: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ width: 26, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: MT, fontFamily: F, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>+</div>
          <div style={{ width: 26, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: MT, fontFamily: F }}>-</div>
        </div>
        {/* Map legend */}
        <div style={{ position: 'absolute', left: 8, bottom: 8, background: 'white', borderRadius: 6, padding: '5px 8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 8.5, fontFamily: F, color: MT }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE }} />Cash Buyers</span>
          <span>Atlanta, GA</span>
        </div>
      </div>
      {/* Toast */}
      {showToast && (
        <div style={{ position: 'absolute', top: 10, right: 16, background: 'white', borderRadius: 8, boxShadow: '0 6px 20px rgba(5,14,36,0.1)', border: `1px solid ${BD}`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, animation: 'demoSlideUp 0.3s ease', zIndex: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" /></svg>
          <span style={{ fontSize: 11, fontWeight: 500, color: NAVY, fontFamily: F }}>Marcus Thompson added to Buyer List</span>
        </div>
      )}
    </div>
  )
}

/* ── Scene 1: Buyer CRM ─────────────────────────────────── */
function S1({ t }: { t: number }) {
  const highlight = t < 800
  const sel1 = t >= 1500, sel2 = t >= 2200, sel3 = t >= 2600
  const selCount = (sel1 ? 1 : 0) + (sel2 ? 1 : 0) + (sel3 ? 1 : 0)
  const toolbar = selCount > 0
  const dropdown = t >= 4000 && t < 5500
  const hovering = t >= 4500
  const activeTab = 0

  const kpis = [
    { label: 'Total Buyers', val: '51', sub: '+8 this month', icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 10-16 0" /></svg> },
    { label: 'Qualified', val: '14', sub: 'Score 80+', icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg> },
    { label: 'New This Week', val: t >= 500 ? '4' : '3', anim: t >= 500 && t < 1000, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg> },
    { label: 'Avg Score', val: '82', sub: '+3 vs last', icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg> },
  ]

  const rows = [
    { name: 'Marcus Thompson', init: 'MT', status: 'Qualified', sColor: BLUE, score: 92, market: 'Phoenix, AZ', last: '2 min ago', phone: '(480) 555-0142', isNew: true },
    { name: 'Lisa Wang', init: 'LW', status: 'Qualified', sColor: BLUE, score: 85, market: 'Atlanta, GA', last: '1 hr ago', phone: '(404) 555-0198' },
    { name: 'David Kim', init: 'DK', status: 'New', sColor: BL, score: 78, market: 'Tampa, FL', last: '3 hrs ago', phone: '(813) 555-0276' },
    { name: 'Sarah Mitchell', init: 'SM', status: 'Contacted', sColor: PURP, score: 71, market: 'Charlotte, NC', last: '1 day ago', phone: '(704) 555-0331' },
    { name: 'James Rivera', init: 'JR', status: 'New', sColor: BL, score: 68, market: 'Orlando, FL', last: '2 days ago', phone: '(407) 555-0415' },
  ]
  const checks = [sel1, sel2, sel3, false, false]

  return (
    <div style={{ height: '100%', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: F }}>Buyer List</div>
          <div style={{ fontSize: 10, color: MT, fontFamily: F }}>51 contacts across 4 markets</div>
        </div>
        <button style={{ fontSize: 10, fontWeight: 600, color: 'white', background: BLUE, border: 'none', borderRadius: 7, padding: '5px 12px', fontFamily: F, cursor: 'default', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add Buyer
        </button>
      </div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ flex: 1, background: 'white', borderRadius: 8, padding: '8px 10px', border: `1px solid ${BD}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, background: 'rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k.icon}</div>
              <span style={{ fontSize: 9, color: MT, fontFamily: F, fontWeight: 500 }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, fontFamily: F, lineHeight: 1.1, animation: k.anim ? 'demoNumberTick 0.3s ease' : undefined }}>{k.val}</div>
            {k.sub && <div style={{ fontSize: 8.5, color: BLUE, fontFamily: F, fontWeight: 500, marginTop: 1 }}>{k.sub}</div>}
          </div>
        ))}
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BD}` }}>
        {['All Buyers', 'Qualified', 'New', 'Contacted'].map((tab, i) => (
          <div key={tab} style={{ padding: '6px 12px', fontSize: 10.5, fontWeight: i === activeTab ? 600 : 400, color: i === activeTab ? BLUE : MT, fontFamily: F, borderBottom: i === activeTab ? `2px solid ${BLUE}` : '2px solid transparent', marginBottom: -1, cursor: 'default' }}>{tab} {i === 0 && <span style={{ fontSize: 9, color: 'rgba(5,14,36,0.25)', fontWeight: 400 }}>51</span>}</div>
        ))}
      </div>
      {/* Selection toolbar */}
      {toolbar && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 12px', background: 'rgba(37,99,235,0.05)', borderRadius: 8, animation: 'demoSlideUp 0.2s ease', position: 'relative' as const }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: BLUE, fontFamily: F }}>{selCount} selected</span>
          <div style={{ width: 1, height: 14, background: 'rgba(37,99,235,0.15)' }} />
          <button style={{ fontSize: 10, fontWeight: 600, color: 'white', background: BLUE, border: 'none', borderRadius: 6, padding: '4px 12px', fontFamily: F, cursor: 'default' }}>Send Outreach</button>
          <span style={{ fontSize: 10, color: MT, fontFamily: F, cursor: 'default' }}>Add Tag</span>
          <span style={{ fontSize: 10, color: MT, fontFamily: F, cursor: 'default' }}>Export</span>
          {dropdown && (
            <div style={{ position: 'absolute', top: '100%', left: 90, marginTop: 4, background: 'white', borderRadius: 8, boxShadow: '0 8px 24px rgba(5,14,36,0.12)', border: `1px solid ${BD}`, padding: '4px', zIndex: 10, animation: 'demoSlideUp 0.2s ease', minWidth: 160 }}>
              <div style={{ padding: '7px 12px', fontSize: 11, fontWeight: 500, color: hovering ? 'white' : NAVY, background: hovering ? BLUE : 'transparent', fontFamily: F, borderRadius: 6, transition: 'all 0.15s' }}>Launch AI Campaign</div>
            </div>
          )}
        </div>
      )}
      {/* Table */}
      <div style={{ flex: 1, background: 'white', borderRadius: 8, border: `1px solid ${BD}`, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 70px 42px 72px 64px 26px', padding: '6px 10px', borderBottom: `1px solid ${BD}`, fontSize: 9, color: MT, fontFamily: F, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
          <div /><div>Name</div><div>Status</div><div>Score</div><div>Market</div><div>Activity</div><div />
        </div>
        {rows.map((r, i) => (
          <div key={r.name} style={{
            display: 'grid', gridTemplateColumns: '26px 1fr 70px 42px 72px 64px 26px',
            padding: '7px 10px', borderBottom: i < rows.length - 1 ? `1px solid rgba(0,0,0,0.04)` : undefined,
            alignItems: 'center',
            background: r.isNew && highlight ? 'rgba(37,99,235,0.03)' : i % 2 === 1 ? 'rgba(0,0,0,0.01)' : undefined,
            animation: r.isNew && highlight ? 'demoPulse 1s ease' : undefined,
          }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, border: checks[i] ? 'none' : '1.5px solid rgba(5,14,36,0.2)', background: checks[i] ? BLUE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              {checks[i] && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar initials={r.init} size={24} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F, lineHeight: 1.2 }}>{r.name}</div>
                <div style={{ fontSize: 8.5, color: 'rgba(5,14,36,0.3)', fontFamily: F }}>{r.phone}</div>
              </div>
            </div>
            <span style={{ fontSize: 8.5, fontWeight: 600, color: r.sColor, background: r.sColor + '12', padding: '2px 6px', borderRadius: 4, fontFamily: F, display: 'inline-block', width: 'fit-content' }}>{r.status}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: BLUE, fontFamily: F }}>{r.score}</span>
            <span style={{ fontSize: 9.5, color: MT, fontFamily: F }}>{r.market}</span>
            <span style={{ fontSize: 9, color: 'rgba(5,14,36,0.3)', fontFamily: F }}>{r.last}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.2)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Scene 2: AI Outreach ───────────────────────────────── */
function S2({ t }: { t: number }) {
  const contacts = [
    { name: 'Marcus Thompson', init: 'MT', phone: '(480) 555-0142', callStart: 500, connectAt: 2000, qualAt: 5000, hasTranscript: true },
    { name: 'Lisa Wang', init: 'LW', phone: '(404) 555-0198', callStart: 6000, connectAt: -1, noAnswerAt: 7500 },
    { name: 'David Kim', init: 'DK', phone: '(813) 555-0276', callStart: 8500, connectAt: 9200, qualAt: 10000 },
  ]
  function getStatus(c: typeof contacts[0]) {
    if (c.qualAt && t >= c.qualAt) return { text: 'Qualified', color: BLUE }
    if (c.noAnswerAt && t >= c.noAnswerAt) return { text: 'No Answer', color: MT }
    if (c.connectAt > 0 && t >= c.connectAt) return { text: 'Connected', color: BLUE }
    if (t >= c.callStart) return { text: 'Calling...', color: BL }
    return { text: 'Queued', color: 'rgba(5,14,36,0.25)' }
  }
  function callDuration(c: typeof contacts[0]) {
    if (t < c.callStart) return ''
    const secs = Math.floor((Math.min(t, c.qualAt || c.noAnswerAt || t) - c.callStart) / 1000)
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  }
  const completed = contacts.filter(c => (c.qualAt && t >= c.qualAt) || (c.noAnswerAt && t >= c.noAnswerAt)).length
  const qualified = contacts.filter(c => c.qualAt && t >= c.qualAt).length
  const pct = (completed / 3) * 100
  const allDone = completed === 3
  const showTranscript = t >= 3000 && t < 5000

  const lines = [
    { sp: 'AI', text: 'Hi Marcus, this is Sarah from DealFlow Properties...' },
    { sp: 'Marcus', text: "Yeah, hey, what's up?" },
    { sp: 'AI', text: 'I wanted to reach out about some properties in your area...' },
  ]

  return (
    <div style={{ height: '100%', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: F }}>Outreach Campaigns</div>
          <div style={{ fontSize: 10, color: MT, fontFamily: F }}>AI voice, SMS, and email automation</div>
        </div>
        <div style={{ display: 'flex', gap: 0, background: 'white', borderRadius: 7, border: `1px solid ${BD}`, overflow: 'hidden' }}>
          {['Voice', 'SMS', 'Email'].map((ch, i) => (
            <span key={ch} style={{ fontSize: 9.5, fontWeight: i === 0 ? 600 : 400, padding: '4px 10px', fontFamily: F, color: i === 0 ? BLUE : MT, background: i === 0 ? 'rgba(37,99,235,0.06)' : 'transparent', borderRight: i < 2 ? `1px solid ${BD}` : undefined }}>{ch}</span>
          ))}
        </div>
      </div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { label: 'Connected', val: `${completed - (contacts.filter(c => c.noAnswerAt && t >= c.noAnswerAt).length)}/${contacts.length}`, color: BLUE },
          { label: 'Avg Duration', val: t >= 5000 ? '2:14' : t >= 2000 ? '1:08' : '0:00', color: NAVY },
          { label: 'Qualified', val: `${qualified}`, color: BLUE },
          { label: 'Success Rate', val: qualified > 0 ? `${Math.round((qualified / Math.max(completed, 1)) * 100)}%` : '0%', color: BLUE },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'white', borderRadius: 7, border: `1px solid ${BD}`, padding: '7px 9px' }}>
            <div style={{ fontSize: 8.5, color: MT, fontFamily: F, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: F, lineHeight: 1.3 }}>{s.val}</div>
          </div>
        ))}
      </div>
      {/* Campaign header card */}
      <div style={{ background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: NAVY, fontFamily: F }}>Phoenix Cash Buyers: March</span>
            <span style={{ fontSize: 8.5, fontWeight: 600, color: allDone ? MT : BLUE, background: allDone ? 'rgba(5,14,36,0.06)' : 'rgba(37,99,235,0.08)', padding: '2px 8px', borderRadius: 4, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {!allDone && <span style={{ width: 4, height: 4, borderRadius: '50%', background: BLUE, animation: 'demoPulse 1.5s infinite' }} />}
              {allDone ? 'COMPLETED' : 'RUNNING'}
            </span>
          </div>
          <span style={{ fontSize: 10, color: MT, fontFamily: F, fontWeight: 500 }}>{completed}/3 calls</span>
        </div>
        <div style={{ height: 4, background: 'rgba(5,14,36,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: BLUE, borderRadius: 3, width: `${pct}%`, transition: 'width 0.5s ease' }} />
        </div>
      </div>
      {/* Contact rows */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {contacts.map((c, i) => {
          const st = getStatus(c)
          const calling = st.text === 'Calling...'
          const connected = st.text === 'Connected'
          const dur = callDuration(c)
          return (
            <div key={c.name} style={{ background: 'white', borderRadius: 8, border: `1px solid ${connected || calling ? 'rgba(37,99,235,0.15)' : BD}`, padding: '9px 11px', transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <Avatar initials={c.init} size={28} />
                    {(calling || connected) && <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: BLUE, border: '1.5px solid white' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: NAVY, fontFamily: F }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: 'rgba(5,14,36,0.3)', fontFamily: F }}>{c.phone}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {dur && <span style={{ fontSize: 9.5, color: MT, fontFamily: F, fontVariantNumeric: 'tabular-nums' }}>{dur}</span>}
                  {connected && <div style={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', height: 14 }}>{[0, 0.15, 0.3, 0.45, 0.6].map(d => <div key={d} style={{ width: 2, background: BLUE, borderRadius: 1, animation: `demoWav 0.8s ${d}s infinite` }} />)}</div>}
                  <span style={{ fontSize: 8.5, fontWeight: 600, color: st.color, background: st.color === MT ? 'rgba(5,14,36,0.06)' : st.color + '12', padding: '2px 8px', borderRadius: 4, fontFamily: F }}>{st.text}</span>
                </div>
              </div>
              {i === 0 && showTranscript && (
                <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 3, animation: 'demoSlideUp 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /></svg>
                    <span style={{ fontSize: 9, fontWeight: 600, color: BLUE, fontFamily: F }}>Live Transcript</span>
                  </div>
                  {lines.map((l, li) => {
                    const lStart = 3000 + li * 600
                    const lText = tv(l.text, lStart, t, 14)
                    if (!lText) return null
                    return <div key={li} style={{ fontSize: 10, fontFamily: F, color: l.sp === 'AI' ? BLUE : NAVY, paddingLeft: 14 }}><span style={{ fontWeight: 600 }}>{l.sp}: </span>{lText}{!td(l.text, lStart, t, 14) && <Caret />}</div>
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {allDone && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '3px 0', animation: 'demoSlideUp 0.3s ease' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" /></svg>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: BLUE, fontFamily: F }}>Campaign complete - 2 qualified leads</span>
        </div>
      )}
    </div>
  )
}

/* ── Scene 3: Analyze Deal ──────────────────────────────── */
function S3({ t }: { t: number }) {
  const addr = '4217 Elm St, Atlanta, GA'
  const typed = tv(addr, 800, t, 30)
  const typeDone = td(addr, 800, t, 30)
  const focused = t >= 1000 && t < 3000
  const analyzing = t >= 3500 && t < 5500
  const results = t >= 5500
  const saved = t >= 7500

  const steps = [
    { label: 'Looking up property...', at: 3500 },
    { label: 'Pulling comps...', at: 4000 },
    { label: 'Calculating ARV...', at: 4500 },
    { label: 'Scoring deal...', at: 5000 },
  ]
  const comps = [
    { addr: '4190 Elm St', dist: '0.1 mi', price: '$165,000', sqft: '1,480', sold: '12 days ago' },
    { addr: '4301 Oak Ave', dist: '0.3 mi', price: '$172,000', sqft: '1,520', sold: '24 days ago' },
    { addr: '4088 Elm St', dist: '0.2 mi', price: '$158,000', sqft: '1,410', sold: '31 days ago' },
  ]

  return (
    <div style={{ height: '100%', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: F }}>Analyze Deal</div>
          <div style={{ fontSize: 10, color: MT, fontFamily: F }}>Instant comps, ARV, and deal scoring</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, fontFamily: F, background: 'white', color: MT, border: `1px solid ${BD}`, fontWeight: 500 }}>History</span>
          <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, fontFamily: F, background: 'white', color: MT, border: `1px solid ${BD}`, fontWeight: 500 }}>Export PDF</span>
        </div>
      </div>
      {/* Input */}
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: 'white', borderRadius: 8, padding: '7px 10px', border: focused ? `2px solid ${BLUE}` : `1px solid ${BD}`, boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none', transition: 'all 0.15s' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.25)" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
          <span style={{ fontSize: 12, fontFamily: F, color: typed ? NAVY : 'rgba(5,14,36,0.3)', lineHeight: 1 }}>
            {typed || 'Enter property address...'}{t >= 1000 && !typeDone && <Caret />}
          </span>
        </div>
        <button style={{ background: BLUE, color: 'white', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'default', whiteSpace: 'nowrap' }}>
          {analyzing ? '...' : 'Analyze'}
        </button>
      </div>
      {/* Analysis steps */}
      {analyzing && (
        <div style={{ background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7, animation: 'demoSlideUp 0.2s ease' }}>
          {steps.map(s => {
            const done = t >= s.at + 500
            const active = t >= s.at && !done
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: t >= s.at ? 1 : 0.3, transition: 'opacity 0.2s' }}>
                {done ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" /></svg>
                  : active ? <div style={{ width: 14, height: 14, border: `2px solid ${BD}`, borderTopColor: BLUE, borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  : <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${BD}` }} />}
                <span style={{ fontSize: 11, color: done ? NAVY : MT, fontFamily: F, fontWeight: done ? 500 : 400 }}>{s.label}</span>
              </div>
            )
          })}
        </div>
      )}
      {/* Results */}
      {results && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, animation: 'demoSlideUp 0.35s ease' }}>
          {/* Property info bar */}
          <div style={{ background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 30, borderRadius: 5, background: 'rgba(5,14,36,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.25)" strokeWidth="1.5" strokeLinecap="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><path d="M9 9v.01M9 13v.01M9 17v.01" /></svg>
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 16, fontSize: 10, fontFamily: F }}>
              <div><span style={{ color: MT }}>Type </span><span style={{ color: NAVY, fontWeight: 600 }}>SFR</span></div>
              <div><span style={{ color: MT }}>Beds/Bath </span><span style={{ color: NAVY, fontWeight: 600 }}>3bd / 2ba</span></div>
              <div><span style={{ color: MT }}>Sqft </span><span style={{ color: NAVY, fontWeight: 600 }}>1,480</span></div>
              <div><span style={{ color: MT }}>Year </span><span style={{ color: NAVY, fontWeight: 600 }}>1998</span></div>
              <div><span style={{ color: MT }}>Lot </span><span style={{ color: NAVY, fontWeight: 600 }}>0.18 ac</span></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {/* Deal score */}
            <div style={{ background: 'white', borderRadius: 8, border: `1px solid rgba(37,99,235,0.2)`, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${BLUE}` }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: BLUE, fontFamily: F }}>A</span>
              </div>
              <div>
                <div style={{ fontSize: 9, color: MT, fontFamily: F, fontWeight: 500 }}>Deal Score</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: NAVY, fontFamily: F, lineHeight: 1 }}>87<span style={{ fontSize: 10, color: MT, fontWeight: 500 }}>/100</span></div>
              </div>
            </div>
            {/* Metrics */}
            {[
              { label: 'ARV', val: '$168K' },
              { label: 'Spread', val: '38%' },
              { label: 'Est. Profit', val: '$47K' },
              { label: 'Max Offer', val: '$105K' },
            ].map(m => (
              <div key={m.label} style={{ flex: 1, background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: MT, fontFamily: F, fontWeight: 500 }}>{m.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.label === 'Est. Profit' ? BLUE : NAVY, fontFamily: F, lineHeight: 1.3 }}>{m.val}</div>
              </div>
            ))}
          </div>
          {/* Comps table */}
          <div style={{ background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '8px 10px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F }}>Comparable Sales</span>
              <span style={{ fontSize: 9, color: MT, fontFamily: F }}>Within 0.5 mi, last 90 days</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 66px', padding: '4px 0', borderBottom: `1px solid ${BD}`, fontSize: 8.5, color: MT, fontFamily: F, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
              <div>Address</div><div>Sqft</div><div>Sold</div><div style={{ textAlign: 'right' }}>Price</div>
            </div>
            {comps.map((c, i) => (
              <div key={c.addr} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 66px', padding: '5px 0', borderBottom: i < comps.length - 1 ? '1px solid rgba(0,0,0,0.04)' : undefined, alignItems: 'center', animation: `demoSlideUp 0.3s ease ${i * 0.1}s both` }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 500, color: NAVY, fontFamily: F }}>{c.addr}</div>
                  <div style={{ fontSize: 8.5, color: 'rgba(5,14,36,0.3)', fontFamily: F }}>{c.dist} away</div>
                </div>
                <span style={{ fontSize: 10, color: MT, fontFamily: F }}>{c.sqft}</span>
                <span style={{ fontSize: 9, color: 'rgba(5,14,36,0.3)', fontFamily: F }}>{c.sold}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F, textAlign: 'right' }}>{c.price}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 9.5, color: MT, fontFamily: F }}>Avg comp price: <span style={{ fontWeight: 600, color: NAVY }}>$165,000</span></span>
            <button style={{ background: saved ? 'rgba(37,99,235,0.06)' : BLUE, color: saved ? BLUE : 'white', border: saved ? `1px solid rgba(37,99,235,0.2)` : 'none', borderRadius: 8, padding: '5px 14px', fontSize: 10.5, fontWeight: 600, fontFamily: F, cursor: 'default', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5 }}>
              {saved && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
              {saved ? 'Saved to Pipeline' : 'Save as Deal'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Scene 4: Ask AI ────────────────────────────────────── */
function S4({ t }: { t: number }) {
  const q = 'Which buyers match the Elm St deal?'
  const userMsg = tv(q, 800, t, 25)
  const userDone = td(q, 800, t, 25)
  const sent = t >= 2700
  const thinking = t >= 3000 && t < 3500

  const aiText = `Found 3 strong matches for 4217 Elm St:\n\nMarcus T. (92% match) - SFR buyer, Phoenix\nLisa W. (85% match) - Multi-family, Atlanta\nDavid K. (78% match) - Flip investor\n\nMarcus has verified proof of funds and closes in\n10 days. I recommend sending him the deal first.`
  const aiVis = tv(aiText, 3500, t, 7)
  const aiDone = td(aiText, 3500, t, 7)
  const showAction = aiDone && t >= 5500
  const actionClicked = t >= 5800
  const AiAvatar = () => (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke={BLUE} strokeWidth={1.5} strokeLinecap="round"><path d="M9 2l1.2 3.6L14 7l-3.8 1.4L9 12l-1.2-3.6L4 7l3.8-1.4L9 2z" /></svg>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Chat sidebar */}
      <div style={{ width: 150, borderRight: `1px solid ${BD}`, display: 'flex', flexDirection: 'column', background: 'white' }}>
        <div style={{ padding: '12px 10px 8px', borderBottom: `1px solid ${BD}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, fontFamily: F, marginBottom: 8 }}>Ask AI</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 8px', borderRadius: 6, border: `1px solid ${BD}`, fontSize: 10, fontFamily: F, color: 'rgba(5,14,36,0.3)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.25)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            Search chats...
          </div>
        </div>
        <div style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: MT, fontFamily: F, padding: '4px 6px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Today</div>
          {[
            { label: 'Elm St Analysis', active: true },
            { label: 'Buyer Strategy Q2', active: false },
            { label: 'Market Update ATL', active: false },
          ].map(c => (
            <div key={c.label} style={{ padding: '7px 8px', borderRadius: 6, fontSize: 10.5, fontFamily: F, color: c.active ? BLUE : NAVY, fontWeight: c.active ? 600 : 400, background: c.active ? 'rgba(37,99,235,0.06)' : 'transparent', lineHeight: 1.3 }}>{c.label}</div>
          ))}
          <div style={{ fontSize: 9, fontWeight: 600, color: MT, fontFamily: F, padding: '8px 6px 4px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Yesterday</div>
          {['Phoenix Comps', 'Deal Scoring Help', 'Campaign Results'].map(c => (
            <div key={c} style={{ padding: '7px 8px', borderRadius: 6, fontSize: 10.5, fontFamily: F, color: NAVY, fontWeight: 400, lineHeight: 1.3 }}>{c}</div>
          ))}
        </div>
        <div style={{ padding: '8px 6px', borderTop: `1px solid ${BD}` }}>
          <div style={{ padding: '6px 8px', borderRadius: 6, fontSize: 10, fontFamily: F, color: BLUE, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New Chat
          </div>
        </div>
      </div>
      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat header */}
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${BD}`, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: NAVY, fontFamily: F }}>Elm St Analysis</div>
            <div style={{ fontSize: 9.5, color: MT, fontFamily: F }}>AI has full context of your deals, buyers, and campaigns</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['Share', 'Export'].map(b => (
              <span key={b} style={{ fontSize: 9.5, color: MT, fontFamily: F, padding: '3px 8px', border: `1px solid ${BD}`, borderRadius: 5 }}>{b}</span>
            ))}
          </div>
        </div>
        {/* Messages */}
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'hidden' }}>
          {/* Prior context: AI greeting with suggestion chips */}
          <div style={{ display: 'flex', gap: 8 }}>
            <AiAvatar />
            <div>
              <div style={{ background: 'rgba(5,14,36,0.03)', borderRadius: '2px 12px 12px 12px', padding: '10px 14px', fontSize: 11.5, color: NAVY, fontFamily: F, lineHeight: 1.6, marginBottom: 6 }}>
                I have context on your 51 buyers, 3 active campaigns, and 4217 Elm St deal. How can I help?
              </div>
              {/* Suggestion chips (before user types) */}
              {t < 1000 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginLeft: 2 }}>
                  {['Match buyers to deals', 'Campaign performance', 'Market analysis'].map(s => (
                    <span key={s} style={{ fontSize: 9.5, padding: '4px 10px', borderRadius: 6, border: `1px solid ${BD}`, color: MT, fontFamily: F, background: 'white' }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* User message */}
          {userMsg && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: BLUE, color: 'white', borderRadius: '12px 12px 2px 12px', padding: '10px 14px', fontSize: 11.5, fontFamily: F, lineHeight: 1.5, maxWidth: '75%' }}>
                {userMsg}{!userDone && <Caret />}
              </div>
            </div>
          )}
          {/* Thinking dots */}
          {thinking && (
            <div style={{ display: 'flex', gap: 8 }}>
              <AiAvatar />
              <div style={{ display: 'flex', gap: 4, padding: '12px 0' }}>
                {[0, 0.2, 0.4].map(d => <div key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE, opacity: 0.35, animation: `demoPulse 1s ${d}s infinite` }} />)}
              </div>
            </div>
          )}
          {/* AI response */}
          {sent && !thinking && aiVis && (
            <div style={{ display: 'flex', gap: 8 }}>
              <AiAvatar />
              <div style={{ background: 'rgba(5,14,36,0.03)', borderRadius: '2px 12px 12px 12px', padding: '10px 14px', fontSize: 11, color: NAVY, fontFamily: F, lineHeight: 1.7, whiteSpace: 'pre-wrap', maxWidth: '85%' }}>
                {aiVis}{!aiDone && <Caret />}
              </div>
            </div>
          )}
          {/* Action button */}
          {showAction && (
            <div style={{ marginLeft: 36, animation: 'demoSlideUp 0.25s ease' }}>
              <button style={{ background: actionClicked ? 'rgba(37,99,235,0.06)' : BLUE, color: actionClicked ? BLUE : 'white', border: actionClicked ? `1px solid rgba(37,99,235,0.2)` : 'none', borderRadius: 8, padding: '6px 16px', fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'default', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5 }}>
                {actionClicked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
                {actionClicked ? 'Sent!' : 'Send Deal to Marcus'}
              </button>
            </div>
          )}
        </div>
        {/* Input */}
        <div style={{ padding: '10px 16px', borderTop: `1px solid ${BD}`, display: 'flex', gap: 8, alignItems: 'center', background: 'white' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, border: `1px solid ${BD}`, fontSize: 11.5, fontFamily: F, color: 'rgba(5,14,36,0.3)' }}>
            <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="rgba(5,14,36,0.2)" strokeWidth={1.5} strokeLinecap="round"><path d="M9 2l1.2 3.6L14 7l-3.8 1.4L9 12l-1.2-3.6L4 7l3.8-1.4L9 2z" /></svg>
            Ask anything about your deals, buyers, or market...
          </div>
          <button style={{ width: 34, height: 34, borderRadius: 10, background: BLUE, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Scene 5: Contract + Close ──────────────────────────── */
function S5({ t }: { t: number }) {
  const stages = ['Draft', 'Sent', 'Viewed', 'Signed']
  const stageIdx = t < 500 ? 0 : t < 1500 ? 0 : t < 2500 ? 1 : t < 3500 ? 2 : 3
  const signed = t >= 3500
  const celebrate = t >= 4000 && t < 5000
  const showLogo = t >= 4800

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      {showLogo ? (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.6s ease' }}>
          <div style={{ textAlign: 'center' }}>
            <img src="/Logo.png" alt="" width={52} height={52} style={{ borderRadius: 13, margin: '0 auto 14px', display: 'block', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, fontFamily: F, letterSpacing: '-0.02em' }}>DealFlow AI</div>
            <div style={{ fontSize: 10.5, color: MT, fontFamily: F, marginTop: 4 }}>The wholesaling platform</div>
          </div>
        </div>
      ) : (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: F }}>Contracts</div>
              <div style={{ fontSize: 10, color: MT, fontFamily: F }}>Assignment contracts and e-signatures</div>
            </div>
            <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, fontFamily: F, background: 'white', color: MT, border: `1px solid ${BD}`, fontWeight: 500 }}>All Contracts</span>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 10 }}>
            {/* Contract document */}
            <div style={{ flex: 1, background: 'white', borderRadius: 10, border: `1px solid ${signed ? 'rgba(37,99,235,0.2)' : BD}`, padding: '14px 18px', position: 'relative' as const, animation: 'demoSlideUp 0.4s ease', transition: 'border-color 0.3s', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, fontFamily: F }}>Assignment Contract</div>
                  <div style={{ fontSize: 10, color: MT, fontFamily: F, marginTop: 1 }}>4217 Elm St, Atlanta, GA</div>
                </div>
                <span style={{ fontSize: 8.5, fontWeight: 600, color: stageIdx >= 3 ? BLUE : BL, background: stageIdx >= 3 ? 'rgba(37,99,235,0.08)' : 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: 4, fontFamily: F, textTransform: 'uppercase' as const }}>{stages[stageIdx]}</span>
              </div>
              {/* Status tracker */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                {stages.map((s, i) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : undefined }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: i <= stageIdx ? BLUE : 'white', border: `2px solid ${i <= stageIdx ? BLUE : 'rgba(5,14,36,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s ease' }}>
                        {i <= stageIdx && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span style={{ fontSize: 8, fontWeight: i <= stageIdx ? 600 : 400, color: i <= stageIdx ? BLUE : MT, fontFamily: F }}>{s}</span>
                    </div>
                    {i < 3 && <div style={{ flex: 1, height: 2, background: i < stageIdx ? BLUE : 'rgba(5,14,36,0.08)', transition: 'background 0.4s ease', margin: '0 4px', marginBottom: 18 }} />}
                  </div>
                ))}
              </div>
              {/* Parties */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, padding: '10px 12px', background: CREAM, borderRadius: 7 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8.5, color: MT, fontFamily: F, fontWeight: 500, marginBottom: 2 }}>Assignor</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F }}>You (DealFlow)</div>
                </div>
                <div style={{ width: 1, background: BD }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8.5, color: MT, fontFamily: F, fontWeight: 500, marginBottom: 2 }}>Assignee</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F }}>Marcus Thompson</div>
                </div>
              </div>
              {/* Contract terms */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                {[
                  { label: 'Purchase Price', val: '$127,000' },
                  { label: 'Assignment Fee', val: '$12,800' },
                  { label: 'Close Date', val: 'Mar 28' },
                ].map(term => (
                  <div key={term.label} style={{ flex: 1, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 8.5, color: MT, fontFamily: F, fontWeight: 500 }}>{term.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: term.label === 'Assignment Fee' ? BLUE : NAVY, fontFamily: F }}>{term.val}</div>
                  </div>
                ))}
              </div>
              {/* Signature */}
              {signed && (
                <div style={{ borderTop: `1px solid rgba(0,0,0,0.06)`, paddingTop: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                    <span style={{ fontSize: 9, color: BLUE, fontFamily: F, fontWeight: 600 }}>Signed by Marcus Thompson</span>
                  </div>
                  <svg width="120" height="24" viewBox="0 0 120 24">
                    <path d="M5 16 Q15 2 28 14 T55 11 T85 16 Q95 6 112 14" fill="none" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" style={{ strokeDasharray: 200, strokeDashoffset: 200, animation: 'drawSignature 0.8s ease forwards' }} />
                  </svg>
                </div>
              )}
              {/* Send button (pre-send) */}
              {stageIdx === 0 && (
                <button style={{ marginTop: 'auto', width: '100%', background: BLUE, color: 'white', border: 'none', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'default' }}>Send for Signature</button>
              )}
              {/* Fee highlight */}
              {celebrate && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', animation: 'demoSlideUp 0.3s ease' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: BLUE, fontFamily: F }}>Deal closed!</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: BLUE, fontFamily: F }}>+$12,800</span>
                </div>
              )}
              {/* Confetti */}
              {celebrate && (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 10 }}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} style={{ position: 'absolute', left: `${5 + i * 8}%`, top: '10%', width: 5, height: 5, borderRadius: i % 2 === 0 ? '50%' : '1px', background: i % 3 === 0 ? BLUE : i % 3 === 1 ? BL : PURP, animation: `confettiFall 1.2s ease ${i * 0.05}s forwards`, opacity: 0.6 }} />
                  ))}
                </div>
              )}
            </div>
            {/* Activity sidebar */}
            <div style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: NAVY, fontFamily: F }}>Activity</div>
              {[
                { time: 'Just now', text: 'Contract signed', icon: BLUE, active: signed },
                { time: '2m ago', text: 'Contract viewed', icon: BL, active: stageIdx >= 2 },
                { time: '15m ago', text: 'Contract sent via email', icon: BL, active: stageIdx >= 1 },
                { time: '1h ago', text: 'Contract generated from deal', icon: MT, active: true },
                { time: '1h ago', text: 'Terms auto-filled from analysis', icon: MT, active: true },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, opacity: a.active ? 1 : 0.35, transition: 'opacity 0.3s' }}>
                  <div style={{ width: 1, background: BD, flexShrink: 0, marginLeft: 4, position: 'relative' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.active ? a.icon : BD, position: 'absolute', left: -3.5, top: 2, border: '1.5px solid white' }} />
                  </div>
                  <div style={{ paddingBottom: 6 }}>
                    <div style={{ fontSize: 9.5, color: NAVY, fontFamily: F, fontWeight: 500, lineHeight: 1.3 }}>{a.text}</div>
                    <div style={{ fontSize: 8.5, color: 'rgba(5,14,36,0.3)', fontFamily: F }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const RENDERERS = [S0, S1, S2, S3, S4, S5]

/* ── Step Indicator ─────────────────────────────────────── */
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="demo-step-indicator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', gap: 0 }}>
      {STEP_LABELS.map((label, i) => {
        const active = i === currentStep
        const done = i < currentStep
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: active ? 12 : 10, height: active ? 12 : 10, borderRadius: '50%',
                background: active || done ? BLUE : 'transparent',
                border: active || done ? `2px solid ${BLUE}` : '2px solid #D1D5DB',
                transition: 'all 0.3s ease',
              }} />
              <span style={{
                fontSize: 11, fontWeight: active ? 600 : 500,
                color: active ? BLUE : done ? NAVY : '#9CA3AF',
                fontFamily: F, whiteSpace: 'nowrap', transition: 'color 0.3s ease',
              }}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{ width: 40, height: 2, background: done ? BLUE : '#E5E7EB', margin: '0 10px', transition: 'background 0.3s ease', borderRadius: 1 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Main Component ─────────────────────────────────────── */
export default function CinematicDemo() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [elapsed, setElapsed] = useState(0)
  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [scale, setScale] = useState(1)
  const lastRef = useRef(0)

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 640)
      if (containerRef.current) {
        setScale(containerRef.current.offsetWidth / 800)
      }
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const h = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', h)
    return () => document.removeEventListener('visibilitychange', h)
  }, [])

  const isRunning = visible && tabVisible
  useEffect(() => {
    if (!isRunning) { lastRef.current = 0; return }
    let raf: number
    let acc = 0
    const tick = (now: number) => {
      if (!lastRef.current) lastRef.current = now
      acc += now - lastRef.current
      lastRef.current = now
      if (acc >= 16) { setElapsed(e => e + acc); acc = 0 }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isRunning])

  const scenes = isMobile ? MOBILE_IDX : [0, 1, 2, 3, 4, 5]
  const durations = scenes.map(i => SCENES[i].dur)
  const totalDur = durations.reduce((a, b) => a + b, 0)
  const loopElapsed = elapsed % totalDur
  let sceneElapsed = loopElapsed
  let sceneIdx = 0
  for (let i = 0; i < durations.length; i++) {
    if (sceneElapsed < durations[i]) { sceneIdx = i; break }
    sceneElapsed -= durations[i]
    if (i === durations.length - 1) { sceneIdx = 0; sceneElapsed = 0 }
  }
  const currentScene = scenes[sceneIdx]
  const curTarget = getCur(CK[currentScene], sceneElapsed)
  const curClicking = isClicking(CL[currentScene], sceneElapsed)
  const curPressing = isPressing(CL[currentScene], sceneElapsed)
  const Scene = RENDERERS[currentScene]
  const step = SCENE_TO_STEP[currentScene]

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ overflow: 'hidden', borderRadius: '0 0 16px 16px', height: Math.round(480 * scale), boxShadow: '0 20px 60px rgba(5,14,36,0.15), 0 0 0 1px rgba(5,14,36,0.08), 0 0 40px rgba(37,99,235,0.06)' }}>
        <div style={{
          transform: `scale(${scale})`, transformOrigin: 'top left',
          width: 800, height: 480, display: 'flex', position: 'relative', background: CREAM,
          WebkitFontSmoothing: 'antialiased',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
        } as React.CSSProperties}>
          <DemoSidebar activeIdx={SCENES[currentScene].nav} />
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: CREAM }}>
            <div key={currentScene + '-' + Math.floor(elapsed / totalDur)} style={{ height: '100%', animation: 'demoSceneEnter 0.25s ease-out forwards', willChange: 'transform, opacity' }}>
              <Scene t={sceneElapsed} />
            </div>
          </div>
          {!isMobile && <DemoCursor x={curTarget.x} y={curTarget.y} clicking={curClicking} pressing={curPressing} />}
        </div>
      </div>
      <StepIndicator currentStep={step} />
    </div>
  )
}
