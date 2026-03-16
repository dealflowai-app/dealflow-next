'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { OwnerProfile } from '@/lib/types/owner-intelligence'

export type OwnerSortBy = 'investorScore' | 'propertyCount' | 'totalValue'

export interface UseOwnerSearchReturn {
  owners: OwnerProfile[]
  loading: boolean
  error: string | null
  total: number
  cashBuyerCount: number
  multiPropertyCount: number
  searchLocation: string | null
  sortBy: OwnerSortBy
  setSortBy: (s: OwnerSortBy) => void
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  search: (query: string) => void
  nextPage: () => void
  prevPage: () => void
}

const LIMIT = 50

/**
 * Calls /api/discovery/owners with the same city/zip the property search uses.
 * Manages owner list state, loading, pagination.
 */
export function useOwnerSearch(): UseOwnerSearchReturn {
  const [owners, setOwners] = useState<OwnerProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [cashBuyerCount, setCashBuyerCount] = useState(0)
  const [multiPropertyCount, setMultiPropertyCount] = useState(0)
  const [searchLocation, setSearchLocation] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<OwnerSortBy>('investorScore')
  const [page, setPage] = useState(1)
  const [lastQuery, setLastQuery] = useState('')

  const abortRef = useRef<AbortController | null>(null)

  const fetchOwners = useCallback(async (query: string, currentPage: number, sort: OwnerSortBy) => {
    const trimmed = query.trim()
    if (!trimmed) return

    // Parse location the same way the property search does
    const location = parseLocationSimple(trimmed)
    if (!location.zip && (!location.city || !location.state)) {
      // Don't show error — the property search hook handles that
      return
    }

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
      params.set('minProperties', '2')
      params.set('sortBy', sort)
      params.set('limit', String(LIMIT))
      params.set('offset', String((currentPage - 1) * LIMIT))

      const res = await fetch(`/api/discovery/owners?${params.toString()}`, {
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `Request failed (${res.status})`)
      }

      const data = await res.json()
      const ownerList: OwnerProfile[] = data.owners ?? []

      setOwners(ownerList)
      setTotal(data.total ?? 0)
      setSearchLocation(data.searchLocation ?? null)
      setCashBuyerCount(ownerList.filter(o => o.likelyCashBuyer).length)
      setMultiPropertyCount(ownerList.filter(o => o.propertyCount >= 2).length)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setOwners([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback((query: string) => {
    setPage(1)
    setLastQuery(query)
    fetchOwners(query, 1, sortBy)
  }, [sortBy, fetchOwners])

  // Re-fetch when sortBy changes (if we have a query)
  useEffect(() => {
    if (lastQuery) {
      setPage(1)
      fetchOwners(lastQuery, 1, sortBy)
    }
  }, [sortBy]) // eslint-disable-line react-hooks/exhaustive-deps

  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(total / LIMIT)
    if (page < maxPage) {
      const next = page + 1
      setPage(next)
      fetchOwners(lastQuery, next, sortBy)
    }
  }, [page, total, lastQuery, sortBy, fetchOwners])

  const prevPage = useCallback(() => {
    if (page > 1) {
      const prev = page - 1
      setPage(prev)
      fetchOwners(lastQuery, prev, sortBy)
    }
  }, [page, lastQuery, sortBy, fetchOwners])

  // Cleanup
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  return {
    owners,
    loading,
    error,
    total,
    cashBuyerCount,
    multiPropertyCount,
    searchLocation,
    sortBy,
    setSortBy,
    pagination: {
      page,
      limit: LIMIT,
      total,
      hasMore: page * LIMIT < total,
    },
    search,
    nextPage,
    prevPage,
  }
}

// Lightweight location parser (mirrors useDiscoverySearch's parseLocation)
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

function parseLocationSimple(query: string): { city?: string; state?: string; zip?: string } {
  const trimmed = query.trim()
  const zipMatch = trimmed.match(/\b(\d{5})\b/)
  if (zipMatch) return { zip: zipMatch[1] }

  const commaMatch = trimmed.match(/^(.+?),\s*(.+?)$/)
  if (commaMatch) {
    const city = commaMatch[1].trim()
    const stateRaw = commaMatch[2].trim()
    const upper = stateRaw.toUpperCase()
    if (/^[A-Z]{2}$/.test(upper) && Object.values(STATE_NAMES).includes(upper)) {
      return { city, state: upper }
    }
    const mapped = STATE_NAMES[stateRaw.toLowerCase()]
    if (mapped) return { city, state: mapped }
  }
  return {}
}
