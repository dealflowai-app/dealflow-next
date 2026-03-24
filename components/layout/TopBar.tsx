'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Sparkles, Loader2, ArrowRight,
  Menu, Calculator,
} from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useMobileSidebar } from './MobileSidebarContext'

/* ─── AI Quick Ask ────────────────────────────────────────────────────────── */

interface ChatMsg { role: 'user' | 'assistant'; content: string }

function AIQuickAsk() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [streaming, setStreaming] = useState('')
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 50)
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll when new messages/streaming content arrive
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, streaming])

  const close = () => { setOpen(false); setQuery(''); setMessages([]); setStreaming('') }

  const ask = async () => {
    if (!query.trim() || loading) return
    const userMsg: ChatMsg = { role: 'user', content: query.trim() }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setQuery('')
    setLoading(true)
    setStreaming('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      })
      if (!res.ok || !res.body) {
        setMessages([...allMessages, { role: 'assistant', content: 'Something went wrong.' }])
        setLoading(false)
        return
      }
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
            if (evt.token) { text += evt.token; setStreaming(text) }
          } catch { /* skip */ }
        }
      }
      const finalText = text || 'No response received.'
      setMessages([...allMessages, { role: 'assistant', content: finalText }])
      setStreaming('')
    } catch {
      setMessages([...allMessages, { role: 'assistant', content: 'Network error.' }])
    } finally { setLoading(false) }
  }

  const suggestions = [
    'What deals should I focus on?',
    'Summarize my pipeline',
    'Best markets to target?',
  ]

  const hasMessages = messages.length > 0

  return (
    <div className="relative" ref={panelRef}>
      <button
        data-tour="ask-ai-btn"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-[34px] pl-3 pr-3.5 rounded-[8px] text-[0.76rem] font-[500] cursor-pointer transition-all bg-[#0B1224] text-white hover:bg-[#1a2640] active:scale-[0.97]"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        Ask AI
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+10px)] right-0 w-[420px] max-w-[calc(100vw-32px)] bg-white rounded-[16px] overflow-hidden z-[200] flex flex-col"
          style={{ boxShadow: '0 24px 80px rgba(5,14,36,0.18), 0 8px 24px rgba(5,14,36,0.08), 0 0 0 1px rgba(5,14,36,0.06)', maxHeight: 480 }}
        >
          {/* Messages area */}
          {hasMessages && (
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-[10px] text-[0.8rem] leading-[1.6] whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-[#0B1224] text-white'
                        : 'text-[rgba(5,14,36,0.75)]'
                    }`}
                    style={m.role === 'assistant' ? { background: 'rgba(5,14,36,0.04)' } : {}}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] px-3 py-2 rounded-[10px] text-[0.8rem] leading-[1.6] whitespace-pre-wrap text-[rgba(5,14,36,0.75)]" style={{ background: 'rgba(5,14,36,0.04)' }}>
                    {streaming}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggestions (only when no messages) */}
          {!hasMessages && !loading && (
            <div className="px-4 py-3">
              <div className="text-[0.66rem] text-[rgba(5,14,36,0.3)] uppercase tracking-wider font-medium mb-2">Try asking</div>
              <div className="space-y-1">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); setTimeout(() => { setQuery(s) }, 0) }}
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

          {/* Input row */}
          <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderTop: hasMessages ? '1px solid rgba(5,14,36,0.06)' : 'none' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask(); if (e.key === 'Escape') close() }}
              placeholder={hasMessages ? 'Follow up...' : 'Ask anything...'}
              className="flex-1 text-[0.84rem] bg-transparent border-0 outline-none text-[#0B1224] placeholder-[rgba(5,14,36,0.3)] font-[400]"
              style={{ fontFamily: 'inherit' }}
            />
            {query.trim() && (
              <button
                onClick={ask}
                disabled={loading}
                aria-label="Send AI question"
                className="w-7 h-7 rounded-[9px] bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-200 flex items-center justify-center border-0 cursor-pointer transition-colors flex-shrink-0"
              >
                {loading
                  ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                  : <ArrowRight className="w-3 h-3 text-white" />
                }
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'rgba(5,14,36,0.015)', borderTop: '1px solid rgba(5,14,36,0.04)' }}>
            {hasMessages ? (
              <button onClick={() => { setMessages([]); setStreaming('') }} className="text-[0.64rem] text-[rgba(5,14,36,0.35)] hover:text-[rgba(5,14,36,0.55)] bg-transparent border-0 cursor-pointer font-[inherit]">
                Clear chat
              </button>
            ) : <span />}
            <Link href="/gpt" onClick={close} className="flex items-center gap-1 text-[0.64rem] text-[#2563EB] hover:text-[#1D4ED8] no-underline font-[500] transition-colors">
              Open full chat <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Deal Calculator Button ──────────────────────────────────────────────── */

function CalcButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('toggle-deal-calculator'))}
      className="flex items-center justify-center w-[34px] h-[34px] rounded-[8px] cursor-pointer transition-colors"
      style={{ border: '1px solid var(--border-light)', background: 'var(--white)' }}
      title="Deal Calculator (Alt+C)"
      aria-label="Deal calculator"
    >
      <Calculator className="w-4 h-4" style={{ color: 'var(--dash-muted)' }} />
    </button>
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
  const { toggle: toggleSidebar } = useMobileSidebar()

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
      role="banner"
      className="flex-shrink-0 flex items-center gap-2 md:gap-4 px-3 md:px-5"
      style={{
        height: 'var(--topbar-h)',
        background: 'var(--white)',
        borderBottom: '1px solid var(--topbar-border)',
      }}
    >
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="flex md:hidden items-center justify-center w-[34px] h-[34px] rounded-[8px] border cursor-pointer transition-colors flex-shrink-0"
        style={{ borderColor: 'var(--border-light)', background: 'transparent' }}
        aria-label="Toggle navigation menu"
      >
        <Menu className="w-[18px] h-[18px]" style={{ color: 'var(--dash-muted)' }} />
      </button>

      {/* Left: Breadcrumb-style page context */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
        {pageLabel ? (
          <>
            <span className="text-[0.78rem] font-[400] hidden sm:inline" style={{ color: 'var(--dash-muted)' }}>DealFlow AI</span>
            <span className="text-[0.72rem] font-[300] mx-0.5 hidden sm:inline" style={{ color: 'var(--dash-muted)' }}>/</span>
            <span className="text-[0.82rem] font-[500] tracking-[-0.01em] truncate" style={{ color: 'var(--dash-text)' }}>{pageLabel}</span>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[0.82rem]">{timeIcon}</span>
            <span className="text-[0.82rem] font-[400] truncate" style={{ color: 'var(--dash-muted)' }}>
              {hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <CalcButton />
        </div>

        <div className="w-px h-4 hidden md:block" style={{ background: 'var(--nav-border)' }} />

        {/* Search trigger — icon-only on mobile, full on desktop */}
        <button
          data-tour="search-btn"
          onClick={openSearch}
          aria-label="Search (Ctrl+K)"
          className="topbar-search-btn flex items-center gap-2.5 h-[34px] px-3.5 rounded-[8px] cursor-pointer transition-all group"
          style={{ border: '1px solid var(--border-light)', background: 'var(--dash-card)' }}
        >
          <Search className="w-3.5 h-3.5 transition-colors" style={{ color: 'var(--dash-muted)' }} />
          <span className="text-[0.76rem] font-[400] flex-1 text-left hidden md:inline" style={{ color: 'var(--dash-muted)' }}>Search...</span>
          <div className="items-center gap-1 hidden md:flex">
            <kbd className="text-[0.56rem] rounded-[4px] px-1.5 py-[2px] font-[inherit] font-[500] leading-none" style={{ color: 'var(--dash-muted)', background: 'var(--white)', border: '1px solid var(--border-light)' }}>Ctrl</kbd>
            <kbd className="text-[0.56rem] rounded-[4px] px-1.5 py-[2px] font-[inherit] font-[500] leading-none" style={{ color: 'var(--dash-muted)', background: 'var(--white)', border: '1px solid var(--border-light)' }}>K</kbd>
          </div>
        </button>

        <div className="w-px h-4 hidden md:block" style={{ background: 'var(--nav-border)' }} />

        <div className="hidden sm:block">
          <AIQuickAsk />
        </div>

        <div className="w-px h-4 hidden sm:block" style={{ background: 'var(--nav-border)' }} />

        <NotificationBell />
      </div>
    </div>
  )
}
