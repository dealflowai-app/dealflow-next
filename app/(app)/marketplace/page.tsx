'use client'

import { useState, useEffect, useCallback, useRef, useMemo, memo, Suspense } from 'react'
import MapGL, { Marker, Popup, NavigationControl, Source, Layer, type MapRef } from 'react-map-gl/mapbox'
import type { CircleLayer, SymbolLayer } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useToast } from '@/components/toast'
import {
  Store,
  ClipboardList,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Clock,
  Plus,
  Eye,
  MessageSquare,
  Pencil,
  Pause,
  Trash2,
  ArrowUpDown,
  ShieldAlert,
  MapPin,
  TrendingUp,
  Filter,
  Search,
  X,
  ArrowLeft,
  Send,
  Play,
  Check,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Map,
  BarChart3,
  Share2,
  Flame,
  Star,
  Sparkles,
  RotateCcw,
  CheckSquare,
  Square,
  Percent,
  CalendarDays,
  Building2,
  Home,
  TreePine,
  Warehouse,
  BedDouble,
  Bath,
  Ruler,
  ImagePlus,
  Upload,
  ShieldCheck,
  Info,
  Maximize2,
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
interface Listing {
  id: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  askingPrice: number
  assignFee: number | null
  arv: number | null
  repairCost: number | null
  flipProfit: number | null
  rentalCashFlow: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  yearBuilt: number | null
  condition: string | null
  confidenceScore: number | null
  latitude: number | null
  longitude: number | null
  headline: string | null
  description: string | null
  photoUrls: string[]
  viewCount: number
  inquiryCount: number
  publishedAt: string | null
  createdAt: string
  profile: {
    id?: string
    firstName: string | null
    lastInitial: string | null
    company: string | null
    avatarUrl?: string | null
    verified?: boolean
    reputationScore?: number
    reviewCount?: number
    completedDeals?: number
    dealCount?: number
  }
}

interface MyListing {
  id: string
  dealId: string
  status: string
  address: string
  city: string
  state: string
  zip: string
  askingPrice: number
  headline: string | null
  description: string | null
  viewCount: number
  inquiryCount: number
  publishedAt: string | null
  soldAt: string | null
  createdAt: string
  deal: { address: string; city: string; state: string; zip: string; status: string; askingPrice: number }
  inquiries: InquiryRow[]
}

interface InquiryRow {
  id: string
  buyerName: string
  buyerEmail: string | null
  message: string | null
  status: string
  createdAt: string
}

interface DealOption {
  id: string
  address: string
  city: string
  state: string
  zip: string
  askingPrice: number
  assignFee: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  yearBuilt: number | null
  condition: string | null
  propertyType: string
  status: string
}

interface PhotoPreview {
  file: File
  url: string
}

/* ═══════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════ */
const tabs = [
  { key: 'deals', label: 'Deal Listings', icon: Store },
  { key: 'buyers', label: 'Buyer Board', icon: ClipboardList },
  { key: 'mine', label: 'My Listings', icon: Bookmark },
] as const
type Tab = (typeof tabs)[number]['key']

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function scoreGrade(score: number | null): string {
  if (score === null) return '—'
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  return 'C'
}

function scoreStyle(grade: string) {
  if (grade.startsWith('A')) return 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border-[#BFDBFE]'
  if (grade.startsWith('B')) return 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
  if (grade.startsWith('C')) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-gray-50 text-[#6B7280] border-gray-200'
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Listed today'
  if (diff === 1) return '1d ago'
  return `${diff}d ago`
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function estProfit(l: Listing): number | null {
  if (l.arv && l.askingPrice) {
    const repair = l.repairCost ?? 0
    const profit = l.arv - l.askingPrice - repair
    return profit > 0 ? profit : null
  }
  return l.flipProfit
}

function listingStatusStyle(s: string) {
  switch (s) {
    case 'ACTIVE': return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]'
    case 'PAUSED': return 'text-amber-700 bg-amber-50'
    case 'SOLD': return 'text-purple-700 bg-purple-50'
    case 'EXPIRED': return 'text-[rgba(5,14,36,0.5)] bg-[rgba(5,14,36,0.04)]'
    default: return 'text-[rgba(5,14,36,0.5)] bg-[rgba(5,14,36,0.04)]'
  }
}

function inquiryStatusStyle(s: string) {
  switch (s) {
    case 'NEW': return 'text-[#60A5FA] bg-[rgba(96,165,250,0.1)]'
    case 'CONTACTED': return 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]'
    case 'CLOSED': return 'text-[rgba(5,14,36,0.5)] bg-[rgba(5,14,36,0.04)]'
    default: return 'text-[rgba(5,14,36,0.5)] bg-[rgba(5,14,36,0.04)]'
  }
}

function wholesalerDisplay(p: Listing['profile']): string {
  const name = [p.firstName, p.lastInitial].filter(Boolean).join(' ')
  return name || 'Wholesaler'
}

function wholesalerInitials(p: Listing['profile']): string {
  return [p.firstName?.[0], p.lastInitial?.[0]].filter(Boolean).join('')
}

const VerifiedBadge = memo(function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <span title="Verified Seller" className="inline-flex items-center">
      <ShieldCheck style={{ width: size, height: size, color: '#2563EB' }} />
    </span>
  )
})

