'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { type Profile } from '@prisma/client'
import {
  LayoutDashboard,
  Users,
  Store,
  Radar,
  Contact,
  PhoneOutgoing,
  BarChart3,
  FileSignature,
  Bot,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
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
  { label: 'Community', href: '/dashboard/community', icon: Users },
  { label: 'Marketplace', href: '/dashboard/marketplace', icon: Store },
  { label: 'Discovery', href: '/dashboard/buyers', icon: Radar },
  { label: 'Buyer CRM', href: '/dashboard/crm', icon: Contact },
  { label: 'AI Outreach', href: '/dashboard/outreach', icon: PhoneOutgoing },
  { label: 'Property Analyzer', href: '/dashboard/analyzer', icon: BarChart3 },
  { label: 'Contracts', href: '/dashboard/contracts', icon: FileSignature },
  { label: 'DealFlow GPT', href: '/dashboard/gpt', icon: Bot },
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
      className="flex-shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col relative"
      style={{
        width: collapsed ? 68 : 240,
        transition: 'width 0.2s ease',
      }}
    >
      {/* Logo - matches landing Nav exactly */}
      <div className="h-[62px] flex items-center px-4 border-b border-gray-100">
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
                  fontSize: '0.97rem',
                  color: 'var(--gray-900)',
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
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--blue-600)',
                  background: 'var(--blue-50)',
                  border: '1px solid var(--blue-100)',
                  borderRadius: 20,
                  padding: '2px 8px',
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
        className="absolute bg-white border border-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
        style={{
          top: 72,
          right: -12,
          width: 24,
          height: 24,
          zIndex: 10,
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-gray-500" />
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <div className="space-y-px">
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
                className={`
                  flex items-center gap-2.5 py-[8px] rounded-md text-[0.82rem]
                  transition-colors duration-100 no-underline
                  ${collapsed ? 'justify-center px-0' : 'px-2.5'}
                  ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
                `}
              >
                <Icon
                  className={`flex-shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`}
                  style={{ width: 16, height: 16 }}
                />
                {!collapsed && item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Settings + User */}
      <div className="px-2.5 pb-3 pt-2 border-t border-gray-100">
        {/* Settings link */}
        <Link
          href="/dashboard/settings"
          title={collapsed ? 'Settings' : undefined}
          className={`
            flex items-center gap-2.5 py-[8px] rounded-md text-[0.82rem]
            transition-colors duration-100 no-underline mb-2
            ${collapsed ? 'justify-center px-0' : 'px-2.5'}
            ${pathname.startsWith('/dashboard/settings')
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
          `}
        >
          <Settings
            className={`flex-shrink-0 ${
              pathname.startsWith('/dashboard/settings') ? 'text-blue-600' : 'text-gray-400'
            }`}
            style={{ width: 16, height: 16 }}
          />
          {!collapsed && 'Settings'}
        </Link>

        {/* User */}
        <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[0.6rem] font-medium text-white">{initials}</span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[0.78rem] text-gray-700 truncate leading-tight">{displayName}</p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
