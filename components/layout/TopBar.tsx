'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Sparkles, X, Send, Loader2, ArrowRight,
  Plus,
  LayoutDashboard, MessagesSquare, Store, Users,
  PhoneOutgoing, Calculator, FolderOpen, FileSignature,
  Settings,
} from 'lucide-react'
import NotificationBell from './NotificationBell'

/* ─── AI Quick Ask ────────────────────────────────────────────────────────── */

function AIQuickAsk() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 50)
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { setOpen(false); setQuery(''); setAnswer('') }

  const ask = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setAnswer('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: query }] }),
      })
      if (!res.ok || !res.body) { setAnswer('Something went wrong.'); setLoading(false); return }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const evt = JSON.parse(payload)
            if (evt.type === 'text' && evt.text) { text += evt.text; setAnswer(text) }
          } catch { /* skip */ }
        }
      }
      if (!text) setAnswer('No response received.')
    } catch { setAnswer('Network error.') }
    finally { setLoading(false) }
  }

  const suggestions = [
    'What deals should I focus on?',
    'Summarize my pipeline',
    'Best markets to target?',
  ]

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-[34px] pl-3 pr-3.5 rounded-[8px] text-[0.76rem] font-[500] cursor-pointer transition-all bg-[#0B1224] text-white hover:bg-[#1a2640] active:scale-[0.97]"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Ask AI
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+10px)] right-0 w-[420px] max-w-[calc(100vw-32px)] bg-white rounded-[16px] overflow-hidden z-[200]"
          style={{ boxShadow: '0 24px 80px rgba(5,14,36,0.18), 0 8px 24px rgba(5,14,36,0.08), 0 0 0 1px rgba(5,14,36,0.06)' }}
        >
          {/* Input row */}
          <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
            <div className="w-7 h-7 rounded-[9px] bg-[#0B1224] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask(); if (e.key === 'Escape') close() }}
              placeholder="Ask anything..."
              className="flex-1 text-[0.84rem] bg-transparent border-0 outline-none text-[#0B1224] placeholder-[rgba(5,14,36,0.3)] font-[400]"
              style={{ fontFamily: 'inherit' }}
            />
            {query.trim() && (
              <button
                onClick={ask}
                disabled={loading}
                className="w-7 h-7 rounded-[9px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-200 flex items-center justify-center border-0 cursor-pointer transition-colors flex-shrink-0"
              >
                {loading
                  ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                  : <ArrowRight className="w-3 h-3 text-white" />
                }
              </button>
            )}
          </div>

          {/* Answer */}
          {answer && (
            <div className="px-4 py-3.5 max-h-[300px] overflow-y-auto" style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
              <p className="text-[0.8rem] text-[rgba(5,14,36,0.7)] leading-[1.7] whitespace-pre-wrap m-0">{answer}</p>
            </div>
          )}

          {/* Suggestions (only when no answer yet) */}
          {!answer && !loading && (
            <div className="px-4 py-3">
              <div className="text-[0.66rem] text-[rgba(5,14,36,0.3)] uppercase tracking-wider font-medium mb-2">Try asking</div>
              <div className="space-y-1">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); setTimeout(ask, 0) }}
                    className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-[8px] text-[0.78rem] text-[rgba(5,14,36,0.55)] hover:bg-[rgba(5,14,36,0.03)] hover:text-[rgba(5,14,36,0.75)] border-0 bg-transparent cursor-pointer transition-colors"
                    style={{ fontFamily: 'inherit' }}
                  >
                    <ArrowRight className="w-3 h-3 flex-shrink-0 opacity-40" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'rgba(5,14,36,0.015)', borderTop: '1px solid rgba(5,14,36,0.04)' }}>
            <span className="text-[0.62rem] text-[rgba(5,14,36,0.25)]">Powered by Claude</span>
            <Link href="/gpt" onClick={close} className="flex items-center gap-1 text-[0.64rem] text-[#2563EB] hover:text-[#1D4ED8] no-underline font-[500] transition-colors">
              Open full chat <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Quick Action Button ─────────────────────────────────────────────────── */

