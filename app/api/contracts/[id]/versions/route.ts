import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { getVersionHistory, getVersion, diffVersions } from '@/lib/contracts/versioning'

type RouteCtx = { params: Promise<{ id: string }> }

// ─── GET /api/contracts/[id]/versions ───────────────────────────────────────
// Returns version history, a single version, or a diff between two versions.
//
// Query params:
//   (none)           → full version history list
//   ?version=3       → single version detail
//   ?diffA=1&diffB=3 → diff between two versions

export async function GET(req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params
    const url = new URL(req.url)

    // ── Single version detail ──
    const versionParam = url.searchParams.get('version')
    if (versionParam) {
      const vNum = parseInt(versionParam, 10)
      if (isNaN(vNum) || vNum < 1) {
        return NextResponse.json({ error: 'Invalid version number' }, { status: 400 })
      }
      const version = await getVersion(id, vNum, profile.id)
      if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })
      return NextResponse.json({ version })
    }

    // ── Diff between two versions ──
    const diffA = url.searchParams.get('diffA')
    const diffB = url.searchParams.get('diffB')
    if (diffA && diffB) {
      const a = parseInt(diffA, 10)
      const b = parseInt(diffB, 10)
      if (isNaN(a) || isNaN(b) || a < 1 || b < 1) {
        return NextResponse.json({ error: 'Invalid version numbers for diff' }, { status: 400 })
      }
      const diffs = await diffVersions(id, a, b, profile.id)
      if (!diffs) return NextResponse.json({ error: 'Contract or versions not found' }, { status: 404 })
      return NextResponse.json({ diffs, versionA: a, versionB: b })
    }

    // ── Full version history ──
    const result = await getVersionHistory(id, profile.id)
    if (!result) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/contracts/[id]/versions error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch versions', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
