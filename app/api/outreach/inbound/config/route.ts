import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse, parseBody } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { DEFAULT_INBOUND_CONFIG, type InboundRoutingConfig } from '@/lib/outreach/inbound-router'

// GET /api/outreach/inbound/config — Get inbound routing config
export async function GET() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const p = await prisma.profile.findUnique({
    where: { id: profile.id },
    select: { settings: true, company: true },
  })

  const settings = (p?.settings as Record<string, unknown>) || {}
  const config: InboundRoutingConfig = {
    ...DEFAULT_INBOUND_CONFIG,
    ...(settings.inboundConfig as Partial<InboundRoutingConfig> || {}),
    companyName: (settings.inboundConfig as any)?.companyName || p?.company || DEFAULT_INBOUND_CONFIG.companyName,
  }

  return successResponse({ config })
}

// PUT /api/outreach/inbound/config — Update inbound routing config
export async function PUT(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { body, error: parseError } = await parseBody(req, 200)
  if (!body) return errorResponse(400, parseError!)

  // Validate fields
  const config: Partial<InboundRoutingConfig> = {}

  if (body.autoAnswer !== undefined) config.autoAnswer = !!body.autoAnswer
  if (body.forwardNumber !== undefined) config.forwardNumber = (body.forwardNumber as string) || null
  if (body.forwardAfterRings !== undefined) {
    const rings = parseInt(String(body.forwardAfterRings))
    if (isNaN(rings) || rings < 0 || rings > 20) return errorResponse(400, 'forwardAfterRings must be 0-20')
    config.forwardAfterRings = rings
  }
  if (body.forwardOnlyDuring !== undefined) {
    if (body.forwardOnlyDuring === null) {
      config.forwardOnlyDuring = null
    } else {
      const fod = body.forwardOnlyDuring as any
      config.forwardOnlyDuring = {
        start: fod.start || '09:00',
        end: fod.end || '18:00',
        timezone: fod.timezone || 'America/New_York',
      }
    }
  }
  if (body.aiAnswerUnknown !== undefined) config.aiAnswerUnknown = !!body.aiAnswerUnknown
  if (body.sendToVoicemailWhen !== undefined) {
    const valid = ['never', 'after_hours', 'unknown_callers', 'always']
    if (!valid.includes(body.sendToVoicemailWhen as string)) return errorResponse(400, `sendToVoicemailWhen must be: ${valid.join(', ')}`)
    config.sendToVoicemailWhen = body.sendToVoicemailWhen as InboundRoutingConfig['sendToVoicemailWhen']
  }
  if (body.companyName !== undefined) config.companyName = (body.companyName as string) || DEFAULT_INBOUND_CONFIG.companyName
  if (body.agentName !== undefined) config.agentName = (body.agentName as string) || DEFAULT_INBOUND_CONFIG.agentName

  // Merge with existing settings
  const p = await prisma.profile.findUnique({
    where: { id: profile.id },
    select: { settings: true },
  })
  const existingSettings = (p?.settings as Record<string, unknown>) || {}
  const existingInbound = (existingSettings.inboundConfig as Record<string, unknown>) || {}

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      settings: {
        ...existingSettings,
        inboundConfig: { ...existingInbound, ...config },
      },
    },
  })

  const mergedConfig: InboundRoutingConfig = {
    ...DEFAULT_INBOUND_CONFIG,
    ...existingInbound as Partial<InboundRoutingConfig>,
    ...config,
  }

  return successResponse({ config: mergedConfig })
}
