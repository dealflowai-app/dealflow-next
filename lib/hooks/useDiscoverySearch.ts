'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { DiscoveryProperty } from '@/lib/types/discovery'

// ─── FILTER STATE ────────────────────────────────────────────────────────────

export interface DiscoveryFilters {
  query: string               // city name or zip code
  propertyType: string[]      // ['SFR', 'Multi-Family']
  bedsMin: number | null
  bedsMax: number | null
  bathsMin: number | null
  bathsMax: number | null
  sqftMin: number | null
  sqftMax: number | null
  yearBuiltMin: number | null
  yearBuiltMax: number | null
  valueMin: number | null
  valueMax: number | null
  ownerType: string[]         // ['Individual', 'LLC/Corp', 'Trust', 'Bank-Owned']
  absenteeOnly: boolean
  taxDelinquent: boolean
  preForeclosure: boolean
  probate: boolean
  equityMin: number | null
  equityMax: number | null
  ownershipMin: number | null // min years of ownership
}

export interface DiscoveryPagination {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface UseDiscoverySearchReturn {
  properties: DiscoveryProperty[]
  loading: boolean
  error: string | null
  searchLocation: string | null
  fromCache: boolean
  filters: DiscoveryFilters
  pagination: DiscoveryPagination
  activeProperty: DiscoveryProperty | null
  search: () => void
  searchWithQuery: (query: string) => void
  searchByBounds: (bounds: { north: number; south: number; east: number; west: number }) => void
  setFilter: <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => void
  clearFilters: () => void
  setActiveProperty: (property: DiscoveryProperty | null) => void
  nextPage: () => void
  prevPage: () => void
}

const DEFAULT_FILTERS: DiscoveryFilters = {
  query: '',
  propertyType: [],
  bedsMin: null,
  bedsMax: null,
  bathsMin: null,
  bathsMax: null,
  sqftMin: null,
  sqftMax: null,
  yearBuiltMin: null,
  yearBuiltMax: null,
  valueMin: null,
  valueMax: null,
  ownerType: [],
  absenteeOnly: false,
  taxDelinquent: false,
  preForeclosure: false,
  probate: false,
  equityMin: null,
  equityMax: null,
  ownershipMin: null,
}

const DEFAULT_LIMIT = 50

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const STATE_NAMES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
}

function normalizeState(s: string): string | undefined {
  const upper = s.trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(upper) && Object.values(STATE_NAMES).includes(upper)) return upper
  return STATE_NAMES[s.trim().toLowerCase()]
}

