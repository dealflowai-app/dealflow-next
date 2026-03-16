'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Play,
  Pause,
  Upload,
  UserPlus,
  Search,
  PhoneOutgoing,
  DollarSign,
  Handshake,
  Send,
  CheckCircle,
  XCircle,
  ChevronRight,
  BarChart3,
  FileSignature,
  Store,
  Eye,
  MessageSquare,
} from 'lucide-react'
import { useToast } from '@/components/toast'

/* ══════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════ */

type KpiData = {
  activeDeals: number
  closedDeals: number
  buyerCount: number
  aiCalls: number
  pendingOffers: number
  totalSpread: number
  matchesSent: number
  dealsThisMonth: number
  contractsDraft: number
  contractsPending: number
  contractsExecuted: number
  contractsExecutedThisMonth: number
  contractsVoided: number
  totalFeesCollected: number
  activeListings: number
  totalListingViews: number
  newInquiries: number
}

type ActivityItem = {
  id: string
  type: string
  title: string
  createdAt: string
}

type RecentDeal = {
  id: string
  address: string
  city: string
  state: string
  askingPrice: number
  status: string
  createdAt: string
  offers: { id: string; status: string }[]
  matches: { id: string }[]
}

type TopMatch = {
  id: string
  matchScore: number
  dealId: string
  deal: { address: string; city: string; state: string; askingPrice: number }
  buyer: { id: string; firstName: string | null; lastName: string | null; entityName: string | null }
}

type PendingOffer = {
  id: string
  amount: number
  status: string
  createdAt: string
  dealId: string
  deal: { address: string; city: string; state: string; askingPrice: number }
  buyer: { id: string; firstName: string | null; lastName: string | null; entityName: string | null }
}

type RecentContract = {
  id: string
  templateName: string
  status: string
  createdAt: string
  deal: { address: string; city: string; state: string }
  offer: { amount: number; buyer: { firstName: string | null; lastName: string | null; entityName: string | null } } | null
}

type RecentInquiry = {
  id: string
  buyerName: string
  message: string | null
  createdAt: string
  listing: { address: string; city: string; state: string }
}

/* ── Static data ── */

const revenueData = [
  { month: 'Oct', value: 18500 },
  { month: 'Nov', value: 24500 },
  { month: 'Dec', value: 12000 },
  { month: 'Jan', value: 31000 },
  { month: 'Feb', value: 28500 },
  { month: 'Mar', value: 42000 },
]

const campaigns = [
  { name: 'Phoenix Cash Buyers - Cold Call', status: 'running', calls: 342, responseRate: 18.4 },
  { name: 'Dallas Absentee Owners', status: 'running', calls: 198, responseRate: 12.7 },
  { name: 'Tampa Investor Reactivation', status: 'paused', calls: 87, responseRate: 22.1 },
]

/* ── Helpers ── */

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

function buyerName(b: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  if (b.firstName || b.lastName) return [b.firstName, b.lastName].filter(Boolean).join(' ')
  return b.entityName || 'Unknown Buyer'
}

function fmtMoney(n: number) {
  return '$' + n.toLocaleString()
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9CA3AF',
  ACTIVE: '#2563EB',
  UNDER_OFFER: '#d97706',
  CLOSED: '#16a34a',
  CANCELLED: '#ef4444',
  EXPIRED: '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  UNDER_OFFER: 'Under Offer',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
}

const CONTRACT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'rgba(156,163,175,0.1)', text: '#6b7280' },
  SENT: { bg: 'rgba(37,99,235,0.08)', text: '#2563eb' },
  EXECUTED: { bg: 'rgba(22,163,74,0.08)', text: '#16a34a' },
  VOIDED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444' },
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
  offer: '#d97706',
  deal: '#2563EB',
}

/* ══════════════════════════════════════════════
   DEAL PIPELINE BAR
   ══════════════════════════════════════════════ */

