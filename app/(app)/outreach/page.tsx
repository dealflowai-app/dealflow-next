'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Phone, Mail, MessageSquare, Layers, Play, Pause, CheckCircle2,
  ArrowLeft, X, ChevronDown, Copy, User, Sparkles, Calendar, PhoneOff,
  Voicemail, Ban, FileText, ChevronRight, AlertCircle, RotateCcw,
  PhoneCall, Clock, TrendingUp, Loader2, Radio, Trash2, XCircle,
  Filter, Mic, Settings2, Shield, Eye, Zap, Bookmark, Compass,
  RefreshCw, Repeat, ShieldCheck, LayoutTemplate, UserPlus,
  Headphones, PhoneOff as PhoneEndIcon, Send, Volume2, Activity,
} from 'lucide-react'
import CallDetailPanel from '@/components/outreach/CallDetailPanel'
import type { CallData, BuyerData, CampaignData as CDPCampaignData } from '@/components/outreach/CallDetailPanel'
import type { ParsedTranscript } from '@/lib/outreach/transcript-processor'
import PowerDialer from '@/components/outreach/PowerDialer'
import type { DialerBuyer } from '@/components/outreach/PowerDialer'
import ClickToCall from '@/components/outreach/ClickToCall'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */
type SubTab = 'campaigns' | 'calllog' | 'analytics' | 'callbacks' | 'voicemails' | 'inbound' | 'sms' | 'live'
type StatusFilter = 'ALL' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'DRAFT' | 'CANCELLED'
type SortOption = 'newest' | 'oldest' | 'name'

interface Campaign {
  id: string
  name: string
  market: string
  status: string
  mode: string
  channel: string
  totalBuyers: number
  callsCompleted: number
  qualified: number
  notBuying: number
  noAnswer: number
  totalTalkTime: number
  estimatedCost: number
  actualCost: number
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  connectionRate: number
  qualificationRate: number
}

interface CampaignDetailData {
  campaign: Campaign & Record<string, unknown>
  calls: DetailCall[]
  stats: {
    total: number; completed: number; pending: number; qualified: number
    connectionRate: number; qualificationRate: number
    avgCallDuration: number; totalTalkTime: number; costSoFar: number
  }
  outcomeGroups: Record<string, number>
}

interface DetailCall {
  id: string
  phoneNumber: string
  outcome: string | null
  durationSecs: number | null
  aiSummary: string | null
  recordingUrl?: string | null
  attemptNumber: number
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  buyer: {
    id: string
    firstName: string | null
    lastName: string | null
    entityName: string | null
    phone: string | null
    status: string
    buyerScore: number | null
  }
}

interface CallLogEntry {
  id: string
  campaignId: string | null
  channel: string | null
  isManual: boolean
  phoneNumber: string
  outcome: string | null
  durationSecs: number | null
  recordingUrl: string | null
  aiSummary: string | null
  attemptNumber: number
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  campaign: { id: string; name: string; market: string } | null
  buyer: {
    id: string
    firstName: string | null
    lastName: string | null
    entityName: string | null
    phone: string | null
    status: string
    buyerScore: number | null
  }
  buyerName: string
  campaignName: string
}

interface TranscriptSearchResult {
  call: {
    id: string; buyerId: string; outcome: string | null; durationSecs: number | null
    createdAt: string; buyerName: string; campaignName: string
  }
  snippets: string[]
  matchCount: number
}

interface AudiencePreview {
  totalMatched: number
  totalAfterDNC: number
  removedDNC: number
  removedNoPhone: number
  removedNoEmail: number
  estimatedCost: { voice: number; sms: number; email: number }
  topBuyers: { id: string; name: string; buyerScore: number | null; status: string }[]
}

interface ScheduledCallbackEntry {
  id: string
  buyerId: string
  campaignId: string | null
  scheduledAt: string
  reason: string
  source: string
  status: string
  notes: string | null
  completedAt: string | null
  createdAt: string
  withinCallingHours: boolean
  buyer: {
    id: string
    firstName: string | null
    lastName: string | null
    entityName: string | null
    phone: string | null
    email: string | null
    state: string | null
    buyerScore: number | null
  }
}

interface ToastData { id: number; message: string; type: 'success' | 'error' | 'info' }

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS & FORMATTERS
   ═══════════════════════════════════════════════════════════════════════════ */
const CHANNEL_CONFIG: Record<string, { icon: typeof Phone; label: string; color: string }> = {
  VOICE: { icon: Phone, label: 'Voice', color: 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]' },
  SMS: { icon: MessageSquare, label: 'SMS', color: 'text-violet-600 bg-violet-50' },
  EMAIL: { icon: Mail, label: 'Email', color: 'text-blue-600 bg-blue-50' },
  MULTI_CHANNEL: { icon: Layers, label: 'Multi', color: 'text-amber-600 bg-amber-50' },
}

function channelBadge(ch: string) {
  const cfg = CHANNEL_CONFIG[ch] || CHANNEL_CONFIG.VOICE
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  )
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    DRAFT: 'text-gray-600 bg-gray-100',
    RUNNING: 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]',
    PAUSED: 'text-[#F59E0B] bg-[rgba(245,158,11,0.08)]',
    COMPLETED: 'text-[rgba(5,14,36,0.5)] bg-[rgba(5,14,36,0.04)]',
    CANCELLED: 'text-[#EF4444] bg-[rgba(239,68,68,0.06)]',
  }
  return map[s] || 'text-gray-600 bg-gray-100'
}

function outcomeBadge(o: string | null) {
  if (!o) return 'text-gray-400 bg-gray-50'
  const map: Record<string, string> = {
    QUALIFIED: 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]',
    NOT_BUYING: 'text-gray-600 bg-gray-100',
    NO_ANSWER: 'text-amber-600 bg-amber-50',
    VOICEMAIL: 'text-violet-600 bg-violet-50',
    WRONG_NUMBER: 'text-rose-600 bg-rose-50',
    DO_NOT_CALL: 'text-red-700 bg-red-50',
    CALLBACK_REQUESTED: 'text-purple-600 bg-purple-50',
  }
  return map[o] || 'text-gray-500 bg-gray-100'
}

const OUTCOME_LABELS: Record<string, string> = {
  QUALIFIED: 'Qualified', NOT_BUYING: 'Not Buying', NO_ANSWER: 'No Answer',
  VOICEMAIL: 'Voicemail', WRONG_NUMBER: 'Wrong Number', DO_NOT_CALL: 'DNC',
  CALLBACK_REQUESTED: 'Callback', PENDING: 'Pending',
}

const OUTCOME_COLORS: Record<string, string> = {
  QUALIFIED: 'bg-[#2563EB]', NOT_BUYING: 'bg-gray-400', NO_ANSWER: 'bg-amber-400',
  VOICEMAIL: 'bg-violet-300', WRONG_NUMBER: 'bg-rose-400', DO_NOT_CALL: 'bg-red-500',
  CALLBACK_REQUESTED: 'bg-purple-400', PENDING: 'bg-gray-200',
}

