'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Store, Compass, Users, PhoneOutgoing,
  FolderOpen, FileSignature, Settings, MessagesSquare, Sparkles,
  Keyboard, X,
} from 'lucide-react'

/* ─── Shortcut definitions ────────────────────────────────────────────────── */

const SHORTCUTS = [
  { keys: 'g d', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { keys: 'g m', label: 'Marketplace', path: '/marketplace', icon: Store },
  { keys: 'g f', label: 'Discovery (Find)', path: '/discovery', icon: Compass },
  { keys: 'g c', label: 'CRM', path: '/crm', icon: Users },
  { keys: 'g o', label: 'Outreach', path: '/outreach', icon: PhoneOutgoing },
  { keys: 'g l', label: 'Deals (List)', path: '/deals', icon: FolderOpen },
  { keys: 'g t', label: 'Contracts', path: '/contracts', icon: FileSignature },
  { keys: 'g s', label: 'Settings', path: '/settings', icon: Settings },
  { keys: 'g p', label: 'Community (People)', path: '/community', icon: MessagesSquare },
  { keys: 'g a', label: 'Ask AI', path: '/gpt', icon: Sparkles },
] as const

const SECOND_KEY_MAP: Record<string, string> = {}
for (const s of SHORTCUTS) {
  const second = s.keys.split(' ')[1]
  SECOND_KEY_MAP[second] = s.path
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function KeyboardShortcuts() {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)
  const [pending, setPending] = useState(false)
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showToast, setShowToast] = useState(false)

  const clearPending = useCallback(() => {
    setPending(false)
    setShowToast(false)
    if (pendingTimer.current) {
      clearTimeout(pendingTimer.current)
      pendingTimer.current = null
    }
    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
      toastTimer.current = null
    }
  }, [])

  useEffect(() => {
    function isInputFocused() {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
      if ((el as HTMLElement).isContentEditable) return true
      return false
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isInputFocused()) return

      // ? → toggle help modal
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        setShowHelp(prev => !prev)
        clearPending()
        return
      }

      // Second key after 'g'
      if (pending) {
        const path = SECOND_KEY_MAP[e.key.toLowerCase()]
        if (path) {
          e.preventDefault()
          router.push(path)
        }
        clearPending()
        return
      }

      // First key 'g' → start pending
      if (e.key === 'g') {
        setPending(true)
        setShowToast(true)
        pendingTimer.current = setTimeout(() => {
          setPending(false)
          setShowToast(false)
        }, 500)
        // fade out toast slightly before pending expires
        toastTimer.current = setTimeout(() => {
          setShowToast(false)
        }, 480)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pending, clearPending, router])

  // Allow external triggering of help modal via custom event
  useEffect(() => {
    function handleShowHelp() {
      setShowHelp(true)
    }
    window.addEventListener('show-keyboard-shortcuts', handleShowHelp)
    return () => window.removeEventListener('show-keyboard-shortcuts', handleShowHelp)
  }, [])

  return (
    <>
      {/* ── Pending toast ───────────────────────────────────────────────────── */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            background: 'rgba(5,14,36,0.85)',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 600,
            fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            padding: '6px 14px',
            borderRadius: 8,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(5,14,36,0.25)',
            animation: 'kbToastIn 0.1s ease-out',
            letterSpacing: '0.04em',
          }}
        >
          g&thinsp;...
        </div>
      )}

      {/* ── Help modal ──────────────────────────────────────────────────────── */}
      {showHelp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 250,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setShowHelp(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(5,14,36,0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Modal */}
          <div
            style={{
              position: 'relative',
              background: '#ffffff',
              borderRadius: 12,
              boxShadow: '0 24px 80px rgba(5,14,36,0.18), 0 8px 24px rgba(5,14,36,0.08), 0 0 0 1px rgba(5,14,36,0.06)',
              width: '100%',
              maxWidth: 480,
              margin: '0 16px',
              overflow: 'hidden',
              animation: 'kbModalIn 0.15s ease-out',
              fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid rgba(5,14,36,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Keyboard style={{ width: 18, height: 18, color: '#2563EB' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'rgba(5,14,36,0.9)' }}>
                  Keyboard Shortcuts
                </span>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  color: 'rgba(5,14,36,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Shortcuts list */}
            <div style={{ padding: '12px 20px 8px' }}>
              {/* General section */}
              <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(5,14,36,0.3)', marginBottom: 8 }}>
                General
              </div>
              <ShortcutRow keys={['Ctrl', 'K']} label="Open search" />
              <ShortcutRow keys={['?']} label="Show this help" />

              {/* Navigation section */}
              <div style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(5,14,36,0.3)', marginTop: 16, marginBottom: 8 }}>
                Go to page
              </div>
              {SHORTCUTS.map(s => (
                <ShortcutRow
                  key={s.keys}
                  keys={s.keys.split(' ')}
                  label={s.label}
                  Icon={s.icon}
                />
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '10px 20px',
                borderTop: '1px solid rgba(5,14,36,0.06)',
                background: 'rgba(5,14,36,0.015)',
                fontSize: '0.64rem',
                color: 'rgba(5,14,36,0.3)',
              }}
            >
              Press <kbd style={kbdSmall}>g</kbd> then a letter to navigate. Press <kbd style={kbdSmall}>Esc</kbd> to close.
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kbToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes kbModalIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      ` }} />
    </>
  )
}

/* ─── Shortcut row sub-component ──────────────────────────────────────────── */

const kbdSmall: React.CSSProperties = {
  fontSize: '0.58rem',
  background: 'rgba(5,14,36,0.05)',
  border: '1px solid rgba(5,14,36,0.08)',
  borderRadius: 4,
  padding: '2px 6px',
  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
  fontWeight: 500,
  boxShadow: '0 1px 0 rgba(5,14,36,0.04)',
}

function ShortcutRow({ keys, label, Icon }: { keys: string[]; label: string; Icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon className="w-3.5 h-3.5 text-[rgba(5,14,36,0.35)]" />}
        <span style={{ fontSize: '0.8rem', color: 'rgba(5,14,36,0.7)', fontWeight: 450 }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {keys.map((k, i) => (
          <span key={i}>
            <kbd style={kbdSmall}>{k}</kbd>
            {i < keys.length - 1 && (
              <span style={{ fontSize: '0.6rem', color: 'rgba(5,14,36,0.2)', margin: '0 2px' }}>then</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
