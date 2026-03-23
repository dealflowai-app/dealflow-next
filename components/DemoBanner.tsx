'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function DemoBanner({ demoMode }: { demoMode?: boolean }) {
  const router = useRouter()
  const [clearing, setClearing] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [cleared, setCleared] = useState(false)

  const handleClear = useCallback(async () => {
    setClearing(true)
    try {
      const res = await fetch('/api/demo/clear', { method: 'POST' })
      if (res.ok) {
        setCleared(true)
        // Refresh server components so data disappears without full reload
        router.refresh()
      }
    } catch {
      setClearing(false)
    }
  }, [router])

  if (!demoMode || dismissed || cleared) return null

  return (
    <div
      style={{
        background: 'rgba(245,158,11,0.08)',
        borderBottom: '1px solid rgba(245,158,11,0.2)',
        fontFamily: 'Satoshi, sans-serif',
      }}
      className="flex items-center justify-between px-4 py-2 text-sm"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" style={{ color: 'rgb(180,120,20)' }}>
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 7v4M8 5.5v-.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ color: 'rgb(146,100,14)' }} className="truncate">
          You&apos;re viewing demo data. This is sample data to show you how DealFlow AI works.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <button
          onClick={handleClear}
          disabled={clearing}
          className="px-3 py-1 rounded text-xs font-medium transition-colors"
          style={{
            background: 'rgba(245,158,11,0.15)',
            color: 'rgb(146,100,14)',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          {clearing ? 'Clearing...' : 'Clear Demo Data'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 rounded transition-colors hover:bg-black/5"
          style={{ color: 'rgb(146,100,14)' }}
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
