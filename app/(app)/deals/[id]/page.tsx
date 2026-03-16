'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/toast'
import {
  ArrowLeft, Users, DollarSign, BarChart3, Clock, Send,
  ChevronDown, Loader2, Home, BedDouble, Bath, Ruler,
  Calendar, MapPin, FileText, Pencil, X, Check, TrendingUp,
  Megaphone, CheckCircle2, AlertTriangle, Store, FileSignature,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

interface MatchBuyer {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  phone: string | null
  email: string | null
  status: string
  buyerScore: number
  preferredTypes?: string[]
  strategy?: string | null
  minPrice?: number | null
  maxPrice?: number | null
}

interface DealMatch {
  id: string
  dealId: string
  buyerId: string
  matchScore: number
  buyBoxScore: number
  priceScore: number
  strategyScore: number
  timingScore: number
  closeProbScore: number
  outreachSent: boolean
  outreachSentAt: string | null
  viewed: boolean
  viewedAt: string | null
  createdAt: string
  buyer: MatchBuyer
}

interface DealOffer {
  id: string
  amount: number
  status: string
  terms: string | null
  message: string | null
  closeDate: string | null
  createdAt: string
  updatedAt: string
  matchScore?: number | null
  contractId?: string | null
  buyer: { id: string; firstName: string | null; lastName: string | null; entityName: string | null; phone?: string | null; email?: string | null }
}

// Allowed offer status transitions
const OFFER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'COUNTERED'],
  COUNTERED: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
  EXPIRED: [],
}

interface Deal {
  id: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  beds: number | null
  baths: number | null
  sqft: number | null
  yearBuilt: number | null
  condition: string | null
  askingPrice: number
  assignFee: number | null
  closeByDate: string | null
  arv: number | null
  repairCost: number | null
  confidenceScore: number | null
  flipProfit: number | null
  rentalCashFlow: number | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  analysisData: Record<string, unknown> | null
  matches: DealMatch[]
  offers: DealOffer[]
}

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'rgba(156,163,175,0.1)', text: '#6b7280' },
  ACTIVE: { bg: 'rgba(22,163,74,0.08)', text: '#16a34a' },
  UNDER_OFFER: { bg: 'rgba(37,99,235,0.08)', text: '#2563eb' },
  CLOSED: { bg: 'rgba(124,58,237,0.08)', text: '#7c3aed' },
  CANCELLED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444' },
  EXPIRED: { bg: 'rgba(156,163,175,0.08)', text: '#9ca3af' },
}

const offerStatusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'rgba(245,158,11,0.08)', text: '#d97706' },
  ACCEPTED: { bg: 'rgba(22,163,74,0.08)', text: '#16a34a' },
  REJECTED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444' },
  COUNTERED: { bg: 'rgba(37,99,235,0.08)', text: '#2563eb' },
  WITHDRAWN: { bg: 'rgba(156,163,175,0.08)', text: '#6b7280' },
  EXPIRED: { bg: 'rgba(156,163,175,0.08)', text: '#9ca3af' },
}

const typeLabels: Record<string, string> = {
  SFR: 'SFR',
  MULTI_FAMILY: 'Multi-Family',
  CONDO: 'Condo',
  LAND: 'Land',
  COMMERCIAL: 'Commercial',
  MOBILE_HOME: 'Mobile Home',
}

const strategyLabels: Record<string, string> = {
  FLIP: 'Flip',
  HOLD: 'Hold',
  BOTH: 'Flip/Hold',
  LAND: 'Land',
  COMMERCIAL: 'Commercial',
}

const conditionColors: Record<string, string> = {
  distressed: 'text-red-700 bg-red-50',
  fair: 'text-amber-700 bg-amber-50',
  good: 'text-blue-700 bg-blue-50',
  excellent: 'text-emerald-700 bg-emerald-50',
}

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['UNDER_OFFER', 'CANCELLED'],
  UNDER_OFFER: ['CLOSED', 'ACTIVE'],
  CANCELLED: [],
  CLOSED: [],
  EXPIRED: [],
}

type SortField = 'matchScore' | 'buyBoxScore' | 'priceScore' | 'strategyScore' | 'timingScore' | 'closeProbScore'

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function buyerName(b: { firstName: string | null; lastName: string | null; entityName: string | null }) {
  return [b.firstName, b.lastName].filter(Boolean).join(' ') || b.entityName || 'Unknown'
}

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return '—'
  return '$' + n.toLocaleString()
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function matchScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-700'
  if (score >= 60) return 'text-blue-700'
  if (score >= 40) return 'text-amber-700'
  return 'text-red-700'
}

function subScoreStyle(score: number) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200'
  if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

function buyerStatusStyle(s: string) {
  switch (s) {
    case 'HIGH_CONFIDENCE': return 'text-emerald-700 bg-emerald-50'
    case 'RECENTLY_VERIFIED': return 'text-blue-700 bg-blue-50'
    case 'ACTIVE': return 'text-gray-700 bg-gray-100'
    case 'DORMANT': return 'text-amber-700 bg-amber-50'
    case 'DO_NOT_CALL': return 'text-red-700 bg-red-50'
    default: return 'text-gray-700 bg-gray-100'
  }
}

