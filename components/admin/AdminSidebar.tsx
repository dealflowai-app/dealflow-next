'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Users,
  DollarSign,
  Activity,
  FileText,
  Server,
  Settings,
  ArrowLeft,
  LayoutDashboard,
} from 'lucide-react'

interface AdminUser {
  email: string
  firstName: string | null
  lastName: string | null
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const adminNavItems: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Revenue', href: '/admin/revenue', icon: DollarSign },
  { label: 'Usage Analytics', href: '/admin/usage', icon: BarChart3 },
  { label: 'Content', href: '/admin/content', icon: FileText },
  { label: 'System', href: '/admin/system', icon: Server },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminSidebar({ user }: { user: AdminUser }) {
  const pathname = usePathname()

  const initials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user.email.slice(0, 2).toUpperCase()

  const displayName =
    user.firstName
      ? `${user.firstName} ${user.lastName ?? ''}`.trim()
      : user.email

  return (
    <aside
      style={{
        width: 240,
        background: '#0B1224',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 58,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          gap: 9,
        }}
      >
        <Image
          src="/Logo.png"
          alt="DealFlow AI logo"
          width={28}
          height={28}
          style={{ objectFit: 'contain', flexShrink: 0 }}
        />
        <span
          style={{
            fontWeight: 500,
            fontSize: '0.95rem',
            color: '#ffffff',
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
            fontSize: '0.58rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#ffffff',
            background: '#DC2626',
            borderRadius: 20,
            padding: '2px 7px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 10px' }}>
        <p
          style={{
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            margin: '0 0 6px 12px',
            fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          Administration
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className="admin-nav-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 500 : 400,
                  fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                  letterSpacing: '-0.005em',
                  textDecoration: 'none',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Icon
                  style={{
                    width: 17,
                    height: 17,
                    strokeWidth: isActive ? 2 : 1.7,
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
                    transition: 'color 0.18s ease',
                    flexShrink: 0,
                  }}
                />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div style={{ padding: '8px 10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Back to app */}
        <Link
          href="/dashboard"
          className="admin-nav-link"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 10,
            fontSize: '0.82rem',
            fontWeight: 400,
            fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
            letterSpacing: '-0.005em',
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.5)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            marginBottom: 8,
          }}
        >
          <ArrowLeft
            style={{
              width: 17,
              height: 17,
              strokeWidth: 1.7,
              color: 'rgba(255,255,255,0.4)',
              flexShrink: 0,
            }}
          />
          Back to app
        </Link>

        {/* Admin user */}
        <div
          className="admin-user"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 10,
            transition: 'background 0.15s ease',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.02em' }}>
              {initials}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '0.78rem',
                fontWeight: 500,
                fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                color: '#ffffff',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.3,
              }}
            >
              {displayName}
            </p>
            <p
              style={{
                fontSize: '0.65rem',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.4)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Administrator
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-nav-link:hover {
          background: rgba(255,255,255,0.08) !important;
          color: #ffffff !important;
        }
        .admin-nav-link:hover svg {
          color: rgba(255,255,255,0.7) !important;
        }
        .admin-user:hover {
          background: rgba(255,255,255,0.05);
        }
      ` }} />
    </aside>
  )
}
