'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, CheckCheck, Loader2, X } from 'lucide-react'

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=1&unread=true')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch {
      // Silent fail for polling
    }
  }, [])

  // Fetch notifications list
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll for unread count every 60 seconds
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 60_000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

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

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: open ? 'rgba(5,14,36,0.06)' : 'transparent',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
        title="Notifications"
      >
        <Bell
          style={{
            width: 18,
            height: 18,
            color: unreadCount > 0 ? '#2563EB' : '#6B7280',
            strokeWidth: 1.8,
          }}
        />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: '#EF4444',
              color: 'white',
              fontSize: '0.6rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 380,
            maxHeight: 480,
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(5,14,36,0.08)',
            overflow: 'hidden',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(5,14,36,0.06)',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0B1224' }}>
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#2563EB',
                    background: 'rgba(37,99,235,0.08)',
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'rgba(5,14,36,0.04)',
                    color: '#6B7280',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  title="Mark all as read"
                >
                  {markingAll ? (
                    <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <CheckCheck style={{ width: 12, height: 12 }} />
                  )}
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 40,
                  color: '#9CA3AF',
                }}
              >
                <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  color: '#9CA3AF',
                }}
              >
                <Bell style={{ width: 28, height: 28, marginBottom: 12, opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 500 }}>No notifications yet</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem' }}>
                  Enable match alerts on your CRM contacts to get notified
                </p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    width: '100%',
                    padding: '12px 16px',
                    border: 'none',
                    borderBottom: '1px solid rgba(5,14,36,0.04)',
                    background: n.read ? 'transparent' : 'rgba(37,99,235,0.03)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {/* Icon */}
                  <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                    {typeIcon(n.type)}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: n.read ? 400 : 600,
                          color: '#0B1224',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title}
                      </span>
                      {!n.read && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#2563EB',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '0.72rem',
                        color: '#6B7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {n.body}
                    </p>
                    <span style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2, display: 'block' }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>

                  {/* Read indicator */}
                  {n.read && (
                    <Check
                      style={{
                        width: 12,
                        height: 12,
                        color: '#D1D5DB',
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Spin animation */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          ` }} />
        </div>
      )}
    </div>
  )
}
