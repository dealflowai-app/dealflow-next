'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/toast'
import {
  Search,
  Plus,
  ChevronDown,
  MoreHorizontal,
  Users,
  Loader2,
  Zap,
  TrendingUp,
  Handshake,
  DollarSign,
  AlertCircle,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
type Deal = {
  id: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  askingPrice: number
  arv: number | null
  status: string
  createdAt: string
  closedAt: string | null
  matches: { id: string; matchScore: number }[]
  offers: { id: string; status: string; amount: number }[]
}

type FilterTab = 'ALL' | 'ACTIVE' | 'UNDER_OFFER' | 'CLOSED' | 'DRAFT'
type SortKey = 'newest' | 'oldest' | 'price_desc' | 'price_asc' | 'matches'

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['UNDER_OFFER', 'CANCELLED'],
  UNDER_OFFER: ['CLOSED', 'ACTIVE'],
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'rgba(156,163,175,0.1)', text: '#6b7280' },
  ACTIVE: { bg: 'rgba(22,163,74,0.08)', text: '#16a34a' },
  UNDER_OFFER: { bg: 'rgba(37,99,235,0.08)', text: '#2563eb' },
  CLOSED: { bg: 'rgba(124,58,237,0.08)', text: '#7c3aed' },
  CANCELLED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444' },
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

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'UNDER_OFFER', label: 'Under Offer' },
  { key: 'CLOSED', label: 'Closed' },
  { key: 'DRAFT', label: 'Draft' },
]

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'price_desc', label: 'Price High → Low' },
  { key: 'price_asc', label: 'Price Low → High' },
  { key: 'matches', label: 'Most Matches' },
]

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days <= 7) return `${days}d ago`
  const d = new Date(dateStr)
  return `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`
}

function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

/* ═══════════════════════════════════════════════
   ROW MENU (three-dot dropdown)
   ═══════════════════════════════════════════════ */
