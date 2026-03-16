// ─── API Handler Wrapper ────────────────────────────────────────────────────
// Optional wrapper that provides consistent error handling, logging, and
// duration timing for API route handlers. Use for new routes; existing
// routes don't need to be migrated.

import { NextRequest, NextResponse } from 'next/server'
import { logger, generateRequestId, type LogContext } from './logger'
import { handlePrismaError } from './prisma-errors'

type RouteHandler = (
  req: NextRequest,
  context: { params?: Promise<Record<string, string>> },
) => Promise<NextResponse>

export interface HandlerOptions {
  route: string // e.g. 'POST /api/deals'
}

/**
 * Wraps a route handler with:
 * - Request ID generation
 * - Duration timing
 * - Structured logging (start + end)
 * - Prisma error mapping
 * - Generic error catch
 */
export function apiHandler(options: HandlerOptions, handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    const requestId = generateRequestId()
    const start = Date.now()
    const logCtx: LogContext = {
      requestId,
      route: options.route,
      method: req.method,
    }

    logger.info('Request started', logCtx)

    try {
      const response = await handler(req, context)
      const durationMs = Date.now() - start

      logger.info('Request completed', {
        ...logCtx,
        durationMs,
        status: response.status,
      })

      return response
    } catch (err) {
      const durationMs = Date.now() - start

      // Try Prisma-specific error handling first
      const prismaResponse = handlePrismaError(err, { ...logCtx, durationMs })

      // handlePrismaError already logs, so just return
      return prismaResponse
    }
  }
}
