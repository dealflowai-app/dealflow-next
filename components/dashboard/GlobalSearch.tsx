'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'

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
    case 'A': return { color: '#ffffff', bg: '#2563EB' }
    case 'B': return { color: '#ffffff', bg: '#60A5FA' }
    case 'C': return { color: '#ffffff', bg: '#F59E0B' }
    default: return { color: '#ffffff', bg: 'rgba(5,14,36,0.3)' }
  }
}
function statusStyle(s: string) {
  switch (s) {
    case 'HIGH_CONFIDENCE': return { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' }
    case 'RECENTLY_VERIFIED': return { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' }
    case 'ACTIVE': return { color: 'rgba(5,14,36,0.5)', bg: 'rgba(5,14,36,0.04)' }
    case 'DORMANT': return { color: 'rgba(5,14,36,0.4)', bg: 'rgba(5,14,36,0.04)' }
    case 'DO_NOT_CALL': return { color: '#ef4444', bg: 'rgba(239,68,68,0.06)' }
    default: return { color: 'rgba(5,14,36,0.5)', bg: 'rgba(5,14,36,0.04)' }
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

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setSelectedIdx(0)
    }
  }, [open])

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5,14,36,0.3)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          background: 'var(--white, #ffffff)',
          borderRadius: 14,
          boxShadow: 'rgba(5,14,36,0.08) 0px 4px 24px, rgba(5,14,36,0.04) 0px 1px 4px',
          width: '100%',
          maxWidth: 580,
          margin: '0 16px',
          overflow: 'hidden',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid rgba(5,14,36,0.08)',
          }}
        >
          <Search style={{ width: 18, height: 18, color: 'var(--muted-text, #9CA3AF)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search buyers by name, phone, email, market..."
            style={{
              flex: 1,
              fontSize: '0.88rem',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--navy-heading, #0B1224)',
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              fontSize: '0.6rem',
              color: 'var(--muted-text, #9CA3AF)',
              background: 'rgba(5,14,36,0.04)',
              border: '1px solid rgba(5,14,36,0.08)',
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {!query.trim() && (
            <div style={{ padding: '32px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted-text, #9CA3AF)', margin: 0 }}>Type to search buyers...</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--border-med, #E5E7EB)', marginTop: 4 }}>Search by name, phone, email, or market</p>
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div style={{ padding: '32px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--body-text, #4B5563)', margin: 0 }}>No buyers found for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {results.map((r, i) => {
            const grade = scoreGrade(r.buyerScore)
            const sc = scoreColor(grade)
            const ss = statusStyle(r.status)
            return (
              <button
                key={r.id}
                onClick={() => navigate(r.id)}
                onMouseEnter={() => setSelectedIdx(i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  textAlign: 'left',
                  background: i === selectedIdx ? 'var(--blue-50, #EFF6FF)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#0B1224',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'white' }}>
                      {(r.firstName?.[0] || r.entityName?.[0] || '?').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--navy-heading, #0B1224)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{buyerName(r)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      {r.preferredMarkets?.[0] && (
                        <span style={{ fontSize: '0.66rem', color: 'var(--muted-text, #9CA3AF)', display: 'flex', alignItems: 'center', gap: 2 }}>
                          <MapPin style={{ width: 10, height: 10 }} />{r.preferredMarkets[0]}
                        </span>
                      )}
                      {r.phone && <span style={{ fontSize: '0.66rem', color: 'var(--muted-text, #9CA3AF)' }}>{r.phone.slice(0, 10)}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: sc.color, background: sc.bg }}>{grade}</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20, color: ss.color, background: ss.bg }}>{displayStatus(r.status)}</span>
                </div>
              </button>
            )
          })}

          {loading && (
            <div style={{ padding: '24px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: '2px solid rgba(5,14,36,0.08)',
                  borderTopColor: '#2563EB',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      ` }} />
    </div>
  )
}
