import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      platformRole: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  })

  if (!profile || profile.platformRole !== 'admin') redirect('/dashboard')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AdminSidebar
        user={{
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
        }}
      />
      <main
        style={{
          flex: 1,
          background: '#F9FAFB',
          overflowY: 'auto',
          height: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  )
}
