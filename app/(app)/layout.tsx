import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/dashboard/Sidebar'
import GlobalSearch from '@/components/dashboard/GlobalSearch'
import KeyboardShortcuts from '@/components/KeyboardShortcuts'
import ProductTour from '@/components/ProductTour'
import DealCalculator from '@/components/DealCalculator'
import DemoBanner from '@/components/DemoBanner'
import StagingBanner from '@/components/StagingBanner'
import TopBar from '@/components/layout/TopBar'
import { ToastProvider } from '@/components/toast'
import { MobileSidebarProvider } from '@/components/layout/MobileSidebarContext'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.error('[DashboardLayout] Supabase auth error:', err)
    redirect('/login')
  }

  if (!user) redirect('/login')

  let profile
  try {
    profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    })
  } catch (err) {
    console.error('[DashboardLayout] Prisma query error:', err)
    throw new Error(`Database query failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (!profile) redirect('/signup?step=2')

  const profileSettings = (profile.settings as Record<string, unknown>) || {}
  const demoMode = profileSettings.demoMode === true

  // Check if we're on the welcome page (render without dashboard shell)
  const headersList = headers()
  const pathname = (await headersList).get('x-next-pathname') || ''
  const isWelcomePage = pathname === '/welcome'

  if (isWelcomePage) {
    return (
      <ToastProvider>
        {children}
      </ToastProvider>
    )
  }

  return (
    <MobileSidebarProvider>
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--dash-bg, #F9FAFB)' }}>
          <Sidebar profile={profile} />
          <main className="flex-1 flex flex-col overflow-hidden min-w-0">
            <StagingBanner />
            <TopBar />
            <DemoBanner demoMode={demoMode} />
            <div className="flex-1 overflow-y-auto">
              <ToastProvider>
                {children}
              </ToastProvider>
            </div>
          </main>
          <GlobalSearch />
          <KeyboardShortcuts />
          <ProductTour />
          <DealCalculator />
        </div>
      </MobileSidebarProvider>
  )
}
