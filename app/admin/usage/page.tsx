'use client'

import { useEffect, useState } from 'react'
import {
  UserSearch,
  PhoneOutgoing,
  Calculator,
  FileSignature,
  Store,
  Sparkles,
  BarChart3,
  Activity,
} from 'lucide-react'

const fontFamily = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

interface UsageData {
  featureAdoption: { name: string; users: number; total: number; percentage: number }[]
  dailyUsage: { date: string; aiMinutes: number; sms: number; analyses: number; skipTraces: number }[]
  activityDistribution: { label: string; description: string; count: number; color: string; percentage: number }[]
  usageByTier: Record<string, { aiMinutes: number; sms: number; analyses: number; deals: number; contacts: number; userCount: number }>
  popularActions: { action: string; count: number }[]
  totalUsers: number
}

const featureIcons: Record<string, React.ElementType> = {
  'Find Buyers': UserSearch,
  'AI Outreach': PhoneOutgoing,
  'Deal Analysis': Calculator,
  'Contracts': FileSignature,
  'Marketplace': Store,
  'Ask AI': Sparkles,
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [visibleLines, setVisibleLines] = useState({ aiMinutes: true, sms: true, analyses: true, skipTraces: true })

  useEffect(() => {
    fetch('/api/admin/usage')
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageShell><p style={{ color: 'rgba(5,14,36,0.5)', fontSize: '0.85rem' }}>Loading usage analytics...</p></PageShell>
  if (!data) return <PageShell><p style={{ color: '#EF4444', fontSize: '0.85rem' }}>Failed to load usage data.</p></PageShell>

  return (
    <PageShell>
      {/* Feature adoption cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {data.featureAdoption.map((f) => {
          const Icon = featureIcons[f.name] || Activity
          return (
            <div
              key={f.name}
              style={{
                background: '#ffffff',
                border: '1px solid rgba(5,14,36,0.08)',
                borderRadius: 12,
                padding: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {/* Progress ring */}
              <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                <svg viewBox="0 0 56 56" style={{ width: 56, height: 56 }}>
                  <circle cx={28} cy={28} r={24} fill="none" stroke="#F3F4F6" strokeWidth={4} />
                  <circle
                    cx={28}
                    cy={28}
                    r={24}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={`${(f.percentage / 100) * 150.8} 150.8`}
                    transform="rotate(-90 28 28)"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 18, height: 18, color: '#2563EB', strokeWidth: 1.8 }} />
                </div>
              </div>
              <div>
                <p style={{ fontSize: '0.78rem', fontWeight: 500, color: '#0B1224', margin: '0 0 2px', fontFamily }}>
                  {f.name}
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0B1224', margin: '0 0 2px', fontFamily }}>
                  {f.percentage}%
                </p>
                <p style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)', margin: 0, fontFamily }}>
                  {f.users} of {f.total} users
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Usage over time chart */}
      <Card title="Usage Trends (30d)" style={{ marginBottom: 24 }}>
        {/* Toggle buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { key: 'aiMinutes', label: 'AI Minutes', color: '#2563EB' },
            { key: 'sms', label: 'SMS', color: '#8B5CF6' },
            { key: 'analyses', label: 'Analyses', color: '#0B1224' },
            { key: 'skipTraces', label: 'Skip Traces', color: '#06B6D4' },
          ].map((line) => (
            <button
              key={line.key}
              onClick={() => setVisibleLines((v) => ({ ...v, [line.key]: !v[line.key as keyof typeof v] }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid rgba(5,14,36,0.12)',
                background: (visibleLines as any)[line.key] ? '#F9FAFB' : 'transparent',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 500,
                color: (visibleLines as any)[line.key] ? '#0B1224' : 'rgba(5,14,36,0.3)',
                fontFamily,
                opacity: (visibleLines as any)[line.key] ? 1 : 0.5,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: line.color }} />
              {line.label}
            </button>
          ))}
        </div>
        <UsageTrendChart data={data.dailyUsage} visible={visibleLines} />
      </Card>

      {/* Activity distribution + Usage by tier */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card title="User Activity Distribution">
          {data.activityDistribution.map((d) => (
            <div key={d.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <div>
                  <span style={{ fontWeight: 500, color: '#0B1224' }}>{d.label}</span>
                  <span style={{ color: 'rgba(5,14,36,0.4)', marginLeft: 6, fontSize: '0.72rem' }}>{d.description}</span>
                </div>
                <span style={{ fontWeight: 600, color: '#0B1224' }}>{d.count} ({d.percentage}%)</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${d.percentage}%`,
                    borderRadius: 4,
                    background: d.color,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </Card>

        <Card title="Avg Usage by Tier">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(5,14,36,0.08)' }}>
                <th style={thStyle}>Metric</th>
                {['free', 'starter', 'pro', 'enterprise'].map((t) => (
                  <th key={t} style={{ ...thStyle, textAlign: 'center', textTransform: 'capitalize' }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'aiMinutes', label: 'AI Minutes' },
                { key: 'sms', label: 'SMS' },
                { key: 'analyses', label: 'Analyses' },
                { key: 'deals', label: 'Deals' },
                { key: 'contacts', label: 'Contacts' },
              ].map((row) => (
                <tr key={row.key} style={{ borderBottom: '1px solid rgba(5,14,36,0.05)' }}>
                  <td style={{ ...tdStyle, fontSize: '0.78rem', fontWeight: 500, color: '#0B1224' }}>{row.label}</td>
                  {['free', 'starter', 'pro', 'enterprise'].map((tier) => {
                    const val = (data.usageByTier[tier] as any)?.[row.key] || 0
                    return (
                      <td key={tier} style={{ ...tdStyle, textAlign: 'center', fontSize: '0.78rem', color: val > 0 ? '#0B1224' : 'rgba(5,14,36,0.2)', fontWeight: val > 0 ? 600 : 400 }}>
                        {val}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr style={{ borderBottom: '1px solid rgba(5,14,36,0.08)' }}>
                <td style={{ ...tdStyle, fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)' }}>Users</td>
                {['free', 'starter', 'pro', 'enterprise'].map((tier) => (
                  <td key={tier} style={{ ...tdStyle, textAlign: 'center', fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)' }}>
                    {data.usageByTier[tier]?.userCount || 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      {/* Popular actions */}
      <Card title="Most Popular Actions (All Time)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {data.popularActions.map((a, i) => (
            <div
              key={a.action}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: '#F9FAFB',
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#0B1224',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1, fontSize: '0.82rem', color: '#0B1224', fontWeight: 400 }}>{a.action}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0B1224' }}>
                {new Intl.NumberFormat('en-US').format(a.count)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  )
}

// --- Shared components ---

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 32, fontFamily, maxWidth: 1280 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0B1224', margin: 0 }}>Usage Analytics</h1>
        <p style={{ fontSize: '0.85rem', color: 'rgba(5,14,36,0.5)', margin: '4px 0 0' }}>Feature adoption and platform usage trends</p>
      </div>
      {children}
    </div>
  )
}

function Card({ title, children, style: s }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid rgba(5,14,36,0.08)', borderRadius: 12, padding: 20, ...s }}>
      <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 16px' }}>{title}</h3>
      {children}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(5,14,36,0.4)', textAlign: 'left', fontFamily,
}
const tdStyle: React.CSSProperties = {
  padding: '8px 10px', fontFamily,
}

// --- Multi-line usage chart ---
function UsageTrendChart({
  data,
  visible,
}: {
  data: { date: string; aiMinutes: number; sms: number; analyses: number; skipTraces: number }[]
  visible: { aiMinutes: boolean; sms: boolean; analyses: boolean; skipTraces: boolean }
}) {
  if (!data.length) return <div style={{ color: 'rgba(5,14,36,0.4)', fontSize: '0.82rem' }}>No usage data yet</div>

  const w = 700
  const h = 200
  const pad = { top: 10, right: 20, bottom: 30, left: 45 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom

  const lines = [
    { key: 'aiMinutes', color: '#2563EB', visible: visible.aiMinutes },
    { key: 'sms', color: '#8B5CF6', visible: visible.sms },
    { key: 'analyses', color: '#0B1224', visible: visible.analyses },
    { key: 'skipTraces', color: '#06B6D4', visible: visible.skipTraces },
  ].filter((l) => l.visible)

  // Calculate max across visible lines
  let maxVal = 1
  for (const d of data) {
    for (const l of lines) {
      const v = (d as any)[l.key] || 0
      if (v > maxVal) maxVal = v
    }
  }

  function x(i: number) {
    return pad.left + (i / (data.length - 1 || 1)) * chartW
  }
  function y(val: number) {
    return pad.top + chartH - (val / maxVal) * chartH
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const yPos = pad.top + chartH * (1 - pct)
        return (
          <g key={pct}>
            <line x1={pad.left} y1={yPos} x2={w - pad.right} y2={yPos} stroke="rgba(5,14,36,0.06)" strokeWidth={1} />
            <text x={pad.left - 6} y={yPos + 3} textAnchor="end" fill="rgba(5,14,36,0.4)" fontSize={9} fontFamily={fontFamily}>
              {Math.round(maxVal * pct)}
            </text>
          </g>
        )
      })}
      {/* Lines */}
      {lines.map((l) => {
        const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y((d as any)[l.key] || 0)}`).join(' ')
        return <path key={l.key} d={path} fill="none" stroke={l.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      })}
      {/* X labels */}
      {data.map((d, i) =>
        i % 5 === 0 || i === data.length - 1 ? (
          <text key={i} x={x(i)} y={h - 8} textAnchor="middle" fill="rgba(5,14,36,0.4)" fontSize={9} fontFamily={fontFamily}>
            {d.date.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  )
}
