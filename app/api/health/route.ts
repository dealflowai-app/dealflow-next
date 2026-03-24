// ─── Health Check Endpoint ──────────────────────────────────────────────────
// No auth required for basic check. ?detail requires CRON_SECRET bearer token.
// Use for load balancer health checks and monitoring.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateEnv } from '@/lib/env'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import * as crypto from 'crypto'

const startTime = Date.now()

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export async function GET(req: NextRequest) {
  // Rate limit: 30 requests/minute per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(`health:${ip}`, 30, 60_000)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const checks: Record<string, string> = {}
  let healthy = true

  // Database connectivity check
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start
    checks.database = latency > 5000 ? `slow (${latency}ms)` : 'ok'
    if (latency > 5000) healthy = false
  } catch {
    checks.database = 'unreachable'
    healthy = false
  }

  // Environment validation
  const env = validateEnv()
  if (!env.valid) {
    checks.environment = 'degraded'
    healthy = false
  } else {
    checks.environment = 'ok'
  }

  // Memory usage
  const memUsage = process.memoryUsage()
  const heapUsedMb = Math.round(memUsage.heapUsed / 1024 / 1024)
  const heapTotalMb = Math.round(memUsage.heapTotal / 1024 / 1024)
  checks.memory = `${heapUsedMb}/${heapTotalMb}MB`

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)

  const body: Record<string, unknown> = {
    status: healthy ? 'healthy' : 'degraded',
    uptime: uptimeSeconds,
    checks,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
  }

  // Detailed check — requires CRON_SECRET bearer token
  const detail = req.nextUrl.searchParams.has('detail')
  if (detail) {
    const auth = req.headers.get('authorization') || ''
    const secret = process.env.CRON_SECRET || ''
    if (!secret || !safeCompare(auth, `Bearer ${secret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    body.env = {
      missing: env.missing,
      warnings: env.warnings,
      formatErrors: env.formatErrors,
    }
    body.memory = {
      heapUsedMb,
      heapTotalMb,
      rssMb: Math.round(memUsage.rss / 1024 / 1024),
    }
    body.node = process.version
  }

  return NextResponse.json(body, { status: healthy ? 200 : 503 })
}
