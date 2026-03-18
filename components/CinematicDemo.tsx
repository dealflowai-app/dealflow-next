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
  { dur: 7000, label: 'Dashboard', nav: 0 },
  { dur: 8000, label: 'Marketplace', nav: 2 },
  { dur: 7000, label: 'Find Buyers', nav: 3 },
  { dur: 9500, label: 'AI Outreach', nav: 5 },
  { dur: 7500, label: 'Analyze Deal', nav: 6 },
  { dur: 6000, label: 'Close Deal', nav: 8 },
]
const STEP_LABELS = ['Dashboard', 'Marketplace', 'Find Buyers', 'AI Outreach', 'Analyze Deal', 'Close Deal']
const SCENE_TO_STEP = [0, 1, 2, 3, 4, 5]
const MOBILE_IDX = [0, 2, 5]

/* Cursor keyframes per scene */
const CK: { t: number; x: number; y: number }[][] = [
  /* S0 Dashboard */ [{ t: 0, x: 450, y: 240 }, { t: 3800, x: 230, y: 110 }, { t: 5000, x: 350, y: 290 }],
  /* S1 Marketplace */ [{ t: 0, x: 500, y: 200 }, { t: 1600, x: 260, y: 200 }, { t: 3800, x: 560, y: 340 }, { t: 5200, x: 570, y: 400 }],
  /* S2 Find Buyers */ [{ t: 0, x: 550, y: 250 }, { t: 400, x: 280, y: 55 }, { t: 2600, x: 455, y: 55 }, { t: 4200, x: 300, y: 165 }, { t: 5600, x: 465, y: 172 }],
  /* S3 AI Outreach */ [{ t: 0, x: 500, y: 130 }],
  /* S4 Analyze Deal */ [{ t: 0, x: 500, y: 240 }, { t: 400, x: 300, y: 55 }, { t: 2600, x: 455, y: 55 }, { t: 6600, x: 460, y: 420 }],
  /* S5 Close Deal */ [{ t: 0, x: 400, y: 220 }, { t: 600, x: 380, y: 380 }],
]
const CL: number[][] = [
  [],
  [1800, 4000, 5400],
  [2800, 5800],
  [],
  [2800, 6800],
  [800],
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
function easeOutExpo(x: number): number {
  return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)
}
function countUp(target: number, start: number, t: number, dur = 800): number {
  if (t < start) return 0
  const p = Math.min((t - start) / dur, 1)
  return Math.round(target * easeOutExpo(p))
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
      transition: 'left 0.5s cubic-bezier(0.4, 0, 0.2, 1), top 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.1s ease',
    }}>
      <svg width="11" height="14" viewBox="0 0 16 20" fill="none">
        <path d="M0.5 0.5L0.5 16.5L4.5 12.5L8 19.5L10.5 18.5L7 11.5L12.5 11.5L0.5 0.5Z" fill="white" stroke="black" strokeWidth="1" />
      </svg>
      {clicking && <div style={{ position: 'absolute', top: -10, left: -10, width: 32, height: 32, borderRadius: '50%', border: '1.5px solid rgba(37,99,235,0.2)', animation: 'clickRipple 0.5s ease-out forwards' }} />}
    </div>
  )
}

