import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function getAdminProfile() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { profile: null, error: 'Unauthorized', status: 401 }
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      platformRole: true,
    },
  })

  if (!profile) {
    return { profile: null, error: 'Profile not found', status: 404 }
  }

  if (profile.platformRole !== 'admin') {
    return { profile: null, error: 'Forbidden', status: 403 }
  }

  return { profile, error: null, status: 200 }
}
