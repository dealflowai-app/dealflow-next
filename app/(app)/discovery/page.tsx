'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import Map, { Marker } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  Search,
  X,
  MapPin,
  Home,
  Building2,
  LandPlot,
  Warehouse,
  BedDouble,
  Bath,
  Ruler,
  UserCircle,
  Plus,
  BarChart3,
  PhoneOutgoing,
  Map as MapIcon,
  Mail,
  Phone,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Check,
  List,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  Lock,
  Unlock,
  Copy,
  Shield,
  Landmark,
  Gavel,
  FileWarning,
  ShieldAlert,
  ChevronsLeft,
  ChevronsRight,
  SquareStack,
  Layers,
  Target,
  UserPlus,
  XCircle,
  Download,
} from 'lucide-react'
import { useDiscoverySearch, FILTER_PRESETS, type PresetKey, type DiscoveryFilters } from '@/lib/hooks/useDiscoverySearch'
import type { DiscoveryProperty } from '@/lib/types/discovery'
import DiscoveryMapbox, { type MapStyleKey } from '@/components/discovery/DiscoveryMapbox'
import ContactReveal from '@/components/discovery/ContactReveal'
import SavedSearches from '@/components/discovery/SavedSearches'
import { createBuyer } from '@/lib/hooks/useCRMActions'
import { useMapboxGeocode } from '@/lib/hooks/useMapboxGeocode'
import { useOwnerSearch } from '@/lib/hooks/useOwnerSearch'
import type { OwnerProfile } from '@/lib/types/owner-intelligence'
import { estimateEquity, type EquityEstimate } from '@/lib/discovery/owner-intelligence'
import type { EquityData, DistressSignals, UnifiedPropertyDetail } from '@/lib/discovery/unified-types'
import { propertiesToCSV, downloadCSV } from '@/lib/utils/csv-export'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

/** Map RentCast property types to the display labels used by the UI */
const RENTCAST_TYPE_TO_DISPLAY: Record<string, string> = {
  'Single Family': 'SFR',
  'Multi Family': 'Multi-Family',
  'Condo': 'Condo',
  'Townhouse': 'Condo',
  'Land': 'Land',
  'Commercial': 'Commercial',
}

function displayType(rentcastType: string | null): string {
  if (!rentcastType) return 'SFR'
  return RENTCAST_TYPE_TO_DISPLAY[rentcastType] ?? rentcastType
}

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

function typeBadgeColor(_type: string) {
  return 'text-[rgba(5,14,36,0.65)] bg-gray-50 border border-[rgba(5,14,36,0.06)]'
}

function pinColor(type: string) {
  switch (type) {
    case 'SFR': return '#2563EB'
    case 'Multi-Family': return '#7C3AED'
    case 'Condo': return '#0891B2'
    case 'Land': return '#14b8a6'
    case 'Commercial': return '#D97706'
    default: return '#2563EB'
  }
}

