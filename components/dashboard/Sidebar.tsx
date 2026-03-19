'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { type Profile } from '@prisma/client'
import {
  LayoutDashboard,
  MessagesSquare,
  Store,
  UserSearch,
  Users,
  PhoneOutgoing,
  Calculator,
  FolderOpen,
  FileSignature,
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Feed', href: '/community', icon: MessagesSquare },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
  { label: 'Find Buyers', href: '/buyers', icon: UserSearch },
  { label: 'Buyer List', href: '/crm', icon: Users },
  { label: 'Outreach', href: '/outreach', icon: PhoneOutgoing },
  { label: 'Analyze Deal', href: '/analyzer', icon: Calculator },
  { label: 'My Deals', href: '/deals', icon: FolderOpen },
  { label: 'Contracts', href: '/contracts', icon: FileSignature },
  { label: 'Ask AI', href: '/gpt', icon: Sparkles },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const initials =
    profile.firstName && profile.lastName
      ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
      : profile.email.slice(0, 2).toUpperCase()

  const displayName =
    profile.firstName
      ? `${profile.firstName} ${profile.lastName ?? ''}`.trim()
      : profile.email

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="flex-shrink-0 h-screen flex flex-col relative"
      style={{
        width: collapsed ? 68 : 240,
        transition: 'width 0.2s ease',
        background: 'var(--white, #ffffff)',
        borderRight: '1px solid rgba(5,14,36,0.08)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-4"
        style={{
          height: 58,
          borderBottom: '1px solid rgba(5,14,36,0.08)',
        }}
      >
        <Link href="/dashboard" className="flex items-center no-underline" style={{ gap: 9 }}>
          <Image
            src="/Logo.png"
            alt="DealFlow AI logo"
            width={28}
            height={28}
            style={{ objectFit: 'contain', flexShrink: 0 }}
          />
          {!collapsed && (
            <>
              <span
                style={{
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  color: 'var(--navy-heading, #0B1224)',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}
              >
                DealFlow AI
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--blue-600, #2563EB)',
                  background: 'var(--blue-50, #EFF6FF)',
                  border: '1px solid var(--blue-100, #DBEAFE)',
                  borderRadius: 20,
                  padding: '2px 7px',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                Beta
              </span>
            </>
          )}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute flex items-center justify-center cursor-pointer"
        style={{
          top: 68,
          right: -12,
          width: 24,
          height: 24,
          zIndex: 10,
          background: 'var(--white, #ffffff)',
          border: '1px solid rgba(5,14,36,0.08)',
          borderRadius: '50%',
          transition: 'background 0.15s ease',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight style={{ width: 12, height: 12, color: 'var(--muted-text, #9CA3AF)' }} />
        ) : (
          <ChevronLeft style={{ width: 12, height: 12, color: 'var(--muted-text, #9CA3AF)' }} />
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '14px 10px' }}>
        {!collapsed && (
          <p style={{
            fontSize: '0.62rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--muted-text, #9CA3AF)',
            margin: '0 0 6px 12px',
          }}>
            Menu
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => {
            const Icon = item.icon
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: collapsed ? '9px 0' : '9px 12px',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 500 : 400,
                  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                  letterSpacing: '-0.005em',
                  textDecoration: 'none',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--blue-600, #2563EB)' : 'var(--body-text, #4B5563)',
                  background: isActive ? 'var(--blue-50, #EFF6FF)' : 'transparent',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                }}
              >
                <Icon
                  className="flex-shrink-0"
                  style={{
                    width: 17,
                    height: 17,
                    strokeWidth: isActive ? 2 : 1.7,
                    color: isActive ? 'var(--blue-600, #2563EB)' : 'var(--muted-text, #9CA3AF)',
                    transition: 'color 0.18s ease',
                  }}
                />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Settings + Admin + User */}
      <div style={{ padding: '8px 10px 14px', borderTop: '1px solid rgba(5,14,36,0.08)' }}>
        {/* Admin link (only for admins) */}
        {(profile as any).platformRole === 'admin' && (
          <Link
            href="/admin"
            title={collapsed ? 'Admin' : undefined}
            className="sidebar-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '9px 0' : '9px 12px',
              borderRadius: 10,
              fontSize: '0.82rem',
              fontWeight: 500,
              fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              letterSpacing: '-0.005em',
              textDecoration: 'none',
              justifyContent: collapsed ? 'center' : 'flex-start',
              marginBottom: 4,
              color: '#0B1224',
              background: 'transparent',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Shield
              className="flex-shrink-0"
              style={{
                width: 17,
                height: 17,
                strokeWidth: 1.8,
                color: '#DC2626',
                transition: 'color 0.18s ease',
              }}
            />
            {!collapsed && (
              <>
                Admin
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#DC2626',
                    background: '#FEF2F2',
                    border: '1px solid #FEE2E2',
                    borderRadius: 20,
                    padding: '1px 5px',
                    lineHeight: 1,
                    marginLeft: 'auto',
                  }}
                >
                  Admin
                </span>
              </>
            )}
          </Link>
        )}

        {/* Settings link */}
        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={`sidebar-link${pathname.startsWith('/settings') ? ' sidebar-link-active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            borderRadius: 10,
            fontSize: '0.82rem',
            fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            letterSpacing: '-0.005em',
            fontWeight: pathname.startsWith('/settings') ? 500 : 400,
            textDecoration: 'none',
            justifyContent: collapsed ? 'center' : 'flex-start',
            marginBottom: 8,
            color: pathname.startsWith('/settings') ? 'var(--blue-600, #2563EB)' : 'var(--body-text, #4B5563)',
            background: pathname.startsWith('/settings') ? 'var(--blue-50, #EFF6FF)' : 'transparent',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Settings
            className="flex-shrink-0"
            style={{
              width: 17,
              height: 17,
              strokeWidth: pathname.startsWith('/settings') ? 2 : 1.7,
              color: pathname.startsWith('/settings') ? 'var(--blue-600, #2563EB)' : 'var(--muted-text, #9CA3AF)',
              transition: 'color 0.18s ease',
            }}
          />
          {!collapsed && 'Settings'}
        </Link>

        {/* User */}
        <div
          className="sidebar-user"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            borderRadius: 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background 0.15s ease',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#0B1224',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: 'none',
            }}
          >
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'white', letterSpacing: '0.02em' }}>{initials}</span>
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                  color: 'var(--navy-heading, #0B1224)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}>{displayName}</p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="sidebar-signout"
                title="Sign out"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: 0.4,
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                  transition: 'all 0.18s ease',
                }}
              >
                <LogOut style={{ width: 14, height: 14, color: 'var(--body-text, #4B5563)' }} />
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .sidebar-link:hover:not(.sidebar-link-active) {
          background: rgba(5, 14, 36, 0.04) !important;
          color: var(--navy-heading, #0B1224) !important;
        }
        .sidebar-link:hover:not(.sidebar-link-active) svg {
          color: var(--body-text, #4B5563) !important;
        }
        .sidebar-link-active {
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.08);
        }
        .sidebar-user:hover {
          background: rgba(5, 14, 36, 0.03);
        }
        .sidebar-signout:hover {
          opacity: 1 !important;
          background: rgba(5, 14, 36, 0.05) !important;
        }
      `}</style>
    </aside>
  )
}
