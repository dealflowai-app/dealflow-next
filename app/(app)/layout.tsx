import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/dashboard/Sidebar'
import GlobalSearch from '@/components/dashboard/GlobalSearch'
import { ToastProvider } from '@/components/toast'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  })

  if (!profile) redirect('/onboarding')

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--cream, #FAF9F6)' }}>
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <ToastProvider>
          {children}
        </ToastProvider>
      </main>
      <GlobalSearch />
    </div>
  )
}
