'use client'

import { useState, useRef, useEffect } from 'react'
import { Bookmark, ChevronDown, X, Loader2, Trash2, Bell, BellOff } from 'lucide-react'
import { useSavedViews, type SavedView } from '@/lib/hooks/useSavedViews'
import type { DiscoveryFilters } from '@/lib/hooks/useDiscoverySearch'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

/* ─── Save Modal ─── */
function SaveModal({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim())
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-[12px] shadow-xl w-[340px] p-5"
        style={{ border: '1px solid rgba(5,14,36,0.06)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4
            style={{ fontFamily: FONT, fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}
            className="m-0 text-[#0B1224]"
          >
            Save Current Search
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[rgba(5,14,36,0.04)] border-0 bg-transparent cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-[rgba(5,14,36,0.3)]" />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cash Buyers in Dallas"
          className="w-full border border-[rgba(5,14,36,0.1)] rounded-[8px] px-3 py-2.5 text-[0.84rem] outline-none focus:border-[#2563EB] transition-colors mb-3 bg-white text-[#0B1224]"
          style={{ fontFamily: FONT }}
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-[0.8rem] font-medium text-[rgba(5,14,36,0.5)] bg-white border border-[rgba(5,14,36,0.08)] rounded-[8px] cursor-pointer hover:bg-[rgba(5,14,36,0.02)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-[0.8rem] font-semibold text-white bg-[#2563EB] border-0 rounded-[8px] cursor-pointer hover:bg-[#1D4ED8] disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Filter summary helper ─── */
function filterSummary(filters: Record<string, unknown>): string {
  const parts: string[] = []
  if (filters.query) parts.push(String(filters.query))
  const pt = filters.propertyType
  if (Array.isArray(pt) && pt.length > 0) parts.push(pt.join(', '))
  const ot = filters.ownerType
  if (Array.isArray(ot) && ot.length > 0) parts.push(ot.join(', '))
  if (filters.absenteeOnly) parts.push('Absentee')
  if (filters.taxDelinquent) parts.push('Tax Delinq.')
  if (filters.preForeclosure) parts.push('Pre-Forecl.')
  if (filters.probate) parts.push('Probate')
  return parts.join(' / ') || 'All filters'
}

/* ─── Main Component ─── */
export default function SavedSearches({
  currentFilters,
  onApplySearch,
  hasActiveFilters,
}: {
  currentFilters: DiscoveryFilters
  onApplySearch: (filters: DiscoveryFilters) => void
  hasActiveFilters: boolean
}) {
  const { views, createView, deleteView, toggleNotify } = useSavedViews('discovery')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  function handleApply(view: SavedView) {
    setActiveViewId(view.id)
    onApplySearch(view.filters as unknown as DiscoveryFilters)
    setDropdownOpen(false)
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    try {
      await deleteView(id)
      if (activeViewId === id) setActiveViewId(null)
    } catch {
      // silently fail
    }
  }

  async function handleToggleNotify(e: React.MouseEvent, view: SavedView) {
    e.stopPropagation()
    try {
      await toggleNotify(view.id, !view.notify)
    } catch {
      // silently fail
    }
  }

  async function handleSave(name: string) {
    // Serialize current filters as a plain object for JSON storage
    const filtersToSave: Record<string, unknown> = { ...currentFilters }
    await createView(name, filtersToSave)
  }

  const activeView = views.find((v) => v.id === activeViewId)

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Saved Searches dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[14px] font-[400] cursor-pointer transition-colors ${
              activeView
                ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border border-[rgba(37,99,235,0.2)]'
                : 'bg-white text-[rgba(5,14,36,0.55)] border border-[rgba(5,14,36,0.08)] hover:border-[rgba(5,14,36,0.15)]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            {activeView ? activeView.name : 'Saved Searches'}
            {views.length > 0 && (
              <span className="ml-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[rgba(37,99,235,0.1)] text-[#2563EB] text-[0.65rem] font-semibold px-1">
                {views.length}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1 z-50 bg-white rounded-[10px] shadow-lg py-1 min-w-[280px] max-h-[340px] overflow-y-auto"
              style={{ border: '1px solid rgba(5,14,36,0.06)' }}
            >
              {/* Clear active view */}
              {activeView && (
                <button
                  onClick={() => { setActiveViewId(null); setDropdownOpen(false) }}
                  className="w-full text-left px-3 py-2 text-[0.78rem] text-[rgba(5,14,36,0.4)] hover:bg-gray-50 bg-transparent border-0 cursor-pointer border-b border-gray-100"
                >
                  Clear saved search
                </button>
              )}

              {views.length === 0 && (
                <div className="px-3 py-4 text-center text-[0.78rem] text-[rgba(5,14,36,0.35)]">
                  No saved searches yet
                </div>
              )}

              {views.map((v) => (
                <div
                  key={v.id}
                  onClick={() => handleApply(v)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-[0.78rem] cursor-pointer transition-colors group ${
                    activeViewId === v.id
                      ? 'bg-[#EFF6FF] text-[#2563EB]'
                      : 'text-[rgba(5,14,36,0.65)] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{v.name}</div>
                    <div className="text-[0.68rem] text-gray-400 truncate mt-0.5">
                      {filterSummary(v.filters)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Notify toggle */}
                    <button
                      onClick={(e) => handleToggleNotify(e, v)}
                      className={`p-1 rounded transition-colors ${
                        v.notify
                          ? 'text-[#2563EB] hover:bg-blue-50'
                          : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      } bg-transparent border-0 cursor-pointer`}
                      title={v.notify ? 'Notifications on - click to turn off' : 'Notify me of new matches'}
                    >
                      {v.notify ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(e, v.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 bg-transparent border-0 cursor-pointer transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Save current search option */}
              {hasActiveFilters && (
                <>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDropdownOpen(false)
                      setShowSaveModal(true)
                    }}
                    className="w-full text-left px-3 py-2.5 text-[0.78rem] font-medium text-[#2563EB] hover:bg-[#EFF6FF] bg-transparent border-0 cursor-pointer flex items-center gap-2"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Save Current Search
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Quick-save button when filters active but dropdown closed */}
        {hasActiveFilters && views.length === 0 && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 bg-white text-[rgba(5,14,36,0.5)] border border-[rgba(5,14,36,0.08)] hover:border-[rgba(5,14,36,0.15)] rounded-[8px] px-3 py-1.5 text-[14px] font-[400] cursor-pointer transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" />
            Save Search
          </button>
        )}
      </div>

      {showSaveModal && (
        <SaveModal onClose={() => setShowSaveModal(false)} onSave={handleSave} />
      )}
    </>
  )
}
