import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { processOptOut, importDNCList, getDNCList, normalizePhone } from '@/lib/outreach'
import { prisma } from '@/lib/prisma'

// GET /api/outreach/dnc — List DNC entries
export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const search = url.searchParams.get('search') || undefined

  const { entries, total } = await getDNCList(profile.id, { limit, offset, search })

  // Enrich with buyer names where possible
  const phones = entries.map(e => e.phone)
  const buyers = phones.length > 0
    ? await prisma.cashBuyer.findMany({
        where: { phone: { in: phones }, profileId: profile.id },
        select: { phone: true, firstName: true, lastName: true, entityName: true },
      })
    : []

  const buyerMap = new Map<string, string>()
  for (const b of buyers) {
    if (!b.phone) continue
    const normalized = normalizePhone(b.phone)
    if (!normalized) continue
    const name = b.entityName || [b.firstName, b.lastName].filter(Boolean).join(' ') || null
    if (name) buyerMap.set(normalized, name)
  }

  const enriched = entries.map(e => ({
    ...e,
    buyerName: buyerMap.get(e.phone) || null,
  }))

  return successResponse({ entries: enriched, total, limit, offset })
}

// POST /api/outreach/dnc — Add to DNC (single or bulk)
export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req, 500) // Allow larger for bulk
  if (!body) return errorResponse(400, parseError!)

  // Bulk import
  if (body.phones && Array.isArray(body.phones)) {
    const phones = body.phones as string[]
    if (phones.length === 0) return errorResponse(400, 'No phone numbers provided')
    if (phones.length > 10000) return errorResponse(400, 'Maximum 10,000 numbers per import')

    const result = await importDNCList(phones, profile.id)
    return successResponse({
      ...result,
      message: `Added ${result.added} numbers, ${result.skipped} already on list, ${result.invalid} invalid`,
    })
  }

  // Single add
  const phone = body.phone as string | undefined
  if (!phone) return errorResponse(400, 'Phone number is required')

  const normalized = normalizePhone(phone)
  if (!normalized) return errorResponse(400, 'Invalid phone number')

  const result = await processOptOut(normalized, {
    reason: (body.reason as string) || 'Manually added to DNC',
    source: (body.source as any) || 'manual',
    profileId: profile.id,
  })

  if (!result.success) return errorResponse(500, 'Failed to add to DNC list')

  return successResponse({
    success: true,
    alreadyOptedOut: result.alreadyOptedOut,
    message: result.alreadyOptedOut
      ? 'Number was already on the DNC list'
      : 'Number added to DNC list successfully',
  })
}
