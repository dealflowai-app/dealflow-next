'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import Map, {
  Marker,
  Popup,
  NavigationControl,
  type MapRef,
} from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { DiscoveryProperty } from '@/lib/types/discovery'
import { displayType, pinColor, formatCurrency } from '@/lib/discovery/helpers'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

/** Compact price for map labels: $955K, $1.39M, etc. */
function shortPrice(value: number | null): string {
  if (value == null) return ''
  if (value >= 1_000_000) {
    const m = value / 1_000_000
    return '$' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(2).replace(/0$/, '')) + 'M'
  }
  if (value >= 1_000) {
    return '$' + Math.round(value / 1_000) + 'K'
  }
  return '$' + value.toLocaleString()
}

/* ─── Map styles ──────────────────────────────────────────────────────────── */
const MAP_STYLES = {
  street:    'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const

/* ─── Legend entries ──────────────────────────────────────────────────────── */
const LEGEND = [
  { label: 'SFR',          color: '#2563EB' },
  { label: 'Multi-Family', color: '#7C3AED' },
  { label: 'Condo',        color: '#0891B2' },
  { label: 'Land',         color: '#059669' },
  { label: 'Commercial',   color: '#D97706' },
]

/* ═══════════════════════════════════════════════════════════════════════════ */

export type MapStyleKey = keyof typeof MAP_STYLES

export interface DiscoveryMapboxProps {
  properties: DiscoveryProperty[]
  activeId: string | null
  onPinClick: (id: string) => void
  searchLocation?: string | null
  /** Expose the map ref so the parent can call flyTo */
  mapRef?: React.RefObject<MapRef>
  /** Controlled map style from parent */
  mapStyle?: MapStyleKey
  /** Property IDs to visually highlight (e.g. selected buyer's portfolio) */
  highlightIds?: Set<string>
  /** Called when user finishes panning/zooming with current viewport bounds and zoom */
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }, zoom: number) => void
}

