'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Play,
  Upload,
  UserPlus,
  Search,
  PhoneOutgoing,
  DollarSign,
  Handshake,
  CheckCircle,
  XCircle,
  ChevronRight,
  BarChart3,
  FileSignature,
  Store,
  Eye,
  MessageSquare,
  Phone,
  Clock,
  Target,
  Users,
  Home,
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Activity,
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
  activeCampaigns: number
  callsThisWeek: number
  callsToday: number
  qualifiedThisWeek: number
  qualificationRate: number
  avgCallDuration: number
  totalCallMinutes: number
}

type OutreachRecentCall = {
  id: string
  outcome: string | null
  durationSecs: number | null
  channel: string | null
  startedAt: string | null
  buyer: { id: string; firstName: string | null; lastName: string | null; entityName: string | null }
  campaign: { id: string; name: string }
}

type OutreachCampaignPerf = {
  id: string; name: string; channel: string; status: string
  totalBuyers: number; callsCompleted: number; qualified: number; qualificationRate: number
}

type OutreachData = {
  recentCalls: OutreachRecentCall[]
  campaignPerformance: OutreachCampaignPerf[]
  callsPerDay: { date: string; total: number; qualified: number }[]
  outreachByChannel: Record<string, number>
  outreachEvents: { id: string; type: string; title: string; createdAt: string }[]
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

type TopBuyer = {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  buyerScore: number
  status: string
  state: string | null
  lastContactedAt: string | null
}

type DealValuesByStage = {
  status: string
  count: number
  totalValue: number
  totalFees: number
}

type DashboardData = {
  firstName: string | null
  kpis: KpiData
  recentActivity: ActivityItem[]
  recentDeals: RecentDeal[]
  topMatches: TopMatch[]
  pendingOffersList: PendingOffer[]
  dealPipeline: Record<string, number>
  contractPipeline: Record<string, number>
  recentContracts: RecentContract[]
  recentInquiries: RecentInquiry[]
  outreach: OutreachData
  buyersByStatus: Record<string, number>
  buyersByState: { state: string; count: number }[]
  dailyRevenue: { date: string; revenue: number }[]
  dealValuesByStage: DealValuesByStage[]
  topBuyers: TopBuyer[]
  overdueCallbacks: number
  unreadSmsCount: number
}

/* ── Tabs ── */
type TabKey = 'overview' | 'deals' | 'outreach' | 'contracts' | 'analytics'

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: 'overview', label: 'Overview', icon: Home },
  { key: 'deals', label: 'Deals & Pipeline', icon: Briefcase },
  { key: 'outreach', label: 'Outreach & Buyers', icon: PhoneOutgoing },
  { key: 'contracts', label: 'Contracts & Marketplace', icon: FileSignature },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
]

/* ══════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════ */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function bName(b: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  if (b.firstName || b.lastName) return [b.firstName, b.lastName].filter(Boolean).join(' ')
  return b.entityName || 'Unknown'
}

function fmtMoney(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return '$' + n.toLocaleString()
}

function fmtMoneyFull(n: number) {
  return '$' + n.toLocaleString()
}

function fmtDuration(secs: number | null) {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtMinutesAsHours(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/* ── Constants ── */
const SERIF = "'DM Serif Display', Georgia, serif"

/* ── Status & Pipeline Maps ── */
const PIPELINE_COLORS: Record<string, string> = {
  DRAFT: '#E5E7EB', ACTIVE: '#3B82F6', UNDER_OFFER: '#F59E0B',
  CLOSED: '#22C55E', CANCELLED: '#EF4444', EXPIRED: '#9CA3AF',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', ACTIVE: 'Active', UNDER_OFFER: 'Under Offer', CLOSED: 'Closed', CANCELLED: 'Cancelled', EXPIRED: 'Expired',
}
const OUTCOME_LABELS: Record<string, string> = {
  QUALIFIED: 'Qualified', NOT_BUYING: 'Not Buying', NO_ANSWER: 'No Answer',
  VOICEMAIL: 'Voicemail', WRONG_NUMBER: 'Wrong #', DO_NOT_CALL: 'DNC',
  CALLBACK_REQUESTED: 'Callback',
}
const BUYER_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#3B82F6', HIGH_CONFIDENCE: '#22C55E', RECENTLY_VERIFIED: '#8B5CF6', DORMANT: '#9CA3AF', DO_NOT_CALL: '#EF4444',
}
const BUYER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', HIGH_CONFIDENCE: 'High Confidence', RECENTLY_VERIFIED: 'Verified', DORMANT: 'Dormant', DO_NOT_CALL: 'DNC',
}
const CONTRACT_PIPELINE_COLORS: Record<string, string> = {
  DRAFT: '#E5E7EB', SENT: '#3B82F6', EXECUTED: '#22C55E', VOIDED: '#EF4444',
}
const CONTRACT_LABELS: Record<string, string> = {
  DRAFT: 'Draft', SENT: 'Sent', EXECUTED: 'Executed', VOIDED: 'Voided',
}
const CHANNEL_COLORS: Record<string, string> = { VOICE: '#3B82F6', SMS: '#22C55E', EMAIL: '#8B5CF6', MULTI_CHANNEL: '#F59E0B' }
const CHANNEL_LABELS: Record<string, string> = { VOICE: 'Voice', SMS: 'SMS', EMAIL: 'Email', MULTI_CHANNEL: 'Multi' }

/* ── Badge helpers ── */
function statusBadgeCls(status: string): string {
  const m: Record<string, string> = {
    ACTIVE: 'text-blue-700 bg-blue-50 border-blue-100',
    CLOSED: 'text-green-700 bg-green-50 border-green-100',
    DRAFT: 'text-gray-500 bg-gray-50 border-gray-100',
    CANCELLED: 'text-red-600 bg-red-50 border-red-100',
    VOIDED: 'text-red-600 bg-red-50 border-red-100',
    SENT: 'text-indigo-700 bg-indigo-50 border-indigo-100',
    UNDER_OFFER: 'text-amber-700 bg-amber-50 border-amber-100',
    EXPIRED: 'text-gray-500 bg-gray-50 border-gray-100',
    EXECUTED: 'text-green-700 bg-green-50 border-green-100',
    RUNNING: 'text-green-700 bg-green-50 border-green-100',
    COMPLETED: 'text-blue-700 bg-blue-50 border-blue-100',
    PAUSED: 'text-amber-700 bg-amber-50 border-amber-100',
    PENDING: 'text-amber-700 bg-amber-50 border-amber-100',
    COUNTERED: 'text-purple-700 bg-purple-50 border-purple-100',
  }
  return `inline-flex text-[0.68rem] font-medium px-2 py-0.5 rounded-full border ${m[status] || 'text-gray-500 bg-gray-50 border-gray-100'}`
}

