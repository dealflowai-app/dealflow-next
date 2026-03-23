'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react'

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  /** Duration in ms before auto-dismiss. Default 4000. Set 0 to disable. */
  duration?: number
  /** Optional action button */
  action?: { label: string; onClick: () => void }
}

interface ToastItem {
  id: number
  message: string
  type: ToastType
  duration: number
  action?: { label: string; onClick: () => void }
  createdAt: number
  exiting?: boolean
}

export interface ToastAPI {
  /** Show a toast (backward-compat: defaults to info type) */
  (message: string, options?: ToastOptions): void
  success: (message: string, options?: ToastOptions) => void
  error: (message: string, options?: ToastOptions) => void
  warning: (message: string, options?: ToastOptions) => void
  info: (message: string, options?: ToastOptions) => void
}

type ShowToast = (message: string, type: ToastType, options?: ToastOptions) => void

const ToastContext = createContext<ShowToast>(() => {})

const MAX_VISIBLE = 3
const DEFAULT_DURATION = 4000

/* ═══════════════════════════════════════════════
   HOOK — useToast
   ═══════════════════════════════════════════════ */

export function useToast(): ToastAPI {
  const show = useContext(ToastContext)

  return useMemo(() => {
    // Build a callable function that also has .success/.error/.warning/.info
    const fn = (message: string, options?: ToastOptions) => show(message, 'info', options)
    fn.success = (message: string, options?: ToastOptions) => show(message, 'success', options)
    fn.error = (message: string, options?: ToastOptions) => show(message, 'error', options)
    fn.warning = (message: string, options?: ToastOptions) => show(message, 'warning', options)
    fn.info = (message: string, options?: ToastOptions) => show(message, 'info', options)
    return fn as ToastAPI
  }, [show])
}

/* ═══════════════════════════════════════════════
   ICONS (inline SVG to avoid extra deps)
   ═══════════════════════════════════════════════ */

function IconSuccess() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <circle cx="9" cy="9" r="9" fill="currentColor" fillOpacity="0.2" />
      <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconError() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <circle cx="9" cy="9" r="9" fill="currentColor" fillOpacity="0.2" />
      <path d="M6.5 6.5L11.5 11.5M11.5 6.5L6.5 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <path d="M9 1.5L17 16H1L9 1.5Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="0" />
      <path d="M9 7V10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="13" r="0.9" fill="currentColor" />
    </svg>
  )
}

function IconInfo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
      <circle cx="9" cy="9" r="9" fill="currentColor" fillOpacity="0.2" />
      <path d="M9 8V12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="5.5" r="0.9" fill="currentColor" />
    </svg>
  )
}

const ICON_MAP: Record<ToastType, () => JSX.Element> = {
  success: IconSuccess,
  error: IconError,
  warning: IconWarning,
  info: IconInfo,
}

/* ═══════════════════════════════════════════════
   STYLES per type
   ═══════════════════════════════════════════════ */

const TYPE_STYLES: Record<ToastType, { bg: string; text: string; progress: string; border: string }> = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    progress: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    progress: 'bg-red-500',
    border: 'border-red-200',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    progress: 'bg-amber-500',
    border: 'border-amber-200',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    progress: 'bg-blue-500',
    border: 'border-blue-200',
  },
}

/* ═══════════════════════════════════════════════
   SINGLE TOAST COMPONENT
   ═══════════════════════════════════════════════ */

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: number) => void
}) {
  const s = TYPE_STYLES[toast.type]
  const Icon = ICON_MAP[toast.type]
  const progressRef = useRef<HTMLDivElement>(null)

  // Animate progress bar
  useEffect(() => {
    if (toast.duration <= 0 || !progressRef.current) return
    const el = progressRef.current
    // Force reflow then animate
    el.style.width = '100%'
    requestAnimationFrame(() => {
      el.style.transition = `width ${toast.duration}ms linear`
      el.style.width = '0%'
    })
  }, [toast.duration])

  return (
    <div
      className={`
        relative overflow-hidden
        ${s.bg} ${s.text} border ${s.border}
        rounded-xl shadow-lg
        ${toast.exiting ? 'animate-toastOut' : 'animate-toastIn'}
      `}
      style={{
        fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        maxWidth: 380,
        minWidth: 300,
      }}
    >
      <div className="flex items-start gap-2.5 px-4 py-3">
        <span className="mt-0.5">
          <Icon />
        </span>
        <span className="flex-1 text-sm font-medium leading-snug">{toast.message}</span>
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick()
              onDismiss(toast.id)
            }}
            className="text-xs font-semibold px-2 py-1 rounded-md bg-black/5 hover:bg-black/10 transition-colors whitespace-nowrap"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={() => onDismiss(toast.id)}
          className="mt-0.5 opacity-50 hover:opacity-100 transition-opacity bg-transparent border-0 cursor-pointer p-0"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="h-[2px] w-full bg-black/5">
          <div
            ref={progressRef}
            className={`h-full ${s.progress} opacity-60`}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════ */

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [queue, setQueue] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  // Show queued toasts when visible count drops below max
  useEffect(() => {
    const visibleCount = toasts.filter(t => !t.exiting).length
    if (visibleCount < MAX_VISIBLE && queue.length > 0) {
      const [next, ...rest] = queue
      setQueue(rest)
      setToasts(prev => [next, ...prev])
      scheduleAutoDismiss(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts, queue])

  function scheduleAutoDismiss(item: ToastItem) {
    if (item.duration <= 0) return
    const timer = setTimeout(() => {
      dismiss(item.id)
    }, item.duration)
    timersRef.current.set(item.id, timer)
  }

  const dismiss = useCallback((id: number) => {
    // Clear timer if still pending
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    // Start exit animation
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)))
    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 250)
  }, [])

  const show: ShowToast = useCallback((message, type, options) => {
    const id = ++nextId
    const item: ToastItem = {
      id,
      message,
      type,
      duration: options?.duration ?? DEFAULT_DURATION,
      action: options?.action,
      createdAt: Date.now(),
    }

    setToasts(prev => {
      const visibleCount = prev.filter(t => !t.exiting).length
      if (visibleCount >= MAX_VISIBLE) {
        // Queue it
        setQueue(q => [...q, item])
        return prev
      }
      scheduleAutoDismiss(item)
      return [item, ...prev]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2 pointer-events-none"
          style={{ fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
        >
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastCard toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      )}

      {/* Toast animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes toastOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
        .animate-toastIn {
          animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-toastOut {
          animation: toastOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      ` }} />
    </ToastContext.Provider>
  )
}
