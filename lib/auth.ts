import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function getAuthProfile() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { profile: null, error: 'Unauthorized', status: 401 }
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  })

  if (!profile) {
    return { profile: null, error: 'Profile not found', status: 404 }
  }

  return { profile, error: null, status: 200 }
}