function DealPipelineBar({ pipeline, router }: { pipeline: Record<string, number>; router: ReturnType<typeof useRouter> }) {
  const statuses = ['DRAFT', 'ACTIVE', 'UNDER_OFFER', 'CLOSED', 'CANCELLED', 'EXPIRED']
  const total = statuses.reduce((s, st) => s + (pipeline[st] || 0), 0)

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.82rem', color: 'var(--muted-text, #9CA3AF)' }}>
        No deals yet. <span style={{ color: '#2563EB', cursor: 'pointer' }} onClick={() => router.push('/deals/new')}>Create your first deal</span>
      </div>
    )
  }

  return (
    <div>
      {/* Bar */}
      <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
        {statuses.map(st => {
          const count = pipeline[st] || 0
          if (count === 0) return null
          const pct = (count / total) * 100
          return (
            <div
              key={st}
              onClick={() => router.push(`/deals?status=${st}`)}
              title={`${STATUS_LABELS[st]}: ${count}`}
              style={{
                width: `${pct}%`,
                minWidth: count > 0 ? 24 : 0,
                background: STATUS_COLORS[st],
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            >
              {pct >= 12 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fff' }}>{count}</span>
              )}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {statuses.map(st => {
          const count = pipeline[st] || 0
          if (count === 0) return null
          return (
            <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--body-text, #4B5563)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[st], flexShrink: 0 }} />
              {STATUS_LABELS[st]} ({count})
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   CONTRACT PIPELINE BAR
   ══════════════════════════════════════════════ */

const CONTRACT_PIPELINE_COLORS: Record<string, string> = {
  DRAFT: '#9CA3AF',
  SENT: '#2563EB',
  EXECUTED: '#16a34a',
  VOIDED: '#ef4444',
}

const CONTRACT_PIPELINE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  EXECUTED: 'Executed',
  VOIDED: 'Voided',
}

function ContractPipelineBar({ pipeline, router }: { pipeline: Record<string, number>; router: ReturnType<typeof useRouter> }) {
  const statuses = ['DRAFT', 'SENT', 'EXECUTED', 'VOIDED']
  const total = statuses.reduce((s, st) => s + (pipeline[st] || 0), 0)

  if (total === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.82rem', color: 'var(--muted-text, #9CA3AF)' }}>
        No contracts yet. <span style={{ color: '#2563EB', cursor: 'pointer' }} onClick={() => router.push('/contracts')}>Create your first contract</span>
      </div>
    )
  }

  return (
    <div>
      {/* Bar */}
      <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
        {statuses.map(st => {
          const count = pipeline[st] || 0
          if (count === 0) return null
          const pct = (count / total) * 100
          return (
            <div
              key={st}
              onClick={() => router.push('/contracts')}
              title={`${CONTRACT_PIPELINE_LABELS[st]}: ${count}`}
              style={{
                width: `${pct}%`,
                minWidth: count > 0 ? 24 : 0,
                background: CONTRACT_PIPELINE_COLORS[st],
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            >
              {pct >= 12 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fff' }}>{count}</span>
              )}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
        {statuses.map(st => {
          const count = pipeline[st] || 0
          if (count === 0) return null
          return (
            <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--body-text, #4B5563)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: CONTRACT_PIPELINE_COLORS[st], flexShrink: 0 }} />
              {CONTRACT_PIPELINE_LABELS[st]} ({count})
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════ */

export default function DashboardPage() {
  const router = useRouter()
  const showToast = useToast()
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([])
  const [topMatches, setTopMatches] = useState<TopMatch[]>([])
  const [pendingOffers, setPendingOffers] = useState<PendingOffer[]>([])
  const [dealPipeline, setDealPipeline] = useState<Record<string, number>>({})
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null)
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([])
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([])
  const [contractPipeline, setContractPipeline] = useState<Record<string, number>>({})

  const fetchDashboard = useCallback(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => {
        if (data.kpis) setKpiData(data.kpis)
        if (data.recentActivity) setActivity(data.recentActivity)
        if (data.recentDeals) setRecentDeals(data.recentDeals)
        if (data.topMatches) setTopMatches(data.topMatches)
        if (data.pendingOffersList) setPendingOffers(data.pendingOffersList)
        if (data.dealPipeline) setDealPipeline(data.dealPipeline)
        if (data.recentContracts) setRecentContracts(data.recentContracts)
        if (data.recentInquiries) setRecentInquiries(data.recentInquiries)
        if (data.contractPipeline) setContractPipeline(data.contractPipeline)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  /* ── Offer actions ── */
  async function handleOfferAction(offerId: string, action: 'ACCEPTED' | 'REJECTED') {
    setOfferActionLoading(offerId)
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.error || 'Action failed')
        return
      }
      showToast(action === 'ACCEPTED' ? 'Offer accepted!' : 'Offer rejected')
      fetchDashboard()
    } catch {
      showToast('Network error')
    } finally {
      setOfferActionLoading(null)
    }
  }

  /* ── KPI cards config ── */
  const kpis = [
    { label: 'Active Deals', value: kpiData ? kpiData.activeDeals.toLocaleString() : '—', color: '#2563EB' },
    { label: 'Pending Offers', value: kpiData ? kpiData.pendingOffers.toLocaleString() : '—', color: '#d97706' },
    { label: 'Total Spread', value: kpiData ? fmtMoney(kpiData.totalSpread) : '—', color: '#16a34a' },
    { label: 'Deals Closed', value: kpiData ? kpiData.closedDeals.toLocaleString() : '—', color: '#7c3aed' },
    { label: 'Buyers in CRM', value: kpiData ? kpiData.buyerCount.toLocaleString() : '—', color: '#0891b2' },
    { label: 'Deals This Month', value: kpiData ? kpiData.dealsThisMonth.toLocaleString() : '—', color: '#e11d48' },
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

      {/* KPI Cards — 6 cards in a 3x2 grid on desktop */}
      <div className="dash-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
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
                fontSize: '1.8rem',
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

      {/* Deal Pipeline Bar */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={sectionLabel as React.CSSProperties}>Deal Pipeline</div>
          <button
            onClick={() => router.push('/deals')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.72rem',
              color: '#2563EB',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontFamily: 'inherit',
            }}
          >
            View all <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
        <DealPipelineBar pipeline={dealPipeline} router={router} />
      </div>

      {/* Contract Pipeline Bar */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={sectionLabel as React.CSSProperties}>Contract Pipeline</div>
          <button
            onClick={() => router.push('/contracts')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.72rem',
              color: '#2563EB',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontFamily: 'inherit',
            }}
          >
            View all <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
        <ContractPipelineBar pipeline={contractPipeline} router={router} />
      </div>

      {/* Contract & Marketplace KPI Cards */}
      <div className="dash-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ ...cardStyle, borderLeft: `3px solid ${kpiData && (kpiData.contractsDraft + kpiData.contractsPending) > 0 ? '#d97706' : '#9CA3AF'}`, padding: '18px 20px' }} className="dash-card">
          <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-text, #9CA3AF)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileSignature style={{ width: 12, height: 12 }} /> Contracts Pending
          </div>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.8rem', fontWeight: 400, color: 'var(--navy-heading, #0B1224)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {kpiData ? (kpiData.contractsDraft + kpiData.contractsPending) : '—'}
          </div>
          {kpiData && (
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text, #9CA3AF)', marginTop: 6 }}>
              {kpiData.contractsDraft} draft{kpiData.contractsDraft !== 1 ? 's' : ''}, {kpiData.contractsPending} awaiting signature
            </div>
          )}
        </div>
        <div style={{ ...cardStyle, borderLeft: '3px solid #16a34a', padding: '18px 20px' }} className="dash-card">
          <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-text, #9CA3AF)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle style={{ width: 12, height: 12 }} /> Contracts Executed
          </div>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.8rem', fontWeight: 400, color: 'var(--navy-heading, #0B1224)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {kpiData ? kpiData.contractsExecutedThisMonth : '—'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--muted-text, #9CA3AF)', marginTop: 6 }}>
            {kpiData ? `${kpiData.contractsExecuted} all time` : '—'}
            {kpiData && kpiData.totalFeesCollected > 0 && ` · ${fmtMoney(kpiData.totalFeesCollected)} fees`}
          </div>
        </div>
        <div style={{ ...cardStyle, borderLeft: '3px solid #2563EB', padding: '18px 20px' }} className="dash-card">
          <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-text, #9CA3AF)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Store style={{ width: 12, height: 12 }} /> Active Listings
          </div>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.8rem', fontWeight: 400, color: 'var(--navy-heading, #0B1224)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {kpiData ? kpiData.activeListings : '—'}
          </div>
          {kpiData && (
            <div style={{ fontSize: '0.68rem', color: 'var(--muted-text, #9CA3AF)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Eye style={{ width: 10, height: 10 }} /> {kpiData.totalListingViews.toLocaleString()} total views
            </div>
          )}
        </div>
        <div style={{ ...cardStyle, borderLeft: `3px solid ${kpiData && kpiData.newInquiries > 0 ? '#2563EB' : '#9CA3AF'}`, padding: '18px 20px', position: 'relative' }} className="dash-card">
          <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted-text, #9CA3AF)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare style={{ width: 12, height: 12 }} /> New Inquiries
          </div>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.8rem', fontWeight: 400, color: 'var(--navy-heading, #0B1224)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {kpiData ? kpiData.newInquiries : '—'}
          </div>
          {kpiData && kpiData.newInquiries > 0 && (
            <span style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />
          )}
        </div>
      </div>

      {/* Contract Status + Marketplace Activity */}
      <div className="dash-mid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Contracts Status */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ ...sectionLabel as React.CSSProperties, display: 'flex', alignItems: 'center', gap: 6 }}>
              Contracts
              {kpiData && kpiData.contractsPending > 0 && (
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#d97706', background: 'rgba(217,119,6,0.08)', padding: '2px 7px', borderRadius: 10 }}>
                  action needed
                </span>
              )}
            </div>
            <button
              onClick={() => router.push('/contracts')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#2563EB', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'inherit' }}
            >
              View all <ChevronRight style={{ width: 12, height: 12 }} />
            </button>
          </div>
          {recentContracts.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--muted-text, #9CA3AF)', textAlign: 'center', padding: '20px 0' }}>
              No contracts yet. <span style={{ color: '#2563EB', cursor: 'pointer' }} onClick={() => router.push('/contracts')}>Create your first contract</span>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentContracts.map((c, i) => {
                const sc = CONTRACT_STATUS_COLORS[c.status] || CONTRACT_STATUS_COLORS.DRAFT
                const contractBuyer = c.offer?.buyer
                  ? ([c.offer.buyer.firstName, c.offer.buyer.lastName].filter(Boolean).join(' ') || c.offer.buyer.entityName || 'Manual Entry')
                  : 'Manual Entry'
                const typeLabel = c.templateName.toLowerCase().includes('double close') ? 'Double Close'
                  : c.templateName.toLowerCase().includes('jv') ? 'JV' : 'Assignment'
                return (
                  <div
                    key={c.id}
                    onClick={() => router.push('/contracts')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: i < recentContracts.length - 1 ? '1px solid var(--border-light, #F0F0F0)' : 'none',
                      cursor: 'pointer',
                    }}
                    className="dash-deal-row"
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--navy-heading, #0B1224)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.deal.address}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted-text, #9CA3AF)', marginTop: 2 }}>
                        {contractBuyer} · {c.deal.city}, {c.deal.state}
                        {c.offer?.amount ? ` · ${fmtMoney(c.offer.amount)}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                      <span style={{
                        fontSize: '0.62rem', fontWeight: 600,
                        color: '#6b7280', background: 'rgba(107,114,128,0.08)',
                        padding: '2px 6px', borderRadius: 10,
                      }}>
                        {typeLabel}
                      </span>
                      <span style={{
                        fontSize: '0.66rem', fontWeight: 600,
                        color: sc.text, background: sc.bg,
                        padding: '2px 8px', borderRadius: 10,
                      }}>
                        {c.status}
                      </span>
                      <span style={{ fontSize: '0.66rem', color: 'var(--muted-text, #9CA3AF)' }}>
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Marketplace Activity */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={sectionLabel as React.CSSProperties}>Marketplace</div>
            <button
              onClick={() => router.push('/marketplace')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#2563EB', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'inherit' }}
            >
              View all <ChevronRight style={{ width: 12, height: 12 }} />
            </button>
          </div>
          {kpiData && kpiData.activeListings > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, padding: '10px 14px', background: 'rgba(37,99,235,0.04)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Store style={{ width: 13, height: 13, color: '#2563EB' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--navy-heading, #0B1224)' }}>{kpiData.activeListings}</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--muted-text, #9CA3AF)' }}>active listing{kpiData.activeListings !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Eye style={{ width: 13, height: 13, color: '#6b7280' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--navy-heading, #0B1224)' }}>{kpiData.totalListingViews.toLocaleString()}</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--muted-text, #9CA3AF)' }}>views</span>
              </div>
            </div>
          )}
          {recentInquiries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentInquiries.map((inq, i) => (
                <div
                  key={inq.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: i < recentInquiries.length - 1 ? '1px solid var(--border-light, #F0F0F0)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--navy-heading, #0B1224)' }}>
                        {inq.buyerName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted-text, #9CA3AF)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inq.listing.address}, {inq.listing.city}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/marketplace')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '4px 10px', borderRadius: 6,
                        border: '1px solid #2563EB', background: 'transparent', color: '#2563EB',
                        fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        flexShrink: 0, marginLeft: 8,
                      }}
                    >
                      Respond
                    </button>
                  </div>
                  {inq.message && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--body-text, #4B5563)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                      {inq.message}
                    </div>
                  )}
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted-text, #9CA3AF)', marginTop: 4 }}>
                    {timeAgo(inq.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : kpiData && kpiData.activeListings === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted-text, #9CA3AF)', marginBottom: 10 }}>
                No marketplace listings yet.
              </p>
              <button
                onClick={() => router.push('/marketplace')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '8px 16px', borderRadius: 8,
                  border: '1px solid #2563EB', background: 'transparent', color: '#2563EB',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Store style={{ width: 13, height: 13 }} /> List your first deal
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--muted-text, #9CA3AF)', textAlign: 'center', padding: '20px 0' }}>
              No new inquiries.
            </p>
          )}
        </div>
      </div>

      {/* Two-column: Recent Deals + Pending Offers */}
      <div className="dash-mid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Recent Deals */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={sectionLabel as React.CSSProperties}>Recent Deals</div>
            <button
              onClick={() => router.push('/deals')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', color: '#2563EB', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'inherit',
              }}
            >
              View all <ChevronRight style={{ width: 12, height: 12 }} />
            </button>
          </div>
          {recentDeals.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--muted-text, #9CA3AF)', textAlign: 'center', padding: '20px 0' }}>
              No deals yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentDeals.map((deal, i) => {
                const activeOffers = deal.offers.filter(o => o.status === 'PENDING' || o.status === 'COUNTERED').length
                return (
                  <div
                    key={deal.id}
                    onClick={() => router.push(`/deals/${deal.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: i < recentDeals.length - 1 ? '1px solid var(--border-light, #F0F0F0)' : 'none',
                      cursor: 'pointer',
                    }}
                    className="dash-deal-row"
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--navy-heading, #0B1224)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.address}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted-text, #9CA3AF)', marginTop: 2 }}>
                        {deal.city}, {deal.state} · {fmtMoney(deal.askingPrice)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      {activeOffers > 0 && (
                        <span style={{ fontSize: '0.66rem', fontWeight: 600, color: '#d97706', background: 'rgba(217,119,6,0.08)', padding: '2px 7px', borderRadius: 10 }}>
                          {activeOffers} offer{activeOffers > 1 ? 's' : ''}
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        color: STATUS_COLORS[deal.status] || '#6b7280',
                        background: `${STATUS_COLORS[deal.status] || '#6b7280'}14`,
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}>
                        {STATUS_LABELS[deal.status] || deal.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending Offers */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={sectionLabel as React.CSSProperties}>Pending Offers</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <DollarSign style={{ width: 12, height: 12, color: '#d97706' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d97706' }}>
                {kpiData?.pendingOffers || 0} pending
              </span>
            </div>
          </div>
          {pendingOffers.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--muted-text, #9CA3AF)', textAlign: 'center', padding: '20px 0' }}>
              No pending offers.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {pendingOffers.map((offer, i) => {
                const pctOfAsking = offer.deal.askingPrice > 0
                  ? Math.round((offer.amount / offer.deal.askingPrice) * 100)
                  : null
                const isLoading = offerActionLoading === offer.id
                return (
                  <div
                    key={offer.id}
                    style={{
                      padding: '10px 0',
                      borderBottom: i < pendingOffers.length - 1 ? '1px solid var(--border-light, #F0F0F0)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--navy-heading, #0B1224)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fmtMoney(offer.amount)}
                          {pctOfAsking && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text, #9CA3AF)', fontWeight: 400, marginLeft: 6 }}>
                              ({pctOfAsking}% of ask)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-text, #9CA3AF)', marginTop: 2 }}>
                          {buyerName(offer.buyer)} · {offer.deal.address}, {offer.deal.city}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                        <button
                          onClick={() => handleOfferAction(offer.id, 'ACCEPTED')}
                          disabled={isLoading}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            padding: '4px 10px', borderRadius: 6,
                            border: '1px solid #16a34a', background: '#16a34a', color: '#fff',
                            fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                            opacity: isLoading ? 0.6 : 1, fontFamily: 'inherit',
                          }}
                        >
                          <CheckCircle style={{ width: 11, height: 11 }} />
                          Accept
                        </button>
                        <button
                          onClick={() => handleOfferAction(offer.id, 'REJECTED')}
                          disabled={isLoading}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            padding: '4px 10px', borderRadius: 6,
                            border: '1px solid #ef4444', background: 'transparent', color: '#ef4444',
                            fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                            opacity: isLoading ? 0.6 : 1, fontFamily: 'inherit',
                          }}
                        >
                          <XCircle style={{ width: 11, height: 11 }} />
                          Reject
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted-text, #9CA3AF)' }}>
                      {timeAgo(offer.createdAt)}
                      {offer.status === 'COUNTERED' && (
                        <span style={{ marginLeft: 6, color: '#2563EB', fontWeight: 600 }}>COUNTERED</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Matches Section */}
      {topMatches.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={sectionLabel as React.CSSProperties}>Top Buyer Matches</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Handshake style={{ width: 12, height: 12, color: '#16a34a' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#16a34a' }}>
                {kpiData?.matchesSent || 0} sent (30d)
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {topMatches.map(match => (
              <div
                key={match.id}
                style={{
                  border: '1px solid var(--border-light, #F0F0F0)',
                  borderRadius: 10,
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    color: match.matchScore >= 80 ? '#16a34a' : match.matchScore >= 60 ? '#d97706' : '#6b7280',
                    background: match.matchScore >= 80 ? 'rgba(22,163,74,0.08)' : match.matchScore >= 60 ? 'rgba(217,119,6,0.08)' : 'rgba(107,114,128,0.08)',
                    padding: '2px 8px', borderRadius: 10,
                  }}>
                    {match.matchScore}% match
                  </span>
                  <BarChart3 style={{ width: 12, height: 12, color: 'var(--muted-text, #9CA3AF)' }} />
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--navy-heading, #0B1224)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {buyerName(match.buyer)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted-text, #9CA3AF)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {match.deal.address}, {match.deal.city}
                </div>
                <button
                  onClick={() => router.push(`/deals/${match.dealId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, width: '100%', justifyContent: 'center',
                    padding: '6px 12px', borderRadius: 6,
                    border: '1px solid #2563EB', background: 'transparent', color: '#2563EB',
                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <Send style={{ width: 11, height: 11 }} />
                  View Deal
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Middle row: Revenue + Campaigns */}
      <div className="dash-mid2" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 20 }}>
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
        .dash-deal-row:hover { background: rgba(5,14,36,0.02); }
        @media (max-width: 1000px) {
          .dash-kpi { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-mid { grid-template-columns: 1fr !important; }
          .dash-mid2 { grid-template-columns: 1fr !important; }
          .dash-bot { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .dash-kpi { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
