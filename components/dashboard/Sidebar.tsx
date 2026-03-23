'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { type Profile } from '@prisma/client'
import {
  LayoutDashboard,
  Store,
  Search,
  Users,
  PhoneOutgoing,
  FolderOpen,
  FileSignature,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useMobileSidebar } from '@/components/layout/MobileSidebarContext'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badgeKey?: string // key to look up badge count
}

const mainItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Marketplace', href: '/marketplace', icon: Store },
  { label: 'Discovery', href: '/discovery', icon: Search },
]

const workspaceItems: NavItem[] = [
  { label: 'CRM', href: '/crm', icon: Users },
  { label: 'Outreach', href: '/outreach', icon: PhoneOutgoing },
  { label: 'My Deals', href: '/deals', icon: FolderOpen },
  { label: 'Contracts', href: '/contracts', icon: FileSignature },
]

function NavSection({
  label,
  items,
  collapsed,
  pathname,
  isFirst,
  onLinkClick,
  badges,
}: {
  label: string
  items: NavItem[]
  collapsed: boolean
  pathname: string
  isFirst?: boolean
  onLinkClick?: () => void
  badges?: Record<string, number>
}) {
  return (
    <div style={{ marginTop: isFirst ? 0 : 16 }}>
      {!collapsed && (
        <p style={{
          fontSize: '0.6rem',
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--nav-section-label)',
          margin: '0 0 6px 10px',
          flexShrink: 0,
        }}>
          {label}
        </p>
      )}
      {items.map(item => {
        const Icon = item.icon
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
        const badgeCount = item.badgeKey && badges ? (badges[item.badgeKey] ?? 0) : 0

        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            onClick={onLinkClick}
            data-tour={`nav-${item.href.replace('/', '')}`}
            className={`sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '7px 0' : '7px 10px',
              borderRadius: 'var(--nav-item-radius)',
              fontSize: 'var(--nav-font-size)',
              fontWeight: isActive ? 550 : 450,
              fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              letterSpacing: '-0.01em',
              textDecoration: 'none',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: isActive ? 'var(--nav-active-text)' : 'var(--nav-inactive-text)',
              background: isActive ? 'var(--nav-active-bg)' : 'transparent',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
            }}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon
                className="flex-shrink-0"
                style={{
                  width: 'var(--nav-icon-size)',
                  height: 'var(--nav-icon-size)',
                  strokeWidth: isActive ? 1.9 : 1.6,
                  color: isActive ? 'var(--nav-active-icon)' : 'var(--nav-inactive-icon)',
                  transition: 'color 0.18s ease',
                }}
              />
              {collapsed && badgeCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 14,
                    height: 14,
                    borderRadius: 7,
                    background: '#EF4444',
                    color: 'white',
                    fontSize: '0.52rem',
                    fontWeight: 700,
                    padding: '0 3px',
                    lineHeight: 1,
                    animation: 'badgeIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </span>
            {!collapsed && (
              <>
                {item.label}
                {badgeCount > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: '#EF4444',
                      color: 'white',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '0 5px',
                      lineHeight: 1,
                      animation: 'badgeIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </>
            )}
          </Link>
        )
      })}
    </div>
  )
}

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { isOpen: mobileOpen, close: closeMobile } = useMobileSidebar()
  const badges: Record<string, number> = {}

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobile()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <>
      {/* Mobile backdrop overlay */}
      {mobileOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={closeMobile}
        />
      )}
      <aside
        data-tour="sidebar"
        className={`flex-shrink-0 h-screen flex flex-col relative mobile-sidebar ${mobileOpen ? 'mobile-sidebar-open' : ''}`}
        style={{
          width: collapsed ? 56 : 190,
          transition: 'width 0.2s ease',
          background: 'var(--white)',
          borderRight: '1px solid var(--nav-border)',
        }}
      >
      {/* Logo */}
      <div
        className="flex items-center px-4"
        style={{
          height: 'var(--nav-header-h)',
          borderBottom: '1px solid var(--nav-border)',
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
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: 'var(--navy-heading)',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                DealFlow AI
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.58rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--blue-600, #2563EB)',
                  background: 'var(--blue-50, #EFF6FF)',
                  border: '1px solid var(--blue-100, #DBEAFE)',
                  borderRadius: 20,
                  padding: '1.5px 6px',
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

      {/* Collapse toggle (hidden on mobile) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute flex items-center justify-center cursor-pointer hidden md:flex"
        style={{
          top: 60,
          right: -11,
          width: 22,
          height: 22,
          zIndex: 10,
          background: 'var(--white)',
          border: '1px solid var(--nav-border)',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'background 0.15s ease',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight style={{ width: 11, height: 11, color: 'var(--muted-text)' }} />
        ) : (
          <ChevronLeft style={{ width: 11, height: 11, color: 'var(--muted-text)' }} />
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 flex flex-col sidebar-nav-scroll" style={{ padding: '10px 10px', overflowY: 'auto', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <NavSection label="Main" items={mainItems} collapsed={collapsed} pathname={pathname} isFirst onLinkClick={closeMobile} badges={badges} />
          <NavSection label="Workspace" items={workspaceItems} collapsed={collapsed} pathname={pathname} onLinkClick={closeMobile} badges={badges} />
        </div>
      </nav>

      {/* Settings + Admin + User */}
      <div style={{ padding: '6px 10px 12px', borderTop: '1px solid var(--nav-border)' }}>
        {/* Admin link (only for admins) */}
        {(profile as any).platformRole === 'admin' && (
          <Link
            href="/admin"
            title={collapsed ? 'Admin' : undefined}
            onClick={closeMobile}
            className="sidebar-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '7px 0' : '7px 10px',
              borderRadius: 'var(--nav-item-radius)',
              fontSize: 'var(--nav-font-size)',
              fontWeight: 600,
              fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
              letterSpacing: '-0.01em',
              textDecoration: 'none',
              justifyContent: collapsed ? 'center' : 'flex-start',
              marginBottom: 4,
              color: 'var(--dash-text, #0B1224)',
              background: 'transparent',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Shield
              className="flex-shrink-0"
              style={{
                width: 'var(--nav-icon-size)',
                height: 'var(--nav-icon-size)',
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
          onClick={closeMobile}
          className={`sidebar-link${pathname.startsWith('/settings') ? ' sidebar-link-active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '7px 0' : '7px 10px',
            borderRadius: 'var(--nav-item-radius)',
            fontSize: 'var(--nav-font-size)',
            fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            letterSpacing: '-0.01em',
            fontWeight: pathname.startsWith('/settings') ? 550 : 450,
            textDecoration: 'none',
            justifyContent: collapsed ? 'center' : 'flex-start',
            marginBottom: 8,
            color: pathname.startsWith('/settings') ? 'var(--nav-active-text)' : 'var(--nav-inactive-text)',
            background: pathname.startsWith('/settings') ? 'var(--nav-active-bg)' : 'transparent',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
          }}
        >
          <Settings
            className="flex-shrink-0"
            style={{
              width: 'var(--nav-icon-size)',
              height: 'var(--nav-icon-size)',
              strokeWidth: pathname.startsWith('/settings') ? 1.9 : 1.6,
              color: pathname.startsWith('/settings') ? 'var(--nav-active-icon)' : 'var(--nav-inactive-icon)',
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
            padding: collapsed ? '7px 0' : '7px 10px',
            borderRadius: 'var(--nav-item-radius)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background 0.15s ease',
          }}
        >
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt="Avatar"
              width={30}
              height={30}
              style={{
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                width: 30,
                height: 30,
              }}
            />
          ) : (
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'white', letterSpacing: '0.02em' }}>{initials}</span>
            </div>
          )}
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                  color: 'var(--navy-heading)',
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
                <LogOut style={{ width: 14, height: 14, color: 'var(--body-text)' }} />
              </button>
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-nav-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        .sidebar-nav-scroll:hover {
          scrollbar-color: rgba(5,14,36,0.12) transparent;
        }
        .sidebar-nav-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 3px;
        }
        .sidebar-nav-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(5,14,36,0.12);
        }
        .sidebar-link {
          position: relative;
        }
        .sidebar-link:hover:not(.sidebar-link-active) {
          background: var(--nav-hover-bg) !important;
          color: var(--dash-text) !important;
        }
        .sidebar-link:hover:not(.sidebar-link-active) svg {
          color: var(--nav-inactive-text) !important;
        }
        .sidebar-link-active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--nav-active-text);
        }
        .sidebar-user:hover {
          background: var(--nav-hover-bg);
        }
        .sidebar-signout:hover {
          opacity: 1 !important;
          background: var(--nav-hover-bg) !important;
        }
        @keyframes badgeIn {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
      ` }} />
      </aside>
    </>
  )
}