function formatDuration(secs: number | null): string {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function buyerDisplayName(b: { firstName?: string | null; lastName?: string | null; entityName?: string | null }): string {
  return b.entityName || [b.firstName, b.lastName].filter(Boolean).join(' ') || 'Unknown'
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/* ═══════════════════════════════════════════════════════════════════════════
   SKELETONS
   ═══════════════════════════════════════════════════════════════════════════ */
function CampaignSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-5 py-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-4 bg-gray-200 rounded w-56" />
            <div className="h-5 bg-gray-100 rounded-full w-16" />
            <div className="h-5 bg-gray-100 rounded-full w-14" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-80 mb-3" />
          <div className="h-1.5 bg-gray-100 rounded-full w-full mb-3" />
          <div className="flex gap-6">
            {[1, 2, 3, 4, 5].map(j => <div key={j} className="h-3 bg-gray-100 rounded w-20" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden">
      <div className="border-b border-[#F3F4F6] px-4 py-3">
        <div className="flex gap-4">{[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-3 bg-gray-100 rounded w-20" />)}</div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-[#F3F4F6] animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-3 bg-gray-100 rounded w-24" />
            <div className="h-3 bg-gray-100 rounded w-36" />
            <div className="h-3 bg-gray-200 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-24" />
            <div className="h-3 bg-gray-100 rounded w-12" />
            <div className="h-5 bg-gray-100 rounded-full w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOAST SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */
let toastId = 0
function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-[8px] shadow-lg text-[0.82rem] font-medium animate-fadeInUp ${
            t.type === 'success' ? 'bg-[#2563EB] text-white'
            : t.type === 'error' ? 'bg-red-600 text-white'
            : 'bg-gray-800 text-white'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4" />}
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100 bg-transparent border-0 text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAMPAIGN LIST
   ═══════════════════════════════════════════════════════════════════════════ */
function CampaignList({
  campaigns, loading, error, statusFilter, setStatusFilter, sort, setSort,
  onViewDetail, onAction, onRetry, onNewCampaign,
}: {
  campaigns: Campaign[]; loading: boolean; error: string | null
  statusFilter: StatusFilter; setStatusFilter: (s: StatusFilter) => void
  sort: SortOption; setSort: (s: SortOption) => void
  onViewDetail: (c: Campaign) => void
  onAction: (id: string, action: string) => void
  onRetry: () => void
  onNewCampaign: () => void
}) {
  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'ALL', label: 'All' }, { key: 'RUNNING', label: 'Running' },
    { key: 'PAUSED', label: 'Paused' }, { key: 'COMPLETED', label: 'Completed' },
    { key: 'DRAFT', label: 'Draft' },
  ]

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-[8px] px-6 py-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-[0.88rem] text-gray-700 mb-1">Failed to load campaigns</p>
        <p className="text-[0.78rem] text-gray-400 mb-3">{error}</p>
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-[0.82rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer">
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-[14px] cursor-pointer transition-colors ${
                statusFilter === tab.key
                  ? 'font-semibold border border-[#2563EB] text-[#2563EB] bg-[rgba(37,99,235,0.06)]'
                  : 'font-normal border border-[rgba(5,14,36,0.06)] text-[rgba(5,14,36,0.45)] bg-transparent hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="appearance-none bg-white border border-[#D1D5DB] rounded-md pl-3 pr-8 py-1.5 text-[0.78rem] text-[#374151] outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? <CampaignSkeleton /> : campaigns.length === 0 ? (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-6 py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <LayoutTemplate className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-[0.9rem] text-gray-700 font-medium mb-1">No campaigns yet</p>
          <p className="text-[0.78rem] text-gray-400 mb-5">Get started with a pre-built playbook or create your own campaign.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-left">
            {[
              { icon: Compass, name: 'New Market Entry', desc: 'Find and qualify cash buyers in a new market', cat: 'qualification' },
              { icon: Zap, name: 'Deal Blast', desc: 'Blast a hot deal to your best buyers', cat: 'deal_alert' },
              { icon: RefreshCw, name: 'Dormant Reactivation', desc: 'Re-engage buyers who went cold', cat: 'reactivation' },
            ].map(t => (
              <button
                key={t.name}
                onClick={onNewCampaign}
                className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-4 py-3.5 hover:border-[#BFDBFE] hover:bg-[#F9FAFB] cursor-pointer transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-[8px] bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center mb-2 transition-colors">
                  <t.icon className="w-4 h-4 text-gray-400 group-hover:text-[#2563EB] transition-colors" />
                </div>
                <div className="text-[0.82rem] font-medium text-[#374151] group-hover:text-[#1E3A8A] mb-0.5 transition-colors">{t.name}</div>
                <div className="text-[0.72rem] text-gray-400">{t.desc}</div>
              </button>
            ))}
          </div>

          <button
            onClick={onNewCampaign}
            className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Browse all templates
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const pct = c.totalBuyers > 0 ? Math.round((c.callsCompleted / c.totalBuyers) * 100) : 0
            const avgDur = c.callsCompleted > 0 ? Math.round(c.totalTalkTime / c.callsCompleted) : 0
            return (
              <div key={c.id} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-[24px] py-[20px] hover:bg-[#F9FAFB] transition-colors">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-semibold text-[#0B1224]">{c.name}</h3>
                    <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${statusBadge(c.status)} ${c.status === 'RUNNING' ? 'flex items-center gap-1' : ''}`}>
                      {c.status === 'RUNNING' && <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />}
                      {c.status}
                    </span>
                    {channelBadge(c.channel)}
                    {c.market && <span className="text-[0.68rem] text-gray-400">{c.market}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.status === 'DRAFT' && (
                      <>
                        <button onClick={() => onAction(c.id, 'launch')} className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[0.76rem] font-medium text-[#2563EB] hover:bg-[rgba(37,99,235,0.08)] bg-transparent border-0 cursor-pointer transition-colors">
                          <Play className="w-3.5 h-3.5" /> Launch
                        </button>
                        <button onClick={() => onAction(c.id, 'delete')} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[0.76rem] font-medium text-red-400 hover:bg-red-50 bg-transparent border-0 cursor-pointer transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {c.status === 'RUNNING' && (
                      <button onClick={() => onAction(c.id, 'pause')} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-amber-600 hover:bg-amber-50 bg-transparent border-0 cursor-pointer transition-colors">
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </button>
                    )}
                    {c.status === 'PAUSED' && (
                      <>
                        <button onClick={() => onAction(c.id, 'resume')} className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[0.76rem] font-medium text-[#2563EB] hover:bg-[rgba(37,99,235,0.08)] bg-transparent border-0 cursor-pointer transition-colors">
                          <Play className="w-3.5 h-3.5" /> Resume
                        </button>
                        <button onClick={() => onAction(c.id, 'cancel')} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[0.76rem] font-medium text-red-400 hover:bg-red-50 bg-transparent border-0 cursor-pointer transition-colors">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onViewDetail(c)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-[#2563EB] hover:bg-[#EFF6FF] bg-transparent border-0 cursor-pointer transition-colors"
                    >
                      {c.status === 'COMPLETED' || c.status === 'CANCELLED' ? 'View Results' : 'View Details'}
                    </button>
                    <button onClick={() => onAction(c.id, 'duplicate')} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-600 bg-transparent border-0 cursor-pointer transition-colors" title="Duplicate">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-normal text-[rgba(5,14,36,0.4)]">{c.callsCompleted} / {c.totalBuyers} contacts</span>
                    <span className="text-[12px] font-medium text-[rgba(5,14,36,0.65)]">{pct}%</span>
                  </div>
                  <div className="w-full h-[6px] bg-[rgba(5,14,36,0.06)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-[#2563EB]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Metrics row */}
                <div className="flex items-center gap-4 text-[14px] flex-wrap">
                  <span className="text-[rgba(5,14,36,0.5)]">Connect: <strong className="text-[rgba(5,14,36,0.65)]">{c.connectionRate}%</strong></span>
                  <span className="text-[rgba(5,14,36,0.5)]">Qualification: <strong className="text-[rgba(5,14,36,0.65)]">{c.qualificationRate}%</strong></span>
                  <span className="text-[rgba(5,14,36,0.5)]">Qualified: <strong className="text-[#2563EB]">{c.qualified}</strong></span>
                  <span className="text-gray-500">No Answer: <strong className="text-gray-600">{c.noAnswer}</strong></span>
                  {avgDur > 0 && <span className="text-gray-500">Avg: <strong className="text-gray-700">{formatDuration(avgDur)}</strong></span>}
                  <span className="text-gray-400 ml-auto text-[0.72rem]">
                    {formatDate(c.startedAt || c.createdAt)}
                    {c.completedAt ? ` → ${formatDate(c.completedAt)}` : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CAMPAIGN DETAIL VIEW (slide-in panel)
   ═══════════════════════════════════════════════════════════════════════════ */
function CampaignDetailView({
  campaignId, onBack, onOpenCall, onPowerDial, onAction, addToast,
}: {
  campaignId: string
  onBack: () => void
  onOpenCall: (callId: string) => void
  onPowerDial: (buyers: DialerBuyer[], campaignId: string) => void
  onAction: (id: string, action: string) => void
  addToast: (msg: string, type: ToastData['type']) => void
}) {
  const [data, setData] = useState<CampaignDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Campaign-level analytics
  const [campAnalytics, setCampAnalytics] = useState<{
    outcomeTimeline: { date: string; qualified: number; notBuying: number; noAnswer: number; voicemail: number; other: number }[]
    bestTimeSlots: { hour: number; label: string; totalCalls: number; connectionRate: number; qualificationRate: number }[]
    buyerInsights: { avgQualifiedScore: number; strategyBreakdown: Record<string, number>; propertyTypeBreakdown: Record<string, number> }
    costAnalysis: { actualCost: number; costPerCall: number; costPerQualified: number; totalMinutes: number }
  } | null>(null)
  const [campAnalyticsLoading, setCampAnalyticsLoading] = useState(false)

  const fetchDetail = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/outreach/campaigns/${campaignId}`)
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e: unknown) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load campaign')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [campaignId])

  // Fetch campaign analytics
  useEffect(() => {
    setCampAnalyticsLoading(true)
    fetch(`/api/outreach/campaigns/${campaignId}/analytics`)
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json) setCampAnalytics(json) })
      .catch(() => {})
      .finally(() => setCampAnalyticsLoading(false))
  }, [campaignId])

  // Initial fetch
  useEffect(() => { fetchDetail() }, [fetchDetail])

  // Auto-refresh for RUNNING campaigns
  useEffect(() => {
    if (data?.campaign.status === 'RUNNING') {
      pollRef.current = setInterval(() => fetchDetail(true), 10000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [data?.campaign.status, fetchDetail])

  if (loading) return (
    <div className="animate-fadeInUp">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 mb-4 bg-transparent border-0 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>
      <CampaignSkeleton />
    </div>
  )

  if (error || !data) return (
    <div className="animate-fadeInUp">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 mb-4 bg-transparent border-0 cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>
      <div className="bg-white border border-red-200 rounded-[8px] px-6 py-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-[0.82rem] text-gray-600">{error || 'Campaign not found'}</p>
        <button onClick={() => fetchDetail()} className="mt-2 text-[0.78rem] text-[#2563EB] bg-transparent border-0 cursor-pointer">Retry</button>
      </div>
    </div>
  )

  const { campaign: c, calls, stats, outcomeGroups } = data
  const filteredCalls = outcomeFilter === 'ALL'
    ? calls
    : outcomeFilter === 'PENDING'
      ? calls.filter(cl => !cl.outcome)
      : calls.filter(cl => cl.outcome === outcomeFilter)

  // Outcome bar segments
  const totalOutcomes = Object.values(outcomeGroups).reduce((a, b) => a + b, 0) || 1
  const barSegments = Object.entries(outcomeGroups)
    .filter(([, v]) => v > 0)
    .map(([key, val]) => ({
      key,
      label: OUTCOME_LABELS[key] || key,
      pct: Math.round((val / totalOutcomes) * 100),
      count: val,
      color: OUTCOME_COLORS[key] || 'bg-gray-300',
    }))

  // Unreached buyers for power dialer
  const unreachedBuyers: DialerBuyer[] = calls
    .filter(cl => !cl.outcome || cl.outcome === 'NO_ANSWER')
    .map(cl => ({
      id: cl.buyer.id,
      name: buyerDisplayName(cl.buyer),
      phone: cl.phoneNumber || cl.buyer.phone || '',
      score: cl.buyer.buyerScore || 0,
      status: cl.buyer.status || 'ACTIVE',
    }))
    .filter(b => b.phone)

  const metrics = [
    { label: 'Total', value: stats.total, cls: '' },
    { label: 'Completed', value: stats.completed, cls: '' },
    { label: 'Qualified', value: stats.qualified, cls: 'text-[#2563EB]' },
    { label: 'Not Buying', value: outcomeGroups['NOT_BUYING'] || 0, cls: '' },
    { label: 'No Answer', value: outcomeGroups['NO_ANSWER'] || 0, cls: '' },
    { label: 'Callbacks', value: outcomeGroups['CALLBACK_REQUESTED'] || 0, cls: '' },
    { label: 'Connect Rate', value: `${stats.connectionRate}%`, cls: '' },
    { label: 'Qual Rate', value: `${stats.qualificationRate}%`, cls: 'text-[#2563EB]' },
  ]

  return (
    <div className="animate-fadeInUp">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 mb-4 bg-transparent border-0 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="text-[24px] font-bold text-[#0B1224] tracking-[-0.02em]">{c.name}</h2>
          <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${statusBadge(c.status)} ${c.status === 'RUNNING' ? 'flex items-center gap-1' : ''}`}>
            {c.status === 'RUNNING' && <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />}
            {c.status}
          </span>
          {channelBadge(c.channel as string)}
          {c.market && <span className="text-[0.76rem] text-[rgba(5,14,36,0.4)]">{c.market as string}</span>}
        </div>
        <div className="flex items-center gap-2">
          {c.status === 'RUNNING' && (
            <button onClick={() => onAction(c.id, 'pause')} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-amber-600 hover:bg-amber-50 bg-transparent border-0 cursor-pointer transition-colors">
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}
          {c.status === 'PAUSED' && (
            <button onClick={() => onAction(c.id, 'resume')} className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[0.76rem] font-medium text-[#2563EB] hover:bg-[rgba(37,99,235,0.08)] bg-transparent border-0 cursor-pointer transition-colors">
              <Play className="w-3.5 h-3.5" /> Resume
            </button>
          )}
          {unreachedBuyers.length > 0 && (
            <button
              onClick={() => onPowerDial(unreachedBuyers, c.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[0.76rem] font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] border-0 cursor-pointer transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> Power Dial Remaining ({unreachedBuyers.length})
            </button>
          )}
          <button
            disabled={savingTemplate}
            onClick={async () => {
              setSavingTemplate(true)
              try {
                const res = await fetch('/api/outreach/templates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: `${c.name} Template`,
                    description: `Saved from campaign "${c.name}" (${c.market})`,
                    channel: c.channel,
                    category: 'custom',
                    scriptTemplate: (c as any).scriptTemplate || null,
                    settings: {
                      maxConcurrentCalls: (c as any).maxConcurrentCalls || 5,
                      callingHoursStart: (c as any).callingHoursStart || '09:00',
                      callingHoursEnd: (c as any).callingHoursEnd || '19:00',
                      timezone: (c as any).timezone || 'America/New_York',
                      leaveVoicemail: (c as any).leaveVoicemail ?? true,
                      maxRetries: (c as any).maxRetries ?? 2,
                      retryDelayHours: (c as any).retryDelayHours ?? 24,
                    },
                  }),
                })
                if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed') }
                addToast('Campaign saved as template!', 'success')
              } catch (e: unknown) {
                addToast(e instanceof Error ? e.message : 'Failed to save template', 'error')
              } finally {
                setSavingTemplate(false)
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[0.76rem] font-medium text-violet-600 hover:bg-violet-50 bg-transparent border-0 cursor-pointer transition-colors disabled:opacity-50"
          >
            {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />} Save as Template
          </button>
          {c.status === 'RUNNING' && (
            <span className="flex items-center gap-1.5 text-[0.72rem] text-[#2563EB]">
              <Radio className="w-3 h-3 animate-pulse" /> Live
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[0.78rem] text-gray-500">{stats.completed} of {stats.total} contacted</span>
          <span className="text-[0.78rem] font-medium text-gray-700">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
        </div>
        <div className="w-full h-[6px] bg-[rgba(5,14,36,0.06)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-[#2563EB]"
            style={{ width: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-3 mb-5 outreach-metrics">
        {metrics.map(m => (
          <div key={m.label} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-4 py-3 text-center">
            <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-1.5">{m.label}</div>
            <div className={`text-[1.3rem] font-medium leading-none ${m.cls || 'text-[#0B1224]'}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Outcome breakdown bar */}
      {barSegments.length > 0 && (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-5 py-4 mb-5">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-3">Outcome Breakdown</div>
          <div className="flex w-full h-4 rounded-full overflow-hidden mb-3">
            {barSegments.map(s => (
              <div key={s.key} className={`${s.color} h-full`} style={{ width: `${s.pct}%` }} title={`${s.label}: ${s.count} (${s.pct}%)`} />
            ))}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {barSegments.map(s => (
              <div key={s.key} className="flex items-center gap-1.5 text-[0.72rem] text-gray-500">
                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                {s.label} ({s.count})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact list */}
      <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em]">Campaign Contacts ({filteredCalls.length})</span>
          <div className="flex items-center gap-1">
            {['ALL', 'QUALIFIED', 'NOT_BUYING', 'NO_ANSWER', 'VOICEMAIL', 'CALLBACK_REQUESTED', 'PENDING'].map(o => (
              <button
                key={o}
                onClick={() => setOutcomeFilter(o)}
                className={`px-2 py-1 rounded-full text-[0.68rem] cursor-pointer transition-colors ${
                  outcomeFilter === o ? 'font-semibold border border-[#2563EB] text-[#2563EB] bg-[rgba(37,99,235,0.06)]' : 'font-normal border border-[rgba(5,14,36,0.06)] text-[rgba(5,14,36,0.45)] bg-transparent hover:bg-gray-50'
                }`}
              >
                {o === 'ALL' ? 'All' : OUTCOME_LABELS[o] || o}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[rgba(5,14,36,0.06)]">
                <th className="text-left px-5 py-2.5 text-[11px] uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] font-semibold">Buyer</th>
                <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] font-semibold">Phone</th>
                <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] font-semibold">Outcome</th>
                <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] font-semibold">Duration</th>
                <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] font-semibold">Attempt</th>
                <th className="text-left px-3 py-2.5 text-[11px] uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] font-semibold">Time</th>
                <th className="text-right px-5 py-2.5 text-[11px] uppercase tracking-[0.05em] text-[rgba(5,14,36,0.4)] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalls.map((r, i) => {
                const name = buyerDisplayName(r.buyer)
                return (
                  <tr key={r.id} className={`${i < filteredCalls.length - 1 ? 'border-b border-[#F3F4F6]' : ''} hover:bg-[#F9FAFB] transition-colors`}>
                    <td className="px-5 py-2.5">
                      <Link href={`/crm/${r.buyer.id}`} className="text-[0.82rem] text-[#374151] font-medium hover:text-[#2563EB] transition-colors no-underline">
                        {name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-[0.78rem] text-gray-500">{r.phoneNumber}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${outcomeBadge(r.outcome)}`}>
                        {r.outcome ? (OUTCOME_LABELS[r.outcome] || r.outcome) : 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[0.78rem] text-gray-500 font-mono">{formatDuration(r.durationSecs)}</td>
                    <td className="px-3 py-2.5 text-[0.78rem] text-gray-400">#{r.attemptNumber}</td>
                    <td className="px-3 py-2.5 text-[0.78rem] text-[#9CA3AF]">{formatDateTime(r.startedAt || r.createdAt)}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {r.outcome && (
                          <button
                            onClick={() => onOpenCall(r.id)}
                            className="p-1 rounded-md text-gray-400 hover:text-[#2563EB] hover:bg-[#EFF6FF] bg-transparent border-0 cursor-pointer transition-colors"
                            title="View call detail"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ClickToCall
                          buyerId={r.buyer.id}
                          buyerName={name}
                          phone={r.phoneNumber || r.buyer.phone || ''}
                          campaignId={campaignId}
                          compact
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Analytics Section */}
      {campAnalyticsLoading ? (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-6 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-40 mb-4" />
          <div className="h-32 bg-gray-50 rounded" />
        </div>
      ) : campAnalytics ? (
        <div className="space-y-4">
          {/* Outcome timeline */}
          {campAnalytics.outcomeTimeline.length > 1 && (
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-5">
              <div className="text-[0.82rem] font-medium text-gray-900 mb-3">Outcome Timeline</div>
              {(() => {
                const tl = campAnalytics.outcomeTimeline
                const maxVal = Math.max(...tl.map(d => d.qualified + d.notBuying + d.noAnswer + d.voicemail + d.other), 1)
                return (
                  <div className="flex items-end gap-1 h-28">
                    {tl.map((d, i) => {
                      const total = d.qualified + d.notBuying + d.noAnswer + d.voicemail + d.other
                      const h = (total / maxVal) * 100
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.date}: ${total} calls`}>
                          <div className="w-full flex flex-col-reverse rounded-sm overflow-hidden" style={{ height: `${Math.max(h, 4)}%` }}>
                            {d.qualified > 0 && <div className="bg-[#2563EB]" style={{ height: `${(d.qualified / total) * 100}%` }} />}
                            {d.notBuying > 0 && <div className="bg-gray-400" style={{ height: `${(d.notBuying / total) * 100}%` }} />}
                            {d.noAnswer > 0 && <div className="bg-amber-400" style={{ height: `${(d.noAnswer / total) * 100}%` }} />}
                            {d.voicemail > 0 && <div className="bg-violet-300" style={{ height: `${(d.voicemail / total) * 100}%` }} />}
                            {d.other > 0 && <div className="bg-gray-200" style={{ height: `${(d.other / total) * 100}%` }} />}
                          </div>
                          {i % Math.max(1, Math.floor(tl.length / 6)) === 0 && (
                            <span className="text-[0.55rem] text-gray-300 whitespace-nowrap">{d.date.slice(5)}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Best time slots + Buyer insights side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Best time slots */}
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-5">
              <div className="text-[0.82rem] font-medium text-gray-900 mb-3">Best Time Slots</div>
              <div className="space-y-1.5">
                {campAnalytics.bestTimeSlots
                  .filter(s => s.totalCalls > 0)
                  .sort((a, b) => b.connectionRate - a.connectionRate)
                  .slice(0, 8)
                  .map(slot => (
                    <div key={slot.hour} className="flex items-center gap-2">
                      <span className="text-[0.72rem] text-gray-500 w-12">{slot.label}</span>
                      <div className="flex-1 h-4 bg-gray-50 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded"
                          style={{ width: `${slot.connectionRate}%` }}
                        />
                      </div>
                      <span className="text-[0.68rem] text-gray-600 w-16 text-right">{slot.connectionRate}% conn</span>
                      <span className="text-[0.68rem] text-gray-400 w-12 text-right">{slot.totalCalls} calls</span>
                    </div>
                  ))}
                {campAnalytics.bestTimeSlots.filter(s => s.totalCalls > 0).length === 0 && (
                  <div className="text-[0.78rem] text-gray-400 py-4 text-center">No call data yet</div>
                )}
              </div>
            </div>

            {/* Buyer insights */}
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-5">
              <div className="text-[0.82rem] font-medium text-gray-900 mb-3">Buyer Insights</div>
              {campAnalytics.buyerInsights.avgQualifiedScore > 0 && (
                <div className="mb-3">
                  <span className="text-[0.72rem] text-gray-400">Avg Score (Qualified)</span>
                  <div className="text-[1.1rem] font-semibold text-gray-900">{campAnalytics.buyerInsights.avgQualifiedScore}</div>
                </div>
              )}
              {Object.keys(campAnalytics.buyerInsights.strategyBreakdown).length > 0 && (
                <div className="mb-3">
                  <span className="text-[0.72rem] text-gray-400 block mb-1">Strategy Breakdown</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(campAnalytics.buyerInsights.strategyBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([strategy, count]) => (
                        <span key={strategy} className="text-[0.68rem] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {strategy} ({count})
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {Object.keys(campAnalytics.buyerInsights.propertyTypeBreakdown).length > 0 && (
                <div>
                  <span className="text-[0.72rem] text-gray-400 block mb-1">Property Types</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(campAnalytics.buyerInsights.propertyTypeBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([pt, count]) => (
                        <span key={pt} className="text-[0.68rem] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                          {pt} ({count})
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {campAnalytics.buyerInsights.avgQualifiedScore === 0 && Object.keys(campAnalytics.buyerInsights.strategyBreakdown).length === 0 && (
                <div className="text-[0.78rem] text-gray-400 py-4 text-center">No buyer insights yet</div>
              )}
            </div>
          </div>

          {/* Cost analysis */}
          {campAnalytics.costAnalysis.totalMinutes > 0 && (
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-5">
              <div className="text-[0.82rem] font-medium text-gray-900 mb-3">Cost Analysis</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[0.72rem] text-gray-400">Total Cost</div>
                  <div className="text-[1rem] font-semibold text-gray-900">${campAnalytics.costAnalysis.actualCost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[0.72rem] text-gray-400">Per Call</div>
                  <div className="text-[1rem] font-semibold text-gray-900">${campAnalytics.costAnalysis.costPerCall.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[0.72rem] text-gray-400">Per Qualified</div>
                  <div className="text-[1rem] font-semibold text-[#2563EB]">${campAnalytics.costAnalysis.costPerQualified.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[0.72rem] text-gray-400">Total Minutes</div>
                  <div className="text-[1rem] font-semibold text-gray-900">{campAnalytics.costAnalysis.totalMinutes}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALL LOG TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function CallLogTab({
  campaigns, onOpenCall, addToast,
}: {
  campaigns: Campaign[]
  onOpenCall: (callId: string) => void
  addToast: (msg: string, type: ToastData['type']) => void
}) {
  const [calls, setCalls] = useState<CallLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [offset, setOffset] = useState(0)
  const LIMIT = 20

  // Transcript search mode
  const [transcriptMode, setTranscriptMode] = useState(false)
  const [txQuery, setTxQuery] = useState('')
  const debouncedTx = useDebounce(txQuery, 500)
  const [txResults, setTxResults] = useState<TranscriptSearchResult[]>([])
  const [txLoading, setTxLoading] = useState(false)

  const fetchCalls = useCallback(async (append = false) => {
    if (!append) { setLoading(true); setOffset(0) }
    else setLoadingMore(true)
    try {
      const params = new URLSearchParams()
      if (outcomeFilter) params.set('outcome', outcomeFilter)
      if (campaignFilter) params.set('campaignId', campaignFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('limit', String(LIMIT))
      params.set('offset', String(append ? offset + LIMIT : 0))

      const res = await fetch(`/api/outreach/calls?${params}`)
      if (!res.ok) throw new Error('Failed to load calls')
      const json = await res.json()
      if (append) {
        setCalls(prev => [...prev, ...json.calls])
        setOffset(prev => prev + LIMIT)
      } else {
        setCalls(json.calls)
        setOffset(0)
      }
      setTotal(json.total)
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load calls')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [outcomeFilter, campaignFilter, dateFrom, dateTo, debouncedSearch, offset])

  // Fetch on mount and filter change
  useEffect(() => { fetchCalls() }, [outcomeFilter, campaignFilter, dateFrom, dateTo, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // Transcript search
  useEffect(() => {
    if (!transcriptMode || debouncedTx.length < 2) { setTxResults([]); return }
    setTxLoading(true)
    fetch(`/api/outreach/calls/search?q=${encodeURIComponent(debouncedTx)}`)
      .then(r => r.json())
      .then(json => setTxResults(json.results || []))
      .catch(() => addToast('Transcript search failed', 'error'))
      .finally(() => setTxLoading(false))
  }, [debouncedTx, transcriptMode, addToast])

  if (error && !loading) {
    return (
      <div className="bg-white border border-red-200 rounded-[8px] px-6 py-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-[0.82rem] text-gray-600 mb-2">{error}</p>
        <button onClick={() => fetchCalls()} className="text-[0.78rem] text-[#2563EB] bg-transparent border-0 cursor-pointer inline-flex items-center gap-1">
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)}
            className="appearance-none bg-white border border-[#D1D5DB] rounded-md pl-3 pr-8 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] cursor-pointer">
            <option value="">All Outcomes</option>
            {Object.entries(OUTCOME_LABELS).filter(([k]) => k !== 'PENDING').map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
            className="appearance-none bg-white border border-[#D1D5DB] rounded-md pl-3 pr-8 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] cursor-pointer max-w-[200px]">
            <option value="">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-white border border-[#D1D5DB] rounded-md pl-9 pr-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] w-[150px]" />
        </div>
        <span className="text-sm text-[#9CA3AF]">to</span>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-white border border-[#D1D5DB] rounded-md pl-9 pr-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] w-[150px]" />
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text" placeholder="Search buyer name..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="bg-white border border-[#D1D5DB] rounded-md pl-9 pr-3 py-2 text-[0.8rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] w-[200px]"
          />
        </div>
      </div>

      {/* Transcript search toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setTranscriptMode(!transcriptMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.78rem] font-medium border cursor-pointer transition-colors ${
            transcriptMode ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#D1D5DB] bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Mic className="w-3.5 h-3.5" /> Search Transcripts
        </button>
        {transcriptMode && (
          <div className="relative flex-1 max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text" placeholder="Search transcript content..."
              value={txQuery} onChange={e => setTxQuery(e.target.value)}
              className="w-full bg-white border border-[#D1D5DB] rounded-md pl-9 pr-3 py-2 text-[0.8rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB]"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Transcript search results */}
      {transcriptMode && debouncedTx.length >= 2 && (
        <div className="mb-4 space-y-2">
          {txLoading ? (
            <div className="flex items-center gap-2 text-[0.78rem] text-gray-400 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching transcripts...
            </div>
          ) : txResults.length === 0 ? (
            <div className="text-[0.78rem] text-gray-400 py-4 text-center">No transcript matches found</div>
          ) : (
            txResults.map(r => (
              <button
                key={r.call.id}
                onClick={() => onOpenCall(r.call.id)}
                className="w-full text-left bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-4 py-3 hover:bg-[#F9FAFB] cursor-pointer transition-colors block"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[0.82rem] font-medium text-[#374151]">{r.call.buyerName}</span>
                  {r.call.campaignName && <span className="text-[0.72rem] text-gray-400">· {r.call.campaignName}</span>}
                  <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${outcomeBadge(r.call.outcome)}`}>
                    {r.call.outcome ? (OUTCOME_LABELS[r.call.outcome] || r.call.outcome) : '—'}
                  </span>
                  <span className="text-[0.72rem] text-gray-400 ml-auto">{r.matchCount} matches</span>
                </div>
                {r.snippets.map((s, i) => (
                  <p key={i} className="text-[0.76rem] text-gray-500 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: s.replace(
                        new RegExp(`(${debouncedTx.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                        '<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">$1</mark>'
                      ),
                    }}
                  />
                ))}
              </button>
            ))
          )}
        </div>
      )}

      {/* Call log table */}
      {loading ? <TableSkeleton /> : (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#F3F4F6]">
                  {['Date / Time', 'Campaign', 'Buyer Name', 'Phone', 'Ch', 'Duration', 'Outcome', ''].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-xs uppercase tracking-wider text-[#6B7280] font-medium ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[0.82rem] text-gray-400">No calls found</td></tr>
                ) : calls.map((r, i) => (
                  <tr key={r.id} className={`${i < calls.length - 1 ? 'border-b border-[#F3F4F6]' : ''} hover:bg-[#F9FAFB] transition-colors cursor-pointer`}
                    onClick={() => onOpenCall(r.id)}>
                    <td className="px-4 py-2.5 text-[0.78rem] text-[#9CA3AF] whitespace-nowrap">{formatDateTime(r.startedAt || r.createdAt)}</td>
                    <td className="px-4 py-2.5 text-[0.78rem] text-[#374151] max-w-[180px] truncate">
                      {r.campaignName || (r.isManual ? 'Manual Call' : '—')}
                    </td>
                    <td className="px-4 py-2.5 text-[0.82rem] text-[#374151] font-medium whitespace-nowrap">{r.buyerName}</td>
                    <td className="px-4 py-2.5 text-[0.78rem] text-gray-500 whitespace-nowrap">{r.phoneNumber}</td>
                    <td className="px-4 py-2.5">
                      {r.channel === 'sms' || r.channel === 'SMS' ? <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                        : r.channel === 'email' || r.channel === 'EMAIL' ? <Mail className="w-3.5 h-3.5 text-blue-500" />
                        : <Phone className="w-3.5 h-3.5 text-[#2563EB]" />}
                    </td>
                    <td className="px-4 py-2.5 text-[0.78rem] text-gray-500 font-mono">{formatDuration(r.durationSecs)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${outcomeBadge(r.outcome)}`}>
                        {r.outcome ? (OUTCOME_LABELS[r.outcome] || r.outcome) : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {r.recordingUrl && (
                          <button className="p-1 rounded-md text-gray-400 hover:text-[#2563EB] hover:bg-[#EFF6FF] bg-transparent border-0 cursor-pointer transition-colors" title="Has recording"
                            onClick={() => onOpenCall(r.id)}>
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ClickToCall
                          buyerId={r.buyer.id}
                          buyerName={r.buyerName}
                          phone={r.phoneNumber || r.buyer.phone || ''}
                          campaignId={r.campaignId || undefined}
                          compact
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Load more */}
          {calls.length < total && (
            <div className="px-4 py-3 border-t border-[#F3F4F6] text-center">
              <button
                onClick={() => fetchCalls(true)}
                disabled={loadingMore}
                className="text-[0.78rem] font-medium text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
              >
                {loadingMore ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</> : `Load more (${total - calls.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALL DETAIL SLIDE-OVER
   ═══════════════════════════════════════════════════════════════════════════ */
function CallDetailSlideOver({
  callId, onClose, addToast,
}: {
  callId: string; onClose: () => void; addToast: (msg: string, type: ToastData['type']) => void
}) {
  const [callData, setCallData] = useState<CallData | null>(null)
  const [transcript, setTranscript] = useState<ParsedTranscript | null>(null)
  const [rawTranscript, setRawTranscript] = useState<string | null>(null)
  const [buyer, setBuyer] = useState<BuyerData | null>(null)
  const [campaign, setCampaign] = useState<CDPCampaignData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/outreach/calls/${callId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(json => {
        setCallData(json.call)
        setTranscript(json.transcript)
        setRawTranscript(json.rawTranscript)
        setBuyer(json.buyer ? {
          ...json.buyer,
          displayName: json.buyer.displayName || buyerDisplayName(json.buyer),
          buyerScore: json.buyer.buyerScore ?? 0,
          preferredTypes: json.buyer.preferredTypes || [],
          preferredMarkets: json.buyer.preferredMarkets || [],
        } : null)
        setCampaign(json.campaign || null)
      })
      .catch(() => addToast('Failed to load call details', 'error'))
      .finally(() => setLoading(false))
  }, [callId, addToast])

  const handleSave = async (data: { outcome?: string; aiSummary?: string; extractedData?: Record<string, unknown> }) => {
    const res = await fetch(`/api/outreach/calls/${callId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed to save')
    addToast('Call updated', 'success')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className="relative w-[560px] h-full bg-white border-l border-[rgba(5,14,36,0.06)] overflow-y-auto outreach-slide-panel animate-slideInRight">
        <div className="px-5 py-3 border-b border-[#F3F4F6] flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-[0.94rem] font-medium text-[#111827]">Call Detail</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer border-0 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : callData && buyer && campaign ? (
            <CallDetailPanel
              call={callData}
              transcript={transcript}
              rawTranscript={rawTranscript}
              buyer={buyer}
              campaign={campaign}
              onSave={handleSave}
              onViewBuyer={(id) => { window.location.href = `/crm/${id}` }}
            />
          ) : (
            <div className="text-center py-10 text-gray-400 text-[0.82rem]">Could not load call data</div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) { .outreach-slide-panel { width: 100% !important; } }
      ` }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   NEW CAMPAIGN MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
interface TemplateItem {
  id: string; name: string; description: string | null; category: string
  icon: string | null; channel: string; scriptTemplate: string | null
  smsTemplateId: string | null; emailSequenceId: string | null
  audienceFilter: Record<string, unknown> | null
  settings: Record<string, unknown> | null
  multiChannelConfig: Record<string, unknown> | null
  estimatedDuration: string | null; bestFor: string | null; expectedResults: string | null
  source: 'system' | 'user'; useCount: number; profileId: string | null
}

const TEMPLATE_ICONS: Record<string, typeof Compass> = {
  compass: Compass, zap: Zap, 'refresh-cw': RefreshCw, repeat: Repeat,
  'shield-check': ShieldCheck, 'message-square': MessageSquare, mail: Mail,
}

function NewCampaignModal({
  onClose, onCreated, addToast, preselectedContactIds,
}: {
  onClose: () => void
  onCreated: (c: Campaign) => void
  addToast: (msg: string, type: ToastData['type']) => void
  preselectedContactIds?: string[]
}) {
  const [step, setStep] = useState(0) // Step 0 = template browser
  const [submitting, setSubmitting] = useState(false)

  // Template browser
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [templateCategory, setTemplateCategory] = useState('all')

  // Step 1: Setup
  const [name, setName] = useState('')
  const [channel, setChannel] = useState<string>('VOICE')
  const [market, setMarket] = useState('')

  // Step 2: Audience
  const [audienceMode, setAudienceMode] = useState<'filter' | 'contacts'>(
    (preselectedContactIds && preselectedContactIds.length > 0) ? 'contacts' : 'filter'
  )
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(preselectedContactIds ?? [])
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<Array<{ id: string; firstName: string | null; lastName: string | null; entityName: string | null; phone: string | null; email: string | null; contactType: string | null }>>([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [audienceFilter, setAudienceFilter] = useState({
    statuses: [] as string[],
    minScore: 0,
    maxScore: 100,
    market: '',
    propertyTypes: [] as string[],
    strategies: [] as string[],
    excludeRecentlyContacted: null as number | null,
  })
  const [preview, setPreview] = useState<AudiencePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Step 3: Script & Settings
  const [scriptTemplate, setScriptTemplate] = useState('standard_qualification')
  const [customScript, setCustomScript] = useState('')
  const [showScriptPreview, setShowScriptPreview] = useState(false)
  const scriptRef = useRef<HTMLTextAreaElement>(null)
  const [companyName, setCompanyName] = useState('')
  const [agentName, setAgentName] = useState('')
  const [maxConcurrent, setMaxConcurrent] = useState(5)
  const [callHoursStart, setCallHoursStart] = useState('09:00')
  const [callHoursEnd, setCallHoursEnd] = useState('19:00')
  const [timezone, setTimezone] = useState('America/New_York')
  const [leaveVoicemail, setLeaveVoicemail] = useState(true)
  const [voicemailRecordingId, setVoicemailRecordingId] = useState('')
  const [voicemailOptions, setVoicemailOptions] = useState<{ id: string; name: string; category: string; source: string; estimatedDuration: number | null }[]>([])
  const [maxRetries, setMaxRetries] = useState(2)
  const [retryDelayHours, setRetryDelayHours] = useState(24)

  // Step 4: Scheduling
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState('')

  const steps = ['Choose Template', 'Campaign Setup', 'Select Audience', 'Script & Settings', 'Review & Launch']

  // Contact picker search
  useEffect(() => {
    if (audienceMode !== 'contacts' || step !== 2) return
    setContactsLoading(true)
    const params = new URLSearchParams()
    if (contactSearch) params.set('search', contactSearch)
    params.set('limit', '100')
    fetch(`/api/crm/buyers?${params}`)
      .then(r => r.json())
      .then(data => setContactResults(data.buyers ?? []))
      .catch(() => {})
      .finally(() => setContactsLoading(false))
  }, [contactSearch, audienceMode, step])

  // Fetch templates + voicemail options on mount
  useEffect(() => {
    fetch('/api/outreach/templates')
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.templates) setTemplates(json.templates) })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false))

    fetch('/api/outreach/voicemails')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.data?.voicemails) {
          setVoicemailOptions(json.data.voicemails.map((v: any) => ({
            id: v.id, name: v.name, category: v.category, source: v.source,
            estimatedDuration: v.estimatedDuration || v.duration,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const applyTemplate = (t: TemplateItem) => {
    setName(t.name)
    setChannel(t.channel)
    if (t.scriptTemplate) setScriptTemplate(t.scriptTemplate)
    const s = t.settings as Record<string, unknown> | null
    if (s) {
      if (typeof s.maxConcurrentCalls === 'number') setMaxConcurrent(s.maxConcurrentCalls)
      if (typeof s.callingHoursStart === 'string') setCallHoursStart(s.callingHoursStart)
      if (typeof s.callingHoursEnd === 'string') setCallHoursEnd(s.callingHoursEnd)
      if (typeof s.timezone === 'string') setTimezone(s.timezone)
      if (typeof s.leaveVoicemail === 'boolean') setLeaveVoicemail(s.leaveVoicemail)
      if (typeof s.maxRetries === 'number') setMaxRetries(s.maxRetries)
      if (typeof s.retryDelayHours === 'number') setRetryDelayHours(s.retryDelayHours)
    }
    const af = t.audienceFilter as Record<string, unknown> | null
    if (af) {
      setAudienceFilter(prev => ({
        ...prev,
        statuses: Array.isArray(af.statuses) ? af.statuses as string[] : prev.statuses,
        minScore: typeof af.minScore === 'number' ? af.minScore : prev.minScore,
        maxScore: typeof af.maxScore === 'number' ? af.maxScore : prev.maxScore,
      }))
    }
    setStep(1)
  }

  const filteredTemplates = templateCategory === 'all'
    ? templates
    : templates.filter(t => t.category === templateCategory)

  const CATEGORIES = [
    { key: 'all', label: 'All' }, { key: 'qualification', label: 'Qualification' },
    { key: 'deal_alert', label: 'Deal Alert' }, { key: 'reactivation', label: 'Reactivation' },
    { key: 'follow_up', label: 'Follow-Up' }, { key: 'verification', label: 'Verification' },
    { key: 'custom', label: 'Custom' },
  ]

  // Audience preview with debounce
  const filterKey = JSON.stringify(audienceFilter)
  const debouncedFilterKey = useDebounce(filterKey, 500)

  useEffect(() => {
    if (step !== 2) return
    const f = JSON.parse(debouncedFilterKey)
    const hasFilter = f.statuses.length > 0 || f.market || f.propertyTypes.length > 0 || f.strategies.length > 0 || f.minScore > 0 || f.maxScore < 100 || f.excludeRecentlyContacted
    if (!hasFilter) { setPreview(null); return }

    setPreviewLoading(true)
    const channelMap: Record<string, string> = { VOICE: 'voice', SMS: 'sms', EMAIL: 'email', MULTI_CHANNEL: 'voice' }
    const filter: Record<string, unknown> = {}
    if (f.statuses.length) filter.statuses = f.statuses
    if (f.minScore > 0) filter.minScore = f.minScore
    if (f.maxScore < 100) filter.maxScore = f.maxScore
    if (f.market) filter.markets = [f.market]
    if (f.propertyTypes.length) filter.propertyTypes = f.propertyTypes
    if (f.strategies.length) filter.strategies = f.strategies
    if (f.excludeRecentlyContacted) filter.excludeRecentlyContacted = f.excludeRecentlyContacted

    fetch('/api/outreach/audience-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter, channel: channelMap[channel] || 'voice' }),
    })
      .then(r => r.json())
      .then(json => {
        if (json.error) setPreview(null)
        else setPreview(json)
      })
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false))
  }, [debouncedFilterKey, step, channel])

  const channelCostKey = channel === 'VOICE' ? 'voice' : channel === 'SMS' ? 'sms' : channel === 'EMAIL' ? 'email' : 'voice'

  const handleCreate = async (launch: boolean) => {
    setSubmitting(true)
    try {
      const filter: Record<string, unknown> = {}
      if (audienceFilter.statuses.length) filter.statuses = audienceFilter.statuses
      if (audienceFilter.minScore > 0) filter.minScore = audienceFilter.minScore
      if (audienceFilter.maxScore < 100) filter.maxScore = audienceFilter.maxScore
      if (audienceFilter.market) filter.markets = [audienceFilter.market]
      if (audienceFilter.propertyTypes.length) filter.propertyTypes = audienceFilter.propertyTypes
      if (audienceFilter.strategies.length) filter.strategies = audienceFilter.strategies
      if (audienceFilter.excludeRecentlyContacted) filter.excludeRecentlyContacted = audienceFilter.excludeRecentlyContacted

      const payload: Record<string, unknown> = {
        name, market, mode: 'AI', channel,
        audienceFilter: audienceMode === 'contacts' ? { contactIds: selectedContactIds } : filter,
        scriptTemplate,
        customScript: customScript || undefined,
        companyName: companyName || undefined,
        agentName: agentName || undefined,
        maxConcurrentCalls: maxConcurrent,
        callingHoursStart: callHoursStart,
        callingHoursEnd: callHoursEnd,
        timezone, leaveVoicemail, maxRetries, retryDelayHours,
        ...(voicemailRecordingId ? { voicemailRecordingId } : {}),
        ...(scheduleType === 'later' && scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
      }

      const createRes = await fetch('/api/outreach/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error || 'Failed to create campaign')
      }
      const { campaign } = await createRes.json()

      if (launch) {
        const launchRes = await fetch(`/api/outreach/campaigns/${campaign.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'RUNNING' }),
        })
        if (!launchRes.ok) throw new Error('Campaign created but failed to launch')
        addToast(`Campaign launched! ${preview?.totalAfterDNC || campaign.totalBuyers} buyers will be contacted.`, 'success')
      } else {
        addToast('Campaign saved as draft', 'success')
      }

      onCreated(campaign)
      onClose()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to create campaign', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const canProceedStep1 = name.trim() && market.trim()
  const canProceedStep2 = audienceMode === 'contacts'
    ? selectedContactIds.length > 0
    : preview && (preview.totalAfterDNC || 0) > 0

  const typeOptions = [
    { key: 'VOICE', icon: Phone, label: 'AI Voice', desc: 'AI-powered voice calls to your buyer list' },
    { key: 'SMS', icon: MessageSquare, label: 'SMS', desc: 'Automated text message sequences' },
    { key: 'EMAIL', icon: Mail, label: 'Email', desc: 'Personalized email drip campaigns' },
    { key: 'MULTI_CHANNEL', icon: Layers, label: 'Multi-Channel', desc: 'Combine voice, SMS, and email' },
  ]

  const SCRIPT_TEMPLATES = [
    { key: 'standard_qualification', label: 'Standard Qualification', desc: 'General buyer qualification covering property types, buy box, and timeline' },
    { key: 'deal_alert', label: 'Deal Alert', desc: 'Notify buyers about a specific property opportunity' },
    { key: 'reactivation', label: 'Reactivation', desc: 'Re-engage dormant buyers who haven\'t been active' },
    { key: 'follow_up', label: 'Follow-Up', desc: 'Follow up on a previous conversation or interest' },
    { key: 'proof_of_funds', label: 'Proof of Funds', desc: 'Verify buyer\'s ability to close, including funding source and timeline' },
    { key: 'seller_introduction', label: 'Seller Introduction', desc: 'First contact with property owners about selling' },
    { key: 'seller_follow_up', label: 'Seller Follow-Up', desc: 'Follow up with sellers you\'ve previously spoken to' },
    { key: 'warm_lead', label: 'Warm Lead', desc: 'Qualify inbound leads who expressed interest' },
  ]

  const STATUSES = ['ACTIVE', 'HIGH_CONFIDENCE', 'RECENTLY_VERIFIED', 'DORMANT', 'NEW_LEAD']
  const PROPERTY_TYPES = ['SFR', 'Multi-Family', 'Commercial', 'Vacant Land', 'Townhouse', 'Condo']
  const STRATEGIES = ['Flip', 'Buy & Hold', 'Wholesale', 'BRRRR', 'Rental']
  const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[8px] border border-[rgba(5,14,36,0.06)] w-[640px] max-h-[85vh] overflow-y-auto outreach-modal">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
          <h2 style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} className="text-[24px] font-bold text-[#0B1224] tracking-[-0.02em]">{step === 0 ? 'Choose a Template' : 'New Campaign'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer border-0 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-4 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.68rem] font-bold flex-shrink-0 ${
                  i <= step ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-400'
                }`}>{i + 1}</div>
                <span className={`text-[0.72rem] whitespace-nowrap ${i <= step ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{s}</span>
                {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Step 0: Choose Template */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 flex-wrap mb-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setTemplateCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-full text-[0.72rem] cursor-pointer transition-colors ${
                      templateCategory === cat.key ? 'font-semibold border border-[#2563EB] text-[#2563EB] bg-[rgba(37,99,235,0.06)]' : 'font-normal border border-[rgba(5,14,36,0.06)] text-[rgba(5,14,36,0.45)] bg-transparent hover:bg-gray-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {templatesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-4 py-4 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded w-40 mb-2" />
                      <div className="h-3 bg-gray-50 rounded w-64" />
                    </div>
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-[0.82rem] text-gray-400">No templates in this category</div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {filteredTemplates.map(t => {
                    const IconComp = (t.icon && TEMPLATE_ICONS[t.icon]) || LayoutTemplate
                    return (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className="w-full text-left bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-4 py-3.5 hover:bg-[#F9FAFB] hover:border-[#BFDBFE] cursor-pointer transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-[8px] bg-gray-100 group-hover:bg-blue-50 flex items-center justify-center flex-shrink-0 transition-colors">
                            <IconComp className="w-4 h-4 text-gray-500 group-hover:text-[#2563EB] transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[0.84rem] font-medium text-[#374151] group-hover:text-[#1E3A8A] transition-colors">{t.name}</span>
                              {channelBadge(t.channel)}
                              {t.source === 'user' && (
                                <span className="text-[0.6rem] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full">Custom</span>
                              )}
                            </div>
                            <div className="text-[0.74rem] text-gray-400">{t.description}</div>
                            {(t.bestFor || t.expectedResults) && (
                              <div className="flex items-center gap-3 mt-1.5 text-[0.68rem] text-gray-400">
                                {t.bestFor && <span>{t.bestFor}</span>}
                                {t.estimatedDuration && <span className="text-gray-300">|</span>}
                                {t.estimatedDuration && <span>{t.estimatedDuration}</span>}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#2563EB] mt-1 flex-shrink-0 transition-colors" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => setStep(1)}
                className="w-full text-center py-3 text-[0.82rem] text-gray-500 hover:text-[#2563EB] bg-transparent border border-dashed border-[#D1D5DB] hover:border-[#2563EB] rounded-[8px] cursor-pointer transition-colors"
              >
                Start from scratch
              </button>
            </div>
          )}

          {/* Step 1: Campaign Setup */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-[0.78rem] text-gray-600 mb-1.5 block font-medium">Campaign Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Phoenix Cash Buyers: March"
                  className="w-full bg-white border border-[#D1D5DB] rounded-md px-4 py-2.5 text-[0.84rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] transition-colors" />
              </div>
              <div>
                <label className="text-[0.78rem] text-gray-600 mb-2 block font-medium">Campaign Type</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {typeOptions.map(t => {
                    const Icon = t.icon
                    const selected = channel === t.key
                    return (
                      <button key={t.key} onClick={() => setChannel(t.key)}
                        className={`flex items-start gap-3 px-4 py-3.5 rounded-[8px] border text-left cursor-pointer transition-all ${
                          selected ? 'border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#BFDBFE]' : 'border-[rgba(5,14,36,0.06)] bg-white hover:bg-[#F9FAFB]'
                        }`}>
                        <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#2563EB]' : 'bg-gray-100'}`}>
                          <Icon className={`w-4 h-4 ${selected ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <div>
                          <div className={`text-[0.82rem] font-medium ${selected ? 'text-[#1E3A8A]' : 'text-[#374151]'}`}>{t.label}</div>
                          <div className="text-[0.72rem] text-gray-400">{t.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-[0.78rem] text-gray-600 mb-1.5 block font-medium">Target Market</label>
                <input type="text" value={market} onChange={e => setMarket(e.target.value)} placeholder="e.g., Phoenix, AZ"
                  className="w-full bg-white border border-[#D1D5DB] rounded-md px-4 py-2.5 text-[0.84rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] transition-colors" />
              </div>
            </div>
          )}

          {/* Step 2: Select Audience */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Audience mode toggle */}
              <div className="flex items-center gap-1 bg-[rgba(5,14,36,0.03)] rounded-[8px] p-0.5 w-fit">
                <button onClick={() => setAudienceMode('filter')}
                  className={`px-3 py-1.5 rounded-[7px] text-[0.76rem] font-medium border-0 cursor-pointer transition-all ${
                    audienceMode === 'filter' ? 'bg-white text-[#0B1224] shadow-sm' : 'bg-transparent text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.6)]'
                  }`}>
                  Filter Audience
                </button>
                <button onClick={() => setAudienceMode('contacts')}
                  className={`px-3 py-1.5 rounded-[7px] text-[0.76rem] font-medium border-0 cursor-pointer transition-all ${
                    audienceMode === 'contacts' ? 'bg-white text-[#0B1224] shadow-sm' : 'bg-transparent text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.6)]'
                  }`}>
                  Pick Contacts {selectedContactIds.length > 0 && `(${selectedContactIds.length})`}
                </button>
              </div>

              {/* Contact picker mode */}
              {audienceMode === 'contacts' && (
                <div className="border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden">
                  <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50/50">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..."
                      className="flex-1 bg-transparent border-0 outline-none text-[0.82rem]" />
                  </div>
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[0.74rem] text-gray-500">{selectedContactIds.length} contacts selected</span>
                    {selectedContactIds.length > 0 && (
                      <button onClick={() => setSelectedContactIds([])} className="text-[0.72rem] text-red-500 bg-transparent border-0 cursor-pointer">Clear all</button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                    {contactsLoading ? (
                      <div className="flex items-center justify-center py-8 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : contactResults.length === 0 ? (
                      <div className="text-center py-8 text-[0.82rem] text-gray-400">No contacts found</div>
                    ) : contactResults.map(c => {
                      const isSelected = selectedContactIds.includes(c.id)
                      const cName = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.entityName || 'Unknown'
                      return (
                        <label key={c.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                          <input type="checkbox" checked={isSelected}
                            onChange={() => {
                              if (isSelected) setSelectedContactIds(prev => prev.filter(id => id !== c.id))
                              else setSelectedContactIds(prev => [...prev, c.id])
                            }}
                            className="accent-[#2563EB] w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[0.82rem] font-medium text-[#0B1224] truncate">{cName}</div>
                            <div className="text-[0.7rem] text-gray-400 truncate">{c.phone ?? 'No phone'} · {c.email ?? 'No email'}</div>
                          </div>
                          {c.contactType && (
                            <span className={`text-[0.62rem] font-medium px-1.5 py-0.5 rounded-full ${
                              c.contactType === 'BUYER' ? 'bg-blue-50 text-blue-600' : c.contactType === 'SELLER' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'
                            }`}>{c.contactType}</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Filter mode */}
              {audienceMode === 'filter' && (
              <>
              <div>
                <label className="text-[0.78rem] text-gray-600 mb-2 block font-medium">Buyer Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <button key={s}
                      onClick={() => {
                        const next = audienceFilter.statuses.includes(s) ? audienceFilter.statuses.filter(x => x !== s) : [...audienceFilter.statuses, s]
                        setAudienceFilter({ ...audienceFilter, statuses: next })
                      }}
                      className={`px-3 py-1.5 rounded-md text-[0.76rem] font-medium border cursor-pointer transition-colors ${
                        audienceFilter.statuses.includes(s) ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#D1D5DB] bg-white text-gray-500 hover:bg-gray-50'
                      }`}>
                      {s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[0.76rem] text-gray-500 mb-1 block">Min Score</label>
                  <input type="number" min={0} max={100} value={audienceFilter.minScore}
                    onChange={e => setAudienceFilter({ ...audienceFilter, minScore: Number(e.target.value) })}
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB]" />
                </div>
                <div>
                  <label className="text-[0.76rem] text-gray-500 mb-1 block">Max Score</label>
                  <input type="number" min={0} max={100} value={audienceFilter.maxScore}
                    onChange={e => setAudienceFilter({ ...audienceFilter, maxScore: Number(e.target.value) })}
                    className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB]" />
                </div>
              </div>
              <div>
                <label className="text-[0.76rem] text-gray-500 mb-1 block">Market (optional)</label>
                <input type="text" value={audienceFilter.market} placeholder="e.g., Phoenix"
                  onChange={e => setAudienceFilter({ ...audienceFilter, market: e.target.value })}
                  className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB] placeholder-gray-400" />
              </div>
              <div>
                <label className="text-[0.78rem] text-gray-600 mb-2 block font-medium">Property Types</label>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map(pt => (
                    <button key={pt}
                      onClick={() => {
                        const next = audienceFilter.propertyTypes.includes(pt) ? audienceFilter.propertyTypes.filter(x => x !== pt) : [...audienceFilter.propertyTypes, pt]
                        setAudienceFilter({ ...audienceFilter, propertyTypes: next })
                      }}
                      className={`px-3 py-1.5 rounded-md text-[0.76rem] font-medium border cursor-pointer transition-colors ${
                        audienceFilter.propertyTypes.includes(pt) ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#D1D5DB] bg-white text-gray-500 hover:bg-gray-50'
                      }`}>{pt}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[0.78rem] text-gray-600 mb-2 block font-medium">Strategy</label>
                <div className="flex flex-wrap gap-2">
                  {STRATEGIES.map(s => (
                    <button key={s}
                      onClick={() => {
                        const next = audienceFilter.strategies.includes(s) ? audienceFilter.strategies.filter(x => x !== s) : [...audienceFilter.strategies, s]
                        setAudienceFilter({ ...audienceFilter, strategies: next })
                      }}
                      className={`px-3 py-1.5 rounded-md text-[0.76rem] font-medium border cursor-pointer transition-colors ${
                        audienceFilter.strategies.includes(s) ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#D1D5DB] bg-white text-gray-500 hover:bg-gray-50'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[0.76rem] text-gray-500 mb-1 block">Not contacted in (days)</label>
                <input type="number" min={0} value={audienceFilter.excludeRecentlyContacted ?? ''} placeholder="e.g., 30"
                  onChange={e => setAudienceFilter({ ...audienceFilter, excludeRecentlyContacted: e.target.value ? Number(e.target.value) : null })}
                  className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB] placeholder-gray-400" />
              </div>

              {/* Live preview */}
              <div className={`rounded-[8px] border px-4 py-3 ${preview ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-[rgba(5,14,36,0.06)] bg-gray-50'}`}>
                {previewLoading ? (
                  <div className="flex items-center gap-2 text-[0.78rem] text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Building audience preview...
                  </div>
                ) : preview ? (
                  <div>
                    <div className="text-[0.82rem] font-medium text-[#1E3A8A] mb-1">
                      {preview.totalAfterDNC} buyers match
                      <span className="text-[0.74rem] text-gray-500 font-normal ml-2">
                        ({preview.removedDNC} removed by DNC
                        {preview.removedNoPhone > 0 ? `, ${preview.removedNoPhone} missing phone` : ''}
                        {preview.removedNoEmail > 0 ? `, ${preview.removedNoEmail} missing email` : ''})
                      </span>
                    </div>
                    <div className="text-[0.76rem] text-gray-600">
                      Est. cost: ${typeof preview.estimatedCost === 'object' ? (preview.estimatedCost[channelCostKey as keyof typeof preview.estimatedCost]?.toFixed(2) ?? '—') : '—'}
                    </div>
                    {preview.topBuyers.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {preview.topBuyers.map(b => (
                          <div key={b.id} className="text-[0.72rem] text-gray-500 flex items-center gap-2">
                            <span className="text-gray-700 font-medium">{b.name}</span>
                            <span>Score: {b.buyerScore ?? '—'}</span>
                            <span className="text-gray-400">{b.status?.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[0.78rem] text-gray-400">Select at least one filter to preview your audience</div>
                )}
              </div>

              {preview && preview.totalAfterDNC === 0 && (
                <div className="flex items-center gap-2 text-[0.78rem] text-amber-600 bg-amber-50 rounded-[8px] px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> No eligible buyers match your filters. Try broadening your criteria.
                </div>
              )}
              </>
              )}
            </div>
          )}

          {/* Step 3: Script & Settings */}
          {step === 3 && (
            <div className="space-y-5">
              {(channel === 'VOICE' || channel === 'MULTI_CHANNEL') && (
                <>
                  <div>
                    <label className="text-[0.78rem] text-gray-600 mb-2 block font-medium">Script Template</label>
                    <div className="space-y-2">
                      {SCRIPT_TEMPLATES.map(t => (
                        <button key={t.key} onClick={() => setScriptTemplate(t.key)}
                          className={`w-full text-left px-4 py-3 rounded-[8px] border cursor-pointer transition-colors ${
                            scriptTemplate === t.key ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[rgba(5,14,36,0.06)] bg-white hover:bg-[#F9FAFB]'
                          }`}>
                          <div className={`text-[0.82rem] font-medium ${scriptTemplate === t.key ? 'text-[#1E3A8A]' : 'text-[#374151]'}`}>{t.label}</div>
                          <div className="text-[0.72rem] text-gray-400">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[0.78rem] text-gray-600 font-medium">Custom Instructions (optional)</label>
                      <div className="flex items-center gap-2">
                        <select
                          onChange={e => {
                            if (e.target.value && scriptRef.current) {
                              const ta = scriptRef.current
                              const start = ta.selectionStart
                              const before = customScript.slice(0, start)
                              const after = customScript.slice(ta.selectionEnd)
                              setCustomScript(`${before}{{${e.target.value}}}${after}`)
                              setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + e.target.value.length + 4; ta.focus() }, 0)
                              e.target.value = ''
                            }
                          }}
                          defaultValue=""
                          className="text-[0.72rem] border border-gray-200 rounded-[8px] px-2 py-1 bg-white cursor-pointer text-[#2563EB]"
                        >
                          <option value="" disabled>+ Insert variable</option>
                          {['firstName', 'fullName', 'companyName', 'agentName', 'propertyAddress', 'propertyType', 'askingPrice', 'arv', 'market'].map(v => (
                            <option key={v} value={v}>{`{{${v}}}`}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => setShowScriptPreview(!showScriptPreview)}
                          className={`text-[0.72rem] px-2 py-1 rounded-[8px] border cursor-pointer transition-colors ${
                            showScriptPreview ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}>
                          {showScriptPreview ? 'Edit' : 'Preview'}
                        </button>
                      </div>
                    </div>
                    {showScriptPreview ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-[8px] p-4 text-[0.82rem] text-[#0B1224] whitespace-pre-wrap min-h-[80px]">
                        {customScript.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                          const samples: Record<string, string> = { firstName: 'John', fullName: 'John Smith', companyName: companyName || 'DealFlow Properties', agentName: agentName || 'Sarah', propertyAddress: '123 Main St, Phoenix, AZ', propertyType: 'Single Family', askingPrice: '$150,000', arv: '$220,000', market: market || 'Phoenix, AZ' }
                          return samples[key] ?? match
                        }) || 'No custom instructions yet'}
                      </div>
                    ) : (
                      <textarea ref={scriptRef} value={customScript} onChange={e => setCustomScript(e.target.value)} rows={3} placeholder="Add additional instructions for the AI agent. Use {{variables}} for personalization..."
                        className="w-full bg-white border border-[#D1D5DB] rounded-md px-4 py-2.5 text-[0.82rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] resize-y" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[0.76rem] text-gray-500 mb-1 block">Company Name</label>
                      <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="DealFlow Properties"
                        className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB] placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="text-[0.76rem] text-gray-500 mb-1 block">Agent Name</label>
                      <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Sarah"
                        className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB] placeholder-gray-400" />
                    </div>
                  </div>
                </>
              )}

              {channel === 'SMS' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[0.78rem] text-gray-600 mb-2 block font-medium">SMS Template</label>
                    <div className="space-y-2">
                      {[
                        { key: 'deal_alert', label: 'Deal Alert', desc: 'Notify buyer about a specific property' },
                        { key: 'buyer_qualification', label: 'Buyer Qualification', desc: 'Quick qualification text sequence' },
                        { key: 'follow_up', label: 'Follow-Up', desc: 'Follow up after a call or expression of interest' },
                        { key: 'reactivation', label: 'Reactivation', desc: 'Re-engage inactive buyers' },
                        { key: 'seller_intro', label: 'Seller Introduction', desc: 'Reach out to property owners about selling' },
                      ].map(t => (
                        <button key={t.key} onClick={() => setScriptTemplate(t.key)}
                          className={`w-full text-left px-4 py-3 rounded-[8px] border cursor-pointer transition-colors ${
                            scriptTemplate === t.key ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[rgba(5,14,36,0.06)] bg-white hover:bg-[#F9FAFB]'
                          }`}>
                          <div className={`text-[0.82rem] font-medium ${scriptTemplate === t.key ? 'text-[#1E3A8A]' : 'text-[#374151]'}`}>{t.label}</div>
                          <div className="text-[0.72rem] text-gray-400">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[0.78rem] text-gray-600 font-medium">Custom SMS Message (optional)</label>
                      <select onChange={e => {
                        if (e.target.value) {
                          setCustomScript(prev => prev + `{{${e.target.value}}}`)
                          e.target.value = ''
                        }
                      }} defaultValue="" className="text-[0.72rem] border border-gray-200 rounded-[8px] px-2 py-1 bg-white cursor-pointer text-[#2563EB]">
                        <option value="" disabled>+ Insert variable</option>
                        {['firstName', 'fullName', 'companyName', 'agentName', 'agentPhone', 'propertyAddress', 'askingPrice', 'market'].map(v => (
                          <option key={v} value={v}>{`{{${v}}}`}</option>
                        ))}
                      </select>
                    </div>
                    <textarea value={customScript} onChange={e => setCustomScript(e.target.value)} rows={3}
                      placeholder="Hi {{firstName}}, this is {{agentName}} from {{companyName}}..."
                      className="w-full bg-white border border-[#D1D5DB] rounded-md px-4 py-2.5 text-[0.82rem] text-[#374151] placeholder-gray-400 outline-none focus:border-[#2563EB] resize-none" />
                    <div className={`text-[0.68rem] mt-1 text-right ${customScript.length > 160 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {customScript.length}/160 characters {customScript.length > 160 && `(${Math.ceil(customScript.length / 160)} segments)`}
                    </div>
                  </div>
                </div>
              )}

              {channel === 'EMAIL' && (
                <div>
                  <label className="text-[0.78rem] text-gray-600 mb-2 block font-medium">Email Drip Sequence</label>
                  <div className="space-y-2">
                    {[
                      { key: 'buyer_intro', label: 'Buyer Intro', desc: '3-step intro drip with company overview' },
                      { key: 'deal_notification', label: 'Deal Notification', desc: 'Property alert with ARV and details' },
                      { key: 'reactivation_drip', label: 'Reactivation Drip', desc: '4-step sequence to re-engage dormant buyers' },
                      { key: 'proof_of_funds', label: 'Proof of Funds Request', desc: 'Formal POF verification email' },
                    ].map(t => (
                      <button key={t.key} onClick={() => setScriptTemplate(t.key)}
                        className={`w-full text-left px-4 py-3 rounded-[8px] border cursor-pointer transition-colors ${
                          scriptTemplate === t.key ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[rgba(5,14,36,0.06)] bg-white hover:bg-[#F9FAFB]'
                        }`}>
                        <div className={`text-[0.82rem] font-medium ${scriptTemplate === t.key ? 'text-[#1E3A8A]' : 'text-[#374151]'}`}>{t.label}</div>
                        <div className="text-[0.72rem] text-gray-400">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Calling settings */}
              {(channel === 'VOICE' || channel === 'MULTI_CHANNEL') && (
                <div className="border-t border-[#F3F4F6] pt-4 space-y-4">
                  <div className="text-[0.78rem] font-medium text-gray-600 flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" /> Calling Settings
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[0.76rem] text-gray-500 mb-1 block">Max Concurrent Calls</label>
                      <input type="range" min={1} max={10} value={maxConcurrent} onChange={e => setMaxConcurrent(Number(e.target.value))} className="w-full" />
                      <div className="text-[0.72rem] text-gray-500 text-center">{maxConcurrent}</div>
                    </div>
                    <div>
                      <label className="text-[0.76rem] text-gray-500 mb-1 block">Max Retries</label>
                      <input type="range" min={0} max={3} value={maxRetries} onChange={e => setMaxRetries(Number(e.target.value))} className="w-full" />
                      <div className="text-[0.72rem] text-gray-500 text-center">{maxRetries}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[0.76rem] text-gray-500 mb-1 block">Start Time</label>
                      <input type="time" value={callHoursStart} onChange={e => setCallHoursStart(e.target.value)}
                        className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB]" />
                    </div>
                    <div>
                      <label className="text-[0.76rem] text-gray-500 mb-1 block">End Time</label>
                      <input type="time" value={callHoursEnd} onChange={e => setCallHoursEnd(e.target.value)}
                        className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB]" />
                    </div>
                    <div>
                      <label className="text-[0.76rem] text-gray-500 mb-1 block">Timezone</label>
                      <select value={timezone} onChange={e => setTimezone(e.target.value)}
                        className="w-full appearance-none bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB] cursor-pointer">
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.split('/')[1]?.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Voicemail Settings */}
                  <div className="border border-[rgba(5,14,36,0.06)] rounded-[10px] p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={leaveVoicemail} onChange={e => setLeaveVoicemail(e.target.checked)} className="rounded border-gray-300" />
                        <span className="text-[0.78rem] text-gray-700 font-medium">Leave voicemail if no answer</span>
                      </label>
                      {leaveVoicemail && (
                        <span className="text-[0.68rem] text-gray-400">
                          {voicemailRecordingId
                            ? voicemailOptions.find(v => v.id === voicemailRecordingId)?.name || 'Selected'
                            : 'Auto (matches script)'}
                        </span>
                      )}
                    </div>
                    {leaveVoicemail && voicemailOptions.length > 0 && (
                      <div>
                        <label className="text-[0.72rem] text-gray-500 mb-1.5 block">Voicemail Recording</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => setVoicemailRecordingId('')}
                            className={`px-2.5 py-1.5 rounded-md text-[0.72rem] text-left border cursor-pointer transition-colors ${
                              !voicemailRecordingId ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            Auto (match script)
                          </button>
                          {voicemailOptions.map(vm => (
                            <button
                              key={vm.id}
                              onClick={() => setVoicemailRecordingId(vm.id)}
                              className={`px-2.5 py-1.5 rounded-md text-[0.72rem] text-left border cursor-pointer transition-colors ${
                                voicemailRecordingId === vm.id ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <span className="block truncate">{vm.name}</span>
                              <span className="text-[0.65rem] text-gray-400">
                                {vm.source === 'system' ? 'System' : 'Custom'} · ~{vm.estimatedDuration || '?'}s
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.76rem] text-gray-500">Retry delay:</span>
                      <input type="number" min={1} max={168} value={retryDelayHours} onChange={e => setRetryDelayHours(Number(e.target.value))}
                        className="w-16 bg-white border border-[#D1D5DB] rounded-md px-2 py-1 text-[0.82rem] outline-none focus:border-[#2563EB] text-center" />
                      <span className="text-[0.76rem] text-gray-500">hours</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review & Launch */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-[#F9FAFB] rounded-[8px] px-4 py-4 space-y-2">
                <div className="flex justify-between text-[0.82rem]">
                  <span className="text-gray-500">Campaign</span>
                  <span className="text-gray-800 font-medium">{name}</span>
                </div>
                <div className="flex justify-between text-[0.82rem]">
                  <span className="text-gray-500">Channel</span>
                  <span className="text-gray-800">{typeOptions.find(t => t.key === channel)?.label}</span>
                </div>
                <div className="flex justify-between text-[0.82rem]">
                  <span className="text-gray-500">Market</span>
                  <span className="text-gray-800">{market}</span>
                </div>
                <div className="flex justify-between text-[0.82rem]">
                  <span className="text-gray-500">Audience</span>
                  <span className="text-gray-800 font-medium">{audienceMode === 'contacts' ? `${selectedContactIds.length} contacts` : `${preview?.totalAfterDNC ?? '—'} buyers`}</span>
                </div>
                {preview?.removedDNC ? (
                  <div className="flex justify-between text-[0.78rem]">
                    <span className="text-gray-400">Removed by DNC</span>
                    <span className="text-red-500">{preview.removedDNC}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-[0.82rem]">
                  <span className="text-gray-500">Script</span>
                  <span className="text-gray-800">{SCRIPT_TEMPLATES.find(t => t.key === scriptTemplate)?.label || scriptTemplate}</span>
                </div>
                <div className="flex justify-between text-[0.82rem]">
                  <span className="text-gray-500">Est. Cost</span>
                  <span className="text-gray-800 font-medium">
                    ${preview?.estimatedCost ? (typeof preview.estimatedCost === 'object' ? (preview.estimatedCost[channelCostKey as keyof typeof preview.estimatedCost]?.toFixed(2) ?? '—') : '—') : '—'}
                  </span>
                </div>
              </div>

              {/* Scheduling */}
              <div className="space-y-2">
                <div className="text-[0.78rem] font-medium text-gray-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Schedule
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="schedule" value="now" checked={scheduleType === 'now'} onChange={() => setScheduleType('now')} className="accent-[#2563EB]" />
                    <span className="text-[0.82rem]">Send immediately</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="schedule" value="later" checked={scheduleType === 'later'} onChange={() => setScheduleType('later')} className="accent-[#2563EB]" />
                    <span className="text-[0.82rem]">Schedule for later</span>
                  </label>
                </div>
                {scheduleType === 'later' && (
                  <div className="flex items-center gap-2 mt-1">
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB]" />
                    <span className="text-[0.74rem] text-gray-400">Your local time</span>
                  </div>
                )}
              </div>

              {/* Compliance */}
              <div className="space-y-2">
                <div className="text-[0.78rem] font-medium text-gray-600 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Compliance Checklist
                </div>
                {[
                  'DNC filtering applied',
                  'Calling hours configured',
                  'Recording disclosure included (two-party states)',
                  'Opt-out mechanism included',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-[0.78rem] text-[#2563EB]">
                    <CheckCircle2 className="w-4 h-4 text-[#2563EB]" /> {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F3F4F6] flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-[0.82rem] text-gray-500 hover:text-gray-700 bg-transparent border-0 cursor-pointer transition-colors">Back</button>
          ) : <div />}
          <div className="flex items-center gap-2">
            {step === 0 ? (
              <div />
            ) : step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
                className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-5 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleCreate(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-md text-[0.82rem] font-medium text-gray-600 border border-[#D1D5DB] bg-white hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => handleCreate(scheduleType === 'now')}
                  disabled={submitting || (scheduleType === 'later' && !scheduledAt)}
                  className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-5 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : scheduleType === 'later' ? <Calendar className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {scheduleType === 'later' ? 'Schedule Campaign' : 'Launch Campaign'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) { .outreach-modal { width: 95% !important; max-height: 90vh !important; } }
      ` }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANALYTICS TAB
   ═══════════════════════════════════════════════════════════════════════════ */

// Types for analytics data
interface GlobalAnalytics {
  period: { days: number; since: string }
  overview: {
    totalCampaigns: number; activeCampaigns: number; completedCampaigns: number
    totalCalls: number; completedCalls: number; qualifiedLeads: number
    connectionRate: number; qualificationRate: number; avgCallDuration: number
    totalTalkTimeMins: number; totalEstimatedCost: number; totalActualCost: number
    costPerQualified: number
  }
  trends: { date: string; calls: number; qualified: number; connected: number; minutes: number }[]
  outcomeBreakdown: Record<string, number>
  heatmap: { day: string; hour: number; calls: number; connectionRate: number }[]
  campaignComparison: {
    id: string; name: string; status: string; channel: string; mode: string
    totalBuyers: number; callsCompleted: number; qualified: number
    connectionRate: number; qualificationRate: number; avgTalkTime: number
    cost: number; costPerQualified: number
  }[]
  channelStats: Record<string, { campaigns: number; calls: number; qualified: number; cost: number }>
}

interface ABTestEntry {
  id: string; name: string; status: string; testVariable: string
  variantALabel: string; variantBLabel: string
  winnerId: string | null; confidenceLevel: number | null
  createdAt: string
  campaignA: { id: string; name: string; status: string; callsCompleted: number; qualified: number } | null
  campaignB: { id: string; name: string; status: string; callsCompleted: number; qualified: number } | null
  liveStats: {
    rateA: number; rateB: number; absoluteDiff: number; relativeLift: number
    zScore: number; pValue: number; confidence: number
    isSignificant: boolean; winner: 'A' | 'B' | 'none'; samplesNeeded: number
  } | null
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIVE MONITOR TAB — Real-time AI call monitoring, whisper, barge-in
   ═══════════════════════════════════════════════════════════════════════════ */

interface LiveCall {
  id: string
  callId: string
  blandCallId: string
  buyerName: string
  buyerPhone: string
  buyerScore: number
  campaignName: string
  campaignId: string
  status: string
  duration: number
  startedAt: string
  monitoredBy: string | null
  transcript: string | null
}

interface MonSession {
  sessionId: string
  audioStreamUrl: string | null
  transcriptStreamUrl: string | null
  canWhisper: boolean
  canBargeIn: boolean
}

// Demo data for development
const DEMO_CALLS: LiveCall[] = [
  { id: 'demo1', callId: 'demo1', blandCallId: 'demo_1', buyerName: 'Marcus Johnson', buyerPhone: '+14045551234', buyerScore: 82, campaignName: 'Atlanta Q1 Buyers', campaignId: 'c1', status: 'active', duration: 127, startedAt: new Date(Date.now() - 127000).toISOString(), monitoredBy: null, transcript: 'AI: Hi Marcus, this is Alex from DealFlow. How are you doing today?\nBuyer: Hey, doing well. What do you have for me?\nAI: Great to hear! I\'m reaching out because we have some exciting off-market deals in the Atlanta area that match your buy box. Are you still actively looking for investment properties?\nBuyer: Yeah definitely, I just closed on a duplex last month actually.\nAI: That\'s fantastic! What types of properties are you most interested in right now?' },
  { id: 'demo2', callId: 'demo2', blandCallId: 'demo_2', buyerName: 'Sarah Chen', buyerPhone: '+17135559876', buyerScore: 65, campaignName: 'Houston Reactivation', campaignId: 'c2', status: 'active', duration: 45, startedAt: new Date(Date.now() - 45000).toISOString(), monitoredBy: null, transcript: 'AI: Hi Sarah, this is Alex from DealFlow. It\'s been a while since we last spoke.\nBuyer: Oh hey, yeah it has. What\'s going on?' },
  { id: 'demo3', callId: 'demo3', blandCallId: 'demo_3', buyerName: 'Apex Capital LLC', buyerPhone: '+12145553456', buyerScore: 91, campaignName: 'Dallas Deal Alert', campaignId: 'c3', status: 'active', duration: 203, startedAt: new Date(Date.now() - 203000).toISOString(), monitoredBy: null, transcript: null },
]

const DEMO_TRANSCRIPT_UPDATES = [
  '\nBuyer: I\'m looking for single family, maybe some duplexes too.',
  '\nAI: Perfect. And what\'s your price range for those?',
  '\nBuyer: Usually between 150 and 300k. I can close in about two weeks.',
  '\nAI: That\'s great, fast closers are exactly who we love working with. Do you have proof of funds ready?',
  '\nBuyer: Yeah I\'ve got a line of credit through my bank. Can send it over.',
]

function LiveMonitorTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [calls, setCalls] = useState<LiveCall[]>([])
  const [loading, setLoading] = useState(true)
  const [monitoringCallId, setMonitoringCallId] = useState<string | null>(null)
  const [monSession, setMonSession] = useState<MonSession | null>(null)
  const [liveTranscript, setLiveTranscript] = useState<string>('')
  const [whisperDraft, setWhisperDraft] = useState('')
  const [whispers, setWhispers] = useState<Array<{ message: string; sentAt: string }>>([])
  const [demoMode, setDemoMode] = useState(false)
  const [demoTranscriptIdx, setDemoTranscriptIdx] = useState(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const demoPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch active calls (poll every 4s)
  const fetchCalls = useCallback(async () => {
    if (demoMode) return
    try {
      const res = await fetch('/api/outreach/live')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCalls(data.calls || [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [demoMode])

  useEffect(() => {
    if (demoMode) {
      setCalls(DEMO_CALLS.map(c => ({ ...c, duration: Math.floor((Date.now() - new Date(c.startedAt).getTime()) / 1000) })))
      setLoading(false)
      return
    }
    fetchCalls()
    const interval = setInterval(fetchCalls, 4000)
    return () => clearInterval(interval)
  }, [fetchCalls, demoMode])

  // Duration counter (tick every second for displayed calls)
  useEffect(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
    if (calls.length === 0) return
    durationIntervalRef.current = setInterval(() => {
      setCalls(prev => prev.map(c => ({
        ...c,
        duration: Math.floor((Date.now() - new Date(c.startedAt).getTime()) / 1000),
      })))
    }, 1000)
    return () => { if (durationIntervalRef.current) clearInterval(durationIntervalRef.current) }
  }, [calls.length])

  // Transcript polling when monitoring
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (!monitoringCallId || demoMode) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/outreach/live/${monitoringCallId}/transcript`)
        if (res.ok) {
          const data = await res.json()
          if (data.transcript) setLiveTranscript(data.transcript)
        }
      } catch { /* ignore */ }
    }
    poll()
    pollIntervalRef.current = setInterval(poll, 2000)
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [monitoringCallId, demoMode])

  // Demo transcript updates
  useEffect(() => {
    if (demoPollRef.current) clearInterval(demoPollRef.current)
    if (!monitoringCallId || !demoMode) return
    demoPollRef.current = setInterval(() => {
      setDemoTranscriptIdx(prev => {
        const next = prev + 1
        if (next <= DEMO_TRANSCRIPT_UPDATES.length) {
          setLiveTranscript(t => t + DEMO_TRANSCRIPT_UPDATES[next - 1])
        }
        return next
      })
    }, 3000)
    return () => { if (demoPollRef.current) clearInterval(demoPollRef.current) }
  }, [monitoringCallId, demoMode])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveTranscript])

  // Start monitoring
  const handleMonitor = async (callId: string) => {
    setMonitoringCallId(callId)
    const call = calls.find(c => c.callId === callId)
    setLiveTranscript(call?.transcript || '')
    setWhispers([])
    setDemoTranscriptIdx(0)

    if (demoMode) {
      setMonSession({ sessionId: 'demo_session', audioStreamUrl: null, transcriptStreamUrl: null, canWhisper: false, canBargeIn: false })
      return
    }

    try {
      const res = await fetch(`/api/outreach/live/${callId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'monitor' }),
      })
      if (res.ok) {
        const data = await res.json()
        setMonSession(data.session)
      }
    } catch { /* ignore */ }
  }

  // Stop monitoring
  const handleStopMonitor = async () => {
    if (monSession?.sessionId && !demoMode) {
      await fetch(`/api/outreach/live/${monitoringCallId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop_monitor', sessionId: monSession.sessionId }),
      }).catch(() => {})
    }
    setMonitoringCallId(null)
    setMonSession(null)
    setLiveTranscript('')
    setWhispers([])
  }

  // Send whisper
  const handleWhisper = async () => {
    if (!whisperDraft.trim() || !monSession?.sessionId) return
    const msg = whisperDraft.trim()
    setWhisperDraft('')

    if (demoMode) {
      setWhispers(prev => [...prev, { message: msg, sentAt: new Date().toISOString() }])
      addToast('Whisper saved (demo mode)', 'success')
      return
    }

    try {
      const res = await fetch(`/api/outreach/live/${monitoringCallId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'whisper', sessionId: monSession.sessionId, message: msg }),
      })
      const data = await res.json()
      setWhispers(prev => [...prev, { message: msg, sentAt: new Date().toISOString() }])
      addToast(data.message || 'Whisper sent', data.delivered ? 'success' : 'info')
    } catch {
      addToast('Failed to send whisper', 'error')
    }
  }

  // Barge in
  const handleBargeIn = async () => {
    if (!monSession?.sessionId) return
    if (demoMode) {
      addToast('Barge-in simulated (demo mode)', 'success')
      handleStopMonitor()
      return
    }

    try {
      const res = await fetch(`/api/outreach/live/${monitoringCallId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'barge_in', sessionId: monSession.sessionId }),
      })
      const data = await res.json()
      addToast(data.message || 'Barge-in initiated', data.success ? 'success' : 'error')
      handleStopMonitor()
      fetchCalls()
    } catch {
      addToast('Barge-in failed', 'error')
    }
  }

  // End call
  const handleEndCall = async (callId: string) => {
    if (demoMode) {
      setCalls(prev => prev.filter(c => c.callId !== callId))
      if (monitoringCallId === callId) handleStopMonitor()
      addToast('Call ended (demo)', 'success')
      return
    }

    try {
      await fetch(`/api/outreach/live/${callId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      })
      addToast('Call ended', 'success')
      if (monitoringCallId === callId) handleStopMonitor()
      fetchCalls()
    } catch {
      addToast('Failed to end call', 'error')
    }
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const monitoredCall = calls.find(c => c.callId === monitoringCallId)

  // ── Monitoring detail view ──────────────────────────────────────────────
  if (monitoringCallId && monitoredCall) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={handleStopMonitor} className="flex items-center gap-2 text-[0.82rem] text-gray-500 hover:text-gray-700 cursor-pointer bg-transparent border-0">
            <ArrowLeft className="w-4 h-4" /> Back to all calls
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-pulse" />
            <span className="text-[0.78rem] text-[#2563EB] font-medium">Monitoring</span>
          </div>
        </div>

        {/* Call info bar */}
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[0.92rem] font-semibold text-gray-800">{monitoredCall.buyerName}</span>
              <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Score: {monitoredCall.buyerScore}</span>
            </div>
            <div className="text-[0.78rem] text-gray-400 mt-0.5">{monitoredCall.buyerPhone} &middot; {monitoredCall.campaignName}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-[1.1rem] font-bold text-gray-800 font-mono">{formatDuration(monitoredCall.duration)}</div>
              <div className="text-[0.65rem] text-gray-400">Duration</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 400 }}>
          {/* Left: Transcript */}
          <div className="lg:col-span-2 bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[rgba(5,14,36,0.06)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2563EB]" />
              <span className="text-[0.82rem] font-semibold text-gray-800">Live Transcript</span>
              <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-pulse ml-auto" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50" style={{ maxHeight: 350 }}>
              {liveTranscript ? (
                <div className="space-y-2">
                  {liveTranscript.split('\n').filter(Boolean).map((line, i) => {
                    const isAI = line.trim().startsWith('AI:')
                    const isBuyer = line.trim().startsWith('Buyer:')
                    const content = line.replace(/^(AI|Buyer):\s*/, '')
                    return (
                      <div key={i} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-[10px] px-3 py-2 text-[0.8rem] ${
                          isAI ? 'bg-blue-100 text-blue-900' : isBuyer ? 'bg-[rgba(37,99,235,0.08)] text-[#0B1224]' : 'bg-gray-100 text-gray-700'
                        }`}>
                          <span className="text-[0.65rem] font-bold opacity-60 block mb-0.5">
                            {isAI ? 'AI Agent' : isBuyer ? 'Buyer' : ''}
                          </span>
                          {content}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={transcriptEndRef} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-[0.8rem]">
                  <Activity className="w-6 h-6 mb-2 opacity-40" />
                  {monSession?.transcriptStreamUrl
                    ? 'Waiting for transcript data...'
                    : 'Live transcript available after call completes'}
                </div>
              )}
            </div>

            {/* Whisper input */}
            <div className="px-4 py-3 border-t border-[rgba(5,14,36,0.06)] bg-white">
              {whispers.length > 0 && (
                <div className="mb-2 space-y-1 max-h-[80px] overflow-y-auto">
                  {whispers.map((w, i) => (
                    <div key={i} className="text-[0.7rem] text-purple-600 flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      <span className="font-medium">You:</span> {w.message}
                      <span className="text-gray-400 ml-auto">{new Date(w.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={whisperDraft}
                  onChange={e => setWhisperDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleWhisper() } }}
                  placeholder="Whisper instruction to AI agent..."
                  className="flex-1 text-[0.8rem] px-3 py-2 border border-purple-200 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-purple-500 bg-purple-50"
                />
                <button
                  onClick={handleWhisper}
                  disabled={!whisperDraft.trim()}
                  className="px-3 py-2 bg-purple-600 text-white text-[0.78rem] rounded-[8px] hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {!monSession?.canWhisper && (
                <div className="text-[0.65rem] text-gray-400 mt-1">Whisper delivery requires Bland Enterprise. Instructions saved for reference.</div>
              )}
            </div>
          </div>

          {/* Right: Controls + Buyer context */}
          <div className="space-y-4">
            {/* Barge-in card */}
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-4">
              <h4 className="text-[0.82rem] font-semibold text-gray-800 mb-3">Call Actions</h4>
              <button
                onClick={handleBargeIn}
                className="w-full py-2.5 bg-orange-600 text-white text-[0.82rem] font-medium rounded-[8px] hover:bg-orange-700 cursor-pointer flex items-center justify-center gap-2 mb-2"
              >
                <PhoneCall className="w-4 h-4" /> Take Over Call
              </button>
              <div className="text-[0.68rem] text-gray-400 mb-3">Connects you directly to the buyer. AI will hand off.</div>
              <button
                onClick={() => handleEndCall(monitoringCallId)}
                className="w-full py-2 border border-red-200 text-red-600 text-[0.78rem] rounded-[8px] hover:bg-red-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <PhoneEndIcon className="w-4 h-4" /> End Call
              </button>
            </div>

            {/* Quick whispers */}
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-4">
              <h4 className="text-[0.82rem] font-semibold text-gray-800 mb-2">Quick Whispers</h4>
              <div className="space-y-1.5">
                {['Ask about their timeline', 'Ask if they have proof of funds', 'Mention we can close in 7 days', 'Offer to send deal details by email'].map(q => (
                  <button
                    key={q}
                    onClick={() => { setWhisperDraft(q) }}
                    className="w-full text-left text-[0.75rem] px-3 py-1.5 bg-gray-50 hover:bg-purple-50 text-gray-600 hover:text-purple-700 rounded-[8px] cursor-pointer border-0 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Buyer context */}
            <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-4">
              <h4 className="text-[0.82rem] font-semibold text-gray-800 mb-2">Buyer Context</h4>
              <div className="space-y-1.5 text-[0.75rem]">
                <div className="flex justify-between"><span className="text-gray-400">Score</span><span className="font-medium text-gray-700">{monitoredCall.buyerScore}/100</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Campaign</span><span className="font-medium text-gray-700 truncate max-w-[150px]">{monitoredCall.campaignName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="font-mono text-gray-700">{monitoredCall.buyerPhone}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Call grid view ──────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {calls.length > 0 ? (
            <>
              <span className="w-2.5 h-2.5 bg-[#2563EB] rounded-full animate-pulse" />
              <span className="text-[0.88rem] font-semibold text-gray-800">{calls.length} call{calls.length !== 1 ? 's' : ''} active right now</span>
            </>
          ) : (
            <span className="text-[0.88rem] font-semibold text-gray-800">Live Call Monitor</span>
          )}
        </div>
        {process.env.NODE_ENV !== 'production' && (
          <button
            onClick={() => { setDemoMode(d => !d); setLoading(true); setTimeout(() => setLoading(false), 300) }}
            className={`text-[0.72rem] px-3 py-1 rounded-full border cursor-pointer ${
              demoMode ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            {demoMode ? 'Demo ON' : 'Demo'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : calls.length === 0 ? (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-12 text-center">
          <Radio className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <div className="text-[0.88rem] text-gray-500 font-medium mb-1">No calls in progress</div>
          <div className="text-[0.78rem] text-gray-400">Launch a voice campaign to start calling. Active calls will appear here in real-time.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {calls.map(call => (
            <div key={call.callId} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-4 hover:shadow-sm transition-shadow">
              {/* Card header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#2563EB] rounded-full animate-pulse" />
                  <span className="text-[0.85rem] font-semibold text-gray-800">{call.buyerName}</span>
                </div>
                <span className="text-[0.68rem] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  Score: {call.buyerScore}
                </span>
              </div>

              {/* Call info */}
              <div className="text-[0.75rem] text-gray-500 mb-3 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3" /> {call.buyerPhone}
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3 h-3" /> {call.campaignName}
                </div>
              </div>

              {/* Duration + waveform */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-[1.2rem] font-bold font-mono text-gray-800">{formatDuration(call.duration)}</div>
                <div className="flex items-center gap-0.5 h-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#2563EB]/60 rounded-full"
                      style={{
                        height: `${8 + Math.random() * 16}px`,
                        animation: `waveform 0.6s ease-in-out ${i * 0.05}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMonitor(call.callId)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-[0.78rem] rounded-[8px] hover:bg-blue-700 cursor-pointer"
                >
                  <Headphones className="w-4 h-4" /> Listen
                </button>
                <button
                  onClick={() => {
                    if (confirm(`End the call with ${call.buyerName}?`)) handleEndCall(call.callId)
                  }}
                  className="py-2 px-3 border border-red-200 text-red-500 rounded-[8px] hover:bg-red-50 cursor-pointer"
                >
                  <PhoneEndIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes waveform {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }
      ` }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMS INBOX TAB — Two-panel iMessage-style SMS conversation UI
   ═══════════════════════════════════════════════════════════════════════════ */

interface SMSConvo {
  id: string
  phone: string
  status: string
  mode: string
  lastMessageBody: string | null
  lastMessageAt: string | null
  lastMessageDir: string | null
  unreadCount: number
  buyer: {
    id: string
    firstName: string | null
    lastName: string | null
    entityName: string | null
    phone: string | null
    status: string
    buyerScore: number
  } | null
}

interface SMSMsg {
  id: string
  direction: string
  from: string
  to: string
  body: string
  sentBy: string | null
  status: string
  aiClassification: string | null
  aiAutoReplied: boolean
  createdAt: string
}

function SMSInboxTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [convos, setConvos] = useState<SMSConvo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SMSMsg[]>([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [selectedConvo, setSelectedConvo] = useState<(SMSConvo & { messages?: SMSMsg[] }) | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch conversations
  const fetchConvos = useCallback(async () => {
    try {
      const res = await fetch('/api/outreach/sms')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setConvos(data.conversations || [])
      setTotalUnread(data.totalUnread || 0)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConvos() }, [fetchConvos])

  // Fetch messages when conversation selected
  useEffect(() => {
    if (!selectedId) { setMessages([]); setSelectedConvo(null); return }
    setMsgsLoading(true)
    fetch(`/api/outreach/sms/${selectedId}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.conversation?.messages || [])
        setSelectedConvo(data.conversation || null)
        // Update unread count in list
        setConvos(prev => prev.map(c => c.id === selectedId ? { ...c, unreadCount: 0 } : c))
      })
      .catch(() => {})
      .finally(() => setMsgsLoading(false))
  }, [selectedId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const handleSend = async () => {
    if (!draft.trim() || !selectedId || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/outreach/sms/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', body: draft.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Send failed')
      }
      setDraft('')
      // Refresh messages
      const r2 = await fetch(`/api/outreach/sms/${selectedId}`)
      const d2 = await r2.json()
      setMessages(d2.conversation?.messages || [])
      fetchConvos()
    } catch (err: any) {
      addToast(err.message || 'Failed to send', 'error')
    } finally {
      setSending(false)
    }
  }

  // Takeover
  const handleTakeover = async () => {
    if (!selectedId) return
    await fetch(`/api/outreach/sms/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'takeover' }),
    })
    setSelectedConvo(prev => prev ? { ...prev, mode: 'manual' } : null)
    setConvos(prev => prev.map(c => c.id === selectedId ? { ...c, mode: 'manual' } : c))
    addToast('Took over conversation. Auto-replies disabled.', 'success')
  }

  // Mode change
  const handleModeChange = async (mode: string) => {
    if (!selectedId) return
    await fetch(`/api/outreach/sms/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_mode', mode }),
    })
    setSelectedConvo(prev => prev ? { ...prev, mode } : null)
    setConvos(prev => prev.map(c => c.id === selectedId ? { ...c, mode } : c))
    addToast(`Mode changed to ${mode}`, 'success')
  }

  const buyerName = (c: SMSConvo) => {
    if (c.buyer?.entityName) return c.buyer.entityName
    if (c.buyer?.firstName || c.buyer?.lastName) return [c.buyer.firstName, c.buyer.lastName].filter(Boolean).join(' ')
    return c.phone
  }

  const classificationBadge = (cls: string | null) => {
    if (!cls) return null
    const colors: Record<string, string> = {
      interested: 'bg-[rgba(37,99,235,0.08)] text-[#2563EB]',
      opt_out: 'bg-red-100 text-red-700',
      not_interested: 'bg-orange-100 text-orange-700',
      question: 'bg-blue-100 text-blue-700',
      callback_request: 'bg-purple-100 text-purple-700',
      address_response: 'bg-teal-100 text-teal-700',
      price_response: 'bg-yellow-100 text-yellow-700',
      other: 'bg-gray-100 text-gray-500',
    }
    return (
      <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full font-medium ${colors[cls] || colors.other}`}>
        {cls.replace('_', ' ')}
      </span>
    )
  }

  const modeBadge = (mode: string) => {
    const m: Record<string, { bg: string; label: string }> = {
      auto: { bg: 'bg-[rgba(37,99,235,0.08)] text-[#2563EB]', label: 'Auto' },
      manual: { bg: 'bg-blue-100 text-blue-700', label: 'Manual' },
      hybrid: { bg: 'bg-purple-100 text-purple-700', label: 'Hybrid' },
    }
    const s = m[mode] || m.auto
    return <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full font-medium ${s.bg}`}>{s.label}</span>
  }

  return (
    <div className="flex border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden bg-white" style={{ height: 'calc(100vh - 320px)', minHeight: 500 }}>
      {/* ── Left panel: conversation list ─────────────────────────── */}
      <div className="w-[340px] border-r border-[rgba(5,14,36,0.06)] flex flex-col">
        <div className="p-3 border-b border-[rgba(5,14,36,0.06)] flex items-center justify-between">
          <span className="text-[0.85rem] font-semibold text-gray-800">SMS Conversations</span>
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-[0.65rem] font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : convos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-[0.8rem]">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              No SMS conversations yet
            </div>
          ) : (
            convos.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-[#F3F4F6] cursor-pointer bg-transparent transition-colors ${
                  selectedId === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.82rem] font-medium text-gray-800 truncate max-w-[180px]">
                    {buyerName(c)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {c.unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-[0.6rem] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {c.unreadCount}
                      </span>
                    )}
                    {modeBadge(c.mode)}
                  </div>
                </div>
                <div className="text-[0.75rem] text-gray-500 truncate">
                  {c.lastMessageDir === 'inbound' ? '← ' : '→ '}
                  {c.lastMessageBody || 'No messages'}
                </div>
                {c.lastMessageAt && (
                  <div className="text-[0.68rem] text-gray-400 mt-0.5">
                    {new Date(c.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                    {new Date(c.lastMessageAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: message thread ───────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
            <span className="text-[0.85rem]">Select a conversation</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-[rgba(5,14,36,0.06)] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.88rem] font-semibold text-gray-800">
                    {selectedConvo ? buyerName(selectedConvo as SMSConvo) : '...'}
                  </span>
                  {selectedConvo && modeBadge(selectedConvo.mode)}
                  {selectedConvo?.status === 'closed' && (
                    <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Closed</span>
                  )}
                </div>
                <div className="text-[0.75rem] text-gray-400">{selectedConvo?.phone}</div>
              </div>
              <div className="flex items-center gap-2">
                {selectedConvo?.mode === 'auto' && (
                  <button onClick={handleTakeover} className="text-[0.78rem] px-3 py-1.5 bg-blue-600 text-white rounded-[8px] hover:bg-blue-700 cursor-pointer">
                    Take Over
                  </button>
                )}
                <select
                  value={selectedConvo?.mode || 'auto'}
                  onChange={e => handleModeChange(e.target.value)}
                  className="text-[0.75rem] border border-[rgba(5,14,36,0.06)] rounded-[10px] px-2 py-1.5 text-gray-600"
                >
                  <option value="auto">Auto-reply</option>
                  <option value="manual">Manual only</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
              {msgsLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400 text-[0.8rem] mt-8">No messages</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                      msg.direction === 'outbound'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}>
                      <div className="text-[0.82rem] whitespace-pre-wrap break-words">{msg.body}</div>
                      <div className={`flex items-center gap-1.5 mt-1 ${
                        msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                      }`}>
                        {msg.direction === 'outbound' && msg.sentBy && (
                          <span className={`text-[0.6rem] ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                            {msg.sentBy === 'ai' ? 'AI' : msg.sentBy === 'wholesaler' ? 'You' : 'System'}
                          </span>
                        )}
                        {msg.direction === 'inbound' && msg.aiClassification && classificationBadge(msg.aiClassification)}
                        <span className={`text-[0.6rem] ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose bar */}
            {selectedConvo?.status !== 'closed' && (
              <div className="px-4 py-3 border-t border-[rgba(5,14,36,0.06)] bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Type a message..."
                    className="flex-1 text-[0.82rem] px-3 py-2 border border-[rgba(5,14,36,0.06)] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || sending}
                    className="px-4 py-2 bg-blue-600 text-white text-[0.82rem] rounded-[8px] hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                  </button>
                </div>
                <div className="text-[0.65rem] text-gray-400 mt-1">
                  STOP opt-out footer is added automatically to all messages
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AnalyticsTab({ campaigns, addToast }: { campaigns: Campaign[]; addToast: (msg: string, type: ToastData['type']) => void }) {
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [days, setDays] = useState(30)

  // A/B tests state
  const [abTests, setAbTests] = useState<ABTestEntry[]>([])
  const [abLoading, setAbLoading] = useState(true)
  const [showCreateAB, setShowCreateAB] = useState(false)

  // Intelligence state
  const [intel, setIntel] = useState<any>(null)
  const [intelLoading, setIntelLoading] = useState(true)

  // New A/B test form
  const [abName, setAbName] = useState('')
  const [abVariable, setAbVariable] = useState('script')
  const [abCampaignA, setAbCampaignA] = useState('')
  const [abCampaignB, setAbCampaignB] = useState('')
  const [abLabelA, setAbLabelA] = useState('')
  const [abLabelB, setAbLabelB] = useState('')
  const [abCreating, setAbCreating] = useState(false)

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const res = await fetch(`/api/outreach/analytics?days=${days}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const json = await res.json()
      setAnalytics(json)
    } catch {
      addToast('Failed to load analytics', 'error')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [days, addToast])

  const fetchABTests = useCallback(async () => {
    setAbLoading(true)
    try {
      const res = await fetch('/api/outreach/ab-tests')
      if (!res.ok) throw new Error('Failed to load A/B tests')
      const json = await res.json()
      setAbTests(json.tests)
    } catch {
      // Silently fail — A/B tests are supplementary
    } finally {
      setAbLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])
  useEffect(() => { fetchABTests() }, [fetchABTests])
  useEffect(() => {
    setIntelLoading(true)
    fetch(`/api/outreach/intelligence?minCalls=5`)
      .then(r => r.ok ? r.json() : null)
      .then(json => setIntel(json?.data || null))
      .catch(() => {})
      .finally(() => setIntelLoading(false))
  }, [])

  const handleCreateABTest = async () => {
    if (!abName.trim() || !abCampaignA || !abCampaignB || !abLabelA.trim() || !abLabelB.trim()) {
      addToast('Please fill in all fields', 'error')
      return
    }
    setAbCreating(true)
    try {
      const res = await fetch('/api/outreach/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: abName, testVariable: abVariable,
          campaignIdA: abCampaignA, campaignIdB: abCampaignB,
          variantALabel: abLabelA, variantBLabel: abLabelB,
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create test') }
      addToast('A/B test created', 'success')
      setShowCreateAB(false)
      setAbName(''); setAbVariable('script'); setAbCampaignA(''); setAbCampaignB(''); setAbLabelA(''); setAbLabelB('')
      fetchABTests()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Failed to create test', 'error')
    } finally {
      setAbCreating(false)
    }
  }

  if (analyticsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-4 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
              <div className="h-7 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-6 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-40 mb-4" />
          <div className="h-48 bg-gray-50 rounded" />
        </div>
      </div>
    )
  }

  if (!analytics) return <div className="text-center text-gray-400 py-12">No analytics data available</div>

  const { overview, trends, heatmap, campaignComparison, outcomeBreakdown } = analytics

  // SVG sparkline for trends
  const maxCalls = Math.max(...trends.map(t => t.calls), 1)
  const maxQual = Math.max(...trends.map(t => t.qualified), 1)
  const chartW = 800
  const chartH = 180
  const trendPoints = trends.map((t, i) => ({
    x: trends.length > 1 ? (i / (trends.length - 1)) * chartW : chartW / 2,
    yCalls: chartH - (t.calls / maxCalls) * (chartH - 20) - 10,
    yQual: chartH - (t.qualified / maxQual) * (chartH - 20) - 10,
    ...t,
  }))
  const callsPath = trendPoints.length > 1
    ? `M ${trendPoints.map(p => `${p.x},${p.yCalls}`).join(' L ')}`
    : ''
  const qualPath = trendPoints.length > 1
    ? `M ${trendPoints.map(p => `${p.x},${p.yQual}`).join(' L ')}`
    : ''

  // Heatmap: find max for color scaling
  const heatmapMax = Math.max(...heatmap.map(h => h.connectionRate), 1)

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-[0.95rem] font-semibold text-gray-900">Performance Analytics</h2>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-[0.75rem] rounded-full cursor-pointer transition-colors ${
                days === d
                  ? 'font-semibold border border-[#2563EB] text-[#2563EB] bg-[rgba(37,99,235,0.06)]'
                  : 'font-normal border border-[rgba(5,14,36,0.06)] text-[rgba(5,14,36,0.45)] bg-transparent hover:bg-gray-50'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Calls', value: overview.completedCalls.toLocaleString(), sub: `${overview.totalCalls - overview.completedCalls} pending` },
          { label: 'Qualified Leads', value: overview.qualifiedLeads.toString(), sub: `${overview.qualificationRate}% qual rate` },
          { label: 'Connection Rate', value: `${overview.connectionRate}%`, sub: `${overview.avgCallDuration}s avg duration` },
          { label: 'Cost / Qualified', value: overview.costPerQualified > 0 ? `$${overview.costPerQualified.toFixed(2)}` : '$0.00', sub: `$${overview.totalActualCost.toFixed(2)} total` },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-4 py-3">
            <div className="text-[0.72rem] text-gray-400 mb-1">{kpi.label}</div>
            <div className="text-[1.4rem] font-semibold text-gray-900">{kpi.value}</div>
            <div className="text-[0.7rem] text-gray-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      {trends.length > 1 && (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-5">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-[0.82rem] font-medium text-gray-900">Activity Trend</span>
            <div className="flex items-center gap-3 ml-auto">
              <span className="flex items-center gap-1.5 text-[0.7rem] text-gray-400">
                <span className="w-3 h-0.5 bg-[#2563EB] rounded" /> Calls
              </span>
              <span className="flex items-center gap-1.5 text-[0.7rem] text-gray-400">
                <span className="w-3 h-0.5 bg-[#60A5FA] rounded" /> Qualified
              </span>
            </div>
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-44" preserveAspectRatio="none">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map(f => (
              <line key={f} x1="0" y1={chartH * f} x2={chartW} y2={chartH * f} stroke="#F3F4F6" strokeWidth="1" />
            ))}
            {callsPath && <path d={callsPath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
            {qualPath && <path d={qualPath} fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
            {/* Data points */}
            {trendPoints.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.yCalls} r="3" fill="#2563EB" />
                <circle cx={p.x} cy={p.yQual} r="3" fill="#60A5FA" />
              </g>
            ))}
          </svg>
          <div className="flex justify-between text-[0.65rem] text-gray-300 mt-1">
            <span>{trends[0]?.date}</span>
            <span>{trends[trends.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Best Time to Call Heatmap */}
      {heatmap.length > 0 && (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-5">
          <div className="text-[0.82rem] font-medium text-gray-900 mb-3">Best Time to Call</div>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `auto repeat(13, 1fr)` }}>
              {/* Header row: hours */}
              <div />
              {Array.from({ length: 13 }, (_, i) => i + 8).map(h => (
                <div key={h} className="text-[0.6rem] text-gray-400 text-center px-1">{h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}</div>
              ))}
              {/* Data rows */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <>
                  <div key={`${day}-label`} className="text-[0.65rem] text-gray-500 pr-2 flex items-center">{day}</div>
                  {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => {
                    const cell = heatmap.find(h => h.day === day && h.hour === hour)
                    const rate = cell?.connectionRate || 0
                    const intensity = heatmapMax > 0 ? rate / heatmapMax : 0
                    const bg = rate === 0
                      ? 'bg-gray-50'
                      : intensity > 0.7 ? 'bg-[#2563EB]'
                      : intensity > 0.4 ? 'bg-[rgba(37,99,235,0.4)]'
                      : intensity > 0.15 ? 'bg-[rgba(37,99,235,0.12)]'
                      : 'bg-gray-100'
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={`w-8 h-6 rounded-sm ${bg} flex items-center justify-center`}
                        title={`${day} ${hour}:00 · ${cell?.calls || 0} calls, ${rate}% connect`}
                      >
                        {(cell?.calls || 0) > 0 && (
                          <span className={`text-[0.55rem] ${intensity > 0.4 ? 'text-white' : 'text-gray-400'}`}>{rate}%</span>
                        )}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[0.65rem] text-gray-400">
            <span>Low</span>
            <div className="flex gap-0.5">
              {['bg-gray-100', 'bg-[rgba(37,99,235,0.12)]', 'bg-[rgba(37,99,235,0.4)]', 'bg-[#2563EB]'].map((c, i) => (
                <div key={i} className={`w-4 h-3 rounded-sm ${c}`} />
              ))}
            </div>
            <span>High connection rate</span>
          </div>
        </div>
      )}

      {/* Outcome Breakdown */}
      <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-5">
        <div className="text-[0.82rem] font-medium text-gray-900 mb-3">Outcome Breakdown</div>
        <div className="flex gap-1 h-6 rounded-full overflow-hidden mb-3">
          {Object.entries(outcomeBreakdown)
            .filter(([k]) => k !== 'PENDING')
            .sort((a, b) => b[1] - a[1])
            .map(([outcome, count]) => {
              const total = Object.values(outcomeBreakdown).reduce((s, v) => s + v, 0) - (outcomeBreakdown.PENDING || 0)
              const pct = total > 0 ? (count / total) * 100 : 0
              return pct > 0 ? (
                <div
                  key={outcome}
                  className={`${OUTCOME_COLORS[outcome] || 'bg-gray-300'} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${OUTCOME_LABELS[outcome] || outcome}: ${count} (${Math.round(pct)}%)`}
                />
              ) : null
            })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(outcomeBreakdown)
            .filter(([k]) => k !== 'PENDING')
            .sort((a, b) => b[1] - a[1])
            .map(([outcome, count]) => (
              <div key={outcome} className="flex items-center gap-1.5 text-[0.72rem]">
                <span className={`w-2.5 h-2.5 rounded-sm ${OUTCOME_COLORS[outcome] || 'bg-gray-300'}`} />
                <span className="text-gray-600">{OUTCOME_LABELS[outcome] || outcome}</span>
                <span className="text-gray-400 font-medium">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Campaign Comparison Table */}
      {campaignComparison.length > 0 && (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F3F4F6]">
            <span className="text-[0.82rem] font-medium text-gray-900">Campaign Comparison</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[0.75rem]">
              <thead>
                <tr className="border-b border-[#F3F4F6] text-gray-400 text-left">
                  <th className="px-4 py-2 font-medium">Campaign</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium text-right">Calls</th>
                  <th className="px-3 py-2 font-medium text-right">Qualified</th>
                  <th className="px-3 py-2 font-medium text-right">Conn %</th>
                  <th className="px-3 py-2 font-medium text-right">Qual %</th>
                  <th className="px-3 py-2 font-medium text-right">Cost/Qual</th>
                </tr>
              </thead>
              <tbody>
                {campaignComparison.map(c => (
                  <tr key={c.id} className="border-b border-[#F3F4F6] hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">{c.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${statusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{channelBadge(c.channel)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{c.callsCompleted}</td>
                    <td className="px-3 py-2.5 text-right text-[#2563EB] font-medium">{c.qualified}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{c.connectionRate}%</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{c.qualificationRate}%</td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{c.costPerQualified > 0 ? `$${c.costPerQualified.toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* A/B Testing Section */}
      <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[0.82rem] font-medium text-gray-900">A/B Tests</span>
            <span className="text-[0.72rem] text-gray-400 ml-2">Compare campaign performance</span>
          </div>
          <button
            onClick={() => setShowCreateAB(!showCreateAB)}
            className="flex items-center gap-1 text-[0.75rem] text-[#2563EB] hover:text-[#1D4ED8] font-medium bg-transparent border-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Test
          </button>
        </div>

        {/* Create A/B test inline form */}
        {showCreateAB && (
          <div className="border border-blue-100 bg-blue-50/30 rounded-[8px] p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.72rem] text-gray-500 mb-1">Test Name</label>
                <input
                  type="text" value={abName} onChange={e => setAbName(e.target.value)}
                  placeholder="e.g. Script comparison Q1"
                  className="w-full px-3 py-2 text-[0.82rem] border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[0.72rem] text-gray-500 mb-1">Test Variable</label>
                <select
                  value={abVariable} onChange={e => setAbVariable(e.target.value)}
                  className="w-full px-3 py-2 text-[0.82rem] border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                >
                  <option value="script">Script</option>
                  <option value="time">Calling Time</option>
                  <option value="channel">Channel</option>
                  <option value="voicemail">Voicemail</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.72rem] text-gray-500 mb-1">Campaign A</label>
                <select
                  value={abCampaignA} onChange={e => setAbCampaignA(e.target.value)}
                  className="w-full px-3 py-2 text-[0.82rem] border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                >
                  <option value="">Select campaign...</option>
                  {campaigns.filter(c => c.id !== abCampaignB).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[0.72rem] text-gray-500 mb-1">Campaign B</label>
                <select
                  value={abCampaignB} onChange={e => setAbCampaignB(e.target.value)}
                  className="w-full px-3 py-2 text-[0.82rem] border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                >
                  <option value="">Select campaign...</option>
                  {campaigns.filter(c => c.id !== abCampaignA).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[0.72rem] text-gray-500 mb-1">Variant A Label</label>
                <input
                  type="text" value={abLabelA} onChange={e => setAbLabelA(e.target.value)}
                  placeholder="e.g. Standard script"
                  className="w-full px-3 py-2 text-[0.82rem] border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[0.72rem] text-gray-500 mb-1">Variant B Label</label>
                <input
                  type="text" value={abLabelB} onChange={e => setAbLabelB(e.target.value)}
                  placeholder="e.g. Personalized script"
                  className="w-full px-3 py-2 text-[0.82rem] border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCreateABTest}
                disabled={abCreating}
                className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-4 py-2 text-[0.78rem] font-medium cursor-pointer disabled:opacity-50 transition-colors"
              >
                {abCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Create Test
              </button>
              <button
                onClick={() => setShowCreateAB(false)}
                className="text-[0.78rem] text-gray-500 hover:text-gray-700 bg-transparent border-0 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* A/B test list */}
        {abLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-[0.82rem] py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading tests...
          </div>
        ) : abTests.length === 0 ? (
          <div className="text-center text-gray-400 text-[0.82rem] py-6">
            No A/B tests yet. Create one to compare campaign performance.
          </div>
        ) : (
          <div className="space-y-3">
            {abTests.map(test => (
              <div key={test.id} className="border border-gray-100 rounded-[8px] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.82rem] font-medium text-gray-900">{test.name}</span>
                    <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full ${
                      test.status === 'RUNNING' ? 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]'
                      : test.status === 'COMPLETED' ? 'text-[rgba(5,14,36,0.5)] bg-[rgba(5,14,36,0.04)]'
                      : 'text-[#EF4444] bg-[rgba(239,68,68,0.06)]'
                    }`}>
                      {test.status}
                    </span>
                    <span className="text-[0.68rem] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{test.testVariable}</span>
                  </div>
                  <span className="text-[0.68rem] text-gray-400">{formatDate(test.createdAt)}</span>
                </div>

                {/* Variant comparison */}
                {test.campaignA && test.campaignB && test.liveStats && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`border rounded-[8px] p-3 ${test.liveStats.winner === 'A' ? 'border-[#2563EB]/30 bg-[rgba(37,99,235,0.04)]' : 'border-gray-100'}`}>
                      <div className="text-[0.72rem] text-gray-500 mb-1">A: {test.variantALabel}</div>
                      <div className="text-[0.68rem] text-gray-400 truncate mb-2">{test.campaignA.name}</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[1.1rem] font-semibold text-gray-900">{(test.liveStats.rateA * 100).toFixed(1)}%</span>
                        <span className="text-[0.68rem] text-gray-400">qual rate</span>
                      </div>
                      <div className="text-[0.68rem] text-gray-400 mt-1">
                        {test.campaignA.qualified}/{test.campaignA.callsCompleted} calls
                      </div>
                    </div>
                    <div className={`border rounded-[8px] p-3 ${test.liveStats.winner === 'B' ? 'border-[#2563EB]/30 bg-[rgba(37,99,235,0.04)]' : 'border-gray-100'}`}>
                      <div className="text-[0.72rem] text-gray-500 mb-1">B: {test.variantBLabel}</div>
                      <div className="text-[0.68rem] text-gray-400 truncate mb-2">{test.campaignB.name}</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[1.1rem] font-semibold text-gray-900">{(test.liveStats.rateB * 100).toFixed(1)}%</span>
                        <span className="text-[0.68rem] text-gray-400">qual rate</span>
                      </div>
                      <div className="text-[0.68rem] text-gray-400 mt-1">
                        {test.campaignB.qualified}/{test.campaignB.callsCompleted} calls
                      </div>
                    </div>
                  </div>
                )}

                {/* Significance bar */}
                {test.liveStats && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-[6px] bg-[rgba(5,14,36,0.06)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${test.liveStats.isSignificant ? 'bg-[#2563EB]' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(test.liveStats.confidence, 100)}%` }}
                      />
                    </div>
                    <span className={`text-[0.72rem] font-medium ${test.liveStats.isSignificant ? 'text-[#2563EB]' : 'text-amber-600'}`}>
                      {test.liveStats.confidence.toFixed(1)}% confidence
                    </span>
                    {test.liveStats.isSignificant ? (
                      <span className="text-[0.68rem] text-[#2563EB] font-medium">Significant</span>
                    ) : test.liveStats.samplesNeeded > 0 ? (
                      <span className="text-[0.65rem] text-gray-400">~{test.liveStats.samplesNeeded} more samples needed</span>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Conversation Intelligence ──────────────────────────────── */}
      <div className="border border-[rgba(5,14,36,0.06)] rounded-[10px] p-5 bg-white">
        <h3 className="text-[0.92rem] font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" /> Conversation Intelligence
        </h3>

        {intelLoading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing call data...
          </div>
        )}

        {!intelLoading && !intel?.summary && (
          <p className="text-[0.78rem] text-gray-400 py-4">{intel?.message || 'Not enough calls analyzed yet. Intelligence appears after calls are processed.'}</p>
        )}

        {!intelLoading && intel?.summary && (
          <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="border border-gray-100 rounded-[8px] p-3 text-center">
                <div className={`text-[1.3rem] font-bold ${intel.summary.avgSentiment > 20 ? 'text-[#2563EB]' : intel.summary.avgSentiment < -20 ? 'text-red-600' : 'text-amber-600'}`}>
                  {intel.summary.avgSentiment > 0 ? '+' : ''}{intel.summary.avgSentiment}
                </div>
                <div className="text-[0.68rem] text-gray-400 mt-0.5">Avg Sentiment</div>
              </div>
              <div className="border border-gray-100 rounded-[8px] p-3 text-center">
                <div className="text-[1.3rem] font-bold text-gray-900">{intel.summary.avgEngagement}</div>
                <div className="text-[0.68rem] text-gray-400 mt-0.5">Engagement</div>
              </div>
              <div className="border border-gray-100 rounded-[8px] p-3 text-center">
                <div className="text-[1.3rem] font-bold text-violet-600 capitalize">{intel.summary.avgBuyingIntent}</div>
                <div className="text-[0.68rem] text-gray-400 mt-0.5">Buying Intent</div>
              </div>
              <div className="border border-gray-100 rounded-[8px] p-3 text-center">
                <div className="text-[1.3rem] font-bold text-gray-900">{intel.summary.avgTalkRatio?.ai}%</div>
                <div className="text-[0.68rem] text-gray-400 mt-0.5">AI Talk Ratio</div>
                <div className={`text-[0.62rem] mt-0.5 ${intel.summary.avgTalkRatio?.ai <= 45 ? 'text-[#2563EB]' : 'text-amber-500'}`}>
                  {intel.summary.avgTalkRatio?.ai <= 45 ? 'Ideal' : 'Too high'}
                </div>
              </div>
              <div className="border border-gray-100 rounded-[8px] p-3 text-center">
                <div className="text-[1.3rem] font-bold text-gray-900">{intel.summary.totalCallsAnalyzed}</div>
                <div className="text-[0.68rem] text-gray-400 mt-0.5">Calls Analyzed</div>
              </div>
            </div>

            {/* Sentiment distribution */}
            {intel.sentimentDistribution && (
              <div>
                <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Sentiment Distribution</h4>
                <div className="flex h-3 rounded-full overflow-hidden">
                  {intel.sentimentDistribution.positive > 0 && <div className="bg-[#2563EB]/60" style={{ width: `${intel.sentimentDistribution.positive}%` }} title={`Positive: ${intel.sentimentDistribution.positive}%`} />}
                  {intel.sentimentDistribution.neutral > 0 && <div className="bg-gray-300" style={{ width: `${intel.sentimentDistribution.neutral}%` }} title={`Neutral: ${intel.sentimentDistribution.neutral}%`} />}
                  {intel.sentimentDistribution.mixed > 0 && <div className="bg-amber-300" style={{ width: `${intel.sentimentDistribution.mixed}%` }} title={`Mixed: ${intel.sentimentDistribution.mixed}%`} />}
                  {intel.sentimentDistribution.negative > 0 && <div className="bg-red-400" style={{ width: `${intel.sentimentDistribution.negative}%` }} title={`Negative: ${intel.sentimentDistribution.negative}%`} />}
                </div>
                <div className="flex justify-between mt-1 text-[0.65rem] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2563EB]/60 inline-block" />{intel.sentimentDistribution.positive}% Positive</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />{intel.sentimentDistribution.neutral}% Neutral</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300 inline-block" />{intel.sentimentDistribution.mixed}% Mixed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{intel.sentimentDistribution.negative}% Negative</span>
                </div>
              </div>
            )}

            {/* Buying signals & objections side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top buying signals */}
              {intel.topBuyingSignals?.length > 0 && (
                <div>
                  <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Top Buying Signals</h4>
                  <div className="space-y-1.5">
                    {intel.topBuyingSignals.slice(0, 5).map((sig: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[0.75rem]">
                        <span className="text-gray-600 truncate flex-1">{sig.signal}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-gray-400">{sig.count}x</span>
                          <span className={`font-medium ${sig.conversionRate > 60 ? 'text-[#2563EB]' : sig.conversionRate > 30 ? 'text-amber-600' : 'text-gray-500'}`}>
                            {sig.conversionRate}% conv
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top objections */}
              {intel.topObjections?.length > 0 && (
                <div>
                  <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Top Objections</h4>
                  <div className="space-y-1.5">
                    {intel.topObjections.slice(0, 5).map((obj: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[0.75rem]">
                        <div className="flex items-center gap-1.5 truncate flex-1">
                          <span className={`text-[0.62rem] px-1 py-0.5 rounded font-medium ${
                            obj.category === 'price' ? 'text-orange-700 bg-orange-50' :
                            obj.category === 'trust' ? 'text-red-700 bg-red-50' :
                            obj.category === 'timing' ? 'text-blue-700 bg-blue-50' :
                            'text-gray-600 bg-gray-100'
                          }`}>{obj.category}</span>
                          <span className="text-gray-600 truncate">{obj.objection}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-gray-400">{obj.count}x</span>
                          <span className={`font-medium ${obj.handleRate > 50 ? 'text-[#2563EB]' : 'text-red-500'}`}>
                            {obj.handleRate}% handled
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Talk ratio visual */}
            <div>
              <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Talk Ratio</h4>
              <div className="relative">
                <div className="flex h-5 rounded-full overflow-hidden">
                  <div className="bg-[#2563EB] flex items-center justify-center" style={{ width: `${intel.summary.avgTalkRatio?.ai || 0}%` }}>
                    <span className="text-[0.6rem] text-white font-medium">AI {intel.summary.avgTalkRatio?.ai}%</span>
                  </div>
                  <div className="bg-[#93C5FD] flex items-center justify-center" style={{ width: `${intel.summary.avgTalkRatio?.buyer || 0}%` }}>
                    <span className="text-[0.6rem] text-white font-medium">Buyer {intel.summary.avgTalkRatio?.buyer}%</span>
                  </div>
                </div>
                {/* Ideal zone marker */}
                <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-gray-600" style={{ left: '40%' }} title="Ideal AI talk: 35-45%">
                  <span className="absolute -top-4 -translate-x-1/2 text-[0.58rem] text-gray-400">Ideal zone</span>
                </div>
              </div>
            </div>

            {/* Competitor mentions */}
            {intel.competitorMentions?.length > 0 && (
              <div>
                <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Competitor Mentions</h4>
                <div className="flex flex-wrap gap-2">
                  {intel.competitorMentions.map((c: any, i: number) => (
                    <span key={i} className={`text-[0.72rem] px-2.5 py-1 rounded-full border ${
                      c.sentiment === 'positive' ? 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[rgba(37,99,235,0.2)]' :
                      c.sentiment === 'negative' ? 'text-red-700 bg-red-50 border-red-200' :
                      'text-gray-600 bg-gray-50 border-gray-200'
                    }`}>
                      {c.competitor} <span className="text-gray-400">({c.count}x)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Script optimization suggestions */}
            {intel.scriptPerformance?.topSuggestions?.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Script Optimization
                  {intel.scriptPerformance.avgEffectiveness != null && (
                    <span className="text-[0.68rem] text-gray-400 font-normal ml-2">Avg effectiveness: {intel.scriptPerformance.avgEffectiveness}/100</span>
                  )}
                </h4>
                <div className="space-y-2">
                  {intel.scriptPerformance.topSuggestions.map((s: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50/50 border border-amber-100 rounded-[8px]">
                      <span className={`text-[0.62rem] font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                        s.priority === 'high' ? 'text-red-700 bg-red-100' : s.priority === 'medium' ? 'text-amber-700 bg-amber-100' : 'text-gray-600 bg-gray-100'
                      }`}>{s.priority}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.75rem] text-gray-700">{s.suggestion}</p>
                        <p className="text-[0.65rem] text-gray-400 mt-0.5">{s.count} call(s) surfaced this</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement trend */}
            {intel.engagementTrend?.length > 3 && (
              <div>
                <h4 className="text-[0.78rem] font-medium text-gray-700 mb-2">Engagement Trend (30 days)</h4>
                <div className="flex items-end gap-0.5 h-16">
                  {intel.engagementTrend.map((d: any, i: number) => (
                    <div
                      key={i}
                      className="flex-1 bg-violet-400 rounded-t hover:bg-violet-500 transition-colors"
                      style={{ height: `${d.avgEngagement}%` }}
                      title={`${d.date}: ${d.avgEngagement}/100`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[0.58rem] text-gray-400 mt-1">
                  <span>{intel.engagementTrend[0]?.date?.slice(5)}</span>
                  <span>{intel.engagementTrend[intel.engagementTrend.length - 1]?.date?.slice(5)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   INBOUND TAB
   ═══════════════════════════════════════════════════════════════════════════ */

interface InboundCallEntry {
  id: string
  callSid: string
  fromPhone: string
  buyerId: string | null
  buyerName: string | null
  identified: boolean
  routedTo: string
  status: string
  duration: number | null
  outcome: string | null
  recordingUrl: string | null
  notes: string | null
  createdAt: string
  buyer: { id: string; firstName: string | null; lastName: string | null; entityName: string | null; phone: string | null; buyerScore: number; status: string } | null
}

function InboundTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [calls, setCalls] = useState<InboundCallEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [missedCount, setMissedCount] = useState(0)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterIdentified, setFilterIdentified] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)

  // Settings state
  const [configAutoAnswer, setConfigAutoAnswer] = useState(false)
  const [configForwardNumber, setConfigForwardNumber] = useState('')
  const [configAiUnknown, setConfigAiUnknown] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterIdentified) params.set('identified', filterIdentified)
      params.set('limit', '50')
      const res = await fetch(`/api/outreach/inbound?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCalls(data.data?.calls || [])
      setTotal(data.data?.total || 0)
      setMissedCount(data.data?.missedCount || 0)
    } catch { addToast('Failed to load inbound calls', 'error') }
    finally { setLoading(false) }
  }, [filterStatus, filterIdentified, addToast])

  useEffect(() => { fetchCalls() }, [fetchCalls])

  // Load config on mount
  useEffect(() => {
    fetch('/api/outreach/inbound/config')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const c = json?.data?.config
        if (c) {
          setConfigAutoAnswer(c.autoAnswer || false)
          setConfigForwardNumber(c.forwardNumber || '')
          setConfigAiUnknown(c.aiAnswerUnknown || false)
        }
      })
      .catch(() => {})
  }, [])

  const saveConfig = async () => {
    setSavingConfig(true)
    try {
      const res = await fetch('/api/outreach/inbound/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoAnswer: configAutoAnswer,
          forwardNumber: configForwardNumber || null,
          aiAnswerUnknown: configAiUnknown,
        }),
      })
      if (!res.ok) throw new Error()
      addToast('Settings saved', 'success')
      setShowSettings(false)
    } catch { addToast('Failed to save settings', 'error') }
    finally { setSavingConfig(false) }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

  const formatDuration = (secs: number | null) => {
    if (!secs) return '--'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const ROUTE_BADGES: Record<string, { label: string; color: string }> = {
    ai: { label: 'AI', color: 'text-violet-700 bg-violet-50' },
    wholesaler: { label: 'Forwarded', color: 'text-blue-700 bg-blue-50' },
    voicemail: { label: 'Voicemail', color: 'text-amber-700 bg-amber-50' },
    missed: { label: 'Missed', color: 'text-red-700 bg-red-50' },
  }

  const getBuyerName = (c: InboundCallEntry) => {
    if (c.buyer?.firstName || c.buyer?.lastName) return `${c.buyer.firstName || ''} ${c.buyer.lastName || ''}`.trim()
    if (c.buyer?.entityName) return c.buyer.entityName
    if (c.buyerName) return c.buyerName
    return c.fromPhone
  }

  return (
    <div>
      {/* Header with settings */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-[0.78rem] text-gray-500">{total} inbound calls</p>
          {missedCount > 0 && (
            <span className="text-[0.72rem] font-medium px-2 py-0.5 rounded-full text-red-700 bg-red-50">
              {missedCount} missed
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[0.78rem] font-medium text-gray-600 border border-[rgba(5,14,36,0.06)] rounded-[10px] hover:border-gray-300 cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" /> Settings
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mb-4 border border-[rgba(5,14,36,0.06)] rounded-[10px] p-4 bg-white space-y-3">
          <h4 className="text-[0.82rem] font-medium text-gray-900">Inbound Call Settings</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={configAutoAnswer} onChange={e => setConfigAutoAnswer(e.target.checked)} className="rounded border-gray-300" />
            <span className="text-[0.78rem] text-gray-700">Let AI answer calls from known buyers</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={configAiUnknown} onChange={e => setConfigAiUnknown(e.target.checked)} className="rounded border-gray-300" />
            <span className="text-[0.78rem] text-gray-700">AI answer calls from unknown numbers</span>
          </label>
          <div>
            <label className="text-[0.72rem] text-gray-500 mb-1 block">Forward calls to your phone</label>
            <input value={configForwardNumber} onChange={e => setConfigForwardNumber(e.target.value)} placeholder="(555) 123-4567"
              className="bg-white border border-[#D1D5DB] rounded-md px-3 py-1.5 text-[0.82rem] outline-none focus:border-[#2563EB] w-48" />
          </div>
          <div className="flex justify-end">
            <button onClick={saveConfig} disabled={savingConfig}
              className="px-4 py-1.5 bg-[#2563EB] text-white text-[0.78rem] font-medium rounded-[8px] hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer">
              {savingConfig ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[{ v: '', l: 'All' }, { v: 'completed', l: 'Answered' }, { v: 'missed', l: 'Missed' }].map(f => (
          <button key={f.v} onClick={() => setFilterStatus(f.v)}
            className={`px-3 py-1.5 text-[14px] rounded-full border cursor-pointer transition-colors ${
              filterStatus === f.v ? 'font-semibold border-[#2563EB] text-[#2563EB] bg-[rgba(37,99,235,0.06)]' : 'font-normal border-[rgba(5,14,36,0.06)] text-[rgba(5,14,36,0.45)] bg-transparent hover:bg-gray-50'
            }`}>
            {f.l}
          </button>
        ))}
        <span className="text-gray-300">|</span>
        {[{ v: '', l: 'All Callers' }, { v: 'true', l: 'Known' }, { v: 'false', l: 'Unknown' }].map(f => (
          <button key={f.v} onClick={() => setFilterIdentified(f.v)}
            className={`px-3 py-1.5 text-[14px] rounded-full border cursor-pointer transition-colors ${
              filterIdentified === f.v ? 'font-semibold border-[#2563EB] text-[#2563EB] bg-[rgba(37,99,235,0.06)]' : 'font-normal border-[rgba(5,14,36,0.06)] text-[rgba(5,14,36,0.45)] bg-transparent hover:bg-gray-50'
            }`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading inbound calls...
        </div>
      )}

      {!loading && calls.length === 0 && (
        <div className="text-center py-16">
          <PhoneCall className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-[0.85rem] text-gray-500 mb-1">No inbound calls yet</p>
          <p className="text-[0.75rem] text-gray-400">When buyers call your Twilio number, they'll appear here with caller identification.</p>
        </div>
      )}

      {!loading && calls.length > 0 && (
        <div className="space-y-2">
          {calls.map(c => {
            const rb = ROUTE_BADGES[c.routedTo] || ROUTE_BADGES.missed
            return (
              <div key={c.id} className={`border rounded-[8px] p-4 bg-white transition-colors ${c.status === 'missed' ? 'border-red-200 bg-red-50/20' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[0.85rem] font-medium text-gray-900 truncate">{getBuyerName(c)}</span>
                      {c.identified && (
                        <span className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full text-[#2563EB] bg-[rgba(37,99,235,0.08)]">Known Buyer</span>
                      )}
                      {!c.identified && (
                        <span className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full text-gray-500 bg-gray-100">Unknown</span>
                      )}
                      <span className={`text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full ${rb.color}`}>{rb.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[0.75rem] text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(c.createdAt)}</span>
                      <span>{formatDuration(c.duration)}</span>
                      {c.buyer?.buyerScore != null && c.buyer.buyerScore > 0 && (
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />Score: {c.buyer.buyerScore}</span>
                      )}
                      {c.outcome && <span className="text-[0.68rem] font-medium text-gray-500">{c.outcome}</span>}
                    </div>
                    {c.notes && <p className="text-[0.72rem] text-gray-400 mt-1 truncate">{c.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!c.identified && c.status === 'completed' && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/outreach/inbound/${c.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
                            if (!res.ok) { const d = await res.json().catch(() => ({})); addToast(d.error || 'Failed to add to CRM', 'error'); return }
                            const data = await res.json()
                            addToast(data.data?.linked ? 'Linked to existing buyer' : 'Buyer added to CRM', 'success')
                            fetchCalls()
                          } catch { addToast('Failed to add to CRM', 'error') }
                        }}
                        className="px-2.5 py-1 rounded-md text-[0.72rem] font-medium text-[#2563EB] bg-blue-50 hover:bg-blue-100 cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3 inline mr-1" />Add to CRM
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   VOICEMAILS TAB
   ═══════════════════════════════════════════════════════════════════════════ */

interface VoicemailEntry {
  id: string
  name: string
  category: string
  source: string
  ttsText?: string | null
  estimatedDuration?: number | null
  duration?: number | null
  useCount: number
  callbackRate: number | null
  isDefault: boolean
  bestFor?: string | null
  createdAt: string | null
}

function VoicemailsTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [voicemails, setVoicemails] = useState<VoicemailEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('custom')
  const [newTtsText, setNewTtsText] = useState('')
  const [creating, setCreating] = useState(false)
  const [previewText, setPreviewText] = useState<string | null>(null)

  const fetchVoicemails = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/outreach/voicemails')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setVoicemails(data.data?.voicemails || [])
    } catch { addToast('Failed to load voicemails', 'error') }
    finally { setLoading(false) }
  }, [addToast])

  useEffect(() => { fetchVoicemails() }, [fetchVoicemails])

  const handleCreate = async () => {
    if (!newName.trim() || !newTtsText.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/outreach/voicemails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, category: newCategory, ttsText: newTtsText }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      addToast('Voicemail created', 'success')
      setShowCreate(false)
      setNewName(''); setNewTtsText(''); setNewCategory('custom')
      fetchVoicemails()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create voicemail', 'error')
    } finally { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/outreach/voicemails/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      addToast('Voicemail deleted', 'success')
      fetchVoicemails()
    } catch { addToast('Failed to delete', 'error') }
  }

  const handlePreview = async (vm: VoicemailEntry) => {
    try {
      const res = await fetch(`/api/outreach/voicemails/${vm.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.headers.get('content-type')?.includes('audio')) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.play()
        addToast('Playing preview...', 'info')
      } else {
        const data = await res.json()
        setPreviewText(data.data?.text || vm.ttsText || 'No preview available')
      }
    } catch { setPreviewText(vm.ttsText || 'No preview available') }
  }

  const CATEGORY_LABELS: Record<string, string> = {
    introduction: 'Introduction', deal_alert: 'Deal Alert', follow_up: 'Follow Up',
    reactivation: 'Reactivation', custom: 'Custom',
  }

  const callbackRateColor = (rate: number | null) => {
    if (rate === null) return 'text-gray-400'
    if (rate > 5) return 'text-[#2563EB]'
    if (rate >= 2) return 'text-amber-600'
    return 'text-red-500'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[0.78rem] text-gray-500">{voicemails.length} voicemail recordings</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white text-[0.78rem] font-medium rounded-[8px] hover:bg-[#1D4ED8] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> New Voicemail
        </button>
      </div>

      {/* Preview modal */}
      {previewText && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-[8px] p-3 relative">
          <button onClick={() => setPreviewText(null)} className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 cursor-pointer"><X className="w-4 h-4" /></button>
          <p className="text-[0.72rem] text-blue-500 font-medium mb-1">Preview (with sample data)</p>
          <p className="text-[0.8rem] text-blue-900 leading-relaxed">{previewText}</p>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 border border-[rgba(5,14,36,0.06)] rounded-[10px] p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[0.82rem] font-medium text-gray-900">New Voicemail (Text-to-Speech)</span>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Voicemail name"
              className="bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB]" />
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
              className="bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB]">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <textarea value={newTtsText} onChange={e => setNewTtsText(e.target.value)} rows={4}
            placeholder="Type the voicemail message. Use {{buyerName}}, {{agentName}}, {{companyName}}, {{market}}, {{callbackNumber}}, {{propertyType}} for merge fields."
            className="w-full bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.82rem] outline-none focus:border-[#2563EB] resize-none" />
          <div className="flex items-center justify-between">
            <span className="text-[0.72rem] text-gray-400">
              ~{newTtsText ? Math.round((newTtsText.split(/\s+/).length / 150) * 60) : 0}s estimated
            </span>
            <button onClick={handleCreate} disabled={creating || !newName.trim() || !newTtsText.trim()}
              className="px-4 py-1.5 bg-[#2563EB] text-white text-[0.78rem] font-medium rounded-[8px] hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer">
              {creating ? 'Saving...' : 'Save Voicemail'}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading voicemails...
        </div>
      )}

      {!loading && voicemails.length === 0 && (
        <div className="text-center py-16">
          <Voicemail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-[0.85rem] text-gray-500 mb-1">No voicemail recordings</p>
          <p className="text-[0.75rem] text-gray-400">Create TTS-based voicemails or upload audio recordings for your campaigns.</p>
        </div>
      )}

      {!loading && voicemails.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {voicemails.map(vm => (
            <div key={vm.id} className="border border-[rgba(5,14,36,0.06)] rounded-[10px] p-3.5 bg-white hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-[0.82rem] font-medium text-gray-900">{vm.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full text-gray-600 bg-gray-100">
                      {CATEGORY_LABELS[vm.category] || vm.category}
                    </span>
                    <span className="text-[0.65rem] text-gray-400">
                      {vm.source === 'system' ? 'System' : 'Custom'}
                    </span>
                    <span className="text-[0.65rem] text-gray-400">
                      ~{vm.estimatedDuration || vm.duration || '?'}s
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handlePreview(vm)} className="p-1.5 rounded-md text-gray-400 hover:text-[#2563EB] hover:bg-blue-50 cursor-pointer" title="Preview">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  {vm.source !== 'system' && (
                    <button onClick={() => handleDelete(vm.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {vm.bestFor && <p className="text-[0.72rem] text-gray-400 mb-2">{vm.bestFor}</p>}
              <div className="flex items-center gap-4 text-[0.72rem]">
                <span className="text-gray-500">Used: {vm.useCount}x</span>
                {vm.callbackRate !== null && (
                  <span className={callbackRateColor(vm.callbackRate)}>
                    Callback: {vm.callbackRate.toFixed(1)}%
                  </span>
                )}
                {vm.isDefault && <span className="text-[#2563EB] font-medium">Default</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALLBACKS TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function CallbacksTab({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  const [callbacks, setCallbacks] = useState<ScheduledCallbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('scheduled')
  const [total, setTotal] = useState(0)

  const fetchCallbacks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', '50')
      const res = await fetch(`/api/outreach/callbacks?${params}`)
      if (!res.ok) throw new Error('Failed to load callbacks')
      const data = await res.json()
      setCallbacks(data.data?.callbacks || [])
      setTotal(data.data?.total || 0)
    } catch {
      addToast('Failed to load callbacks', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, addToast])

  useEffect(() => { fetchCallbacks() }, [fetchCallbacks])

  const updateCallback = async (id: string, update: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/outreach/callbacks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
      addToast('Callback updated', 'success')
      fetchCallbacks()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update callback', 'error')
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const isOverdue = (iso: string) => new Date(iso) < new Date()

  const SOURCE_LABELS: Record<string, string> = {
    buyer_request: 'Buyer Request',
    ai_detected: 'AI Detected',
    manual: 'Manual',
    auto_retry: 'Auto Retry',
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        {['scheduled', 'completed', 'missed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-[14px] rounded-full border cursor-pointer transition-colors ${
              statusFilter === s
                ? 'font-semibold border-[#2563EB] text-[#2563EB] bg-[rgba(37,99,235,0.06)]'
                : 'font-normal border-[rgba(5,14,36,0.06)] text-[rgba(5,14,36,0.45)] bg-transparent hover:bg-gray-50'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-[0.75rem] text-gray-400">{total} total</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading callbacks...
        </div>
      )}

      {/* Empty state */}
      {!loading && callbacks.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-[0.85rem] text-gray-500 mb-1">No {statusFilter} callbacks</p>
          <p className="text-[0.75rem] text-gray-400">
            Callbacks are automatically created when buyers request a call back during a campaign.
          </p>
        </div>
      )}

      {/* Callbacks list */}
      {!loading && callbacks.length > 0 && (
        <div className="space-y-2">
          {callbacks.map(cb => {
            const overdue = cb.status === 'scheduled' && isOverdue(cb.scheduledAt)
            return (
              <div
                key={cb.id}
                className={`border rounded-[8px] p-4 bg-white transition-colors ${
                  overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: buyer + schedule info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[0.85rem] font-medium text-gray-900 truncate">
                        {cb.buyer?.firstName || cb.buyer?.lastName
                          ? `${cb.buyer.firstName || ''} ${cb.buyer.lastName || ''}`.trim()
                          : cb.buyer?.entityName || 'Unknown Buyer'}
                      </span>
                      <span className={`text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full ${
                        cb.source === 'ai_detected' ? 'text-violet-700 bg-violet-50' :
                        cb.source === 'buyer_request' ? 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]' :
                        cb.source === 'auto_retry' ? 'text-amber-700 bg-amber-50' :
                        'text-gray-600 bg-gray-100'
                      }`}>
                        {SOURCE_LABELS[cb.source] || cb.source}
                      </span>
                      {cb.withinCallingHours && cb.status === 'scheduled' && (
                        <span className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full text-[#2563EB] bg-[rgba(37,99,235,0.08)]">
                          Callable Now
                        </span>
                      )}
                      {overdue && (
                        <span className="text-[0.65rem] font-medium px-1.5 py-0.5 rounded-full text-red-700 bg-red-50">
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[0.75rem] text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTime(cb.scheduledAt)}
                      </span>
                      {cb.buyer?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {cb.buyer.phone}
                        </span>
                      )}
                      {cb.buyer?.buyerScore != null && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Score: {cb.buyer.buyerScore}
                        </span>
                      )}
                    </div>
                    {cb.reason && (
                      <p className="text-[0.75rem] text-gray-400 mt-1 truncate">{cb.reason}</p>
                    )}
                    {cb.notes && (
                      <p className="text-[0.72rem] text-gray-400 mt-0.5 italic truncate">{cb.notes}</p>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {cb.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => updateCallback(cb.id, { status: 'completed' })}
                          className="p-1.5 rounded-md text-[#2563EB] hover:bg-[rgba(37,99,235,0.08)] cursor-pointer"
                          title="Mark completed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateCallback(cb.id, { status: 'cancelled' })}
                          className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 cursor-pointer"
                          title="Cancel"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {cb.status === 'missed' && (
                      <button
                        onClick={() => {
                          // Reschedule to 1 hour from now
                          const newTime = new Date(Date.now() + 60 * 60 * 1000)
                          updateCallback(cb.id, { status: 'scheduled', scheduledAt: newTime.toISOString() })
                        }}
                        className="px-2.5 py-1 rounded-md text-[0.72rem] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 inline mr-1" />
                        Reschedule
                      </button>
                    )}
                    {cb.status === 'completed' && cb.completedAt && (
                      <span className="text-[0.72rem] text-gray-400">
                        Completed {formatTime(cb.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN AI OUTREACH PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AIOutreachPage() {
  const [subTab, setSubTab] = useState<SubTab>('campaigns')
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [preselectedContactIds, setPreselectedContactIds] = useState<string[]>([])
  const [toasts, setToasts] = useState<ToastData[]>([])

  // Campaign list state
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sort, setSort] = useState<SortOption>('newest')

  // Campaign detail
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null)

  // Call detail slide-over
  const [detailCallId, setDetailCallId] = useState<string | null>(null)

  // Power dialer
  const [dialerBuyers, setDialerBuyers] = useState<DialerBuyer[] | null>(null)
  const [dialerCampaignId, setDialerCampaignId] = useState<string | undefined>()

  // Auto-open campaign creation from URL params (e.g. from CRM bulk action)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('action') === 'create') {
      const contactIds = params.get('contactIds')?.split(',').filter(Boolean) ?? []
      const buyerId = params.get('buyerId')
      if (buyerId) contactIds.push(buyerId)
      if (contactIds.length > 0) {
        setPreselectedContactIds(contactIds)
      }
      setShowNewCampaign(true)
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Toast helpers
  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])
  const dismissToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      params.set('sort', sort)
      params.set('limit', '50')
      const res = await fetch(`/api/outreach/campaigns?${params}`)
      if (!res.ok) throw new Error('Failed to load campaigns')
      const json = await res.json()
      setCampaigns(json.campaigns)
      setCampaignsError(null)
    } catch (e: unknown) {
      setCampaignsError(e instanceof Error ? e.message : 'Failed to load campaigns')
    } finally {
      setCampaignsLoading(false)
    }
  }, [statusFilter, sort])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  // Campaign actions
  const handleCampaignAction = useCallback(async (id: string, action: string) => {
    try {
      if (action === 'launch' || action === 'resume') {
        const res = await fetch(`/api/outreach/campaigns/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'RUNNING' }),
        })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed') }
        addToast(action === 'launch' ? 'Campaign launched!' : 'Campaign resumed', 'success')
      } else if (action === 'pause') {
        const res = await fetch(`/api/outreach/campaigns/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PAUSED' }),
        })
        if (!res.ok) throw new Error('Failed to pause')
        addToast('Campaign paused', 'info')
      } else if (action === 'cancel') {
        const res = await fetch(`/api/outreach/campaigns/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        })
        if (!res.ok) throw new Error('Failed to cancel')
        addToast('Campaign cancelled', 'info')
      } else if (action === 'delete') {
        const res = await fetch(`/api/outreach/campaigns/${id}`, { method: 'DELETE' })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to delete') }
        addToast('Campaign deleted', 'success')
      } else if (action === 'duplicate') {
        addToast('Duplicate will pre-fill the New Campaign modal (coming soon)', 'info')
        return
      }
      fetchCampaigns()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Action failed', 'error')
    }
  }, [addToast, fetchCampaigns])

  // Stats bar computed from campaigns
  const activeCampaigns = campaigns.filter(c => c.status === 'RUNNING').length
  const totalCalls = campaigns.reduce((s, c) => s + c.callsCompleted, 0)
  const totalQualified = campaigns.reduce((s, c) => s + c.qualified, 0)
  const totalConnected = campaigns.reduce((s, c) => s + c.qualified + c.notBuying, 0)
  const avgQualRate = totalConnected > 0 ? Math.round((totalQualified / totalConnected) * 100) : 0

  const isDetailView = !!detailCampaignId

  const tabs = [
    { key: 'campaigns' as SubTab, label: 'Campaigns', icon: Layers },
    { key: 'calllog' as SubTab, label: 'Call Log', icon: Phone },
    { key: 'callbacks' as SubTab, label: 'Callbacks', icon: Calendar },
    { key: 'voicemails' as SubTab, label: 'Voicemails', icon: Voicemail },
    { key: 'inbound' as SubTab, label: 'Inbound', icon: PhoneCall },
    { key: 'sms' as SubTab, label: 'SMS Inbox', icon: MessageSquare },
    { key: 'live' as SubTab, label: 'Live Monitor', icon: Radio },
    { key: 'analytics' as SubTab, label: 'Analytics', icon: TrendingUp },
  ]

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]" data-tour="outreach-content">
      {/* Vercel-style top tab bar */}
      {!isDetailView && (
        <div
          className="flex-shrink-0 bg-white"
          style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}
        >
          <div className="px-8">
            <div className="flex items-center justify-between">
              <nav className="flex gap-0.5 -mb-px">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = subTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setSubTab(tab.key)}
                      style={{
                        fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                        fontSize: '13px',
                        fontWeight: isActive ? 550 : 420,
                        letterSpacing: '-0.005em',
                      }}
                      className={`relative flex items-center gap-1.5 px-3 py-3 cursor-pointer border-0 bg-transparent transition-all ${
                        isActive
                          ? 'text-[#0B1224]'
                          : 'text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.7)]'
                      }`}
                    >
                      <Icon
                        className="flex-shrink-0"
                        style={{
                          width: 14,
                          height: 14,
                          strokeWidth: isActive ? 2 : 1.6,
                          color: isActive ? '#2563EB' : 'rgba(5,14,36,0.3)',
                          transition: 'color 0.18s ease',
                        }}
                      />
                      {tab.label}
                      {isActive && (
                        <div style={{ position: 'absolute', bottom: -1, left: 12, right: 12, height: 2, borderRadius: 1, background: '#2563EB' }} />
                      )}
                    </button>
                  )
                })}
              </nav>
              <button
                onClick={() => setShowNewCampaign(true)}
                className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-3 py-1.5 text-[0.78rem] font-medium cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" /> New Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 max-w-[1200px] flex-1 overflow-auto">
      {/* Stats bar */}
      <div className="flex items-center gap-6 bg-white border border-[rgba(5,14,36,0.06)] rounded-[10px] px-5 py-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          {activeCampaigns > 0 && <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />}
          <span className="text-[0.82rem] text-gray-700 font-medium">{activeCampaigns}</span>
          <span className="text-[0.78rem] text-gray-400">Active Campaigns</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-[0.82rem] text-gray-700 font-medium">{totalCalls.toLocaleString()}</span>
          <span className="text-[0.78rem] text-gray-400">Total Calls</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-[0.82rem] text-gray-700 font-medium">{totalQualified}</span>
          <span className="text-[0.78rem] text-gray-400">Buyers Qualified</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-[0.82rem] text-gray-700 font-medium">{avgQualRate}%</span>
          <span className="text-[0.78rem] text-gray-400">Avg Qualification Rate</span>
        </div>
      </div>

      {/* Content */}
      {!isDetailView && subTab === 'campaigns' && (
        <CampaignList
          campaigns={campaigns}
          loading={campaignsLoading}
          error={campaignsError}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sort={sort}
          setSort={setSort}
          onViewDetail={c => setDetailCampaignId(c.id)}
          onAction={handleCampaignAction}
          onRetry={fetchCampaigns}
          onNewCampaign={() => setShowNewCampaign(true)}
        />
      )}

      {!isDetailView && subTab === 'calllog' && (
        <CallLogTab
          campaigns={campaigns}
          onOpenCall={id => setDetailCallId(id)}
          addToast={addToast}
        />
      )}

      {!isDetailView && subTab === 'callbacks' && (
        <CallbacksTab addToast={addToast} />
      )}

      {!isDetailView && subTab === 'voicemails' && (
        <VoicemailsTab addToast={addToast} />
      )}

      {!isDetailView && subTab === 'inbound' && (
        <InboundTab addToast={addToast} />
      )}

      {!isDetailView && subTab === 'sms' && (
        <SMSInboxTab addToast={addToast} />
      )}

      {!isDetailView && subTab === 'live' && (
        <LiveMonitorTab addToast={addToast} />
      )}

      {!isDetailView && subTab === 'analytics' && (
        <AnalyticsTab campaigns={campaigns} addToast={addToast} />
      )}

      {isDetailView && (
        <CampaignDetailView
          campaignId={detailCampaignId!}
          onBack={() => { setDetailCampaignId(null); fetchCampaigns() }}
          onOpenCall={id => setDetailCallId(id)}
          onPowerDial={(buyers, cid) => { setDialerBuyers(buyers); setDialerCampaignId(cid) }}
          onAction={handleCampaignAction}
          addToast={addToast}
        />
      )}
      </div>

      {/* Call detail slide-over */}
      {detailCallId && (
        <CallDetailSlideOver
          callId={detailCallId}
          onClose={() => setDetailCallId(null)}
          addToast={addToast}
        />
      )}

      {/* Power dialer overlay */}
      {dialerBuyers && (
        <PowerDialer
          buyers={dialerBuyers}
          campaignId={dialerCampaignId}
          onComplete={() => { setDialerBuyers(null); fetchCampaigns() }}
          onClose={() => setDialerBuyers(null)}
        />
      )}

      {/* New Campaign modal */}
      {showNewCampaign && (
        <NewCampaignModal
          onClose={() => { setShowNewCampaign(false); setPreselectedContactIds([]) }}
          onCreated={() => { fetchCampaigns(); setShowNewCampaign(false); setPreselectedContactIds([]) }}
          addToast={addToast}
          preselectedContactIds={preselectedContactIds}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-fadeInUp { animation: fadeInUp 0.2s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.25s ease-out; }
        @media (max-width: 900px) { .outreach-metrics { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .outreach-slide-panel { width: 100% !important; } }
      ` }} />
    </div>
  )
}