function outcomeBadgeCls(outcome: string): string {
  const m: Record<string, string> = {
    QUALIFIED: 'text-green-700 bg-green-50 border-green-100',
    NOT_BUYING: 'text-gray-500 bg-gray-50 border-gray-100',
    NO_ANSWER: 'text-amber-700 bg-amber-50 border-amber-100',
    VOICEMAIL: 'text-purple-700 bg-purple-50 border-purple-100',
    WRONG_NUMBER: 'text-red-600 bg-red-50 border-red-100',
    DO_NOT_CALL: 'text-red-600 bg-red-50 border-red-100',
    CALLBACK_REQUESTED: 'text-purple-700 bg-purple-50 border-purple-100',
  }
  return `inline-flex text-[0.68rem] font-medium px-2 py-0.5 rounded-full border ${m[outcome] || 'text-gray-500 bg-gray-50 border-gray-100'}`
}

/* ── Icon tint helper ── */
function iconTint(color: string): [string, string] {
  const m: Record<string, [string, string]> = {
    '#2563EB': ['bg-blue-50', 'text-blue-500'],
    '#3B82F6': ['bg-blue-50', 'text-blue-500'],
    '#16a34a': ['bg-green-50', 'text-green-500'],
    '#22C55E': ['bg-green-50', 'text-green-500'],
    '#7c3aed': ['bg-purple-50', 'text-purple-500'],
    '#8B5CF6': ['bg-purple-50', 'text-purple-500'],
    '#d97706': ['bg-amber-50', 'text-amber-500'],
    '#F59E0B': ['bg-amber-50', 'text-amber-500'],
    '#ef4444': ['bg-red-50', 'text-red-500'],
    '#EF4444': ['bg-red-50', 'text-red-500'],
    '#9CA3AF': ['bg-gray-100', 'text-gray-400'],
    '#0891b2': ['bg-cyan-50', 'text-cyan-500'],
  }
  return m[color] || ['bg-gray-100', 'text-gray-400']
}

/* ══════════════════════════════════════════════
   REUSABLE COMPONENTS
   ══════════════════════════════════════════════ */

function StatCard({ label, value, subtitle, icon: Icon, color, onClick }: {
  label: string; value: string; subtitle?: string; icon: typeof Home; color: string; onClick?: () => void
}) {
  const [bg, text] = iconTint(color)
  return (
    <div
      className={`bg-white rounded-xl border border-[#EAEAEA] p-5 relative overflow-hidden ${
        onClick
          ? 'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]'
          : 'transition-shadow duration-200 hover:shadow-sm'
      }`}
      onClick={onClick}
    >
      <div className={`absolute top-4 right-4 w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${text}`} />
      </div>
      <div className="text-[0.72rem] font-semibold tracking-[0.04em] uppercase text-[#9CA3AF] mb-3">
        {label}
      </div>
      <div className="text-[2rem] font-semibold text-[#0B1224] tracking-tight leading-none">
        {value}
      </div>
      {subtitle && (
        <div className="text-[0.7rem] text-[#9CA3AF] mt-1.5">{subtitle}</div>
      )}
    </div>
  )
}

function ViewAllLink({ href, router }: { href: string; router: ReturnType<typeof useRouter> }) {
  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-center gap-0.5 text-[0.75rem] text-[#2563EB] font-medium bg-transparent border-none cursor-pointer font-[inherit] hover:underline"
    >
      View all <ChevronRight className="w-3 h-3" />
    </button>
  )
}

function SectionHeader({ title, viewAllHref, router, rightSlot }: {
  title: string
  viewAllHref?: string
  router?: ReturnType<typeof useRouter>
  rightSlot?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F3F4F6]">
      <h3 className="text-base text-[#0B1224] font-normal" style={{ fontFamily: SERIF }}>
        {title}
      </h3>
      {viewAllHref && router && <ViewAllLink href={viewAllHref} router={router} />}
      {rightSlot}
    </div>
  )
}

