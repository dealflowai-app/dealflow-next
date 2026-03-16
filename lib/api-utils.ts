import { NextRequest, NextResponse } from 'next/server'

// ─── Standard response helpers ──────────────────────────────────────────────

export function errorResponse(
  status: number,
  error: string,
  details?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { error, ...(details ? { details } : {}) },
    { status },
  )
}

export function successResponse(
  data: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(data, { status })
}

// ─── Safe body parser with size check ───────────────────────────────────────

const DEFAULT_MAX_SIZE_KB = 100

export async function parseBody(
  req: NextRequest,
  maxSizeKB = DEFAULT_MAX_SIZE_KB,
): Promise<{ body: Record<string, unknown> | null; error?: string }> {
  try {
    // Check content-length header first (rough check — not all requests have it)
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

    const body = JSON.parse(text)
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return { body: null, error: 'Request body must be a JSON object' }
    }

    return { body }
  } catch {
    return { body: null, error: 'Invalid JSON body' }
  }
}
