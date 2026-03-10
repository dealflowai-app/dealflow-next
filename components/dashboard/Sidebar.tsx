'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { type Profile, Role } from '@prisma/client'
import {
  LayoutDashboard,
  FileText,
  Plus,
  Users,
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
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: [Role.WHOLESALER, Role.BUYER, Role.BOTH],
  },
  {
    label: 'My Deals',
    href: '/dashboard/deals',
    icon: FileText,
    roles: [Role.WHOLESALER, Role.BOTH],
  },
  {
    label: 'Submit Deal',
    href: '/dashboard/deals/new',
    icon: Plus,
    roles: [Role.WHOLESALER, Role.BOTH],
  },
  {
    label: 'Buyer CRM',
    href: '/dashboard/buyers',
    icon: Users,
    roles: [Role.WHOLESALER, Role.BOTH],
  },
  {
    label: 'Buy Box',
    href: '/dashboard/buyerbox',
    icon: Crosshair,
    roles: [Role.BUYER, Role.BOTH],
  },
  {
    label: 'Deal Feed',
    href: '/dashboard/feed',
    icon: Rss,
    roles: [Role.BUYER, Role.BOTH],
  },
  {
    label: 'Activity',
    href: '/dashboard/activity',
    icon: Activity,
    roles: [Role.WHOLESALER, Role.BUYER, Role.BOTH],
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: [Role.WHOLESALER, Role.BUYER, Role.BOTH],
  },
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

  const roleLabel =
    profile.role === Role.WHOLESALER ? 'Wholesaler' :
    profile.role === Role.BUYER ? 'Buyer' :
    'Wholesaler + Buyer'

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
      <div className="h-[60px] flex items-center px-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
          <Image src="/Logo.png" alt="DealFlow AI" width={26} height={26} style={{ objectFit: 'contain' }} />
          <span
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            className="font-extrabold text-[0.92rem] text-gray-900 tracking-tight"
          >
            DealFlow AI
          </span>
        </Link>
      </div>

      {/* Role badge */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-[0.68rem] font-semibold text-gray-500 uppercase tracking-wider truncate">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-0.5">
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
                  flex items-center gap-2.5 px-3 py-2 rounded-lg text-[0.84rem] font-medium
                  transition-all duration-100 group no-underline
                  ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                `}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[0.65rem] font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.8rem] font-semibold text-gray-900 truncate">{displayName}</p>
            <p className="text-[0.7rem] text-gray-400 truncate">{profile.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
          </button>
        </div>
      </div>
    </aside>
  )
}
