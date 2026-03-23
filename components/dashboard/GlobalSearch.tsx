'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, MapPin, ArrowRight, Hash,
  LayoutDashboard, Store, Users, PhoneOutgoing,
  FolderOpen, FileSignature, Calculator, Sparkles,
  Settings, MessagesSquare, Compass,
  Plus, FileText, UserPlus, BarChart3, Zap,
  ArrowUpRight, Command,
} from 'lucide-react'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface BuyerResult {
  id: string
  firstName: string | null
  lastName: string | null
  entityName: string | null
  phone: string | null
  status: string
  buyerScore: number
  preferredMarkets: string[]
}

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  category: 'page' | 'action' | 'buyer' | 'shortcut'
  action: () => void
  keywords?: string
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function scoreGrade(s: number) { return s >= 90 ? 'A' : s >= 70 ? 'B' : s >= 50 ? 'C' : 'D' }
function scoreColor(g: string) {
  switch (g) {
    case 'A': return '#2563EB'
    case 'B': return '#60A5FA'
    case 'C': return '#F59E0B'
    default: return 'rgba(5,14,36,0.3)'
  }
}
function buyerName(b: BuyerResult) {
  if (b.entityName) return b.entityName
  return [b.firstName, b.lastName].filter(Boolean).join(' ') || 'Unnamed'
}

const CATEGORY_LABELS: Record<string, string> = {
  page: 'Pages',
  action: 'Actions',
  buyer: 'Buyers',
  shortcut: 'Shortcuts',
}

