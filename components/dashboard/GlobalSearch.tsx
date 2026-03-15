'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, X } from 'lucide-react'

interface SearchResult {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  phone: string | null
  status: string
  buyerScore: number
  preferredMarkets: string[]
}

function scoreGrade(s: number) { return s >= 90 ? 'A' : s >= 70 ? 'B' : s >= 50 ? 'C' : 'D' }
function scoreColor(g: string) {
  switch (g) {
    case 'A': return 'text-emerald-700 bg-emerald-50'
    case 'B': return 'text-blue-700 bg-blue-50'
    case 'C': return 'text-amber-700 bg-amber-50'
    default: return 'text-red-700 bg-red-50'
  }
}
function statusStyle(s: string) {
  switch (s) {
    case 'HIGH_CONFIDENCE': return 'text-emerald-700 bg-emerald-50'
    case 'RECENTLY_VERIFIED': return 'text-blue-700 bg-blue-50'
    case 'ACTIVE': return 'text-gray-700 bg-gray-100'
    case 'DORMANT': return 'text-amber-700 bg-amber-50'
    case 'DO_NOT_CALL': return 'text-red-700 bg-red-50'
    default: return 'text-gray-700 bg-gray-100'
  }
}
function displayStatus(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
function buyerName(b: SearchResult) {
  if (b.entityName) return b.entityName
  return [b.firstName, b.lastName].filter(Boolean).join(' ') || 'Unnamed'
}

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Open with Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Auto-focus when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setSelectedIdx(0)
    }
  }, [open])

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/buyers?search=${encodeURIComponent(q)}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.buyers || [])
        setSelectedIdx(0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query), 200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search])

  function navigate(id: string) {
    setOpen(false)
    router.push(`/crm/${id}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[selectedIdx]) { navigate(results[selectedIdx].id) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-[600px] mx-4 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search buyers by name, phone, email, market..."
            className="flex-1 text-[0.92rem] bg-transparent border-0 outline-none placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-flex text-[0.62rem] text-gray-400 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {!query.trim() && (
            <div className="px-4 py-8 text-center">
              <p className="text-[0.82rem] text-gray-400">Type to search buyers...</p>
              <p className="text-[0.68rem] text-gray-300 mt-1">Search by name, phone, email, or market</p>
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[0.82rem] text-gray-500">No buyers found for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {results.map((r, i) => {
            const grade = scoreGrade(r.buyerScore)
            return (
              <button
                key={r.id}
                onClick={() => navigate(r.id)}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left bg-transparent border-0 cursor-pointer transition-colors ${i === selectedIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[0.62rem] font-medium text-gray-500">
                      {(r.firstName?.[0] || r.entityName?.[0] || '?').toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.84rem] font-medium text-gray-900 truncate">{buyerName(r)}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.preferredMarkets?.[0] && (
                        <span className="text-[0.66rem] text-gray-400 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />{r.preferredMarkets[0]}
                        </span>
                      )}
                      {r.phone && <span className="text-[0.66rem] text-gray-400">{r.phone.slice(0, 10)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={`text-[0.62rem] font-bold px-2 py-0.5 rounded-full ${scoreColor(grade)}`}>{grade}</span>
                  <span className={`text-[0.62rem] font-medium px-2 py-0.5 rounded-full ${statusStyle(r.status)}`}>{displayStatus(r.status)}</span>
                </div>
              </button>
            )
          })}

          {loading && (
            <div className="px-4 py-6 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-[#2563EB] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