function formatCurrency(value: number | null): string {
  if (value == null) return '—'
  return '$' + value.toLocaleString()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function equityDot(cat: EquityEstimate['equityCategory']) {
  switch (cat) {
    case 'high':    return 'bg-[#2563EB]'
    case 'medium':  return 'bg-amber-400'
    case 'low':     return 'bg-gray-400'
    case 'unknown': return 'bg-gray-300'
  }
}

function equityLabel(cat: EquityEstimate['equityCategory']) {
  switch (cat) {
    case 'high':    return 'High equity'
    case 'medium':  return 'Med equity'
    case 'low':     return 'Low equity'
    case 'unknown': return ''
  }
}

function equityBadgeColor(cat: EquityEstimate['equityCategory']) {
  switch (cat) {
    case 'high':    return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)] border-[#BFDBFE]'
    case 'medium':  return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'low':     return 'text-gray-600 bg-gray-50 border-gray-200'
    case 'unknown': return 'text-gray-500 bg-gray-50 border-gray-200'
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

/* ═══════════════════════════════════════════════
   CRM IMPORT HELPERS
   ═══════════════════════════════════════════════ */
function parseOwnerName(name: string | null): { firstName: string | null; lastName: string | null } {
  if (!name) return { firstName: null, lastName: null }
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function detectEntityType(name: string | null): string | null {
  if (!name) return null
  const upper = name.toUpperCase()
  if (/\bLLC\b|\bLLLP\b/.test(upper)) return 'llc'
  if (/\bCORP\b|\bINC\b|\bLTD\b/.test(upper)) return 'corporation'
  if (/\bTRUST\b|\bTRUSTEE\b|\bESTATE\b/.test(upper)) return 'trust'
  return 'individual'
}

function isEntity(name: string | null): boolean {
  if (!name) return false
  return /\bLLC\b|\bCORP\b|\bINC\b|\bLTD\b|\bLP\b|\bLLLP\b|\bTRUST\b|\bTRUSTEE\b|\bESTATE\b/i.test(name)
}

/* ═══════════════════════════════════════════════
   OWNER TYPE DETECTION
   ═══════════════════════════════════════════════ */
function detectOwnerType(name: string | null): { label: string; color: string } {
  if (!name) return { label: 'Unknown', color: 'text-gray-500 bg-gray-100' }
  const upper = name.toUpperCase()
  if (/\bLLC\b|\bCORP\b|\bINC\b|\bLTD\b|\bLP\b|\bLLLP\b/.test(upper))
    return { label: 'LLC / Corp', color: 'text-violet-700 bg-violet-50' }
  if (/\bTRUST\b|\bTRUSTEE\b|\bESTATE\b/.test(upper))
    return { label: 'Trust / Estate', color: 'text-sky-700 bg-sky-50' }
  if (/\bBANK\b|\bFEDERAL\b|\bNATIONAL\b|\bMORTGAGE\b|\bFANNIE\b|\bFREDDIE\b/.test(upper))
    return { label: 'Bank-Owned', color: 'text-rose-700 bg-rose-50' }
  if (/\bGOVERNMENT\b|\bCOUNTY\b|\bCITY OF\b|\bSTATE OF\b|\bHUD\b/.test(upper))
    return { label: 'Government', color: 'text-orange-700 bg-orange-50' }
  return { label: 'Individual', color: 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]' }
}

/* ═══════════════════════════════════════════════
   PROPERTY DETAIL PANEL (PropStream-style tabs)
   ═══════════════════════════════════════════════ */
type DetailTab = 'property' | 'owner' | 'history'

function PropertyDetail({
  property,
  onClose,
  onViewOnMap,
  onAddToCRM,
  onAddAsSeller,
  isInCRM,
  addingToCRM,
  addingAsSeller,
  features,
  featuresLoading,
  onSelectProperty,
}: {
  property: DiscoveryProperty
  onClose: () => void
  onViewOnMap?: () => void
  onAddToCRM?: () => void
  onAddAsSeller?: () => void
  isInCRM?: boolean
  addingToCRM?: boolean
  addingAsSeller?: boolean
  features?: {
    equityData: EquityData | null
    distressSignals: DistressSignals | null
    mortgage: UnifiedPropertyDetail['mortgage'] | null
    portfolio: { properties: DiscoveryProperty[]; propertyCount: number; totalValue: number } | null
    ownerProfile: { ownerName: string; corporateIndicator: boolean; absenteeOwner: boolean; mailingAddress: string | null; investorScore: number; likelyCashBuyer: boolean } | null
  } | null
  featuresLoading?: boolean
  onSelectProperty?: (p: DiscoveryProperty) => void
}) {
  const [tab, setTab] = useState<DetailTab>('property')
  const [comps, setComps] = useState<{ value: number | null; valueRangeLow: number | null; valueRangeHigh: number | null; comparables: Array<{ address: string; city: string; state: string; price: number | null; sqft: number | null; bedrooms: number | null; bathrooms: number | null; distance: number | null; correlation: number | null }> } | null>(null)
  const [compsLoading, setCompsLoading] = useState(false)
  const pType = displayType(property.propertyType)
  const ownerType = detectOwnerType(property.ownerName)
  const eq = estimateEquity(property)
  const eqData = features?.equityData

  const estValue = eqData?.estimatedValue ?? property.assessedValue
  const mortBal = eqData?.mortgageBalance ?? null
  const equityAmt = eqData?.equity ?? (estValue != null && property.lastSalePrice != null ? estValue - property.lastSalePrice : null)
  const equityPct = eqData?.equityPercent ?? (estValue != null && estValue > 0 && equityAmt != null ? Math.round((equityAmt / estValue) * 100) : null)

  const loadComps = async () => {
    if (comps || compsLoading) return
    setCompsLoading(true)
    try {
      const res = await fetch(`/api/discovery/property/${property.id}/comps`)
      if (res.ok) setComps(await res.json())
    } catch { /* ignore */ } finally { setCompsLoading(false) }
  }

  /* helper: grid row */
  function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
      <div>
        <div className="text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>{label}</div>
        <div className="text-[14px] font-[400] text-[rgba(5,14,36,0.65)] mt-0.5">{value ?? '—'}</div>
      </div>
    )
  }

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'property', label: 'Property' },
    { key: 'owner', label: 'Owner' },
    { key: 'history', label: 'History' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-[560px] h-full bg-white border-l border-[rgba(5,14,36,0.06)] disc-detail-panel animate-slideInRight flex flex-col" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}>
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 pt-4 pb-0 border-b border-[rgba(5,14,36,0.06)] bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-[24px] font-[700] text-[#0B1224] leading-tight truncate" style={{ letterSpacing: '-0.02em' }}>
                {property.addressLine1}
              </h2>
              <p className="text-[14px] font-[400] text-[rgba(5,14,36,0.5)] mt-0.5">
                {property.city}, {property.state} {property.zipCode}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <button
                onClick={onAddToCRM}
                disabled={isInCRM || addingToCRM}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[0.78rem] font-semibold border-0 cursor-pointer transition-colors ${
                  isInCRM
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                }`}
                title="Add as buyer"
              >
                {addingToCRM ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isInCRM ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {addingToCRM ? '...' : isInCRM ? 'In CRM' : 'Buyer'}
              </button>
              <button
                onClick={onAddAsSeller}
                disabled={addingAsSeller}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[0.78rem] font-semibold border-0 cursor-pointer transition-colors bg-[#F97316] hover:bg-[#EA580C] text-white"
                title="Add as seller"
              >
                {addingAsSeller ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Home className="w-3.5 h-3.5" />}
                {addingAsSeller ? '...' : 'Seller'}
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center cursor-pointer border-0 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-[14px] border-0 bg-transparent cursor-pointer transition-colors relative ${
                  tab === t.key
                    ? 'text-[#2563EB] font-[600]'
                    : 'text-[rgba(5,14,36,0.45)] font-[400] hover:text-[rgba(5,14,36,0.65)]'
                }`}
              >
                {t.label}
                {tab === t.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ════════ PROPERTY TAB ════════ */}
          {tab === 'property' && (
            <div>
              {/* Enrichment loading indicator */}
              {featuresLoading && (
                <div className="flex items-center gap-2 px-5 py-2 bg-blue-50 border-b border-blue-100 text-[0.76rem] text-blue-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enriching property data...
                </div>
              )}
              {/* Mini map */}
              <div className="h-[160px] relative overflow-hidden bg-gray-100">
                {property.latitude != null && property.longitude != null ? (
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{ longitude: property.longitude, latitude: property.latitude, zoom: 15 }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    interactive={false}
                    attributionControl={false}
                  >
                    <Marker longitude={property.longitude} latitude={property.latitude} anchor="bottom">
                      <svg width="28" height="36" viewBox="0 0 24 32">
                        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="#14B8A6" />
                        <circle cx="12" cy="11" r="5" fill="#fff" opacity="0.9" />
                      </svg>
                    </Marker>
                  </Map>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image Available</div>
                )}
              </div>

              {/* Hero: status + value + beds/baths/sqft */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <div className="flex items-baseline gap-4 mb-3">
                  <span className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Off-Market</span>
                  <span className="text-[24px] font-[700] text-[#0B1224]" style={{ letterSpacing: '-0.02em' }}>{formatCurrency(estValue)}</span>
                  <span className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Estimated Property Value</span>
                </div>
                <div className="flex items-center gap-6 text-[14px] text-[rgba(5,14,36,0.65)] font-[600]">
                  <span className="flex items-center gap-1"><BedDouble className="w-4 h-4 text-[rgba(5,14,36,0.4)]" /> {property.bedrooms ?? '—'} <span className="text-[12px] text-[rgba(5,14,36,0.4)] font-[400]">Beds</span></span>
                  <span className="flex items-center gap-1"><Bath className="w-4 h-4 text-[rgba(5,14,36,0.4)]" /> {property.bathrooms ?? '—'} <span className="text-[12px] text-[rgba(5,14,36,0.4)] font-[400]">Baths</span></span>
                  <span className="flex items-center gap-1"><Ruler className="w-4 h-4 text-[rgba(5,14,36,0.4)]" /> {property.sqft?.toLocaleString() ?? '—'} <span className="text-[12px] text-[rgba(5,14,36,0.4)] font-[400]">SqFt</span></span>
                </div>
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-[rgba(5,14,36,0.06)] bg-gray-50 text-[rgba(5,14,36,0.65)]">{pType}</span>
                  {property.yearBuilt && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-[rgba(5,14,36,0.06)] bg-gray-50 text-[rgba(5,14,36,0.65)]">Built in {property.yearBuilt}</span>}
                  {property.ownerOccupied === false && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">Absentee Owner</span>}
                  {eq.equityCategory === 'high' && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-[#BFDBFE] bg-[rgba(37,99,235,0.08)] text-[#2563EB]">High Equity</span>}
                  {features?.distressSignals?.foreclosure?.active && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-red-700">Pre-Foreclosure</span>}
                  {features?.distressSignals?.taxDelinquent?.isDelinquent && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-700">Tax Delinquent</span>}
                  {property.listingStatus === 'Active' && property.daysOnMarket != null && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700">On Market {property.daysOnMarket}d</span>}
                  {property.priceReduced && <span className="text-[12px] font-[400] px-2.5 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-700">Price Reduced</span>}
                </div>
              </div>

              {/* Equity visualization */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <div className="flex items-start gap-6">
                  <div>
                    <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(estValue)}</div>
                    <div className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Estimated Property Value</div>
                  </div>
                  {mortBal != null && (
                    <div>
                      <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(mortBal)}</div>
                      <div className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Est. Mortgage Balance</div>
                    </div>
                  )}
                  {equityAmt != null && (
                    <div>
                      <div className="text-[15px] font-[600] text-[#2563EB]">{formatCurrency(equityAmt)}</div>
                      <div className="text-[12px] font-[400] text-[rgba(5,14,36,0.4)]">Est. Equity</div>
                    </div>
                  )}
                </div>
                {/* Equity bar */}
                {equityPct != null && estValue != null && estValue > 0 && (
                  <div className="mt-3">
                    <div className="h-4 rounded-full overflow-hidden flex bg-gray-200">
                      {mortBal != null && mortBal > 0 && (
                        <div className="h-full bg-gray-400" style={{ width: `${Math.max(0, 100 - equityPct)}%` }} />
                      )}
                      <div className="h-full bg-[#2563EB]" style={{ width: `${Math.min(100, Math.max(0, equityPct))}%` }} />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[0.72rem] font-bold text-[#2563EB] bg-[rgba(37,99,235,0.08)] px-2 py-0.5 rounded">{equityPct}%</span>
                    </div>
                  </div>
                )}
                {/* AVM Range */}
                {eqData?.avm && eqData.avm.mid != null && (
                  <div className="mt-3 rounded-[8px] bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-3">
                    <div className="text-[11px] font-[600] uppercase text-blue-500 mb-2" style={{ letterSpacing: '0.05em' }}>Automated Valuation (AVM)</div>
                    <div className="flex items-center justify-between text-[0.78rem]">
                      <span className="text-gray-500">{formatCurrency(eqData.avm.low)}</span>
                      <span className="text-[15px] font-[700] text-[#2563EB]">{formatCurrency(eqData.avm.mid)}</span>
                      <span className="text-gray-500">{formatCurrency(eqData.avm.high)}</span>
                    </div>
                    <div className="flex items-center mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 relative">
                        {eqData.avm.low != null && eqData.avm.high != null && eqData.avm.high > eqData.avm.low && (
                          <div
                            className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
                            style={{
                              left: '0%',
                              width: `${Math.min(100, ((eqData.avm.mid! - eqData.avm.low) / (eqData.avm.high - eqData.avm.low)) * 100)}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-[0.66rem] text-gray-400 mt-0.5">
                      <span>Low</span>
                      <span>Estimate</span>
                      <span>High</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Public Facts & Zoning */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Public Facts &amp; Zoning</h3>
                <h4 className="text-[0.76rem] font-semibold text-gray-500 mb-2">Property Characteristics</h4>
                <div className="grid grid-cols-4 gap-y-3 gap-x-4 mb-4">
                  <InfoRow label="Living Area" value={property.sqft?.toLocaleString() ?? '—'} />
                  <InfoRow label="Year Built" value={property.yearBuilt} />
                  <InfoRow label="Bedrooms" value={property.bedrooms} />
                  <InfoRow label="Bathrooms" value={property.bathrooms} />
                  <InfoRow label="Lot Size" value={property.lotSize ? property.lotSize.toLocaleString() + ' sqft' : '—'} />
                  <InfoRow label="Property Type" value={pType} />
                  <InfoRow label="County" value={property.county} />
                  <InfoRow label="Zip Code" value={property.zipCode} />
                </div>
              </div>

              {/* Tax Information */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Tax Information</h3>
                <div className="grid grid-cols-3 gap-y-3 gap-x-4">
                  <InfoRow label="Tax Amount" value={property.taxAmount != null ? formatCurrency(property.taxAmount) : '—'} />
                  <InfoRow label="Assessed Value" value={formatCurrency(property.assessedValue)} />
                  <InfoRow label="Last Sale Price" value={formatCurrency(property.lastSalePrice)} />
                  <InfoRow label="Last Sale Date" value={property.lastSaleDate ? formatDate(property.lastSaleDate) : '—'} />
                  {eqData?.ltv != null && <InfoRow label="LTV" value={`${eqData.ltv}%`} />}
                </div>
              </div>

              {/* Listing Data */}
              {property.listingStatus && (
                <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                  <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Listing Data</h3>
                  <div className="grid grid-cols-3 gap-y-3 gap-x-4">
                    <InfoRow label="Status" value={property.listingStatus} />
                    <InfoRow label="List Price" value={formatCurrency(property.listPrice ?? null)} />
                    {property.daysOnMarket != null && <InfoRow label="Days on Market" value={String(property.daysOnMarket)} />}
                    {property.priceReduced && property.priceReductionPercent != null && (
                      <InfoRow label="Price Reduced" value={`${property.priceReductionPercent}% off`} />
                    )}
                  </div>
                  {property.listPrice != null && property.assessedValue != null && property.assessedValue > 0 && (
                    <div className={`mt-3 rounded-[8px] p-2.5 text-[0.78rem] font-medium ${
                      property.listPrice < property.assessedValue * 0.9
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : property.listPrice > property.assessedValue * 1.1
                        ? 'bg-amber-50 border border-amber-200 text-amber-700'
                        : 'bg-blue-50 border border-blue-200 text-blue-600'
                    }`}>
                      List price is {Math.abs(Math.round(((property.listPrice - property.assessedValue) / property.assessedValue) * 100))}%
                      {property.listPrice < property.assessedValue ? ' below' : property.listPrice > property.assessedValue ? ' above' : ' equal to'} assessed value
                      ({formatCurrency(property.assessedValue)})
                    </div>
                  )}
                </div>
              )}

              {/* Mortgage Details */}
              <div className="px-5 py-4 border-b border-[rgba(5,14,36,0.06)]">
                <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Mortgage Details</h3>
                {features?.mortgage && features.mortgage.liens.length > 0 ? (
                  <div className="border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden">
                    <table className="w-full text-[0.76rem]">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Position</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Lender</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Amount</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Rate</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.mortgage.liens.map((lien, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)] font-medium">{lien.position === 1 ? '1st' : lien.position === 2 ? '2nd' : `${lien.position}th`}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.lenderName ?? '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)] font-medium">{formatCurrency(lien.amount)}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.interestRate != null ? `${lien.interestRate}%` : '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.dueDate ? formatDate(lien.dueDate) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[0.78rem] text-gray-400">No mortgage data available</p>
                )}
              </div>

              {/* Distress Signals */}
              <div className="px-5 py-4">
                <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Distress Signals</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[0.78rem] text-gray-600 flex items-center gap-1.5"><Gavel className="w-3.5 h-3.5 text-gray-400" /> Foreclosure</span>
                    {features?.distressSignals?.foreclosure?.active ? (
                      <span className="text-[0.72rem] font-medium px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">{features.distressSignals.foreclosure.status ?? 'Active'}</span>
                    ) : (
                      <span className="text-[0.72rem] text-gray-400">None</span>
                    )}
                  </div>
                  {features?.distressSignals?.foreclosure?.active && (
                    <div className="ml-6 text-[0.7rem] text-gray-500 space-y-0.5">
                      {features.distressSignals.foreclosure.filingDate && <div>Filed: {formatDate(features.distressSignals.foreclosure.filingDate)}</div>}
                      {features.distressSignals.foreclosure.defaultAmount != null && <div>Default: {formatCurrency(features.distressSignals.foreclosure.defaultAmount)}</div>}
                      {features.distressSignals.foreclosure.auctionDate && <div className="text-red-600 font-medium">Auction: {formatDate(features.distressSignals.foreclosure.auctionDate)}</div>}
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
                    <span className="text-[0.78rem] text-gray-600 flex items-center gap-1.5"><FileWarning className="w-3.5 h-3.5 text-gray-400" /> Tax Delinquent</span>
                    {features?.distressSignals?.taxDelinquent?.isDelinquent ? (
                      <span className="text-[0.72rem] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">{formatCurrency(features.distressSignals.taxDelinquent.delinquentAmount)} owed</span>
                    ) : (
                      <span className="text-[0.72rem] text-gray-400">Current</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
                    <span className="text-[0.78rem] text-gray-600 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-gray-400" /> Probate</span>
                    <span className="text-[0.72rem] text-gray-400">None</span>
                  </div>
                </div>
              </div>

              {/* Comparable Sales */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[15px] font-[600] text-[#0B1224]">Comparable Sales</h3>
                  {!comps && (
                    <button
                      onClick={loadComps}
                      disabled={compsLoading}
                      className="flex items-center gap-1.5 text-[0.76rem] font-semibold text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer"
                    >
                      {compsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                      {compsLoading ? 'Loading...' : 'Load Comps'}
                    </button>
                  )}
                </div>
                {comps ? (
                  <>
                    {comps.value != null && (
                      <div className="rounded-[8px] bg-green-50 border border-green-200 p-3 mb-3">
                        <div className="text-[11px] font-[600] uppercase text-green-600 mb-1" style={{ letterSpacing: '0.05em' }}>RentCast Estimate</div>
                        <div className="flex items-baseline gap-3">
                          <span className="text-[18px] font-[700] text-green-700">{formatCurrency(comps.value)}</span>
                          {comps.valueRangeLow != null && comps.valueRangeHigh != null && (
                            <span className="text-[0.72rem] text-green-600">
                              {formatCurrency(comps.valueRangeLow)} – {formatCurrency(comps.valueRangeHigh)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {comps.comparables.length > 0 ? (
                      <div className="space-y-2">
                        {comps.comparables.slice(0, 5).map((c, i) => (
                          <div key={i} className="flex items-center justify-between py-2 px-3 rounded-[8px] bg-gray-50 border border-gray-100">
                            <div className="min-w-0 flex-1">
                              <div className="text-[0.78rem] font-medium text-[#0B1224] truncate">{c.address}</div>
                              <div className="text-[0.68rem] text-gray-400">
                                {c.bedrooms ?? '—'}bd / {c.bathrooms ?? '—'}ba · {c.sqft?.toLocaleString() ?? '—'} sqft
                                {c.distance != null && <> · {c.distance.toFixed(1)} mi</>}
                              </div>
                            </div>
                            <div className="text-right ml-3 flex-shrink-0">
                              <div className="text-[0.82rem] font-semibold text-[#0B1224]">{formatCurrency(c.price)}</div>
                              {c.correlation != null && (
                                <div className="text-[0.66rem] text-gray-400">{Math.round(c.correlation * 100)}% match</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[0.78rem] text-gray-400">No comparable sales found</p>
                    )}
                  </>
                ) : !compsLoading ? (
                  <p className="text-[0.78rem] text-gray-400">Click &quot;Load Comps&quot; to fetch comparable sales and valuation data</p>
                ) : null}
              </div>
            </div>
          )}

          {/* ════════ OWNER TAB ════════ */}
          {tab === 'owner' && (
            <div className="px-5 py-5">
              {/* Enrichment notice */}
              {!property.ownerName && featuresLoading && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-[8px] bg-blue-50 border border-blue-100 text-[0.76rem] text-blue-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading owner data...
                </div>
              )}
              {!property.ownerName && !featuresLoading && !features && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-[8px] bg-gray-50 border border-gray-200 text-[0.76rem] text-gray-500">
                  <Info className="w-3.5 h-3.5" />
                  Owner data loads automatically when you open a property.
                </div>
              )}
              {/* Owner info */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 mb-1">
                    <UserCircle className="w-3.5 h-3.5" /> Full Name
                  </div>
                  <div className="text-[0.92rem] font-semibold text-[#2563EB]">{property.ownerName ?? (featuresLoading ? '...' : '—')}</div>
                </div>
                {property.ownerName && (
                  <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${ownerType.color}`}>{ownerType.label}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 mb-1">
                    <Home className="w-3.5 h-3.5" /> Mailing Address
                  </div>
                  <div className="text-[0.82rem] text-[rgba(5,14,36,0.65)]">
                    {features?.ownerProfile?.mailingAddress ?? property.mailingAddress ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Occupancy
                  </div>
                  <div className="text-[0.82rem] text-[rgba(5,14,36,0.65)]">
                    {property.ownerOccupied == null ? '—' : property.ownerOccupied ? 'Owner Occupied' : 'Absentee'}
                  </div>
                </div>
              </div>

              {/* Contact Reveal */}
              <div className="-mx-5">
                <ContactReveal propertyId={property.id} ownerName={property.ownerName} />
              </div>

              {features?.ownerProfile && (
                <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-gray-100">
                  <div>
                    <div className="text-[0.72rem] text-gray-400 mb-1">Investor Score</div>
                    <div className="text-[0.88rem] font-bold text-[#0B1224]">{features.ownerProfile.investorScore}/100</div>
                  </div>
                  <div>
                    <div className="text-[0.72rem] text-gray-400 mb-1">Cash Buyer</div>
                    <div className="text-[0.82rem] text-[rgba(5,14,36,0.65)]">{features.ownerProfile.likelyCashBuyer ? 'Likely' : 'Unknown'}</div>
                  </div>
                </div>
              )}

              {/* Portfolio */}
              <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">
                {property.ownerName ?? 'Owner'}&apos;s Portfolio
              </h3>

              {featuresLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                  <span className="text-[0.78rem] text-gray-400">Loading portfolio...</span>
                </div>
              ) : features?.portfolio && features.portfolio.properties.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-4 px-1">
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Properties Owned</div>
                      <div className="text-[15px] font-[600] text-[#0B1224]">{features.portfolio.propertyCount}</div>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Portfolio Value</div>
                      <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(features.portfolio.totalValue)}</div>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Total Mortgage</div>
                      <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(features.mortgage?.totalLienAmount ?? null)}</div>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Total Equity</div>
                      <div className="text-[15px] font-[600] text-[#2563EB]">
                        {formatCurrency(features.portfolio.totalValue - (features.mortgage?.totalLienAmount ?? 0))}
                      </div>
                    </div>
                  </div>
                  <div className="border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden">
                    <table className="w-full text-[0.72rem]">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Address</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Type</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Bed</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Bath</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>SqFt</th>
                          <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Est. Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.portfolio.properties.map((p, i) => (
                          <tr
                            key={p.id}
                            className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50/40 transition-colors ${p.id === property.id ? 'bg-teal-50' : ''}`}
                            onClick={() => onSelectProperty?.(p)}
                          >
                            <td className="px-3 py-2">
                              <div className="text-[#2563EB] font-medium truncate max-w-[140px]">{p.addressLine1}</div>
                              <div className="text-[0.62rem] text-gray-400">{p.city}, {p.state} {p.zipCode}</div>
                            </td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{displayType(p.propertyType)}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{p.bedrooms ?? '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{p.bathrooms ?? '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{p.sqft?.toLocaleString() ?? '—'}</td>
                            <td className="px-3 py-2 text-[rgba(5,14,36,0.65)] font-medium">{formatCurrency(p.assessedValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-[0.78rem] text-gray-400 py-4">No other properties found for this owner</p>
              )}
            </div>
          )}

          {/* ════════ HISTORY TAB ════════ */}
          {tab === 'history' && (
            <div className="px-5 py-5">
              {/* Last sale summary */}
              <div className="grid grid-cols-3 gap-4 mb-5 pb-5 border-b border-gray-100">
                <div>
                  <div className="text-[0.68rem] text-gray-400 font-medium">Last Sale Date</div>
                  <div className="text-[15px] font-[600] text-[#0B1224]">{property.lastSaleDate ? formatDate(property.lastSaleDate) : '—'}</div>
                </div>
                <div>
                  <div className="text-[0.68rem] text-gray-400 font-medium">Last Sale Price</div>
                  <div className="text-[15px] font-[600] text-[#0B1224]">{formatCurrency(property.lastSalePrice)}</div>
                </div>
                <div>
                  <div className="text-[0.68rem] text-gray-400 font-medium">Years Owned</div>
                  <div className="text-[15px] font-[600] text-[#0B1224]">{eq.yearsOwned != null ? `${Math.floor(eq.yearsOwned)} years` : '—'}</div>
                </div>
              </div>

              {/* Mortgage history */}
              <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Mortgage History</h3>
              {features?.mortgage && features.mortgage.liens.length > 0 ? (
                <div className="border border-[rgba(5,14,36,0.06)] rounded-[10px] overflow-hidden mb-5">
                  <table className="w-full text-[0.74rem]">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Loan Type</th>
                        <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Amount</th>
                        <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Lender</th>
                        <th className="px-3 py-2 text-[11px] font-[600] uppercase text-[rgba(5,14,36,0.4)]" style={{ letterSpacing: '0.05em' }}>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.mortgage.liens.map((lien, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.interestRateType ?? 'N/A'}</td>
                          <td className="px-3 py-2 text-[rgba(5,14,36,0.65)] font-medium">{formatCurrency(lien.amount)}</td>
                          <td className="px-3 py-2 text-[rgba(5,14,36,0.65)]">{lien.lenderName ?? '—'}</td>
                          <td className="px-3 py-2 text-[#2563EB]">{lien.dueDate ? formatDate(lien.dueDate) : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[0.78rem] text-gray-400 mb-5">No mortgage history available</p>
              )}

              {/* Transaction timeline */}
              <h3 className="text-[15px] font-[600] text-[#0B1224] mb-3">Transaction Timeline</h3>
              {property.lastSaleDate ? (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
                  <div className="relative mb-4">
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-[#2563EB] border-2 border-white shadow" />
                    <div className="text-[0.62rem] font-medium text-gray-400 mb-0.5 bg-gray-100 inline-block px-1.5 py-0.5 rounded">{formatDate(property.lastSaleDate)}</div>
                    <div className="text-[0.82rem] font-bold text-[#0B1224]">Transfer</div>
                    <div className="text-[0.74rem] text-gray-500">{property.ownerName ?? 'Unknown buyer'}</div>
                    {property.lastSalePrice != null && property.lastSalePrice > 0 && (
                      <div className="text-[0.74rem] text-gray-500">{formatCurrency(property.lastSalePrice)}</div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[0.78rem] text-gray-400">No transaction history available</p>
              )}
            </div>
          )}
        </div>

        {/* ── Sticky Actions Footer ── */}
        <div className="flex-shrink-0 border-t border-[rgba(5,14,36,0.06)] bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onAddToCRM}
              disabled={isInCRM || addingToCRM}
              className={`flex-1 flex items-center justify-center gap-1.5 font-medium border-0 rounded-[8px] py-2 text-[0.78rem] cursor-pointer transition-colors ${
                isInCRM ? 'bg-[#2563EB] text-white cursor-default' : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
              }`}
            >
              {addingToCRM ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</> : isInCRM ? <><Check className="w-3.5 h-3.5" /> In CRM</> : <><UserPlus className="w-3.5 h-3.5" /> Add as Buyer</>}
            </button>
            <button
              onClick={onAddAsSeller}
              disabled={addingAsSeller}
              className="flex-1 flex items-center justify-center gap-1.5 font-medium border-0 rounded-[8px] py-2 text-[0.78rem] cursor-pointer transition-colors bg-[#F97316] hover:bg-[#EA580C] text-white"
            >
              {addingAsSeller ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</> : <><Home className="w-3.5 h-3.5" /> Add as Seller</>}
            </button>
            <a
              href={`/deals/analyze?address=${encodeURIComponent(`${property.addressLine1}, ${property.city}, ${property.state} ${property.zipCode ?? ''}`.trim())}&propertyId=${property.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white text-[rgba(5,14,36,0.65)] border border-[rgba(5,14,36,0.06)] hover:bg-gray-50 rounded-[8px] py-2 text-[0.78rem] font-medium cursor-pointer transition-colors no-underline"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analyze Deal
            </a>
            <button
              onClick={onViewOnMap}
              className="flex items-center justify-center gap-1.5 bg-white text-[rgba(5,14,36,0.65)] border border-[rgba(5,14,36,0.06)] hover:bg-gray-50 rounded-[8px] px-3 py-2 text-[0.78rem] font-medium cursor-pointer transition-colors"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .disc-detail-panel { width: 100% !important; }
        }
      ` }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN DISCOVERY PAGE
   ═══════════════════════════════════════════════ */
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
  const [comingSoonTooltip, setComingSoonTooltip] = useState<string | null>(null)
  const comingSoonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
            <Info className="w-4 h-4 flex-shrink-0" />
            {error}
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
              <div key={lf.key} className="relative">
                <button
                  onClick={() => {
                    if (lf.coming) {
                      setComingSoonTooltip(lf.key)
                      if (comingSoonTimeoutRef.current) clearTimeout(comingSoonTimeoutRef.current)
                      comingSoonTimeoutRef.current = setTimeout(() => setComingSoonTooltip(null), 1500)
                    } else {
                      setActiveLayer(lf.key)
                    }
                  }}
                  className={`text-[14px] font-[400] px-3 py-1.5 rounded-[8px] border cursor-pointer transition-colors ${
                    activeLayer === lf.key
                      ? 'bg-[#2563EB] text-white border-[#2563EB] font-[600] shadow-sm'
                      : 'bg-white text-[rgba(5,14,36,0.65)] border-[rgba(5,14,36,0.06)] hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  {lf.label}
                </button>
                {comingSoonTooltip === lf.key && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[0.62rem] font-medium px-2 py-1 rounded whitespace-nowrap z-30 shadow-lg">
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
        <div className="w-full md:w-[420px] flex-shrink-0 border-t md:border-t-0 md:border-l border-[rgba(5,14,36,0.06)] bg-white flex flex-col disc-sidebar">
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
              {filteredProperties.length > 0 && (
                <div className="divide-y divide-gray-100">
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
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
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
                  onClick={() => { for (let i = 1; i < pagination.page; i++) prevPage() }}
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
                  onClick={() => { for (let i = pagination.page; i < totalPages; i++) nextPage() }}
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

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 767px) {
          .disc-sidebar {
            max-height: 50vh;
            min-height: 200px;
          }
        }
      ` }} />
    </div>
  )
}
