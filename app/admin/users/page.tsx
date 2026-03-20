'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
  Download,
  Shield,
  ExternalLink,
  Clock,
  Ban,
  CheckCircle,
  ArrowUpDown,
} from 'lucide-react'

const fontFamily = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

interface UserRow {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  tier: string
  tierStatus: string
  platformRole: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  stripeCustomerId: string | null
  createdAt: string
  updatedAt: string
  usage: any
  totalRevenue: number
}

interface UserDetail {
  profile: any
  usageHistory: any[]
  payments: any[]
  stats: { deals: number; buyers: number; contracts: number }
}

function tierBadge(tier: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    free: { bg: '#F3F4F6', color: '#6B7280' },
    starter: { bg: '#DBEAFE', color: '#2563EB' },
    pro: { bg: '#EDE9FE', color: '#7C3AED' },
    business: { bg: '#FEF3C7', color: '#D97706' },
    enterprise: { bg: '#FEF3C7', color: '#D97706' },
  }
  const c = colors[tier] || colors.free
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '0.68rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'capitalize',
        color: c.color,
        background: c.bg,
        borderRadius: 20,
        padding: '2px 8px',
        lineHeight: 1.4,
      }}
    >
      {tier}
    </span>
  )
}

function statusBadge(status: string) {
  const colors: Record<string, { bg: string; color: string }> = {
    active: { bg: '#DBEAFE', color: '#2563EB' },
    trialing: { bg: '#EDE9FE', color: '#7C3AED' },
    past_due: { bg: '#FEF3C7', color: '#D97706' },
    cancelled: { bg: '#F3F4F6', color: '#6B7280' },
    suspended: { bg: '#FEE2E2', color: '#DC2626' },
  }
  const c = colors[status] || colors.active
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '0.68rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'capitalize',
        color: c.color,
        background: c.bg,
        borderRadius: 20,
        padding: '2px 8px',
        lineHeight: 1.4,
      }}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function relativeDate(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sort: sortBy,
        order: sortOrder,
      })
      if (search) params.set('search', search)
      if (tierFilter) params.set('tier', tierFilter)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (e) {
      console.error('Failed to fetch users:', e)
    } finally {
      setLoading(false)
    }
  }, [page, search, tierFilter, statusFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Debounce search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  async function openUserDetail(userId: string) {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (res.ok) {
        setDetailUser(await res.json())
      }
    } catch (e) {
      console.error('Failed to load user detail:', e)
    } finally {
      setDetailLoading(false)
    }
  }

  async function performAction(userId: string, action: string, extra?: Record<string, string>) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (res.ok) {
        fetchUsers()
        if (detailUser?.profile?.id === userId) {
          openUserDetail(userId)
        }
      }
    } catch (e) {
      console.error('Action failed:', e)
    } finally {
      setActionLoading(false)
      setActionMenu(null)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === users.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(users.map((u) => u.id)))
    }
  }

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  async function exportCsv() {
    const rows = users.map((u) => ({
      name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      email: u.email,
      phone: u.phone || '',
      tier: u.tier,
      status: u.tierStatus,
      revenue: u.totalRevenue,
      signedUp: new Date(u.createdAt).toISOString().split('T')[0],
    }))
    const header = Object.keys(rows[0] || {}).join(',')
    const csv = [header, ...rows.map((r) => Object.values(r).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: 32, fontFamily, maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0B1224', margin: 0 }}>Users</h1>
          <p style={{ fontSize: '0.82rem', color: 'rgba(5,14,36,0.5)', margin: '4px 0 0' }}>
            {total} total users
          </p>
        </div>
        <button
          onClick={exportCsv}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid rgba(5,14,36,0.12)',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 500,
            color: '#0B1224',
            fontFamily,
          }}
        >
          <Download style={{ width: 14, height: 14, strokeWidth: 1.8 }} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1,
            minWidth: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            background: '#ffffff',
            border: '1px solid rgba(5,14,36,0.12)',
            borderRadius: 8,
            height: 38,
          }}
        >
          <Search style={{ width: 15, height: 15, color: 'rgba(5,14,36,0.3)', strokeWidth: 1.8, flexShrink: 0 }} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email..."
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              fontSize: '0.82rem',
              color: '#0B1224',
              fontFamily,
              background: 'transparent',
            }}
          />
        </div>

        <FilterSelect
          value={tierFilter}
          onChange={(v) => { setTierFilter(v); setPage(1) }}
          options={[
            { value: '', label: 'All Tiers' },
            { value: 'free', label: 'Free' },
            { value: 'starter', label: 'Starter' },
            { value: 'pro', label: 'Pro' },
            { value: 'enterprise', label: 'Enterprise' },
          ]}
        />

        <FilterSelect
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1) }}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'trialing', label: 'Trialing' },
            { value: 'past_due', label: 'Past Due' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 14px',
            background: '#EFF6FF',
            border: '1px solid #DBEAFE',
            borderRadius: 8,
            marginBottom: 12,
            fontSize: '0.82rem',
            fontFamily,
          }}
        >
          <span style={{ fontWeight: 600, color: '#2563EB' }}>{selected.size} selected</span>
          <button
            onClick={() => setSelected(new Set())}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(5,14,36,0.5)',
              fontSize: '0.78rem',
              fontFamily,
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid rgba(5,14,36,0.08)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(5,14,36,0.08)' }}>
              <th style={{ ...thStyle, width: 36 }}>
                <input
                  type="checkbox"
                  checked={users.length > 0 && selected.size === users.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={thStyle}>
                <SortHeader label="User" field="firstName" current={sortBy} order={sortOrder} onSort={handleSort} />
              </th>
              <th style={thStyle}>Tier</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Revenue</th>
              <th style={thStyle}>
                <SortHeader label="Signed Up" field="createdAt" current={sortBy} order={sortOrder} onSort={handleSort} />
              </th>
              <th style={{ ...thStyle, width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(5,14,36,0.4)', padding: 32 }}>
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(5,14,36,0.4)', padding: 32 }}>
                  No users found
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => openUserDetail(u.id)}
                  style={{
                    borderBottom: '1px solid rgba(5,14,36,0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37,99,235,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#0B1224',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: '0.58rem', fontWeight: 600, color: '#ffffff' }}>
                          {u.firstName && u.lastName
                            ? `${u.firstName[0]}${u.lastName[0]}`.toUpperCase()
                            : u.email.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#0B1224', lineHeight: 1.3 }}>
                          {u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.email}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(5,14,36,0.4)', lineHeight: 1.3 }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>{tierBadge(u.tier)}</td>
                  <td style={tdStyle}>{statusBadge(u.tierStatus)}</td>
                  <td style={{ ...tdStyle, fontSize: '0.82rem', fontWeight: 500, color: '#0B1224' }}>
                    ${u.totalRevenue.toFixed(0)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.78rem', color: 'rgba(5,14,36,0.5)' }}>
                    {relativeDate(u.createdAt)}
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setActionMenu(actionMenu === u.id ? null : u.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          borderRadius: 4,
                          display: 'flex',
                        }}
                      >
                        <MoreHorizontal style={{ width: 16, height: 16, color: 'rgba(5,14,36,0.4)' }} />
                      </button>
                      {actionMenu === u.id && (
                        <ActionDropdown
                          user={u}
                          onAction={(action, extra) => performAction(u.id, action, extra)}
                          onClose={() => setActionMenu(null)}
                          loading={actionLoading}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid rgba(5,14,36,0.08)',
            }}
          >
            <span style={{ fontSize: '0.78rem', color: 'rgba(5,14,36,0.5)', fontFamily }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <PaginationBtn disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </PaginationBtn>
              <PaginationBtn disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </PaginationBtn>
            </div>
          </div>
        )}
      </div>

      {/* User detail slide-out */}
      {(detailUser || detailLoading) && (
        <UserDetailPanel
          data={detailUser}
          loading={detailLoading}
          onClose={() => setDetailUser(null)}
          onAction={(action, extra) => {
            if (detailUser?.profile?.id) performAction(detailUser.profile.id, action, extra)
          }}
          actionLoading={actionLoading}
        />
      )}
    </div>
  )
}

