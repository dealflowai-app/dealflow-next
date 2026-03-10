'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { type Profile, Role } from '@prisma/client'
import {
  LayoutDashboard,
  FileText,
  Plus,
  Radar,
  Crosshair,
  Rss,
  Settings,
  LogOut,
  Activity,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: Role[]
}

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: [Role.WHOLESALER, Role.BUYER, Role.BOTH] },
  { label: 'My Deals', href: '/dashboard/deals', icon: FileText, roles: [Role.WHOLESALER, Role.BOTH] },
  { label: 'Submit Deal', href: '/dashboard/deals/new', icon: Plus, roles: [Role.WHOLESALER, Role.BOTH] },
  { label: 'Discovery', href: '/dashboard/buyers', icon: Radar, roles: [Role.WHOLESALER, Role.BOTH] },
  { label: 'Buy Box', href: '/dashboard/buyerbox', icon: Crosshair, roles: [Role.BUYER, Role.BOTH] },
  { label: 'Deal Feed', href: '/dashboard/feed', icon: Rss, roles: [Role.BUYER, Role.BOTH] },
  { label: 'Activity', href: '/dashboard/activity', icon: Activity, roles: [Role.WHOLESALER, Role.BUYER, Role.BOTH] },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, roles: [Role.WHOLESALER, Role.BUYER, Role.BOTH] },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const visibleItems = navItems.filter(item => item.roles.includes(profile.role))

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
    <aside className="w-[220px] flex-shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="h-[56px] flex items-center px-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2 no-underline">
          <Image src="/Logo.png" alt="DealFlow AI" width={20} height={20} style={{ objectFit: 'contain' }} />
          <span
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            className="font-medium text-[0.88rem] text-gray-800 tracking-tight"
          >
            DealFlow AI
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <div className="space-y-px">
          {visibleItems.map(item => {
            const Icon = item.icon
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[0.82rem]
                  transition-colors duration-100 no-underline
                  ${isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
                `}
              >
                <Icon
                  className={`w-[15px] h-[15px] flex-shrink-0 ${
                    isActive ? 'text-gray-700' : 'text-gray-400'
                  }`}
                />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User */}
      <div className="px-2.5 pb-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <span className="text-[0.58rem] font-medium text-gray-600">{initials}</span>
          </div>
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
        </div>
      </div>
    </aside>
  )
}