const CATEGORY_ORDER = ['page', 'action', 'buyer', 'shortcut']

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [buyerResults, setBuyerResults] = useState<BuyerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const go = useCallback((path: string) => {
    setOpen(false)
    router.push(path)
  }, [router])

  /* ── Static commands ───────────────────────────────────────────────────── */

  const pages: CommandItem[] = [
    { id: 'p-dash', label: 'Dashboard', description: 'Analytics & overview', icon: <LayoutDashboard className="w-4 h-4" />, category: 'page', action: () => go('/dashboard'), keywords: 'home overview kpis' },
    { id: 'p-market', label: 'Marketplace', description: 'Browse & list deals', icon: <Store className="w-4 h-4" />, category: 'page', action: () => go('/marketplace'), keywords: 'listings browse deals buy sell' },
    { id: 'p-disc', label: 'Discovery', description: 'Find properties & buyers', icon: <Compass className="w-4 h-4" />, category: 'page', action: () => go('/discovery'), keywords: 'search find properties map' },
    { id: 'p-crm', label: 'CRM', description: 'Buyer contacts & pipeline', icon: <Users className="w-4 h-4" />, category: 'page', action: () => go('/crm'), keywords: 'contacts buyers pipeline leads' },
    { id: 'p-out', label: 'Outreach', description: 'Campaigns & calls', icon: <PhoneOutgoing className="w-4 h-4" />, category: 'page', action: () => go('/outreach'), keywords: 'campaigns calls sms email dialer' },
    { id: 'p-deals', label: 'My Deals', description: 'Track submitted properties', icon: <FolderOpen className="w-4 h-4" />, category: 'page', action: () => go('/deals'), keywords: 'properties submitted tracking' },
    { id: 'p-contracts', label: 'Contracts', description: 'Assignments & signatures', icon: <FileSignature className="w-4 h-4" />, category: 'page', action: () => go('/contracts'), keywords: 'assignments signatures legal' },
    { id: 'p-community', label: 'Community', description: 'Feed, groups & messages', icon: <MessagesSquare className="w-4 h-4" />, category: 'page', action: () => go('/community'), keywords: 'feed groups chat social' },
    { id: 'p-ai', label: 'Ask AI', description: 'AI assistant', icon: <Sparkles className="w-4 h-4" />, category: 'page', action: () => go('/gpt'), keywords: 'chat assistant claude help' },
    { id: 'p-settings', label: 'Settings', description: 'Profile, billing & team', icon: <Settings className="w-4 h-4" />, category: 'page', action: () => go('/settings'), keywords: 'profile billing team account preferences' },
  ]

  const actions: CommandItem[] = [
    { id: 'a-deal', label: 'Create New Deal', icon: <Plus className="w-4 h-4" />, category: 'action', action: () => go('/deals/new'), keywords: 'add new deal property' },
    { id: 'a-analyze', label: 'Analyze a Property', icon: <Calculator className="w-4 h-4" />, category: 'action', action: () => go('/deals/analyze'), keywords: 'analyze comps arv property' },
    { id: 'a-campaign', label: 'Start a Campaign', icon: <Zap className="w-4 h-4" />, category: 'action', action: () => go('/outreach'), keywords: 'campaign outreach sms call email' },
    { id: 'a-buyer', label: 'Add Buyer to CRM', icon: <UserPlus className="w-4 h-4" />, category: 'action', action: () => go('/crm'), keywords: 'add buyer contact crm' },
    { id: 'a-list', label: 'List a Deal on Marketplace', icon: <Store className="w-4 h-4" />, category: 'action', action: () => go('/marketplace'), keywords: 'post listing marketplace sell' },
    { id: 'a-discover', label: 'Search Properties', icon: <Search className="w-4 h-4" />, category: 'action', action: () => go('/discovery'), keywords: 'search find properties buyers discovery' },
  ]

  const shortcuts: CommandItem[] = [
    { id: 's-billing', label: 'Billing & Subscription', icon: <FileText className="w-4 h-4" />, category: 'shortcut', action: () => go('/settings?section=billing'), keywords: 'billing plan subscription payment invoice' },
    { id: 's-team', label: 'Team Management', icon: <Users className="w-4 h-4" />, category: 'shortcut', action: () => go('/settings?section=team'), keywords: 'team invite members permissions' },
    { id: 's-privacy', label: 'Data & Privacy', icon: <Settings className="w-4 h-4" />, category: 'shortcut', action: () => go('/settings?section=privacy'), keywords: 'data export privacy delete' },
    { id: 's-reports', label: 'View Reports', icon: <BarChart3 className="w-4 h-4" />, category: 'shortcut', action: () => go('/dashboard'), keywords: 'reports analytics stats revenue' },
  ]

  /* ── Buyer items ───────────────────────────────────────────────────────── */

  const buyerItems: CommandItem[] = buyerResults.map(b => ({
    id: `b-${b.id}`,
    label: buyerName(b),
    description: [b.preferredMarkets?.[0], b.phone?.slice(0, 14)].filter(Boolean).join(' · ') || undefined,
    icon: (
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.5rem] font-semibold text-white flex-shrink-0" style={{ background: scoreColor(scoreGrade(b.buyerScore)) }}>
        {scoreGrade(b.buyerScore)}
      </div>
    ),
    category: 'buyer' as const,
    action: () => go(`/crm/${b.id}`),
  }))

  /* ── Filter items ──────────────────────────────────────────────────────── */

  const allStatic = [...pages, ...actions, ...shortcuts]

  const filteredStatic = query.trim()
    ? allStatic.filter(item => {
        const q = query.toLowerCase()
        return (
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.keywords?.toLowerCase().includes(q)
        )
      })
    : allStatic.slice(0, 6) // show top pages when empty

  const allItems = query.trim() ? [...filteredStatic, ...buyerItems] : filteredStatic

  /* ── Group by category ─────────────────────────────────────────────────── */

  const grouped = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: allItems.filter(i => i.category === cat),
    }))
    .filter(g => g.items.length > 0)

  const flatItems = grouped.flatMap(g => g.items)

  /* ── Keyboard listener ─────────────────────────────────────────────────── */

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
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
      setBuyerResults([])
      setSelectedIdx(0)
    }
  }, [open])

  /* ── Buyer search ──────────────────────────────────────────────────────── */

  const searchBuyers = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setBuyerResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/buyers?search=${encodeURIComponent(q)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        setBuyerResults(data.buyers || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => searchBuyers(query), 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, searchBuyers])

  /* ── Keep selectedIdx in bounds ────────────────────────────────────────── */

  useEffect(() => {
    setSelectedIdx(0)
  }, [query, buyerResults.length])

  /* ── Scroll selected into view ─────────────────────────────────────────── */

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  /* ── Key navigation ────────────────────────────────────────────────────── */

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, flatItems.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && flatItems[selectedIdx]) {
      e.preventDefault()
      flatItems[selectedIdx].action()
    }
  }

  if (!open) return null

  let globalIdx = -1

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
    >
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{ position: 'absolute', inset: 0, background: 'rgba(5,14,36,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'relative',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 24px 80px rgba(5,14,36,0.18), 0 8px 24px rgba(5,14,36,0.08), 0 0 0 1px rgba(5,14,36,0.06)',
          width: '100%',
          maxWidth: 620,
          margin: '0 16px',
          overflow: 'hidden',
          animation: 'searchSlideIn 0.15s ease-out',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
          <Search style={{ width: 20, height: 20, color: '#2563EB', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions, buyers..."
            style={{
              flex: 1,
              fontSize: '0.92rem',
              fontWeight: 400,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#0B1224',
              fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            }}
          />
          {loading && (
            <div style={{ width: 16, height: 16, border: '2px solid rgba(5,14,36,0.08)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
          )}
          <kbd style={{ fontSize: '0.58rem', color: 'rgba(5,14,36,0.3)', background: 'rgba(5,14,36,0.04)', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 4, padding: '3px 7px', fontFamily: 'inherit', fontWeight: 500, boxShadow: '0 1px 0 rgba(5,14,36,0.04)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 0' }}>
          {flatItems.length === 0 && query.trim() && !loading && (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.84rem', color: 'rgba(5,14,36,0.5)', marginBottom: 4 }}>No results for &ldquo;{query}&rdquo;</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(5,14,36,0.3)' }}>Try searching for pages, actions, or buyer names</div>
            </div>
          )}

          {grouped.map(group => (
            <div key={group.category}>
              {/* Category header */}
              <div style={{ padding: '10px 20px 4px', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(5,14,36,0.3)' }}>
                {group.label}
              </div>

              {group.items.map(item => {
                globalIdx++
                const idx = globalIdx
                const isSelected = idx === selectedIdx
                return (
                  <button
                    key={item.id}
                    data-idx={idx}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 20px',
                      margin: '0 8px',
                      width: 'calc(100% - 16px)',
                      textAlign: 'left',
                      background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.08s ease',
                      fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: isSelected ? 'rgba(37,99,235,0.1)' : 'rgba(5,14,36,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: isSelected ? '#2563EB' : 'rgba(5,14,36,0.4)',
                      transition: 'all 0.08s ease',
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.84rem',
                        fontWeight: 500,
                        color: isSelected ? '#0B1224' : 'rgba(5,14,36,0.75)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div style={{
                          fontSize: '0.7rem',
                          color: 'rgba(5,14,36,0.35)',
                          marginTop: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: '0.6rem', color: 'rgba(5,14,36,0.25)', fontWeight: 500 }}>Open</span>
                        <ArrowUpRight style={{ width: 12, height: 12, color: 'rgba(5,14,36,0.2)' }} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderTop: '1px solid rgba(5,14,36,0.06)',
            background: 'rgba(5,14,36,0.015)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', color: 'rgba(5,14,36,0.3)' }}>
              <kbd style={{ fontSize: '0.56rem', background: 'rgba(5,14,36,0.05)', borderRadius: 3, padding: '1px 4px', fontFamily: 'inherit', border: '1px solid rgba(5,14,36,0.06)' }}>↑↓</kbd>
              Navigate
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', color: 'rgba(5,14,36,0.3)' }}>
              <kbd style={{ fontSize: '0.56rem', background: 'rgba(5,14,36,0.05)', borderRadius: 3, padding: '1px 4px', fontFamily: 'inherit', border: '1px solid rgba(5,14,36,0.06)' }}>↵</kbd>
              Open
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', color: 'rgba(5,14,36,0.3)' }}>
              <kbd style={{ fontSize: '0.56rem', background: 'rgba(5,14,36,0.05)', borderRadius: 3, padding: '1px 4px', fontFamily: 'inherit', border: '1px solid rgba(5,14,36,0.06)' }}>esc</kbd>
              Close
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Command style={{ width: 10, height: 10, color: 'rgba(5,14,36,0.2)' }} />
            <span style={{ fontSize: '0.6rem', color: 'rgba(5,14,36,0.2)', fontWeight: 500 }}>DealFlow AI</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes searchSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      ` }} />
    </div>
  )
}
