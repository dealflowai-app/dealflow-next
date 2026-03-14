import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const quickActions = [
  { href: '/dashboard/deals/new', title: 'Submit a deal', desc: 'List a property and start AI buyer matching' },
  { href: '/dashboard/buyers', title: 'Buyer discovery', desc: 'Find and call verified cash buyers' },
  { href: '/dashboard/activity', title: 'Activity log', desc: 'AI calls, matches, and milestones' },
]

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
  if (!profile) redirect('/onboarding')

  const firstName = profile.firstName ?? profile.email.split('@')[0]

  return (
    <div className="p-9 max-w-[1080px]">
      {/* Header */}
      <div className="mb-9">
        <h1
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          className="text-[1.45rem] font-medium text-gray-900 tracking-[-0.025em] mb-1"
        >
          Welcome back, {firstName}
        </h1>
        <p className="text-[0.85rem] text-gray-400">
          Your deals and pipeline at a glance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-9 dash-stats">
        {[
          { label: 'Active Deals', value: '0' },
          { label: 'Buyer Matches', value: '0' },
          { label: 'AI Calls', value: '0' },
          { label: 'Closed', value: '0' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-5 py-4">
            <div className="text-[0.7rem] text-gray-400 mb-3 tracking-wide uppercase">{s.label}</div>
            <div
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
              className="text-[2rem] font-normal text-gray-900 tracking-[-0.04em] leading-none"
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-9">
        <div className="text-[0.68rem] text-gray-400 mb-3 tracking-wide uppercase">Get started</div>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {quickActions.map((a, i) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex items-center justify-between px-5 py-4 no-underline group transition-colors hover:bg-gray-50 ${
                i < quickActions.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div>
                <div className="text-[0.88rem] text-gray-800 mb-0.5">{a.title}</div>
                <div className="text-[0.78rem] text-gray-400">{a.desc}</div>
              </div>
              <svg
                className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0"
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[0.68rem] text-gray-400 tracking-wide uppercase">
            Recent deals
          </div>
          <Link
            href="/dashboard/deals"
            className="text-[0.78rem] text-gray-400 no-underline hover:text-gray-700 transition-colors"
          >
            View all
          </Link>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="py-14 px-6 text-center">
            <div className="text-[0.84rem] text-gray-400 mb-5 max-w-[340px] mx-auto">
              No deals submitted yet. Submit a property to get started.
            </div>
            <Link
              href="/dashboard/deals/new"
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 rounded-md px-4 py-2 text-[0.84rem] no-underline hover:bg-gray-50 transition-colors"
            >
              Submit a deal
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dash-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