function RowMenu({
  deal,
  isOpen,
  onToggle,
  onClose,
  onRunMatch,
  onChangeStatus,
  onDelete,
}: {
  deal: Deal
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onRunMatch: () => void
  onChangeStatus: (status: string) => void
  onDelete: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const transitions = STATUS_TRANSITIONS[deal.status] ?? []

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.right - 180 })
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 bg-transparent border-0 cursor-pointer transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); onClose() }} />
          <div
            className="fixed z-[101] bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
            style={{ top: pos.top, left: pos.left }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onRunMatch(); onClose() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-600 hover:bg-gray-50 bg-transparent border-0 cursor-pointer transition-colors text-left"
            >
              <Users className="w-3.5 h-3.5 text-gray-400" /> Run Matching
            </button>
            {transitions.length > 0 && (
              <div className="border-t border-gray-100 my-0.5" />
            )}
            {transitions.map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); onChangeStatus(s); onClose() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-600 hover:bg-gray-50 bg-transparent border-0 cursor-pointer transition-colors text-left"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: statusColors[s]?.text || '#6b7280' }}
                />
                Move to {s.replace(/_/g, ' ')}
              </button>
            ))}
            <div className="border-t border-gray-100 my-0.5" />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); onClose() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-red-500 hover:bg-red-50 bg-transparent border-0 cursor-pointer transition-colors text-left"
            >
              <AlertCircle className="w-3.5 h-3.5" /> Delete Deal
            </button>
          </div>
        </>
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function DealsPage() {
  const router = useRouter()
  const toast = useToast()

  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

  const [filter, setFilter] = useState<FilterTab>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [sortOpen, setSortOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [matchingId, setMatchingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const sortRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 250)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Close sort dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    if (sortOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sortOpen])

  // Fetch deals
  const fetchDeals = useCallback(() => {
    fetch('/api/deals')
      .then((r) => r.json())
      .then((data) => {
        setDeals(data.deals || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  /* ── Computed stats ── */
  const stats = useMemo(() => {
    const active = deals.filter((d) => d.status === 'ACTIVE').length
    const underOffer = deals.filter((d) => d.status === 'UNDER_OFFER').length
    const closedThisMonth = deals.filter((d) => d.status === 'CLOSED' && isThisMonth(d.closedAt)).length
    const totalSpread = deals
      .filter((d) => d.status === 'ACTIVE' && d.arv != null)
      .reduce((sum, d) => sum + (d.arv! - d.askingPrice), 0)
    const pendingOffers = deals.reduce((sum, d) => sum + d.offers.filter((o) => o.status === 'PENDING' || o.status === 'COUNTERED').length, 0)
    return { active, underOffer, closedThisMonth, totalSpread, pendingOffers }
  }, [deals])

  /* ── Tab counts ── */
  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { ALL: deals.length, ACTIVE: 0, UNDER_OFFER: 0, CLOSED: 0, DRAFT: 0 }
    deals.forEach((d) => {
      if (d.status in counts) counts[d.status as FilterTab]++
    })
    return counts
  }, [deals])

  /* ── Filtered + sorted deals ── */
  const visibleDeals = useMemo(() => {
    let list = [...deals]

    // Filter by tab
    if (filter !== 'ALL') list = list.filter((d) => d.status === filter)

    // Filter by search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (d) =>
          d.address.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q) ||
          d.zip.includes(q),
      )
    }

    // Sort
    switch (sortKey) {
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'price_desc':
        list.sort((a, b) => b.askingPrice - a.askingPrice)
        break
      case 'price_asc':
        list.sort((a, b) => a.askingPrice - b.askingPrice)
        break
      case 'matches':
        list.sort((a, b) => b.matches.length - a.matches.length)
        break
    }

    return list
  }, [deals, filter, debouncedSearch, sortKey])

  /* ── Actions ── */
  async function runMatching(dealId: string) {
    setMatchingId(dealId)
    try {
      const res = await fetch(`/api/deals/${dealId}/match`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast(`Matched to ${data.matches?.length ?? 0} buyers`)
      fetchDeals()
    } catch {
      toast('Failed to run matching')
    } finally {
      setMatchingId(null)
    }
  }

  async function changeStatus(dealId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      toast(`Status changed to ${newStatus.replace(/_/g, ' ')}`)
      fetchDeals()
    } catch {
      toast('Failed to update status')
    }
  }

  async function deleteDeal(dealId: string) {
    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeals((prev) => prev.filter((d) => d.id !== dealId))
      toast('Deal deleted')
    } catch {
      toast('Failed to delete deal')
    }
    setConfirmDelete(null)
  }

  /* ── KPI cards data ── */
  const kpis = [
    { label: 'Active Deals', value: stats.active, color: '#2563EB', icon: Zap },
    { label: 'Under Offer', value: stats.underOffer, color: '#7c3aed', icon: Handshake },
    { label: 'Pending Offers', value: stats.pendingOffers, color: '#d97706', icon: DollarSign },
    { label: 'Closed This Month', value: stats.closedThisMonth, color: '#16a34a', icon: TrendingUp },
  ]

  return (
    <div className="p-9 max-w-[1080px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            className="text-[1.5rem] font-normal text-[var(--navy-heading,#0B1224)] tracking-[-0.022em] mb-1"
          >
            My Deals
          </h1>
          <p className="text-[0.86rem] text-[var(--body-text,#4B5563)]">Manage and track submitted properties.</p>
        </div>
        <Link
          href="/deals/new"
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white rounded-md px-3.5 py-2 text-[0.84rem] no-underline hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> New deal
        </Link>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-4 gap-3.5 mb-6 deals-kpi-grid">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white border border-[#F0F0F0] rounded-[14px] px-5 py-[18px]"
            style={{ borderLeft: `3px solid ${k.color}` }}
          >
            <div className="text-[0.68rem] font-semibold tracking-[0.06em] uppercase text-[#9CA3AF] mb-2.5">
              {k.label}
            </div>
            <div
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              className="text-[2rem] font-normal text-[var(--navy-heading,#0B1224)] tracking-[-0.04em] leading-none"
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs + Search + Sort */}
      <div className="flex items-center justify-between mb-4 gap-3 deals-controls">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#E5E7EB] pb-0 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[0.82rem] font-medium cursor-pointer bg-transparent border-0 border-b-2 -mb-[1px] transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              <span className={`text-[0.68rem] px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-gray-100 text-gray-400'
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deals..."
              className="bg-white border border-[#E5E7EB] rounded-lg pl-9 pr-3 py-2 text-[0.82rem] text-gray-700 placeholder-gray-400 outline-none focus:border-[#2563EB] transition-colors w-[180px]"
            />
          </div>

          {/* Sort dropdown */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-[0.82rem] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {sortOptions.find((o) => o.key === sortKey)?.label}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[170px]">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setSortKey(opt.key); setSortOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-[0.78rem] bg-transparent border-0 cursor-pointer transition-colors ${
                      sortKey === opt.key ? 'text-[#2563EB] bg-[#EFF6FF]' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Table header */}
        <div
          className="grid px-5 py-3 border-b border-gray-100 bg-gray-50 deal-table-header"
          style={{ gridTemplateColumns: '2fr 0.85fr 0.85fr 0.75fr 0.7fr 0.7fr 0.75fr 40px' }}
        >
          {['Property', 'Price', 'ARV', 'Spread', 'Matches', 'Offers', 'Status', ''].map((h) => (
            <div key={h || 'actions'} className="text-[0.68rem] text-gray-400 tracking-wide uppercase">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-16 px-6 text-center">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin mx-auto mb-2" />
            <div className="text-[0.84rem] text-[#9ca3af]">Loading deals...</div>
          </div>
        ) : visibleDeals.length === 0 && deals.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="text-[0.86rem] text-[var(--body-text,#4B5563)] mb-5 max-w-[340px] mx-auto">
              No deals yet. Submit a property and the AI will start finding matched cash buyers.
            </div>
            <Link
              href="/deals/new"
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 rounded-md px-4 py-2 text-[0.84rem] no-underline hover:bg-gray-50 transition-colors"
            >
              Submit your first deal
            </Link>
          </div>
        ) : visibleDeals.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="text-[0.84rem] text-[#9ca3af]">No deals match your filters.</div>
          </div>
        ) : (
          <div>
            {visibleDeals.map((deal) => {
              const sc = statusColors[deal.status] || statusColors.DRAFT
              const spread = deal.arv != null ? deal.arv - deal.askingPrice : null
              const isMatching = matchingId === deal.id
              return (
                <div
                  key={deal.id}
                  onClick={() => router.push(`/deals/${deal.id}`)}
                  className="grid px-5 py-3.5 border-b border-gray-100 items-center hover:bg-gray-50/50 transition-colors cursor-pointer deal-table-row"
                  style={{ gridTemplateColumns: '2fr 0.85fr 0.85fr 0.75fr 0.7fr 0.7fr 0.75fr 40px' }}
                >
                  {/* Property */}
                  <div className="min-w-0">
                    <div className="text-[0.84rem] font-medium text-[var(--navy-heading,#0B1224)] truncate">
                      {deal.address}
                    </div>
                    <div className="text-[0.74rem] text-[#9ca3af] truncate">
                      {deal.city}, {deal.state} {deal.zip} · {typeLabels[deal.propertyType] || deal.propertyType} · {relativeTime(deal.createdAt)}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-[0.84rem] text-[var(--body-text,#4B5563)]">
                    ${deal.askingPrice.toLocaleString()}
                  </div>

                  {/* ARV */}
                  <div className="text-[0.84rem] text-[var(--body-text,#4B5563)] deal-arv-col">
                    {deal.arv != null ? `$${deal.arv.toLocaleString()}` : '—'}
                  </div>

                  {/* Spread */}
                  <div className="deal-spread-col">
                    {spread != null ? (
                      <span className={`text-[0.84rem] font-medium ${spread > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        ${Math.abs(spread).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[0.84rem] text-[var(--body-text,#4B5563)]">—</span>
                    )}
                  </div>

                  {/* Matches */}
                  <div className="text-[0.84rem] text-[var(--body-text,#4B5563)]">
                    {isMatching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                    ) : deal.matches.length > 0 ? (
                      `${deal.matches.length} buyer${deal.matches.length !== 1 ? 's' : ''}`
                    ) : (
                      '—'
                    )}
                  </div>

                  {/* Offers */}
                  <div className="text-[0.84rem] text-[var(--body-text,#4B5563)] deal-offers-col">
                    {deal.offers.length > 0 ? (
                      <span className="flex items-center gap-1">
                        {deal.offers.length}
                        {(() => {
                          const pending = deal.offers.filter(o => o.status === 'PENDING' || o.status === 'COUNTERED').length
                          return pending > 0 ? <span className="text-[0.68rem] font-medium text-amber-600">({pending} active)</span> : null
                        })()}
                      </span>
                    ) : '—'}
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] font-semibold tracking-wide uppercase"
                      style={{ background: sc.bg, color: sc.text }}
                    >
                      {deal.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Row menu */}
                  <div className="text-right" onClick={(e) => e.stopPropagation()}>
                    <RowMenu
                      deal={deal}
                      isOpen={menuOpen === deal.id}
                      onToggle={() => setMenuOpen(menuOpen === deal.id ? null : deal.id)}
                      onClose={() => setMenuOpen(null)}
                      onRunMatch={() => runMatching(deal.id)}
                      onChangeStatus={(s) => changeStatus(deal.id, s)}
                      onDelete={() => setConfirmDelete(deal.id)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[200]" onClick={() => setConfirmDelete(null)} />
          <div className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-[360px]">
            <div className="text-[0.92rem] font-medium text-[var(--navy-heading,#0B1224)] mb-2">Delete this deal?</div>
            <p className="text-[0.82rem] text-gray-500 mb-5">
              This will cancel the deal and remove it from your active list. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-[0.82rem] text-gray-600 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDeal(confirmDelete)}
                className="px-4 py-2 text-[0.82rem] text-white bg-red-500 border-0 rounded-lg cursor-pointer hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 800px) {
          .deals-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .deals-controls { flex-direction: column; align-items: stretch !important; }
          .deal-arv-col, .deal-spread-col, .deal-offers-col { display: none !important; }
          .deal-table-header { display: none !important; }
          .deal-table-row { grid-template-columns: 1fr auto auto 36px !important; gap: 4px; }
        }
        @media (max-width: 500px) {
          .deals-kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
