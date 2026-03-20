'use client'

import { useEffect, useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  ExternalLink,
  Calendar,
  CreditCard,
} from 'lucide-react'

const fontFamily = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function fmtDec(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

interface RevenueData {
  mrr: number
  mrrChange: number
  arr: number
  arpu: number
  ltv: number | null
  paidSubscribers: number
  tierBreakdown: Record<string, number>
  monthlyRevenue: { month: string; subscription: number; usage: number; total: number }[]
  usageBreakdown: Record<string, { current: number; previous: number; rate: number; currentRevenue: number; previousRevenue: number }>
  topPayingUsers: { userId: string; name: string; email: string; tier: string; totalRevenue: number; since: string }[]
  upcomingRenewals: { id: string; name: string; email: string; tier: string; amount: number; currentPeriodEnd: string; tierStatus: string }[]
  failedPayments: { id: string; amount: number; status: string; description: string | null; createdAt: string; userName: string; userEmail: string; stripeCustomerId: string | null }[]
  failureRate: number
  totalRevenueMtd: number
}

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/revenue')
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageShell><p style={{ color: 'rgba(5,14,36,0.5)', fontSize: '0.85rem' }}>Loading revenue data...</p></PageShell>
  if (!data) return <PageShell><p style={{ color: '#EF4444', fontSize: '0.85rem' }}>Failed to load revenue data.</p></PageShell>

  const tierPrices: Record<string, number> = { starter: 149, pro: 299, business: 499, enterprise: 499 }

  return (
    <PageShell>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="MRR"
          value={fmt(data.mrr)}
          detail={data.mrrChange !== 0 ? `${data.mrrChange > 0 ? '+' : ''}${data.mrrChange}% vs last month` : 'No change'}
          detailColor={data.mrrChange > 0 ? '#2563EB' : data.mrrChange < 0 ? '#EF4444' : 'rgba(5,14,36,0.4)'}
          icon={DollarSign}
          iconBg="#ECFDF5"
          iconColor="#10B981"
        />
        <KpiCard
          label="ARR"
          value={fmt(data.arr)}
          detail="Annualized run rate"
          detailColor="rgba(5,14,36,0.4)"
          icon={TrendingUp}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
        />
        <KpiCard
          label="ARPU"
          value={fmt(data.arpu)}
          detail={`${data.paidSubscribers} paid subscribers`}
          detailColor="#2563EB"
          icon={Users}
          iconBg="#EDE9FE"
          iconColor="#8B5CF6"
        />
        <KpiCard
          label="LTV ESTIMATE"
          value={data.ltv !== null ? fmt(data.ltv) : 'Calculating...'}
          detail={data.ltv !== null ? 'ARPU x avg subscription months' : 'Need 3+ months of data'}
          detailColor="rgba(5,14,36,0.4)"
          icon={TrendingUp}
          iconBg="#FFF7ED"
          iconColor="#F59E0B"
        />
      </div>

      {/* Revenue over time chart */}
      <Card title="Revenue Over Time" style={{ marginBottom: 24 }}>
        <RevenueBarChart data={data.monthlyRevenue} />
      </Card>

      {/* Revenue by tier + Usage breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card title="Revenue by Tier">
          {(['starter', 'pro', 'enterprise'] as const).map((tier) => {
            const count = data.tierBreakdown[tier] || 0
            const revenue = count * (tierPrices[tier] || 0)
            const pct = data.mrr > 0 ? Math.round((revenue / data.mrr) * 100) : 0
            return (
              <div key={tier} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, color: '#0B1224', textTransform: 'capitalize' }}>{tier}</span>
                  <span style={{ color: 'rgba(5,14,36,0.5)' }}>{fmt(revenue)} ({count} users)</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: 4,
                      background: tier === 'starter' ? '#2563EB' : tier === 'pro' ? '#8B5CF6' : '#0B1224',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)', marginTop: 2 }}>{pct}% of MRR</div>
              </div>
            )
          })}
        </Card>

        <Card title="Usage Revenue Breakdown">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'aiCalls', label: 'AI Voice Calls', unit: 'minutes' },
              { key: 'sms', label: 'SMS Messages', unit: 'messages' },
              { key: 'skipTraces', label: 'Skip Traces', unit: 'reveals' },
              { key: 'dealFees', label: 'Deal Fees', unit: 'deals' },
            ].map((item) => {
              const d = (data.usageBreakdown as any)[item.key]
              if (!d) return null
              const change = d.previousRevenue > 0 ? Math.round(((d.currentRevenue - d.previousRevenue) / d.previousRevenue) * 100) : 0
              return (
                <div
                  key={item.key}
                  style={{
                    padding: 12,
                    background: '#F9FAFB',
                    borderRadius: 8,
                  }}
                >
                  <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(5,14,36,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0B1224', margin: '0 0 2px' }}>
                    {fmtDec(d.currentRevenue)}
                  </p>
                  <p style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)', margin: 0 }}>
                    {d.current} {item.unit} @ ${d.rate}
                  </p>
                  <p style={{ fontSize: '0.68rem', color: change >= 0 ? '#2563EB' : '#EF4444', margin: '2px 0 0', fontWeight: 500 }}>
                    {change !== 0 ? `${change > 0 ? '+' : ''}${change}% vs last month` : 'Same as last month'}
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Top paying users */}
      <Card title="Top Paying Users" style={{ marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(5,14,36,0.08)' }}>
              {['User', 'Tier', 'Total Revenue', 'Since'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.topPayingUsers.length === 0 ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(5,14,36,0.4)', padding: 24 }}>No payment data yet</td></tr>
            ) : (
              data.topPayingUsers.map((u) => (
                <tr key={u.userId} style={{ borderBottom: '1px solid rgba(5,14,36,0.05)' }}>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#0B1224' }}>{u.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(5,14,36,0.4)' }}>{u.email}</div>
                  </td>
                  <td style={tdStyle}><TierBadge tier={u.tier} /></td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#0B1224' }}>{fmt(u.totalRevenue)}</td>
                  <td style={{ ...tdStyle, color: 'rgba(5,14,36,0.5)', fontSize: '0.78rem' }}>
                    {u.since ? new Date(u.since).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Upcoming renewals + Failed payments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Upcoming Renewals (7d)">
          {data.upcomingRenewals.length === 0 ? (
            <p style={{ color: 'rgba(5,14,36,0.4)', fontSize: '0.82rem' }}>No upcoming renewals</p>
          ) : (
            data.upcomingRenewals.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(5,14,36,0.05)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#0B1224' }}>{r.name}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)' }}>{r.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0B1224' }}>{fmt(r.amount)}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar style={{ width: 10, height: 10 }} />
                    {new Date(r.currentPeriodEnd).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card title={`Failed Payments (${data.failureRate}% failure rate)`}>
          {data.failedPayments.length === 0 ? (
            <p style={{ color: 'rgba(5,14,36,0.4)', fontSize: '0.82rem' }}>No failed payments</p>
          ) : (
            data.failedPayments.map((fp) => (
              <div
                key={fp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(5,14,36,0.05)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#0B1224' }}>{fp.userName}</div>
                  <div style={{ fontSize: '0.68rem', color: '#EF4444' }}>{fmtDec(fp.amount)} failed</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)' }}>
                    {new Date(fp.createdAt).toLocaleDateString()}
                  </span>
                  {fp.stripeCustomerId && (
                    <button
                      onClick={() => window.open(`https://dashboard.stripe.com/customers/${fp.stripeCustomerId}`, '_blank')}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(5,14,36,0.12)',
                        borderRadius: 4,
                        padding: '2px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: '0.65rem',
                        color: 'rgba(5,14,36,0.5)',
                      }}
                    >
                      <ExternalLink style={{ width: 10, height: 10 }} /> Stripe
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </PageShell>
  )
}

// --- Shared sub-components ---

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 32, fontFamily, maxWidth: 1280 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0B1224', margin: 0 }}>Revenue</h1>
        <p style={{ fontSize: '0.85rem', color: 'rgba(5,14,36,0.5)', margin: '4px 0 0' }}>Financial health and payment analytics</p>
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

function KpiCard({ label, value, detail, detailColor, icon: Icon, iconBg, iconColor }: {
  label: string; value: string; detail: string; detailColor: string; icon: React.ElementType; iconBg: string; iconColor: string
}) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid rgba(5,14,36,0.08)', borderRadius: 12, padding: 18, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16, width: 34, height: 34, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon style={{ width: 16, height: 16, color: iconColor, strokeWidth: 1.8 }} />
      </div>
      <p style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(5,14,36,0.4)', margin: '0 0 6px', fontFamily }}>{label}</p>
      <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0B1224', margin: '0 0 4px', fontFamily, lineHeight: 1.2 }}>{value}</p>
      <p style={{ fontSize: '0.72rem', fontWeight: 500, color: detailColor, margin: 0, fontFamily }}>{detail}</p>
    </div>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    free: { bg: '#F3F4F6', color: '#6B7280' },
    starter: { bg: '#DBEAFE', color: '#2563EB' },
    pro: { bg: '#EDE9FE', color: '#7C3AED' },
    enterprise: { bg: '#FEF3C7', color: '#D97706' },
  }
  const c = colors[tier] || colors.free
  return (
    <span style={{ display: 'inline-flex', fontSize: '0.68rem', fontWeight: 600, textTransform: 'capitalize', color: c.color, background: c.bg, borderRadius: 20, padding: '2px 8px' }}>
      {tier}
    </span>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(5,14,36,0.4)', textAlign: 'left', fontFamily,
}
const tdStyle: React.CSSProperties = {
  padding: '10px 14px', fontFamily,
}

// --- Revenue bar chart ---
function RevenueBarChart({ data }: { data: { month: string; subscription: number; usage: number; total: number }[] }) {
  if (!data.length) return <div style={{ color: 'rgba(5,14,36,0.4)', fontSize: '0.82rem' }}>No revenue data yet</div>

  const w = 700
  const h = 220
  const pad = { top: 20, right: 20, bottom: 36, left: 55 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom
  const maxVal = Math.max(...data.map((d) => d.total), 1)
  const barWidth = Math.max(8, (chartW / data.length) * 0.6)
  const barGap = chartW / data.length

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      {/* Y grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const yPos = pad.top + chartH * (1 - pct)
        const val = Math.round(maxVal * pct)
        return (
          <g key={pct}>
            <line x1={pad.left} y1={yPos} x2={w - pad.right} y2={yPos} stroke="rgba(5,14,36,0.06)" strokeWidth={1} />
            <text x={pad.left - 8} y={yPos + 4} textAnchor="end" fill="rgba(5,14,36,0.4)" fontSize={10} fontFamily={fontFamily}>
              ${val}
            </text>
          </g>
        )
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const x = pad.left + i * barGap + (barGap - barWidth) / 2
        const subH = maxVal > 0 ? (d.subscription / maxVal) * chartH : 0
        const usageH = maxVal > 0 ? (d.usage / maxVal) * chartH : 0
        return (
          <g key={i}>
            {/* Subscription bar */}
            <rect x={x} y={pad.top + chartH - subH - usageH} width={barWidth} height={subH} fill="#0B1224" rx={2} />
            {/* Usage bar */}
            <rect x={x} y={pad.top + chartH - usageH} width={barWidth} height={usageH} fill="#2563EB" rx={2} />
            {/* Label */}
            <text x={x + barWidth / 2} y={h - 10} textAnchor="middle" fill="rgba(5,14,36,0.4)" fontSize={9} fontFamily={fontFamily}>
              {d.month}
            </text>
          </g>
        )
      })}
      {/* Legend */}
      <rect x={w - 200} y={8} width={10} height={10} rx={2} fill="#0B1224" />
      <text x={w - 186} y={17} fill="rgba(5,14,36,0.5)" fontSize={10} fontFamily={fontFamily}>Subscriptions</text>
      <rect x={w - 110} y={8} width={10} height={10} rx={2} fill="#2563EB" />
      <text x={w - 96} y={17} fill="rgba(5,14,36,0.5)" fontSize={10} fontFamily={fontFamily}>Usage</text>
    </svg>
  )
}
