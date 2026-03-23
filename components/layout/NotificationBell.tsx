'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Inbox, Bell, MessageSquare, Check, CheckCheck, Loader2, X, ArrowRight } from 'lucide-react'
import { useNotificationCount } from '@/hooks/useNotificationCount'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  read: boolean
  createdAt: string
}

type Tab = 'notifications' | 'messages'

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day === 1) return 'Yesterday'
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function typeIcon(type: string): string {
  switch (type) {
    case 'like': return '❤️'
    case 'comment': return '💬'
    case 'group_join': return '👥'
    case 'deal_match': return '🎯'
    case 'match_alert': return '🎯'
    case 'campaign_complete': return '📞'
    case 'deal_update': return '💰'
    case 'system': return '⚙️'
    default: return '🔔'
  }
}

function getNotificationHref(notification: Notification): string | null {
  const data = notification.data
  if (!data) return null

  switch (notification.type) {
    case 'like':
    case 'comment':
      return '/community'
    case 'group_join':
      return data.groupId ? '/community?tab=groups' : '/community'
    case 'deal_match':
    case 'match_alert':
      return '/discovery'
    case 'campaign_complete':
      return data.campaignId ? `/outreach` : null
    case 'deal_update':
      return data.dealId ? `/deals/${data.dealId}` : null
    default:
      return null
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('notifications')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [localCountOverride, setLocalCountOverride] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Real-time polling for unread count (every 15 seconds, pauses on tab hidden, exponential backoff)
  const { unreadCount: polledCount, refetch: refetchCount } = useNotificationCount()

  // Use local override when user marks items read, otherwise use polled count
  const unreadCount = localCountOverride ?? polledCount

  // Reset local override when polled count changes (server catches up)
  useEffect(() => {
    setLocalCountOverride(null)
  }, [polledCount])

  // Helper to set local count override
  const setUnreadCount = useCallback((updater: number | ((prev: number) => number)) => {
    setLocalCountOverride(prev => {
      const current = prev ?? polledCount
      return typeof updater === 'function' ? updater(current) : updater
    })
  }, [polledCount])

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        if (data.unreadCount != null) {
          setLocalCountOverride(data.unreadCount)
        }
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Mark single as read + navigate
  const handleClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await fetch(`/api/notifications/${notification.id}`, { method: 'PATCH' })
        setNotifications(prev => prev.map(n =>
          n.id === notification.id ? { ...n, read: true } : n,
        ))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch {
        // Silent fail
      }
    }

    const href = getNotificationHref(notification)
    if (href) {
      setOpen(false)
      router.push(href)
    }
  }

  // Mark all read
  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications?action=mark-all-read', { method: 'POST' })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // Silent fail
    } finally {
      setMarkingAll(false)
    }
  }

  // Recent messages preview (would come from API in production)
  const recentMessages = [
    { id: 1, name: 'Kevin Nguyen', initials: 'KN', preview: 'I can do $285k cash, close in 14 days. Send me the contract.', time: '10m', unread: true },
    { id: 2, name: 'Sarah Kim', initials: 'SK', preview: 'Let\'s JV on that Atlanta portfolio. I have the buyers.', time: '1h', unread: true },
    { id: 3, name: 'Marcus Thompson', initials: 'MT', preview: 'Thanks for the tip on the AI campaigns! Connect rates are way up.', time: '3h', unread: false },
    { id: 4, name: 'Lisa Park', initials: 'LP', preview: 'Can you send me the address? I\'ll run comps on my end.', time: '1d', unread: false },
  ]

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'notifications', label: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
    { key: 'messages', label: 'Messages', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Inbox button */}
      <button
        data-tour="inbox-btn"
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-[34px] h-[34px] rounded-[8px] border-0 cursor-pointer transition-colors"
        style={{ background: open ? 'rgba(5,14,36,0.06)' : 'transparent' }}
        title="Inbox"
      >
        <Inbox
          className="w-[18px] h-[18px]"
          style={{
            color: unreadCount > 0 ? '#2563EB' : '#6B7280',
            strokeWidth: 1.8,
          }}
        />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center"
            style={{
              top: 3,
              right: 3,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: '#EF4444',
              color: 'white',
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-[200] flex flex-col"
          style={{
            top: 'calc(100% + 10px)',
            right: 0,
            width: 400,
            maxHeight: 520,
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 24px 80px rgba(5,14,36,0.18), 0 8px 24px rgba(5,14,36,0.08), 0 0 0 1px rgba(5,14,36,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Header with tabs */}
          <div style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
            <div className="flex items-center justify-between px-4 pt-3.5 pb-0">
              <span className="text-[0.88rem] font-[600] text-[#0B1224]">Inbox</span>
              <div className="flex items-center gap-1">
                {tab === 'notifications' && unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="flex items-center gap-1 px-2 py-1 rounded-[6px] border-0 text-[0.68rem] font-[500] text-[rgba(5,14,36,0.45)] hover:text-[rgba(5,14,36,0.7)] hover:bg-[rgba(5,14,36,0.04)] cursor-pointer transition-colors"
                    style={{ background: 'transparent' }}
                  >
                    {markingAll ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3 h-3" />
                    )}
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center w-7 h-7 rounded-[6px] border-0 bg-transparent cursor-pointer text-[#9CA3AF] hover:text-[rgba(5,14,36,0.6)] hover:bg-[rgba(5,14,36,0.04)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex px-4 gap-1 mt-2.5">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex items-center gap-1.5 px-3 pb-2.5 border-0 cursor-pointer transition-colors text-[0.76rem] font-[500]"
                  style={{
                    background: 'transparent',
                    color: tab === t.key ? '#2563EB' : 'rgba(5,14,36,0.4)',
                    borderBottom: tab === t.key ? '2px solid #2563EB' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {t.icon}
                  {t.label}
                  {t.key === 'messages' && recentMessages.filter(m => m.unread).length > 0 && (
                    <span
                      className="text-[0.6rem] font-[600] rounded-full px-1.5 py-[1px] leading-none"
                      style={{
                        background: tab === t.key ? 'rgba(37,99,235,0.1)' : 'rgba(5,14,36,0.06)',
                        color: tab === t.key ? '#2563EB' : 'rgba(5,14,36,0.4)',
                      }}
                    >
                      {recentMessages.filter(m => m.unread).length}
                    </span>
                  )}
                  {t.key === 'notifications' && unreadCount > 0 && (
                    <span
                      className="text-[0.6rem] font-[600] rounded-full px-1.5 py-[1px] leading-none"
                      style={{
                        background: tab === t.key ? 'rgba(37,99,235,0.1)' : 'rgba(5,14,36,0.06)',
                        color: tab === t.key ? '#2563EB' : 'rgba(5,14,36,0.4)',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {tab === 'notifications' && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-[#9CA3AF]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-5 text-[#9CA3AF]">
                    <Bell className="w-7 h-7 mb-3 opacity-40" />
                    <p className="m-0 text-[0.82rem] font-[500]">No notifications yet</p>
                    <p className="m-0 mt-1 text-[0.72rem]">
                      You&apos;ll see match alerts, deal updates, and campaign results here.
                    </p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className="flex items-start gap-2.5 w-full px-4 py-3 border-0 text-left cursor-pointer transition-colors hover:bg-[rgba(5,14,36,0.02)]"
                      style={{
                        borderBottom: '1px solid rgba(5,14,36,0.04)',
                        background: n.read ? 'transparent' : 'rgba(37,99,235,0.02)',
                      }}
                    >
                      <span className="text-[0.95rem] leading-none flex-shrink-0 mt-0.5">
                        {typeIcon(n.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[0.78rem] text-[#0B1224] truncate"
                            style={{ fontWeight: n.read ? 400 : 600 }}
                          >
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] flex-shrink-0" />
                          )}
                        </div>
                        <p className="m-0 mt-0.5 text-[0.72rem] text-[#6B7280] truncate">
                          {n.body}
                        </p>
                        <span className="text-[0.65rem] text-[#9CA3AF] mt-0.5 block">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {n.read && (
                        <Check className="w-3 h-3 text-[#D1D5DB] flex-shrink-0 mt-1" />
                      )}
                    </button>
                  ))
                )}
              </>
            )}

            {tab === 'messages' && (
              <>
                {recentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-5 text-[#9CA3AF]">
                    <MessageSquare className="w-7 h-7 mb-3 opacity-40" />
                    <p className="m-0 text-[0.82rem] font-[500] text-[rgba(5,14,36,0.5)]">No messages yet</p>
                    <p className="m-0 mt-1 text-[0.72rem] text-center">
                      Connect with other wholesalers in the community.
                    </p>
                  </div>
                ) : (
                  recentMessages.map(msg => (
                    <Link
                      key={msg.id}
                      href="/community?tab=messages"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 w-full px-4 py-3 no-underline transition-colors hover:bg-[rgba(5,14,36,0.02)]"
                      style={{
                        borderBottom: '1px solid rgba(5,14,36,0.04)',
                        background: msg.unread ? 'rgba(37,99,235,0.02)' : 'transparent',
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <div
                          className="rounded-full flex items-center justify-center"
                          style={{ width: 32, height: 32, backgroundColor: '#0B1224' }}
                        >
                          <span className="text-[0.55rem] font-[600] text-white">{msg.initials}</span>
                        </div>
                        {msg.unread && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-[#2563EB]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-[0.78rem] text-[#0B1224]"
                            style={{ fontWeight: msg.unread ? 600 : 400 }}
                          >
                            {msg.name}
                          </span>
                          <span className="text-[0.65rem] text-[#9CA3AF] flex-shrink-0">{msg.time}</span>
                        </div>
                        <p className="m-0 text-[0.72rem] text-[#6B7280] truncate">
                          {msg.preview}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-center px-4 py-2.5"
            style={{ borderTop: '1px solid rgba(5,14,36,0.04)', background: 'rgba(5,14,36,0.015)' }}
          >
            <Link
              href={tab === 'messages' ? '/community?tab=messages' : '/dashboard'}
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-[0.7rem] text-[#2563EB] hover:text-[#1D4ED8] no-underline font-[500] transition-colors"
            >
              {tab === 'messages' ? 'View all messages' : 'View all activity'}
              <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
