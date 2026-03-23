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
  Store,
  FileSignature,
  Calculator,
  FolderOpen,
  Clock,
  CheckCircle,
  FileEdit,
  Download,
  List,
  Columns3,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import SavedViewsBar from '@/components/filters/SavedViewsBar'
import ActiveFilterPills from '@/components/filters/ActiveFilterPills'
import PipelineView from '@/components/deals/PipelineView'
import BulkActionBar from '@/components/ui/BulkActionBar'
import { useBulkSelect } from '@/hooks/useBulkSelect'
import { exportToCSV } from '@/lib/csv-export'
import BuyerMatchModal from '@/components/deals/BuyerMatchModal'

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
  DRAFT: { bg: 'rgba(5,14,36,0.04)', text: 'rgba(5,14,36,0.4)' },
  ACTIVE: { bg: 'rgba(37,99,235,0.08)', text: '#2563EB' },
  UNDER_OFFER: { bg: 'rgba(139,92,246,0.08)', text: '#8B5CF6' },
  CLOSED: { bg: 'rgba(37,99,235,0.08)', text: '#2563EB' },
  CANCELLED: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444' },
  EXPIRED: { bg: 'rgba(5,14,36,0.04)', text: 'rgba(5,14,36,0.4)' },
}

const typeLabels: Record<string, string> = {
  SFR: 'SFR',
  MULTI_FAMILY: 'Multi-Family',
  CONDO: 'Condo',
  LAND: 'Land',
  COMMERCIAL: 'Commercial',
  MOBILE_HOME: 'Mobile Home',
}

