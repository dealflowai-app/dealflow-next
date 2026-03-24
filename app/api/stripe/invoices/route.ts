import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const invoices = await prisma.paymentHistory.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    logger.error('Invoice fetch error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}
