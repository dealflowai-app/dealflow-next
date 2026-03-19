'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  UserCheck,
  CreditCard,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  UserPlus,
  ArrowUpRight,
  Briefcase,
  Contact,
  FileSignature,
  Store,
  Activity,
} from 'lucide-react'

interface StatsData {
  users: {
    total: number
    newThisWeek: number
    activeUsers7d: number
    activePercent: number
    tierBreakdown: Record<string, number>
    trialUsers: number
    trialExpiringThisWeek: number
    paidSubscribers: number
  }
  revenue: {
    mrr: number
    usageRevenueMtd: number
    totalRevenueMtd: number
    churnRate: number
  }
  platform: {
    totalDeals: number
    totalBuyers: number
    totalContracts: number
    activeListings: number
    totalAiMinutes: number
    totalSms: number
    totalSkipTraces: number
    totalDealsClosed: number
  }
  charts: {
    userGrowth: { date: string; total: number; paid: number }[]
  }
}

interface ActivityItem {
  type: string
  description: string
  email?: string
  timestamp: string
  status?: string
}

const fontFamily = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

// Simple SVG line chart
function UserGrowthChart({ data }: { data: { date: string; total: number; paid: number }[] }) {
  if (!data.length) return <div style={{ color: 'rgba(5,14,36,0.4)', fontSize: '0.82rem' }}>No data yet</div>

  const w = 500
  const h = 200
  const pad = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom

  const maxVal = Math.max(...data.map((d) => d.total), 1)
  const minVal = 0

  function x(i: number) {
    return pad.left + (i / (data.length - 1 || 1)) * chartW
  }
  function y(val: number) {
    return pad.top + chartH - ((val - minVal) / (maxVal - minVal || 1)) * chartH
  }

  const totalPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.total)}`).join(' ')
  const paidPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.paid)}`).join(' ')

  // Y-axis labels
  const ySteps = 4
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => Math.round(minVal + ((maxVal - minVal) / ySteps) * i))

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      {/* Grid lines */}
      {yLabels.map((val, i) => (
        <g key={i}>
          <line x1={pad.left} y1={y(val)} x2={w - pad.right} y2={y(val)} stroke="rgba(5,14,36,0.06)" strokeWidth={1} />
          <text x={pad.left - 8} y={y(val) + 4} textAnchor="end" fill="rgba(5,14,36,0.4)" fontSize={10} fontFamily={fontFamily}>
            {val}
          </text>
        </g>
      ))}
      {/* Lines */}
      <path d={totalPath} fill="none" stroke="#0B1224" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={paidPath} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,4" />
      {/* X-axis labels (show every 5th) */}
      {data.map((d, i) =>
        i % 5 === 0 || i === data.length - 1 ? (
          <text key={i} x={x(i)} y={h - 5} textAnchor="middle" fill="rgba(5,14,36,0.4)" fontSize={10} fontFamily={fontFamily}>
            {d.date.slice(5)}
          </text>
        ) : null
      )}
      {/* Legend */}
      <line x1={pad.left} y1={h - 16} x2={pad.left + 16} y2={h - 16} stroke="#0B1224" strokeWidth={2} />
      <text x={pad.left + 20} y={h - 12} fill="rgba(5,14,36,0.6)" fontSize={10} fontFamily={fontFamily}>Total</text>
      <line x1={pad.left + 60} y1={h - 16} x2={pad.left + 76} y2={h - 16} stroke="#2563EB" strokeWidth={2} strokeDasharray="4,4" />
      <text x={pad.left + 80} y={h - 12} fill="rgba(5,14,36,0.6)" fontSize={10} fontFamily={fontFamily}>Paid</text>
    </svg>
  )
}

// Activity icon
function ActivityIcon({ type }: { type: string }) {
  const size = 14
  const style = { width: size, height: size, strokeWidth: 1.7 }

  switch (type) {
    case 'signup':
      return <UserPlus style={{ ...style, color: '#2563EB' }} />
    case 'payment':
      return <DollarSign style={{ ...style, color: '#10B981' }} />
    case 'payment_failed':
      return <AlertCircle style={{ ...style, color: '#EF4444' }} />
    case 'tier_change':
      return <ArrowUpRight style={{ ...style, color: '#8B5CF6' }} />
    default:
      return <Activity style={{ ...style, color: '#6B7280' }} />
  }
}

