import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { listTemplates, type ContractType } from '@/lib/contracts/templates'
import { apiHandler } from '@/lib/api-handler'

// ─── GET /api/contracts/templates ───────────────────────────────────────────
// List available contract templates. Optional filters: state, type.
// Example of the apiHandler wrapper for consistent error handling + logging.

export const GET = apiHandler({ route: 'GET /api/contracts/templates' }, async (req) => {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return NextResponse.json({ error }, { status })

  const url = new URL(req.url)
  const state = url.searchParams.get('state') ?? undefined
  const type = url.searchParams.get('type') as ContractType | undefined

  const detail = url.searchParams.get('detail') === 'true'

  const templates = listTemplates({ state, type }).map((t) => ({
    id: t.id,
    name: t.name,
    state: t.state,
    type: t.type,
    version: t.version,
    fieldCount: t.fields.length,
    ...(detail ? { fields: t.fields, sections: t.sections } : {}),
  }))

  return NextResponse.json({ templates })
})
