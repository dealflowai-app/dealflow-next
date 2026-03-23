'use client'

import { useEffect, useState } from 'react'

/* ── Types ── */
type ActivityItem = {
  id: string
  type: string
  title: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

/* ── Relative timestamp ── */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months !== 1 ? 's' : ''} ago`
}

/* ── Type-specific icon ── */
const ICON_MAP: Record<string, { svg: JSX.Element; color: string }> = {
  DEAL_CREATED: {
    color: '#2563EB',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  BUYER_ADDED: {
    color: '#10B981',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  BUYER_IMPORTED: {
    color: '#8B5CF6',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
  CAMPAIGN_SENT: {
    color: '#F59E0B',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  DEAL_STATUS_CHANGED: {
    color: '#6366F1',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
  },
  CONTRACT_CREATED: {
    color: '#EC4899',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  POST_CREATED: {
    color: '#14B8A6',
    svg: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
}

const DEFAULT_ICON = {
  color: '#64748B',
  svg: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
}

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

/* ── Component ── */
export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/activity')
      .then(r => r.ok ? r.json() : [])
      .then((data: ActivityItem[]) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="py-8 text-center" style={{ fontFamily: FONT }}>
        <div className="inline-block w-5 h-5 border-2 border-[rgba(5,14,36,0.12)] border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center" style={{ fontFamily: FONT }}>
        <div
          className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{ background: 'rgba(37,99,235,0.06)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="text-[0.82rem] text-[rgba(5,14,36,0.45)] m-0 leading-relaxed">
          No activity yet.<br />
          Start by adding your first deal or buyer.
        </p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <div className="relative">
        {items.map((item, i) => {
          const icon = ICON_MAP[item.type] || DEFAULT_ICON
          const isLast = i === items.length - 1

          return (
            <div key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Connecting line */}
              {!isLast && (
                <div
                  className="absolute left-[13px] top-[28px] w-px"
                  style={{
                    background: 'rgba(5,14,36,0.06)',
                    bottom: 0,
                  }}
                />
              )}

              {/* Icon dot */}
              <div
                className="relative z-10 w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: `${icon.color}10`,
                  color: icon.color,
                }}
              >
                {icon.svg}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-[3px]">
                <p className="text-[0.82rem] text-[#0B1224] leading-[1.45] m-0 truncate">
                  {item.title}
                </p>
                <span className="text-[0.68rem] text-[rgba(5,14,36,0.38)] mt-0.5 block">
                  {relativeTime(item.createdAt)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* View all link */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(5,14,36,0.04)' }}>
        <button
          className="w-full text-center text-[0.75rem] font-medium text-[#2563EB] bg-transparent border-none cursor-pointer py-1 transition-opacity hover:opacity-70"
          style={{ fontFamily: FONT }}
          onClick={() => {/* placeholder for future "view all" page */}}
        >
          View all activity
        </button>
      </div>
    </div>
  )
}
