'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Play,
  Pause,
  Upload,
  UserPlus,
  Search,
  PhoneOutgoing,
} from 'lucide-react'

type KpiData = {
  activeDeals: number
  closedDeals: number
  buyerCount: number
  aiCalls: number
}

type ActivityItem = {
  id: string
  type: string
  title: string
  createdAt: string
}

/* ── Revenue chart data (last 6 months) ── */
const revenueData = [
  { month: 'Oct', value: 18500 },
  { month: 'Nov', value: 24500 },
  { month: 'Dec', value: 12000 },
  { month: 'Jan', value: 31000 },
  { month: 'Feb', value: 28500 },
  { month: 'Mar', value: 42000 },
]

/* ── Campaigns ── */
const campaigns = [
  { name: 'Phoenix Cash Buyers - Cold Call', status: 'running', calls: 342, responseRate: 18.4 },
  { name: 'Dallas Absentee Owners', status: 'running', calls: 198, responseRate: 12.7 },
  { name: 'Tampa Investor Reactivation', status: 'paused', calls: 87, responseRate: 22.1 },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

/* ── Quick actions ── */
const quickActions = [
  { label: 'New AI Campaign', icon: PhoneOutgoing, color: '#2563EB', href: '/outreach' },
  { label: 'Upload Deal', icon: Upload, color: '#16a34a', href: '/deals/new' },
  { label: 'Add Buyer', icon: UserPlus, color: '#7c3aed', href: '/crm' },
  { label: 'Run Analysis', icon: Search, color: '#d97706', href: '/analyzer' },
]

/* ── Card wrapper ── */
const cardStyle: React.CSSProperties = {
  background: 'var(--white, #ffffff)',
  border: '1px solid var(--border-light, #F0F0F0)',
  borderRadius: 14,
  padding: '20px 22px',
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--accent, #2563EB)',
  marginBottom: 14,
}

/* ── Revenue chart SVG builder ── */
function RevenueChart() {
  const max = Math.max(...revenueData.map(d => d.value))
  const w = 480
  const h = 180
  const padL = 0
  const padB = 28
  const chartH = h - padB
  const stepX = (w - padL) / (revenueData.length - 1)

  const points = revenueData.map((d, i) => ({
    x: padL + i * stepX,
    y: chartH - (d.value / max) * (chartH - 16),
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartH} L${points[0].x},${chartH} Z`

  const total = revenueData.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={sectionLabel}>Revenue (6 mo)</div>
          <div
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: '1.6rem',
              fontWeight: 400,
              color: 'var(--navy-heading, #0B1224)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            ${total.toLocaleString()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: '0.75rem', fontWeight: 500 }}>
          <TrendingUp style={{ width: 14, height: 14 }} />
          +32% vs prior
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 160 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#2563EB" strokeWidth="2" />
        ))}
        {revenueData.map((d, i) => (
          <text
            key={i}
            x={padL + i * stepX}
            y={h - 6}
            textAnchor="middle"
            fill="var(--muted-text, #9CA3AF)"
            fontSize="11"
            fontFamily="inherit"
          >
            {d.month}
          </text>
        ))}
      </svg>
    </div>
  )
}

/* ── Activity type indicator dot ── */
const dotColors: Record<string, string> = {
  buyer: '#2563EB',
  match: '#16a34a',
  contract: '#7c3aed',
  call: '#d97706',
  analysis: '#e11d48',
}

export default function DashboardPage() {
  const router = useRouter()
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        if (data.kpis) setKpiData(data.kpis)
        if (data.recentActivity) setActivity(data.recentActivity)
      })
      .catch(() => {})
  }, [])

  const kpis = [
    { label: 'Active Deals', value: kpiData ? kpiData.activeDeals.toLocaleString() : '—', color: '#2563EB' },
    { label: 'Buyers in CRM', value: kpiData ? kpiData.buyerCount.toLocaleString() : '—', color: '#16a34a' },
    { label: 'AI Calls', value: kpiData ? kpiData.aiCalls.toLocaleString() : '—', color: '#7c3aed' },
    { label: 'Deals Closed', value: kpiData ? kpiData.closedDeals.toLocaleString() : '—', color: '#d97706' },
  ]

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: '1.5rem',
            fontWeight: 400,
            color: 'var(--navy-heading, #0B1224)',
            letterSpacing: '-0.022em',
            marginBottom: 4,
            lineHeight: 1.15,
          }}
        >
          Dashboard
        </h1>
        <p style={{ fontSize: '0.86rem', color: 'var(--body-text, #4B5563)', lineHeight: 1.5 }}>
          Your deals, pipeline, and AI outreach at a glance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="dash-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {kpis.map(k => (
          <div
            key={k.label}
            style={{
              ...cardStyle,
              borderLeft: `3px solid ${k.color}`,
              padding: '18px 20px',
            }}
            className="dash-card"
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-text, #9CA3AF)', marginBottom: 10 }}>{k.label}</div>
            <div
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '2rem',
                fontWeight: 400,
                color: 'var(--navy-heading, #0B1224)',
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Middle row: Revenue + Campaigns */}
      <div className="dash-mid" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 20 }}>
        {/* Revenue chart */}
        <div style={cardStyle}>
          <RevenueChart />
        </div>

        {/* Active campaigns */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Active Campaigns</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map(c => (
              <div
                key={c.name}
                style={{
                  border: '1px solid var(--border-light, #F0F0F0)',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--navy-heading, #0B1224)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{c.name}</span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 20,
                      flexShrink: 0,
                      color: c.status === 'running' ? '#16a34a' : 'var(--muted-text, #9CA3AF)',
                      background: c.status === 'running' ? 'rgba(22,163,74,0.08)' : 'rgba(5,14,36,0.04)',
                    }}
                  >
                    {c.status === 'running' ? <Play style={{ width: 10, height: 10 }} /> : <Pause style={{ width: 10, height: 10 }} />}
                    {c.status === 'running' ? 'Running' : 'Paused'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.74rem', color: 'var(--body-text, #4B5563)' }}>
                  <span>{c.calls} calls</span>
                  <span>{c.responseRate}% response</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Activity + Quick Actions */}
      <div className="dash-bot" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
        {/* Activity feed */}
        <div style={cardStyle}>
          <div style={{ marginBottom: 14 }}>
            <div style={sectionLabel as React.CSSProperties}>Recent Activity</div>
          </div>
          <div>
            {activity.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--muted-text, #9CA3AF)', textAlign: 'center', padding: '20px 0' }}>
                No recent activity yet.
              </p>
            ) : activity.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '9px 0',
                  borderBottom: i < activity.length - 1 ? '1px solid var(--border-light, #F0F0F0)' : 'none',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: dotColors[a.type] ?? '#d1d5db',
                    marginTop: 5,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--navy-heading, #0B1224)', lineHeight: 1.45, margin: 0 }}>{a.title}</p>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted-text, #9CA3AF)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={cardStyle}>
          <div style={sectionLabel as React.CSSProperties}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {quickActions.map(a => {
              const Icon = a.icon
              return (
                <button
                  key={a.label}
                  className="dash-action"
                  onClick={() => router.push(a.href)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    padding: '20px 12px',
                    borderRadius: 12,
                    border: '1px solid var(--border-light, #F0F0F0)',
                    background: 'var(--white, #ffffff)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                    fontFamily: 'inherit',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: a.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon style={{ width: 16, height: 16, color: 'white' }} />
                  </div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--body-text, #4B5563)', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>
                    {a.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        .dash-card { transition: box-shadow 0.2s ease; }
        .dash-card:hover { box-shadow: rgba(5,14,36,0.04) 0px 2px 8px; }
        .dash-action:hover { background: var(--warm-gray, rgba(5,14,36,0.02)) !important; border-color: var(--border-med, #E5E7EB) !important; }
        @media (max-width: 1000px) {
          .dash-kpi { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-mid { grid-template-columns: 1fr !important; }
          .dash-bot { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .dash-kpi { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
