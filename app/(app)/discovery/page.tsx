'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  Search,
  X,
  MapPin,
  Home,
  Building2,
  LandPlot,
  Warehouse,
  Ruler,
  UserCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  Lock,
  ChevronsLeft,
  ChevronsRight,
  SquareStack,
  Layers,
  Target,
  UserPlus,
  Users,
  XCircle,
  Download,
} from 'lucide-react'
import { useDiscoverySearch, FILTER_PRESETS, type PresetKey, type DiscoveryFilters } from '@/lib/hooks/useDiscoverySearch'
import type { DiscoveryProperty } from '@/lib/types/discovery'
import DiscoveryMapbox, { type MapStyleKey } from '@/components/discovery/DiscoveryMapbox'
import SavedSearches from '@/components/discovery/SavedSearches'
import { createBuyer } from '@/lib/hooks/useCRMActions'
import { useMapboxGeocode } from '@/lib/hooks/useMapboxGeocode'
import { useOwnerSearch } from '@/lib/hooks/useOwnerSearch'
import type { OwnerProfile } from '@/lib/types/owner-intelligence'
import { estimateEquity, type EquityEstimate } from '@/lib/discovery/owner-intelligence'
import type { EquityData, DistressSignals, UnifiedPropertyDetail } from '@/lib/discovery/unified-types'
import { propertiesToCSV, downloadCSV } from '@/lib/utils/csv-export'
import PropertyDetail from '@/components/discovery/PropertyDetail'
import { displayType, formatCurrency, detectOwnerType, parseOwnerName, detectEntityType, isEntity } from '@/lib/discovery/helpers'

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function typeIcon(type: string) {
  switch (type) {
    case 'SFR': return <Home className="w-3.5 h-3.5" />
    case 'Multi-Family': return <Building2 className="w-3.5 h-3.5" />
    case 'Land': return <LandPlot className="w-3.5 h-3.5" />
    case 'Condo': return <Building2 className="w-3.5 h-3.5" />
    case 'Commercial': return <Warehouse className="w-3.5 h-3.5" />
    default: return <Home className="w-3.5 h-3.5" />
  }
}

/** Map equity filter % range to minimum category */
function equityFilterMatches(cat: EquityEstimate['equityCategory'], equityMin: number | null): boolean {
  if (equityMin === null || equityMin <= 0) return true
  if (equityMin >= 60) return cat === 'high'
  if (equityMin >= 30) return cat === 'high' || cat === 'medium'
  return true
}

/* ═══════════════════════════════════════════════
   TOAST SYSTEM
   ═══════════════════════════════════════════════ */
type ToastType = 'success' | 'error' | 'warning'
interface Toast {
  id: number
  message: string
  type: ToastType
  action?: { label: string; onClick: () => void }
}

let toastId = 0

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-[8px] shadow-lg text-sm font-medium animate-slideInRight ${
            t.type === 'success' ? 'bg-[#2563EB] text-white'
              : t.type === 'error' ? 'bg-red-600 text-white'
                : 'bg-amber-500 text-white'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {t.type === 'warning' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); onDismiss(t.id) }}
              className="text-white/90 hover:text-white bg-white/20 hover:bg-white/30 border-0 rounded px-2 py-0.5 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => onDismiss(t.id)} className="text-white/70 hover:text-white bg-transparent border-0 cursor-pointer p-0 ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'success', action?: Toast['action']) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type, action }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, action ? 8000 : 4000)
    return id
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, addToast, dismissToast }
}

/* PropertyDetail is now in @/components/discovery/PropertyDetail */
type ViewMode = 'properties' | 'buyers'

