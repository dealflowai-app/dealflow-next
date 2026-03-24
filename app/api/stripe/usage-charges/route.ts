import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUsageCharges } from '@/lib/usage'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const charges = await getUsageCharges(profile.id)
    return NextResponse.json(charges)
  } catch (error) {
    logger.error('Usage charges error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to calculate charges' }, { status: 500 })
  }
}
