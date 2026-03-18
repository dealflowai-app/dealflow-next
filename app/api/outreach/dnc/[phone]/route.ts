import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { processOptIn, normalizePhone } from '@/lib/outreach'

// DELETE /api/outreach/dnc/[phone] — Remove from DNC list
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> },
) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { phone } = await params

  const normalized = normalizePhone(decodeURIComponent(phone))
  if (!normalized) return errorResponse(400, 'Invalid phone number')

  // Require explicit confirmation
  const { body, error: parseError } = await parseBody(req)
  if (!body) return errorResponse(400, parseError!)

  if (body.confirm !== true) {
    return errorResponse(400, 'Explicit confirmation required. Set { "confirm": true } in request body.')
  }

  const result = await processOptIn(normalized, profile.id)

  if (!result.success) return errorResponse(500, 'Failed to remove from DNC list')

  return successResponse({
    success: true,
    message: 'Number removed from DNC list. Buyer status set back to ACTIVE.',
  })
}
