'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type Toast = { id: number; message: string }

const ToastContext = createContext<(message: string) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string) => {
    const id = ++nextId
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toasts.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {toasts.map(t => (
            <div
              key={t.id}
              style={{
                background: '#1f2937',
                color: '#f9fafb',
                padding: '10px 18px',
                borderRadius: 8,
                fontSize: '0.84rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                animation: 'toast-in 0.2s ease-out',
              }}
            >
              {t.message}
            </div>
          ))}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes toast-in {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          ` }} />
        </div>
      )}
    </ToastContext.Provider>
  )
}