/* ── Sidebar ────────────────────────────────────────────── */
const SW = 1.7
const SIDEBAR_NAV: { label: string; icon: React.ReactNode }[] = [
  { label: 'Dashboard', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg> },
  { label: 'Feed', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 01-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 012 2z" /><path d="M18 9h2a2 2 0 012 2v11l-4-4h-6a2 2 0 01-2-2v-1" /></svg> },
  { label: 'Marketplace', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l2-4h16l2 4" /><path d="M2 7v13a1 1 0 001 1h18a1 1 0 001-1V7" /><path d="M9 21V11h6v10" /></svg> },
  { label: 'Find Buyers', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="7" r="4" /><path d="M10.3 15H7a4 4 0 00-4 4v2" /><circle cx="17" cy="17" r="3" /><path d="m21 21-1.9-1.9" /></svg> },
  { label: 'Buyer List', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg> },
  { label: 'Outreach', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 8 22 2 16 2" /><line x1="16" y1="8" x2="22" y2="2" /><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" /></svg> },
  { label: 'Analyze Deal', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="16" y1="14" x2="16" y2="18" /><line x1="8" y1="10" x2="8" y2="10.01" /><line x1="12" y1="10" x2="12" y2="10.01" /><line x1="16" y1="10" x2="16" y2="10.01" /><line x1="8" y1="14" x2="8" y2="14.01" /><line x1="12" y1="14" x2="12" y2="14.01" /><line x1="8" y1="18" x2="8" y2="18.01" /><line x1="12" y1="18" x2="12" y2="18.01" /></svg> },
  { label: 'My Deals', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M6 14l1.45-2.9A2 2 0 019.24 10H20a2 2 0 011.94 2.5l-1.55 6a2 2 0 01-1.93 1.5H4a2 2 0 01-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H20a2 2 0 012 2v2" /></svg> },
  { label: 'Contracts', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M20 19.5v.5a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2h8.5L18 5.5" /><polyline points="14 2 14 8 20 8" /><path d="M11.378 15.626a1 1 0 11-3 1.002c-.561-1.68 1.03-5.397 1.03-5.397" /></svg> },
  { label: 'Ask AI', icon: <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0L14.063 8.5A2 2 0 0015.5 9.937l6.135 1.581a.5.5 0 010 .964L15.5 14.063a2 2 0 00-1.437 1.437l-1.582 6.135a.5.5 0 01-.963 0z" /><path d="M20 3v4" /><path d="M22 5h-4" /></svg> },
]

function DemoSidebar({ activeIdx }: { activeIdx: number }) {
  return (
    <div style={{ width: 120, background: 'white', borderRight: `1px solid ${BD}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '10px 10px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <img src="/Logo.png" alt="" width={24} height={24} style={{ borderRadius: 6, flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: NAVY, fontFamily: F, letterSpacing: '-0.01em', lineHeight: 1 }}>DealFlow AI</span>
      </div>
      <div style={{ padding: '6px 12px 4px', fontSize: 7.5, fontWeight: 600, color: 'rgba(5,14,36,0.28)', fontFamily: F, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>Menu</div>
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
      <div style={{ padding: '4px 5px', borderTop: `1px solid ${BD}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px', borderRadius: 6, color: 'rgba(5,14,36,0.45)' }}>
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
          <span style={{ fontSize: 9.5, fontWeight: 500, fontFamily: F }}>Settings</span>
        </div>
      </div>
      <div style={{ padding: '4px 8px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 7.5, fontWeight: 600, color: BLUE, fontFamily: F }}>AR</span>
        </div>
        <span style={{ fontSize: 8.5, color: NAVY, fontFamily: F, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Alex Rivera</span>
      </div>
    </div>
  )
}

/* ── CityMap (shared) ──────────────────────────────────── */
function CityMap({ pins, hoverPin, label }: {
  pins: { x: string; y: string; color: string; label: string; delay: number }[];
  hoverPin: number;
  label: string;
}) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#F2EFE9' }}>
      <svg viewBox="0 0 300 480" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        {/* Building blocks */}
        <rect x="10" y="10" width="55" height="65" rx="2" fill="#E8E5DD" />
        <rect x="10" y="85" width="55" height="55" rx="2" fill="#DDDAD2" />
        <rect x="10" y="150" width="55" height="50" rx="2" fill="#E5E2DA" />
        <rect x="10" y="210" width="55" height="60" rx="2" fill="#E3E0D8" />
        <rect x="10" y="280" width="55" height="55" rx="2" fill="#E8E5DD" />
        <rect x="10" y="345" width="55" height="50" rx="2" fill="#DDDAD2" />
        <rect x="10" y="405" width="55" height="65" rx="2" fill="#E5E2DA" />
        <rect x="78" y="10" width="60" height="65" rx="2" fill="#DDDAD2" />
        <rect x="78" y="85" width="60" height="55" rx="2" fill="#E5E2DA" />
        <rect x="78" y="150" width="60" height="50" rx="2" fill="#D8DFE8" />
        <rect x="78" y="210" width="60" height="60" rx="2" fill="#E8E5DD" />
        <rect x="78" y="280" width="60" height="55" rx="2" fill="#E3E0D8" />
        <rect x="78" y="345" width="60" height="50" rx="2" fill="#E8E5DD" />
        <rect x="78" y="405" width="60" height="65" rx="2" fill="#DDDAD2" />
        <rect x="152" y="10" width="65" height="65" rx="2" fill="#E5E2DA" />
        <rect x="152" y="85" width="65" height="55" rx="2" fill="#E3E0D8" />
        <rect x="152" y="150" width="65" height="50" rx="2" fill="#E8E5DD" />
        <rect x="152" y="210" width="65" height="60" rx="2" fill="#DDDAD2" />
        <rect x="152" y="280" width="65" height="55" rx="2" fill="#E5E2DA" />
        <rect x="152" y="345" width="65" height="50" rx="2" fill="#E3E0D8" />
        <rect x="230" y="10" width="60" height="65" rx="2" fill="#E3E0D8" />
        <rect x="230" y="85" width="60" height="55" rx="2" fill="#E8E5DD" />
        <rect x="230" y="150" width="60" height="50" rx="2" fill="#DDDAD2" />
        <rect x="230" y="210" width="60" height="60" rx="2" fill="#E5E2DA" />
        {/* Major roads */}
        <rect x="0" y="78" width="300" height="3" fill="white" />
        <rect x="0" y="202" width="300" height="3" fill="white" />
        <rect x="0" y="338" width="300" height="3" fill="white" />
        <rect x="68" y="0" width="3" height="480" fill="white" />
        <rect x="145" y="0" width="3" height="480" fill="white" />
        <rect x="224" y="0" width="3" height="480" fill="white" />
        {/* Minor roads */}
        <rect x="0" y="142" width="300" height="1.5" fill="rgba(255,255,255,0.55)" />
        <rect x="0" y="272" width="300" height="1.5" fill="rgba(255,255,255,0.55)" />
        <rect x="0" y="398" width="300" height="1.5" fill="rgba(255,255,255,0.55)" />
        <rect x="0" y="42" width="300" height="1.5" fill="rgba(255,255,255,0.55)" />
        <rect x="0" y="440" width="300" height="1.5" fill="rgba(255,255,255,0.55)" />
        <rect x="35" y="0" width="1.5" height="480" fill="rgba(255,255,255,0.55)" />
        <rect x="110" y="0" width="1.5" height="480" fill="rgba(255,255,255,0.55)" />
        <rect x="185" y="0" width="1.5" height="480" fill="rgba(255,255,255,0.55)" />
        <rect x="260" y="0" width="1.5" height="480" fill="rgba(255,255,255,0.55)" />
        {/* Road labels */}
        <text x="12" y="75" fontSize="5.5" fill="rgba(0,0,0,0.18)" fontFamily={F}>Peachtree St NE</text>
        <text x="12" y="199" fontSize="5.5" fill="rgba(0,0,0,0.18)" fontFamily={F}>Oak Blvd</text>
        <text x="12" y="335" fontSize="5.5" fill="rgba(0,0,0,0.18)" fontFamily={F}>Elm Ave</text>
      </svg>
      {/* Pins */}
      {pins.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: p.x, top: p.y,
          transform: `translate(-50%, -50%) ${hoverPin === i ? 'scale(1.3)' : 'scale(1)'}`,
          animation: `fadeIn 0.3s ease ${p.delay}ms both`,
          transition: 'transform 0.3s ease',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, zIndex: 5,
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%', background: p.color,
            border: '2.5px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {p.label && <span style={{ fontSize: 7, fontWeight: 700, color: 'white', fontFamily: F }}>{p.label}</span>}
          </div>
        </div>
      ))}
      {/* Zoom controls */}
      <div style={{ position: 'absolute', right: 8, top: 8, display: 'flex', flexDirection: 'column', gap: 1, background: 'white', borderRadius: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ width: 26, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: MT, fontFamily: F, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>+</div>
        <div style={{ width: 26, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: MT, fontFamily: F }}>-</div>
      </div>
      {/* Location badge */}
      <div style={{ position: 'absolute', left: 8, top: 8, background: 'white', borderRadius: 6, padding: '4px 8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontFamily: F, color: NAVY, fontWeight: 500 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
        {label}
      </div>
      {/* Legend */}
      <div style={{ position: 'absolute', left: 8, bottom: 8, background: 'white', borderRadius: 6, padding: '5px 8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 8.5, fontFamily: F, color: MT }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE }} />Cash Buyers</span>
      </div>
    </div>
  )
}

/* ── Scene 0: Find Buyers ───────────────────────────────── */
function S0({ t }: { t: number }) {
  const q = 'Atlanta, GA'
  const typed = tv(q, 800, t, 70)
  const typeDone = td(q, 800, t, 70)
  const focused = t >= 800 && !typeDone
  const btnPressed = t >= 2800 && t < 2900
  const searching = t >= 3000 && t < 3300
  const hasResults = t >= 3300
  const showPins = t >= 3900
  const hoverIdx = t >= 4500 && t < 6200 ? 0 : -1
  const showDetail = t >= 5000 && t < 5800
  const addClicked = t >= 5800
  const showToast = t >= 5800 && t < 6800
  const activeFilter = t >= 2800 ? 2 : 0

  const buyers = [
    { name: 'Marcus Thompson', init: 'MT', county: 'Fulton County, GA', detail: 'Cash  -  SFR  -  3 days ago  -  4 properties', price: '$127,000', score: 92 },
    { name: 'Lisa Wang', init: 'LW', county: 'DeKalb County, GA', detail: 'Cash  -  Multi-fam  -  5 days ago  -  7 properties', price: '$215,000', score: 85 },
    { name: 'Rachel Patel', init: 'RP', county: 'Cobb County, GA', detail: 'Cash  -  SFR  -  8 days ago  -  2 properties', price: '$98,500', score: 78 },
    { name: 'James Rivera', init: 'JR', county: 'Gwinnett County, GA', detail: 'Cash  -  Commercial  -  10d ago  -  5 properties', price: '$340,000', score: 74 },
  ]

  const mapPins = [
    { x: '28%', y: '28%', color: BLUE, label: '1', delay: 0 },
    { x: '58%', y: '52%', color: BLUE, label: '2', delay: 150 },
    { x: '72%', y: '22%', color: BLUE, label: '3', delay: 300 },
    { x: '40%', y: '70%', color: BLUE, label: '', delay: 400 },
    { x: '82%', y: '55%', color: BLUE, label: '', delay: 500 },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', position: 'relative' }}>
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
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'white', borderRadius: 8, padding: '7px 10px', border: focused ? `2px solid ${BLUE}` : `1px solid ${BD}`, boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.25)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <span style={{ fontSize: 12, fontFamily: F, color: typed ? NAVY : 'rgba(5,14,36,0.3)', lineHeight: 1 }}>
              {typed || 'Search city or zip code...'}{t >= 800 && !typeDone && <Caret />}
            </span>
          </div>
          <button style={{ background: btnPressed ? '#1d4ed8' : BLUE, color: 'white', border: 'none', borderRadius: 8, padding: '0 14px', fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'default', transform: btnPressed ? 'scale(0.97)' : 'scale(1)', transition: 'background 0.1s, transform 0.1s', whiteSpace: 'nowrap' }}>Search</button>
        </div>
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
        <div style={{ fontSize: 10.5, fontWeight: 500, color: MT, fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {searching ? (
              <>
                <div style={{ width: 12, height: 12, border: '1.5px solid rgba(5,14,36,0.15)', borderTopColor: NAVY, borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Searching county records...
              </>
            ) : hasResults ? (
              <span><span style={{ fontWeight: 600, color: NAVY }}>26</span> verified buyers in Atlanta, GA</span>
            ) : (
              '0 buyers found'
            )}
          </div>
          {hasResults && <span style={{ fontSize: 9.5, color: 'rgba(5,14,36,0.3)' }}>Showing 1-4</span>}
        </div>
        {hasResults && buyers.map((b, i) => (
          <div key={b.name} style={{
            background: 'white', borderRadius: 8, border: `1px solid ${hoverIdx === i ? 'rgba(37,99,235,0.25)' : BD}`,
            padding: '9px 10px', display: 'flex', gap: 9, position: 'relative' as const,
            boxShadow: hoverIdx === i ? '0 4px 14px rgba(5,14,36,0.07)' : 'none',
            transform: hoverIdx === i ? 'translateY(-1px)' : 'none',
            animation: `demoSlideUp 0.3s ease ${i * 0.15}s both`,
            transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
            ...(i === 3 ? { marginBottom: -20, overflow: 'hidden', maxHeight: 50, opacity: 0.7 } : {}),
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
      <div style={{ width: '45%', position: 'relative', overflow: 'hidden' }}>
        {showPins ? (
          <CityMap pins={mapPins} hoverPin={hoverIdx} label="Atlanta, GA" />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#F2EFE9' }} />
        )}
      </div>
      {showToast && (
        <div style={{ position: 'absolute', top: 10, right: 16, background: 'white', borderRadius: 8, boxShadow: '0 6px 20px rgba(5,14,36,0.1)', border: `1px solid ${BD}`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, animation: 'demoSlideUp 0.3s ease', zIndex: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" /></svg>
          <span style={{ fontSize: 11, fontWeight: 500, color: NAVY, fontFamily: F }}>Marcus Thompson added to Buyer List</span>
        </div>
      )}
    </div>
  )
}

/* ── Scene 1: Dashboard (NEW) ──────────────────────────── */
function S1({ t }: { t: number }) {
  const kpis = [
    { label: 'Active Deals', display: String(countUp(24, 300, t)), sub: '+3 this week', startAt: 300, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg> },
    { label: 'Qualified Buyers', display: String(countUp(189, 450, t)), sub: '+12 today', startAt: 450, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="7" r="4" /><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /></svg> },
    { label: 'Revenue MTD', display: `$${(countUp(472, 600, t) / 10).toFixed(1)}K`, sub: '+18%', startAt: 600, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg> },
    { label: 'AI Calls Today', display: String(countUp(342, 750, t)), sub: '89% qualified', startAt: 750, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.11 2 2 0 014.11 2h3" /></svg> },
  ]
  const showPipeline = t >= 2000
  const showDealRows = t >= 2500
  const showActivity = t >= 3000
  const hoverKpi = t >= 3800 && t < 5000 ? 0 : -1
  const hoverDeal = t >= 5000 ? 0 : -1
  const pipeSegs = [
    { label: 'New', color: NAVY, pct: 30, count: 7 },
    { label: 'Active', color: BLUE, pct: 35, count: 8 },
    { label: 'Closing', color: PURP, pct: 20, count: 5 },
    { label: 'Pending', color: BL, pct: 15, count: 4 },
  ]
  const deals = [
    { addr: '5512 Peachtree Rd, Atlanta', badge: 'Active', bColor: BLUE, fee: '$14,500', init: 'JM' },
    { addr: '816 Magnolia Way, Charlotte', badge: 'Closing', bColor: PURP, fee: '$22,000', init: 'PK' },
  ]
  const activities = [
    { text: 'AI completed 48 calls', time: '2m ago', icon: <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.11 2 2 0 014.11 2h3" /></svg> },
    { text: 'Marcus T. qualified', time: '5m ago', icon: <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg> },
    { text: 'Contract signed', time: '1h ago', icon: <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg> },
    { text: 'New deal matched', time: '2h ago', icon: <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M9.937 15.5A2 2 0 008.5 14.063l-6.135-1.582a.5.5 0 010-.962L8.5 9.936A2 2 0 009.937 8.5l1.582-6.135a.5.5 0 01.963 0z" /></svg> },
  ]
  return (
    <div style={{ height: '100%', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 400, color: NAVY, fontFamily: F }}>Good morning, Alex</div>
        <div style={{ fontSize: 10, color: MT, fontFamily: F }}>March 18, 2026</div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {kpis.map((k, ki) => (
          <div key={k.label} style={{
            flex: 1, background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '8px 10px',
            opacity: t >= k.startAt ? 1 : 0,
            transform: hoverKpi === ki ? 'translateY(-1px)' : 'none',
            boxShadow: hoverKpi === ki ? '0 4px 14px rgba(5,14,36,0.07)' : 'none',
            transition: 'opacity 0.4s ease, transform 0.2s, box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, background: 'rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k.icon}</div>
              <span style={{ fontSize: 9, color: MT, fontFamily: F, fontWeight: 500 }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, fontFamily: F, lineHeight: 1.1 }}>{k.display}</div>
            <div style={{ fontSize: 8.5, color: BLUE, fontFamily: F, fontWeight: 500, marginTop: 1 }}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={{ width: '60%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {showPipeline && (
            <div style={{ background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '10px 12px', animation: 'demoSlideUp 0.3s ease both' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F, marginBottom: 8 }}>Deal Pipeline</div>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                {pipeSegs.map(s => (
                  <div key={s.label} style={{ width: `${s.pct}%`, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.8s ease' }}>
                    <span style={{ fontSize: 8, color: 'white', fontFamily: F, fontWeight: 600 }}>{s.count}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {pipeSegs.map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8.5, fontFamily: F, color: MT }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: s.color }} />{s.label}
                  </div>
                ))}
              </div>
            </div>
          )}
          {showDealRows && deals.map((d, di) => (
            <div key={d.addr} style={{
              background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '9px 11px',
              display: 'flex', alignItems: 'center', gap: 8,
              animation: `demoSlideUp 0.3s ease ${di * 0.15}s both`,
              borderLeft: hoverDeal === di ? `3px solid ${BLUE}` : '3px solid transparent',
              transition: 'border-left-color 0.2s',
            }}>
              <Avatar initials={d.init} size={26} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F }}>{d.addr}</div>
              </div>
              <span style={{ fontSize: 8.5, fontWeight: 600, color: d.bColor, background: d.bColor + '12', padding: '2px 8px', borderRadius: 4, fontFamily: F }}>{d.badge}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, fontFamily: F }}>{d.fee}</span>
            </div>
          ))}
        </div>
        <div style={{ width: '40%' }}>
          {showActivity && (
            <div style={{ background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '10px 12px', animation: 'demoSlidePanel 0.3s ease both', height: '100%' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F, marginBottom: 8 }}>Recent Activity</div>
              {activities.map((a, ai) => (
                <div key={ai} style={{
                  display: 'flex', gap: 8, paddingBottom: 8,
                  opacity: t >= 3000 + ai * 100 ? 1 : 0, transition: 'opacity 0.3s ease',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a.icon}</div>
                    {ai < activities.length - 1 && <div style={{ width: 1, flex: 1, background: BD, marginTop: 2 }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: NAVY, fontFamily: F, fontWeight: 500, lineHeight: 1.3 }}>{a.text}</div>
                    <div style={{ fontSize: 8.5, color: 'rgba(5,14,36,0.25)', fontFamily: F }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Scene 2: AI Outreach ───────────────────────────────── */
function S2({ t }: { t: number }) {
  const contacts = [
    { name: 'Marcus Thompson', init: 'MT', phone: '(480) 555-0142', callStart: 500, connectAt: 2000, qualAt: 6500, noAnswerAt: -1, hasTranscript: true },
    { name: 'Lisa Wang', init: 'LW', phone: '(404) 555-0198', callStart: 7000, connectAt: -1, qualAt: -1, noAnswerAt: 8000, hasTranscript: false },
    { name: 'David Kim', init: 'DK', phone: '(813) 555-0276', callStart: 8500, connectAt: 8800, qualAt: 9200, noAnswerAt: -1, hasTranscript: false },
  ]
  function getStatus(c: typeof contacts[0]) {
    if (c.qualAt > 0 && t >= c.qualAt) return { text: 'Qualified', color: BLUE }
    if (c.noAnswerAt > 0 && t >= c.noAnswerAt) return { text: 'No Answer', color: MT }
    if (c.connectAt > 0 && t >= c.connectAt) return { text: 'Connected', color: BLUE }
    if (t >= c.callStart) return { text: 'Calling...', color: BL }
    return { text: 'Queued', color: 'rgba(5,14,36,0.25)' }
  }
  function callDuration(c: typeof contacts[0]) {
    if (t < c.callStart) return ''
    const end = c.qualAt > 0 ? c.qualAt : c.noAnswerAt > 0 ? c.noAnswerAt : t
    const secs = Math.floor((Math.min(t, end) - c.callStart) / 1000)
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  }
  const completed = contacts.filter(c => (c.qualAt > 0 && t >= c.qualAt) || (c.noAnswerAt > 0 && t >= c.noAnswerAt)).length
  const qualified = contacts.filter(c => c.qualAt > 0 && t >= c.qualAt).length
  const pct = (completed / 3) * 100
  const allDone = completed === 3
  const showTranscript = t >= 2500 && t < 6500
  const lines = [
    { sp: 'AI', text: 'Hi Marcus, this is Sarah from DealFlow Properties...' },
    { sp: 'Marcus', text: "Yeah, hey, what's up?" },
    { sp: 'AI', text: 'I wanted to reach out about some properties in your area...' },
    { sp: 'AI', text: 'Are you looking to flip or hold?' },
    { sp: 'Marcus', text: 'Flip. I can close in 10 to 14 days if the numbers work.' },
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
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { label: 'Connected', val: `${completed - (contacts.filter(c => c.noAnswerAt > 0 && t >= c.noAnswerAt).length)}/${contacts.length}`, color: BLUE },
          { label: 'Avg Duration', val: t >= 6500 ? '2:14' : t >= 2000 ? '1:08' : '0:00', color: NAVY },
          { label: 'Qualified', val: `${qualified}`, color: BLUE },
          { label: 'Success Rate', val: qualified > 0 ? `${Math.round((qualified / Math.max(completed, 1)) * 100)}%` : '0%', color: BLUE },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'white', borderRadius: 7, border: `1px solid ${BD}`, padding: '7px 9px' }}>
            <div style={{ fontSize: 8.5, color: MT, fontFamily: F, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: s.color, fontFamily: F, lineHeight: 1.3 }}>{s.val}</div>
          </div>
        ))}
      </div>
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
                    const lStart = 2500 + li * 550
                    const lText = tv(l.text, lStart, t, 25)
                    if (!lText) return null
                    return <div key={li} style={{ fontSize: 10, fontFamily: F, color: l.sp === 'AI' ? BLUE : NAVY, paddingLeft: 14 }}><span style={{ fontWeight: 600 }}>{l.sp}: </span>{lText}{!td(l.text, lStart, t, 25) && <Caret />}</div>
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

/* ── Scene 3: Marketplace (NEW) ─────────────────────────── */
function S3({ t }: { t: number }) {
  const deals = [
    { addr: '5512 Peachtree Rd', city: 'Atlanta, GA', beds: 3, baths: 2, sqft: '1,240', type: 'SFR', strategy: 'Flip', arv: '$142K', fee: '+$14,500', user: 'Jordan M.', userInit: 'JM', time: '2h ago', tag: 'NEW', tagColor: BLUE, grad: ['#8B9DAF', '#6B7D8F'] },
    { addr: '816 Magnolia Way', city: 'Charlotte, NC', beds: 4, baths: 3, sqft: '1,890', type: 'Multi', strategy: 'Hold', arv: '$215K', fee: '+$22,000', user: 'Priya K.', userInit: 'PK', time: '5h ago', tag: 'HOT', tagColor: '#E85D4A', grad: ['#B5A898', '#9A8B7C'] },
    { addr: '2204 Oak St', city: 'Tampa, FL', beds: 2, baths: 1, sqft: '980', type: 'SFR', strategy: 'Flip', arv: '$98K', fee: '+$8,200', user: 'Mike T.', userInit: 'MT', time: '1d ago', tag: '', tagColor: '', grad: ['#9AABB8', '#7D929F'] },
  ]
  const mapPins = [
    { x: '30%', y: '30%', color: BLUE, label: '1', delay: 500 },
    { x: '55%', y: '55%', color: BLUE, label: '2', delay: 700 },
    { x: '75%', y: '25%', color: '#E85D4A', label: '3', delay: 900 },
  ]
  const showCards = t >= 1000
  const hoverCard = t >= 1600 && t < 7500 ? 0 : -1
  const showDetailPanel = t >= 1800 && t < 7500
  const showOfferForm = t >= 4000 && t < 7500
  const offerSubmitted = t >= 5400
  const showToast = t >= 6000 && t < 7500
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ padding: '12px 14px 8px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, fontFamily: F }}>Marketplace</div>
        <div style={{ fontSize: 10, color: MT, fontFamily: F }}>Browse and list off-market deals</div>
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: '45%', padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden', borderRight: `1px solid ${BD}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', borderRadius: 8, padding: '6px 10px', border: `1px solid ${BD}` }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.25)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <span style={{ fontSize: 11, fontFamily: F, color: NAVY }}>Atlanta, GA</span>
          </div>
          {showCards && deals.map((d, di) => (
            <div key={d.addr} style={{
              background: 'white', borderRadius: 8, border: `1px solid ${hoverCard === di ? 'rgba(37,99,235,0.25)' : BD}`,
              padding: '8px', display: 'flex', gap: 8,
              animation: `demoSlideUp 0.3s ease ${di * 0.2}s both`,
              boxShadow: hoverCard === di ? '0 4px 14px rgba(5,14,36,0.07)' : 'none',
              borderLeft: hoverCard === di ? `3px solid ${BLUE}` : '3px solid transparent',
              transition: 'border-color 0.2s, box-shadow 0.2s, border-left-color 0.2s',
            }}>
              <div style={{ width: 60, height: 48, borderRadius: 6, background: `linear-gradient(135deg, ${d.grad[0]}, ${d.grad[1]})`, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                {d.tag && <span style={{ position: 'absolute', top: 3, left: 3, fontSize: 6.5, fontWeight: 700, color: 'white', background: d.tagColor, padding: '1px 4px', borderRadius: 3, fontFamily: F }}>{d.tag}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F }}>{d.addr}</div>
                <div style={{ fontSize: 9, color: MT, fontFamily: F }}>{d.beds} bd, {d.baths} ba, {d.sqft} sqft, {d.type}, {d.strategy}</div>
                <div style={{ fontSize: 9, fontFamily: F, marginTop: 2 }}>
                  <span style={{ color: MT }}>{d.arv}</span>{' '}
                  <span style={{ color: BLUE, fontWeight: 600 }}>{d.fee}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 5.5, color: 'white', fontWeight: 600, fontFamily: F }}>{d.userInit}</span>
                  </div>
                  <span style={{ fontSize: 8.5, color: MT, fontFamily: F }}>{d.user} - {d.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ width: '55%', position: 'relative', overflow: 'hidden' }}>
          <CityMap pins={mapPins} hoverPin={hoverCard} label="Atlanta, GA" />
          <div style={{ position: 'absolute', right: 8, bottom: 8, background: 'white', borderRadius: 6, padding: '4px 8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5, fontFamily: F, color: NAVY, fontWeight: 500, zIndex: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: BLUE, animation: 'demoPulse 1.5s infinite' }} />
            3 listings - Live
          </div>
          {showDetailPanel && (
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: '70%',
              background: 'white', borderLeft: `1px solid ${BD}`, padding: '12px',
              animation: 'demoSlidePanel 0.3s ease both',
              display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', zIndex: 10,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, fontFamily: F }}>5512 Peachtree Rd</div>
              <div style={{ fontSize: 9.5, color: MT, fontFamily: F }}>Atlanta, GA</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: 'ARV', val: '$142K' },
                  { label: 'Fee', val: '$14,500' },
                  { label: 'Score', val: '87/100' },
                ].map(m => (
                  <div key={m.label} style={{ flex: 1, background: CREAM, borderRadius: 6, padding: '6px 8px' }}>
                    <div style={{ fontSize: 8, color: MT, fontFamily: F }}>{m.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: m.label === 'Score' ? BLUE : NAVY, fontFamily: F }}>{m.val}</div>
                  </div>
                ))}
              </div>
              {!showOfferForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                  <button style={{ background: BLUE, color: 'white', border: 'none', borderRadius: 7, padding: '7px 0', fontSize: 10, fontWeight: 600, fontFamily: F, cursor: 'default', width: '100%' }}>Submit Offer</button>
                  <button style={{ background: 'white', color: NAVY, border: `1px solid ${BD}`, borderRadius: 7, padding: '7px 0', fontSize: 10, fontWeight: 500, fontFamily: F, cursor: 'default', width: '100%' }}>Contact Wholesaler</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, animation: 'demoSlideUp 0.2s ease' }}>
                  {!offerSubmitted ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ flex: 1, padding: '6px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, fontFamily: F, color: NAVY, background: 'white' }}>$85,000</div>
                      <button style={{ background: BLUE, color: 'white', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 10, fontWeight: 600, fontFamily: F, cursor: 'default' }}>Submit</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" /></svg>
                      <span style={{ fontSize: 11, fontWeight: 600, color: BLUE, fontFamily: F }}>Offer Submitted!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showToast && (
        <div style={{ position: 'absolute', top: 10, right: 16, background: 'white', borderRadius: 8, boxShadow: '0 6px 20px rgba(5,14,36,0.1)', border: `1px solid ${BD}`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, animation: 'demoSlideUp 0.3s ease', zIndex: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" /></svg>
          <span style={{ fontSize: 11, fontWeight: 500, color: NAVY, fontFamily: F }}>Offer sent to Jordan M.</span>
        </div>
      )}
    </div>
  )
}

/* ── Scene 4: Analyze Deal ──────────────────────────────── */
function S4({ t }: { t: number }) {
  const addr = '4217 Elm St, Atlanta, GA'
  const typed = tv(addr, 800, t, 30)
  const typeDone = td(addr, 800, t, 30)
  const focused = t >= 500 && t < 2600
  const analyzing = t >= 3000 && t < 5500
  const results = t >= 5500
  const saved = t >= 6800
  const steps = [
    { label: 'Looking up property...', at: 3000 },
    { label: 'Pulling comps...', at: 3500 },
    { label: 'Calculating ARV...', at: 4000 },
    { label: 'Scoring deal...', at: 4500 },
  ]
  const comps = [
    { addr: '4190 Elm St', dist: '0.1 mi', price: '$165,000', sqft: '1,480', sold: '12 days ago' },
    { addr: '4301 Oak Ave', dist: '0.3 mi', price: '$172,000', sqft: '1,520', sold: '24 days ago' },
    { addr: '4088 Elm St', dist: '0.2 mi', price: '$158,000', sqft: '1,410', sold: '31 days ago' },
  ]
  const dealScore = results ? countUp(87, 5500, t, 800) : 0
  const grade = dealScore >= 80 ? 'A' : dealScore >= 60 ? 'B' : ''
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
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: 'white', borderRadius: 8, padding: '7px 10px', border: focused ? `2px solid ${BLUE}` : `1px solid ${BD}`, boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none', transition: 'all 0.15s' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(5,14,36,0.25)" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
          <span style={{ fontSize: 12, fontFamily: F, color: typed ? NAVY : 'rgba(5,14,36,0.3)', lineHeight: 1 }}>
            {typed || 'Enter property address...'}{t >= 500 && !typeDone && <Caret />}
          </span>
        </div>
        <button style={{ background: BLUE, color: 'white', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'default', whiteSpace: 'nowrap' }}>
          {analyzing ? '...' : 'Analyze'}
        </button>
      </div>
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
      {results && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, animation: 'demoSlideUp 0.35s ease' }}>
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
            <div style={{ background: 'white', borderRadius: 8, border: '1px solid rgba(37,99,235,0.2)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${BLUE}` }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: BLUE, fontFamily: F }}>{grade}</span>
              </div>
              <div>
                <div style={{ fontSize: 9, color: MT, fontFamily: F, fontWeight: 500 }}>Deal Score</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: NAVY, fontFamily: F, lineHeight: 1 }}>{dealScore}<span style={{ fontSize: 10, color: MT, fontWeight: 500 }}>/100</span></div>
              </div>
            </div>
            {[
              { label: 'ARV', val: `$${countUp(168, 5500, t)}K` },
              { label: 'Spread', val: `${countUp(38, 5600, t)}%` },
              { label: 'Est. Profit', val: `$${countUp(47, 5700, t)}K` },
              { label: 'Max Offer', val: `$${countUp(105, 5800, t)}K` },
            ].map(m => (
              <div key={m.label} style={{ flex: 1, background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: MT, fontFamily: F, fontWeight: 500 }}>{m.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.label === 'Est. Profit' ? BLUE : NAVY, fontFamily: F, lineHeight: 1.3 }}>{m.val}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 8, border: `1px solid ${BD}`, padding: '8px 10px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: NAVY, fontFamily: F }}>Comparable Sales</span>
              <span style={{ fontSize: 9, color: MT, fontFamily: F }}>Within 0.5 mi, last 90 days</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 66px', padding: '4px 0', borderBottom: `1px solid ${BD}`, fontSize: 8.5, color: MT, fontFamily: F, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
              <div>Address</div><div>Sqft</div><div>Sold</div><div style={{ textAlign: 'right' }}>Price</div>
            </div>
            {comps.map((c, i) => (
              <div key={c.addr} style={{ display: 'grid', gridTemplateColumns: '1fr 56px 56px 66px', padding: '5px 0', borderBottom: i < comps.length - 1 ? '1px solid rgba(0,0,0,0.04)' : undefined, alignItems: 'center', animation: `demoSlidePanel 0.3s ease ${i * 0.1}s both` }}>
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
            <button style={{ background: saved ? 'rgba(37,99,235,0.06)' : BLUE, color: saved ? BLUE : 'white', border: saved ? '1px solid rgba(37,99,235,0.2)' : 'none', borderRadius: 8, padding: '5px 14px', fontSize: 10.5, fontWeight: 600, fontFamily: F, cursor: 'default', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 5 }}>
              {saved && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
              {saved ? 'Saved to Pipeline' : 'Save as Deal'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Scene 5: Close Deal ────────────────────────────────── */
function S5({ t }: { t: number }) {
  const stages = ['Draft', 'Sent', 'Viewed', 'Signed']
  const stageIdx = t < 500 ? 0 : t < 1500 ? 0 : t < 2500 ? 1 : t < 3500 ? 2 : 3
  const signed = t >= 3500
  const celebrate = t >= 4000 && t < 5200
  const showLogo = t >= 5300
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
            <div style={{ flex: 1, background: 'white', borderRadius: 10, border: `1px solid ${signed ? 'rgba(37,99,235,0.2)' : BD}`, padding: '14px 18px', position: 'relative' as const, animation: 'demoSlideUp 0.4s ease', transition: 'border-color 0.3s', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: NAVY, fontFamily: F }}>Assignment Contract</div>
                  <div style={{ fontSize: 10, color: MT, fontFamily: F, marginTop: 1 }}>4217 Elm St, Atlanta, GA</div>
                </div>
                <span style={{ fontSize: 8.5, fontWeight: 600, color: stageIdx >= 3 ? BLUE : BL, background: stageIdx >= 3 ? 'rgba(37,99,235,0.08)' : 'rgba(96,165,250,0.1)', padding: '2px 8px', borderRadius: 4, fontFamily: F, textTransform: 'uppercase' as const }}>{stages[stageIdx]}</span>
              </div>
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
              {signed && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                    <span style={{ fontSize: 9, color: BLUE, fontFamily: F, fontWeight: 600 }}>Signed by Marcus Thompson</span>
                  </div>
                  <svg width="120" height="24" viewBox="0 0 120 24">
                    <path d="M5 16 Q15 2 28 14 T55 11 T85 16 Q95 6 112 14" fill="none" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" style={{ strokeDasharray: 200, strokeDashoffset: 200, animation: 'drawSignature 1.2s ease forwards' }} />
                  </svg>
                </div>
              )}
              {stageIdx === 0 && (
                <button style={{ marginTop: 'auto', width: '100%', background: BLUE, color: 'white', border: 'none', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'default' }}>Send for Signature</button>
              )}
              {celebrate && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', animation: 'demoSlideUp 0.3s ease' }}>
                  <style>{`@keyframes scaleBounce { 0% { transform: scale(0.5); } 60% { transform: scale(1.15); } 80% { transform: scale(0.95); } 100% { transform: scale(1); } }`}</style>
                  <span style={{ fontSize: 11, fontWeight: 600, color: BLUE, fontFamily: F }}>Deal closed!</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: BLUE, fontFamily: F, animation: 'scaleBounce 0.6s ease-out' }}>+$12,800</span>
                </div>
              )}
              {celebrate && (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 10 }}>
                  {Array.from({ length: 14 }, (_, i) => (
                    <div key={i} style={{ position: 'absolute', left: `${4 + i * 7}%`, top: '10%', width: 3 + (i % 5), height: 3 + (i % 5), borderRadius: i % 2 === 0 ? '50%' : '1px', background: i % 3 === 0 ? BLUE : i % 3 === 1 ? BL : PURP, animation: `confettiFall 1.2s ease ${i * 0.05}s forwards`, opacity: 0.6, transform: `rotate(${i * 25}deg)` }} />
                  ))}
                </div>
              )}
            </div>
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

const RENDERERS = [S1, S3, S0, S2, S4, S5]

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