const filterTabs: { key: FilterTab; label: string; icon: typeof FolderOpen }[] = [
  { key: 'ALL', label: 'All', icon: FolderOpen },
  { key: 'ACTIVE', label: 'Active', icon: Zap },
  { key: 'UNDER_OFFER', label: 'Under Offer', icon: Clock },
  { key: 'CLOSED', label: 'Closed', icon: CheckCircle },
  { key: 'DRAFT', label: 'Draft', icon: FileEdit },
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
  onFindBuyers,
  onChangeStatus,
  onDelete,
  onListMarketplace,
  onGenerateContract,
}: {
  deal: Deal
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onRunMatch: () => void
  onFindBuyers: () => void
  onChangeStatus: (status: string) => void
  onDelete: () => void
  onListMarketplace: () => void
  onGenerateContract: () => void
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
            className="fixed z-[101] bg-white rounded-[10px] shadow-lg py-1 min-w-[180px]"
            style={{ border: '1px solid rgba(5,14,36,0.06)', top: pos.top, left: pos.left }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onRunMatch(); onClose() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-600 hover:bg-gray-50 bg-transparent border-0 cursor-pointer transition-colors text-left"
            >
              <Users className="w-3.5 h-3.5 text-gray-400" /> Run Matching
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onFindBuyers(); onClose() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-[#2563EB] hover:bg-blue-50 bg-transparent border-0 cursor-pointer transition-colors text-left"
            >
              <Search className="w-3.5 h-3.5 text-[#2563EB]" /> Find Buyers
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onListMarketplace(); onClose() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-600 hover:bg-gray-50 bg-transparent border-0 cursor-pointer transition-colors text-left"
            >
              <Store className="w-3.5 h-3.5 text-gray-400" /> List on Marketplace
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onGenerateContract(); onClose() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-gray-600 hover:bg-gray-50 bg-transparent border-0 cursor-pointer transition-colors text-left"
            >
              <FileSignature className="w-3.5 h-3.5 text-gray-400" /> Generate Contract
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
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('dealflow-deals-view') as 'list' | 'pipeline') || 'list'
    }
    return 'list'
  })

  const [filter, setFilter] = useState<FilterTab>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [propertyTypeFilter, setPropertyTypeFilter] = useState('')
  const [priceRangeFilter, setPriceRangeFilter] = useState('')
  const [dateRangeFilter, setDateRangeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [sortOpen, setSortOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [matchingId, setMatchingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [findBuyersDeal, setFindBuyersDeal] = useState<Deal | null>(null)

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

  const hasAdvancedFilters = !!(propertyTypeFilter || priceRangeFilter || dateRangeFilter || statusFilter)

  function clearAdvancedFilters() {
    setPropertyTypeFilter('')
    setPriceRangeFilter('')
    setDateRangeFilter('')
    setStatusFilter('')
  }

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

    // Advanced filters
    if (propertyTypeFilter) {
      list = list.filter((d) => d.propertyType === propertyTypeFilter)
    }
    if (statusFilter) {
      list = list.filter((d) => d.status === statusFilter)
    }
    if (priceRangeFilter) {
      const [minStr, maxStr] = priceRangeFilter.split('-')
      const min = Number(minStr)
      const max = maxStr === '+' ? Infinity : Number(maxStr)
      list = list.filter((d) => d.askingPrice >= min && d.askingPrice <= max)
    }
    if (dateRangeFilter) {
      const now = Date.now()
      const msMap: Record<string, number> = { '7d': 7 * 86400000, '30d': 30 * 86400000, '90d': 90 * 86400000, '365d': 365 * 86400000 }
      const ms = msMap[dateRangeFilter]
      if (ms) list = list.filter((d) => now - new Date(d.createdAt).getTime() <= ms)
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
  }, [deals, filter, debouncedSearch, sortKey, propertyTypeFilter, priceRangeFilter, dateRangeFilter, statusFilter])

  /* ── Bulk selection ── */
  const { selectedIds, toggleSelect, isSelected, isAllSelected, toggleAll, clearSelection, count: selectedCount } = useBulkSelect(visibleDeals)

  async function handleBulkExport(ids: string[]) {
    try {
      const res = await fetch('/api/deals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export', dealIds: ids }),
      })
      const data = await res.json()
      if (data.deals) {
        exportToCSV(data.deals, `deals-selected-export-${new Date().toISOString().split('T')[0]}.csv`)
        toast.success(`Exported ${data.count} deals`)
      }
    } catch {
      toast.error('Failed to export deals')
    }
  }

  async function handleBulkDelete(ids: string[]) {
    if (!window.confirm(`Are you sure you want to delete ${ids.length} deal${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/deals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', dealIds: ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`${data.updated} deal${data.updated !== 1 ? 's' : ''} deleted`)
      clearSelection()
      fetchDeals()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete deals')
    }
  }

  async function handleBulkChangeStatus(ids: string[]) {
    const newStatus = window.prompt('Enter new status (DRAFT, ACTIVE, UNDER_OFFER, CLOSED, CANCELLED):')
    if (!newStatus) return
    const valid = ['DRAFT', 'ACTIVE', 'UNDER_OFFER', 'CLOSED', 'CANCELLED']
    if (!valid.includes(newStatus.toUpperCase())) {
      toast.warning('Invalid status')
      return
    }
    try {
      const res = await fetch('/api/deals/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_status', dealIds: ids, status: newStatus.toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`${data.updated} deal${data.updated !== 1 ? 's' : ''} updated to ${newStatus.toUpperCase().replace(/_/g, ' ')}`)
      clearSelection()
      fetchDeals()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change status')
    }
  }

  /* ── Actions ── */
  async function runMatching(dealId: string) {
    setMatchingId(dealId)
    try {
      const res = await fetch(`/api/deals/${dealId}/match`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`Matched to ${data.matches?.length ?? 0} buyers`)
      fetchDeals()
    } catch {
      toast.error('Failed to run matching')
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
      toast.success(`Status changed to ${newStatus.replace(/_/g, ' ')}`)
      fetchDeals()
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function deleteDeal(dealId: string) {
    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setDeals((prev) => prev.filter((d) => d.id !== dealId))
      toast.success('Deal deleted')
    } catch {
      toast.error('Failed to delete deal')
    }
    setConfirmDelete(null)
  }

  async function listOnMarketplace(dealId: string) {
    const deal = deals.find((d) => d.id === dealId)
    if (!deal) return
    try {
      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          headline: `${deal.address}, ${deal.city}, ${deal.state}`,
          description: `${deal.propertyType}${deal.arv ? `. ARV $${deal.arv.toLocaleString()}` : ''}. Asking $${deal.askingPrice.toLocaleString()}.`,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to list')
      }
      toast.success('Listed on Marketplace')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to list on Marketplace')
    }
  }

  async function generateContract(dealId: string) {
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          manualBuyer: {},
          generatePdf: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate contract')
      }
      toast.success('Contract generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate contract')
    }
  }

  /* ── KPI cards data ── */
  const kpis = [
    { label: 'Active Deals', value: stats.active, color: '#2563EB', icon: Zap },
    { label: 'Under Offer', value: stats.underOffer, color: '#7c3aed', icon: Handshake },
    { label: 'Pending Offers', value: stats.pendingOffers, color: '#d97706', icon: DollarSign },
    { label: 'Closed This Month', value: stats.closedThisMonth, color: '#2563EB', icon: TrendingUp },
  ]

  return (
    <div className="bg-[#F9FAFB]" data-tour="deals-content">
      {/* Vercel-style tab bar */}
      <div
        className="flex-shrink-0 bg-white"
        style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}
      >
        <div className="px-8">
          <div className="flex items-center justify-between">
            <nav className="flex gap-0.5 -mb-px">
              {filterTabs.map(tab => {
                const Icon = tab.icon
                const isActive = filter === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
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
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div
                className="inline-flex rounded-[8px] overflow-hidden"
                style={{ border: '1px solid rgba(5,14,36,0.1)' }}
              >
                <button
                  onClick={() => { setViewMode('list'); localStorage.setItem('dealflow-deals-view', 'list') }}
                  className={`inline-flex items-center gap-1 px-3 py-2 text-[0.82rem] cursor-pointer border-0 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white text-[rgba(5,14,36,0.55)] hover:bg-[rgba(5,14,36,0.04)]'
                  }`}
                  style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
                >
                  <List className="w-3.5 h-3.5" /> List
                </button>
                <button
                  onClick={() => { setViewMode('pipeline'); localStorage.setItem('dealflow-deals-view', 'pipeline') }}
                  className={`inline-flex items-center gap-1 px-3 py-2 text-[0.82rem] cursor-pointer border-0 transition-colors ${
                    viewMode === 'pipeline'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white text-[rgba(5,14,36,0.55)] hover:bg-[rgba(5,14,36,0.04)]'
                  }`}
                  style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", borderLeft: '1px solid rgba(5,14,36,0.1)' }}
                >
                  <Columns3 className="w-3.5 h-3.5" /> Pipeline
                </button>
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/deals/export')
                    const data = await res.json()
                    if (data.deals) exportToCSV(data.deals, `deals-export-${new Date().toISOString().split('T')[0]}.csv`)
                  } catch {}
                }}
                className="inline-flex items-center gap-1.5 bg-white text-[#0B1224] rounded-[8px] px-3.5 py-2 text-[0.82rem] cursor-pointer hover:bg-[rgba(5,14,36,0.04)] transition-colors"
                style={{ border: '1px solid rgba(5,14,36,0.1)' }}
              >
                <Download className="w-3.5 h-3.5 text-[rgba(5,14,36,0.45)]" /> Export
              </button>
              <Link
                href="/deals/analyze"
                className="inline-flex items-center gap-1.5 bg-white text-[#0B1224] rounded-[8px] px-3.5 py-2 text-[0.82rem] no-underline hover:bg-[rgba(5,14,36,0.04)] transition-colors"
                style={{ border: '1px solid rgba(5,14,36,0.1)' }}
              >
                <Calculator className="w-3.5 h-3.5 text-[rgba(5,14,36,0.45)]" /> Analyze Deal
              </Link>
              <Link
                href="/deals/new"
                className="inline-flex items-center gap-1.5 bg-[#2563EB] text-white rounded-[8px] px-3.5 py-2 text-[0.82rem] no-underline hover:bg-[#1D4ED8] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New deal
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-[1200px]">

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-4 gap-3.5 mb-6 deals-kpi-grid">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-[10px] px-5 py-[18px]"
            style={{ border: '1px solid rgba(5,14,36,0.06)' }}
          >
            <div style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: 'rgba(5,14,36,0.4)' }} className="mb-2.5">
              {k.label}
            </div>
            <div
              style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 700, fontSize: '2rem', color: '#0B1224', letterSpacing: '-0.04em', lineHeight: 1 }}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters + Sort */}
      <div className="flex items-center gap-2 mb-3 flex-wrap deals-controls">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals..."
            className="bg-white rounded-[8px] pl-9 pr-3 py-2 text-[0.82rem] text-gray-700 placeholder-gray-400 outline-none transition-colors w-[180px]"
            style={{ border: '1px solid rgba(5,14,36,0.1)' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(5,14,36,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>

        {/* Property Type filter */}
        <div className="relative">
          <select
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value)}
            className="appearance-none bg-white border border-[rgba(5,14,36,0.08)] rounded-[8px] pl-3 pr-7 py-2 text-[0.82rem] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB] transition-colors cursor-pointer"
            style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            <option value="">Property Type</option>
            <option value="SFR">SFR</option>
            <option value="MULTI_FAMILY">Multi-Family</option>
            <option value="CONDO">Condo</option>
            <option value="LAND">Land</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="MOBILE_HOME">Mobile Home</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>

        {/* Price Range filter */}
        <div className="relative">
          <select
            value={priceRangeFilter}
            onChange={(e) => setPriceRangeFilter(e.target.value)}
            className="appearance-none bg-white border border-[rgba(5,14,36,0.08)] rounded-[8px] pl-3 pr-7 py-2 text-[0.82rem] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB] transition-colors cursor-pointer"
            style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            <option value="">Price Range</option>
            <option value="0-50000">Under $50K</option>
            <option value="50000-100000">$50K - $100K</option>
            <option value="100000-200000">$100K - $200K</option>
            <option value="200000-500000">$200K - $500K</option>
            <option value="500000-+">$500K+</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-[rgba(5,14,36,0.08)] rounded-[8px] pl-3 pr-7 py-2 text-[0.82rem] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB] transition-colors cursor-pointer"
            style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            <option value="">Status</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="UNDER_OFFER">Under Offer</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>

        {/* Date Range filter */}
        <div className="relative">
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="appearance-none bg-white border border-[rgba(5,14,36,0.08)] rounded-[8px] pl-3 pr-7 py-2 text-[0.82rem] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB] transition-colors cursor-pointer"
            style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
          >
            <option value="">Date Range</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="365d">Last Year</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>

        {hasAdvancedFilters && (
          <button onClick={clearAdvancedFilters} className="text-xs text-gray-400 hover:text-red-500 bg-transparent border-0 cursor-pointer">
            Clear
          </button>
        )}

        <SavedViewsBar
          page="deals"
          currentFilters={{
            ...(propertyTypeFilter ? { propertyType: propertyTypeFilter } : {}),
            ...(priceRangeFilter ? { priceRange: priceRangeFilter } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(dateRangeFilter ? { dateRange: dateRangeFilter } : {}),
            ...(filter !== 'ALL' ? { tab: filter } : {}),
          }}
          onApplyView={(filters) => {
            setPropertyTypeFilter(filters.propertyType || '')
            setPriceRangeFilter(filters.priceRange || '')
            setStatusFilter(filters.status || '')
            setDateRangeFilter(filters.dateRange || '')
            if (filters.tab) setFilter(filters.tab as FilterTab)
          }}
          hasActiveFilters={hasAdvancedFilters}
        />

        {/* Sort dropdown — pushed right */}
        <div ref={sortRef} className="relative ml-auto">
          <button
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 bg-white rounded-[8px] px-3 py-2 text-[0.82rem] text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
            style={{ border: '1px solid rgba(5,14,36,0.1)' }}
          >
            {sortOptions.find((o) => o.key === sortKey)?.label}
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-[10px] shadow-lg py-1 min-w-[170px]" style={{ border: '1px solid rgba(5,14,36,0.06)' }}>
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

      {/* Active filter pills */}
      {hasAdvancedFilters && (
        <div className="mb-3">
          <ActiveFilterPills
            filters={[
              ...(propertyTypeFilter ? [{ key: 'propertyType', label: 'Type', value: propertyTypeFilter, displayValue: typeLabels[propertyTypeFilter] || propertyTypeFilter }] : []),
              ...(priceRangeFilter ? [{ key: 'priceRange', label: 'Price', value: priceRangeFilter, displayValue: priceRangeFilter === '500000-+' ? '$500K+' : `$${Number(priceRangeFilter.split('-')[0]) / 1000}K - $${Number(priceRangeFilter.split('-')[1]) / 1000}K` }] : []),
              ...(statusFilter ? [{ key: 'status', label: 'Status', value: statusFilter, displayValue: statusFilter.replace(/_/g, ' ') }] : []),
              ...(dateRangeFilter ? [{ key: 'dateRange', label: 'Date', value: dateRangeFilter, displayValue: { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '365d': 'Last year' }[dateRangeFilter] || dateRangeFilter }] : []),
            ]}
            onRemove={(key) => {
              if (key === 'propertyType') setPropertyTypeFilter('')
              if (key === 'priceRange') setPriceRangeFilter('')
              if (key === 'status') setStatusFilter('')
              if (key === 'dateRange') setDateRangeFilter('')
            }}
            onClearAll={clearAdvancedFilters}
          />
        </div>
      )}

      {/* Pipeline View */}
      {viewMode === 'pipeline' ? (
        loading ? (
          <div className="py-16 px-6 text-center">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin mx-auto mb-2" />
            <div className="text-[0.84rem] text-[rgba(5,14,36,0.4)]">Loading deals...</div>
          </div>
        ) : (
          <PipelineView deals={deals} onDealsChange={fetchDeals} />
        )
      ) : (

      /* List / Table View */
      <div className="bg-white rounded-[10px] overflow-hidden" style={{ border: '1px solid rgba(5,14,36,0.06)' }}>
        {/* Table header */}
        <div
          className="grid px-5 py-3 deal-table-header items-center"
          style={{ gridTemplateColumns: '36px 2fr 0.85fr 0.85fr 0.75fr 0.7fr 0.7fr 0.75fr 40px', background: 'rgba(5,14,36,0.02)', borderBottom: '1px solid rgba(5,14,36,0.04)' }}
        >
          <div>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
              onClick={(e) => e.stopPropagation()}
              className="accent-[#2563EB] cursor-pointer"
              style={{ width: '16px', height: '16px', borderRadius: '4px' }}
            />
          </div>
          {['Property', 'Price', 'ARV', 'Spread', 'Matches', 'Offers', 'Status', ''].map((h) => (
            <div key={h || 'actions'} style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: 'rgba(5,14,36,0.4)' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-16 px-6 text-center">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin mx-auto mb-2" />
            <div className="text-[0.84rem] text-[rgba(5,14,36,0.4)]">Loading deals...</div>
          </div>
        ) : visibleDeals.length === 0 && deals.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="text-[0.86rem] text-[rgba(5,14,36,0.65)] mb-5 max-w-[340px] mx-auto">
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
            <div className="text-[0.84rem] text-[rgba(5,14,36,0.4)]">No deals match your filters.</div>
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
                  className="grid px-5 py-3.5 items-center transition-colors cursor-pointer deal-table-row"
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37,99,235,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  data-row-border
                  style={{ gridTemplateColumns: '36px 2fr 0.85fr 0.85fr 0.75fr 0.7fr 0.7fr 0.75fr 40px', background: 'white', borderBottom: '1px solid rgba(5,14,36,0.04)' }}
                >
                  {/* Checkbox */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected(deal.id)}
                      onChange={() => toggleSelect(deal.id)}
                      className="accent-[#2563EB] cursor-pointer"
                      style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid rgba(5,14,36,0.2)' }}
                    />
                  </div>

                  {/* Property */}
                  <div className="min-w-0">
                    <div style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: 14, color: '#0B1224' }} className="truncate">
                      {deal.address}
                    </div>
                    <div style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: 12, color: 'rgba(5,14,36,0.4)' }} className="truncate">
                      {deal.city}, {deal.state} {deal.zip} · {typeLabels[deal.propertyType] || deal.propertyType} · {relativeTime(deal.createdAt)}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-[0.84rem] text-[rgba(5,14,36,0.65)]">
                    ${deal.askingPrice.toLocaleString()}
                  </div>

                  {/* ARV */}
                  <div className="text-[0.84rem] text-[rgba(5,14,36,0.65)] deal-arv-col">
                    {deal.arv != null ? `$${deal.arv.toLocaleString()}` : '—'}
                  </div>

                  {/* Spread */}
                  <div className="deal-spread-col">
                    {spread != null ? (
                      <span className={`text-[0.84rem] font-medium ${spread > 0 ? 'text-[#2563EB]' : 'text-red-500'}`}>
                        ${Math.abs(spread).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[0.84rem] text-[rgba(5,14,36,0.65)]">—</span>
                    )}
                  </div>

                  {/* Matches */}
                  <div className="text-[0.84rem] text-[rgba(5,14,36,0.65)]">
                    {isMatching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                    ) : deal.matches.length > 0 ? (
                      `${deal.matches.length} buyer${deal.matches.length !== 1 ? 's' : ''}`
                    ) : (
                      '—'
                    )}
                  </div>

                  {/* Offers */}
                  <div className="text-[0.84rem] text-[rgba(5,14,36,0.65)] deal-offers-col">
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
                      onFindBuyers={() => setFindBuyersDeal(deal)}
                      onChangeStatus={(s) => changeStatus(deal.id, s)}
                      onDelete={() => setConfirmDelete(deal.id)}
                      onListMarketplace={() => listOnMarketplace(deal.id)}
                      onGenerateContract={() => generateContract(deal.id)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[200]" onClick={() => setConfirmDelete(null)} />
          <div className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[10px] shadow-xl p-6 w-[360px]" style={{ border: '1px solid rgba(5,14,36,0.06)' }}>
            <div style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: 15, color: '#0B1224' }} className="mb-2">Delete this deal?</div>
            <p className="text-[0.82rem] text-gray-500 mb-5">
              This will cancel the deal and remove it from your active list. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-[0.82rem] text-gray-600 bg-white rounded-[8px] cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ border: '1px solid rgba(5,14,36,0.15)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDeal(confirmDelete)}
                className="px-4 py-2 text-[0.82rem] text-white bg-red-500 border-0 rounded-[8px] cursor-pointer hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Buyer match slide-out panel */}
      {findBuyersDeal && (
        <BuyerMatchModal
          dealId={findBuyersDeal.id}
          dealAddress={`${findBuyersDeal.address}, ${findBuyersDeal.city}, ${findBuyersDeal.state}`}
          onClose={() => setFindBuyersDeal(null)}
        />
      )}

      {/* Bulk action bar (sticky bottom) */}
      <BulkActionBar
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        actions={[
          {
            label: 'Export Selected',
            icon: <Download className="w-3.5 h-3.5" />,
            onClick: (ids) => handleBulkExport(ids),
          },
          {
            label: 'Change Status',
            icon: <RefreshCw className="w-3.5 h-3.5" />,
            onClick: (ids) => handleBulkChangeStatus(ids),
          },
          {
            label: 'Delete Selected',
            icon: <Trash2 className="w-3.5 h-3.5" />,
            onClick: (ids) => handleBulkDelete(ids),
            variant: 'danger',
          },
        ]}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 800px) {
          .deals-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .deals-controls { flex-direction: column; align-items: stretch !important; }
          .deal-arv-col, .deal-spread-col, .deal-offers-col { display: none !important; }
          .deal-table-header { display: none !important; }
          .deal-table-row { grid-template-columns: 36px 1fr auto auto 36px !important; gap: 4px; }
        }
        @media (max-width: 500px) {
          .deals-kpi-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />
      </div>
    </div>
  )
}