export default function DiscoveryMapbox({
  properties,
  activeId,
  onPinClick,
  searchLocation,
  mapRef: externalMapRef,
  mapStyle: mapStyleProp = 'street',
  highlightIds,
  onBoundsChange,
}: DiscoveryMapboxProps) {
  const internalMapRef = useRef<MapRef>(null)
  const mapRef = externalMapRef ?? internalMapRef

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Resize map when container dimensions change (e.g. sidebar collapse)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [mapRef])

  // Compute bounds from properties
  const withCoords = useMemo(
    () => properties.filter(p => p.latitude != null && p.longitude != null),
    [properties],
  )

  // Fit bounds whenever properties change
  useEffect(() => {
    const map = mapRef.current
    if (!map || withCoords.length === 0) return

    if (withCoords.length === 1) {
      map.flyTo({
        center: [withCoords[0].longitude!, withCoords[0].latitude!],
        zoom: 14,
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
      { padding: 60, duration: 1000, maxZoom: 15 },
    )
  }, [withCoords, mapRef])

  // Pan to active pin when activeId changes
  useEffect(() => {
    if (!activeId) return
    const p = properties.find(pr => pr.id === activeId)
    if (p?.longitude != null && p?.latitude != null) {
      mapRef.current?.flyTo({
        center: [p.longitude, p.latitude],
        zoom: 15,
        duration: 1200,
      })
    }
  }, [activeId, properties, mapRef])

  const hoveredProperty = useMemo(
    () => (hoveredId ? properties.find(p => p.id === hoveredId) ?? null : null),
    [hoveredId, properties],
  )

  // Default center (US center)
  const defaultCenter = useMemo(() => {
    if (withCoords.length === 0) return { lng: -98.5, lat: 39.8 }
    const lng = withCoords.reduce((s, p) => s + p.longitude!, 0) / withCoords.length
    const lat = withCoords.reduce((s, p) => s + p.latitude!, 0) / withCoords.length
    return { lng, lat }
  }, [withCoords])

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-gray-900">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: defaultCenter.lng,
          latitude: defaultCenter.lat,
          zoom: withCoords.length > 0 ? 11 : 4,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLES[mapStyleProp]}
        attributionControl={false}
        onMoveEnd={() => {
          if (!onBoundsChange) return
          const map = mapRef.current
          if (!map) return
          const b = map.getBounds()
          if (!b) return
          onBoundsChange({
            north: b.getNorth(),
            south: b.getSouth(),
            east: b.getEast(),
            west: b.getWest(),
          }, map.getZoom())
        }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Markers */}
        {withCoords.map(p => {
          const pType = displayType(p.propertyType)
          const isActive = activeId === p.id
          const isHovered = hoveredId === p.id
          const isHighlighted = highlightIds != null && highlightIds.size > 0 && highlightIds.has(p.id)
          const isDimmed = highlightIds != null && highlightIds.size > 0 && !highlightIds.has(p.id)
          const color = pinColor(pType)

          return (
            <Marker
              key={p.id}
              longitude={p.longitude!}
              latitude={p.latitude!}
              anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation()
                onPinClick(p.id)
              }}
            >
              <div
                className="cursor-pointer transition-all duration-200"
                style={{
                  transform: isActive ? 'scale(1.15)' : isHovered ? 'scale(1.08)' : 'scale(1)',
                  opacity: isDimmed && !isActive ? 0.35 : 1,
                }}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Price label chip */}
                <div
                  className="rounded-md px-1.5 py-0.5 text-white font-semibold whitespace-nowrap shadow-md"
                  style={{
                    fontSize: '0.65rem',
                    lineHeight: 1.2,
                    backgroundColor: isActive ? '#1D4ED8' : isHighlighted ? '#D97706' : color,
                    border: isActive ? '2px solid #1E40AF' : isHighlighted ? '2px solid #B45309' : '1.5px solid rgba(0,0,0,0.15)',
                    boxShadow: isActive
                      ? '0 0 0 3px rgba(37,99,235,0.3), 0 2px 6px rgba(0,0,0,0.2)'
                      : isHighlighted
                        ? '0 0 0 3px rgba(245,158,11,0.3), 0 2px 6px rgba(0,0,0,0.2)'
                        : '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  {shortPrice(p.assessedValue) || displayType(p.propertyType)}
                </div>
              </div>
            </Marker>
          )
        })}

        {/* Hover popup */}
        {hoveredProperty && hoveredProperty.longitude != null && hoveredProperty.latitude != null && hoveredId !== activeId && (
          <Popup
            longitude={hoveredProperty.longitude}
            latitude={hoveredProperty.latitude}
            offset={[0, -18] as [number, number]}
            closeButton={false}
            closeOnClick={false}
            className="discovery-popup"
          >
            <div className="px-2 py-1.5 min-w-[160px]">
              <div className="text-[0.76rem] font-medium text-[#111827] truncate">
                {hoveredProperty.addressLine1}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[0.66rem] text-gray-500">
                  {displayType(hoveredProperty.propertyType)}
                </span>
                <span className="text-[0.66rem] text-gray-400">·</span>
                <span className="text-[0.72rem] font-medium text-[#374151]">
                  {formatCurrency(hoveredProperty.assessedValue)}
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* ── Legend (bottom-left, covers mapbox logo) ── */}
      <div className="absolute bottom-0 left-0 bg-white/95 backdrop-blur-sm rounded-tr-[8px] px-3 py-2 border-t border-r border-gray-200/60 z-10">
        <div className="text-[0.58rem] text-gray-400 uppercase tracking-wider mb-1 font-medium">Property Types</div>
        <div className="space-y-0.5">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.color }} />
              <span className="text-[0.64rem] text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Remove default popup styling + hide mapbox branding */}
      <style dangerouslySetInnerHTML={{ __html: `
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }
        .discovery-popup .mapboxgl-popup-content {
          padding: 0;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          border: 1px solid #E5E7EB;
        }
        .discovery-popup .mapboxgl-popup-tip {
          border-top-color: #E5E7EB;
        }
      ` }} />
    </div>
  )
}