function displayStatus(s: string) {
  return s.replace(/_/g, ' ')
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export default function DealDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const toast = useToast()

  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [matching, setMatching] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [sortField, setSortField] = useState<SortField>('matchScore')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null)

  // ── Offer state ────────────────────────────
  const [offerFormOpen, setOfferFormOpen] = useState(false)
  const [offerSubmitting, setOfferSubmitting] = useState(false)
  const [offerForm, setOfferForm] = useState({ buyerId: '', amount: '', closeDate: '', terms: '', message: '' })
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null)
  const [counteringOffer, setCounteringOffer] = useState<string | null>(null)
  const [counterForm, setCounterForm] = useState({ amount: '', terms: '', message: '' })
  const [daisyChainFlash, setDaisyChainFlash] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // ── Outreach state ──────────────────────────
  const [sendingBuyerId, setSendingBuyerId] = useState<string | null>(null)
  const [blastOpen, setBlastOpen] = useState(false)
  const [blastSending, setBlastSending] = useState(false)
  const [blastChannels, setBlastChannels] = useState<{ sms: boolean; email: boolean }>({ sms: true, email: true })
  const [blastMinScore, setBlastMinScore] = useState(60)
  const blastRef = useRef<HTMLDivElement>(null)

  // ── Marketplace / Contract state ─────────────
  const [listingLoading, setListingLoading] = useState(false)
  const [listingCreated, setListingCreated] = useState(false)
  const [contractLoading, setContractLoading] = useState(false)
  const [contractCreated, setContractCreated] = useState(false)

  // Pick up daisy chain flash from sessionStorage (set during deal creation)
  useEffect(() => {
    try {
      const key = `daisy_chain_${id}`
      const msg = sessionStorage.getItem(key)
      if (msg) {
        setDaisyChainFlash(msg)
        sessionStorage.removeItem(key)
      }
    } catch { /* ignore */ }
  }, [id])

  // Close blast dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (blastRef.current && !blastRef.current.contains(e.target as Node)) setBlastOpen(false)
    }
    if (blastOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [blastOpen])

  // ── Fetch deal ────────────────────────────────

  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${id}`)
      if (!res.ok) {
        if (res.status === 404) { setError('Deal not found'); return }
        throw new Error('Failed to fetch deal')
      }
      const data = await res.json()
      setDeal(data.deal)
      setNotesValue(data.deal.notes || '')
    } catch {
      setError('Failed to load deal')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchDeal() }, [fetchDeal])

  // ── Run matching ──────────────────────────────

  const runMatching = async () => {
    setMatching(true)
    try {
      const res = await fetch(`/api/deals/${id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minScore: 20, limit: 50 }),
      })
      if (!res.ok) throw new Error('Matching failed')
      const data = await res.json()
      toast(`Matched ${data.matched} of ${data.total} buyers`)
      await fetchDeal()
    } catch {
      toast('Failed to run matching')
    } finally {
      setMatching(false)
    }
  }

  // ── Save notes ────────────────────────────────

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDeal((prev) => prev ? { ...prev, notes: data.deal.notes } : prev)
      setEditingNotes(false)
      toast('Notes saved')
    } catch {
      toast('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  // ── Change status ─────────────────────────────

  const changeStatus = async (newStatus: string) => {
    setStatusDropdownOpen(false)
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast(err.error || 'Failed to update status')
        return
      }
      const data = await res.json()
      setDeal((prev) => prev ? { ...prev, ...data.deal } : prev)
      toast(`Status updated to ${displayStatus(newStatus)}`)
    } catch {
      toast('Failed to update status')
    }
  }

  // ── List on Marketplace ──────────────────────

  const listOnMarketplace = async () => {
    if (!deal) return
    setListingLoading(true)
    try {
      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          headline: `${deal.address} — ${deal.city}, ${deal.state}`,
          description: `${typeLabels[deal.propertyType] || deal.propertyType}${deal.beds ? `, ${deal.beds}bd` : ''}${deal.baths ? `/${deal.baths}ba` : ''}${deal.sqft ? `, ${deal.sqft.toLocaleString()} sqft` : ''}${deal.arv ? `. ARV ${fmtCurrency(deal.arv)}` : ''}.`,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to list')
      }
      setListingCreated(true)
      toast('Listed on Marketplace')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to list on Marketplace')
    } finally {
      setListingLoading(false)
    }
  }

  // ── Generate Contract ──────────────────────────

  const generateContractForDeal = async () => {
    if (!deal) return
    setContractLoading(true)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          manualBuyer: {},
          generatePdf: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate contract')
      }
      setContractCreated(true)
      toast('Contract generated')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to generate contract')
    } finally {
      setContractLoading(false)
    }
  }

  // ── Edit deal fields ──────────────────────────

  const startEdit = () => {
    if (!deal) return
    setEditValues({
      askingPrice: String(deal.askingPrice),
      assignFee: deal.assignFee != null ? String(deal.assignFee) : '',
      arv: deal.arv != null ? String(deal.arv) : '',
      repairCost: deal.repairCost != null ? String(deal.repairCost) : '',
      condition: deal.condition || '',
      beds: deal.beds != null ? String(deal.beds) : '',
      baths: deal.baths != null ? String(deal.baths) : '',
      sqft: deal.sqft != null ? String(deal.sqft) : '',
      yearBuilt: deal.yearBuilt != null ? String(deal.yearBuilt) : '',
    })
    setEditMode(true)
  }

  const saveEdit = async () => {
    setSavingEdit(true)
    try {
      const body: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(editValues)) {
        body[k] = v === '' ? null : v
      }
      const res = await fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        toast(err.error || 'Failed to save')
        return
      }
      const data = await res.json()
      setDeal((prev) => prev ? { ...prev, ...data.deal } : prev)
      setEditMode(false)
      toast('Deal updated')
    } catch {
      toast('Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Send deal to individual buyer ────────────

  const sendToBuyer = async (buyerId: string) => {
    setSendingBuyerId(buyerId)
    try {
      const channels: string[] = []
      if (blastChannels.sms) channels.push('sms')
      if (blastChannels.email) channels.push('email')
      const res = await fetch(`/api/deals/${id}/blast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerIds: [buyerId], channels }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.sent > 0) {
        toast('Deal sent to buyer')
        await fetchDeal()
      } else if (data.skipped > 0) {
        toast('Already sent to this buyer')
      } else {
        toast('Failed to send')
      }
    } catch {
      toast('Failed to send deal')
    } finally {
      setSendingBuyerId(null)
    }
  }

  // ── Blast all matched buyers ────────────────

  const blastAll = async () => {
    setBlastSending(true)
    try {
      const channels: string[] = []
      if (blastChannels.sms) channels.push('sms')
      if (blastChannels.email) channels.push('email')
      const res = await fetch(`/api/deals/${id}/blast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allMatches: true, minScore: blastMinScore, channels }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast(`Sent to ${data.sent} buyer${data.sent !== 1 ? 's' : ''}${data.skipped > 0 ? `, ${data.skipped} already contacted` : ''}`)
      setBlastOpen(false)
      await fetchDeal()
    } catch {
      toast('Failed to send blast')
    } finally {
      setBlastSending(false)
    }
  }

  // ── Record offer ─────────────────────────────

  const submitOffer = async () => {
    if (!offerForm.buyerId || !offerForm.amount) return
    setOfferSubmitting(true)
    try {
      const res = await fetch(`/api/deals/${id}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: offerForm.buyerId,
          amount: Number(offerForm.amount),
          closeDate: offerForm.closeDate || undefined,
          terms: offerForm.terms || undefined,
          message: offerForm.message || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast(err.error || 'Failed to record offer')
        return
      }
      toast('Offer recorded')
      setOfferFormOpen(false)
      setOfferForm({ buyerId: '', amount: '', closeDate: '', terms: '', message: '' })
      await fetchDeal()
    } catch {
      toast('Failed to record offer')
    } finally {
      setOfferSubmitting(false)
    }
  }

  // ── Offer actions (accept/reject/counter/withdraw) ──

  const updateOfferStatus = async (offerId: string, newStatus: string, extra?: Record<string, unknown>) => {
    setOfferActionLoading(offerId)
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...extra }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast(err.error || 'Failed to update offer')
        return
      }
      toast(`Offer ${newStatus.toLowerCase()}`)
      setCounteringOffer(null)
      setCounterForm({ amount: '', terms: '', message: '' })
      await fetchDeal()
    } catch {
      toast('Failed to update offer')
    } finally {
      setOfferActionLoading(null)
    }
  }

  const deleteOffer = async (offerId: string) => {
    setOfferActionLoading(offerId)
    try {
      const res = await fetch(`/api/offers/${offerId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast(err.error || 'Failed to delete offer')
        return
      }
      toast('Offer deleted')
      await fetchDeal()
    } catch {
      toast('Failed to delete offer')
    } finally {
      setOfferActionLoading(null)
    }
  }

  // ── Sorted matches ────────────────────────────

  const sortedMatches = deal?.matches
    ? [...deal.matches].sort((a, b) => (b[sortField] ?? 0) - (a[sortField] ?? 0))
    : []

  // ── Loading state ─────────────────────────────

  if (loading) {
    return (
      <div className="p-9 max-w-[1200px]">
        <div className="animate-pulse space-y-5">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-8 w-72 bg-gray-200 rounded" />
          <div className="h-4 w-56 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 gap-5 deal-detail-grid">
            <div className="bg-white border border-gray-200 rounded-lg h-[420px]" />
            <div className="bg-white border border-gray-200 rounded-lg h-[420px]" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="p-9 max-w-[1200px]">
        <button
          onClick={() => router.push('/deals')}
          className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 mb-6 bg-transparent border-0 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> My Deals
        </button>
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-16 text-center">
          <div className="text-[0.92rem] text-gray-600 mb-2">{error || 'Deal not found'}</div>
          <Link href="/deals" className="text-[0.82rem] text-[#2563eb] no-underline hover:underline">
            Back to deals
          </Link>
        </div>
      </div>
    )
  }

  const sc = statusColors[deal.status] || statusColors.DRAFT
  const spread = deal.arv && deal.askingPrice ? deal.arv - deal.askingPrice : null
  const spreadPct = deal.arv && deal.askingPrice && deal.arv > 0
    ? Math.round(((deal.arv - deal.askingPrice) / deal.arv) * 100)
    : null
  const allowedTransitions = STATUS_TRANSITIONS[deal.status] ?? []

  return (
    <div className="p-9 max-w-[1200px]">
      {/* ── HEADER ────────────────────────────────── */}
      <button
        onClick={() => router.push('/deals')}
        className="flex items-center gap-1.5 text-[0.82rem] text-gray-500 hover:text-gray-700 mb-4 bg-transparent border-0 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> My Deals
      </button>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] tracking-[-0.022em] mb-1"
          >
            {deal.address}
          </h1>
          <div className="flex items-center gap-2 text-[0.82rem] text-[#9CA3AF] flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{deal.city}, {deal.state} {deal.zip}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Home className="w-3.5 h-3.5" />{typeLabels[deal.propertyType] || deal.propertyType}</span>
            {deal.beds != null && <><span>·</span><span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{deal.beds} Beds</span></>}
            {deal.baths != null && <><span>·</span><span className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{deal.baths} Baths</span></>}
            {deal.sqft != null && <><span>·</span><span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{deal.sqft.toLocaleString()} sqft</span></>}
          </div>
          <div className="mt-2">
            <span
              className="inline-block px-2.5 py-0.5 rounded-full text-[0.68rem] font-semibold tracking-wide uppercase"
              style={{ background: sc.bg, color: sc.text }}
            >
              {displayStatus(deal.status)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <button
            onClick={runMatching}
            disabled={matching}
            className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {matching ? 'Matching...' : 'Run Matching'}
          </button>

          {!editMode ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors"
            >
              <Pencil className="w-4 h-4" /> Edit Deal
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:opacity-60"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-3 py-2.5 text-[0.82rem] cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={listingCreated ? undefined : listOnMarketplace}
            disabled={listingLoading || listingCreated}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:cursor-not-allowed ${
              listingCreated
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] disabled:opacity-60'
            }`}
          >
            {listingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : listingCreated ? <Check className="w-4 h-4" /> : <Store className="w-4 h-4" />}
            {listingCreated ? 'Listed' : 'List on Marketplace'}
          </button>

          <button
            onClick={contractCreated ? undefined : generateContractForDeal}
            disabled={contractLoading || contractCreated}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:cursor-not-allowed ${
              contractCreated
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] disabled:opacity-60'
            }`}
          >
            {contractLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : contractCreated ? <Check className="w-4 h-4" /> : <FileSignature className="w-4 h-4" />}
            {contractCreated ? 'Contract Created' : 'Generate Contract'}
          </button>

          {/* Status dropdown */}
          {allowedTransitions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="flex items-center gap-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors"
              >
                Change Status <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {statusDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
                  <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                    {allowedTransitions.map((s) => {
                      const c = statusColors[s] || statusColors.DRAFT
                      return (
                        <button
                          key={s}
                          onClick={() => changeStatus(s)}
                          className="w-full text-left px-4 py-2 text-[0.82rem] hover:bg-gray-50 transition-colors bg-transparent border-0 cursor-pointer flex items-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.text }} />
                          {displayStatus(s)}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── DAISY CHAIN WARNING ──────────────────── */}
      {(() => {
        const hasPersistentFlag = deal.analysisData && typeof deal.analysisData === 'object' && 'daisyChainFlag' in deal.analysisData && deal.analysisData.daisyChainFlag
        const warningMsg = daisyChainFlash || (hasPersistentFlag ? 'This property address was found in another wholesaler\'s listings. This may indicate daisy chaining. Buyers will see this warning.' : null)
        if (!warningMsg) return null
        return (
          <div className="mb-5 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[0.78rem] font-medium text-amber-800 mb-0.5">Deal quality warning</div>
              <div className="text-[0.76rem] text-amber-700 leading-relaxed">{warningMsg}</div>
            </div>
            {daisyChainFlash && (
              <button
                onClick={() => setDaisyChainFlash(null)}
                className="text-amber-400 hover:text-amber-600 bg-transparent border-0 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )
      })()}

      {/* ── TWO-COLUMN GRID ───────────────────────── */}
      <div className="grid grid-cols-2 gap-5 mb-5 deal-detail-grid">
        {/* ── LEFT: Deal Details ──────────────────── */}
        <div className="space-y-5">
          {/* Financials card */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Financials
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {editMode ? (
                <>
                  <EditField label="Asking Price" value={editValues.askingPrice} onChange={(v) => setEditValues({ ...editValues, askingPrice: v })} prefix="$" />
                  <EditField label="Assignment Fee" value={editValues.assignFee} onChange={(v) => setEditValues({ ...editValues, assignFee: v })} prefix="$" />
                  <EditField label="ARV" value={editValues.arv} onChange={(v) => setEditValues({ ...editValues, arv: v })} prefix="$" />
                  <EditField label="Repair Cost" value={editValues.repairCost} onChange={(v) => setEditValues({ ...editValues, repairCost: v })} prefix="$" />
                </>
              ) : (
                <>
                  <FinancialRow label="Asking Price" value={fmtCurrency(deal.askingPrice)} />
                  <FinancialRow label="Assignment Fee" value={fmtCurrency(deal.assignFee)} />
                  <FinancialRow label="ARV" value={fmtCurrency(deal.arv)} />
                  <FinancialRow label="Repair Cost" value={fmtCurrency(deal.repairCost)} />
                  <FinancialRow label="Flip Profit" value={fmtCurrency(deal.flipProfit)} valueColor={deal.flipProfit && deal.flipProfit > 0 ? 'text-emerald-600' : undefined} />
                  <FinancialRow label="Rental Cash Flow" value={deal.rentalCashFlow != null ? `${fmtCurrency(deal.rentalCashFlow)}/mo` : '—'} valueColor={deal.rentalCashFlow && deal.rentalCashFlow > 0 ? 'text-emerald-600' : undefined} />
                </>
              )}
            </div>

            {/* Spread bar */}
            {!editMode && spread != null && spreadPct != null && deal.arv && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.76rem] text-gray-500">Spread</span>
                  <span className={`text-[0.84rem] font-semibold ${spreadPct >= 30 ? 'text-emerald-600' : spreadPct >= 15 ? 'text-blue-600' : 'text-amber-600'}`}>
                    {fmtCurrency(spread)} ({spreadPct}%)
                  </span>
                </div>
                <div className="relative h-4 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (deal.askingPrice / deal.arv) * 100)}%`,
                      background: '#2563EB',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[0.66rem] text-gray-400">Contract {fmtCurrency(deal.askingPrice)}</span>
                  <span className="text-[0.66rem] text-gray-400">ARV {fmtCurrency(deal.arv)}</span>
                </div>
              </div>
            )}

            {/* Confidence score */}
            {!editMode && deal.confidenceScore != null && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[0.76rem] text-gray-500">Confidence Score</span>
                  <span className={`text-[0.82rem] font-semibold ${
                    deal.confidenceScore >= 70 ? 'text-emerald-600' : deal.confidenceScore >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {deal.confidenceScore}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${deal.confidenceScore}%`,
                      background: deal.confidenceScore >= 70 ? '#16a34a' : deal.confidenceScore >= 40 ? '#d97706' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Property details card */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] mb-4 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" /> Property Details
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {editMode ? (
                <>
                  <EditField label="Beds" value={editValues.beds} onChange={(v) => setEditValues({ ...editValues, beds: v })} />
                  <EditField label="Baths" value={editValues.baths} onChange={(v) => setEditValues({ ...editValues, baths: v })} />
                  <EditField label="Sq Ft" value={editValues.sqft} onChange={(v) => setEditValues({ ...editValues, sqft: v })} />
                  <EditField label="Year Built" value={editValues.yearBuilt} onChange={(v) => setEditValues({ ...editValues, yearBuilt: v })} />
                  <div className="col-span-2">
                    <label className="text-[0.72rem] text-gray-500 mb-1 block">Condition</label>
                    <div className="relative">
                      <select
                        value={editValues.condition}
                        onChange={(e) => setEditValues({ ...editValues, condition: e.target.value })}
                        className="appearance-none w-full bg-gray-50 border border-[#E5E7EB] rounded-lg pl-3 pr-8 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB] cursor-pointer"
                      >
                        <option value="">Not specified</option>
                        <option value="distressed">Distressed</option>
                        <option value="fair">Fair</option>
                        <option value="good">Good</option>
                        <option value="excellent">Excellent</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <DetailRow label="Beds" value={deal.beds != null ? String(deal.beds) : '—'} />
                  <DetailRow label="Baths" value={deal.baths != null ? String(deal.baths) : '—'} />
                  <DetailRow label="Sq Ft" value={deal.sqft != null ? deal.sqft.toLocaleString() : '—'} />
                  <DetailRow label="Year Built" value={deal.yearBuilt != null ? String(deal.yearBuilt) : '—'} />
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-[0.8rem] text-gray-500">Condition</span>
                    {deal.condition ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[0.72rem] font-medium capitalize ${conditionColors[deal.condition.toLowerCase()] || 'text-gray-700 bg-gray-100'}`}>
                        {deal.condition}
                      </span>
                    ) : (
                      <span className="text-[0.84rem] text-gray-400">—</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Dates */}
            {!editMode && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {deal.closeByDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-[0.8rem] text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />Close by</span>
                    <span className="text-[0.84rem] text-gray-700">{fmtDate(deal.closeByDate)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />Created</span>
                  <span className="text-[0.84rem] text-gray-700">{fmtDate(deal.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem] text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />Updated</span>
                  <span className="text-[0.84rem] text-gray-700">{fmtDate(deal.updatedAt)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Notes card */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Notes
              </div>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-[0.76rem] text-[#2563eb] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-50 border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB] resize-y"
                  placeholder="Add notes about this deal..."
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="flex items-center gap-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-3 py-1.5 text-[0.78rem] font-medium cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingNotes(false); setNotesValue(deal.notes || '') }}
                    className="text-[0.78rem] text-gray-500 bg-transparent border-0 cursor-pointer hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[0.84rem] text-gray-600 whitespace-pre-wrap leading-relaxed">
                {deal.notes || <span className="text-gray-400 italic">No notes yet</span>}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT: Matched Buyers ──────────────── */}
        <div className="space-y-5">
          <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Matched Buyers
                </div>
                {deal.matches.length > 0 && (
                  <span className="text-[0.68rem] font-semibold text-[#2563eb] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
                    {deal.matches.length} matched{(() => { const sentCount = deal.matches.filter(m => m.outreachSent).length; return sentCount > 0 ? ` · ${sentCount} sent` : '' })()}
                  </span>
                )}
                {/* Blast All button */}
                {deal.matches.length > 0 && (
                  <div ref={blastRef} className="relative">
                    <button
                      onClick={() => setBlastOpen(!blastOpen)}
                      className="flex items-center gap-1 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-2.5 py-1 text-[0.72rem] font-medium cursor-pointer transition-colors"
                    >
                      <Megaphone className="w-3 h-3" /> Blast All
                    </button>
                    {blastOpen && (
                      <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[260px]">
                        <div className="text-[0.82rem] font-medium text-gray-800 mb-3">
                          Send to all {deal.matches.filter(m => !m.outreachSent).length} unsent buyers
                        </div>
                        <div className="space-y-2 mb-3">
                          <label className="flex items-center gap-2 text-[0.78rem] text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={blastChannels.sms} onChange={(e) => setBlastChannels({ ...blastChannels, sms: e.target.checked })} className="rounded" />
                            SMS
                          </label>
                          <label className="flex items-center gap-2 text-[0.78rem] text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={blastChannels.email} onChange={(e) => setBlastChannels({ ...blastChannels, email: e.target.checked })} className="rounded" />
                            Email
                          </label>
                        </div>
                        <div className="mb-3">
                          <label className="text-[0.72rem] text-gray-500 mb-1 block">Min match score: {blastMinScore}</label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={blastMinScore}
                            onChange={(e) => setBlastMinScore(Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                        <button
                          onClick={blastAll}
                          disabled={blastSending || (!blastChannels.sms && !blastChannels.email)}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md py-2 text-[0.78rem] font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {blastSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          {blastSending ? 'Sending...' : 'Send Blast'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Sort dropdown */}
              {deal.matches.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-1 text-[0.72rem] text-gray-500 bg-transparent border-0 cursor-pointer hover:text-gray-700 transition-colors"
                  >
                    Sort: {sortField === 'matchScore' ? 'Overall' : sortField.replace('Score', '')} <ChevronDown className="w-3 h-3" />
                  </button>
                  {showSortDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                      <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                        {([
                          ['matchScore', 'Overall'],
                          ['buyBoxScore', 'Buy Box'],
                          ['priceScore', 'Price'],
                          ['strategyScore', 'Strategy'],
                          ['timingScore', 'Timing'],
                          ['closeProbScore', 'Close Prob'],
                        ] as [SortField, string][]).map(([field, label]) => (
                          <button
                            key={field}
                            onClick={() => { setSortField(field); setShowSortDropdown(false) }}
                            className={`w-full text-left px-3 py-1.5 text-[0.78rem] hover:bg-gray-50 transition-colors bg-transparent border-0 cursor-pointer ${sortField === field ? 'text-[#2563eb] font-medium' : 'text-gray-600'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Matching loading overlay */}
            {matching && deal.matches.length > 0 && (
              <div className="flex items-center gap-2 text-[0.82rem] text-[#2563eb] mb-3 px-3 py-2 bg-[#EFF6FF] rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" /> Re-running matching engine...
              </div>
            )}

            {deal.matches.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <div className="text-[0.86rem] text-gray-500 mb-1">No matches yet</div>
                <p className="text-[0.78rem] text-gray-400 mb-4 max-w-[280px] mx-auto">
                  Run the matching engine to find buyers for this deal.
                </p>
                <button
                  onClick={runMatching}
                  disabled={matching}
                  className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:opacity-60"
                >
                  {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  {matching ? 'Matching...' : 'Run Matching'}
                </button>
              </div>
            ) : (
              <div className="space-y-0">
                {sortedMatches.map((match, i) => (
                  <div
                    key={match.id}
                    className={`py-3 ${i < sortedMatches.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/crm/${match.buyer.id}`}
                            className="text-[0.84rem] font-medium text-[var(--navy-heading,#0B1224)] no-underline hover:text-[#2563eb] transition-colors truncate"
                          >
                            {buyerName(match.buyer)}
                          </Link>
                          <span className={`text-[0.68rem] px-1.5 py-0.5 rounded-full ${buyerStatusStyle(match.buyer.status)}`}>
                            {displayStatus(match.buyer.status)}
                          </span>
                        </div>
                        {/* Sub-score pills */}
                        <div className="flex items-center gap-1 flex-wrap mb-1.5">
                          <SubScorePill label="BB" score={match.buyBoxScore} />
                          <SubScorePill label="Price" score={match.priceScore} />
                          <SubScorePill label="Strat" score={match.strategyScore} />
                          <SubScorePill label="Time" score={match.timingScore} />
                          <SubScorePill label="Close" score={match.closeProbScore} />
                        </div>
                        {/* Tags */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {match.buyer.strategy && (
                            <span className="text-[0.64rem] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {strategyLabels[match.buyer.strategy] || match.buyer.strategy}
                            </span>
                          )}
                          {match.buyer.preferredTypes?.map((t) => (
                            <span key={t} className="text-[0.64rem] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                              {typeLabels[t] || t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className={`text-[1.1rem] font-bold ${matchScoreColor(match.matchScore)}`}>
                            {match.matchScore}
                          </div>
                          <div className="text-[0.62rem] text-gray-400 uppercase tracking-wide">Match</div>
                        </div>
                        {match.outreachSent ? (
                          <span className="flex items-center gap-1 text-[0.72rem] text-emerald-600 font-medium px-2.5 py-1.5" title={match.outreachSentAt ? `Sent ${new Date(match.outreachSentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Sent'}>
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </span>
                        ) : (
                          <button
                            onClick={() => sendToBuyer(match.buyer.id)}
                            disabled={sendingBuyerId === match.buyer.id}
                            className="flex items-center gap-1 bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] rounded-md px-2.5 py-1.5 text-[0.72rem] font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {sendingBuyerId === match.buyer.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Send
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── OFFERS SECTION ────────────────────────── */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-[#6B7280] uppercase tracking-[0.05em] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Offers
            </div>
            {deal.offers.length > 0 && (
              <span className="text-[0.68rem] font-semibold text-[#2563eb] bg-[#EFF6FF] px-2 py-0.5 rounded-full">
                {deal.offers.length}{(() => { const pending = deal.offers.filter(o => o.status === 'PENDING' || o.status === 'COUNTERED').length; return pending > 0 ? ` · ${pending} active` : '' })()}
              </span>
            )}
          </div>
          {deal.matches.length > 0 && deal.status !== 'CLOSED' && deal.status !== 'CANCELLED' && (
            <button
              onClick={() => { setOfferFormOpen(!offerFormOpen); setOfferForm({ buyerId: '', amount: '', closeDate: '', terms: '', message: '' }) }}
              className="flex items-center gap-1 text-[0.78rem] font-medium text-[#2563eb] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors"
            >
              {offerFormOpen ? <X className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
              {offerFormOpen ? 'Cancel' : 'Record Offer'}
            </button>
          )}
        </div>

        {/* Record Offer form */}
        {offerFormOpen && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <div className="text-[0.82rem] font-medium text-gray-800 mb-1">Record a new offer</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Buyer</label>
                <div className="relative">
                  <select
                    value={offerForm.buyerId}
                    onChange={(e) => setOfferForm({ ...offerForm, buyerId: e.target.value })}
                    className="appearance-none w-full bg-white border border-[#E5E7EB] rounded-lg pl-3 pr-8 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB] cursor-pointer"
                  >
                    <option value="">Select a matched buyer...</option>
                    {deal.matches.map((m) => (
                      <option key={m.buyer.id} value={m.buyer.id}>
                        {buyerName(m.buyer)} — {m.matchScore}% match
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Offer Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-gray-400">$</span>
                  <input
                    type="number"
                    value={offerForm.amount}
                    onChange={(e) => setOfferForm({ ...offerForm, amount: e.target.value })}
                    placeholder="0"
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg pl-7 pr-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Close Date</label>
                <input
                  type="date"
                  value={offerForm.closeDate}
                  onChange={(e) => setOfferForm({ ...offerForm, closeDate: e.target.value })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Terms (optional)</label>
                <input
                  type="text"
                  value={offerForm.terms}
                  onChange={(e) => setOfferForm({ ...offerForm, terms: e.target.value })}
                  placeholder="e.g. Cash, as-is, 14-day close"
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[0.72rem] text-gray-500 mb-1 block">Message (optional)</label>
                <textarea
                  value={offerForm.message}
                  onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                  rows={2}
                  placeholder="Any notes from the buyer..."
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB] resize-y"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={submitOffer}
                disabled={offerSubmitting || !offerForm.buyerId || !offerForm.amount}
                className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {offerSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {offerSubmitting ? 'Saving...' : 'Record Offer'}
              </button>
              <button
                onClick={() => setOfferFormOpen(false)}
                className="text-[0.82rem] text-gray-500 bg-transparent border-0 cursor-pointer hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deal.offers.length === 0 && !offerFormOpen ? (
          <div className="py-8 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <div className="text-[0.86rem] text-gray-500 mb-1">No offers yet</div>
            <p className="text-[0.78rem] text-gray-400 mb-4 max-w-[280px] mx-auto">
              Record offers as they come in from matched buyers.
            </p>
            {deal.matches.length > 0 && deal.status !== 'CLOSED' && deal.status !== 'CANCELLED' && (
              <button
                onClick={() => setOfferFormOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-4 py-2.5 text-[0.82rem] font-medium cursor-pointer transition-colors"
              >
                <DollarSign className="w-4 h-4" /> Record Offer
              </button>
            )}
          </div>
        ) : deal.offers.length > 0 ? (
          <div className="space-y-0">
            {deal.offers.map((offer, i) => {
              const oc = offerStatusColors[offer.status] || offerStatusColors.PENDING
              const isExpanded = expandedOffer === offer.id
              const isLoading = offerActionLoading === offer.id
              const transitions = OFFER_TRANSITIONS[offer.status] ?? []
              const isCountering = counteringOffer === offer.id
              const askingDiff = deal.askingPrice ? offer.amount - deal.askingPrice : null
              const askingPct = deal.askingPrice ? Math.round((offer.amount / deal.askingPrice) * 100) : null
              return (
                <div
                  key={offer.id}
                  className={`${i < deal.offers.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <button
                    onClick={() => setExpandedOffer(isExpanded ? null : offer.id)}
                    className="w-full flex items-center justify-between py-3 bg-transparent border-0 cursor-pointer text-left hover:bg-gray-50/50 transition-colors px-1 rounded"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[0.84rem] font-medium text-gray-800">
                        {buyerName(offer.buyer)}
                      </span>
                      {offer.matchScore != null && (
                        <span className={`text-[0.64rem] font-semibold px-1.5 py-0.5 rounded-full border ${
                          offer.matchScore >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                          offer.matchScore >= 60 ? 'text-blue-700 bg-blue-50 border-blue-200' :
                          'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          {offer.matchScore}%
                        </span>
                      )}
                      <span className="text-[0.92rem] font-semibold text-gray-900">
                        {fmtCurrency(offer.amount)}
                      </span>
                      {askingPct != null && (
                        <span className={`text-[0.68rem] font-medium ${askingDiff! >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {askingPct}% of ask
                        </span>
                      )}
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] font-semibold tracking-wide uppercase"
                        style={{ background: oc.bg, color: oc.text }}
                      >
                        {offer.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.76rem] text-gray-400">{fmtDate(offer.createdAt)}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-1 pb-3 pl-4 space-y-2">
                      {/* Offer details */}
                      <div className="space-y-1.5">
                        {offer.closeDate && (
                          <div className="text-[0.78rem] text-gray-500">
                            <span className="text-gray-400">Close date:</span> {fmtDate(offer.closeDate)}
                          </div>
                        )}
                        {offer.terms && (
                          <div className="text-[0.78rem] text-gray-500">
                            <span className="text-gray-400">Terms:</span> {offer.terms}
                          </div>
                        )}
                        {offer.buyer.phone && (
                          <div className="text-[0.78rem] text-gray-500">
                            <span className="text-gray-400">Phone:</span> {offer.buyer.phone}
                          </div>
                        )}
                        {offer.buyer.email && (
                          <div className="text-[0.78rem] text-gray-500">
                            <span className="text-gray-400">Email:</span> {offer.buyer.email}
                          </div>
                        )}
                        {offer.message && (
                          <div className="text-[0.78rem] text-gray-600 bg-gray-50 rounded-lg p-3 mt-1">
                            {offer.message}
                          </div>
                        )}
                      </div>

                      {/* Counter form */}
                      {isCountering && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                          <div className="text-[0.78rem] font-medium text-blue-800">Counter Offer</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[0.68rem] text-blue-600 mb-0.5 block">Amount</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.78rem] text-gray-400">$</span>
                                <input
                                  type="number"
                                  value={counterForm.amount}
                                  onChange={(e) => setCounterForm({ ...counterForm, amount: e.target.value })}
                                  placeholder={String(offer.amount)}
                                  className="w-full bg-white border border-blue-200 rounded-lg pl-6 pr-2 py-1.5 text-[0.78rem] text-gray-700 outline-none focus:border-[#2563EB]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[0.68rem] text-blue-600 mb-0.5 block">Terms</label>
                              <input
                                type="text"
                                value={counterForm.terms}
                                onChange={(e) => setCounterForm({ ...counterForm, terms: e.target.value })}
                                placeholder="Counter terms..."
                                className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-[0.78rem] text-gray-700 outline-none focus:border-[#2563EB]"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => updateOfferStatus(offer.id, 'COUNTERED', {
                                counterAmount: counterForm.amount ? Number(counterForm.amount) : undefined,
                                counterTerms: counterForm.terms || undefined,
                                counterMessage: counterForm.message || undefined,
                              })}
                              disabled={isLoading}
                              className="flex items-center gap-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-md px-3 py-1.5 text-[0.74rem] font-medium cursor-pointer transition-colors disabled:opacity-60"
                            >
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              Send Counter
                            </button>
                            <button
                              onClick={() => { setCounteringOffer(null); setCounterForm({ amount: '', terms: '', message: '' }) }}
                              className="text-[0.74rem] text-blue-600 bg-transparent border-0 cursor-pointer hover:text-blue-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* View Contract link for accepted offers */}
                      {offer.status === 'ACCEPTED' && offer.contractId && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <Link
                            href="/contracts"
                            className="inline-flex items-center gap-1.5 text-[0.78rem] font-medium text-[#2563EB] hover:text-[#1D4ED8] no-underline transition-colors"
                          >
                            <FileSignature className="w-3.5 h-3.5" /> View Contract
                          </Link>
                        </div>
                      )}

                      {/* Action buttons */}
                      {transitions.length > 0 && !isCountering && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                          {transitions.includes('ACCEPTED') && (
                            <button
                              onClick={() => updateOfferStatus(offer.id, 'ACCEPTED')}
                              disabled={isLoading}
                              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-md px-3 py-1.5 text-[0.74rem] font-medium cursor-pointer transition-colors disabled:opacity-60"
                            >
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Accept
                            </button>
                          )}
                          {transitions.includes('COUNTERED') && (
                            <button
                              onClick={() => { setCounteringOffer(offer.id); setCounterForm({ amount: '', terms: '', message: '' }) }}
                              className="flex items-center gap-1 bg-white border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] rounded-md px-3 py-1.5 text-[0.74rem] font-medium cursor-pointer transition-colors"
                            >
                              Counter
                            </button>
                          )}
                          {transitions.includes('REJECTED') && (
                            <button
                              onClick={() => updateOfferStatus(offer.id, 'REJECTED')}
                              disabled={isLoading}
                              className="flex items-center gap-1 bg-white border border-red-300 text-red-500 hover:bg-red-50 rounded-md px-3 py-1.5 text-[0.74rem] font-medium cursor-pointer transition-colors disabled:opacity-60"
                            >
                              Reject
                            </button>
                          )}
                          {transitions.includes('WITHDRAWN') && (
                            <button
                              onClick={() => updateOfferStatus(offer.id, 'WITHDRAWN')}
                              disabled={isLoading}
                              className="flex items-center gap-1 bg-white border border-gray-300 text-gray-500 hover:bg-gray-50 rounded-md px-3 py-1.5 text-[0.74rem] font-medium cursor-pointer transition-colors disabled:opacity-60"
                            >
                              Withdraw
                            </button>
                          )}
                          {offer.status === 'PENDING' && (
                            <button
                              onClick={() => deleteOffer(offer.id)}
                              disabled={isLoading}
                              className="ml-auto text-[0.72rem] text-gray-400 hover:text-red-500 bg-transparent border-0 cursor-pointer transition-colors disabled:opacity-60"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .deal-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

function FinancialRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[0.8rem] text-gray-500">{label}</span>
      <span className={`text-[0.92rem] font-semibold ${valueColor || 'text-gray-900'}`}>{value}</span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[0.8rem] text-gray-500">{label}</span>
      <span className="text-[0.84rem] text-gray-700">{value}</span>
    </div>
  )
}

function EditField({ label, value, onChange, prefix }: { label: string; value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <div>
      <label className="text-[0.72rem] text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-gray-400">{prefix}</span>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-gray-50 border border-[#E5E7EB] rounded-lg ${prefix ? 'pl-7' : 'pl-3'} pr-3 py-2 text-[0.82rem] text-gray-700 outline-none focus:border-[#2563EB]`}
        />
      </div>
    </div>
  )
}

function SubScorePill({ label, score }: { label: string; score: number }) {
  return (
    <span className={`text-[0.58rem] font-semibold px-1.5 py-0.5 rounded border ${subScoreStyle(score)}`}>
      {label} {score}
    </span>
  )
}