const ReputationStars = memo(function ReputationStars({ score, count }: { score: number; count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-[0.68rem] text-[#F59E0B]" title={`${score.toFixed(1)} / 5 from ${count} review${count !== 1 ? 's' : ''}`}>
      <Star style={{ width: 11, height: 11, fill: '#F59E0B', stroke: '#F59E0B' }} />
      <span className="text-[#374151] font-medium">{score.toFixed(1)}</span>
      <span className="text-[#9CA3AF]">({count})</span>
    </span>
  )
})

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

function mapPinColor(type: string): string {
  switch (type) {
    case 'SFR': return '#2563EB'
    case 'MULTI_FAMILY': return '#7C3AED'
    case 'LAND': return '#D97706'
    case 'COMMERCIAL': return '#0D9488'
    case 'CONDO': return '#EC4899'
    case 'MOBILE_HOME': return '#6B7280'
    default: return '#6B7280'
  }
}

function shortPrice(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}K`
  return `$${n.toLocaleString()}`
}

const PROPERTY_BORDER_COLORS: Record<string, string> = {
  SFR: '',
  MULTI_FAMILY: '',
  LAND: '',
  COMMERCIAL: '',
  CONDO: '',
  MOBILE_HOME: '',
}

const PROPERTY_ICONS: Record<string, typeof Home> = {
  SFR: Home,
  MULTI_FAMILY: Building2,
  LAND: TreePine,
  COMMERCIAL: Warehouse,
  CONDO: Building2,
  MOBILE_HOME: Home,
}

// ── Badges logic ────────────────────────────────
function getBadges(l: Listing): Array<{ label: string; color: string; icon: typeof Flame }> {
  const badges: Array<{ label: string; color: string; icon: typeof Flame }> = []
  const publishedDays = daysSince(l.publishedAt || l.createdAt)

  if (publishedDays <= 2) {
    badges.push({ label: 'New', icon: Sparkles, color: 'bg-blue-500 text-white' })
  }
  if (l.viewCount >= 20 || l.inquiryCount >= 3) {
    badges.push({ label: 'Hot', icon: Flame, color: 'bg-orange-500 text-white' })
  }
  if (l.confidenceScore !== null && l.confidenceScore >= 85) {
    badges.push({ label: 'Top Deal', icon: Star, color: 'bg-[#2563EB] text-white' })
  }
  return badges
}

// ── Bookmarks (localStorage) ────────────────────
const BOOKMARKS_KEY = 'dealflow_mp_bookmarks'

function getBookmarks(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]')
  } catch { return [] }
}

function toggleBookmark(id: string): string[] {
  const current = getBookmarks()
  const idx = current.indexOf(id)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(id)
  }
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(current))
  return [...current]
}

/* ═══════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════ */
function ListingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 mp-deals-grid">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl overflow-hidden animate-pulse">
          <div className="h-[140px] bg-gray-100" />
          <div className="px-4 py-3.5">
            <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-100 rounded mb-3" />
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="h-8 bg-gray-50 rounded" />
              <div className="h-8 bg-gray-50 rounded" />
              <div className="h-8 bg-gray-50 rounded" />
            </div>
            <div className="h-6 bg-gray-50 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAP VIEW
   ═══════════════════════════════════════════════ */
const MAP_PIN_LEGEND = [
  { label: 'SFR', color: '#2563EB' },
  { label: 'Multi-Family', color: '#7C3AED' },
  { label: 'Land', color: '#D97706' },
  { label: 'Commercial', color: '#0D9488' },
  { label: 'Condo', color: '#EC4899' },
  { label: 'Mobile Home', color: '#6B7280' },
]

// Cluster layer styles
const clusterCircleLayer: CircleLayer = {
  id: 'clusters',
  type: 'circle',
  source: 'listings',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step', ['get', 'point_count'],
      '#93C5FD', 5,   // light blue < 5
      '#3B82F6', 15,  // medium blue < 15
      '#1E40AF',      // dark navy 15+
    ],
    'circle-radius': [
      'step', ['get', 'point_count'],
      20, 5,  // 40px diameter < 5
      25, 15, // 50px diameter < 15
      30,     // 60px diameter 15+
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.9,
  },
}

const clusterCountLayer: SymbolLayer = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'listings',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 13,
    'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
    'text-allow-overlap': true,
  },
  paint: {
    'text-color': '#ffffff',
  },
}

// Heat zone layer (city-level density)
const heatZoneLayer: CircleLayer = {
  id: 'heat-zones',
  type: 'circle',
  source: 'listings',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': 'rgba(37, 99, 235, 0.08)',
    'circle-radius': [
      'step', ['get', 'point_count'],
      40, 5,
      60, 15,
      80,
    ],
    'circle-blur': 1,
  },
}

function MarketplaceMapView({
  listings,
  onSelectListing,
}: {
  listings: Listing[]
  onSelectListing: (listing: Listing) => void
}) {
  const mapRef = useRef<MapRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const miniCardStripRef = useRef<HTMLDivElement>(null)
  const [popupListing, setPopupListing] = useState<Listing | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(0)

  const withCoords = useMemo(
    () => listings.filter(l => l.latitude != null && l.longitude != null),
    [listings],
  )

  // Build GeoJSON for the source
  const geojsonData = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: withCoords.map(l => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [l.longitude!, l.latitude!],
      },
      properties: {
        id: l.id,
        price: l.askingPrice,
        propertyType: l.propertyType,
        address: l.address,
        city: l.city,
        state: l.state,
        color: mapPinColor(l.propertyType),
      },
    })),
  }), [withCoords])

  // Lookup map for listing by id
  const listingById = useMemo(() => {
    const lookup: Record<string, Listing> = {}
    for (const l of withCoords) lookup[l.id] = l
    return lookup
  }, [withCoords])

  // Fit bounds when listings change
  const fitAllListings = useCallback(() => {
    const map = mapRef.current
    if (!map || withCoords.length === 0) return

    if (withCoords.length === 1) {
      map.flyTo({
        center: [withCoords[0].longitude!, withCoords[0].latitude!],
        zoom: 13,
        duration: 1000,
      })
      return
    }

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
    for (const p of withCoords) {
      if (p.longitude! < minLng) minLng = p.longitude!
      if (p.longitude! > maxLng) maxLng = p.longitude!
      if (p.latitude! < minLat) minLat = p.latitude!
      if (p.latitude! > maxLat) maxLat = p.latitude!
    }
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 60, duration: 1000, maxZoom: 14 },
    )
  }, [withCoords])

  useEffect(() => { fitAllListings() }, [fitAllListings])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Track visible listings count on move
  const updateVisibleCount = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    try {
      const canvas = map.getCanvas()
      const features = map.queryRenderedFeatures(
        [[0, 0], [canvas.width, canvas.height]],
        { layers: ['unclustered-point'] },
      )
      setVisibleCount(features?.length ?? withCoords.length)
    } catch {
      setVisibleCount(withCoords.length)
    }
  }, [withCoords.length])

  // Handle cluster click
  const handleMapClick = useCallback((e: mapboxgl.MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // Check for cluster click
    const clusterFeatures = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
    if (clusterFeatures.length > 0) {
      const clusterId = clusterFeatures[0].properties?.cluster_id
      const source = map.getSource('listings') as mapboxgl.GeoJSONSource
      if (source && clusterId != null) {
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return
          const geom = clusterFeatures[0].geometry
          if (geom.type === 'Point') {
            map.easeTo({
              center: geom.coordinates as [number, number],
              zoom: zoom + 1,
              duration: 500,
            })
          }
        })
      }
      return
    }

    // Check for unclustered point click
    const pointFeatures = map.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] })
    if (pointFeatures.length > 0) {
      const id = pointFeatures[0].properties?.id
      const listing = id ? listingById[id] ?? null : null
      if (listing) {
        setPopupListing(listing)
        // Scroll mini-card into view
        scrollMiniCardIntoView(listing.id)
      }
      return
    }

    // Clicked empty space
    setPopupListing(null)
  }, [listingById])

  const scrollMiniCardIntoView = (id: string) => {
    const strip = miniCardStripRef.current
    if (!strip) return
    const card = strip.querySelector(`[data-listing-id="${id}"]`) as HTMLElement | null
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }

  const handleMiniCardClick = (l: Listing) => {
    setPopupListing(l)
    if (l.latitude != null && l.longitude != null) {
      mapRef.current?.flyTo({ center: [l.longitude, l.latitude], zoom: 14, duration: 800 })
    }
  }

  const missingCount = listings.length - withCoords.length

  return (
    <div>
      {/* Map container */}
      <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden border border-[rgba(5,14,36,0.06)] mp-map-container" style={{ height: 600 }}>
        <MapGL
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: -98.5, latitude: 39.8, zoom: 4 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          attributionControl={false}
          onClick={handleMapClick}
          onMoveEnd={updateVisibleCount}
          onLoad={updateVisibleCount}
          interactiveLayerIds={['clusters', 'unclustered-point']}
          cursor="pointer"
        >
          <NavigationControl position="top-right" showCompass={false} />

          {/* Listings in view counter */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-[8px] px-3 py-2 border border-gray-200 shadow-sm z-10">
            <span className="text-[0.78rem] font-medium text-[#374151]">
              {visibleCount} listing{visibleCount !== 1 ? 's' : ''} in view
            </span>
          </div>

          {/* Fit all button */}
          <button
            onClick={fitAllListings}
            className="absolute top-3 left-[170px] bg-white/95 backdrop-blur-sm rounded-[8px] px-2.5 py-2 border border-gray-200 shadow-sm z-10 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            title="Fit all listings"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#6B7280]" />
            <span className="text-[0.72rem] text-[#6B7280] font-medium">Fit All</span>
          </button>

          {/* GeoJSON Source with clustering */}
          <Source
            id="listings"
            type="geojson"
            data={geojsonData}
            cluster={true}
            clusterMaxZoom={13}
            clusterRadius={50}
          >
            {/* Heat zone background */}
            <Layer {...heatZoneLayer} />
            {/* Cluster circles */}
            <Layer {...clusterCircleLayer} />
            {/* Cluster count labels */}
            <Layer {...clusterCountLayer} />
            {/* Unclustered points (hidden - we use Markers for custom pins) */}
            <Layer
              id="unclustered-point"
              type="circle"
              source="listings"
              filter={['!', ['has', 'point_count']]}
              paint={{
                'circle-radius': 0,
                'circle-opacity': 0,
              }}
            />
          </Source>

          {/* Custom pill-shaped price markers for unclustered points */}
          {withCoords.map(l => {
            const isActive = popupListing?.id === l.id
            const isHovered = hoveredId === l.id
            const color = mapPinColor(l.propertyType)
            return (
              <Marker
                key={l.id}
                longitude={l.longitude!}
                latitude={l.latitude!}
                anchor="bottom"
                onClick={e => {
                  e.originalEvent.stopPropagation()
                  setPopupListing(l)
                  scrollMiniCardIntoView(l.id)
                }}
              >
                <div
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    transform: isActive ? 'scale(1.15)' : isHovered ? 'scale(1.08)' : 'scale(1)',
                    filter: isActive ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))',
                  }}
                  onMouseEnter={() => setHoveredId(l.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Pill */}
                  <div
                    className="rounded-full px-2 py-[3px] text-white font-semibold whitespace-nowrap relative"
                    style={{
                      fontSize: '0.65rem',
                      lineHeight: 1.3,
                      backgroundColor: isActive ? '#1D4ED8' : color,
                      border: isActive ? '2px solid #1E40AF' : '1.5px solid rgba(255,255,255,0.5)',
                    }}
                  >
                    {shortPrice(l.askingPrice)}
                  </div>
                  {/* Triangle pointer */}
                  <div className="flex justify-center" style={{ marginTop: -1 }}>
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: `6px solid ${isActive ? '#1D4ED8' : color}`,
                      }}
                    />
                  </div>
                </div>
              </Marker>
            )
          })}

          {/* Popup */}
          {popupListing && popupListing.latitude != null && popupListing.longitude != null && (
            <Popup
              longitude={popupListing.longitude}
              latitude={popupListing.latitude}
              offset={[0, -28] as [number, number]}
              closeButton={true}
              closeOnClick={false}
              onClose={() => setPopupListing(null)}
              className="mp-map-popup"
              maxWidth="280px"
            >
              <div className="px-3 py-2.5 min-w-[240px]">
                <div className="text-[0.82rem] font-medium text-[#111827] mb-0.5">{popupListing.address}</div>
                <div className="text-[0.72rem] text-[#9CA3AF] mb-2">{popupListing.city}, {popupListing.state} {popupListing.zip}</div>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="text-[0.64rem] font-medium px-1.5 py-0.5 rounded-full text-[#374151] bg-[#F3F4F6]">
                    {PROP_TYPE_LABELS[popupListing.propertyType] || popupListing.propertyType}
                  </span>
                  {popupListing.condition && (
                    <span className="text-[0.64rem] font-medium px-1.5 py-0.5 rounded-full text-[#374151] bg-[#F3F4F6]">
                      {popupListing.condition}
                    </span>
                  )}
                  {popupListing.confidenceScore != null && (
                    <span className={`text-[0.64rem] font-bold px-1.5 py-0.5 rounded-full border ${scoreStyle(scoreGrade(popupListing.confidenceScore))}`}>
                      {scoreGrade(popupListing.confidenceScore)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[0.72rem] mb-2">
                  <span>Ask: <strong className="text-[#111827]">{shortPrice(popupListing.askingPrice)}</strong></span>
                  {popupListing.arv && <span>ARV: <strong className="text-[#111827]">{shortPrice(popupListing.arv)}</strong></span>}
                  {popupListing.arv && (
                    <span>Spread: <strong className="text-[#2563EB]">{shortPrice(popupListing.arv - popupListing.askingPrice)}</strong></span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.68rem] text-[#9CA3AF]">
                    {wholesalerDisplay(popupListing.profile)}
                    {popupListing.profile.company ? ` · ${popupListing.profile.company}` : ''}
                  </span>
                  <button
                    onClick={() => onSelectListing(popupListing)}
                    className="text-[0.72rem] font-medium text-[#2563EB] hover:underline bg-transparent border-0 cursor-pointer p-0"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </Popup>
          )}

          {/* Property Type Legend */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-[8px] px-3 py-2.5 border border-[rgba(5,14,36,0.06)] shadow-sm z-10">
            <span className="text-[0.58rem] font-medium text-[rgba(5,14,36,0.35)] uppercase tracking-[0.06em] block mb-1.5">Property Types</span>
            <div className="flex flex-col gap-1">
              {MAP_PIN_LEGEND.map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
                  <span className="text-[0.68rem] font-[450] text-[rgba(5,14,36,0.55)]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </MapGL>
      </div>

      {/* Map info bar */}
      <div className="flex items-center justify-between mt-2 mb-3 text-[0.78rem] text-[#9CA3AF]">
        <span>Showing {withCoords.length} of {listings.length} listings on map</span>
        {missingCount > 0 && (
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            {missingCount} listing{missingCount > 1 ? 's' : ''} not mapped (no coordinates)
          </span>
        )}
      </div>

      {/* Mini-card strip */}
      {withCoords.length > 0 && (
        <div ref={miniCardStripRef} className="overflow-x-auto pb-2 mp-minicard-strip">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {withCoords.map(l => {
              const isActive = popupListing?.id === l.id
              return (
                <button
                  key={l.id}
                  data-listing-id={l.id}
                  onClick={() => handleMiniCardClick(l)}
                  onMouseEnter={() => setHoveredId(l.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`flex-shrink-0 w-[220px] bg-white border rounded-xl px-3 py-2.5 text-left cursor-pointer transition-all ${
                    isActive ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20' : 'border-[rgba(5,14,36,0.06)] hover:shadow-[0_2px_8px_rgba(5,14,36,0.06)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: mapPinColor(l.propertyType) }} />
                    <span className="text-[0.78rem] font-medium text-[#111827] truncate">{l.address}</span>
                  </div>
                  <div className="text-[0.68rem] text-[#9CA3AF] mb-1.5">{l.city}, {l.state}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.78rem] font-semibold text-[#111827]">{shortPrice(l.askingPrice)}</span>
                    {l.confidenceScore != null && (
                      <span className={`text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full border ${scoreStyle(scoreGrade(l.confidenceScore))}`}>
                        {scoreGrade(l.confidenceScore)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Popup styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .mp-map-popup .mapboxgl-popup-content {
          padding: 0;
          border-radius: 10px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
          border: 1px solid #E5E7EB;
        }
        .mp-map-popup .mapboxgl-popup-tip {
          border-top-color: #E5E7EB;
        }
        .mp-map-popup .mapboxgl-popup-close-button {
          font-size: 16px;
          padding: 2px 6px;
          color: #9CA3AF;
        }
        @media (max-width: 900px) {
          .mp-map-container { height: 400px !important; }
          .mp-minicard-strip { display: none; }
        }
      ` }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════
   DEAL LISTINGS SECTION
   ═══════════════════════════════════════════════ */
function DealListingsSection() {
  const toast = useToast()
  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [showMapView, setShowMapView] = useState(false)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('newest')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setBookmarks(getBookmarks()) }, [])

  const buildQuery = useCallback((offset = 0) => {
    const params = new URLSearchParams()
    if (searchText) params.set('city', searchText)
    if (stateFilter) params.set('state', stateFilter)
    if (typeFilter) params.set('propertyType', typeFilter)
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    params.set('sort', sort)
    params.set('limit', '20')
    params.set('offset', String(offset))
    return params.toString()
  }, [searchText, stateFilter, typeFilter, minPrice, maxPrice, sort])

  const fetchListings = useCallback((append = false) => {
    const offset = append ? listings.length : 0
    if (!append) setLoading(true)
    else setLoadingMore(true)

    fetch(`/api/marketplace/listings?${buildQuery(offset)}`)
      .then(r => r.json())
      .then(data => {
        if (append) {
          setListings(prev => [...prev, ...(data.listings || [])])
        } else {
          setListings(data.listings || [])
        }
        setTotal(data.total ?? 0)
      })
      .catch(() => toast.error('Failed to load listings'))
      .finally(() => { setLoading(false); setLoadingMore(false) })
  }, [buildQuery, listings.length, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch on filter change (debounced for text inputs)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchListings(false), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchText, stateFilter, typeFilter, minPrice, maxPrice, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setBookmarks(toggleBookmark(id))
  }

  // Filter for saved only
  const displayListings = showSavedOnly
    ? listings.filter(l => bookmarks.includes(l.id))
    : listings

  // Quick stats
  const uniqueMarkets = useMemo(() => {
    const markets = new Set(listings.map(l => `${l.city}, ${l.state}`))
    return markets.size
  }, [listings])

  const avgScore = useMemo(() => {
    const scored = listings.filter(l => l.confidenceScore !== null)
    if (scored.length === 0) return null
    return Math.round(scored.reduce((sum, l) => sum + (l.confidenceScore ?? 0), 0) / scored.length)
  }, [listings])

  if (selectedListing) {
    return (
      <ListingDetail
        listing={selectedListing}
        onBack={() => setSelectedListing(null)}
        allListings={listings}
        bookmarks={bookmarks}
        onToggleBookmark={handleToggleBookmark}
      />
    )
  }

  // Map view is now rendered inline below, not as a separate early return

  const selectCls = "appearance-none bg-white border border-[#D1D5DB] rounded-md pl-3 pr-8 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors cursor-pointer"

  return (
    <div>
      {/* Quick Stats Bar */}
      {!loading && listings.length > 0 && (
        <div className="flex items-center gap-6 mb-5 bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[#2563EB]" />
            <span className="text-[0.82rem] font-semibold text-[#111827]">{total}</span>
            <span className="text-[0.78rem] text-[#9CA3AF]">Active Listings</span>
          </div>
          <div className="w-px h-5 bg-[#E5E7EB]" />
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#2563EB]" />
            <span className="text-[0.82rem] font-semibold text-[#111827]">{uniqueMarkets}</span>
            <span className="text-[0.78rem] text-[#9CA3AF]">Markets</span>
          </div>
          <div className="w-px h-5 bg-[#E5E7EB]" />
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#2563EB]" />
            <span className="text-[0.82rem] font-semibold text-[#111827]">{avgScore ?? '—'}</span>
            <span className="text-[0.78rem] text-[#9CA3AF]">Avg Deal Score</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setShowSavedOnly(!showSavedOnly) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.78rem] font-medium border cursor-pointer transition-colors ${
                showSavedOnly
                  ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                  : 'bg-white text-[#6B7280] border-[#D1D5DB] hover:bg-[#F9FAFB]'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              Saved ({bookmarks.length})
            </button>
            <div className="flex rounded-md overflow-hidden border border-[#D1D5DB]">
              <button
                onClick={() => setShowMapView(false)}
                className={`flex items-center gap-1 px-3 py-1.5 text-[0.78rem] font-medium cursor-pointer border-0 border-r border-[#D1D5DB] transition-colors ${
                  !showMapView ? 'bg-[#2563EB] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Grid
              </button>
              <button
                onClick={() => setShowMapView(true)}
                className={`flex items-center gap-1 px-3 py-1.5 text-[0.78rem] font-medium cursor-pointer border-0 transition-colors ${
                  showMapView ? 'bg-[#2563EB] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F9FAFB]'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mr-1">
          <Filter className="w-3.5 h-3.5" />
          Filters:
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="City or address..."
            className="bg-white border border-[#D1D5DB] rounded-md pl-8 pr-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors w-[160px]"
          />
        </div>
        <div className="relative">
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className={selectCls}>
            <option value="">All States</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
            <option value="GA">Georgia</option>
            <option value="AZ">Arizona</option>
            <option value="OH">Ohio</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
        </div>
        <div className="relative">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="">All Types</option>
            <option value="SFR">SFR</option>
            <option value="MULTI_FAMILY">Multi-Family</option>
            <option value="LAND">Land</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="CONDO">Condo</option>
            <option value="MOBILE_HOME">Mobile Home</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
        </div>
        <input
          type="number"
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
          placeholder="Min $"
          className="bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors w-[90px]"
        />
        <span className="text-[#9CA3AF] text-sm">–</span>
        <input
          type="number"
          value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          placeholder="Max $"
          className="bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors w-[90px]"
        />
        <div className="ml-auto relative">
          <select value={sort} onChange={e => setSort(e.target.value)} className={selectCls}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low→High</option>
            <option value="price_desc">Price: High→Low</option>
            <option value="score_desc">Deal Score</option>
            <option value="views_desc">Most Viewed</option>
          </select>
          <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
        </div>
      </div>

      {/* Map View */}
      {showMapView && (loading ? <ListingSkeleton /> : listings.length === 0 ? (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-20 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(37,99,235,0.08)' }}>
            <Map className="w-7 h-7 text-[#2563EB]" />
          </div>
          {(searchText || stateFilter || typeFilter || minPrice || maxPrice) ? (
            <>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 16, color: '#0B1224' }} className="mb-1">No listings found</p>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, fontSize: 14, color: 'rgba(5,14,36,0.5)' }}>Try adjusting your search criteria.</p>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 16, color: '#0B1224' }} className="mb-1">No deals listed yet</p>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, fontSize: 14, color: 'rgba(5,14,36,0.5)' }} className="mb-6">Be the first to list a deal on the marketplace.</p>
              <button
                onClick={() => { /* navigate to create listing */ }}
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
                className="inline-flex items-center gap-1.5 hover:opacity-90 text-white border-0 rounded-[8px] px-5 py-2.5 text-[0.84rem] font-medium cursor-pointer transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> List a Deal
              </button>
            </>
          )}
        </div>
      ) : (
        <MarketplaceMapView
          listings={displayListings}
          onSelectListing={l => setSelectedListing(l)}
        />
      ))}

      {/* Grid View */}
      {!showMapView && (loading ? <ListingSkeleton /> : displayListings.length === 0 ? (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-20 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(37,99,235,0.08)' }}>
            <Store className="w-7 h-7 text-[#2563EB]" />
          </div>
          {showSavedOnly ? (
            <>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 16, color: '#0B1224' }} className="mb-1">No saved listings</p>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, fontSize: 14, color: 'rgba(5,14,36,0.5)' }}>Bookmark deals to save them for later.</p>
            </>
          ) : (searchText || stateFilter || typeFilter || minPrice || maxPrice) ? (
            <>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 16, color: '#0B1224' }} className="mb-1">No listings found</p>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, fontSize: 14, color: 'rgba(5,14,36,0.5)' }}>Try adjusting your filters.</p>
            </>
          ) : (
            <>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 16, color: '#0B1224' }} className="mb-1">No deals listed yet</p>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 400, fontSize: 14, color: 'rgba(5,14,36,0.5)' }} className="mb-6">Be the first to list a deal on the marketplace.</p>
              <button
                onClick={() => { /* navigate to create listing */ }}
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
                className="inline-flex items-center gap-1.5 hover:opacity-90 text-white border-0 rounded-[8px] px-5 py-2.5 text-[0.84rem] font-medium cursor-pointer transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> List a Deal
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-2 gap-4 mp-deals-grid">
            {displayListings.map(d => {
              const grade = scoreGrade(d.confidenceScore)
              const profit = estProfit(d)
              const badges = getBadges(d)
              const isSaved = bookmarks.includes(d.id)
              const borderColor = PROPERTY_BORDER_COLORS[d.propertyType] || 'border-t-gray-400'
              const PropIcon = PROPERTY_ICONS[d.propertyType] || Home

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedListing(d)}
                  className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl overflow-hidden cursor-pointer group transition-shadow hover:shadow-[0_2px_8px_rgba(5,14,36,0.06)]"
                >
                  {/* Photo placeholder */}
                  <div className="h-[140px] bg-[#F9FAFB] relative flex items-center justify-center">
                    <PropIcon className="w-10 h-10 text-[#D1D5DB]" />
                    {/* Badges */}
                    {badges.length > 0 && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        {badges.map(b => (
                          <span key={b.label} className={`flex items-center gap-1 text-[0.64rem] font-bold px-2 py-0.5 rounded-full ${b.color}`}>
                            <b.icon className="w-3 h-3" />
                            {b.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Score badge */}
                    {grade !== '—' && (
                      <div className="absolute top-3 right-3">
                        <span className={`text-[0.72rem] font-bold px-2.5 py-1 rounded-[8px] border ${scoreStyle(grade)}`}>
                          {grade}
                        </span>
                      </div>
                    )}
                    {/* Bookmark */}
                    <button
                      onClick={e => handleToggleBookmark(e, d.id)}
                      className={`absolute bottom-3 right-3 p-1.5 rounded-full transition-colors cursor-pointer border-0 ${
                        isSaved ? 'bg-blue-100 text-[#2563EB]' : 'bg-white/80 text-[#9CA3AF] hover:text-[#2563EB] hover:bg-blue-50'
                      }`}
                    >
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-sm text-[#9CA3AF]">
                      <Clock className="w-3 h-3" />
                      {daysAgo(d.publishedAt || d.createdAt)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-4 py-3.5">
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0">
                        <h3 className="text-[0.88rem] font-medium text-[#111827] truncate group-hover:text-[#2563EB] transition-colors">
                          {d.address}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-[#9CA3AF]">
                          <MapPin className="w-3 h-3" />
                          {d.city}, {d.state}
                        </div>
                      </div>
                    </div>

                    {/* Beds/Baths/Sqft row */}
                    {(d.beds || d.baths || d.sqft) && (
                      <div className="flex items-center gap-3 mt-2 text-[0.76rem] text-[#6B7280]">
                        {d.beds !== null && (
                          <span className="flex items-center gap-1">
                            <BedDouble className="w-3.5 h-3.5 text-[#9CA3AF]" />
                            {d.beds} bd
                          </span>
                        )}
                        {d.baths !== null && (
                          <span className="flex items-center gap-1">
                            <Bath className="w-3.5 h-3.5 text-[#9CA3AF]" />
                            {d.baths} ba
                          </span>
                        )}
                        {d.sqft !== null && (
                          <span className="flex items-center gap-1">
                            <Ruler className="w-3.5 h-3.5 text-[#9CA3AF]" />
                            {d.sqft.toLocaleString()} sqft
                          </span>
                        )}
                      </div>
                    )}

                    {/* Financials */}
                    <div className="grid grid-cols-3 gap-2 mt-2.5 mb-3">
                      <div>
                        <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em]">Asking</div>
                        <div className="text-[0.88rem] font-semibold text-[#111827]">
                          ${d.askingPrice.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em]">ARV</div>
                        <div className="text-[0.88rem] font-medium text-[#374151]">
                          {d.arv ? `$${d.arv.toLocaleString()}` : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em]">Est. Profit</div>
                        <div className="text-[0.88rem] font-semibold text-[#2563EB]">
                          {profit ? `$${profit.toLocaleString()}` : '—'}
                        </div>
                      </div>
                    </div>

                    {/* Seller + stats */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-[#F3F4F6]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0B1224] flex items-center justify-center">
                          <span className="text-[0.6rem] font-semibold text-white">{wholesalerInitials(d.profile)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.76rem] text-[#374151] flex items-center gap-1">
                            {wholesalerDisplay(d.profile)}
                            {d.profile.verified && <VerifiedBadge />}
                            {d.profile.company && <span className="text-[#9CA3AF]"> · {d.profile.company}</span>}
                          </span>
                          <div className="flex items-center gap-2">
                            <ReputationStars score={d.profile.reputationScore ?? 0} count={d.profile.reviewCount ?? 0} />
                            {(d.profile.dealCount ?? 0) > 1 && (
                              <span className="text-[0.66rem] font-medium text-[#9CA3AF]">
                                {d.profile.dealCount} deals
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[0.72rem] text-[#9CA3AF]">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {d.viewCount}</span>
                        <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {d.inquiryCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load more */}
          {!showSavedOnly && listings.length < total && (
            <div className="text-center mt-6">
              <button
                onClick={() => fetchListings(true)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-[rgba(5,14,36,0.15)] rounded-[8px] text-[0.82rem] font-medium text-[#374151] hover:bg-[#F9FAFB] cursor-pointer transition-colors disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {loadingMore ? 'Loading...' : `Load more (${listings.length} of ${total})`}
              </button>
            </div>
          )}
        </>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   LISTING DETAIL VIEW
   ═══════════════════════════════════════════════ */
function ListingDetail({
  listing: l,
  onBack,
  allListings,
  bookmarks,
  onToggleBookmark,
}: {
  listing: Listing
  onBack: () => void
  allListings: Listing[]
  bookmarks: string[]
  onToggleBookmark: (e: React.MouseEvent, id: string) => void
}) {
  const toast = useToast()
  const [showInquiryForm, setShowInquiryForm] = useState(false)
  const [inquiryMessage, setInquiryMessage] = useState('')
  const [sending, setSending] = useState(false)

  const grade = scoreGrade(l.confidenceScore)
  const profit = estProfit(l)
  const spread = l.arv && l.askingPrice ? l.arv - l.askingPrice : null
  const isFresh = daysSince(l.publishedAt || l.createdAt) <= 3
  const isSaved = bookmarks.includes(l.id)

  // Similar listings: same state or property type, excluding current
  const similarListings = useMemo(() => {
    return allListings
      .filter(o => o.id !== l.id && (o.state === l.state || o.propertyType === l.propertyType))
      .slice(0, 3)
  }, [allListings, l.id, l.state, l.propertyType])

  const handleInquiry = async () => {
    if (!inquiryMessage.trim()) {
      toast.warning('Please enter a message')
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/marketplace/listings/${l.id}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inquiryMessage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send inquiry')
      toast.success('Inquiry sent! The wholesaler will be in touch.')
      setShowInquiryForm(false)
      setInquiryMessage('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send inquiry')
    } finally {
      setSending(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-[0.82rem] text-[#6B7280] hover:text-[#374151] mb-4 bg-transparent border-0 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Listings
      </button>

      {/* Header */}
      <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-6 py-5 mb-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[24px] font-bold text-[#0B1224]" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", letterSpacing: '-0.02em' }}>
                {l.headline || l.address}
              </h2>
              {isFresh && (
                <span className="flex items-center gap-1 text-[0.66rem] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
                  <Sparkles className="w-3 h-3" /> Fresh
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[0.82rem] text-[#9CA3AF]">
              <MapPin className="w-3.5 h-3.5" />
              {l.address}, {l.city}, {l.state} {l.zip}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={e => onToggleBookmark(e, l.id)}
              className={`p-2 rounded-md border cursor-pointer transition-colors ${
                isSaved ? 'bg-blue-50 text-[#2563EB] border-blue-200' : 'bg-white text-[#9CA3AF] border-[#D1D5DB] hover:text-[#2563EB]'
              }`}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-md border border-[#D1D5DB] bg-white text-[#9CA3AF] hover:text-[#374151] cursor-pointer transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {grade !== '—' && (
              <span className={`text-[0.82rem] font-bold px-3 py-1.5 rounded-[8px] border ${scoreStyle(grade)}`}>
                Deal Score: {grade}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-[0.68rem] font-medium bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded-full">{l.propertyType}</span>
          {l.condition && <span className="text-[0.68rem] font-medium bg-[#F3F4F6] text-[#9CA3AF] px-2 py-0.5 rounded-full">{l.condition}</span>}
          <span className="text-[0.72rem] text-[#9CA3AF]">{daysAgo(l.publishedAt || l.createdAt)}</span>
          <span className="text-[0.72rem] text-[#9CA3AF] flex items-center gap-0.5"><Eye className="w-3 h-3" /> {l.viewCount} views</span>
        </div>
      </div>

      {/* Deal Analysis Grid (2x3) */}
      <div className="grid grid-cols-3 gap-3 mb-5 mp-analysis-grid">
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-3 text-center">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-1">Asking Price</div>
          <div className="text-[1.05rem] font-semibold text-[#111827]">${l.askingPrice.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-3 text-center">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-1">ARV</div>
          <div className="text-[1.05rem] font-semibold text-[#374151]">{l.arv ? `$${l.arv.toLocaleString()}` : '—'}</div>
        </div>
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-3 text-center">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-1">Est. Repairs</div>
          <div className="text-[1.05rem] font-semibold text-[#374151]">{l.repairCost ? `$${l.repairCost.toLocaleString()}` : '—'}</div>
        </div>
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-3 text-center">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-1">Spread</div>
          <div className="text-[1.05rem] font-semibold text-[#374151]">{spread ? `$${spread.toLocaleString()}` : '—'}</div>
        </div>
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-3 text-center">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-1">Est. Flip Profit</div>
          <div className="text-[1.05rem] font-semibold text-[#2563EB]">{profit ? `$${profit.toLocaleString()}` : '—'}</div>
        </div>
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-3 text-center">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-1">Rental Cash Flow</div>
          <div className="text-[1.05rem] font-semibold text-[#374151]">{l.rentalCashFlow ? `$${l.rentalCashFlow.toLocaleString()}/mo` : '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 mp-detail-grid">
        {/* Property details */}
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-3">Property Details</div>
          <div className="space-y-2">
            {l.beds !== null && <div className="flex justify-between text-[0.78rem]"><span className="text-[#9CA3AF]">Beds</span><span className="text-[#374151]">{l.beds}</span></div>}
            {l.baths !== null && <div className="flex justify-between text-[0.78rem]"><span className="text-[#9CA3AF]">Baths</span><span className="text-[#374151]">{l.baths}</span></div>}
            {l.sqft !== null && <div className="flex justify-between text-[0.78rem]"><span className="text-[#9CA3AF]">Sq Ft</span><span className="text-[#374151]">{l.sqft.toLocaleString()}</span></div>}
            {l.yearBuilt !== null && <div className="flex justify-between text-[0.78rem]"><span className="text-[#9CA3AF]">Year Built</span><span className="text-[#374151]">{l.yearBuilt}</span></div>}
            {l.condition && <div className="flex justify-between text-[0.78rem]"><span className="text-[#9CA3AF]">Condition</span><span className="text-[#374151]">{l.condition}</span></div>}
          </div>
        </div>

        {/* Wholesaler info */}
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-3">Listed By</div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#0B1224] flex items-center justify-center">
              <span className="text-[0.6rem] font-semibold text-white">{wholesalerInitials(l.profile)}</span>
            </div>
            <div>
              <div className="text-[0.88rem] font-medium text-[#374151] flex items-center gap-1">
                {wholesalerDisplay(l.profile)}
                {l.profile.verified && <VerifiedBadge />}
              </div>
              {l.profile.company && <div className="text-[0.76rem] text-[#9CA3AF]">{l.profile.company}</div>}
              <ReputationStars score={l.profile.reputationScore ?? 0} count={l.profile.reviewCount ?? 0} />
            </div>
          </div>
          <div className="space-y-1.5">
            {(l.profile.dealCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-[0.78rem] text-[#6B7280] bg-[#F9FAFB] rounded-md px-3 py-2">
                <Store className="w-3.5 h-3.5 text-[#9CA3AF]" />
                {l.profile.dealCount} deals on platform
              </div>
            )}
            {(l.profile.completedDeals ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-[0.78rem] text-[#6B7280] bg-[#F9FAFB] rounded-md px-3 py-2">
                <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                {l.profile.completedDeals} completed transactions
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {l.description && (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4 mb-5">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-2">Description</div>
          <p className="text-[0.82rem] text-[#374151] leading-relaxed">{l.description}</p>
        </div>
      )}

      {/* CTA */}
      <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4 mb-5">
        <div className="flex items-center justify-between">
          <div className="text-[0.88rem] font-medium text-[#374151]">Interested in this deal?</div>
          {!showInquiryForm && (
            <button
              onClick={() => setShowInquiryForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] text-[0.82rem] font-medium cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" /> I&apos;m Interested
            </button>
          )}
        </div>

        {showInquiryForm && (
          <div className="mt-4 pt-4 border-t border-[#F3F4F6]">
            <textarea
              value={inquiryMessage}
              onChange={e => setInquiryMessage(e.target.value)}
              placeholder="Hi, I'm interested in this deal. Please share more details..."
              rows={3}
              className="w-full bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-2.5 text-[0.82rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors resize-none mb-3"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowInquiryForm(false)}
                className="px-4 py-2 text-[0.82rem] font-medium text-[#6B7280] bg-transparent border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleInquiry}
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white border-0 rounded-[8px] text-[0.82rem] font-medium cursor-pointer transition-colors"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                {sending ? 'Sending...' : 'Send Inquiry'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Similar Listings */}
      {similarListings.length > 0 && (
        <div className="mb-5">
          <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-3">Similar Listings</div>
          <div className="grid grid-cols-3 gap-3 mp-similar-grid">
            {similarListings.map(s => {
              const sProfit = estProfit(s)
              return (
                <div
                  key={s.id}
                  onClick={() => { onBack(); setTimeout(() => {}, 0) }}
                  className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-3 cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(5,14,36,0.06)]"
                >
                  <div className="text-[0.82rem] font-medium text-[#111827] truncate">{s.address}</div>
                  <div className="text-[0.76rem] text-[#9CA3AF] mb-2">{s.city}, {s.state}</div>
                  <div className="flex items-center gap-3 text-[0.78rem]">
                    <span className="text-[#374151] font-semibold">${s.askingPrice.toLocaleString()}</span>
                    {sProfit && <span className="text-[#2563EB]">${sProfit.toLocaleString()} profit</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .mp-detail-grid { grid-template-columns: 1fr !important; }
          .mp-analysis-grid { grid-template-columns: 1fr 1fr !important; }
          .mp-similar-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════
   BUYER BOARD TYPES
   ═══════════════════════════════════════════════ */
interface BuyerBoardPost {
  id: string
  displayName: string
  buyerType: string | null
  propertyTypes: string[]
  markets: string[]
  strategy: string | null
  minPrice: number | null
  maxPrice: number | null
  closeSpeedDays: number | null
  proofOfFunds: boolean
  description: string | null
  status: string
  viewCount: number
  contactCount: number
  createdAt: string
  expiresAt: string | null
  isOwner: boolean
  profile: { firstName: string | null; lastInitial: string | null; company: string | null; verified?: boolean; reputationScore?: number; reviewCount?: number }
  _count: { contacts: number }
}

interface BuyerBoardContactRow {
  id: string
  message: string | null
  status: string
  createdAt: string
  profile: { firstName: string | null; lastName: string | null; company: string | null; email: string | null }
}

interface BuyerOption { id: string; firstName: string | null; lastName: string | null; entityName: string | null }

const BUYER_TYPE_STYLES: Record<string, string> = {
  individual: 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]',
  llc: 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]',
  trust: 'text-purple-700 bg-purple-50',
  partnership: 'text-amber-700 bg-amber-50',
  corporation: 'text-pink-700 bg-pink-50',
}

const BUYER_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  llc: 'LLC',
  trust: 'Trust',
  partnership: 'Partnership',
  corporation: 'Corporation',
}

const STRATEGY_LABELS: Record<string, string> = {
  fix_and_flip: 'Fix & Flip',
  buy_and_hold: 'Buy & Hold',
  wholesale: 'Wholesale',
  novation: 'Novation',
  subject_to: 'Subject To',
  creative_finance: 'Creative Finance',
}

const PROP_TYPE_LABELS: Record<string, string> = {
  SFR: 'SFR', MULTI_FAMILY: 'Multi-Family', LAND: 'Land',
  COMMERCIAL: 'Commercial', CONDO: 'Condo', MOBILE_HOME: 'Mobile Home',
}

function formatBudgetRange(min: number | null, max: number | null): string {
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n.toLocaleString()}`
  if (min && max) return `${fmt(min)} to ${fmt(max)}`
  if (max) return `Under ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return 'Any budget'
}

function bbDaysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return '1d ago'
  return `${diff}d ago`
}

function bbInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
}

/* ═══════════════════════════════════════════════
   BUYER BOARD — CONTACT FORM
   ═══════════════════════════════════════════════ */
function ContactPostDialog({
  post,
  onClose,
  onSent,
}: {
  post: BuyerBoardPost
  onClose: () => void
  onSent: () => void
}) {
  const toast = useToast()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/marketplace/buyer-board/${post.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send message')
        return
      }
      toast.success('Message sent successfully')
      onSent()
      onClose()
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[rgba(5,14,36,0.06)] w-full max-w-md mx-4 animate-fadeInUp" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <h3 className="text-[1rem] font-medium text-[#111827]">Contact About {post.displayName}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#F3F4F6] bg-transparent border-0 cursor-pointer">
            <X className="w-4 h-4 text-[#9CA3AF]" />
          </button>
        </div>
        <div className="px-6 py-4">
          <div className="bg-[#F9FAFB] rounded-[8px] px-4 py-3 mb-4 text-[0.78rem] text-[#6B7280]">
            <strong className="text-[#374151]">{post.displayName}</strong> is looking for{' '}
            {post.propertyTypes.map(t => PROP_TYPE_LABELS[t] || t).join(', ')} in {post.markets.join(', ')}
            {post.maxPrice ? ` under ${formatBudgetRange(null, post.maxPrice)}` : ''}.
          </div>
          <label className="block text-[0.78rem] font-medium text-[#374151] mb-1.5">Your message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tell them about the deal you have that matches their buyer's criteria..."
            rows={4}
            className="w-full bg-white border border-[#D1D5DB] rounded-[8px] px-4 py-2.5 text-[0.82rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors resize-none"
          />
        </div>
        <div className="px-6 py-4 border-t border-[#E5E7EB] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-[8px] text-[0.82rem] font-medium text-[#374151] bg-white border border-[rgba(5,14,36,0.15)] hover:bg-[#F9FAFB] cursor-pointer transition-colors">Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[0.82rem] font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] border-0 cursor-pointer transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Message
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   BUYER BOARD — CREATE POST MODAL
   ═══════════════════════════════════════════════ */
function CreateBuyerPostModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const toast = useToast()
  const [displayName, setDisplayName] = useState('')
  const [buyerType, setBuyerType] = useState('')
  const [propertyTypes, setPropertyTypes] = useState<string[]>([])
  const [marketInput, setMarketInput] = useState('')
  const [markets, setMarkets] = useState<string[]>([])
  const [strategy, setStrategy] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [closeSpeedDays, setCloseSpeedDays] = useState('')
  const [proofOfFunds, setProofOfFunds] = useState(false)
  const [description, setDescription] = useState('')
  const [buyerId, setBuyerId] = useState('')
  const [crmBuyers, setCrmBuyers] = useState<BuyerOption[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/crm/buyers?limit=200')
      .then(r => r.json())
      .then(data => setCrmBuyers(data.buyers || []))
      .catch(() => {})
  }, [])

  const addMarket = () => {
    const trimmed = marketInput.trim()
    if (trimmed && !markets.includes(trimmed)) {
      setMarkets(prev => [...prev, trimmed])
      setMarketInput('')
    }
  }

  const togglePropType = (t: string) => {
    setPropertyTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const handleSubmit = async () => {
    if (!displayName.trim()) { toast.warning('Display name is required'); return }
    if (propertyTypes.length === 0) { toast.warning('Select at least one property type'); return }
    if (markets.length === 0) { toast.warning('Add at least one market'); return }

    setCreating(true)
    try {
      const res = await fetch('/api/marketplace/buyer-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          buyerType: buyerType || undefined,
          propertyTypes,
          markets,
          strategy: strategy || undefined,
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
          closeSpeedDays: closeSpeedDays ? parseInt(closeSpeedDays) : undefined,
          proofOfFunds,
          description: description.trim() || undefined,
          buyerId: buyerId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to create post'); return }
      toast.success('Buyer posted to the board')
      onCreated()
      onClose()
    } catch {
      toast.error('Failed to create post')
    } finally {
      setCreating(false)
    }
  }

  const inputCls = "w-full bg-white border border-[#D1D5DB] rounded-[8px] px-4 py-2.5 text-[0.82rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors"
  const labelCls = "block text-[0.78rem] font-medium text-[#374151] mb-1.5"

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[rgba(5,14,36,0.06)] w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto animate-fadeInUp" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-[1rem] font-medium text-[#111827]">Post a Buyer</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#F3F4F6] bg-transparent border-0 cursor-pointer">
            <X className="w-4 h-4 text-[#9CA3AF]" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Display Name */}
          <div>
            <label className={labelCls}>Display Name *</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Marcus T." className={inputCls} />
            <p className="text-[0.72rem] text-[#9CA3AF] mt-1">Keep your buyer&apos;s identity private. Use first name + last initial.</p>
          </div>

          {/* Buyer Type */}
          <div>
            <label className={labelCls}>Buyer Type</label>
            <div className="relative">
              <select value={buyerType} onChange={e => setBuyerType(e.target.value)} className={`${inputCls} appearance-none pr-8 cursor-pointer`}>
                <option value="">Select type...</option>
                <option value="individual">Individual</option>
                <option value="llc">LLC</option>
                <option value="trust">Trust</option>
                <option value="partnership">Partnership</option>
                <option value="corporation">Corporation</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

          {/* Property Types */}
          <div>
            <label className={labelCls}>Property Types *</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PROP_TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePropType(key)}
                  className={`px-3 py-1.5 rounded-md text-[0.78rem] font-medium border cursor-pointer transition-colors ${
                    propertyTypes.includes(key)
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Markets */}
          <div>
            <label className={labelCls}>Markets *</label>
            <div className="flex gap-2">
              <input
                value={marketInput}
                onChange={e => setMarketInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMarket() } }}
                placeholder="Type a city, state (e.g. Atlanta, GA)"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={addMarket}
                className="px-3 py-2 rounded-md text-[0.82rem] font-medium bg-white text-[#374151] border border-[rgba(5,14,36,0.15)] hover:bg-[#F9FAFB] cursor-pointer transition-colors flex-shrink-0"
              >
                Add
              </button>
            </div>
            {markets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {markets.map(m => (
                  <span key={m} className="flex items-center gap-1 px-2.5 py-1 bg-[#F3F4F6] rounded-full text-[0.72rem] text-[#374151]">
                    {m}
                    <button type="button" onClick={() => setMarkets(prev => prev.filter(x => x !== m))} className="bg-transparent border-0 p-0 cursor-pointer">
                      <X className="w-3 h-3 text-[#9CA3AF] hover:text-[#374151]" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Strategy */}
          <div>
            <label className={labelCls}>Strategy</label>
            <div className="flex gap-2">
              {([
                ['fix_and_flip', 'Fix & Flip'],
                ['buy_and_hold', 'Buy & Hold'],
                ['wholesale', 'Wholesale'],
                ['novation', 'Novation'],
                ['subject_to', 'Subject To'],
                ['creative_finance', 'Creative Finance'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStrategy(strategy === value ? '' : value)}
                  className={`flex-1 px-3 py-2 rounded-md text-[0.78rem] font-medium border cursor-pointer transition-colors ${
                    strategy === value
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Min Budget</label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="100000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Budget</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="250000" className={inputCls} />
            </div>
          </div>

          {/* Close Speed */}
          <div>
            <label className={labelCls}>Close Speed (days)</label>
            <input type="number" value={closeSpeedDays} onChange={e => setCloseSpeedDays(e.target.value)} placeholder="14" className={inputCls} />
          </div>

          {/* Proof of Funds */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setProofOfFunds(!proofOfFunds)}
              className="bg-transparent border-0 p-0 cursor-pointer"
            >
              {proofOfFunds
                ? <CheckSquare className="w-5 h-5 text-[#2563EB]" />
                : <Square className="w-5 h-5 text-[#D1D5DB]" />
              }
            </button>
            <span className="text-[0.82rem] text-[#374151]">Proof of Funds verified</span>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell other wholesalers about this buyer..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Link to CRM buyer */}
          {crmBuyers.length > 0 && (
            <div>
              <label className={labelCls}>Link to CRM Buyer (private)</label>
              <div className="relative">
                <select value={buyerId} onChange={e => setBuyerId(e.target.value)} className={`${inputCls} appearance-none pr-8 cursor-pointer`}>
                  <option value="">None (not linked)</option>
                  {crmBuyers.map(b => (
                    <option key={b.id} value={b.id}>
                      {[b.firstName, b.lastName].filter(Boolean).join(' ') || b.entityName || b.id}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
              </div>
              <p className="text-[0.72rem] text-[#9CA3AF] mt-1">For your reference only. Never shown publicly.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E5E7EB] flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-[8px] text-[0.82rem] font-medium text-[#374151] bg-white border border-[rgba(5,14,36,0.15)] hover:bg-[#F9FAFB] cursor-pointer transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[0.82rem] font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] border-0 cursor-pointer transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Post to Buyer Board
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   BUYER BOARD — MY POST CONTACTS VIEW
   ═══════════════════════════════════════════════ */
function MyPostContacts({
  postId,
  onClose,
}: {
  postId: string
  onClose: () => void
}) {
  const toast = useToast()
  const [contacts, setContacts] = useState<BuyerBoardContactRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/marketplace/buyer-board/${postId}/contact`)
      .then(r => r.json())
      .then(data => setContacts(data.contacts || []))
      .catch(() => toast.error('Failed to load contacts'))
      .finally(() => setLoading(false))
  }, [postId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[rgba(5,14,36,0.06)] w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto animate-fadeInUp" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-[1rem] font-medium text-[#111827]">Contacts Received</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#F3F4F6] bg-transparent border-0 cursor-pointer">
            <X className="w-4 h-4 text-[#9CA3AF]" />
          </button>
        </div>
        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="w-5 h-5 text-[#9CA3AF] mx-auto animate-spin" /></div>
          ) : contacts.length === 0 ? (
            <p className="text-[0.82rem] text-[#9CA3AF] text-center py-6">No contacts yet.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map(c => (
                <div key={c.id} className="bg-[#F9FAFB] border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[0.82rem] font-medium text-[#111827]">
                      {[c.profile.firstName, c.profile.lastName].filter(Boolean).join(' ') || 'Wholesaler'}
                      {c.profile.company && <span className="text-[#9CA3AF] font-normal ml-1.5">· {c.profile.company}</span>}
                    </div>
                    <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${
                      c.status === 'NEW' ? 'text-[#60A5FA] bg-[rgba(96,165,250,0.1)]' :
                      c.status === 'RESPONDED' ? 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]' :
                      'text-[rgba(5,14,36,0.5)] bg-[rgba(5,14,36,0.04)]'
                    }`}>{c.status}</span>
                  </div>
                  {c.message && <p className="text-[0.78rem] text-[#374151] mb-2 leading-relaxed">{c.message}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-[0.72rem] text-[#9CA3AF]">{bbDaysAgo(c.createdAt)}</span>
                    {c.profile.email && (
                      <a href={`mailto:${c.profile.email}`} className="text-[0.72rem] text-[#2563EB] hover:underline flex items-center gap-1">
                        <Send className="w-3 h-3" /> Reply
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   BUYER BOARD SECTION
   ═══════════════════════════════════════════════ */
function BuyerBoardSection() {
  const toast = useToast()
  const [posts, setPosts] = useState<BuyerBoardPost[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [contactTarget, setContactTarget] = useState<BuyerBoardPost | null>(null)
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set())
  const [viewContactsPostId, setViewContactsPostId] = useState<string | null>(null)

  // Filters
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all')
  const [marketSearch, setMarketSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [strategyFilter, setStrategyFilter] = useState('')
  const [pofOnly, setPofOnly] = useState(false)
  const [sort, setSort] = useState('newest')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchPosts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (viewMode === 'mine') params.set('myPosts', 'true')
    if (marketSearch) params.set('market', marketSearch)
    if (typeFilter) params.set('propertyType', typeFilter)
    if (minBudget) params.set('minBudget', minBudget)
    if (maxBudget) params.set('maxBudget', maxBudget)
    if (strategyFilter) params.set('strategy', strategyFilter)
    if (pofOnly) params.set('proofOfFunds', 'true')
    params.set('sort', sort)
    params.set('limit', '40')

    fetch(`/api/marketplace/buyer-board?${params}`)
      .then(r => r.json())
      .then(data => { setPosts(data.posts || []); setTotal(data.total || 0) })
      .catch(() => toast.error('Failed to load buyer board'))
      .finally(() => setLoading(false))
  }, [viewMode, marketSearch, typeFilter, minBudget, maxBudget, strategyFilter, pofOnly, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchPosts, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [fetchPosts])

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/marketplace/buyer-board/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) { const d = await res.json(); toast(d.error || 'Failed'); return }
      toast(`Post ${newStatus.toLowerCase()}`)
      fetchPosts()
    } catch {
      toast.error('Failed to update post')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this buyer board post?')) return
    try {
      const res = await fetch(`/api/marketplace/buyer-board/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); toast(d.error || 'Failed'); return }
      toast.success('Post deleted')
      fetchPosts()
    } catch {
      toast.error('Failed to delete post')
    }
  }

  const selectCls = "appearance-none bg-white border border-[#D1D5DB] rounded-md pl-3 pr-8 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors cursor-pointer"

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[0.82rem] text-[#374151]">
          {viewMode === 'all'
            ? 'Active buy box criteria posted by wholesalers for their verified buyers.'
            : 'Manage your buyer board posts and view contacts received.'}
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> Post a Buyer
        </button>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-0 mb-4">
        {(['all', 'mine'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 text-[0.78rem] font-medium border cursor-pointer transition-colors ${
              viewMode === mode
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]'
            } ${mode === 'all' ? 'rounded-l-md' : 'rounded-r-md border-l-0'}`}
          >
            {mode === 'all' ? 'All Posts' : 'My Posts'}
          </button>
        ))}
        <span className="text-[0.72rem] text-[#9CA3AF] ml-3">{total} post{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mr-1">
          <Filter className="w-3.5 h-3.5" />
          Filters:
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            value={marketSearch}
            onChange={e => setMarketSearch(e.target.value)}
            placeholder="Market..."
            className="bg-white border border-[#D1D5DB] rounded-md pl-8 pr-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors w-[140px]"
          />
        </div>
        <div className="relative">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
            <option value="">All Types</option>
            <option value="SFR">SFR</option>
            <option value="MULTI_FAMILY">Multi-Family</option>
            <option value="LAND">Land</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="CONDO">Condo</option>
            <option value="MOBILE_HOME">Mobile Home</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
        </div>
        <input
          type="number"
          value={minBudget}
          onChange={e => setMinBudget(e.target.value)}
          placeholder="Min $"
          className="bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors w-[90px]"
        />
        <span className="text-[#9CA3AF] text-sm">–</span>
        <input
          type="number"
          value={maxBudget}
          onChange={e => setMaxBudget(e.target.value)}
          placeholder="Max $"
          className="bg-white border border-[#D1D5DB] rounded-md px-3 py-2 text-[0.8rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors w-[90px]"
        />
        <div className="relative">
          <select value={strategyFilter} onChange={e => setStrategyFilter(e.target.value)} className={selectCls}>
            <option value="">Any Strategy</option>
            <option value="fix_and_flip">Fix &amp; Flip</option>
            <option value="buy_and_hold">Buy &amp; Hold</option>
            <option value="wholesale">Wholesale</option>
            <option value="novation">Novation</option>
            <option value="subject_to">Subject To</option>
            <option value="creative_finance">Creative Finance</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
        </div>
        <button
          onClick={() => setPofOnly(!pofOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-[0.78rem] font-medium border cursor-pointer transition-colors ${
            pofOnly
              ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border-[#BFDBFE]'
              : 'bg-white text-[#6B7280] border-[#D1D5DB] hover:bg-[#F9FAFB]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          POF Only
        </button>
        <div className="ml-auto relative">
          <select value={sort} onChange={e => setSort(e.target.value)} className={selectCls}>
            <option value="newest">Newest</option>
            <option value="budget_desc">Highest Budget</option>
            <option value="fastest_close">Fastest Close</option>
          </select>
          <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF] pointer-events-none" />
        </div>
      </div>

      {/* Posts grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 mp-buyer-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4 animate-pulse">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#F3F4F6]" />
                <div className="h-4 bg-[#F3F4F6] rounded w-24" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-[#F3F4F6] rounded w-32" />
                <div className="h-3 bg-[#F3F4F6] rounded w-40" />
                <div className="h-3 bg-[#F3F4F6] rounded w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-12 text-center">
          <ClipboardList className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
          {viewMode === 'mine' ? (
            <>
              <p className="text-[0.82rem] text-[#9CA3AF] mb-3">You haven&apos;t posted any buyers yet.</p>
              <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 mx-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors">
                <Plus className="w-4 h-4" /> Post Your First Buyer
              </button>
            </>
          ) : (marketSearch || typeFilter || minBudget || maxBudget || strategyFilter || pofOnly) ? (
            <p className="text-[0.82rem] text-[#9CA3AF]">No buyer profiles match your filters. Try adjusting your criteria.</p>
          ) : (
            <>
              <p className="text-[0.9rem] text-[#6B7280] mb-1">No buyer profiles posted yet</p>
              <p className="text-[0.78rem] text-[#9CA3AF] mb-3">Share your buyers&apos; criteria to find matching deals.</p>
              <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 mx-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors">
                <Plus className="w-4 h-4" /> Post a Buyer
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mp-buyer-grid">
          {posts.map(p => {
            const isContacted = contactedIds.has(p.id)
            const stratLabel = p.strategy ? (STRATEGY_LABELS[p.strategy] || p.strategy) : null
            const posterName = [p.profile.firstName, p.profile.lastInitial].filter(Boolean).join(' ') || 'Wholesaler'

            return (
              <div key={p.id} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4 transition-shadow hover:shadow-[0_2px_8px_rgba(5,14,36,0.06)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0B1224] flex items-center justify-center flex-shrink-0">
                      <span className="text-[0.52rem] font-semibold text-white">{bbInitials(p.displayName)}</span>
                    </div>
                    <div>
                      <div className="text-[0.82rem] font-medium text-[#111827] flex items-center gap-1">
                        {p.displayName}
                        {p.profile.verified && <VerifiedBadge size={12} />}
                      </div>
                      {p.buyerType && (
                        <span className={`text-[0.64rem] font-medium px-1.5 py-0.5 rounded-full ${BUYER_TYPE_STYLES[p.buyerType] || 'text-[#6B7280] bg-gray-100'}`}>
                          {BUYER_TYPE_LABELS[p.buyerType] || p.buyerType}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.proofOfFunds && (
                      <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full text-[#2563EB] bg-[rgba(37,99,235,0.08)] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> POF
                      </span>
                    )}
                    {p.isOwner && (
                      <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full text-blue-700 bg-blue-50">Your Post</span>
                    )}
                    {viewMode === 'mine' && p.status !== 'ACTIVE' && (
                      <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${
                        p.status === 'PAUSED' ? 'text-amber-700 bg-amber-50' : 'text-[#6B7280] bg-gray-100'
                      }`}>{p.status}</span>
                    )}
                  </div>
                </div>

                {/* Property type pills */}
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {p.propertyTypes.map(t => (
                    <span key={t} className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full text-[#374151] bg-[#F3F4F6]">
                      {PROP_TYPE_LABELS[t] || t}
                    </span>
                  ))}
                </div>

                {/* Buy box info */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-[0.78rem]">
                    <MapPin className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" />
                    <span className="text-[#374151] truncate">{p.markets.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[0.78rem]">
                    <span className="text-[#9CA3AF] font-medium w-3.5 text-center flex-shrink-0">$</span>
                    <span className="text-[#374151]">{formatBudgetRange(p.minPrice, p.maxPrice)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[0.78rem]">
                    {stratLabel && (
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#9CA3AF]" />
                        <span className="text-[#374151]">{stratLabel}</span>
                      </span>
                    )}
                    {p.closeSpeedDays && (
                      <>
                        {stratLabel && <span className="text-[#D1D5DB]">·</span>}
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                          <span className="text-[#374151]">{p.closeSpeedDays}d close</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Description preview */}
                {p.description && (
                  <p className="text-[0.75rem] text-[#6B7280] mb-3 leading-relaxed line-clamp-2">{p.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-[0.72rem] text-[#9CA3AF] mb-3">
                  <span>{posterName}{p.profile.company ? ` · ${p.profile.company}` : ''}</span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.viewCount}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {p.contactCount}</span>
                    <span>{bbDaysAgo(p.createdAt)}</span>
                  </span>
                </div>

                {/* Actions */}
                {p.isOwner ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewContactsPostId(p.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[0.8rem] font-medium cursor-pointer transition-colors bg-white text-[#374151] border border-[rgba(5,14,36,0.15)] hover:bg-[#F9FAFB]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Contacts ({p._count.contacts})
                    </button>
                    {p.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleStatusChange(p.id, 'PAUSED')}
                        className="px-3 py-2 rounded-md text-[0.8rem] font-medium cursor-pointer transition-colors bg-white text-amber-600 border border-[#D1D5DB] hover:bg-amber-50"
                        title="Pause"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {p.status === 'PAUSED' && (
                      <button
                        onClick={() => handleStatusChange(p.id, 'ACTIVE')}
                        className="px-3 py-2 rounded-md text-[0.8rem] font-medium cursor-pointer transition-colors bg-white text-[#2563EB] border border-[rgba(5,14,36,0.15)] hover:bg-[rgba(37,99,235,0.08)]"
                        title="Resume"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="px-3 py-2 rounded-md text-[0.8rem] font-medium cursor-pointer transition-colors bg-white text-red-500 border border-[#D1D5DB] hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : isContacted ? (
                  <div className="w-full py-2 rounded-[8px] text-[0.8rem] font-medium text-center text-[#2563EB] bg-[rgba(37,99,235,0.08)] border border-[#BFDBFE] flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Message Sent
                  </div>
                ) : (
                  <button
                    onClick={() => setContactTarget(p)}
                    className="w-full py-2 rounded-[8px] text-[0.8rem] font-medium cursor-pointer transition-colors bg-[#2563EB] text-white border-0 hover:bg-[#1D4ED8]"
                  >
                    I Have a Deal
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateBuyerPostModal onClose={() => setShowCreateModal(false)} onCreated={fetchPosts} />
      )}
      {contactTarget && (
        <ContactPostDialog
          post={contactTarget}
          onClose={() => setContactTarget(null)}
          onSent={() => setContactedIds(prev => { const next = new Set(Array.from(prev)); next.add(contactTarget.id); return next })}
        />
      )}
      {viewContactsPostId && (
        <MyPostContacts postId={viewContactsPostId} onClose={() => setViewContactsPostId(null)} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MY LISTINGS SECTION
   ═══════════════════════════════════════════════ */
function MyListingsSection() {
  const toast = useToast()
  const [listings, setListings] = useState<MyListing[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedInquiries, setExpandedInquiries] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const fetchMyListings = useCallback(() => {
    setLoading(true)
    fetch('/api/marketplace/my-listings')
      .then(r => r.json())
      .then(data => setListings(data.listings || []))
      .catch(() => toast.error('Failed to load your listings'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchMyListings() }, [fetchMyListings])

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/marketplace/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      toast(`Listing ${newStatus === 'ACTIVE' ? 'reactivated' : newStatus === 'PAUSED' ? 'paused' : 'marked as sold'}`)
      fetchMyListings()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update listing')
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this listing from the marketplace?')) return
    try {
      const res = await fetch(`/api/marketplace/listings/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove')
      toast.success('Listing removed')
      fetchMyListings()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to remove listing')
    }
  }

  const handleInquiryStatus = async (inquiryId: string, status: string) => {
    try {
      const res = await fetch(`/api/marketplace/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      toast(`Inquiry marked as ${status.toLowerCase()}`)
      fetchMyListings()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update inquiry')
    }
  }

  const handleRelist = async (item: MyListing) => {
    try {
      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: item.dealId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to relist')
      toast.success('Deal relisted on marketplace!')
      fetchMyListings()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to relist')
    }
  }

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    const activeIds = listings.filter(l => l.status === 'ACTIVE').map(l => l.id)
    if (activeIds.every(id => selected.has(id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(activeIds))
    }
  }

  const handleBulkPause = async () => {
    const ids = Array.from(selected)
    for (const id of ids) {
      await fetch(`/api/marketplace/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAUSED' }),
      })
    }
    toast(`${ids.length} listing(s) paused`)
    setSelected(new Set())
    fetchMyListings()
  }

  const handleBulkRemove = async () => {
    if (!confirm(`Remove ${selected.size} listing(s) from the marketplace?`)) return
    const ids = Array.from(selected)
    for (const id of ids) {
      await fetch(`/api/marketplace/listings/${id}`, { method: 'DELETE' })
    }
    toast(`${ids.length} listing(s) removed`)
    setSelected(new Set())
    fetchMyListings()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4 animate-pulse">
            <div className="h-4 w-64 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-48 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  const activeListings = listings.filter(l => l.status === 'ACTIVE')
  const hasSelectable = activeListings.length > 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 rounded-[8px] px-4 py-2 text-[0.82rem] font-medium cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          List a Deal
        </button>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-20 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(37,99,235,0.08)' }}>
            <Store className="w-7 h-7 text-[#2563EB]" />
          </div>
          <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 600, fontSize: '16px', color: '#0B1224' }} className="mb-1">No listings yet</p>
          <p style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", fontWeight: 400, fontSize: '14px', color: 'rgba(5,14,36,0.5)' }} className="mb-6">List your first deal to start getting inquiries from buyers on the marketplace.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
            className="inline-flex items-center gap-2 px-5 py-2.5 hover:opacity-90 text-white border-0 rounded-[8px] text-[0.84rem] font-medium cursor-pointer transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            List a deal
          </button>
        </div>
      ) : (
        <>
          {/* Bulk select header */}
          {hasSelectable && (
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-[0.78rem] text-[#6B7280] hover:text-[#374151] bg-transparent border-0 cursor-pointer transition-colors"
              >
                {activeListings.every(l => selected.has(l.id)) ? (
                  <CheckSquare className="w-4 h-4 text-[#2563EB]" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Select all active
              </button>
            </div>
          )}

          <div className="space-y-3">
            {listings.map(item => {
              const isExpanded = expandedInquiries === item.id
              const newInquiryCount = item.inquiries.filter(i => i.status === 'NEW').length
              const daysActive = daysSince(item.publishedAt || item.createdAt)
              const conversionRate = item.viewCount > 0
                ? Math.round((item.inquiryCount / item.viewCount) * 100)
                : 0
              const isSelected = selected.has(item.id)
              const canRelist = (item.status === 'SOLD' || item.status === 'EXPIRED') && item.deal.status === 'ACTIVE'

              return (
                <div key={item.id} className={`bg-white border rounded-xl overflow-hidden ${isSelected ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20' : 'border-[rgba(5,14,36,0.06)]'}`}>
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {/* Checkbox for active listings */}
                        {item.status === 'ACTIVE' && (
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className="mt-0.5 bg-transparent border-0 cursor-pointer text-[#9CA3AF] hover:text-[#2563EB] transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#2563EB]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <div>
                          <div className="flex items-center gap-2.5 mb-1">
                            <h3 className="text-[0.88rem] font-medium text-[#111827]">
                              {item.address}, {item.city} {item.state}
                            </h3>
                            <span className={`text-[0.66rem] font-medium px-2 py-0.5 rounded-full ${listingStatusStyle(item.status)}`}>
                              {item.status}
                            </span>
                          </div>
                          {/* Analytics row */}
                          <div className="flex items-center gap-4 text-[0.76rem] text-[#9CA3AF]">
                            <span className="font-medium text-[#374151]">${item.askingPrice.toLocaleString()}</span>
                            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {item.viewCount} views</span>
                            <button
                              onClick={() => setExpandedInquiries(isExpanded ? null : item.id)}
                              className="flex items-center gap-0.5 bg-transparent border-0 cursor-pointer text-[#9CA3AF] hover:text-[#2563EB] transition-colors text-[0.76rem]"
                            >
                              <MessageSquare className="w-3 h-3" /> {item.inquiryCount} inquiries
                              {newInquiryCount > 0 && (
                                <span className="ml-1 bg-blue-500 text-white text-[0.6rem] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                  {newInquiryCount}
                                </span>
                              )}
                              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                            <span className="flex items-center gap-0.5" title="Inquiry conversion rate">
                              <Percent className="w-3 h-3" /> {conversionRate}%
                            </span>
                            <span className="flex items-center gap-0.5" title="Days active">
                              <CalendarDays className="w-3 h-3" /> {daysActive}d
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(item.id, 'PAUSED')}
                              title="Pause"
                              className="p-1.5 rounded-md text-[#9CA3AF] hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer bg-transparent border-0"
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'SOLD')}
                              title="Mark Sold"
                              className="p-1.5 rounded-md text-[#9CA3AF] hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer bg-transparent border-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemove(item.id)}
                              title="Remove"
                              className="p-1.5 rounded-md text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer bg-transparent border-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {item.status === 'PAUSED' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(item.id, 'ACTIVE')}
                              title="Reactivate"
                              className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#2563EB] hover:bg-[rgba(37,99,235,0.08)] transition-colors cursor-pointer bg-transparent border-0"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemove(item.id)}
                              title="Remove"
                              className="p-1.5 rounded-md text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer bg-transparent border-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {canRelist && (
                          <button
                            onClick={() => handleRelist(item)}
                            title="Relist"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[0.76rem] font-medium text-[#2563EB] hover:bg-blue-50 transition-colors cursor-pointer bg-transparent border-0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Relist
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded inquiries */}
                  {isExpanded && item.inquiries.length > 0 && (
                    <div className="border-t border-[#F3F4F6] bg-[#FAFAFA] px-5 py-3">
                      <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-2">Recent Inquiries</div>
                      <div className="space-y-2">
                        {item.inquiries.map(inq => (
                          <div key={inq.id} className={`flex items-start justify-between p-3 rounded-xl ${inq.status === 'NEW' ? 'bg-[rgba(96,165,250,0.06)] border border-[rgba(96,165,250,0.15)]' : 'bg-white border border-[rgba(5,14,36,0.06)]'}`}>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[0.82rem] font-medium text-[#374151]">{inq.buyerName}</span>
                                <span className={`text-[0.64rem] font-medium px-1.5 py-0.5 rounded-full ${inquiryStatusStyle(inq.status)}`}>{inq.status}</span>
                              </div>
                              {inq.message && <p className="text-[0.78rem] text-[#6B7280] truncate">{inq.message}</p>}
                              <span className="text-[0.72rem] text-[#9CA3AF]">{new Date(inq.createdAt).toLocaleDateString()}</span>
                            </div>
                            {inq.status === 'NEW' && (
                              <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                                <button
                                  onClick={() => handleInquiryStatus(inq.id, 'CONTACTED')}
                                  className="text-[0.72rem] font-medium text-[#2563EB] hover:bg-blue-50 px-2 py-1 rounded bg-transparent border-0 cursor-pointer transition-colors"
                                >
                                  Responded
                                </button>
                                <button
                                  onClick={() => handleInquiryStatus(inq.id, 'CLOSED')}
                                  className="text-[0.72rem] font-medium text-[#9CA3AF] hover:bg-gray-100 px-2 py-1 rounded bg-transparent border-0 cursor-pointer transition-colors"
                                >
                                  Dismiss
                                </button>
                              </div>
                            )}
                            {inq.status === 'CONTACTED' && (
                              <button
                                onClick={() => handleInquiryStatus(inq.id, 'CLOSED')}
                                className="text-[0.72rem] font-medium text-[#9CA3AF] hover:bg-gray-100 px-2 py-1 rounded bg-transparent border-0 cursor-pointer transition-colors ml-3 flex-shrink-0"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isExpanded && item.inquiries.length === 0 && (
                    <div className="border-t border-[#F3F4F6] bg-[#FAFAFA] px-5 py-4 text-center">
                      <p className="text-[0.78rem] text-[#9CA3AF]">No inquiries yet</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Floating bulk action bar */}
          {selected.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111827] text-white rounded-[8px] px-5 py-3 shadow-xl flex items-center gap-4 z-40">
              <span className="text-[0.82rem] font-medium">{selected.size} selected</span>
              <div className="w-px h-5 bg-gray-600" />
              <button
                onClick={handleBulkPause}
                className="flex items-center gap-1.5 text-[0.82rem] font-medium text-amber-400 hover:text-amber-300 bg-transparent border-0 cursor-pointer transition-colors"
              >
                <Pause className="w-4 h-4" /> Pause All
              </button>
              <button
                onClick={handleBulkRemove}
                className="flex items-center gap-1.5 text-[0.82rem] font-medium text-red-400 hover:text-red-300 bg-transparent border-0 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Remove All
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-[0.82rem] text-[#9CA3AF] hover:text-white bg-transparent border-0 cursor-pointer transition-colors ml-2"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}

      {showCreateModal && (
        <CreateListingModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchMyListings}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CREATE LISTING MODAL (Advanced)
   ═══════════════════════════════════════════════ */
const STEPS = ['Deal', 'Details', 'Photos', 'Review'] as const
type Step = (typeof STEPS)[number]

function CreateListingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Step state
  const [step, setStep] = useState<Step>('Deal')

  // Deal selection
  const [deals, setDeals] = useState<DealOption[]>([])
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [selectedDealId, setSelectedDealId] = useState('')
  const selectedDeal = deals.find(d => d.id === selectedDealId) || null

  // Inline deal creation mode
  const [createDealMode, setCreateDealMode] = useState(false)
  const [creatingDeal, setCreatingDeal] = useState(false)
  const [newDealAddress, setNewDealAddress] = useState('')
  const [newDealCity, setNewDealCity] = useState('')
  const [newDealState, setNewDealState] = useState('')
  const [newDealZip, setNewDealZip] = useState('')
  const [newDealType, setNewDealType] = useState('SFR')
  const [newDealPrice, setNewDealPrice] = useState('')

  // Listing details
  const [headline, setHeadline] = useState('')
  const [description, setDescription] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [assignFee, setAssignFee] = useState('')
  const [condition, setCondition] = useState('')
  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [sqft, setSqft] = useState('')
  const [yearBuilt, setYearBuilt] = useState('')

  // Photos
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Submit
  const [creating, setCreating] = useState(false)

  // Load deals
  useEffect(() => {
    setLoadingDeals(true)
    Promise.all([
      fetch('/api/deals').then(r => r.json()),
      fetch('/api/marketplace/my-listings').then(r => r.json()),
    ]).then(([dealData, listingData]) => {
      const allDeals: DealOption[] = (dealData.deals || []).map((d: DealOption & Record<string, unknown>) => ({
        id: d.id,
        address: d.address,
        city: d.city,
        state: d.state,
        zip: d.zip,
        askingPrice: d.askingPrice,
        assignFee: d.assignFee ?? null,
        beds: d.beds ?? null,
        baths: d.baths ?? null,
        sqft: d.sqft ?? null,
        yearBuilt: d.yearBuilt ?? null,
        condition: d.condition ?? null,
        propertyType: d.propertyType ?? 'SFR',
        status: d.status,
      }))
      const myListings: MyListing[] = listingData.listings || []
      const activeDealIds = myListings
        .filter((l: MyListing) => l.status === 'ACTIVE' || l.status === 'PAUSED')
        .map((l: MyListing) => l.dealId)
      setDeals(allDeals.filter(d => (d.status === 'ACTIVE' || d.status === 'UNDER_OFFER') && !activeDealIds.includes(d.id)))
    }).catch(() => toast.error('Failed to load deals'))
      .finally(() => setLoadingDeals(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill form from deal data when a deal is selected
  useEffect(() => {
    if (selectedDeal) {
      setAskingPrice(String(selectedDeal.askingPrice))
      setAssignFee(selectedDeal.assignFee ? String(selectedDeal.assignFee) : '')
      setCondition(selectedDeal.condition || '')
      setBeds(selectedDeal.beds !== null ? String(selectedDeal.beds) : '')
      setBaths(selectedDeal.baths !== null ? String(selectedDeal.baths) : '')
      setSqft(selectedDeal.sqft !== null ? String(selectedDeal.sqft) : '')
      setYearBuilt(selectedDeal.yearBuilt !== null ? String(selectedDeal.yearBuilt) : '')
    }
  }, [selectedDealId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Create deal inline and auto-select it
  const handleCreateDealInline = async () => {
    if (!newDealAddress || !newDealCity || !newDealState || !newDealZip || !newDealPrice) {
      toast.warning('Please fill in all required fields')
      return
    }
    setCreatingDeal(true)
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: newDealAddress,
          city: newDealCity,
          state: newDealState.toUpperCase(),
          zip: newDealZip,
          propertyType: newDealType,
          askingPrice: parseInt(newDealPrice, 10),
          force: true, // skip daisy chain warning in this flow
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create deal')

      // Add the new deal to our list and select it
      const newDeal: DealOption = {
        id: data.deal.id,
        address: data.deal.address,
        city: data.deal.city,
        state: data.deal.state,
        zip: data.deal.zip,
        askingPrice: data.deal.askingPrice,
        assignFee: data.deal.assignFee ?? null,
        beds: data.deal.beds ?? null,
        baths: data.deal.baths ?? null,
        sqft: data.deal.sqft ?? null,
        yearBuilt: data.deal.yearBuilt ?? null,
        condition: data.deal.condition ?? null,
        propertyType: data.deal.propertyType ?? 'SFR',
        status: data.deal.status,
      }
      setDeals(prev => [newDeal, ...prev])
      setSelectedDealId(newDeal.id)
      setCreateDealMode(false)
      toast.success('Deal created! Now customize your listing.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create deal')
    } finally {
      setCreatingDeal(false)
    }
  }

  // Photo handling
  const handleFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    const maxSize = 5 * 1024 * 1024

    const valid: File[] = []
    for (const f of fileArr) {
      if (!validTypes.includes(f.type)) {
        toast(`${f.name}: Invalid type. Use JPEG, PNG, or WebP.`)
        continue
      }
      if (f.size > maxSize) {
        toast(`${f.name}: Exceeds 5 MB limit.`)
        continue
      }
      valid.push(f)
    }

    if (photos.length + valid.length > 10) {
      toast.warning('Maximum 10 photos per listing')
      return
    }

    const newPreviews: PhotoPreview[] = valid.map(f => ({
      file: f,
      url: URL.createObjectURL(f),
    }))
    setPhotos(prev => [...prev, ...newPreviews])
  }

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      const copy = [...prev]
      URL.revokeObjectURL(copy[idx].url)
      copy.splice(idx, 1)
      return copy
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  // Upload photos to server, returns URLs
  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return []
    setUploading(true)
    try {
      const formData = new FormData()
      photos.forEach(p => formData.append('photos', p.file))
      const res = await fetch('/api/marketplace/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      return data.urls || []
    } finally {
      setUploading(false)
    }
  }

  const handleCreate = async () => {
    if (!selectedDealId) { toast.warning('Please select a deal'); return }

    setCreating(true)
    try {
      // Upload photos first
      let photoUrls: string[] = []
      if (photos.length > 0) {
        photoUrls = await uploadPhotos()
      }

      const payload: Record<string, unknown> = {
        dealId: selectedDealId,
        headline: headline || undefined,
        description: description || undefined,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      }

      // Only include overrides if user changed them from deal defaults
      if (askingPrice && selectedDeal && parseInt(askingPrice, 10) !== selectedDeal.askingPrice) {
        payload.askingPrice = parseInt(askingPrice, 10)
      }
      if (assignFee) payload.assignFee = parseInt(assignFee, 10)
      if (condition && selectedDeal && condition !== (selectedDeal.condition || '')) payload.condition = condition
      if (beds && selectedDeal && parseInt(beds, 10) !== selectedDeal.beds) payload.beds = parseInt(beds, 10)
      if (baths && selectedDeal && parseFloat(baths) !== selectedDeal.baths) payload.baths = parseFloat(baths)
      if (sqft && selectedDeal && parseInt(sqft, 10) !== selectedDeal.sqft) payload.sqft = parseInt(sqft, 10)
      if (yearBuilt && selectedDeal && parseInt(yearBuilt, 10) !== selectedDeal.yearBuilt) payload.yearBuilt = parseInt(yearBuilt, 10)

      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create listing')
      toast.success('Deal listed on marketplace!')
      onCreated()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create listing')
    } finally {
      setCreating(false)
    }
  }

  const canAdvance = () => {
    switch (step) {
      case 'Deal': return !!selectedDealId && !createDealMode
      case 'Details': return !!askingPrice
      case 'Photos': return true
      case 'Review': return true
    }
  }

  const nextStep = () => {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }
  const prevStep = () => {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  const inputCls = "w-full bg-white border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-2.5 text-[0.82rem] text-[#374151] outline-none focus:border-[#2563EB] transition-colors"
  const labelCls = "block text-[0.78rem] font-medium text-[#374151] mb-1.5"
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[620px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F3F4F6] flex-shrink-0">
          <div>
            <h2 className="text-[24px] font-bold text-[#0B1224]" style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif", letterSpacing: '-0.02em' }}>
              List a Deal
            </h2>
            <p className="text-[0.76rem] text-[#9CA3AF] mt-0.5">Step {stepIdx + 1} of {STEPS.length}: {step}</p>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] bg-transparent border-0 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-3 flex-shrink-0">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1 flex items-center gap-1">
                <div className={`h-1.5 rounded-full flex-1 transition-colors ${
                  i <= stepIdx ? 'bg-[#2563EB]' : 'bg-[#E5E7EB]'
                }`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {STEPS.map((s, i) => (
              <span key={s} className={`text-[0.66rem] font-medium ${i <= stepIdx ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Body (scrollable) */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* ── Step 1: Deal Selection ── */}
          {step === 'Deal' && (
            <div className="space-y-4">
              {!createDealMode ? (
                <>
                  <div>
                    <label className={labelCls}>Select a Deal *</label>
                    {loadingDeals ? (
                      <div className="flex items-center gap-2 text-[0.82rem] text-[#9CA3AF] py-3">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading deals...
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <select
                            value={selectedDealId}
                            onChange={e => setSelectedDealId(e.target.value)}
                            className={`${inputCls} appearance-none cursor-pointer`}
                          >
                            <option value="">Select a deal to list...</option>
                            {deals.map(d => (
                              <option key={d.id} value={d.id}>
                                {d.address}, {d.city} {d.state} | ${d.askingPrice.toLocaleString()}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                        </div>
                        {deals.length === 0 && !loadingDeals && (
                          <p className="text-[0.72rem] text-[#9CA3AF] mt-1">No eligible deals found.</p>
                        )}
                      </>
                    )}
                  </div>

                  {selectedDeal && (
                    <div className="bg-[#F9FAFB] border border-[rgba(5,14,36,0.06)] rounded-xl px-4 py-3">
                      <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-2">Deal Preview</div>
                      <div className="text-[0.88rem] font-medium text-[#111827] mb-1">{selectedDeal.address}</div>
                      <div className="text-[0.78rem] text-[#9CA3AF] mb-2">{selectedDeal.city}, {selectedDeal.state} {selectedDeal.zip}</div>
                      <div className="grid grid-cols-3 gap-3 text-[0.78rem]">
                        <div>
                          <span className="text-[#9CA3AF]">Asking:</span>{' '}
                          <span className="font-semibold text-[#111827]">${selectedDeal.askingPrice.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-[#9CA3AF]">Type:</span>{' '}
                          <span className="text-[#374151]">{selectedDeal.propertyType}</span>
                        </div>
                        <div>
                          <span className="text-[#9CA3AF]">Status:</span>{' '}
                          <span className="text-[#374151]">{selectedDeal.status}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Divider + Create Deal toggle */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                    <span className="text-[0.76rem] text-[#9CA3AF]">or</span>
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                  </div>

                  <button
                    onClick={() => { setCreateDealMode(true); setSelectedDealId('') }}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#D1D5DB] rounded-[8px] text-[0.82rem] font-medium text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-blue-50/30 cursor-pointer transition-colors bg-transparent"
                  >
                    <Plus className="w-4 h-4" />
                    Create a New Deal
                  </button>

                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-[8px] px-4 py-3">
                    <Info className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                    <p className="text-[0.78rem] text-blue-800">
                      Property details will be auto-filled from the deal. You can customize them in the next step.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Inline deal creation form */}
                  <div className="flex items-center justify-between">
                    <div className="text-[0.82rem] font-medium text-[#374151]">New Deal</div>
                    <button
                      onClick={() => setCreateDealMode(false)}
                      className="text-[0.78rem] text-[#2563EB] hover:text-[#1D4ED8] bg-transparent border-0 cursor-pointer transition-colors"
                    >
                      Back to deal list
                    </button>
                  </div>

                  <div>
                    <label className={labelCls}>Street Address *</label>
                    <input
                      type="text"
                      value={newDealAddress}
                      onChange={e => setNewDealAddress(e.target.value)}
                      placeholder="e.g. 1234 Main St"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>City *</label>
                      <input
                        type="text"
                        value={newDealCity}
                        onChange={e => setNewDealCity(e.target.value)}
                        placeholder="Dallas"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>State *</label>
                      <div className="relative">
                        <select
                          value={newDealState}
                          onChange={e => setNewDealState(e.target.value)}
                          className={`${inputCls} appearance-none cursor-pointer`}
                        >
                          <option value="">State</option>
                          <option value="AL">AL</option><option value="AK">AK</option><option value="AZ">AZ</option>
                          <option value="AR">AR</option><option value="CA">CA</option><option value="CO">CO</option>
                          <option value="CT">CT</option><option value="DE">DE</option><option value="FL">FL</option>
                          <option value="GA">GA</option><option value="HI">HI</option><option value="ID">ID</option>
                          <option value="IL">IL</option><option value="IN">IN</option><option value="IA">IA</option>
                          <option value="KS">KS</option><option value="KY">KY</option><option value="LA">LA</option>
                          <option value="ME">ME</option><option value="MD">MD</option><option value="MA">MA</option>
                          <option value="MI">MI</option><option value="MN">MN</option><option value="MS">MS</option>
                          <option value="MO">MO</option><option value="MT">MT</option><option value="NE">NE</option>
                          <option value="NV">NV</option><option value="NH">NH</option><option value="NJ">NJ</option>
                          <option value="NM">NM</option><option value="NY">NY</option><option value="NC">NC</option>
                          <option value="ND">ND</option><option value="OH">OH</option><option value="OK">OK</option>
                          <option value="OR">OR</option><option value="PA">PA</option><option value="RI">RI</option>
                          <option value="SC">SC</option><option value="SD">SD</option><option value="TN">TN</option>
                          <option value="TX">TX</option><option value="UT">UT</option><option value="VT">VT</option>
                          <option value="VA">VA</option><option value="WA">WA</option><option value="WV">WV</option>
                          <option value="WI">WI</option><option value="WY">WY</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Zip *</label>
                      <input
                        type="text"
                        value={newDealZip}
                        onChange={e => setNewDealZip(e.target.value)}
                        placeholder="75001"
                        maxLength={10}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Property Type</label>
                      <div className="relative">
                        <select
                          value={newDealType}
                          onChange={e => setNewDealType(e.target.value)}
                          className={`${inputCls} appearance-none cursor-pointer`}
                        >
                          <option value="SFR">SFR</option>
                          <option value="MULTI_FAMILY">Multi-Family</option>
                          <option value="LAND">Land</option>
                          <option value="COMMERCIAL">Commercial</option>
                          <option value="CONDO">Condo</option>
                          <option value="MOBILE_HOME">Mobile Home</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Asking Price *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-[#9CA3AF]">$</span>
                        <input
                          type="number"
                          value={newDealPrice}
                          onChange={e => setNewDealPrice(e.target.value)}
                          placeholder="150000"
                          className={`${inputCls} pl-7`}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateDealInline}
                    disabled={creatingDeal || !newDealAddress || !newDealCity || !newDealState || !newDealZip || !newDealPrice}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white border-0 rounded-[8px] text-[0.82rem] font-medium cursor-pointer transition-colors"
                  >
                    {creatingDeal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {creatingDeal ? 'Creating Deal...' : 'Create Deal & Continue'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Listing Details ── */}
          {step === 'Details' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder={selectedDeal ? `${selectedDeal.propertyType} in ${selectedDeal.city}, ${selectedDeal.state}` : 'Great flip opportunity...'}
                  className={inputCls}
                  maxLength={120}
                />
                <p className="text-[0.68rem] text-[#9CA3AF] mt-1">{headline.length}/120. Leave blank for an auto-generated headline.</p>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the opportunity, neighborhood highlights, renovation potential, etc..."
                  rows={4}
                  className={`${inputCls} resize-none`}
                  maxLength={2000}
                />
                <p className="text-[0.68rem] text-[#9CA3AF] mt-1">{description.length}/2000</p>
              </div>

              <div className="border-t border-[#F3F4F6] pt-4">
                <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-3">Financials</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Asking Price *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-[#9CA3AF]">$</span>
                      <input
                        type="number"
                        value={askingPrice}
                        onChange={e => setAskingPrice(e.target.value)}
                        className={`${inputCls} pl-7`}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Assignment Fee</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-[#9CA3AF]">$</span>
                      <input
                        type="number"
                        value={assignFee}
                        onChange={e => setAssignFee(e.target.value)}
                        className={`${inputCls} pl-7`}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F3F4F6] pt-4">
                <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-3">Property Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Condition</label>
                    <div className="relative">
                      <select value={condition} onChange={e => setCondition(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                        <option value="">Not specified</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                        <option value="Needs rehab">Needs Rehab</option>
                        <option value="Tear down">Tear Down</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Year Built</label>
                    <input type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} className={inputCls} placeholder="e.g. 1985" />
                  </div>
                  <div>
                    <label className={labelCls}>Beds</label>
                    <input type="number" value={beds} onChange={e => setBeds(e.target.value)} className={inputCls} placeholder="0" min="0" />
                  </div>
                  <div>
                    <label className={labelCls}>Baths</label>
                    <input type="number" value={baths} onChange={e => setBaths(e.target.value)} className={inputCls} placeholder="0" min="0" step="0.5" />
                  </div>
                  <div>
                    <label className={labelCls}>Sq Ft</label>
                    <input type="number" value={sqft} onChange={e => setSqft(e.target.value)} className={inputCls} placeholder="0" min="0" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Photos ── */}
          {step === 'Photos' && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Property Photos</label>
                <p className="text-[0.76rem] text-[#9CA3AF] mb-3">Add up to 10 photos. JPEG, PNG, or WebP, max 5 MB each.</p>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-[8px] px-6 py-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-[#2563EB] bg-blue-50'
                      : 'border-[#D1D5DB] hover:border-[#2563EB] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <ImagePlus className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-[#2563EB]' : 'text-[#D1D5DB]'}`} />
                  <p className="text-[0.82rem] text-[#374151] font-medium mb-1">
                    {dragOver ? 'Drop photos here' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-[0.76rem] text-[#9CA3AF]">JPEG, PNG, WebP. Max 5 MB per file.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  className="hidden"
                  onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
                />
              </div>

              {/* Photo previews */}
              {photos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[0.78rem] font-medium text-[#374151]">{photos.length} photo{photos.length !== 1 ? 's' : ''} added</span>
                    {photos.length > 1 && (
                      <button
                        onClick={() => { photos.forEach(p => URL.revokeObjectURL(p.url)); setPhotos([]) }}
                        className="text-[0.72rem] text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer"
                      >
                        Remove all
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map((p, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-[rgba(5,14,36,0.06)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 text-[0.6rem] font-bold bg-[#2563EB] text-white px-1.5 py-0.5 rounded">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-[8px] px-4 py-3">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[0.78rem] text-amber-800">
                  Photos are optional but listings with photos get 3x more inquiries. The first photo will be used as the cover image.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 'Review' && selectedDeal && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 bg-[rgba(37,99,235,0.08)] border border-[#BFDBFE] rounded-xl px-4 py-3">
                <ShieldCheck className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-0.5" />
                <p className="text-[0.78rem] text-[#1E40AF]">
                  Your contact info is protected. Only your first name and company will be shown to other wholesalers.
                </p>
              </div>

              <div className="bg-[#F9FAFB] border border-[rgba(5,14,36,0.06)] rounded-xl px-5 py-4">
                <div className="text-[11px] font-semibold text-[rgba(5,14,36,0.4)] uppercase tracking-[0.05em] mb-3">Listing Summary</div>

                <div className="space-y-3">
                  <div>
                    <div className="text-[0.72rem] text-[#9CA3AF]">Property</div>
                    <div className="text-[0.88rem] font-medium text-[#111827]">{selectedDeal.address}</div>
                    <div className="text-[0.78rem] text-[#9CA3AF]">{selectedDeal.city}, {selectedDeal.state} {selectedDeal.zip}</div>
                  </div>

                  {headline && (
                    <div>
                      <div className="text-[0.72rem] text-[#9CA3AF]">Headline</div>
                      <div className="text-[0.82rem] text-[#374151]">{headline}</div>
                    </div>
                  )}

                  {description && (
                    <div>
                      <div className="text-[0.72rem] text-[#9CA3AF]">Description</div>
                      <div className="text-[0.82rem] text-[#374151] line-clamp-3">{description}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 pt-2 border-t border-[#E5E7EB]">
                    <div className="flex justify-between text-[0.78rem]">
                      <span className="text-[#9CA3AF]">Asking Price</span>
                      <span className="font-semibold text-[#111827]">${parseInt(askingPrice || '0', 10).toLocaleString()}</span>
                    </div>
                    {assignFee && (
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-[#9CA3AF]">Assign Fee</span>
                        <span className="text-[#374151]">${parseInt(assignFee, 10).toLocaleString()}</span>
                      </div>
                    )}
                    {condition && (
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-[#9CA3AF]">Condition</span>
                        <span className="text-[#374151]">{condition}</span>
                      </div>
                    )}
                    {beds && (
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-[#9CA3AF]">Beds</span>
                        <span className="text-[#374151]">{beds}</span>
                      </div>
                    )}
                    {baths && (
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-[#9CA3AF]">Baths</span>
                        <span className="text-[#374151]">{baths}</span>
                      </div>
                    )}
                    {sqft && (
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-[#9CA3AF]">Sq Ft</span>
                        <span className="text-[#374151]">{parseInt(sqft, 10).toLocaleString()}</span>
                      </div>
                    )}
                    {yearBuilt && (
                      <div className="flex justify-between text-[0.78rem]">
                        <span className="text-[#9CA3AF]">Year Built</span>
                        <span className="text-[#374151]">{yearBuilt}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#E5E7EB]">
                    <ImagePlus className="w-4 h-4 text-[#9CA3AF]" />
                    <span className="text-[0.78rem] text-[#374151]">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
                    {photos.length > 0 && (
                      <div className="flex gap-1 ml-2">
                        {photos.slice(0, 4).map((p, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={p.url} alt="" className="w-8 h-8 rounded object-cover border border-[#E5E7EB]" />
                        ))}
                        {photos.length > 4 && (
                          <div className="w-8 h-8 rounded bg-[#F3F4F6] flex items-center justify-center text-[0.6rem] font-medium text-[#6B7280]">
                            +{photos.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-5 pt-3 border-t border-[#F3F4F6] flex-shrink-0">
          <div>
            {stepIdx > 0 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1.5 px-4 py-2 text-[0.82rem] font-medium text-[#6B7280] hover:text-[#374151] bg-transparent border-0 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-[0.82rem] font-medium text-[#6B7280] hover:text-[#374151] bg-transparent border-0 cursor-pointer transition-colors">
              Cancel
            </button>
            {step === 'Review' ? (
              <button
                onClick={handleCreate}
                disabled={creating || uploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white border-0 rounded-[8px] text-[0.82rem] font-medium cursor-pointer transition-colors"
              >
                {(creating || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploading ? 'Uploading photos...' : creating ? 'Publishing...' : 'Publish Listing'}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canAdvance()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-white border-0 rounded-[8px] text-[0.82rem] font-medium cursor-pointer transition-colors"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN MARKETPLACE PAGE
   ═══════════════════════════════════════════════ */
export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<Tab>('deals')

  return (
    <div className="bg-[#F9FAFB]" data-tour="marketplace-content">
      {/* Vercel-style top tab bar */}
      <div
        className="flex-shrink-0 bg-white"
        style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}
      >
        <div className="px-8">
          <nav className="flex gap-0.5 -mb-px">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
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
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-8 max-w-[1200px]">
        <Suspense fallback={<ListingSkeleton />}>
          {activeTab === 'deals' && <DealListingsSection />}
          {activeTab === 'buyers' && <BuyerBoardSection />}
          {activeTab === 'mine' && <MyListingsSection />}
        </Suspense>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .mp-deals-grid { grid-template-columns: 1fr !important; }
          .mp-buyer-grid { grid-template-columns: 1fr !important; }
          .mp-detail-grid { grid-template-columns: 1fr !important; }
          .mp-analysis-grid { grid-template-columns: 1fr 1fr !important; }
          .mp-similar-grid { grid-template-columns: 1fr !important; }
        }
      ` }} />
    </div>
  )
}
