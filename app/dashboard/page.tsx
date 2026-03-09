import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

const wholesalerActions = [
  {
    href: '/dashboard/deals/new',
    title: 'Submit a Deal',
    desc: 'Add a property to start AI buyer matching',
    cta: 'Submit deal →',
    accent: '#2563eb',
    bg: '#eff6ff',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/buyers',
    title: 'Buyer CRM',
    desc: 'View matched cash buyers and call logs',
    cta: 'View buyers →',
    accent: '#059669',
    bg: '#f0fdf4',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/activity',
    title: 'Activity',
    desc: 'Track AI calls, matches, and milestones',
    cta: 'See activity →',
    accent: '#d97706',
    bg: '#fffbeb',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

const buyerActions = [
  {
    href: '/dashboard/buyerbox',
    title: 'Set Buy Box',
    desc: 'Define your criteria to receive matched deals',
    cta: 'Set criteria →',
    accent: '#2563eb',
    bg: '#eff6ff',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/feed',
    title: 'Deal Feed',
    desc: 'Browse deals matched to your buy box',
    cta: 'Browse deals →',
    accent: '#059669',
    bg: '#f0fdf4',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
      </svg>
    ),
  },
]

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) redirect('/onboarding')

  const isWholesaler = profile.role === Role.WHOLESALER || profile.role === Role.BOTH
  const isBuyer = profile.role === Role.BUYER || profile.role === Role.BOTH
  const firstName = profile.firstName ?? profile.email.split('@')[0]
  const actions = isWholesaler ? wholesalerActions : buyerActions

  return (
    <div className="p-9 max-w-[1080px]">
      {/* Header */}
      <div className="mb-8">
        <h1
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="text-[1.7rem] font-extrabold text-gray-900 tracking-[-0.03em] mb-1.5"
        >
          Welcome back, {firstName}
        </h1>
        <p className="text-[0.88rem] text-gray-500">
          Here&apos;s what&apos;s happening with your {isWholesaler ? 'deals' : 'pipeline'} today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8 dash-stats">
        {[
          { label: isWholesaler ? 'Active Deals' : 'Matched Deals', value: '0', sub: isWholesaler ? 'No deals submitted yet' : 'No matches yet' },
          { label: isWholesaler ? 'Buyer Matches' : 'Calls Received', value: '0', sub: 'AI outreach pending' },
          { label: 'AI Calls Made', value: '0', sub: 'Automated outreach' },
          { label: isWholesaler ? 'Closed Deals' : 'Deals Closed', value: '0', sub: 'Assignments completed' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl px-5 py-5 shadow-sm">
            <div className="text-[0.68rem] font-semibold tracking-[0.06em] uppercase text-gray-400 mb-2">{s.label}</div>
            <div
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              className="text-[2rem] font-extrabold text-gray-900 tracking-[-0.04em] leading-none mb-1.5"
            >
              {s.value}
            </div>
            <div className="text-[0.72rem] text-gray-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-[0.68rem] font-bold tracking-[0.08em] uppercase text-gray-400 mb-3.5">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4 dash-actions">
          {actions.map(a => (
            <Link key={a.href} href={a.href} className="no-underline group">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm transition-all duration-150 group-hover:shadow-md group-hover:border-gray-200 group-hover:-translate-y-px h-full">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: a.bg, color: a.accent }}
                >
                  {a.icon}
                </div>
                <div
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: 'var(--gray-900)' }}
                  className="font-bold text-[0.95rem] mb-1.5 tracking-[-0.02em]"
                >
                  {a.title}
                </div>
                <div className="text-[0.8rem] text-gray-500 mb-4 leading-relaxed">{a.desc}</div>
                <div className="text-[0.8rem] font-semibold" style={{ color: a.accent }}>{a.cta}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[0.68rem] font-bold tracking-[0.08em] uppercase text-gray-400">
            {isWholesaler ? 'Recent Deals' : 'Recent Matches'}
          </h2>
          <Link href={isWholesaler ? '/dashboard/deals' : '/dashboard/feed'} className="text-[0.78rem] text-blue-600 font-semibold no-underline">
            View all →
          </Link>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              className="font-bold text-[0.9rem] text-gray-800 mb-1.5"
            >
              {isWholesaler ? 'No deals yet' : 'No matches yet'}
            </div>
            <div className="text-[0.82rem] text-gray-400 mb-5 max-w-[300px] mx-auto">
              {isWholesaler
                ? 'Submit your first property to start getting buyer matches.'
                : 'Set up your buy box and deals will start appearing here.'}
            </div>
            <Link
              href={isWholesaler ? '/dashboard/deals/new' : '/dashboard/buyerbox'}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white rounded-[9px] px-4 py-2.5 text-[0.84rem] font-bold no-underline"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {isWholesaler ? 'Submit a deal' : 'Set up buy box'}
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dash-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-actions { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
