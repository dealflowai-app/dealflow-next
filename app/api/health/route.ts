// ─── Health Check Endpoint ──────────────────────────────────────────────────
// No auth required. Checks DB connectivity and reports uptime.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const startTime = Date.now()

export async function GET() {
  const checks: Record<string, string> = {}
  let healthy = true

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'unreachable'
    healthy = false
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      uptime: uptimeSeconds,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  )
}
