// ─── Prisma Error Handler ───────────────────────────────────────────────────
// Maps common Prisma error codes to user-friendly HTTP responses.

import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { logger, type LogContext } from './logger'

interface PrismaErrorResult {
  status: number
  error: string
  detail?: string
}

/**
 * Maps a Prisma error to an HTTP-friendly result.
 * Returns null if the error is not a recognized Prisma error.
 */
export function mapPrismaError(err: unknown): PrismaErrorResult | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'field'
        return {
          status: 409,
          error: 'Duplicate entry',
          detail: `A record with this ${target} already exists`,
        }
      }
      case 'P2025':
        return {
          status: 404,
          error: 'Not found',
          detail: 'The requested record does not exist or has been deleted',
        }
      case 'P2003': {
        const field = (err.meta?.field_name as string) || 'reference'
        return {
          status: 400,
          error: 'Invalid reference',
          detail: `The referenced ${field} does not exist`,
        }
      }
      case 'P2014':
        return {
          status: 400,
          error: 'Relation violation',
          detail: 'This change would violate a required relation',
        }
      default:
        return {
          status: 500,
          error: 'Database error',
          detail: `Prisma error ${err.code}`,
        }
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 400,
      error: 'Invalid data',
      detail: 'The provided data does not match the expected schema',
    }
  }

  return null
}

/**
 * Handle a Prisma error by logging and returning a NextResponse.
 * If the error is not a Prisma error, returns a generic 500.
 */
export function handlePrismaError(err: unknown, context?: LogContext): NextResponse {
  const mapped = mapPrismaError(err)

  if (mapped) {
    logger.warn('Prisma error', {
      ...context,
      prismaCode: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : 'validation',
      detail: mapped.detail,
    })
    return NextResponse.json(
      { error: mapped.error, detail: mapped.detail },
      { status: mapped.status },
    )
  }

  // Not a Prisma error — log as unexpected
  logger.error('Unexpected error', {
    ...context,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  })
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 },
  )
}
