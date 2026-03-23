'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SavedView {
  id: string
  page: string
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: Record<string, any>
  isDefault: boolean
  notify: boolean
  createdAt: string
}

export function useSavedViews(page: 'crm' | 'deals' | 'discovery') {
  const [views, setViews] = useState<SavedView[]>([])
  const [loading, setLoading] = useState(true)

  const fetchViews = useCallback(async () => {
    try {
      const res = await fetch(`/api/views?page=${page}`)
      const data = await res.json()
      setViews(data.views || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchViews()
  }, [fetchViews])

  const createView = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (name: string, filters: Record<string, any>) => {
      const res = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, name, filters }),
      })
      if (!res.ok) throw new Error('Failed to save view')
      const data = await res.json()
      setViews((prev) => [data.view, ...prev])
      return data.view as SavedView
    },
    [page],
  )

  const deleteView = useCallback(async (id: string) => {
    const res = await fetch(`/api/views/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete view')
    setViews((prev) => prev.filter((v) => v.id !== id))
  }, [])

  const toggleNotify = useCallback(async (id: string, notify: boolean) => {
    const res = await fetch(`/api/views/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notify }),
    })
    if (!res.ok) throw new Error('Failed to update notification')
    setViews((prev) =>
      prev.map((v) => (v.id === id ? { ...v, notify } : v)),
    )
  }, [])

  return { views, loading, createView, deleteView, toggleNotify, refetch: fetchViews }
}