// Reusable components

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(5,14,36,0.4)',
  textAlign: 'left',
  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '0 12px',
        height: 38,
        borderRadius: 8,
        border: '1px solid rgba(5,14,36,0.12)',
        background: '#ffffff',
        fontSize: '0.82rem',
        color: '#0B1224',
        fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function SortHeader({ label, field, current, order, onSort }: { label: string; field: string; current: string; order: string; onSort: (f: string) => void }) {
  return (
    <button
      onClick={() => onSort(field)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: 0,
        fontSize: 'inherit',
        fontWeight: 'inherit',
        letterSpacing: 'inherit',
        textTransform: 'inherit' as any,
        color: 'inherit',
        fontFamily: 'inherit',
      }}
    >
      {label}
      <ArrowUpDown
        style={{
          width: 12,
          height: 12,
          color: current === field ? '#2563EB' : 'rgba(5,14,36,0.2)',
        }}
      />
    </button>
  )
}

function PaginationBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: '1px solid rgba(5,14,36,0.12)',
        background: disabled ? '#F9FAFB' : '#ffffff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'rgba(5,14,36,0.2)' : '#0B1224',
      }}
    >
      {children}
    </button>
  )
}

function ActionDropdown({
  user,
  onAction,
  onClose,
  loading,
}: {
  user: UserRow
  onAction: (action: string, extra?: Record<string, string>) => void
  onClose: () => void
  loading: boolean
}) {
  const [showTierSelect, setShowTierSelect] = useState(false)
  const [selectedTier, setSelectedTier] = useState(user.tier)

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          zIndex: 50,
          width: 200,
          background: '#ffffff',
          border: '1px solid rgba(5,14,36,0.12)',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        }}
      >
        {showTierSelect ? (
          <div style={{ padding: 10 }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, margin: '0 0 6px', color: '#0B1224' }}>Change tier to:</p>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid rgba(5,14,36,0.12)',
                fontSize: '0.78rem',
                marginBottom: 8,
                fontFamily: 'inherit',
              }}
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button
              disabled={loading || selectedTier === user.tier}
              onClick={() => onAction('change_tier', { tier: selectedTier })}
              style={{
                width: '100%',
                padding: '6px 0',
                borderRadius: 6,
                border: 'none',
                background: '#2563EB',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        ) : (
          <>
            <DropdownItem onClick={() => setShowTierSelect(true)}>
              <CreditCardIcon /> Change Tier
            </DropdownItem>
            {user.tierStatus === 'suspended' ? (
              <DropdownItem onClick={() => onAction('unsuspend')}>
                <CheckCircle style={{ width: 14, height: 14, color: '#10B981' }} /> Unsuspend
              </DropdownItem>
            ) : (
              <DropdownItem onClick={() => onAction('suspend')} danger>
                <Ban style={{ width: 14, height: 14 }} /> Suspend
              </DropdownItem>
            )}
            <DropdownItem onClick={() => onAction('extend_trial')}>
              <Clock style={{ width: 14, height: 14 }} /> Extend Trial
            </DropdownItem>
            {user.platformRole === 'user' ? (
              <DropdownItem onClick={() => onAction('change_role', { role: 'admin' })}>
                <Shield style={{ width: 14, height: 14 }} /> Make Admin
              </DropdownItem>
            ) : (
              <DropdownItem onClick={() => onAction('change_role', { role: 'user' })}>
                <Shield style={{ width: 14, height: 14 }} /> Remove Admin
              </DropdownItem>
            )}
            {user.stripeCustomerId && (
              <DropdownItem
                onClick={() => {
                  window.open(`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`, '_blank')
                  onClose()
                }}
              >
                <ExternalLink style={{ width: 14, height: 14 }} /> Open in Stripe
              </DropdownItem>
            )}
          </>
        )}
      </div>
    </>
  )
}

function CreditCardIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x={1} y={4} width={22} height={16} rx={2} ry={2} />
      <line x1={1} y1={10} x2={23} y2={10} />
    </svg>
  )
}

function DropdownItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontWeight: 400,
        color: danger ? '#DC2626' : '#0B1224',
        textAlign: 'left',
        fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(5,14,36,0.04)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  )
}

function UserDetailPanel({
  data,
  loading,
  onClose,
  onAction,
  actionLoading,
}: {
  data: UserDetail | null
  loading: boolean
  onClose: () => void
  onAction: (action: string, extra?: Record<string, string>) => void
  actionLoading: boolean
}) {
  const fontFamily = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.2)',
          zIndex: 60,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 480,
          height: '100vh',
          background: '#ffffff',
          zIndex: 70,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
          overflowY: 'auto',
          fontFamily,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(5,14,36,0.08)',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0B1224', margin: 0 }}>User Details</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
            }}
          >
            <X style={{ width: 18, height: 18, color: 'rgba(5,14,36,0.5)' }} />
          </button>
        </div>

        {loading || !data ? (
          <div style={{ padding: 20, color: 'rgba(5,14,36,0.5)', fontSize: '0.85rem' }}>Loading user details...</div>
        ) : (
          <div style={{ padding: 20 }}>
            {/* Profile info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#0B1224',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                  {data.profile.firstName && data.profile.lastName
                    ? `${data.profile.firstName[0]}${data.profile.lastName[0]}`.toUpperCase()
                    : data.profile.email.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0B1224' }}>
                  {data.profile.firstName
                    ? `${data.profile.firstName} ${data.profile.lastName || ''}`.trim()
                    : data.profile.email}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(5,14,36,0.5)' }}>{data.profile.email}</div>
                {data.profile.phone && (
                  <div style={{ fontSize: '0.78rem', color: 'rgba(5,14,36,0.5)' }}>{data.profile.phone}</div>
                )}
              </div>
            </div>

            {/* Tier & Status */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 20,
                padding: '12px 14px',
                background: '#F9FAFB',
                borderRadius: 10,
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(5,14,36,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Tier
                </p>
                {tierBadge(data.profile.tier)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(5,14,36,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Status
                </p>
                {statusBadge(data.profile.tierStatus)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'rgba(5,14,36,0.4)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Role
                </p>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: data.profile.platformRole === 'admin' ? '#DC2626' : '#6B7280',
                    textTransform: 'capitalize',
                  }}
                >
                  {data.profile.platformRole}
                </span>
              </div>
            </div>

            {/* Quick stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {[
                { label: 'Deals', value: data.stats.deals },
                { label: 'Buyers', value: data.stats.buyers },
                { label: 'Contracts', value: data.stats.contracts },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    textAlign: 'center',
                    padding: '10px',
                    background: '#F9FAFB',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0B1224' }}>{s.value}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(5,14,36,0.4)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Usage */}
            {data.usageHistory.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0B1224', margin: '0 0 10px' }}>
                  Current Usage
                </h3>
                <UsageBars usage={data.usageHistory[0]} tier={data.profile.tier} />
              </div>
            )}

            {/* Payment history */}
            {data.payments.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0B1224', margin: '0 0 10px' }}>
                  Payment History
                </h3>
                {data.payments.slice(0, 6).map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(5,14,36,0.05)',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div>
                      <span style={{ color: '#0B1224', fontWeight: 500 }}>
                        ${(p.amount / 100).toFixed(2)}
                      </span>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: '0.68rem',
                          color: p.status === 'paid' ? '#10B981' : '#EF4444',
                          fontWeight: 600,
                        }}
                      >
                        {p.status}
                      </span>
                    </div>
                    <span style={{ color: 'rgba(5,14,36,0.4)' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ActionButton
                label="Extend Trial"
                onClick={() => onAction('extend_trial')}
                loading={actionLoading}
              />
              {data.profile.tierStatus === 'suspended' ? (
                <ActionButton
                  label="Unsuspend"
                  onClick={() => onAction('unsuspend')}
                  loading={actionLoading}
                  variant="success"
                />
              ) : (
                <ActionButton
                  label="Suspend"
                  onClick={() => onAction('suspend')}
                  loading={actionLoading}
                  variant="danger"
                />
              )}
              {data.profile.stripeCustomerId && (
                <ActionButton
                  label="Open in Stripe"
                  onClick={() =>
                    window.open(
                      `https://dashboard.stripe.com/customers/${data.profile.stripeCustomerId}`,
                      '_blank'
                    )
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function ActionButton({
  label,
  onClick,
  loading,
  variant,
}: {
  label: string
  onClick: () => void
  loading?: boolean
  variant?: 'danger' | 'success'
}) {
  const bg = variant === 'danger' ? '#FEF2F2' : variant === 'success' ? '#ECFDF5' : '#F9FAFB'
  const color = variant === 'danger' ? '#DC2626' : variant === 'success' ? '#10B981' : '#0B1224'
  const border = variant === 'danger' ? '#FEE2E2' : variant === 'success' ? '#D1FAE5' : 'rgba(5,14,36,0.12)'

  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '7px 12px',
        borderRadius: 6,
        border: `1px solid ${border}`,
        background: bg,
        color,
        fontSize: '0.78rem',
        fontWeight: 500,
        cursor: loading ? 'wait' : 'pointer',
        fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      }}
    >
      {label}
    </button>
  )
}

function UsageBars({ usage, tier }: { usage: any; tier: string }) {
  const limits: Record<string, Record<string, number>> = {
    free: { aiCallMinutes: 0, smsCount: 0, skipTraces: 0, activeDeals: 0, crmContacts: 0 },
    starter: { aiCallMinutes: 300, smsCount: 500, skipTraces: 100, activeDeals: 5, crmContacts: 300 },
    pro: { aiCallMinutes: 1500, smsCount: 2500, skipTraces: 500, activeDeals: 20, crmContacts: 3000 },
    enterprise: { aiCallMinutes: 99999, smsCount: 99999, skipTraces: 99999, activeDeals: 99999, crmContacts: 99999 },
  }

  const tierLimits = limits[tier] || limits.free

  const bars = [
    { label: 'AI Minutes', value: usage.aiCallMinutes || 0, max: tierLimits.aiCallMinutes },
    { label: 'SMS', value: usage.smsCount || 0, max: tierLimits.smsCount },
    { label: 'Skip Traces', value: usage.skipTraces || 0, max: tierLimits.skipTraces },
    { label: 'Active Deals', value: usage.activeDeals || 0, max: tierLimits.activeDeals },
    { label: 'CRM Contacts', value: usage.crmContacts || 0, max: tierLimits.crmContacts },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bars.map((bar) => {
        const pct = bar.max > 0 ? Math.min(100, Math.round((bar.value / bar.max) * 100)) : 0
        const isHigh = pct > 80
        return (
          <div key={bar.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 3 }}>
              <span style={{ color: 'rgba(5,14,36,0.5)' }}>{bar.label}</span>
              <span style={{ color: isHigh ? '#EF4444' : 'rgba(5,14,36,0.5)', fontWeight: 500 }}>
                {bar.value} / {bar.max === 99999 ? 'Unlimited' : bar.max}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 3,
                  background: isHigh ? '#EF4444' : '#2563EB',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