function parseLocation(query: string): { city?: string; state?: string; zip?: string } {
  const trimmed = query.trim()

  // Extract a 5-digit zip if present anywhere in the string
  const zipMatch = trimmed.match(/\b(\d{5})\b/)
  if (zipMatch) {
    return { zip: zipMatch[1] }
  }

  // "City, State" — state can be 2-letter code or full name
  const commaMatch = trimmed.match(/^(.+?),\s*(.+?)$/)
  if (commaMatch) {
    const city = commaMatch[1].trim()
    const stateRaw = commaMatch[2].trim()
    const state = normalizeState(stateRaw)
    if (state) {
      return { city, state }
    }
  }

  // Fallback: treat as city (user must include state)
  return {}
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

export function useDiscoverySearch(): UseDiscoverySearchReturn {
  const [properties, setProperties] = useState<DiscoveryProperty[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchLocation, setSearchLocation] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [activeProperty, setActiveProperty] = useState<DiscoveryProperty | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const fetchResults = useCallback(async (currentFilters: DiscoveryFilters, currentPage: number) => {
    const location = parseLocation(currentFilters.query)
    if (!location.zip && (!location.city || !location.state)) {
      setError('Enter a city and state (e.g. "Dallas, TX") or a zip code')
      return
    }

    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (location.city) params.set('city', location.city)
      if (location.state) params.set('state', location.state)
      if (location.zip) params.set('zip', location.zip)
      if (currentFilters.propertyType.length > 0) {
        params.set('propertyType', currentFilters.propertyType.join(','))
      }
      if (currentFilters.bedsMin !== null) params.set('bedsMin', String(currentFilters.bedsMin))
      if (currentFilters.bedsMax !== null) params.set('bedsMax', String(currentFilters.bedsMax))
      if (currentFilters.bathsMin !== null) params.set('bathsMin', String(currentFilters.bathsMin))
      if (currentFilters.bathsMax !== null) params.set('bathsMax', String(currentFilters.bathsMax))
      if (currentFilters.sqftMin !== null) params.set('sqftMin', String(currentFilters.sqftMin))
      if (currentFilters.sqftMax !== null) params.set('sqftMax', String(currentFilters.sqftMax))
      if (currentFilters.yearBuiltMin !== null) params.set('yearBuiltMin', String(currentFilters.yearBuiltMin))
      if (currentFilters.yearBuiltMax !== null) params.set('yearBuiltMax', String(currentFilters.yearBuiltMax))
      if (currentFilters.valueMin !== null) params.set('valueMin', String(currentFilters.valueMin))
      if (currentFilters.valueMax !== null) params.set('valueMax', String(currentFilters.valueMax))
      if (currentFilters.absenteeOnly) params.set('absenteeOnly', 'true')
      if (currentFilters.ownerType.length > 0) params.set('ownerType', currentFilters.ownerType.join(','))
      if (currentFilters.ownershipMin !== null) params.set('ownershipMin', String(currentFilters.ownershipMin))
      params.set('limit', String(DEFAULT_LIMIT))
      params.set('offset', String((currentPage - 1) * DEFAULT_LIMIT))

      const res = await fetch(`/api/discovery/search?${params.toString()}`, {
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `Request failed (${res.status})`)
      }

      const data = await res.json()
      setProperties(data.properties)
      setTotal(data.total)
      setFromCache(data.fromCache)
      setSearchLocation(data.searchLocation)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setProperties([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback(() => {
    setPage(1)
    setActiveProperty(null)
    fetchResults(filters, 1)
  }, [filters, fetchResults])

  const searchWithQuery = useCallback((query: string) => {
    const updated = { ...filters, query }
    setFilters(updated)
    setPage(1)
    setActiveProperty(null)
    fetchResults(updated, 1)
  }, [filters, fetchResults])

  const boundsAbortRef = useRef<AbortController | null>(null)

  const searchByBounds = useCallback(async (bounds: { north: number; south: number; east: number; west: number }) => {
    boundsAbortRef.current?.abort()
    const controller = new AbortController()
    boundsAbortRef.current = controller

    try {
      const params = new URLSearchParams({
        north: String(bounds.north),
        south: String(bounds.south),
        east: String(bounds.east),
        west: String(bounds.west),
        limit: '300',
      })
      const res = await fetch(`/api/discovery/bounds?${params}`, { signal: controller.signal })
      if (!res.ok) return
      const data = await res.json()
      if (data.properties?.length > 0) {
        setProperties(prev => {
          // Merge: keep existing properties, add new ones from bounds
          const existingIds = new Set(prev.map(p => p.id))
          const newOnes = data.properties.filter((p: DiscoveryProperty) => !existingIds.has(p.id))
          if (newOnes.length === 0) return prev
          return [...prev, ...newOnes]
        })
        setTotal(prev => prev + (data.properties.length || 0))
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }, [])

  const setFilter = useCallback(<K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setProperties([])
    setTotal(0)
    setError(null)
    setSearchLocation(null)
    setActiveProperty(null)
    setPage(1)
  }, [])

  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(total / DEFAULT_LIMIT)
    if (page < maxPage) {
      const next = page + 1
      setPage(next)
      fetchResults(filters, next)
    }
  }, [page, total, filters, fetchResults])

  const prevPage = useCallback(() => {
    if (page > 1) {
      const prev = page - 1
      setPage(prev)
      fetchResults(filters, prev)
    }
  }, [page, filters, fetchResults])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return {
    properties,
    loading,
    error,
    searchLocation,
    fromCache,
    filters,
    pagination: {
      page,
      limit: DEFAULT_LIMIT,
      total,
      hasMore: page * DEFAULT_LIMIT < total,
    },
    activeProperty,
    search,
    searchWithQuery,
    searchByBounds,
    setFilter,
    clearFilters,
    setActiveProperty,
    nextPage,
    prevPage,
  }
}
