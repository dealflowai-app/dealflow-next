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
  Bookmark,
  ChevronsLeft,
  ChevronsRight,
  SquareStack,
  Layers,
} from 'lucide-react'
import { useDiscoverySearch } from '@/lib/hooks/useDiscoverySearch'
import type { DiscoveryProperty } from '@/lib/types/discovery'
import DiscoveryMapbox, { type MapStyleKey } from '@/components/discovery/DiscoveryMapbox'
import { createBuyer } from '@/lib/hooks/useCRMActions'
import { useMapboxGeocode } from '@/lib/hooks/useMapboxGeocode'
import { useOwnerSearch } from '@/lib/hooks/useOwnerSearch'
import type { OwnerProfile } from '@/lib/types/owner-intelligence'
import { estimateEquity, type EquityEstimate } from '@/lib/discovery/owner-intelligence'
import type { EquityData, DistressSignals, UnifiedPropertyDetail } from '@/lib/discovery/unified-types'

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
  return 'text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB]'
}

function pinColor(type: string) {
  switch (type) {
    case 'SFR': return '#2563EB'
    case 'Multi-Family': return '#7C3AED'
    case 'Condo': return '#0891B2'
    case 'Land': return '#059669'
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
    case 'high':    return 'bg-emerald-500'
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
    case 'high':    return 'text-emerald-700 bg-emerald-50 border-emerald-200'
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
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slideInRight ${
            t.type === 'success' ? 'bg-emerald-600 text-white'
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
  return { label: 'Individual', color: 'text-emerald-700 bg-emerald-50' }
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
  isInCRM,
  addingToCRM,
  features,
  featuresLoading,
  onSelectProperty,
}: {
  property: DiscoveryProperty
  onClose: () => void
  onViewOnMap?: () => void
  onAddToCRM?: () => void
  isInCRM?: boolean
  addingToCRM?: boolean
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
  const pType = displayType(property.propertyType)
  const ownerType = detectOwnerType(property.ownerName)
  const eq = estimateEquity(property)
  const eqData = features?.equityData

  const estValue = eqData?.estimatedValue ?? property.assessedValue
  const mortBal = eqData?.mortgageBalance ?? null
  const equityAmt = eqData?.equity ?? (estValue != null && property.lastSalePrice != null ? estValue - property.lastSalePrice : null)
  const equityPct = eqData?.equityPercent ?? (estValue != null && estValue > 0 && equityAmt != null ? Math.round((equityAmt / estValue) * 100) : null)

  /* helper: grid row */
  function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
      <div>
        <div className="text-[0.66rem] text-gray-400 font-medium">{label}</div>
        <div className="text-[0.82rem] text-[#111827] font-medium mt-0.5">{value ?? '—'}</div>
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

      <div className="relative w-[560px] h-full bg-white border-l border-gray-200 disc-detail-panel animate-slideInRight flex flex-col">
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-5 pt-4 pb-0 border-b border-gray-200 bg-white">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-[1.35rem] font-bold text-[#111827] leading-tight truncate">
                {property.addressLine1}
              </h2>
              <p className="text-[0.82rem] text-gray-400 mt-0.5">
                {property.city}, {property.state} {property.zipCode}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <button
                onClick={onAddToCRM}
                disabled={isInCRM || addingToCRM}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[0.78rem] font-semibold border-0 cursor-pointer transition-colors ${
                  isInCRM
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#14B8A6] hover:bg-[#0D9488] text-white'
                }`}
              >
                {addingToCRM ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isInCRM ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {addingToCRM ? 'Adding...' : isInCRM ? 'In CRM' : 'Add'}
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
                className={`px-4 py-2 text-[0.8rem] font-medium border-0 bg-transparent cursor-pointer transition-colors relative ${
                  tab === t.key
                    ? 'text-[#111827]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t.label}
                {tab === t.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#111827] rounded-full" />
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
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-baseline gap-4 mb-3">
                  <span className="text-[0.72rem] font-semibold text-gray-400">Off-Market</span>
                  <span className="text-[1.6rem] font-bold text-[#111827]">{formatCurrency(estValue)}</span>
                  <span className="text-[0.68rem] text-gray-400">Estimated Property Value</span>
                </div>
                <div className="flex items-center gap-6 text-[0.88rem] text-[#374151] font-semibold">
                  <span className="flex items-center gap-1"><BedDouble className="w-4 h-4 text-gray-400" /> {property.bedrooms ?? '—'} <span className="text-[0.68rem] text-gray-400 font-normal">Beds</span></span>
                  <span className="flex items-center gap-1"><Bath className="w-4 h-4 text-gray-400" /> {property.bathrooms ?? '—'} <span className="text-[0.68rem] text-gray-400 font-normal">Baths</span></span>
                  <span className="flex items-center gap-1"><Ruler className="w-4 h-4 text-gray-400" /> {property.sqft?.toLocaleString() ?? '—'} <span className="text-[0.68rem] text-gray-400 font-normal">SqFt</span></span>
                </div>
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[0.66rem] font-medium px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-600">{pType}</span>
                  {property.yearBuilt && <span className="text-[0.66rem] font-medium px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-600">Built in {property.yearBuilt}</span>}
                  {property.ownerOccupied === false && <span className="text-[0.66rem] font-medium px-2.5 py-1 rounded-md border border-amber-200 bg-amber-50 text-amber-700">Absentee Owner</span>}
                  {eq.equityCategory === 'high' && <span className="text-[0.66rem] font-medium px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700">High Equity</span>}
                  {features?.distressSignals?.foreclosure?.active && <span className="text-[0.66rem] font-medium px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-red-700">Pre-Foreclosure</span>}
                  {features?.distressSignals?.taxDelinquent?.isDelinquent && <span className="text-[0.66rem] font-medium px-2.5 py-1 rounded-md border border-orange-200 bg-orange-50 text-orange-700">Tax Delinquent</span>}
                </div>
              </div>

              {/* Equity visualization */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-start gap-6">
                  <div>
                    <div className="text-[1.4rem] font-bold text-[#111827]">{formatCurrency(estValue)}</div>
                    <div className="text-[0.68rem] text-gray-400">Estimated Property Value</div>
                  </div>
                  {mortBal != null && (
                    <div>
                      <div className="text-[1.1rem] font-bold text-[#374151]">{formatCurrency(mortBal)}</div>
                      <div className="text-[0.68rem] text-gray-400">Est. Mortgage Balance</div>
                    </div>
                  )}
                  {equityAmt != null && (
                    <div>
                      <div className="text-[1.1rem] font-bold text-emerald-600">{formatCurrency(equityAmt)}</div>
                      <div className="text-[0.68rem] text-gray-400">Est. Equity</div>
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
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, equityPct))}%` }} />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[0.72rem] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{equityPct}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Public Facts & Zoning */}
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[0.92rem] font-bold text-[#111827] mb-3">Public Facts &amp; Zoning</h3>
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
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[0.92rem] font-bold text-[#111827] mb-3">Tax Information</h3>
                <div className="grid grid-cols-3 gap-y-3 gap-x-4">
                  <InfoRow label="Tax Amount" value={property.taxAmount != null ? formatCurrency(property.taxAmount) : '—'} />
                  <InfoRow label="Assessed Value" value={formatCurrency(property.assessedValue)} />
                  <InfoRow label="Last Sale Price" value={formatCurrency(property.lastSalePrice)} />
                  <InfoRow label="Last Sale Date" value={property.lastSaleDate ? formatDate(property.lastSaleDate) : '—'} />
                  {eqData?.ltv != null && <InfoRow label="LTV" value={`${eqData.ltv}%`} />}
                </div>
              </div>

              {/* Mortgage Details */}
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[0.92rem] font-bold text-[#111827] mb-3">Mortgage Details</h3>
                {features?.mortgage && features.mortgage.liens.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[0.76rem]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-left">
                          <th className="px-3 py-2 font-medium">Position</th>
                          <th className="px-3 py-2 font-medium">Lender</th>
                          <th className="px-3 py-2 font-medium">Amount</th>
                          <th className="px-3 py-2 font-medium">Rate</th>
                          <th className="px-3 py-2 font-medium">Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {features.mortgage.liens.map((lien, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 text-[#374151] font-medium">{lien.position === 1 ? '1st' : lien.position === 2 ? '2nd' : `${lien.position}th`}</td>
                            <td className="px-3 py-2 text-[#374151]">{lien.lenderName ?? '—'}</td>
                            <td className="px-3 py-2 text-[#374151] font-medium">{formatCurrency(lien.amount)}</td>
                            <td className="px-3 py-2 text-[#374151]">{lien.interestRate != null ? `${lien.interestRate}%` : '—'}</td>
                            <td className="px-3 py-2 text-[#374151]">{lien.dueDate ? formatDate(lien.dueDate) : '—'}</td>
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
                <h3 className="text-[0.92rem] font-bold text-[#111827] mb-3">Distress Signals</h3>
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
            </div>
          )}

          {/* ════════ OWNER TAB ════════ */}
          {tab === 'owner' && (
            <div className="px-5 py-5">
              {/* Owner info */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 mb-1">
                    <UserCircle className="w-3.5 h-3.5" /> Full Name
                  </div>
                  <div className="text-[0.92rem] font-semibold text-[#2563EB]">{property.ownerName ?? '—'}</div>
                </div>
                <span className={`text-[0.68rem] font-medium px-2 py-0.5 rounded-full ${ownerType.color}`}>{ownerType.label}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 mb-1">
                    <Home className="w-3.5 h-3.5" /> Mailing Address
                  </div>
                  <div className="text-[0.82rem] text-[#374151]">
                    {features?.ownerProfile?.mailingAddress ?? property.mailingAddress ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[0.72rem] text-gray-400 mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Occupancy
                  </div>
                  <div className="text-[0.82rem] text-[#374151]">
                    {property.ownerOccupied == null ? '—' : property.ownerOccupied ? 'Owner Occupied' : 'Absentee'}
                  </div>
                </div>
              </div>

              {features?.ownerProfile && (
                <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-gray-100">
                  <div>
                    <div className="text-[0.72rem] text-gray-400 mb-1">Investor Score</div>
                    <div className="text-[0.88rem] font-bold text-[#111827]">{features.ownerProfile.investorScore}/100</div>
                  </div>
                  <div>
                    <div className="text-[0.72rem] text-gray-400 mb-1">Cash Buyer</div>
                    <div className="text-[0.82rem] text-[#374151]">{features.ownerProfile.likelyCashBuyer ? 'Likely' : 'Unknown'}</div>
                  </div>
                </div>
              )}

              {/* Portfolio */}
              <h3 className="text-[0.92rem] font-bold text-[#111827] mb-3">
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
                      <div className="text-[0.92rem] font-bold text-[#111827]">{features.portfolio.propertyCount}</div>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Portfolio Value</div>
                      <div className="text-[0.92rem] font-bold text-[#111827]">{formatCurrency(features.portfolio.totalValue)}</div>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Total Mortgage</div>
                      <div className="text-[0.92rem] font-bold text-[#111827]">{formatCurrency(features.mortgage?.totalLienAmount ?? null)}</div>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-gray-400 font-medium">Total Equity</div>
                      <div className="text-[0.92rem] font-bold text-emerald-600">
                        {formatCurrency(features.portfolio.totalValue - (features.mortgage?.totalLienAmount ?? 0))}
                      </div>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-[0.72rem]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-left">
                          <th className="px-3 py-2 font-medium">Address</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Bed</th>
                          <th className="px-3 py-2 font-medium">Bath</th>
                          <th className="px-3 py-2 font-medium">SqFt</th>
                          <th className="px-3 py-2 font-medium">Est. Value</th>
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
                            <td className="px-3 py-2 text-[#374151]">{displayType(p.propertyType)}</td>
                            <td className="px-3 py-2 text-[#374151]">{p.bedrooms ?? '—'}</td>
                            <td className="px-3 py-2 text-[#374151]">{p.bathrooms ?? '—'}</td>
                            <td className="px-3 py-2 text-[#374151]">{p.sqft?.toLocaleString() ?? '—'}</td>
                            <td className="px-3 py-2 text-[#374151] font-medium">{formatCurrency(p.assessedValue)}</td>
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
                  <div className="text-[0.92rem] font-bold text-[#111827]">{property.lastSaleDate ? formatDate(property.lastSaleDate) : '—'}</div>
                </div>
                <div>
                  <div className="text-[0.68rem] text-gray-400 font-medium">Last Sale Price</div>
                  <div className="text-[0.92rem] font-bold text-[#111827]">{formatCurrency(property.lastSalePrice)}</div>
                </div>
                <div>
                  <div className="text-[0.68rem] text-gray-400 font-medium">Years Owned</div>
                  <div className="text-[0.92rem] font-bold text-[#111827]">{eq.yearsOwned != null ? `${Math.floor(eq.yearsOwned)} years` : '—'}</div>
                </div>
              </div>

              {/* Mortgage history */}
              <h3 className="text-[0.92rem] font-bold text-[#111827] mb-3">Mortgage History</h3>
              {features?.mortgage && features.mortgage.liens.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-5">
                  <table className="w-full text-[0.74rem]">
                    <thead>
                      <tr className="bg-teal-50 text-teal-700 text-left">
                        <th className="px-3 py-2 font-medium">Loan Type</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                        <th className="px-3 py-2 font-medium">Lender</th>
                        <th className="px-3 py-2 font-medium">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.mortgage.liens.map((lien, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-[#374151]">{lien.interestRateType ?? 'N/A'}</td>
                          <td className="px-3 py-2 text-[#374151] font-medium">{formatCurrency(lien.amount)}</td>
                          <td className="px-3 py-2 text-[#374151]">{lien.lenderName ?? '—'}</td>
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
              <h3 className="text-[0.92rem] font-bold text-[#111827] mb-3">Transaction Timeline</h3>
              {property.lastSaleDate ? (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
                  <div className="relative mb-4">
                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-teal-500 border-2 border-white shadow" />
                    <div className="text-[0.62rem] font-medium text-gray-400 mb-0.5 bg-gray-100 inline-block px-1.5 py-0.5 rounded">{formatDate(property.lastSaleDate)}</div>
                    <div className="text-[0.82rem] font-bold text-[#111827]">Transfer</div>
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
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onAddToCRM}
              disabled={isInCRM || addingToCRM}
              className={`flex-1 flex items-center justify-center gap-1.5 font-medium border-0 rounded-md py-2 text-[0.78rem] cursor-pointer transition-colors ${
                isInCRM ? 'bg-emerald-500 text-white cursor-default' : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
              }`}
            >
              {addingToCRM ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</> : isInCRM ? <><Check className="w-3.5 h-3.5" /> In CRM</> : <><Plus className="w-3.5 h-3.5" /> Add to CRM</>}
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-white text-[#374151] border border-gray-200 hover:bg-gray-50 rounded-md py-2 text-[0.78rem] font-medium cursor-pointer transition-colors">
              <PhoneOutgoing className="w-3.5 h-3.5" /> Contact Owner
            </button>
            <button
              onClick={onViewOnMap}
              className="flex items-center justify-center gap-1.5 bg-white text-[#374151] border border-gray-200 hover:bg-gray-50 rounded-md px-3 py-2 text-[0.78rem] font-medium cursor-pointer transition-colors"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .disc-detail-panel { width: 100% !important; }
        }
      `}</style>
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
  const [searchAsMove, setSearchAsMove] = useState(false)

  // ── Saved searches (persisted in localStorage) ──
  type SavedSearch = { id: string; label: string; query: string; savedAt: number }
  const SAVED_KEY = 'dealflow_saved_searches'
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] }
  })
  function persistSaved(list: SavedSearch[]) {
    setSavedSearches(list)
    localStorage.setItem(SAVED_KEY, JSON.stringify(list))
  }

  function saveSearch(queryText?: string) {
    const q = (queryText ?? filters.query).trim()
    if (!q) return
    const existing = savedSearches.find(s => s.query.toLowerCase() === q.toLowerCase())
    if (existing) return
    const entry: SavedSearch = {
      id: crypto.randomUUID(),
      label: q,
      query: q,
      savedAt: Date.now(),
    }
    persistSaved([entry, ...savedSearches])
  }

  function removeSavedSearch(id: string) {
    persistSaved(savedSearches.filter(s => s.id !== id))
  }

  function loadSavedSearch(query: string) {
    setShowSuggestions(false)
    clearSuggestions()
    searchWithQuery(query)
    ownerSearch.search(query)
  }

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
    clearFilters,
    setActiveProperty,
    nextPage,
    prevPage,
  } = useDiscoverySearch()

  const ownerSearch = useOwnerSearch()

  // Client-side equity filter (equity is computed, not stored)
  const filteredProperties = useMemo(() => {
    if (filters.equityMin === null || filters.equityMin <= 0) return properties
    return properties.filter(p => equityFilterMatches(estimateEquity(p).equityCategory, filters.equityMin))
  }, [properties, filters.equityMin])

  const activeId = activeProperty?.id ?? null

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
  }, [propertyFeatures, featuresLoading])

  function handleSearch() {
    search()
    ownerSearch.search(filters.query)
    // Auto-save to recent searches
    saveSearch()
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
    <div className="h-full flex flex-col overflow-hidden">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ═══ TOP SEARCH BAR ═══ */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 z-20">
        <div className="flex items-center gap-2">
          {/* Search icon + input */}
          <div className="flex items-center gap-2 flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
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
                    saveSearch(first.displayText)
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
              className="flex-1 bg-transparent border-0 outline-none text-[0.84rem] text-[#374151] placeholder-gray-400 min-w-[180px]"
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-[#2563EB] animate-spin flex-shrink-0" />
            )}

            {/* Autocomplete / saved searches dropdown */}
            {showSuggestions && (suggestions.length > 0 || (savedSearches.length > 0 && !filters.query.trim())) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden z-30">
                {suggestions.length > 0 ? (
                  /* Geocode suggestions */
                  suggestions.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault()
                        setShowSuggestions(false)
                        clearSuggestions()
                        searchWithQuery(s.displayText)
                        ownerSearch.search(s.displayText)
                        saveSearch(s.displayText)
                      }}
                      className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-[#EFF6FF] transition-colors cursor-pointer border-0 bg-transparent border-b border-b-gray-100 last:border-b-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[0.82rem] font-medium text-[#111827] truncate">{s.displayText}</div>
                        <div className="text-[0.7rem] text-gray-400 truncate">{s.placeName}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  /* Saved searches (shown when input is empty) */
                  <>
                    <div className="px-3.5 py-2 border-b border-gray-100 bg-gray-50/50">
                      <div className="text-[0.7rem] font-semibold text-gray-400 uppercase tracking-wide">Recent Searches</div>
                    </div>
                    {savedSearches.map(s => (
                      <div
                        key={s.id}
                        className="w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-[#EFF6FF] transition-colors cursor-pointer border-b border-b-gray-100 last:border-b-0 group"
                        onMouseDown={e => {
                          e.preventDefault()
                          loadSavedSearch(s.query)
                        }}
                      >
                        <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[0.82rem] font-medium text-[#111827] truncate">{s.label}</div>
                        </div>
                        <button
                          onMouseDown={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            removeSavedSearch(s.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 bg-transparent border-0 cursor-pointer p-0.5 transition-all"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-gray-200" />

          {/* ── Lead Types dropdown ── */}
          <div className="relative" data-dropdown ref={openDropdown === 'leadTypes' ? dropdownRef : undefined}>
            <button
              onClick={() => setOpenDropdown(openDropdown === 'leadTypes' ? null : 'leadTypes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.8rem] font-medium border cursor-pointer transition-colors ${
                (filters.absenteeOnly || filters.taxDelinquent || filters.preForeclosure || filters.probate)
                  ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                  : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
              }`}
            >
              Lead Types
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown === 'leadTypes' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'leadTypes' && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-xl z-40 w-[220px] py-2">
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
                    <span className="text-[0.8rem] text-[#374151]">{tog.label}</span>
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
                      <span className="text-[0.8rem] text-[#374151]">{t}</span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-gray-100 mt-1 pt-2 px-3 pb-1">
                  <button
                    onClick={() => { handleSearch(); setOpenDropdown(null) }}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium border-0 rounded-md px-3 py-1.5 text-[0.78rem] cursor-pointer transition-colors"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.8rem] font-medium border cursor-pointer transition-colors ${
                filters.propertyType.length > 0
                  ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                  : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
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
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-xl z-40 w-[200px] py-2">
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
                    <span className="text-[0.8rem] text-[#374151] flex items-center gap-1.5">
                      {typeIcon(t)} {t}
                    </span>
                  </label>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-2 px-3 pb-1">
                  <button
                    onClick={() => { handleSearch(); setOpenDropdown(null) }}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium border-0 rounded-md px-3 py-1.5 text-[0.78rem] cursor-pointer transition-colors"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.8rem] font-medium border cursor-pointer transition-colors ${
                filters.valueMin != null || filters.valueMax != null
                  ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                  : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
              }`}
            >
              Price
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown === 'price' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'price' && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-xl z-40 w-[280px] p-3">
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
                      className="w-full bg-white border border-gray-200 rounded-md px-2.5 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB]"
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
                      className="w-full bg-white border border-gray-200 rounded-md px-2.5 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB]"
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
                          : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
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
                    className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium border-0 rounded-md px-3 py-1.5 text-[0.78rem] cursor-pointer transition-colors"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.8rem] font-medium border cursor-pointer transition-colors ${
                filters.bedsMin != null || filters.bedsMax != null || filters.bathsMin != null || filters.bathsMax != null
                  ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                  : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
              }`}
            >
              Beds / Baths
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown === 'bedsBaths' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'bedsBaths' && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-xl z-40 w-[280px] p-3">
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
                            : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
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
                            : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
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
                    className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium border-0 rounded-md px-3 py-1.5 text-[0.78rem] cursor-pointer transition-colors"
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.8rem] font-medium border cursor-pointer transition-colors ${
                filters.sqftMin != null || filters.sqftMax != null || filters.yearBuiltMin != null || filters.yearBuiltMax != null || (filters.equityMin != null && filters.equityMin > 0) || filters.ownershipMin != null
                  ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                  : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              More
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openDropdown === 'more' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'more' && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-xl z-40 w-[320px] p-3">
                {/* Square Footage */}
                <div className="mb-3">
                  <div className="text-[0.72rem] text-gray-500 font-medium mb-2">Square Footage</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Min"
                      value={filters.sqftMin ?? ''}
                      onChange={e => setFilter('sqftMin', e.target.value ? parseInt(e.target.value) || null : null)}
                      className="flex-1 bg-white border border-gray-200 rounded-md px-2.5 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-gray-400 text-[0.78rem]">to</span>
                    <input
                      type="text"
                      placeholder="Max"
                      value={filters.sqftMax ?? ''}
                      onChange={e => setFilter('sqftMax', e.target.value ? parseInt(e.target.value) || null : null)}
                      className="flex-1 bg-white border border-gray-200 rounded-md px-2.5 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB]"
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
                      className="flex-1 bg-white border border-gray-200 rounded-md px-2.5 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB]"
                    />
                    <span className="text-gray-400 text-[0.78rem]">to</span>
                    <input
                      type="text"
                      placeholder="Max"
                      value={filters.yearBuiltMax ?? ''}
                      onChange={e => setFilter('yearBuiltMax', e.target.value ? parseInt(e.target.value) || null : null)}
                      className="flex-1 bg-white border border-gray-200 rounded-md px-2.5 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB]"
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
                            : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50'
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
                    className="w-24 bg-white border border-gray-200 rounded-md px-2.5 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFilter('sqftMin', null); setFilter('sqftMax', null)
                      setFilter('yearBuiltMin', null); setFilter('yearBuiltMax', null)
                      setFilter('equityMin', null); setFilter('ownershipMin', null)
                    }}
                    className="text-[0.74rem] text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => { handleSearch(); setOpenDropdown(null) }}
                    className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium border-0 rounded-md px-3 py-1.5 text-[0.78rem] cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-gray-200" />

          {/* Save Search */}
          <button
            onClick={() => saveSearch()}
            disabled={!filters.query.trim() || savedSearches.some(s => s.query.toLowerCase() === filters.query.trim().toLowerCase())}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.8rem] font-medium border cursor-pointer transition-colors ${
              filters.query.trim() && !savedSearches.some(s => s.query.toLowerCase() === filters.query.trim().toLowerCase())
                ? 'border-gray-200 bg-white text-[#374151] hover:bg-gray-50'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
            title={savedSearches.some(s => s.query.toLowerCase() === filters.query.trim().toLowerCase()) ? 'Already saved' : 'Save current search'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${savedSearches.some(s => s.query.toLowerCase() === filters.query.trim().toLowerCase()) ? 'fill-current text-[#2563EB]' : ''}`} />
            Save Search
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2 text-[0.8rem] text-red-700">
            <Info className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* ═══ MAIN CONTENT: MAP + SIDEBAR ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Map (left) ── */}
        <div className="flex-1 relative">
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex overflow-hidden">
              <button
                onClick={() => setMapStyle('street')}
                className={`text-[0.72rem] font-medium px-3 py-1.5 cursor-pointer border-0 transition-colors ${
                  mapStyle === 'street'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-transparent text-[#374151] hover:bg-gray-100'
                }`}
              >
                Street
              </button>
              <button
                onClick={() => setMapStyle('satellite')}
                className={`text-[0.72rem] font-medium px-3 py-1.5 cursor-pointer border-0 transition-colors ${
                  mapStyle === 'satellite'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-transparent text-[#374151] hover:bg-gray-100'
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
                  className={`text-[0.72rem] font-medium px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    activeLayer === lf.key
                      ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                      : 'bg-white text-[#374151] border-gray-200 hover:bg-gray-50 shadow-sm'
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
          <label className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm px-3 py-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={searchAsMove}
              onChange={e => setSearchAsMove(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#2563EB] cursor-pointer"
            />
            <span className="text-[0.72rem] font-medium text-[#374151]">Search as I move the map</span>
          </label>
        </div>

        {/* ── Right Sidebar (property list) ── */}
        <div className="w-[420px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col disc-sidebar">
          {/* Results header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 flex-shrink-0 bg-gray-50/50">
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex rounded-md overflow-hidden border border-gray-200">
                <button
                  onClick={() => { setViewMode('properties'); setSelectedOwnerProps(new Set()) }}
                  className={`px-2.5 py-1 text-[0.72rem] font-medium border-0 cursor-pointer transition-colors ${
                    viewMode === 'properties'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  Properties
                </button>
                <button
                  onClick={() => setViewMode('buyers')}
                  className={`px-2.5 py-1 text-[0.72rem] font-medium border-0 cursor-pointer transition-colors ${
                    viewMode === 'buyers'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  Buyers
                </button>
              </div>
              <span className="text-[0.76rem] text-gray-500">
                {viewMode === 'properties'
                  ? (pagination.total > 0
                    ? <><span className="font-semibold text-[#111827]">{currentStart.toLocaleString()}</span> - <span className="font-semibold text-[#111827]">{currentEnd.toLocaleString()}</span> of <span className="font-semibold text-[#111827]">{pagination.total.toLocaleString()}</span> Results</>
                    : 'No results')
                  : (ownerSearch.total > 0
                    ? <><span className="font-semibold text-[#111827]">{ownerSearch.total.toLocaleString()}</span> Investors</>
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
                    className="text-[0.72rem] text-gray-500 bg-white border border-gray-200 rounded-md px-2 py-1 cursor-pointer outline-none"
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
                </>
              )}
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">

            {/* ────── PROPERTIES VIEW ────── */}
            {viewMode === 'properties' && (<>
              {loading && properties.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin mb-2 text-[#2563EB]" />
                  <span className="text-[0.8rem]">Searching...</span>
                </div>
              )}
              {!loading && properties.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Search className="w-8 h-8 mb-2 text-gray-300" />
                  <span className="text-[0.82rem] font-medium text-gray-500 mb-0.5">Search for properties</span>
                  <span className="text-[0.72rem] text-gray-400">Enter a city and state or zip code</span>
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
                        className={`px-4 py-3 cursor-pointer transition-colors ${
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
                                <h3 className="text-[0.84rem] font-semibold text-[#111827] leading-tight">{p.addressLine1}</h3>
                                <p className="text-[0.74rem] text-gray-400 mt-0.5">{p.city}, {p.state} {p.zipCode}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-[0.88rem] font-bold text-[#111827]">{formatCurrency(p.assessedValue)}</div>
                                <div className="text-[0.66rem] text-gray-400">Est. Value</div>
                              </div>
                            </div>

                            {/* Row 2: Stats */}
                            <div className="flex items-center gap-4 mt-2">
                              {(p.sqft ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-[0.76rem] text-[#374151]">
                                  <Ruler className="w-3.5 h-3.5 text-gray-400" />
                                  {p.sqft!.toLocaleString()} Sq. Ft.
                                </span>
                              )}
                              {eq.equityCategory !== 'unknown' && eq.lastSalePrice != null && eq.lastSalePrice > 0 && eq.estimatedCurrentValue > 0 && (
                                <span className="text-[0.76rem] font-semibold text-[#111827]">
                                  {Math.round(((eq.estimatedCurrentValue - eq.lastSalePrice) / eq.estimatedCurrentValue) * 100)}%
                                  <span className="text-gray-400 font-normal ml-1">Equity</span>
                                </span>
                              )}
                            </div>

                            {/* Row 3: Property type + Owner type */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="flex items-center gap-1 text-[0.72rem] text-gray-500">
                                {typeIcon(pType)}
                                {pType}
                              </span>
                              <span className={`flex items-center gap-1 text-[0.72rem] ${ownerT.color} px-1.5 py-0.5 rounded`}>
                                {ownerT.label === 'Individual' ? <UserCircle className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                {ownerT.label} Owned
                              </span>
                            </div>

                            {/* Row 4: Badges */}
                            <div className="flex items-center gap-1.5 mt-2">
                              {p.ownerOccupied === false && (
                                <span className="text-[0.66rem] font-medium px-2 py-0.5 rounded border border-gray-300 text-[#374151] bg-white">
                                  Absentee Owners
                                </span>
                              )}
                              {(p.bedrooms ?? 0) >= 3 && (
                                <span className="text-[0.66rem] font-medium px-2 py-0.5 rounded border border-gray-300 text-[#374151] bg-white">
                                  {p.bedrooms}+
                                </span>
                              )}
                              {eq.equityCategory === 'high' && (
                                <span className="text-[0.66rem] font-medium px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 bg-emerald-50">
                                  High Equity
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
                  <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-4 py-2.5">
                    <div className="text-[0.78rem] font-semibold text-[#1D4ED8] mb-0.5">
                      Found {ownerSearch.total} active investors in {ownerSearch.searchLocation}
                    </div>
                    <div className="flex items-center gap-3 text-[0.7rem] text-[#3B82F6]">
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
                        className={`text-[0.68rem] font-medium px-2 py-1 rounded-md border-0 cursor-pointer transition-colors ${
                          ownerSearch.sortBy === s.key
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                              <h3 className="text-[0.8rem] font-semibold text-[#111827] truncate flex-1">{owner.displayName}</h3>
                              {owner.likelyCashBuyer && (
                                <span className="text-[0.56rem] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex-shrink-0">
                                  Cash Buyer
                                </span>
                              )}
                            </div>

                            {/* Row 2: Stats row */}
                            <div className="flex items-center gap-3 text-[0.72rem] text-gray-500 mb-1.5">
                              <span className="flex items-center gap-0.5 font-medium">
                                <Home className="w-3 h-3 text-gray-400" />
                                {owner.propertyCount} properties
                              </span>
                              <span className="flex items-center gap-0.5">
                                <DollarSign className="w-3 h-3 text-gray-400" />
                                {formatCurrency(owner.totalValue)}
                              </span>
                            </div>

                            {/* Row 3: Investor score bar */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[0.66rem] text-gray-400 w-12 flex-shrink-0">Score</span>
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${owner.investorScore}%`,
                                    background: owner.investorScore >= 70 ? '#059669' : owner.investorScore >= 40 ? '#D97706' : '#9CA3AF',
                                  }}
                                />
                              </div>
                              <span className={`text-[0.68rem] font-semibold w-7 text-right flex-shrink-0 ${
                                owner.investorScore >= 70 ? 'text-emerald-600' : owner.investorScore >= 40 ? 'text-amber-600' : 'text-gray-400'
                              }`}>
                                {owner.investorScore}
                              </span>
                            </div>

                            {/* Row 4: Cities + date */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[0.66rem] text-gray-400 truncate">
                                  {owner.cities.join(', ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {owner.lastPurchaseDate && (
                                  <span className="text-[0.64rem] text-gray-400 flex items-center gap-0.5">
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
                            <div className="ml-6 mr-4 mb-2 space-y-1 border-l-2 border-[#2563EB]/20 pl-3">
                              {owner.properties.map(p => (
                                <div
                                  key={p.id}
                                  className="rounded-md px-2.5 py-2 bg-gray-50 border border-gray-200/50 hover:bg-white cursor-pointer transition-colors"
                                  onClick={(e) => { e.stopPropagation(); handleViewDetails(p) }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[0.74rem] font-medium text-[#111827] truncate">{p.addressLine1}</span>
                                    <span className="text-[0.72rem] font-semibold text-[#374151] ml-2 flex-shrink-0">{formatCurrency(p.assessedValue)}</span>
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
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 flex-shrink-0 bg-white">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { for (let i = 1; i < pagination.page; i++) prevPage() }}
                  disabled={pagination.page <= 1}
                  className="flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={prevPage}
                  disabled={pagination.page <= 1}
                  className="flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[0.76rem] text-gray-500">
                <span>Page</span>
                <span className="font-semibold text-[#111827] bg-gray-100 border border-gray-200 rounded px-2 py-0.5 min-w-[2rem] text-center">{pagination.page}</span>
                <span>of {totalPages}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={nextPage}
                  disabled={!pagination.hasMore}
                  className="flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { for (let i = pagination.page; i < totalPages; i++) nextPage() }}
                  disabled={!pagination.hasMore}
                  className="flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          {viewMode === 'buyers' && ownerSearch.pagination.total > ownerSearch.pagination.limit && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 flex-shrink-0 bg-white">
              <button
                onClick={ownerSearch.prevPage}
                disabled={ownerSearch.pagination.page <= 1}
                className="flex items-center gap-1 text-[0.74rem] text-[#6B7280] hover:text-[#374151] bg-gray-100 hover:bg-gray-200 border-0 rounded-md px-2.5 py-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="flex items-center gap-1 text-[0.74rem] text-[#6B7280] hover:text-[#374151] bg-gray-100 hover:bg-gray-200 border-0 rounded-md px-2.5 py-1.5 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {activeProperty && (
        <PropertyDetail
          property={activeProperty}
          onClose={() => setActiveProperty(null)}
          onViewOnMap={() => {
            setActiveProperty(null)
          }}
          onAddToCRM={() => addPropertyToCRM(activeProperty)}
          isInCRM={crmIds.has(activeProperty.id)}
          addingToCRM={addingCrmId === activeProperty.id}
          features={propertyFeatures[activeProperty.id] ?? null}
          featuresLoading={featuresLoading === activeProperty.id}
          onSelectProperty={(p) => { setActiveProperty(p); fetchPropertyFeatures(p.id) }}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .disc-sidebar {
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 100% !important;
            z-index: 15;
          }
        }
      `}</style>
    </div>
  )
}