function QuickActions() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const actions: { label: string; href: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { label: 'New Deal', href: '/deals/new', Icon: FolderOpen },
    { label: 'Discovery', href: '/discovery', Icon: Search },
    { label: 'Analyze Property', href: '/deals/analyze', Icon: Calculator },
    { label: 'Start Campaign', href: '/outreach', Icon: PhoneOutgoing },
    { label: 'Add Buyer to CRM', href: '/crm', Icon: Users },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-[34px] h-[34px] rounded-[8px] border border-[rgba(5,14,36,0.06)] bg-white hover:bg-[rgba(5,14,36,0.03)] cursor-pointer transition-colors"
      >
        <Plus className="w-4 h-4 text-[rgba(5,14,36,0.5)]" />
      </button>
      {open && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 w-[200px] bg-white rounded-[12px] py-1.5 z-[200]"
          style={{ boxShadow: '0 12px 40px rgba(5,14,36,0.12), 0 0 0 1px rgba(5,14,36,0.06)' }}
        >
          <div className="px-3 py-1.5 text-[0.62rem] text-[rgba(5,14,36,0.3)] uppercase tracking-wider font-medium">Quick Actions</div>
          {actions.map(a => (
            <Link
              key={a.href}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[0.78rem] text-[rgba(5,14,36,0.65)] hover:bg-[rgba(5,14,36,0.03)] hover:text-[#0B1224] no-underline transition-colors"
            >
              <a.Icon className="w-3.5 h-3.5 text-[rgba(5,14,36,0.4)]" />
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Page Title ──────────────────────────────────────────────────────────── */

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/community': 'Feed',
  '/marketplace': 'Marketplace',
  '/discovery': 'Discovery',
  '/crm': 'CRM',
  '/outreach': 'Outreach',
  '/deals': 'My Deals',
  '/contracts': 'Contracts',
  '/gpt': 'Ask AI',
  '/settings': 'Settings',
}

/* ─── Top Bar ─────────────────────────────────────────────────────────────── */

export default function TopBar() {
  const pathname = usePathname()

  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
  }

  // Find current page info
  const pageKey = Object.keys(PAGE_TITLES).find(k => pathname === k || pathname.startsWith(k + '/'))
  const pageLabel = pageKey ? PAGE_TITLES[pageKey] : null

  // Current time greeting
  const hour = new Date().getHours()
  const timeIcon = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙'

  return (
    <div
      className="flex-shrink-0 flex items-center gap-4 px-5"
      style={{
        height: 'var(--topbar-h)',
        background: '#ffffff',
        borderBottom: '1px solid var(--topbar-border)',
      }}
    >
      {/* Left: Breadcrumb-style page context */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {pageLabel ? (
          <>
            <span className="text-[0.78rem] text-[rgba(5,14,36,0.3)] font-[400]">DealFlow AI</span>
            <span className="text-[0.72rem] text-[rgba(5,14,36,0.15)] font-[300] mx-0.5">/</span>
            <span className="text-[0.82rem] font-[500] text-[#0B1224] tracking-[-0.01em]">{pageLabel}</span>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[0.82rem]">{timeIcon}</span>
            <span className="text-[0.82rem] text-[rgba(5,14,36,0.4)] font-[400]">
              {hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <QuickActions />

        <div className="w-px h-4 bg-[rgba(5,14,36,0.05)]" />

        {/* Search trigger */}
        <button
          onClick={openSearch}
          className="flex items-center gap-2.5 h-[34px] px-3.5 rounded-[8px] cursor-pointer transition-all border border-[rgba(5,14,36,0.06)] bg-[rgba(5,14,36,0.015)] hover:bg-[rgba(5,14,36,0.04)] hover:border-[rgba(5,14,36,0.12)] group"
          style={{ minWidth: 220 }}
        >
          <Search className="w-3.5 h-3.5 text-[rgba(5,14,36,0.25)] group-hover:text-[rgba(5,14,36,0.45)] transition-colors" />
          <span className="text-[0.76rem] text-[rgba(5,14,36,0.3)] font-[400] flex-1 text-left">Search...</span>
          <div className="flex items-center gap-1">
            <kbd className="text-[0.56rem] text-[rgba(5,14,36,0.3)] bg-white rounded-[4px] px-1.5 py-[2px] font-[inherit] font-[500] leading-none border border-[rgba(5,14,36,0.08)]" style={{ boxShadow: '0 1px 0 rgba(5,14,36,0.04)' }}>Ctrl</kbd>
            <kbd className="text-[0.56rem] text-[rgba(5,14,36,0.3)] bg-white rounded-[4px] px-1.5 py-[2px] font-[inherit] font-[500] leading-none border border-[rgba(5,14,36,0.08)]" style={{ boxShadow: '0 1px 0 rgba(5,14,36,0.04)' }}>K</kbd>
          </div>
        </button>

        <div className="w-px h-4 bg-[rgba(5,14,36,0.05)]" />

        <AIQuickAsk />

        <div className="w-px h-4 bg-[rgba(5,14,36,0.05)]" />

        <NotificationBell />
      </div>
    </div>
  )
}