export default function DiscoveryPage() {
  const [crmIds, setCrmIds] = useState<Set<string>>(new Set())
  const [addingCrmId, setAddingCrmId] = useState<string | null>(null)
  const [addingSellerId, setAddingSellerId] = useState<string | null>(null)
  const { toasts, addToast, dismissToast } = useToasts()
  const { suggestions, search: searchGeocode, clear: clearSuggestions } = useMapboxGeocode()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('street')
  const [activeLayer, setActiveLayer] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('properties')
  const [expandedOwner, setExpandedOwner] = useState<string | null>(null)
  const [selectedOwnerProps, setSelectedOwnerProps] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<'value' | 'equity' | 'sqft'>('value')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchAsMove, setSearchAsMove] = useState(false)
  const [revealUsage, setRevealUsage] = useState<{ used: number; limit: number | null; remaining: number | null } | null>(null)

  // Fetch reveal usage on mount
  useEffect(() => {
    fetch('/api/usage/reveals')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.reveals) setRevealUsage(data.reveals) })
      .catch(() => {})
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    if (!openDropdown) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('[data-dropdown]')) return
      setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openDropdown])

  // ── Enriched property features ──
  type PropertyFeatures = {
    equityData: EquityData | null
    distressSignals: DistressSignals | null
    mortgage: UnifiedPropertyDetail['mortgage'] | null
    portfolio: { properties: DiscoveryProperty[]; propertyCount: number; totalValue: number } | null
    ownerProfile: { ownerName: string; corporateIndicator: boolean; absenteeOwner: boolean; mailingAddress: string | null; investorScore: number; likelyCashBuyer: boolean } | null
  }
  const [propertyFeatures, setPropertyFeatures] = useState<Record<string, PropertyFeatures>>({})
  const [featuresLoading, setFeaturesLoading] = useState<string | null>(null)

  const {
    properties,
    loading,
    error,
    searchLocation,
    fromCache,
    filters,
    pagination,
    activeProperty,
    search,
    searchWithQuery,
    searchByBounds,
    setFilter,
    setAllFilters,
    clearFilters,
    clearBuyerMatch,
    applyPreset,
    activePreset,
    buyerMatchBanner,
    setActiveProperty,
    nextPage,
    prevPage,
    goToPage,
  } = useDiscoverySearch()

  const ownerSearch = useOwnerSearch()

  // ── Saved searches (server-persisted via SavedView) ──
  function handleApplySavedSearch(savedFilters: DiscoveryFilters) {
    setAllFilters(savedFilters)
    setShowSuggestions(false)
    clearSuggestions()
    if (savedFilters.query) {
      searchWithQuery(savedFilters.query)
      ownerSearch.search(savedFilters.query)
    }
  }

  const hasActiveFilters = !!(
    filters.query.trim() ||
    filters.propertyType.length > 0 ||
    filters.ownerType.length > 0 ||
    filters.absenteeOnly ||
    filters.taxDelinquent ||
    filters.preForeclosure ||
    filters.probate ||
    filters.bedsMin !== null ||
    filters.bedsMax !== null ||
    filters.bathsMin !== null ||
    filters.bathsMax !== null ||
    filters.sqftMin !== null ||
    filters.sqftMax !== null ||
    filters.yearBuiltMin !== null ||
    filters.yearBuiltMax !== null ||
    filters.valueMin !== null ||
    filters.valueMax !== null ||
    filters.equityMin !== null ||
    filters.equityMax !== null ||
    filters.ownershipMin !== null ||
    filters.daysOnMarketMin !== null
  )

  // Client-side filters (equity is computed, distress/daysOnMarket come from enrichment)
  const filteredProperties = useMemo(() => {
    let result = properties

    // Equity filter
    if (filters.equityMin !== null && filters.equityMin > 0) {
      result = result.filter(p => equityFilterMatches(estimateEquity(p).equityCategory, filters.equityMin))
    }

    // Distress filters (client-side — only applies to enriched properties)
    if (filters.preForeclosure) {
      result = result.filter(p => p.isPreForeclosure === true)
    }
    if (filters.taxDelinquent) {
      result = result.filter(p => p.isTaxDelinquent === true)
    }

    // Days on market (client-side fallback for non-DB-column data)
    if (filters.daysOnMarketMin != null) {
      result = result.filter(p => p.daysOnMarket != null && p.daysOnMarket >= filters.daysOnMarketMin!)
    }

    return result
  }, [properties, filters.equityMin, filters.preForeclosure, filters.taxDelinquent, filters.daysOnMarketMin])

  const activeId = activeProperty?.id ?? null

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && activeId) {
        setActiveProperty(null)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeId, setActiveProperty])

  const fetchPropertyFeatures = useCallback(async (propertyId: string) => {
    if (propertyFeatures[propertyId] || featuresLoading === propertyId) return
    setFeaturesLoading(propertyId)
    try {
      const [detailRes, portfolioRes] = await Promise.all([
        fetch(`/api/discovery/property/${propertyId}`),
        fetch(`/api/discovery/property/${propertyId}/portfolio`),
      ])
      const detailData = detailRes.ok ? await detailRes.json() : null
      const portfolioData = portfolioRes.ok ? await portfolioRes.json() : null

      // Update activeProperty with enriched data (owner name, assessed value, etc.)
      if (detailData?.property && activeProperty?.id === propertyId) {
        setActiveProperty({ ...activeProperty, ...detailData.property })
      }

      setPropertyFeatures(prev => ({
        ...prev,
        [propertyId]: {
          equityData: detailData?.features?.equityData ?? null,
          distressSignals: detailData?.features?.distressSignals ?? null,
          mortgage: detailData?.detail?.mortgage ?? null,
          portfolio: portfolioData?.portfolio ?? null,
          ownerProfile: portfolioData?.owner ?? null,
        },
      }))
    } catch {
      // Features enrichment failed — UI degrades gracefully
    } finally {
      setFeaturesLoading(null)
    }
  }, [propertyFeatures, featuresLoading, activeProperty, setActiveProperty])

  function handleSearch() {
    search()
    ownerSearch.search(filters.query)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  function handleViewDetails(p: DiscoveryProperty) {
    setActiveProperty(p)
    fetchPropertyFeatures(p.id)
  }

  function handlePinClick(id: string) {
    if (id === activeId) {
      setActiveProperty(null)
    } else {
      const p = properties.find(prop => prop.id === id)
      if (p) setActiveProperty(p)
    }
  }

  function handleListClick(p: DiscoveryProperty) {
    if (p.id === activeId) {
      setActiveProperty(null)
    } else {
      setActiveProperty(p)
    }
  }

  const addPropertyToCRM = useCallback(async (property: DiscoveryProperty, force = false) => {
    if (crmIds.has(property.id) || addingCrmId === property.id) return

    const ownerName = property.ownerName
    const entityIsOrg = isEntity(ownerName)
    const { firstName, lastName } = entityIsOrg
      ? { firstName: null, lastName: null }
      : parseOwnerName(ownerName)

    setAddingCrmId(property.id)
    try {
      const body: Record<string, unknown> = {
        firstName,
        lastName,
        entityName: entityIsOrg ? ownerName : null,
        entityType: detectEntityType(ownerName),
        address: property.addressLine1,
        city: property.city,
        state: property.state,
        zip: property.zipCode,
        status: 'ACTIVE',
        source: 'discovery',
        notes: `Imported from Find Buyers - ${property.addressLine1}, ${property.city}, ${property.state}`,
      }

      await createBuyer(body)
      setCrmIds(prev => new Set(prev).add(property.id))
      addToast(`Added ${ownerName || property.addressLine1} to CRM`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to CRM'
      if (message.includes('already exists') && !force) {
        addToast(
          'This buyer may already be in your CRM',
          'warning',
          {
            label: 'Add Anyway',
            onClick: () => {
              // Re-attempt without phone duplicate check (the API checks phone only)
              addPropertyToCRM(property, true)
            },
          },
        )
      } else {
        addToast(message, 'error')
      }
    } finally {
      setAddingCrmId(null)
    }
  }, [crmIds, addingCrmId, addToast])

  const addPropertyAsSeller = useCallback(async (property: DiscoveryProperty) => {
    if (addingSellerId === property.id) return

    const ownerName = property.ownerName
    const entityIsOrg = isEntity(ownerName)
    const { firstName, lastName } = entityIsOrg
      ? { firstName: null, lastName: null }
      : parseOwnerName(ownerName)

    // Detect seller motivation from distress signals
    const feat = propertyFeatures[property.id]
    const distress = feat?.distressSignals
    let sellerMotivation: string | null = null
    if (distress) {
      if (distress.foreclosure?.active) sellerMotivation = 'Pre-foreclosure'
      else if (distress.taxDelinquent?.isDelinquent) sellerMotivation = 'Tax delinquent'
    }

    setAddingSellerId(property.id)
    try {
      const body: Record<string, unknown> = {
        firstName,
        lastName,
        entityName: entityIsOrg ? ownerName : null,
        entityType: detectEntityType(ownerName),
        address: property.addressLine1,
        city: property.city,
        state: property.state,
        zip: property.zipCode,
        status: 'ACTIVE',
        source: 'discovery',
        contactType: 'SELLER',
        sellerPropertyId: property.id,
        sellerMotivation,
        notes: `Seller imported from Discovery - ${property.addressLine1}, ${property.city}, ${property.state}`,
      }

      await createBuyer(body)
      addToast(`Added ${ownerName || property.addressLine1} as seller`, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to add seller', 'error')
    } finally {
      setAddingSellerId(null)
    }
  }, [addingSellerId, addToast, propertyFeatures])

  const [bulkImporting, setBulkImporting] = useState(false)

  const handleBulkCRMImport = useCallback(async () => {
    const selected = filteredProperties.filter(p => selectedIds.has(p.id))
    if (selected.length === 0) return
    setBulkImporting(true)
    let added = 0
    for (const p of selected) {
      if (crmIds.has(p.id)) continue
      try {
        const entityIsOrg = isEntity(p.ownerName)
        const { firstName, lastName } = entityIsOrg ? { firstName: null, lastName: null } : parseOwnerName(p.ownerName)
        await createBuyer({
          firstName, lastName,
          entityName: entityIsOrg ? p.ownerName : null,
          entityType: detectEntityType(p.ownerName),
          address: p.addressLine1, city: p.city, state: p.state, zip: p.zipCode,
          status: 'ACTIVE', source: 'discovery',
          notes: `Bulk imported from Find Buyers`,
        })
        setCrmIds(prev => new Set(prev).add(p.id))
        added++
      } catch { /* skip duplicates */ }
    }
    setBulkImporting(false)
    addToast(`Added ${added} of ${selected.length} to CRM`, added > 0 ? 'success' : 'warning')
    setSelectedIds(new Set())
  }, [filteredProperties, selectedIds, crmIds, addToast])

  const handleExportCSV = useCallback(() => {
    const selected = filteredProperties.filter(p => selectedIds.has(p.id))
    const toExport = selected.length > 0 ? selected : filteredProperties
    const csv = propertiesToCSV(toExport)
    const location = filters.query || 'properties'
    downloadCSV(csv, `dealflow-${location.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`)
    addToast(`Exported ${toExport.length} properties`, 'success')
  }, [filteredProperties, selectedIds, filters.query, addToast])

  function handleOwnerClick(owner: OwnerProfile) {
    const key = owner.normalizedName
    if (expandedOwner === key) {
      setExpandedOwner(null)
      setSelectedOwnerProps(new Set())
    } else {
      setExpandedOwner(key)
      setSelectedOwnerProps(new Set(owner.properties.map(p => p.id)))
    }
  }

  // Count active filters for badge
  const activeFilterCount = [
    filters.propertyType.length > 0,
    filters.bedsMin !== null || filters.bedsMax !== null,
    filters.bathsMin !== null || filters.bathsMax !== null,
    filters.sqftMin !== null || filters.sqftMax !== null,
    filters.yearBuiltMin !== null || filters.yearBuiltMax !== null,
    filters.valueMin !== null || filters.valueMax !== null,
    filters.ownerType.length > 0,
    filters.absenteeOnly,
    filters.equityMin !== null && filters.equityMin > 0,
    filters.ownershipMin !== null,
    filters.daysOnMarketMin !== null,
  ].filter(Boolean).length

  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentStart = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0
  const currentEnd = Math.min(pagination.page * pagination.limit, pagination.total)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProperties.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProperties.map(p => p.id)))
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }} data-tour="discovery-content">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ═══ TOP SEARCH BAR ═══ */}
      <div className="flex-shrink-0 bg-white border-b border-[rgba(5,14,36,0.06)] px-2 sm:px-4 py-2.5 z-20">
        <div className="flex items-center gap-2 pl-1 sm:pl-3 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Search icon + input */}
          <div className="flex items-center gap-2 flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={filters.query}
              onChange={e => {
                const val = e.target.value
                setFilter('query', val)
                searchGeocode(val)
                setShowSuggestions(true)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setShowSuggestions(false)
                  // If there are geocode suggestions and query doesn't already look parseable, use the first suggestion
                  if (suggestions.length > 0 && !filters.query.includes(',') && !/\d{5}/.test(filters.query)) {
                    const first = suggestions[0]
                    clearSuggestions()
                    searchWithQuery(first.displayText)
                    ownerSearch.search(first.displayText)
                  } else {
                    clearSuggestions()
                    handleSearch()
                  }
                }
                if (e.key === 'Escape') {
                  setShowSuggestions(false)
                  clearSuggestions()
                }
              }}
              onFocus={() => {
                setShowSuggestions(true)
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 150)
              }}
              placeholder="Address, city, county, state, zip..."
              className="flex-1 bg-transparent border-0 outline-none text-[14px] font-[400] text-[rgba(5,14,36,0.65)] placeholder-[rgba(5,14,36,0.4)] min-w-[120px] sm:min-w-[180px]"
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-[#2563EB] animate-spin flex-shrink-0" />
            )}

            {/* Autocomplete dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[10px] border border-[rgba(5,14,36,0.06)] shadow-xl overflow-hidden z-30">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      setShowSuggestions(false)
                      clearSuggestions()
                      searchWithQuery(s.displayText)
                      ownerSearch.search(s.displayText)
                    }}
                    className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-[#EFF6FF] transition-colors cursor-pointer border-0 bg-transparent border-b border-b-gray-100 last:border-b-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[0.82rem] font-medium text-[#0B1224] truncate">{s.displayText}</div>
                      <div className="text-[0.7rem] text-gray-400 truncate">{s.placeName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-gray-200" />

          {/* ── Preset buttons ── */}
          {(Object.entries(FILTER_PRESETS) as [Exclude<PresetKey, null>, typeof FILTER_PRESETS[keyof typeof FILTER_PRESETS]][]).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => { applyPreset(key); if (filters.query) handleSearch() }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[14px] font-[400] border cursor-pointer transition-colors whitespace-nowrap ${
                activePreset === key
                  ? 'bg-[#2563EB] text-white border-[#2563EB] font-[600]'
                  : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
              }`}
            >
              {key === 'motivatedSellers' ? <Target className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
              {preset.label}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-7 bg-gray-200" />

          {/* ── Lead Types dropdown ── */}
          <div className="relative" data-dropdown ref={openDropdown === 'leadTypes' ? dropdownRef : undefined}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'leadTypes' ? null : 'leadTypes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[14px] font-[400] border cursor-pointer transition-colors ${
                (filters.absenteeOnly || filters.taxDelinquent || filters.preForeclosure || filters.probate)
                  ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border-[#BFDBFE] font-[600]'
                  : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
              }`}
            >
              Lead Types
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown === 'leadTypes' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'leadTypes' && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-[10px] border border-[rgba(5,14,36,0.06)] shadow-xl z-40 w-[220px] py-2">
                {[
                  { label: 'Absentee Owner', key: 'absenteeOnly' as const },
                  { label: 'Tax Delinquent', key: 'taxDelinquent' as const },
                  { label: 'Pre-Foreclosure', key: 'preForeclosure' as const },
                  { label: 'Probate', key: 'probate' as const },
                ].map(tog => (
                  <label key={tog.key} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-[#2563EB] w-4 h-4"
                      checked={filters[tog.key] as boolean}
                      onChange={e => setFilter(tog.key, e.target.checked)}
                    />
                    <span className="text-[0.8rem] text-[rgba(5,14,36,0.65)]">{tog.label}</span>
                  </label>
                ))}
                {/* Owner Type */}
                <div className="border-t border-gray-100 mt-1 pt-1 px-3">
                  <div className="text-[0.68rem] text-gray-400 uppercase tracking-wide mb-1.5">Owner Type</div>
                  {['Individual', 'LLC/Corp', 'Trust', 'Bank-Owned'].map(t => (
                    <label key={t} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-[#2563EB] w-4 h-4"
                        checked={filters.ownerType.includes(t)}
                        onChange={() => {
                          const current = filters.ownerType
                          if (current.includes(t)) setFilter('ownerType', current.filter(x => x !== t))
                          else setFilter('ownerType', [...current, t])
                        }}
                      />
                      <span className="text-[0.8rem] text-[rgba(5,14,36,0.65)]">{t}</span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-gray-100 mt-1 pt-2 px-3 pb-1">
                  <button
                    onClick={() => { handleSearch(); setOpenDropdown(null) }}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-[600] border-0 rounded-[8px] px-3 py-1.5 text-[14px] cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Property Types dropdown ── */}
          <div className="relative" data-dropdown ref={openDropdown === 'propertyTypes' ? dropdownRef : undefined}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'propertyTypes' ? null : 'propertyTypes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[14px] font-[400] border cursor-pointer transition-colors ${
                filters.propertyType.length > 0
                  ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border-[#BFDBFE] font-[600]'
                  : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
              }`}
            >
              Property Types
              {filters.propertyType.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-[0.6rem] font-bold flex items-center justify-center leading-none">
                  {filters.propertyType.length}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown === 'propertyTypes' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'propertyTypes' && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-[10px] border border-[rgba(5,14,36,0.06)] shadow-xl z-40 w-[200px] py-2">
                {['SFR', 'Multi-Family', 'Condo', 'Land', 'Commercial'].map(t => (
                  <label key={t} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-[#2563EB] w-4 h-4"
                      checked={filters.propertyType.includes(t)}
                      onChange={() => {
                        const current = filters.propertyType
                        if (current.includes(t)) setFilter('propertyType', current.filter(x => x !== t))
                        else setFilter('propertyType', [...current, t])
                      }}
                    />
                    <span className="text-[0.8rem] text-[rgba(5,14,36,0.65)] flex items-center gap-1.5">
                      {typeIcon(t)} {t}
                    </span>
                  </label>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-2 px-3 pb-1">
                  <button
                    onClick={() => { handleSearch(); setOpenDropdown(null) }}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-[600] border-0 rounded-[8px] px-3 py-1.5 text-[14px] cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Price dropdown ── */}
          <div className="relative" data-dropdown ref={openDropdown === 'price' ? dropdownRef : undefined}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'price' ? null : 'price')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[14px] font-[400] border cursor-pointer transition-colors ${
                filters.valueMin != null || filters.valueMax != null
                  ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border-[#BFDBFE] font-[600]'
                  : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
              }`}
            >
              Price
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown === 'price' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'price' && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-[10px] border border-[rgba(5,14,36,0.06)] shadow-xl z-40 w-[280px] p-3">
                <div className="text-[0.72rem] text-gray-500 font-medium mb-2">Est. Value Range</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Min"
                      value={filters.valueMin != null ? `$${filters.valueMin.toLocaleString()}` : ''}
                      onChange={e => {
                        const cleaned = e.target.value.replace(/[$,\s]/g, '')
                        setFilter('valueMin', cleaned ? parseInt(cleaned) || null : null)
                      }}
                      className="w-full bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2.5 py-2 text-[14px] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB]"
                    />
                  </div>
                  <span className="text-gray-400 text-[0.78rem]">to</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Max"
                      value={filters.valueMax != null ? `$${filters.valueMax.toLocaleString()}` : ''}
                      onChange={e => {
                        const cleaned = e.target.value.replace(/[$,\s]/g, '')
                        setFilter('valueMax', cleaned ? parseInt(cleaned) || null : null)
                      }}
                      className="w-full bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2.5 py-2 text-[14px] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {[
                    { label: 'Under $100K', min: null, max: 100000 },
                    { label: '$100K–$300K', min: 100000, max: 300000 },
                    { label: '$300K–$500K', min: 300000, max: 500000 },
                    { label: '$500K–$1M', min: 500000, max: 1000000 },
                    { label: '$1M+', min: 1000000, max: null },
                  ].map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setFilter('valueMin', p.min); setFilter('valueMax', p.max) }}
                      className={`text-[0.7rem] font-medium px-2 py-1 rounded border cursor-pointer transition-colors ${
                        filters.valueMin === p.min && filters.valueMax === p.max
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => { setFilter('valueMin', null); setFilter('valueMax', null) }}
                    className="text-[0.74rem] text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => { handleSearch(); setOpenDropdown(null) }}
                    className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-[600] border-0 rounded-[8px] px-3 py-1.5 text-[14px] cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Beds / Baths dropdown ── */}
          <div className="relative" data-dropdown ref={openDropdown === 'bedsBaths' ? dropdownRef : undefined}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'bedsBaths' ? null : 'bedsBaths')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[14px] font-[400] border cursor-pointer transition-colors ${
                filters.bedsMin != null || filters.bedsMax != null || filters.bathsMin != null || filters.bathsMax != null
                  ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border-[#BFDBFE] font-[600]'
                  : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
              }`}
            >
              Beds / Baths
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown === 'bedsBaths' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'bedsBaths' && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-[10px] border border-[rgba(5,14,36,0.06)] shadow-xl z-40 w-[280px] p-3">
                {/* Bedrooms */}
                <div className="mb-3">
                  <div className="text-[0.72rem] text-gray-500 font-medium mb-2">Bedrooms</div>
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'Any', val: null },
                      { label: '1+', val: 1 },
                      { label: '2+', val: 2 },
                      { label: '3+', val: 3 },
                      { label: '4+', val: 4 },
                      { label: '5+', val: 5 },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => { setFilter('bedsMin', opt.val); if (opt.val === null) setFilter('bedsMax', null) }}
                        className={`flex-1 text-[0.74rem] font-medium py-1.5 rounded border cursor-pointer transition-colors ${
                          filters.bedsMin === opt.val
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Bathrooms */}
                <div className="mb-3">
                  <div className="text-[0.72rem] text-gray-500 font-medium mb-2">Bathrooms</div>
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'Any', val: null },
                      { label: '1+', val: 1 },
                      { label: '2+', val: 2 },
                      { label: '3+', val: 3 },
                      { label: '4+', val: 4 },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => { setFilter('bathsMin', opt.val); if (opt.val === null) setFilter('bathsMax', null) }}
                        className={`flex-1 text-[0.74rem] font-medium py-1.5 rounded border cursor-pointer transition-colors ${
                          filters.bathsMin === opt.val
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setFilter('bedsMin', null); setFilter('bedsMax', null); setFilter('bathsMin', null); setFilter('bathsMax', null) }}
                    className="text-[0.74rem] text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => { handleSearch(); setOpenDropdown(null) }}
                    className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-[600] border-0 rounded-[8px] px-3 py-1.5 text-[14px] cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── More dropdown ── */}
          <div className="relative" data-dropdown ref={openDropdown === 'more' ? dropdownRef : undefined}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'more' ? null : 'more')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[14px] font-[400] border cursor-pointer transition-colors ${
                filters.sqftMin != null || filters.sqftMax != null || filters.yearBuiltMin != null || filters.yearBuiltMax != null || (filters.equityMin != null && filters.equityMin > 0) || filters.ownershipMin != null || filters.daysOnMarketMin != null
                  ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border-[#BFDBFE] font-[600]'
                  : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              More
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown === 'more' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'more' && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-[10px] border border-[rgba(5,14,36,0.06)] shadow-xl z-40 w-[320px] p-3">
                {/* Square Footage */}
                <div className="mb-3">
                  <div className="text-[0.72rem] text-gray-500 font-medium mb-2">Square Footage</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Min"
                      value={filters.sqftMin ?? ''}
                      onChange={e => setFilter('sqftMin', e.target.value ? parseInt(e.target.value) || null : null)}
                      className="flex-1 bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2.5 py-2 text-[14px] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-gray-400 text-[0.78rem]">to</span>
                    <input
                      type="text"
                      placeholder="Max"
                      value={filters.sqftMax ?? ''}
                      onChange={e => setFilter('sqftMax', e.target.value ? parseInt(e.target.value) || null : null)}
                      className="flex-1 bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2.5 py-2 text-[14px] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
                {/* Year Built */}
                <div className="mb-3">
                  <div className="text-[0.72rem] text-gray-500 font-medium mb-2">Year Built</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Min"
                      value={filters.yearBuiltMin ?? ''}
                      onChange={e => setFilter('yearBuiltMin', e.target.value ? parseInt(e.target.value) || null : null)}
                      className="flex-1 bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2.5 py-2 text-[14px] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-gray-400 text-[0.78rem]">to</span>
                    <input
                      type="text"
                      placeholder="Max"
                      value={filters.yearBuiltMax ?? ''}
                      onChange={e => setFilter('yearBuiltMax', e.target.value ? parseInt(e.target.value) || null : null)}
                      className="flex-1 bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2.5 py-2 text-[14px] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>
                {/* Equity Level */}
                <div className="mb-3">
                  <div className="text-[0.72rem] text-gray-500 font-medium mb-2">Equity Level</div>
                  <div className="flex items-center gap-1">
                    {([
                      { value: null, label: 'All' },
                      { value: 30, label: 'Med+' },
                      { value: 60, label: 'High' },
                    ] as const).map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setFilter('equityMin', opt.value)}
                        className={`flex-1 text-[0.74rem] font-medium py-1.5 rounded border cursor-pointer transition-colors ${
                          filters.equityMin === opt.value
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Ownership length */}
                <div className="mb-3">
                  <div className="text-[0.72rem] text-gray-500 font-medium mb-2">Min Ownership (years)</div>
                  <input
                    type="text"
                    placeholder="Any"
                    value={filters.ownershipMin ?? ''}
                    onChange={e => setFilter('ownershipMin', e.target.value ? parseInt(e.target.value) || null : null)}
                    className="w-24 bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2.5 py-2 text-[14px] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB]"
                  />
                </div>
                {/* Days on market */}
                <div className="mb-3">
                  <div className="text-[0.72rem] text-gray-500 font-medium mb-2">Min Days on Market</div>
                  <input
                    type="text"
                    placeholder="Any"
                    value={filters.daysOnMarketMin ?? ''}
                    onChange={e => setFilter('daysOnMarketMin', e.target.value ? parseInt(e.target.value) || null : null)}
                    className="w-24 bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2.5 py-2 text-[14px] text-[rgba(5,14,36,0.65)] outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFilter('sqftMin', null); setFilter('sqftMax', null)
                      setFilter('yearBuiltMin', null); setFilter('yearBuiltMax', null)
                      setFilter('equityMin', null); setFilter('ownershipMin', null); setFilter('daysOnMarketMin', null)
                    }}
                    className="text-[0.74rem] text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => { handleSearch(); setOpenDropdown(null) }}
                    className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-[600] border-0 rounded-[8px] px-3 py-1.5 text-[14px] cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-gray-200" />

          {/* Saved Searches */}
          <SavedSearches
            currentFilters={filters}
            onApplySearch={handleApplySavedSearch}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2 mt-2 text-[14px] text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            {filters.query && (
              <button
                onClick={handleSearch}
                className="text-[0.76rem] font-semibold text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 border-0 rounded-[6px] px-2.5 py-1 cursor-pointer transition-colors whitespace-nowrap"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══ MAIN CONTENT: MAP + SIDEBAR ═══ */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ── Map (left / top on mobile) ── */}
        <div className="flex-1 relative min-h-[280px] md:min-h-0">
          <DiscoveryMapbox
            properties={filteredProperties}
            onPinClick={handlePinClick}
            activeId={activeId}
            searchLocation={searchLocation}
            mapStyle={mapStyle}
            highlightIds={selectedOwnerProps}
            onBoundsChange={(bounds, zoom) => {
              if (searchAsMove && zoom >= 10) searchByBounds(bounds)
            }}
          />

          {/* Map overlay controls */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
            {/* Map style toggle */}
            <div className="bg-white rounded-[8px] border border-[rgba(5,14,36,0.06)] shadow-sm flex overflow-hidden">
              <button
                onClick={() => setMapStyle('street')}
                className={`text-[0.72rem] font-medium px-3 py-1.5 cursor-pointer border-0 transition-colors ${
                  mapStyle === 'street'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-transparent text-[rgba(5,14,36,0.65)] hover:bg-gray-100'
                }`}
              >
                Street
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`text-[0.72rem] font-medium px-3 py-1.5 cursor-pointer border-0 transition-colors ${
                  mapStyle === 'satellite'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-transparent text-[rgba(5,14,36,0.65)] hover:bg-gray-100'
                }`}
              >
                Satellite
              </button>
            </div>

            {/* Layer filters */}
            {[
              { key: 'all',         label: 'All',         coming: false },
              { key: 'cash_buyers', label: 'Cash Buyers',  coming: true },
              { key: 'high_equity', label: 'High Equity',  coming: true },
              { key: 'distressed',  label: 'Distressed',   coming: true },
            ].map(lf => (
              <div key={lf.key} className="relative group">
                <button
                  onClick={() => {
                    if (!lf.coming) setActiveLayer(lf.key)
                  }}
                  disabled={lf.coming}
                  className={`text-[14px] font-[400] px-3 py-1.5 rounded-[8px] border transition-colors ${
                    lf.coming
                      ? 'bg-white/70 text-[rgba(5,14,36,0.3)] border-[rgba(5,14,36,0.04)] cursor-not-allowed shadow-sm'
                      : activeLayer === lf.key
                        ? 'bg-[#2563EB] text-white border-[#2563EB] font-[600] shadow-sm cursor-pointer'
                        : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50 shadow-sm cursor-pointer'
                  }`}
                >
                  {lf.label}
                </button>
                {lf.coming && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[0.62rem] font-medium px-2 py-1 rounded whitespace-nowrap z-30 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Coming soon
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Search as I move checkbox */}
          <label className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-[8px] border border-[rgba(5,14,36,0.06)] shadow-sm px-2 sm:px-3 py-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={searchAsMove}
              onChange={e => setSearchAsMove(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#2563EB] cursor-pointer"
            />
            <span className="text-[12px] sm:text-[14px] font-[400] text-[rgba(5,14,36,0.65)]"><span className="hidden sm:inline">Search as I move the map</span><span className="sm:hidden">Auto-search</span></span>
          </label>
        </div>

        {/* ── Right Sidebar (property list) ── */}
        <div className="w-full md:w-[420px] flex-shrink-0 border-t md:border-t-0 md:border-l border-[rgba(5,14,36,0.06)] bg-white flex flex-col max-h-[50vh] min-h-[200px] md:max-h-full md:min-h-0">
          {/* Buyer match banner */}
          {buyerMatchBanner && (
            <div className="flex items-center justify-between px-4 py-2 bg-[rgba(37,99,235,0.06)] border-b border-[rgba(37,99,235,0.12)] flex-shrink-0">
              <span className="text-[13px] font-medium text-[#2563EB]">{buyerMatchBanner}</span>
              <button
                onClick={clearBuyerMatch}
                className="text-[12px] text-[rgba(5,14,36,0.45)] hover:text-[#EF4444] bg-transparent border-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
          {/* Results header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(5,14,36,0.06)] flex-shrink-0 bg-gray-50/50">
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex gap-0">
                <button
                  onClick={() => { setViewMode('properties'); setSelectedOwnerProps(new Set()) }}
                  className={`px-3 py-1.5 text-[14px] border-0 bg-transparent cursor-pointer transition-colors relative ${
                    viewMode === 'properties'
                      ? 'text-[#2563EB] font-[600]'
                      : 'text-[rgba(5,14,36,0.45)] font-[400] hover:text-[rgba(5,14,36,0.65)]'
                  }`}
                >
                  Properties
                  {viewMode === 'properties' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB] rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setViewMode('buyers')}
                  className={`px-3 py-1.5 text-[14px] border-0 bg-transparent cursor-pointer transition-colors relative ${
                    viewMode === 'buyers'
                      ? 'text-[#2563EB] font-[600]'
                      : 'text-[rgba(5,14,36,0.45)] font-[400] hover:text-[rgba(5,14,36,0.65)]'
                  }`}
                >
                  Buyers
                  {viewMode === 'buyers' && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB] rounded-full" />
                  )}
                </button>
              </div>
              <span className="text-[0.76rem] text-gray-500">
                {viewMode === 'properties'
                  ? (pagination.total > 0
                    ? <><span className="font-semibold text-[#0B1224]">{currentStart.toLocaleString()}</span> - <span className="font-semibold text-[#0B1224]">{currentEnd.toLocaleString()}</span> of <span className="font-semibold text-[#0B1224]">{pagination.total.toLocaleString()}</span> Results</>
                    : 'No results')
                  : (ownerSearch.total > 0
                    ? <><span className="font-semibold text-[#0B1224]">{ownerSearch.total.toLocaleString()}</span> Investors</>
                    : 'No investors')
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              {viewMode === 'properties' && (
                <>
                  {/* Sort dropdown */}
                  <select
                    value={sortField}
                    onChange={e => setSortField(e.target.value as 'value' | 'equity' | 'sqft')}
                    className="text-[14px] font-[400] text-[rgba(5,14,36,0.65)] bg-white border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2 py-1 cursor-pointer outline-none"
                  >
                    <option value="value">Sort by Value</option>
                    <option value="equity">Sort by Equity</option>
                    <option value="sqft">Sort by Sq Ft</option>
                  </select>
                  {/* Checkbox select all */}
                  <input
                    type="checkbox"
                    checked={filteredProperties.length > 0 && selectedIds.size === filteredProperties.length}
                    onChange={toggleSelectAll}
                    className="accent-[#2563EB] w-4 h-4 cursor-pointer"
                    title="Select all"
                  />
                  {/* Selected count badge */}
                  {selectedIds.size > 0 && (
                    <span className="flex items-center gap-1 bg-[#2563EB] text-white text-[0.66rem] font-semibold px-2 py-0.5 rounded-full">
                      <SquareStack className="w-3 h-3" />
                      {selectedIds.size}
                    </span>
                  )}
                  {/* Clear all filters */}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { clearFilters(); if (filters.query) handleSearch() }}
                      className="flex items-center gap-1 text-[0.72rem] text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer whitespace-nowrap"
                    >
                      <XCircle className="w-3 h-3" />
                      Clear ({activeFilterCount})
                    </button>
                  )}
                  {/* Export CSV */}
                  {filteredProperties.length > 0 && selectedIds.size === 0 && (
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1 text-[0.72rem] text-gray-500 hover:text-[#0B1224] bg-transparent border-0 cursor-pointer"
                      title="Export results as CSV"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Usage counter */}
          {revealUsage && revealUsage.limit != null && (
            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[rgba(5,14,36,0.06)] bg-gray-50/30 flex-shrink-0">
              <Lock className="w-3 h-3 text-gray-400" />
              <span className="text-[0.7rem] text-gray-400">
                {revealUsage.used}/{revealUsage.limit} reveals
              </span>
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    revealUsage.remaining === 0
                      ? 'bg-red-400'
                      : revealUsage.remaining != null && revealUsage.remaining <= Math.ceil(revealUsage.limit * 0.2)
                      ? 'bg-amber-400'
                      : 'bg-[#2563EB]'
                  }`}
                  style={{ width: `${Math.min(100, (revealUsage.used / revealUsage.limit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Results info bar */}
          {searchLocation && properties.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[rgba(5,14,36,0.06)] bg-blue-50/40 flex-shrink-0">
              <MapPin className="w-3 h-3 text-blue-400" />
              <span className="text-[0.7rem] text-blue-500 font-medium">{searchLocation}</span>
              {fromCache && <span className="text-[0.62rem] text-gray-400 ml-auto">Cached</span>}
            </div>
          )}

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">

            {/* ────── PROPERTIES VIEW ────── */}
            {viewMode === 'properties' && (<>
              {loading && properties.length === 0 && (
                <div className="space-y-0">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 border-b border-[rgba(5,14,36,0.06)] animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-[8px] bg-gray-200 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                          <div className="flex gap-4 mt-1">
                            <div className="h-3 bg-gray-100 rounded w-16" />
                            <div className="h-3 bg-gray-100 rounded w-16" />
                            <div className="h-3 bg-gray-100 rounded w-16" />
                          </div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-20 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loading && properties.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 px-6 text-center">
                  <Search className="w-8 h-8 mb-2 text-gray-300" />
                  {filters.query ? (
                    <>
                      <span className="text-[0.82rem] font-medium text-gray-500 mb-1">No properties found</span>
                      {activeFilterCount > 0 ? (
                        <>
                          <span className="text-[0.72rem] text-gray-400 mb-2">
                            Try removing some filters to see more results
                          </span>
                          <button
                            onClick={() => { clearFilters(); }}
                            className="text-[0.78rem] text-[#2563EB] hover:underline bg-transparent border-0 cursor-pointer"
                          >
                            Clear all filters
                          </button>
                        </>
                      ) : /\d/.test(filters.query) ? (
                        <span className="text-[0.72rem] text-gray-400">
                          Try searching by city, state or zip code instead of a specific address
                        </span>
                      ) : (
                        <span className="text-[0.72rem] text-gray-400">
                          Try a different location or broader search area
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-[0.82rem] font-medium text-gray-500 mb-0.5">Search for properties</span>
                      <span className="text-[0.72rem] text-gray-400">Enter a city and state or zip code</span>
                    </>
                  )}
                </div>
              )}
              {/* Pagination loading overlay */}
              {loading && properties.length > 0 && (
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50/60 border-b border-blue-100 text-[0.76rem] text-blue-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading results...
                </div>
              )}
              {filteredProperties.length > 0 && (
                <div className={`divide-y divide-gray-100 ${loading && properties.length > 0 ? 'opacity-60 pointer-events-none' : ''}`}>
                  {filteredProperties.map(p => {
                    const pType = displayType(p.propertyType)
                    const isActive = activeId === p.id
                    const eq = estimateEquity(p)
                    const isSelected = selectedIds.has(p.id)
                    const ownerT = detectOwnerType(p.ownerName)
                    return (
                      <div
                        key={p.id}
                        className={`px-4 py-3 cursor-pointer transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50/60'
                            : 'hover:bg-gray-50/60'
                        }`}
                        onClick={() => handleListClick(p)}
                      >
                        {/* Row 1: Checkbox + Address + Value */}
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => { e.stopPropagation(); toggleSelect(p.id) }}
                            onClick={(e) => e.stopPropagation()}
                            className="accent-[#2563EB] w-4 h-4 mt-0.5 cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-[15px] font-[600] text-[#0B1224] leading-tight">{p.addressLine1}</h3>
                                <p className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)] mt-0.5">{p.city}, {p.state} {p.zipCode}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(p.assessedValue)}</div>
                                <div className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Est. Value</div>
                              </div>
                            </div>

                            {/* Row 2: Stats */}
                            <div className="flex items-center gap-4 mt-2">
                              {(p.sqft ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-[14px] font-[400] text-[rgba(5,14,36,0.65)]">
                                  <Ruler className="w-3.5 h-3.5 text-[rgba(5,14,36,0.4)]" />
                                  {p.sqft!.toLocaleString()} Sq. Ft.
                                </span>
                              )}
                              {eq.equityCategory !== 'unknown' && eq.lastSalePrice != null && eq.lastSalePrice > 0 && eq.estimatedCurrentValue > 0 && (
                                <span className="text-[14px] font-[600] text-[#0B1224]">
                                  {Math.round(((eq.estimatedCurrentValue - eq.lastSalePrice) / eq.estimatedCurrentValue) * 100)}%
                                  <span className="text-[rgba(5,14,36,0.4)] font-[400] ml-1">Equity</span>
                                </span>
                              )}
                            </div>

                            {/* Row 3: Property type + Owner type */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="flex items-center gap-1 text-[0.72rem] text-gray-500">
                                {typeIcon(pType)}
                                {pType}
                              </span>
                              {p.ownerName ? (
                                <span className={`flex items-center gap-1 text-[0.72rem] ${ownerT.color} px-1.5 py-0.5 rounded`}>
                                  {ownerT.label === 'Individual' ? <UserCircle className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                  {ownerT.label}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[0.72rem] text-gray-400 px-1.5 py-0.5 rounded bg-gray-50">
                                  <Lock className="w-3 h-3" /> Owner on click
                                </span>
                              )}
                            </div>

                            {/* Row 4: Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {p.isPreForeclosure && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-red-200 text-red-700 bg-red-50">
                                  Pre-Foreclosure
                                </span>
                              )}
                              {p.isTaxDelinquent && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-amber-200 text-amber-700 bg-amber-50">
                                  Tax Delinquent
                                </span>
                              )}
                              {(p.isHighEquity || eq.equityCategory === 'high') && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-green-200 text-green-700 bg-green-50">
                                  High Equity
                                </span>
                              )}
                              {(p.isAbsenteeOwner || p.ownerOccupied === false) && (
                                <span className="text-[11px] font-[400] px-2 py-0.5 rounded-full border border-blue-200 text-blue-600 bg-blue-50">
                                  Absentee
                                </span>
                              )}
                              {p.isCorporateOwner && (
                                <span className="text-[11px] font-[400] px-2 py-0.5 rounded-full border border-[rgba(5,14,36,0.06)] text-[rgba(5,14,36,0.65)] bg-gray-50">
                                  Corporate
                                </span>
                              )}
                              {p.isCashBuyer && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50">
                                  Cash Buyer
                                </span>
                              )}
                              {p.isFreeAndClear && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-teal-200 text-teal-700 bg-teal-50">
                                  Free &amp; Clear
                                </span>
                              )}
                              {p.isVacant && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-violet-200 text-violet-700 bg-violet-50">
                                  Vacant
                                </span>
                              )}
                              {p.isTrustOwned && (
                                <span className="text-[11px] font-[400] px-2 py-0.5 rounded-full border border-sky-200 text-sky-700 bg-sky-50">
                                  Trust Owned
                                </span>
                              )}
                              {p.salePropensity === 'High' && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-rose-200 text-rose-700 bg-rose-50">
                                  High Sale Propensity
                                </span>
                              )}
                              {p.listingStatus === 'Active' && p.daysOnMarket != null && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-purple-200 text-purple-700 bg-purple-50">
                                  On Market {p.daysOnMarket}d
                                </span>
                              )}
                              {p.listingStatus === 'Pending' && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50">
                                  Pending
                                </span>
                              )}
                              {p.listingStatus === 'Sold' && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-gray-300 text-gray-600 bg-gray-100">
                                  Sold
                                </span>
                              )}
                              {p.priceReduced && (
                                <span className="text-[11px] font-[500] px-2 py-0.5 rounded-full border border-orange-200 text-orange-700 bg-orange-50">
                                  Price Reduced
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>)}

            {/* ────── BUYERS VIEW ────── */}
            {viewMode === 'buyers' && (<>
              {ownerSearch.loading && ownerSearch.owners.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin mb-2 text-[#2563EB]" />
                  <span className="text-[0.8rem]">Finding investors...</span>
                </div>
              )}
              {!ownerSearch.loading && ownerSearch.owners.length === 0 && !ownerSearch.error && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Users className="w-8 h-8 mb-2 text-gray-300" />
                  <span className="text-[0.82rem] font-medium text-gray-500 mb-0.5">No investors found</span>
                  <span className="text-[0.72rem] text-gray-400">Search a location first, then switch to Buyers</span>
                </div>
              )}

              {/* Top Buyers summary banner */}
              {ownerSearch.owners.length > 0 && (
                <>
                  <div className="bg-[rgba(37,99,235,0.08)] border-b border-[#BFDBFE] px-4 py-2.5">
                    <div className="text-[15px] font-[600] text-[#2563EB] mb-0.5">
                      Found {ownerSearch.total} active investors in {ownerSearch.searchLocation}
                    </div>
                    <div className="flex items-center gap-3 text-[14px] font-[400] text-[#2563EB]">
                      <span>{ownerSearch.multiPropertyCount} multi-property owners</span>
                      <span className="text-[#BFDBFE]">|</span>
                      <span>{ownerSearch.cashBuyerCount} likely cash buyers</span>
                    </div>
                  </div>

                  {/* Sort control */}
                  <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-100">
                    <span className="text-[0.68rem] text-gray-400">Sort:</span>
                    {([
                      { key: 'investorScore' as const, label: 'Score' },
                      { key: 'propertyCount' as const, label: 'Properties' },
                      { key: 'totalValue' as const, label: 'Value' },
                    ]).map(s => (
                      <button
                        key={s.key}
                        onClick={() => ownerSearch.setSortBy(s.key)}
                        className={`text-[12px] font-[400] px-2 py-1 rounded-[8px] border-0 cursor-pointer transition-colors ${
                          ownerSearch.sortBy === s.key
                            ? 'bg-[#2563EB] text-white font-[600]'
                            : 'bg-gray-100 text-[rgba(5,14,36,0.4)] hover:bg-gray-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Owner cards */}
                  <div className="divide-y divide-gray-100">
                    {ownerSearch.owners.map(owner => {
                      const isExpanded = expandedOwner === owner.normalizedName
                      return (
                        <div key={owner.normalizedName}>
                          <div
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              isExpanded ? 'bg-blue-50/60' : 'hover:bg-gray-50/60'
                            }`}
                            onClick={() => handleOwnerClick(owner)}
                          >
                            {/* Row 1: Name + badges */}
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-[15px] font-[600] text-[#0B1224] truncate flex-1">{owner.displayName}</h3>
                              {owner.likelyCashBuyer && (
                                <span className="text-[12px] font-[400] px-1.5 py-0.5 rounded-full bg-[rgba(37,99,235,0.08)] text-[#2563EB] border border-[#BFDBFE] flex-shrink-0">
                                  Cash Buyer
                                </span>
                              )}
                            </div>

                            {/* Row 2: Stats row */}
                            <div className="flex items-center gap-3 text-[14px] font-[400] text-[rgba(5,14,36,0.65)] mb-1.5">
                              <span className="flex items-center gap-0.5 font-[600]">
                                <Home className="w-3 h-3 text-[rgba(5,14,36,0.4)]" />
                                {owner.propertyCount} properties
                              </span>
                              <span className="flex items-center gap-0.5">
                                <DollarSign className="w-3 h-3 text-[rgba(5,14,36,0.4)]" />
                                {formatCurrency(owner.totalValue)}
                              </span>
                            </div>

                            {/* Row 3: Investor score bar */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)] w-12 flex-shrink-0">Score</span>
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${owner.investorScore}%`,
                                    background: owner.investorScore >= 70 ? '#2563EB' : owner.investorScore >= 40 ? '#D97706' : '#9CA3AF',
                                  }}
                                />
                              </div>
                              <span className={`text-[0.68rem] font-semibold w-7 text-right flex-shrink-0 ${
                                owner.investorScore >= 70 ? 'text-[#2563EB]' : owner.investorScore >= 40 ? 'text-amber-600' : 'text-gray-400'
                              }`}>
                                {owner.investorScore}
                              </span>
                            </div>

                            {/* Row 4: Cities + date */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)] truncate">
                                  {owner.cities.join(', ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {owner.lastPurchaseDate && (
                                  <span className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)] flex items-center gap-0.5">
                                    <Calendar className="w-2.5 h-2.5" />
                                    {new Date(owner.lastPurchaseDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded: show properties inline */}
                          {isExpanded && (
                            <div className="ml-6 mr-4 mb-2 space-y-1 border-l-2 border-[rgba(5,14,36,0.06)] pl-3">
                              {owner.properties.map(p => (
                                <div
                                  key={p.id}
                                  className="rounded-[10px] px-2.5 py-2 bg-gray-50 border border-[rgba(5,14,36,0.06)] hover:bg-white cursor-pointer transition-colors"
                                  onClick={(e) => { e.stopPropagation(); handleViewDetails(p) }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[0.74rem] font-medium text-[#0B1224] truncate">{p.addressLine1}</span>
                                    <span className="text-[0.72rem] font-semibold text-[rgba(5,14,36,0.65)] ml-2 flex-shrink-0">{formatCurrency(p.assessedValue)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[0.66rem] text-gray-400">{p.city}, {p.state}</span>
                                    <span className="text-[0.62rem] text-gray-400">{displayType(p.propertyType)}</span>
                                    {p.ownerOccupied === false && (
                                      <span className="text-[0.56rem] font-medium px-1 py-0.5 rounded-full text-amber-600 bg-amber-50/80">Absentee</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>)}
          </div>

          {/* Pagination footer */}
          {viewMode === 'properties' && pagination.total > pagination.limit && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[rgba(5,14,36,0.06)] flex-shrink-0 bg-white">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center justify-center w-7 h-7 rounded-[8px] border border-[rgba(5,14,36,0.06)] bg-white text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.65)] hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={prevPage}
                  disabled={pagination.page <= 1}
                  className="flex items-center justify-center w-7 h-7 rounded-[8px] border border-[rgba(5,14,36,0.06)] bg-white text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.65)] hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[0.76rem] text-gray-500">
                <span>Page</span>
                <span className="font-[600] text-[#0B1224] bg-gray-100 border border-[rgba(5,14,36,0.06)] rounded-[8px] px-2 py-0.5 min-w-[2rem] text-center">{pagination.page}</span>
                <span>of {totalPages}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={nextPage}
                  disabled={!pagination.hasMore}
                  className="flex items-center justify-center w-7 h-7 rounded-[8px] border border-[rgba(5,14,36,0.06)] bg-white text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.65)] hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={!pagination.hasMore}
                  className="flex items-center justify-center w-7 h-7 rounded-[8px] border border-[rgba(5,14,36,0.06)] bg-white text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.65)] hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          {viewMode === 'buyers' && ownerSearch.pagination.total > ownerSearch.pagination.limit && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-[rgba(5,14,36,0.06)] flex-shrink-0 bg-white">
              <button
                onClick={ownerSearch.prevPage}
                disabled={ownerSearch.pagination.page <= 1}
                className="flex items-center gap-1 text-[14px] font-[400] text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.65)] bg-gray-100 hover:bg-gray-200 border-0 rounded-[8px] px-2.5 py-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3 h-3" />
                Prev
              </button>
              <span className="text-[0.72rem] text-[#9CA3AF]">
                Page {ownerSearch.pagination.page} of {Math.ceil(ownerSearch.pagination.total / ownerSearch.pagination.limit)}
              </span>
              <button
                onClick={ownerSearch.nextPage}
                disabled={!ownerSearch.pagination.hasMore}
                className="flex items-center gap-1 text-[14px] font-[400] text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.65)] bg-gray-100 hover:bg-gray-200 border-0 rounded-[8px] px-2.5 py-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating action bar (selected items) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-[#0B1224] text-white rounded-xl px-5 py-3 shadow-2xl">
          <span className="text-[0.82rem] font-semibold">{selectedIds.size} selected</span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={handleBulkCRMImport}
            disabled={bulkImporting}
            className="flex items-center gap-1.5 text-[0.78rem] font-medium bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-3 py-1.5 cursor-pointer transition-colors"
          >
            {bulkImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            {bulkImporting ? 'Importing...' : 'Add to CRM'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-[0.78rem] font-medium bg-white/10 hover:bg-white/20 text-white border-0 rounded-[8px] px-3 py-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 text-[0.72rem] text-white/60 hover:text-white bg-transparent border-0 cursor-pointer"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      )}

      {/* Detail panel */}
      {activeProperty && (
        <PropertyDetail
          property={activeProperty}
          onClose={() => setActiveProperty(null)}
          onViewOnMap={() => {
            setActiveProperty(null)
          }}
          onAddToCRM={() => addPropertyToCRM(activeProperty)}
          onAddAsSeller={() => addPropertyAsSeller(activeProperty)}
          isInCRM={crmIds.has(activeProperty.id)}
          addingToCRM={addingCrmId === activeProperty.id}
          addingAsSeller={addingSellerId === activeProperty.id}
          features={propertyFeatures[activeProperty.id] ?? null}
          featuresLoading={featuresLoading === activeProperty.id}
          onSelectProperty={(p) => { setActiveProperty(p); fetchPropertyFeatures(p.id) }}
        />
      )}

    </div>
  )
}
