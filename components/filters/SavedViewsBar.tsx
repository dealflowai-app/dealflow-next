'use client'

import { useState, useRef, useEffect } from 'react'
import { Bookmark, ChevronDown, X, Loader2, Trash2 } from 'lucide-react'
import { useSavedViews, type SavedView } from '@/lib/hooks/useSavedViews'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

/* ─── Save View Modal ─── */
function SaveViewModal({
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
            style={{ fontFamily: FONT, fontWeight: 700, fontSize: '16px', color: '#0B1224', letterSpacing: '-0.02em' }}
            className="m-0"
          >
            Save Current View
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
          placeholder="e.g. Hot Buyers in Dallas"
          className="w-full border border-[rgba(5,14,36,0.1)] rounded-[8px] px-3 py-2.5 text-[0.84rem] outline-none focus:border-[#2563EB] transition-colors mb-3"
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

/* ─── Main SavedViewsBar ─── */
export default function SavedViewsBar({
  page,
  currentFilters,
  onApplyView,
  hasActiveFilters,
}: {
  page: 'crm' | 'deals' | 'discovery'
  currentFilters: Record<string, string>
  onApplyView: (filters: Record<string, string>) => void
  hasActiveFilters: boolean
}) {
  const { views, createView, deleteView } = useSavedViews(page)
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
    onApplyView(view.filters)
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

  async function handleSave(name: string) {
    await createView(name, currentFilters)
  }

  const activeView = views.find((v) => v.id === activeViewId)

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Saved Views dropdown */}
        {views.length > 0 && (
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-[0.8rem] font-medium cursor-pointer transition-colors ${
                activeView
                  ? 'bg-[rgba(37,99,235,0.08)] text-[#2563EB] border border-[rgba(37,99,235,0.2)]'
                  : 'bg-white text-[rgba(5,14,36,0.55)] border border-[rgba(5,14,36,0.08)] hover:border-[rgba(5,14,36,0.15)]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              {activeView ? activeView.name : 'Saved Views'}
              <ChevronDown className="w-3 h-3" />
            </button>
            {dropdownOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-50 bg-white rounded-[10px] shadow-lg py-1 min-w-[200px] max-h-[260px] overflow-y-auto"
                style={{ border: '1px solid rgba(5,14,36,0.06)' }}
              >
                {activeView && (
                  <button
                    onClick={() => { setActiveViewId(null); setDropdownOpen(false) }}
                    className="w-full text-left px-3 py-2 text-[0.78rem] text-[rgba(5,14,36,0.4)] hover:bg-gray-50 bg-transparent border-0 cursor-pointer"
                  >
                    Clear saved view
                  </button>
                )}
                {views.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleApply(v)}
                    className={`flex items-center justify-between px-3 py-2 text-[0.78rem] cursor-pointer transition-colors group ${
                      activeViewId === v.id ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[rgba(5,14,36,0.65)] hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate flex-1">{v.name}</span>
                    <button
                      onClick={(e) => handleDelete(e, v.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 bg-transparent border-0 cursor-pointer transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Save current view button */}
        {hasActiveFilters && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 bg-white text-[rgba(5,14,36,0.5)] border border-[rgba(5,14,36,0.08)] hover:border-[rgba(5,14,36,0.15)] rounded-[8px] px-3 py-2 text-[0.8rem] font-medium cursor-pointer transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" />
            Save View
          </button>
        )}
      </div>

      {showSaveModal && (
        <SaveViewModal onClose={() => setShowSaveModal(false)} onSave={handleSave} />
      )}
    </>
  )
}