function EmptyState({ message, actionLabel, onAction, compact }: {
  message: string; actionLabel?: string; onAction?: () => void; compact?: boolean
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-center h-[120px] rounded-lg border border-dashed border-[#E5E7EB]">
        <span className="text-sm text-[#9CA3AF]">{message}</span>
      </div>
    )
  }
  return (
    <div className="text-center py-6">
      <p className="text-[0.82rem] text-[#9CA3AF]">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-[7px] rounded-lg border border-[#2563EB] bg-transparent text-[#2563EB] text-[0.76rem] font-semibold cursor-pointer font-[inherit] transition-colors hover:bg-blue-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function PipelineBar({ statuses, pipeline, colors, labels, onClick }: {
  statuses: string[]
  pipeline: Record<string, number>
  colors: Record<string, string>
  labels: Record<string, string>
  onClick?: (status: string) => void
}) {
  const total = statuses.reduce((s, st) => s + (pipeline[st] || 0), 0)
  if (total === 0) return null

  const active = statuses.filter(st => (pipeline[st] || 0) > 0)

  return (
    <div>
      <div className="flex items-center bg-[#F5F5F5] rounded-full h-[10px] overflow-hidden gap-[2px] px-[1px]">
        {active.map((st, i) => {
          const count = pipeline[st] || 0
          const pct = (count / total) * 100
          return (
            <div
              key={st}
              onClick={() => onClick?.(st)}
              title={`${labels[st]}: ${count}`}
              className={`h-full transition-opacity hover:opacity-80 ${
                onClick ? 'cursor-pointer' : ''
              } ${i === 0 ? 'rounded-l-full' : ''} ${
                i === active.length - 1 ? 'rounded-r-full' : ''
              }`}
              style={{ width: `${pct}%`, minWidth: 8, background: colors[st] }}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
        {active.map(st => (
          <div key={st} className="flex items-center gap-1.5 text-[0.7rem] text-[#4B5563]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[st] }} />
            {labels[st]} <span className="text-[#9CA3AF] ml-0.5">{pipeline[st]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── SVG Line Chart ── */
function LineChart({ data, height = 120, color = '#3B82F6', areaColor, showGrid = false }: {
  data: { label?: string; value: number }[]
  height?: number
  color?: string
  areaColor?: string
  showGrid?: boolean
}) {
  if (data.length < 2) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 480
  const h = height
  const padB = data[0].label ? 24 : 4
  const chartH = h - padB
  const stepX = w / (data.length - 1)

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartH - (d.value / max) * (chartH - 12) - 4,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartH} L${points[0].x},${chartH} Z`
  const gradId = `areaG-${color.replace('#', '')}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      {showGrid && [0.25, 0.5, 0.75, 1].map(frac => {
        const y = chartH - frac * (chartH - 12) - 4
        return <line key={frac} x1="0" y1={y} x2={w} y2={y} stroke="#F3F4F6" strokeWidth="1" />
      })}
      {areaColor && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={areaColor} stopOpacity="0.12" />
              <stop offset="100%" stopColor={areaColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#fff" stroke={color} strokeWidth="1.5" />
      ))}
      {data[0].label && data.map((d, i) => (
        <text key={i} x={i * stepX} y={h - 4} textAnchor="middle" fill="#9CA3AF" fontSize="10" fontFamily="inherit">
          {d.label}
        </text>
      ))}
    </svg>
  )
}

/* ── Donut Chart ── */
function DonutChart({ segments, size = 140, showTotal = false }: {
  segments: { label: string; value: number; color: string }[]
  size?: number
  showTotal?: boolean
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null

  const strokeW = 24
  const r = (size - strokeW) / 2
  const cx = size / 2
  const cy = size / 2

  let cumAngle = -90
  const arcs = segments.filter(s => s.value > 0).map(seg => {
    const angle = (seg.value / total) * 360
    const startAngle = cumAngle
    cumAngle += angle
    const endAngle = cumAngle
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const largeArc = angle > 180 ? 1 : 0
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    return { ...seg, d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}` }
  })

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={strokeW} />
          {arcs.map((arc, i) => (
            <path key={i} d={arc.d} fill="none" stroke={arc.color} strokeWidth={strokeW} strokeLinecap="butt" />
          ))}
        </svg>
        {showTotal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold text-[#0B1224] leading-none">{total}</span>
            <span className="text-[0.65rem] text-[#9CA3AF] mt-0.5">total</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 justify-center">
        {segments.filter(s => s.value > 0).map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[0.72rem] text-[#4B5563]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            {s.label}: {s.value}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Skeleton ── */
function Skeleton({ height = 16, width, className = '' }: { height?: number; width?: string | number; className?: string }) {
  return (
    <div
      className={`animate-pulse bg-[#F3F4F6] rounded-lg ${className}`}
      style={{ height, width: width || '100%' }}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#EAEAEA] p-5">
      <div className="flex items-start justify-between mb-3">
        <Skeleton height={10} width="40%" />
        <div className="w-9 h-9 rounded-lg animate-pulse bg-[#F3F4F6]" />
      </div>
      <Skeleton height={32} width="50%" className="mb-2" />
      <Skeleton height={10} width="60%" />
    </div>
  )
}

/* ══════════════════════════════════════════════
   ALERT BADGES
   ══════════════════════════════════════════════ */

function AlertBadges({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const alerts: { label: string; count: number; borderCls: string; dotCls: string; href: string }[] = []
  if (data.overdueCallbacks > 0) alerts.push({ label: 'Overdue callbacks', count: data.overdueCallbacks, borderCls: 'border-red-200 hover:bg-red-50', dotCls: 'bg-red-400', href: '/outreach' })
  if (data.kpis.pendingOffers > 0) alerts.push({ label: 'Pending offers', count: data.kpis.pendingOffers, borderCls: 'border-amber-200 hover:bg-amber-50', dotCls: 'bg-amber-400', href: '/deals' })
  if (data.unreadSmsCount > 0) alerts.push({ label: 'Unread SMS', count: data.unreadSmsCount, borderCls: 'border-blue-200 hover:bg-blue-50', dotCls: 'bg-blue-400', href: '/outreach?tab=sms' })
  if (data.kpis.newInquiries > 0) alerts.push({ label: 'New inquiries', count: data.kpis.newInquiries, borderCls: 'border-purple-200 hover:bg-purple-50', dotCls: 'bg-purple-400', href: '/marketplace' })

  if (alerts.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {alerts.map(a => (
        <button
          key={a.label}
          onClick={() => router.push(a.href)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border ${a.borderCls} cursor-pointer font-[inherit] transition-colors`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.dotCls}`} />
          <span className="text-[0.76rem] font-medium text-[#374151]">{a.count} {a.label}</span>
          <ArrowUpRight className="w-3 h-3 text-[#9CA3AF]" />
        </button>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════
   TAB: OVERVIEW
   ══════════════════════════════════════════════ */

function OverviewTab({ data, router, onOfferAction, offerLoading }: {
  data: DashboardData; router: ReturnType<typeof useRouter>
  onOfferAction: (id: string, action: 'ACCEPTED' | 'REJECTED') => void
  offerLoading: string | null
}) {
  const k = data.kpis
  const monthRevenue = data.dailyRevenue.reduce((s, d) => s + d.revenue, 0)

  return (
    <>
      {/* KPI Row */}
      <div className="dash-grid-4 grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Active Deals" value={k.activeDeals.toLocaleString()} subtitle={`${k.dealsThisMonth} new this month`} icon={Briefcase} color="#3B82F6" onClick={() => router.push('/deals')} />
        <StatCard label="Total Revenue" value={fmtMoney(k.totalSpread)} subtitle={monthRevenue > 0 ? `${fmtMoney(monthRevenue)} this month` : 'From closed deals'} icon={DollarSign} color="#22C55E" />
        <StatCard label="Buyer Network" value={k.buyerCount.toLocaleString()} subtitle={`${k.qualifiedThisWeek} qualified this week`} icon={Users} color="#8B5CF6" onClick={() => router.push('/crm')} />
        <StatCard label="AI Outreach" value={k.callsThisWeek.toLocaleString()} subtitle={`${k.activeCampaigns} active campaign${k.activeCampaigns !== 1 ? 's' : ''}`} icon={PhoneOutgoing} color="#3B82F6" onClick={() => router.push('/outreach')} />
      </div>

      {/* Deal Pipeline */}
      <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 mb-5">
        <SectionHeader title="Deal Pipeline" viewAllHref="/deals" router={router} />
        {Object.keys(data.dealPipeline).length > 0 ? (
          <PipelineBar
            statuses={['DRAFT', 'ACTIVE', 'UNDER_OFFER', 'CLOSED', 'CANCELLED', 'EXPIRED']}
            pipeline={data.dealPipeline}
            colors={PIPELINE_COLORS}
            labels={STATUS_LABELS}
            onClick={st => router.push(`/deals?status=${st}`)}
          />
        ) : (
          <EmptyState message="No deals yet." actionLabel="Create your first deal" onAction={() => router.push('/deals/new')} />
        )}
      </div>

      {/* Two columns: Recent Deals + Pending Offers */}
      <div className="dash-grid-2 grid grid-cols-2 gap-3.5 mb-5">
        {/* Recent Deals */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Recent Deals" viewAllHref="/deals" router={router} />
          {data.recentDeals.length === 0 ? (
            <EmptyState message="No deals yet." />
          ) : (
            <div>
              {data.recentDeals.map((deal, i) => {
                const activeOffers = deal.offers.filter(o => o.status === 'PENDING' || o.status === 'COUNTERED').length
                return (
                  <div
                    key={deal.id}
                    onClick={() => router.push(`/deals/${deal.id}`)}
                    className="dash-row flex items-center justify-between py-2.5 cursor-pointer"
                    style={{ borderBottom: i < data.recentDeals.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.82rem] font-medium text-[#0B1224] truncate">{deal.address}</div>
                      <div className="text-[0.72rem] text-[#9CA3AF] mt-0.5">{deal.city}, {deal.state} &middot; {fmtMoneyFull(deal.askingPrice)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      {activeOffers > 0 && (
                        <span className={statusBadgeCls('PENDING')}>{activeOffers} offer{activeOffers > 1 ? 's' : ''}</span>
                      )}
                      <span className={statusBadgeCls(deal.status)}>{STATUS_LABELS[deal.status] || deal.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pending Offers */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader
            title="Pending Offers"
            rightSlot={k.pendingOffers > 0 ? <span className="text-[0.68rem] font-semibold text-amber-600">{k.pendingOffers} pending</span> : undefined}
          />
          {data.pendingOffersList.length === 0 ? (
            <EmptyState message="No pending offers." />
          ) : (
            <div>
              {data.pendingOffersList.map((offer, i) => {
                const pctOfAsking = offer.deal.askingPrice > 0 ? Math.round((offer.amount / offer.deal.askingPrice) * 100) : null
                const isLoading = offerLoading === offer.id
                return (
                  <div key={offer.id} className="py-2.5" style={{ borderBottom: i < data.pendingOffersList.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-[0.82rem] font-medium text-[#0B1224]">
                          {fmtMoneyFull(offer.amount)}
                          {pctOfAsking && <span className="text-[0.7rem] text-[#9CA3AF] font-normal ml-1.5">({pctOfAsking}%)</span>}
                        </div>
                        <div className="text-[0.72rem] text-[#9CA3AF] mt-0.5">{bName(offer.buyer)} &middot; {offer.deal.address}</div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-2">
                        <button
                          onClick={() => onOfferAction(offer.id, 'ACCEPTED')}
                          disabled={isLoading}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-600 text-white text-[0.68rem] font-semibold cursor-pointer font-[inherit] border-none transition-colors hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="w-[10px] h-[10px]" /> Accept
                        </button>
                        <button
                          onClick={() => onOfferAction(offer.id, 'REJECTED')}
                          disabled={isLoading}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-500 bg-transparent text-red-500 text-[0.68rem] font-semibold cursor-pointer font-[inherit] transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle className="w-[10px] h-[10px]" /> Reject
                        </button>
                      </div>
                    </div>
                    <div className="text-[0.68rem] text-[#9CA3AF]">
                      {timeAgo(offer.createdAt)}
                      {offer.status === 'COUNTERED' && <span className={`ml-1.5 ${statusBadgeCls('COUNTERED')}`}>COUNTERED</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two columns: Activity + Quick Actions */}
      <div className="dash-grid-2 grid grid-cols-[3fr_2fr] gap-3.5">
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Recent Activity" />
          {(() => {
            const outreachEvts = data.outreach?.outreachEvents || []
            const merged = [...data.recentActivity, ...outreachEvts]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 8)
            if (merged.length === 0) return <EmptyState message="No recent activity." />
            return merged.map((a, i) => (
              <div key={a.id} className="flex items-start gap-2.5 py-2" style={{ borderBottom: i < merged.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-[7px] shrink-0" />
                <p className="flex-1 text-[0.82rem] text-[#0B1224] leading-[1.45] m-0">{a.title}</p>
                <span className="text-[0.68rem] text-[#9CA3AF] whitespace-nowrap shrink-0">{timeAgo(a.createdAt)}</span>
              </div>
            ))
          })()}
        </div>
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Quick Actions" />
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'New Campaign', icon: PhoneOutgoing, color: '#3B82F6', href: '/outreach' },
              { label: 'Upload Deal', icon: Upload, color: '#22C55E', href: '/deals/new' },
              { label: 'Add Buyer', icon: UserPlus, color: '#8B5CF6', href: '/crm' },
              { label: 'Run Analysis', icon: Search, color: '#F59E0B', href: '/analyzer' },
            ].map(a => {
              const Icon = a.icon
              const [bg, text] = iconTint(a.color)
              return (
                <button
                  key={a.label}
                  onClick={() => router.push(a.href)}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-[#EAEAEA] bg-white cursor-pointer font-[inherit] transition-all duration-200 hover:shadow-md hover:-translate-y-[1px]"
                >
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${text}`} />
                  </div>
                  <span className="text-[0.74rem] text-[#4B5563] font-medium text-center leading-tight">{a.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════
   TAB: DEALS & PIPELINE
   ══════════════════════════════════════════════ */

function DealsTab({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const k = data.kpis

  return (
    <>
      {/* KPI Row */}
      <div className="dash-grid-4 grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Active Deals" value={k.activeDeals.toLocaleString()} subtitle={`${k.dealsThisMonth} new this month`} icon={Briefcase} color="#3B82F6" />
        <StatCard label="Deals Closed" value={k.closedDeals.toLocaleString()} subtitle={fmtMoney(k.totalSpread) + ' total spread'} icon={CheckCircle} color="#22C55E" />
        <StatCard label="Pending Offers" value={k.pendingOffers.toLocaleString()} icon={DollarSign} color="#F59E0B" />
        <StatCard label="Matches Sent" value={k.matchesSent.toLocaleString()} subtitle="Last 30 days" icon={Handshake} color="#8B5CF6" />
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 mb-5">
        <SectionHeader title="Deal Pipeline" viewAllHref="/deals" router={router} />
        {Object.keys(data.dealPipeline).length > 0 ? (
          <PipelineBar
            statuses={['DRAFT', 'ACTIVE', 'UNDER_OFFER', 'CLOSED', 'CANCELLED', 'EXPIRED']}
            pipeline={data.dealPipeline}
            colors={PIPELINE_COLORS}
            labels={STATUS_LABELS}
            onClick={st => router.push(`/deals?status=${st}`)}
          />
        ) : (
          <EmptyState message="No deals yet." actionLabel="Create your first deal" onAction={() => router.push('/deals/new')} />
        )}
      </div>

      {/* Deal Values by Stage */}
      {data.dealValuesByStage.length > 0 && (
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 mb-5">
          <SectionHeader title="Pipeline Value by Stage" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
            {data.dealValuesByStage
              .filter(d => d.count > 0)
              .sort((a, b) => {
                const order = ['DRAFT', 'ACTIVE', 'UNDER_OFFER', 'CLOSED', 'CANCELLED', 'EXPIRED']
                return order.indexOf(a.status) - order.indexOf(b.status)
              })
              .map(d => (
                <div key={d.status} className="p-3.5 rounded-lg border border-[#EAEAEA]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: PIPELINE_COLORS[d.status] || '#9CA3AF' }} />
                    <span className="text-[0.72rem] font-semibold text-[#4B5563]">{STATUS_LABELS[d.status] || d.status}</span>
                  </div>
                  <div className="text-[1.1rem] font-semibold text-[#0B1224] tracking-tight">{fmtMoney(d.totalValue)}</div>
                  <div className="text-[0.68rem] text-[#9CA3AF] mt-0.5">
                    {d.count} deal{d.count !== 1 ? 's' : ''}
                    {d.totalFees > 0 && ` · ${fmtMoney(d.totalFees)} fees`}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Matches + Recent Deals */}
      <div className="dash-grid-2 grid grid-cols-2 gap-3.5">
        {/* Top Matches */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader
            title="Top Buyer Matches"
            rightSlot={<span className="text-[0.68rem] font-semibold text-green-600">{k.matchesSent} sent (30d)</span>}
          />
          {data.topMatches.length === 0 ? (
            <EmptyState message="No matches yet." />
          ) : (
            <div>
              {data.topMatches.map((match, i) => (
                <div
                  key={match.id}
                  className="dash-row flex items-center justify-between py-2 cursor-pointer"
                  onClick={() => router.push(`/deals/${match.dealId}`)}
                  style={{ borderBottom: i < data.topMatches.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.82rem] font-medium text-[#0B1224]">{bName(match.buyer)}</div>
                    <div className="text-[0.7rem] text-[#9CA3AF] mt-0.5">{match.deal.address}, {match.deal.city}</div>
                  </div>
                  <span className={`text-[0.66rem] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                    match.matchScore >= 80 ? 'text-green-700 bg-green-50' :
                    match.matchScore >= 60 ? 'text-amber-700 bg-amber-50' : 'text-gray-500 bg-gray-50'
                  }`}>
                    {match.matchScore}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Deals */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Recent Deals" viewAllHref="/deals" router={router} />
          {data.recentDeals.length === 0 ? (
            <EmptyState message="No deals yet." actionLabel="Create a deal" onAction={() => router.push('/deals/new')} />
          ) : (
            <div>
              {data.recentDeals.map((deal, i) => (
                <div
                  key={deal.id}
                  className="dash-row flex items-center justify-between py-2 cursor-pointer"
                  onClick={() => router.push(`/deals/${deal.id}`)}
                  style={{ borderBottom: i < data.recentDeals.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.82rem] font-medium text-[#0B1224] truncate">{deal.address}</div>
                    <div className="text-[0.7rem] text-[#9CA3AF] mt-0.5">{deal.city}, {deal.state} &middot; {fmtMoneyFull(deal.askingPrice)}</div>
                  </div>
                  <span className={`${statusBadgeCls(deal.status)} shrink-0 ml-2`}>
                    {STATUS_LABELS[deal.status] || deal.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════
   TAB: OUTREACH & BUYERS
   ══════════════════════════════════════════════ */

function OutreachTab({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const k = data.kpis
  const o = data.outreach

  return (
    <>
      {/* KPI Row */}
      <div className="dash-grid-4 grid grid-cols-4 gap-3.5 mb-5">
        <StatCard
          label="Active Campaigns" value={k.activeCampaigns.toLocaleString()}
          subtitle={`${k.callsToday} calls today`} icon={Activity} color={k.activeCampaigns > 0 ? '#22C55E' : '#9CA3AF'}
          onClick={() => router.push('/outreach')}
        />
        <StatCard label="Calls This Week" value={k.callsThisWeek.toLocaleString()} subtitle={`${k.qualifiedThisWeek} qualified`} icon={Phone} color="#3B82F6" />
        <StatCard
          label="Qualification Rate" value={`${k.qualificationRate}%`}
          subtitle={`Avg ${k.avgCallDuration}s per call`} icon={Target}
          color={k.qualificationRate >= 20 ? '#22C55E' : k.qualificationRate >= 10 ? '#F59E0B' : '#EF4444'}
        />
        <StatCard label="Total Talk Time" value={fmtMinutesAsHours(k.totalCallMinutes)} subtitle={`${k.aiCalls.toLocaleString()} calls all time`} icon={Clock} color="#8B5CF6" />
      </div>

      {/* Sparkline + Buyer Distribution */}
      <div className="dash-grid-2 grid grid-cols-[2fr_1fr] gap-3.5 mb-5">
        {/* 14-Day Calling Trend */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base text-[#0B1224] font-normal" style={{ fontFamily: SERIF }}>14-Day Calling Trend</h3>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[0.68rem] text-[#9CA3AF]">
                <span className="w-2.5 h-0.5 bg-[#9CA3AF] rounded-sm" /> Calls
              </span>
              <span className="flex items-center gap-1 text-[0.68rem] text-[#9CA3AF]">
                <span className="w-2.5 h-0.5 bg-[#22C55E] rounded-sm" /> Qualified
              </span>
            </div>
          </div>
          {o.callsPerDay.some(d => d.total > 0) ? (() => {
            const days = o.callsPerDay
            const maxT = Math.max(...days.map(d => d.total), 1)
            const w = 500, h = 64
            const totalPath = days.map((d, i) => {
              const x = days.length > 1 ? (i / (days.length - 1)) * w : w / 2
              const y = h - (d.total / maxT) * (h - 8) - 4
              return `${i === 0 ? 'M' : 'L'}${x},${y}`
            }).join(' ')
            const qualPath = days.map((d, i) => {
              const x = days.length > 1 ? (i / (days.length - 1)) * w : w / 2
              const y = h - (d.qualified / maxT) * (h - 8) - 4
              return `${i === 0 ? 'M' : 'L'}${x},${y}`
            }).join(' ')
            const totalSum = days.reduce((s, d) => s + d.total, 0)
            const qualSum = days.reduce((s, d) => s + d.qualified, 0)
            return (
              <div className="flex items-center gap-4">
                <svg viewBox={`0 0 ${w} ${h}`} className="flex-1" style={{ height: 64 }} preserveAspectRatio="none">
                  <path d={totalPath} fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={qualPath} fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="shrink-0 text-right">
                  <div className="text-[1.1rem] font-semibold text-[#0B1224] leading-tight">{totalSum}</div>
                  <div className="text-[0.64rem] text-[#9CA3AF]">calls</div>
                  <div className="text-[1.1rem] font-semibold text-[#22C55E] leading-tight mt-1">{qualSum}</div>
                  <div className="text-[0.64rem] text-[#9CA3AF]">qualified</div>
                </div>
              </div>
            )
          })() : <EmptyState message="No calling data yet." compact />}
        </div>

        {/* Buyer Status Distribution */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Buyer Breakdown" />
          {Object.keys(data.buyersByStatus).length > 0 ? (() => {
            const statuses = ['ACTIVE', 'HIGH_CONFIDENCE', 'RECENTLY_VERIFIED', 'DORMANT', 'DO_NOT_CALL']
            const segments = statuses
              .filter(s => data.buyersByStatus[s] > 0)
              .map(s => ({ label: BUYER_STATUS_LABELS[s], value: data.buyersByStatus[s], color: BUYER_STATUS_COLORS[s] }))
            return <DonutChart segments={segments} size={140} showTotal />
          })() : <EmptyState message="No buyers yet." />}
        </div>
      </div>

      {/* Recent Calls + Campaign Performance */}
      <div className="dash-grid-2 grid grid-cols-2 gap-3.5 mb-5">
        {/* Recent Calls */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Recent Calls" viewAllHref="/outreach?tab=calllog" router={router} />
          {o.recentCalls.length === 0 ? (
            <EmptyState message="No calls yet." actionLabel="Launch a campaign" onAction={() => router.push('/outreach')} />
          ) : (
            <div>
              {o.recentCalls.map((call, i) => (
                <div
                  key={call.id}
                  className="dash-row flex items-center justify-between py-2 cursor-pointer"
                  onClick={() => router.push('/outreach')}
                  style={{ borderBottom: i < o.recentCalls.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.82rem] font-medium text-[#0B1224]">{bName(call.buyer)}</div>
                    <div className="text-[0.7rem] text-[#9CA3AF] mt-0.5">{call.campaign.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className={outcomeBadgeCls(call.outcome || '')}>
                      {OUTCOME_LABELS[call.outcome || ''] || call.outcome || 'Pending'}
                    </span>
                    <span className="text-[0.7rem] text-[#4B5563] tabular-nums">{fmtDuration(call.durationSecs)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Campaign Performance" viewAllHref="/outreach" router={router} />
          {o.campaignPerformance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                <PhoneOutgoing className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-sm text-[#9CA3AF] mb-3">No campaigns yet</p>
              <button
                onClick={() => router.push('/outreach')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-[0.78rem] font-semibold cursor-pointer font-[inherit] border-none transition-colors hover:bg-[#1d4ed8]"
              >
                <Play className="w-3.5 h-3.5" /> Launch your first campaign
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {o.campaignPerformance.map(c => {
                const progress = c.totalBuyers > 0 ? (c.callsCompleted / c.totalBuyers) * 100 : 0
                return (
                  <div key={c.id} className="rounded-lg border border-[#EAEAEA] p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[0.8rem] font-medium text-[#0B1224] truncate flex-1">{c.name}</span>
                      <span className={`${statusBadgeCls(c.status)} shrink-0 ml-2 flex items-center gap-1`}>
                        {c.status === 'RUNNING' && <Play className="w-[9px] h-[9px]" />}
                        {c.status}
                      </span>
                    </div>
                    <div className="h-1 bg-[#F3F4F6] rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[0.72rem]">
                      <span className="text-[#4B5563]">{c.callsCompleted}/{c.totalBuyers} &middot; {c.qualified} qualified</span>
                      <span className={`font-semibold ${
                        c.qualificationRate >= 20 ? 'text-green-600' : c.qualificationRate >= 10 ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {c.qualificationRate}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Buyers + Markets */}
      <div className="dash-grid-2 grid grid-cols-2 gap-3.5">
        {/* Top Buyers */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Top Buyers by Score" viewAllHref="/crm" router={router} />
          {data.topBuyers.length === 0 ? (
            <EmptyState message="No scored buyers yet." />
          ) : (
            <div>
              {data.topBuyers.map((buyer, i) => (
                <div
                  key={buyer.id}
                  className="dash-row flex items-center justify-between py-2 cursor-pointer"
                  onClick={() => router.push(`/crm/${buyer.id}`)}
                  style={{ borderBottom: i < data.topBuyers.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.82rem] font-medium text-[#0B1224]">{bName(buyer)}</div>
                    <div className="text-[0.7rem] text-[#9CA3AF] mt-0.5">
                      {buyer.state || 'Unknown'} &middot;{' '}
                      <span style={{ color: BUYER_STATUS_COLORS[buyer.status] || '#9CA3AF' }}>{BUYER_STATUS_LABELS[buyer.status] || buyer.status}</span>
                    </div>
                  </div>
                  <div className={`text-[0.82rem] font-bold tabular-nums shrink-0 ml-2 ${
                    buyer.buyerScore >= 70 ? 'text-green-600' : buyer.buyerScore >= 40 ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {buyer.buyerScore}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Markets */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Buyer Markets" />
          {data.buyersByState.length === 0 ? (
            <EmptyState message="No buyer location data." />
          ) : (() => {
            const maxCount = Math.max(...data.buyersByState.map(s => s.count))
            return (
              <div>
                {data.buyersByState.map((s, i) => (
                  <div key={s.state} className="flex items-center gap-2.5 py-1.5"
                    style={{ borderBottom: i < data.buyersByState.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <span className="text-[0.78rem] font-medium text-[#0B1224] w-8 shrink-0">{s.state}</span>
                    <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-[0.72rem] font-semibold text-[#4B5563] tabular-nums w-7 text-right shrink-0">{s.count}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════
   TAB: CONTRACTS & MARKETPLACE
   ══════════════════════════════════════════════ */

function ContractsTab({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const k = data.kpis

  return (
    <>
      {/* KPI Row */}
      <div className="dash-grid-4 grid grid-cols-4 gap-3.5 mb-5">
        <StatCard
          label="Contracts Pending" value={(k.contractsDraft + k.contractsPending).toLocaleString()}
          subtitle={`${k.contractsDraft} draft, ${k.contractsPending} awaiting`}
          icon={FileSignature} color={(k.contractsDraft + k.contractsPending) > 0 ? '#F59E0B' : '#9CA3AF'}
        />
        <StatCard
          label="Executed" value={k.contractsExecutedThisMonth.toLocaleString()}
          subtitle={`${k.contractsExecuted} all time`} icon={CheckCircle} color="#22C55E"
        />
        <StatCard
          label="Active Listings" value={k.activeListings.toLocaleString()}
          subtitle={`${k.totalListingViews.toLocaleString()} total views`}
          icon={Store} color="#3B82F6"
        />
        <StatCard
          label="New Inquiries" value={k.newInquiries.toLocaleString()}
          icon={MessageSquare} color={k.newInquiries > 0 ? '#8B5CF6' : '#9CA3AF'}
          onClick={() => router.push('/marketplace')}
        />
      </div>

      {/* Contract Pipeline */}
      <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 mb-5">
        <SectionHeader title="Contract Pipeline" viewAllHref="/contracts" router={router} />
        {Object.keys(data.contractPipeline).length > 0 ? (
          <PipelineBar
            statuses={['DRAFT', 'SENT', 'EXECUTED', 'VOIDED']}
            pipeline={data.contractPipeline}
            colors={CONTRACT_PIPELINE_COLORS}
            labels={CONTRACT_LABELS}
            onClick={() => router.push('/contracts')}
          />
        ) : (
          <EmptyState message="No contracts yet." actionLabel="Create a contract" onAction={() => router.push('/contracts')} />
        )}
      </div>

      {/* Contracts + Marketplace */}
      <div className="dash-grid-2 grid grid-cols-2 gap-3.5">
        {/* Recent Contracts */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader
            title="Contracts"
            viewAllHref="/contracts"
            router={router}
            rightSlot={k.contractsPending > 0
              ? <span className={statusBadgeCls('PENDING')}>action needed</span>
              : undefined
            }
          />
          {data.recentContracts.length === 0 ? (
            <EmptyState message="No contracts yet." actionLabel="Create a contract" onAction={() => router.push('/contracts')} />
          ) : (
            <div>
              {data.recentContracts.map((c, i) => {
                const contractBuyer = c.offer?.buyer
                  ? ([c.offer.buyer.firstName, c.offer.buyer.lastName].filter(Boolean).join(' ') || c.offer.buyer.entityName || 'Manual Entry')
                  : 'Manual Entry'
                return (
                  <div
                    key={c.id}
                    className="dash-row flex items-center justify-between py-2 cursor-pointer"
                    onClick={() => router.push('/contracts')}
                    style={{ borderBottom: i < data.recentContracts.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.82rem] font-medium text-[#0B1224] truncate">{c.deal.address}</div>
                      <div className="text-[0.7rem] text-[#9CA3AF] mt-0.5">
                        {contractBuyer} &middot; {c.deal.city}, {c.deal.state}
                        {c.offer?.amount ? ` · ${fmtMoneyFull(c.offer.amount)}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className={statusBadgeCls(c.status)}>{CONTRACT_LABELS[c.status] || c.status}</span>
                      <span className="text-[0.66rem] text-[#9CA3AF]">{timeAgo(c.createdAt)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Marketplace */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 transition-shadow duration-200 hover:shadow-sm">
          <SectionHeader title="Marketplace" viewAllHref="/marketplace" router={router} />
          {k.activeListings > 0 && (
            <div className="flex items-center gap-3.5 mb-3 p-2.5 bg-blue-50/40 rounded-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                  <Store className="w-3 h-3 text-blue-500" />
                </div>
                <span className="text-[0.78rem] font-semibold text-[#0B1224]">{k.activeListings}</span>
                <span className="text-[0.72rem] text-[#9CA3AF]">listing{k.activeListings !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[0.78rem] font-semibold text-[#0B1224]">{k.totalListingViews.toLocaleString()}</span>
                <span className="text-[0.72rem] text-[#9CA3AF]">views</span>
              </div>
            </div>
          )}
          {data.recentInquiries.length > 0 ? (
            <div>
              {data.recentInquiries.map((inq, i) => (
                <div key={inq.id} className="py-2" style={{ borderBottom: i < data.recentInquiries.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.82rem] font-medium text-[#0B1224]">{inq.buyerName}</div>
                      <div className="text-[0.7rem] text-[#9CA3AF] mt-0.5">{inq.listing.address}, {inq.listing.city}</div>
                    </div>
                    <button
                      onClick={() => router.push('/marketplace')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#2563EB] bg-transparent text-[#2563EB] text-[0.68rem] font-semibold cursor-pointer font-[inherit] shrink-0 ml-2 transition-colors hover:bg-blue-50"
                    >
                      Respond
                    </button>
                  </div>
                  {inq.message && (
                    <div className="text-[0.72rem] text-[#4B5563] truncate max-w-[90%]">{inq.message}</div>
                  )}
                  <div className="text-[0.66rem] text-[#9CA3AF] mt-0.5">{timeAgo(inq.createdAt)}</div>
                </div>
              ))}
            </div>
          ) : k.activeListings === 0 ? (
            <EmptyState message="No marketplace listings yet." actionLabel="List your first deal" onAction={() => router.push('/marketplace')} />
          ) : (
            <EmptyState message="No new inquiries." />
          )}
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════
   TAB: ANALYTICS
   ══════════════════════════════════════════════ */

function AnalyticsTab({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const k = data.kpis
  const monthRevenue = data.dailyRevenue.reduce((s, d) => s + d.revenue, 0)
  const hasRevData = data.dailyRevenue.some(d => d.revenue > 0)

  const channels = data.outreach?.outreachByChannel || {}
  const channelTotal = Object.values(channels).reduce((s, v) => s + v, 0)

  return (
    <>
      {/* Revenue Row */}
      <div className="dash-grid-2 grid grid-cols-[2fr_1fr] gap-3.5 mb-5">
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base text-[#0B1224] font-normal" style={{ fontFamily: SERIF }}>Revenue This Month</h3>
              <div className="text-[1.5rem] font-semibold text-[#0B1224] tracking-tight mt-1">
                {fmtMoneyFull(monthRevenue)}
              </div>
            </div>
            {k.totalSpread > 0 && (
              <div className="text-right">
                <div className="text-[0.68rem] text-[#9CA3AF]">All time</div>
                <div className="text-base font-semibold text-[#0B1224]">{fmtMoney(k.totalSpread)}</div>
              </div>
            )}
          </div>
          {hasRevData ? (
            <LineChart
              data={data.dailyRevenue.slice(-14).map(d => ({ label: fmtShortDate(d.date), value: d.revenue }))}
              height={140}
              color="#22C55E"
              areaColor="#22C55E"
              showGrid
            />
          ) : (
            <EmptyState message="No revenue data for this month yet." compact />
          )}
        </div>

        {/* Channel Breakdown */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-5">
          <SectionHeader title="Outreach Channels" />
          {channelTotal > 0 ? (
            <DonutChart
              segments={Object.entries(channels).map(([ch, count]) => ({
                label: CHANNEL_LABELS[ch] || ch,
                value: count,
                color: CHANNEL_COLORS[ch] || '#9CA3AF',
              }))}
              size={130}
              showTotal
            />
          ) : (
            <EmptyState message="No outreach data yet." />
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="dash-grid-4 grid grid-cols-4 gap-3.5 mb-5">
        <StatCard label="Total Spread" value={fmtMoney(k.totalSpread)} icon={DollarSign} color="#22C55E" />
        <StatCard label="Deals Closed" value={k.closedDeals.toLocaleString()} icon={CheckCircle} color="#3B82F6" />
        <StatCard label="Fees Collected" value={fmtMoney(k.totalFeesCollected)} icon={DollarSign} color="#8B5CF6" />
        <StatCard label="Contracts Executed" value={k.contractsExecuted.toLocaleString()} icon={FileSignature} color="#22C55E" />
      </div>

      {/* Platform Performance (merged Outreach + Marketplace) */}
      <div className="bg-white rounded-xl border border-[#EAEAEA] p-5">
        <SectionHeader title="Platform Performance" />
        <div className="dash-grid-2 grid grid-cols-2 gap-8">
          {/* Outreach column */}
          <div>
            <div className="text-[0.72rem] font-semibold tracking-[0.04em] uppercase text-[#9CA3AF] mb-3">Outreach</div>
            {[
              { label: 'Total Calls', value: k.aiCalls.toLocaleString() },
              { label: 'This Week', value: k.callsThisWeek.toLocaleString() },
              { label: 'Qualification Rate', value: `${k.qualificationRate}%` },
              { label: 'Avg Duration', value: `${k.avgCallDuration}s` },
              { label: 'Talk Time', value: fmtMinutesAsHours(k.totalCallMinutes) },
              { label: 'Qualified', value: k.qualifiedThisWeek.toLocaleString() },
            ].map((s, i, arr) => (
              <div key={s.label} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}>
                <span className="text-[0.82rem] text-[#4B5563]">{s.label}</span>
                <span className="text-[0.82rem] font-semibold text-[#0B1224] tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
          {/* Marketplace column */}
          <div>
            <div className="text-[0.72rem] font-semibold tracking-[0.04em] uppercase text-[#9CA3AF] mb-3">Marketplace</div>
            {[
              { label: 'Active Listings', value: k.activeListings.toLocaleString() },
              { label: 'Total Views', value: k.totalListingViews.toLocaleString() },
              { label: 'New Inquiries', value: k.newInquiries.toLocaleString() },
              { label: 'Matches Sent', value: k.matchesSent.toLocaleString() },
            ].map((s, i, arr) => (
              <div key={s.label} className={`flex items-center justify-between py-2.5 ${i < arr.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}>
                <span className="text-[0.82rem] text-[#4B5563]">{s.label}</span>
                <span className="text-[0.82rem] font-semibold text-[#0B1224] tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════ */

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showToast = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null)

  const tabParam = searchParams.get('tab') as TabKey | null
  const activeTab = TABS.find(t => t.key === tabParam)?.key || 'overview'

  const setTab = useCallback((key: TabKey) => {
    const url = key === 'overview' ? '/dashboard' : `/dashboard?tab=${key}`
    router.push(url)
  }, [router])

  const fetchDashboard = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch('/api/dashboard')
      .then(r => {
        if (!r.ok) return r.json().then(e => { throw new Error(e.detail || e.error || `HTTP ${r.status}`) })
        return r.json()
      })
      .then(d => {
        if (d.kpis) {
          setData({
            firstName: d.firstName || null,
            kpis: d.kpis,
            recentActivity: d.recentActivity || [],
            recentDeals: d.recentDeals || [],
            topMatches: d.topMatches || [],
            pendingOffersList: d.pendingOffersList || [],
            dealPipeline: d.dealPipeline || {},
            contractPipeline: d.contractPipeline || {},
            recentContracts: d.recentContracts || [],
            recentInquiries: d.recentInquiries || [],
            outreach: d.outreach || { recentCalls: [], campaignPerformance: [], callsPerDay: [], outreachByChannel: {}, outreachEvents: [] },
            buyersByStatus: d.buyersByStatus || {},
            buyersByState: d.buyersByState || [],
            dailyRevenue: d.dailyRevenue || [],
            dealValuesByStage: d.dealValuesByStage || [],
            topBuyers: d.topBuyers || [],
            overdueCallbacks: d.overdueCallbacks || 0,
            unreadSmsCount: d.unreadSmsCount || 0,
          })
        } else {
          setError(d.error || 'Unexpected response format')
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  async function handleOfferAction(offerId: string, action: 'ACCEPTED' | 'REJECTED') {
    setOfferActionLoading(offerId)
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        showToast(d.error || 'Action failed')
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

  return (
    <div className="px-9 py-7 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[1.5rem] font-normal text-[#0B1224] tracking-[-0.022em] leading-[1.15] mb-1" style={{ fontFamily: SERIF }}>
          {data?.firstName ? `${getGreeting()}, ${data.firstName}` : 'Dashboard'}
        </h1>
        <p className="text-[0.84rem] text-[#4B5563] leading-normal">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Alert badges */}
      {data && <AlertBadges data={data} router={router} />}

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-[#F0F0F0] mb-6 overflow-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`dash-tab flex items-center gap-1.5 px-[18px] py-2.5 border-none cursor-pointer bg-transparent font-[inherit] text-[0.8rem] whitespace-nowrap transition-colors duration-150 -mb-px ${
                isActive
                  ? 'font-semibold text-[#2563EB] border-b-2 border-b-[#2563EB]'
                  : 'font-medium text-[#9CA3AF] border-b-2 border-b-transparent hover:text-[#2563EB]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Loading skeleton */}
      {loading && !data && (
        <div>
          <div className="dash-grid-4 grid grid-cols-4 gap-3.5 mb-5">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
          <div className="bg-white rounded-xl border border-[#EAEAEA] p-5 mb-5">
            <Skeleton height={10} width="20%" className="mb-4" />
            <Skeleton height={10} width="100%" className="rounded-full" />
          </div>
          <div className="dash-grid-2 grid grid-cols-2 gap-3.5">
            <div className="bg-white rounded-xl border border-[#EAEAEA] p-5">
              <Skeleton height={10} width="30%" className="mb-4" />
              <div className="flex flex-col gap-3">
                <Skeleton height={14} width="85%" />
                <Skeleton height={14} width="70%" />
                <Skeleton height={14} width="90%" />
                <Skeleton height={14} width="60%" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#EAEAEA] p-5">
              <Skeleton height={10} width="30%" className="mb-4" />
              <div className="flex flex-col gap-3">
                <Skeleton height={14} width="80%" />
                <Skeleton height={14} width="65%" />
                <Skeleton height={14} width="75%" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !data && (
        <div className="bg-white rounded-xl border border-[#EAEAEA] text-center py-10 px-5">
          <AlertTriangle className="w-7 h-7 text-amber-500 mx-auto mb-3" />
          <div className="text-[0.9rem] font-semibold text-[#0B1224] mb-1.5">Failed to load dashboard</div>
          <div className="text-[0.78rem] text-[#9CA3AF] mb-4">{error}</div>
          <button
            onClick={fetchDashboard}
            className="px-5 py-2 rounded-lg bg-[#2563EB] text-white text-[0.78rem] font-semibold cursor-pointer font-[inherit] border-none transition-colors hover:bg-[#1d4ed8]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tab content */}
      {data && (
        <>
          {activeTab === 'overview' && (
            <OverviewTab data={data} router={router} onOfferAction={handleOfferAction} offerLoading={offerActionLoading} />
          )}
          {activeTab === 'deals' && <DealsTab data={data} router={router} />}
          {activeTab === 'outreach' && <OutreachTab data={data} router={router} />}
          {activeTab === 'contracts' && <ContractsTab data={data} router={router} />}
          {activeTab === 'analytics' && <AnalyticsTab data={data} router={router} />}
        </>
      )}

      <style>{`
        .dash-row { transition: background 0.1s; }
        .dash-row:hover { background: rgba(5,14,36,0.015); }
        @media (max-width: 1000px) {
          .dash-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .dash-grid-4 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
