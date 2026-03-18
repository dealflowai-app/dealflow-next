import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { Validator } from '@/lib/validation'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// GET /api/outreach/inbound/[id] — Single inbound call detail
export async function GET(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const call = await prisma.inboundCall.findUnique({
    where: { id },
    include: {
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          entityName: true,
          phone: true,
          email: true,
          buyerScore: true,
          status: true,
          preferredTypes: true,
          strategy: true,
          preferredMarkets: true,
        },
      },
    },
  })

  if (!call) return errorResponse(404, 'Call not found')
  if (call.profileId !== profile.id) return errorResponse(404, 'Call not found')

  return successResponse({ call })
}

// PATCH /api/outreach/inbound/[id] — Update notes, outcome
export async function PATCH(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const call = await prisma.inboundCall.findUnique({ where: { id } })
  if (!call) return errorResponse(404, 'Call not found')
  if (call.profileId !== profile.id) return errorResponse(404, 'Call not found')

  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  const v = new Validator()
  if (body.notes !== undefined) v.string('notes', body.notes, { maxLength: 2000, label: 'Notes' })
  if (body.outcome !== undefined) {
    v.enumValue('outcome', body.outcome, ['QUALIFIED', 'NOT_BUYING', 'VOICEMAIL', 'NO_ANSWER', 'CALLBACK_REQUESTED', 'DO_NOT_CALL'], 'Outcome')
  }
  if (!v.isValid()) return v.toResponse()

  const data: Record<string, unknown> = {}
  if (body.notes !== undefined) data.notes = body.notes
  if (body.outcome !== undefined) data.outcome = body.outcome
  if (body.aiSummary !== undefined) data.aiSummary = body.aiSummary

  if (Object.keys(data).length === 0) return errorResponse(400, 'No valid fields to update')

  const updated = await prisma.inboundCall.update({ where: { id }, data })
  return successResponse({ call: updated })
}

// POST /api/outreach/inbound/[id]/add-to-crm — Create CashBuyer from unknown inbound caller
export async function POST(req: NextRequest, { params }: Params) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id } = await params
  const call = await prisma.inboundCall.findUnique({ where: { id } })
  if (!call) return errorResponse(404, 'Call not found')
  if (call.profileId !== profile.id) return errorResponse(404, 'Call not found')

  // Prevent adding already-identified callers
  if (call.buyerId) return errorResponse(400, 'This caller is already linked to a buyer in your CRM')

  const { body } = await parseBody(req, 200)
  // body is optional — user can override name/notes

  // Check if a buyer with this phone already exists
  const existing = await prisma.cashBuyer.findFirst({
    where: { profileId: profile.id, phone: { contains: call.fromPhone.replace(/\D/g, '').slice(-10) } },
  })
  if (existing) {
    // Link existing buyer to this call
    await prisma.inboundCall.update({
      where: { id },
      data: { buyerId: existing.id, identified: true, buyerName: existing.firstName || existing.entityName || null },
    })
    return successResponse({ buyer: existing, linked: true })
  }

  // Create new CashBuyer pre-filled from the inbound call
  const context = (call.extractedData as Record<string, unknown>) || {}
  const VALID_STRATEGIES = ['FLIP', 'HOLD', 'BOTH', 'LAND', 'COMMERCIAL'] as const
  const rawStrategy = typeof context.strategy === 'string' ? context.strategy.toUpperCase() : null
  const strategy = rawStrategy && VALID_STRATEGIES.includes(rawStrategy as any) ? rawStrategy as any : null

  const buyer = await prisma.cashBuyer.create({
    data: {
      profileId: profile.id,
      phone: call.fromPhone,
      firstName: (body?.firstName as string) || (call.buyerName as string) || null,
      lastName: (body?.lastName as string) || null,
      entityName: (body?.entityName as string) || null,
      source: 'inbound_call',
      status: 'ACTIVE',
      notes: body?.notes
        ? String(body.notes)
        : call.aiSummary
        ? `Inbound call summary: ${call.aiSummary}`
        : `Added from inbound call on ${new Date(call.createdAt).toLocaleDateString()}`,
      preferredTypes: Array.isArray(context.preferredTypes) ? context.preferredTypes : [],
      preferredMarkets: Array.isArray(context.markets) ? context.markets : [],
      strategy,
    },
  })

  // Link the inbound call to the new buyer
  await prisma.inboundCall.update({
    where: { id },
    data: { buyerId: buyer.id, identified: true, buyerName: buyer.firstName || buyer.entityName || null },
  })

  return successResponse({ buyer, linked: false })
}
