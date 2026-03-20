'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ApiBuyer {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  entityType: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  cashPurchaseCount: number
  lastPurchaseDate: string | null
  primaryPropertyType: string | null
  status: string
  contactEnriched: boolean
  notes: string | null
  buyerScore: number
  lastContactedAt: string | null
  lastVerifiedAt: string | null
  preferredMarkets: string[]
  preferredTypes: string[]
  strategy: string | null
  minPrice: number | null
  maxPrice: number | null
  closeSpeedDays: number | null
  proofOfFundsVerified: boolean
  scorePinned: boolean
  scoreOverride: number | null
  scoreAdjustment: number
  customTags: string[]
  motivation: string | null
  buyerType: string | null
  fundingSource: string | null
  source: string | null
  followUpDate: string | null
  contactType: string
  sellerMotivation: string | null
  sellerAskingPrice: number | null
  sellerPropertyId: string | null
  sellerTimeline: string | null
  alertsEnabled: boolean
  alertFrequency: string
  createdAt: string
  updatedAt: string
  tags?: Array<{
    id: string
    autoApplied: boolean
    tagId: string
    tag: { id: string; name: string; label: string; color: string; type: string }
  }>
  campaignCalls?: unknown[]
  dealMatches?: unknown[]
  offers?: unknown[]
}

export interface BuyerFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  market?: string
  scoreMin?: number
  type?: string
  strategy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  tag?: string
  motivation?: string
  archived?: boolean
  contactType?: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface TimelineEvent {
  id: string
  buyerId: string
  profileId: string
  type: string
  title: string
  detail: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface ApiTag {
  id: string
  name: string
  label: string
  color: string
  type: string
  description: string | null
  buyerCount: number
  createdAt: string
}

// ─── useBuyers ───────────────────────────────────────────────────────────────

export function useBuyers(filters: BuyerFilters = {}) {
  const [buyers, setBuyers] = useState<ApiBuyer[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 })
  const [stats, setStats] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search || '')
    }, 300)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [filters.search])

  const fetchBuyers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filters.page) params.set('page', String(filters.page))
      if (filters.limit) params.set('limit', String(filters.limit))
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (filters.status) params.set('status', filters.status)
      if (filters.market) params.set('market', filters.market)
      if (filters.scoreMin != null) params.set('scoreMin', String(filters.scoreMin))
      if (filters.type) params.set('type', filters.type)
      if (filters.strategy) params.set('strategy', filters.strategy)
      if (filters.sortBy) params.set('sortBy', filters.sortBy)
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
      if (filters.tag) params.set('tag', filters.tag)
      if (filters.motivation) params.set('motivation', filters.motivation)
      if (filters.contactType) params.set('contactType', filters.contactType)
      if (filters.archived) params.set('archived', 'true')

      const res = await fetch(`/api/crm/buyers?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to fetch buyers')

      setBuyers(data.buyers)
      setPagination(data.pagination)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [
    filters.page, filters.limit, debouncedSearch, filters.status,
    filters.market, filters.scoreMin, filters.type, filters.strategy,
    filters.sortBy, filters.sortOrder, filters.tag, filters.motivation, filters.archived,
  ])

  useEffect(() => { fetchBuyers() }, [fetchBuyers])

  return { buyers, pagination, stats, isLoading, error, refetch: fetchBuyers }
}

// ─── useBuyerDetail ──────────────────────────────────────────────────────────

export function useBuyerDetail(id: string | null) {
  const [buyer, setBuyer] = useState<ApiBuyer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBuyer = useCallback(async () => {
    if (!id) { setBuyer(null); return }
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/crm/buyers/${id}`)
      if (!res.ok) throw new Error('Failed to fetch buyer')
      const data = await res.json()
      setBuyer(data.buyer)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { fetchBuyer() }, [fetchBuyer])

  return { buyer, isLoading, error, refetch: fetchBuyer }
}

// ─── useBuyerTimeline ────────────────────────────────────────────────────────

export function useBuyerTimeline(id: string | null) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchPage = useCallback(async (cursor?: string | null) => {
    if (!id) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '15' })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`/api/crm/buyers/${id}/timeline?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json()
      if (cursor) {
        setEvents(prev => [...prev, ...data.events])
      } else {
        setEvents(data.events)
      }
      setHasMore(data.pagination.hasMore)
      setNextCursor(data.pagination.nextCursor)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    setEvents([])
    setNextCursor(null)
    setHasMore(false)
    fetchPage()
  }, [fetchPage])

  const loadMore = useCallback(() => {
    if (hasMore && nextCursor) fetchPage(nextCursor)
  }, [hasMore, nextCursor, fetchPage])

  return { events, hasMore, isLoading, loadMore }
}

// ─── useTags ─────────────────────────────────────────────────────────────────

export function useTags() {
  const [tags, setTags] = useState<ApiTag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTags = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/crm/tags')
      if (!res.ok) return
      const data = await res.json()
      setTags(data.tags)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchTags() }, [fetchTags])

  return { tags, isLoading, refetch: fetchTags }
}
