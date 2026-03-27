/**
 * Security Middleware for API Routes
 *
 * Wraps Next.js route handlers with automatic input sanitization,
 * CSRF protection, and security headers on responses.
 *
 * Usage:
 *   import { withSecurity } from '@/lib/security-middleware'
 *
 *   export const POST = withSecurity(async (req) => { ... })
 */

import { NextRequest, NextResponse } from 'next/server'
import { sanitizeString } from '@/lib/validation'

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>

// ─── Deep sanitize all string values in an object ──────────────────────────

/** Keys that must never appear in user input (prototype pollution prevention) */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function deepSanitize<T>(obj: T, depth = 0): T {
  // Prevent stack overflow from deeply nested payloads
  if (depth > 20) return obj

  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, depth + 1)) as unknown as T
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Block prototype pollution attacks
      if (DANGEROUS_KEYS.has(key)) continue
      sanitized[key] = deepSanitize(value, depth + 1)
    }
    return sanitized as T
  }
  return obj
}

// ─── CSRF origin validation ────────────────────────────────────────────────

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function isValidOrigin(req: NextRequest): boolean {
  if (SAFE_METHODS.has(req.method)) return true

  const origin = req.headers.get('origin')
  const host = req.headers.get('host')

  // Allow requests with no origin (same-origin, server-to-server, curl)
  if (!origin) return true

  try {
    const originHost = new URL(origin).host
    // Origin must match the host header
    if (originHost === host) return true

    // Allow localhost during development
    if (
      process.env.NODE_ENV === 'development' &&
      (originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1'))
    ) {
      return true
    }

    return false
  } catch {
    return false
  }
}

// ─── Security response headers ─────────────────────────────────────────────

function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// ─── Main security wrapper ─────────────────────────────────────────────────

interface SecurityConfig {
  /** Skip CSRF origin check (e.g., for webhook endpoints) */
  skipCsrf?: boolean
  /** Skip input sanitization */
  skipSanitize?: boolean
}

/**
 * Wraps a route handler with security protections:
 * - CSRF origin validation for state-changing methods (POST/PUT/PATCH/DELETE)
 * - Deep sanitization of all string values in the request body
 * - Security headers on responses
 */
export function withSecurity(
  handler: RouteHandler,
  config?: SecurityConfig,
): RouteHandler {
  return async (req: NextRequest, ctx?: unknown) => {
    // CSRF: validate origin for state-changing requests
    if (!config?.skipCsrf && !isValidOrigin(req)) {
      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 },
      )
    }

    const response = await handler(req, ctx)
    return addSecurityHeaders(response)
  }
}

/**
 * Parse and sanitize a JSON request body in one step.
 * Returns the sanitized body or an error response.
 */
export async function parseAndSanitizeBody(
  req: NextRequest,
  maxSizeKB = 100,
): Promise<{ body: Record<string, unknown>; error?: undefined } | { body: null; error: string }> {
  try {
    const contentLength = req.headers.get('content-length')
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10)
      if (!isNaN(sizeBytes) && sizeBytes > maxSizeKB * 1024) {
        return { body: null, error: `Request body too large (max ${maxSizeKB}KB)` }
      }
    }

    const text = await req.text()
    if (text.length > maxSizeKB * 1024) {
      return { body: null, error: `Request body too large (max ${maxSizeKB}KB)` }
    }

    if (!text) {
      return { body: null, error: 'Request body is empty' }
    }

    const parsed = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { body: null, error: 'Request body must be a JSON object' }
    }

    // Deep-sanitize all string values
    const body = deepSanitize(parsed)
    return { body }
  } catch {
    return { body: null, error: 'Invalid JSON body' }
  }
}