function activityDotColor(type: string) {
  switch (type) {
    case 'signup': return '#DBEAFE'
    case 'payment': return '#D1FAE5'
    case 'payment_failed': return '#FEE2E2'
    case 'tier_change': return '#EDE9FE'
    default: return '#F3F4F6'
  }
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, activityRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/activity'),
        ])
        if (statsRes.ok) setStats(await statsRes.json())
        if (activityRes.ok) {
          const data = await activityRes.json()
          setActivities(data.activities || [])
        }
      } catch (e) {
        console.error('Failed to load admin data:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 32, fontFamily }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0B1224', marginBottom: 8 }}>Admin Dashboard</div>
        <p style={{ color: 'rgba(5,14,36,0.5)', fontSize: '0.88rem' }}>Loading metrics...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ padding: 32, fontFamily }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0B1224', marginBottom: 8 }}>Admin Dashboard</div>
        <p style={{ color: '#EF4444', fontSize: '0.88rem' }}>Failed to load admin data.</p>
      </div>
    )
  }

  const kpiCardsRow1 = [
    {
      label: 'TOTAL USERS',
      value: formatNumber(stats.users.total),
      detail: `+${stats.users.newThisWeek} this week`,
      detailColor: '#2563EB',
      icon: Users,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
    },
    {
      label: 'ACTIVE USERS (7D)',
      value: formatNumber(stats.users.activeUsers7d),
      detail: `${stats.users.activePercent}% of total`,
      detailColor: '#2563EB',
      icon: UserCheck,
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
    },
    {
      label: 'PAID SUBSCRIBERS',
      value: formatNumber(stats.users.paidSubscribers),
      detail: `${stats.users.tierBreakdown.starter || 0} starter, ${stats.users.tierBreakdown.pro || 0} pro, ${stats.users.tierBreakdown.enterprise || 0} enterprise`,
      detailColor: '#2563EB',
      icon: CreditCard,
      iconBg: '#EDE9FE',
      iconColor: '#8B5CF6',
    },
    {
      label: 'TRIAL USERS',
      value: formatNumber(stats.users.trialUsers),
      detail: `${stats.users.trialExpiringThisWeek} expiring this week`,
      detailColor: stats.users.trialExpiringThisWeek > 0 ? '#F59E0B' : '#2563EB',
      icon: Clock,
      iconBg: '#FFF7ED',
      iconColor: '#F59E0B',
    },
  ]

  const kpiCardsRow2 = [
    {
      label: 'MRR',
      value: formatCurrency(stats.revenue.mrr),
      detail: 'Subscription revenue',
      detailColor: '#2563EB',
      icon: DollarSign,
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
    },
    {
      label: 'USAGE REVENUE (MTD)',
      value: formatCurrency(stats.revenue.usageRevenueMtd),
      detail: 'AI calls + SMS + skip traces',
      detailColor: '#2563EB',
      icon: TrendingUp,
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
    },
    {
      label: 'TOTAL REVENUE (MTD)',
      value: formatCurrency(stats.revenue.totalRevenueMtd),
      detail: 'Subscriptions + usage',
      detailColor: '#2563EB',
      icon: TrendingUp,
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
    },
    {
      label: 'CHURN RATE',
      value: `${stats.revenue.churnRate}%`,
      detail: 'Last 30 days',
      detailColor: stats.revenue.churnRate > 5 ? '#EF4444' : '#10B981',
      icon: TrendingDown,
      iconBg: stats.revenue.churnRate > 5 ? '#FEF2F2' : '#ECFDF5',
      iconColor: stats.revenue.churnRate > 5 ? '#EF4444' : '#10B981',
    },
  ]

  const quickStats = [
    { label: 'Total Deals', value: formatNumber(stats.platform.totalDeals), icon: Briefcase },
    { label: 'Total Buyers', value: formatNumber(stats.platform.totalBuyers), icon: Contact },
    { label: 'AI Call Minutes', value: formatNumber(stats.platform.totalAiMinutes), icon: Activity },
    { label: 'Contracts Generated', value: formatNumber(stats.platform.totalContracts), icon: FileSignature },
    { label: 'Active Listings', value: formatNumber(stats.platform.activeListings), icon: Store },
  ]

  return (
    <div style={{ padding: 32, fontFamily, maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0B1224', margin: 0, lineHeight: 1.3 }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'rgba(5,14,36,0.5)', margin: '4px 0 0' }}>
          Platform-wide metrics and activity
        </p>
      </div>

      {/* KPI Row 1 - User metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {kpiCardsRow1.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* KPI Row 2 - Revenue metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpiCardsRow2.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* User growth chart */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid rgba(5,14,36,0.08)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 16px' }}>
            User Growth (30d)
          </h3>
          <UserGrowthChart data={stats.charts.userGrowth} />
        </div>

        {/* Revenue breakdown */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid rgba(5,14,36,0.08)',
            borderRadius: 12,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 16px' }}>
            Revenue Breakdown
          </h3>
          <RevenueBreakdown mrr={stats.revenue.mrr} usage={stats.revenue.usageRevenueMtd} total={stats.revenue.totalRevenueMtd} />
        </div>
      </div>

      {/* Activity feed */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid rgba(5,14,36,0.08)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0B1224', margin: '0 0 16px' }}>
          Recent Activity
        </h3>
        {activities.length === 0 ? (
          <p style={{ color: 'rgba(5,14,36,0.4)', fontSize: '0.82rem' }}>No recent activity</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activities.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: i < activities.length - 1 ? '1px solid rgba(5,14,36,0.05)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: activityDotColor(a.type),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ActivityIcon type={a.type} />
                </div>
                <span style={{ flex: 1, fontSize: '0.82rem', color: '#0B1224', fontWeight: 400 }}>
                  {a.description}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(5,14,36,0.4)', whiteSpace: 'nowrap' }}>
                  {timeAgo(a.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats row */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid rgba(5,14,36,0.08)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {quickStats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 16px',
                borderRight: i < quickStats.length - 1 ? '1px solid rgba(5,14,36,0.08)' : 'none',
              }}
            >
              <Icon style={{ width: 16, height: 16, color: 'rgba(5,14,36,0.3)', strokeWidth: 1.7 }} />
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0B1224' }}>{stat.value}</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)', whiteSpace: 'nowrap' }}>{stat.label}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// KPI Card component
function KpiCard({
  label,
  value,
  detail,
  detailColor,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: string
  detail: string
  detailColor: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(5,14,36,0.08)',
        borderRadius: 12,
        padding: 18,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon style={{ width: 16, height: 16, color: iconColor, strokeWidth: 1.8 }} />
      </div>
      <p
        style={{
          fontSize: '0.62rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(5,14,36,0.4)',
          margin: '0 0 6px',
          fontFamily,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#0B1224',
          margin: '0 0 4px',
          fontFamily,
          lineHeight: 1.2,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: '0.72rem',
          fontWeight: 500,
          color: detailColor,
          margin: 0,
          fontFamily,
        }}
      >
        {detail}
      </p>
    </div>
  )
}

// Revenue breakdown visual
function RevenueBreakdown({ mrr, usage, total }: { mrr: number; usage: number; total: number }) {
  const maxVal = Math.max(total, 1)
  const mrrPct = Math.round((mrr / maxVal) * 100)
  const usagePct = 100 - mrrPct

  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Subscription
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0B1224', margin: 0 }}>{formatCurrency(mrr)}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Usage
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563EB', margin: 0 }}>{formatCurrency(usage)}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Total MTD
          </p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981', margin: 0 }}>{formatCurrency(total)}</p>
        </div>
      </div>

      {/* Stacked bar */}
      <div style={{ height: 28, borderRadius: 8, overflow: 'hidden', display: 'flex', background: '#F3F4F6' }}>
        {mrrPct > 0 && (
          <div style={{ width: `${mrrPct}%`, background: '#0B1224', transition: 'width 0.3s ease' }} />
        )}
        {usagePct > 0 && (
          <div style={{ width: `${usagePct}%`, background: '#2563EB', transition: 'width 0.3s ease' }} />
        )}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#0B1224' }} />
          <span style={{ fontSize: '0.72rem', color: 'rgba(5,14,36,0.5)' }}>Subscriptions ({mrrPct}%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2563EB' }} />
          <span style={{ fontSize: '0.72rem', color: 'rgba(5,14,36,0.5)' }}>Usage ({usagePct}%)</span>
        </div>
      </div>
    </div>
  )
}
