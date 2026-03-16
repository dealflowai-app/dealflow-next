import { prisma } from '@/lib/prisma'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ChangeType = 'created' | 'fields_updated' | 'status_changed' | 'template_changed' | 'restored'

export interface CreateVersionInput {
  contractId: string
  filledData: Record<string, unknown> | null
  documentUrl: string | null
  changeType: ChangeType
  changeSummary?: string
  changedFields?: string[]
  previousValues?: Record<string, unknown>
  changedBy: string
}

export interface VersionDiff {
  field: string
  oldValue: unknown
  newValue: unknown
}

// ─── Create a new version snapshot ──────────────────────────────────────────

export async function createVersion(input: CreateVersionInput) {
  const contract = await prisma.contract.findUnique({
    where: { id: input.contractId },
    select: { currentVersion: true },
  })
  if (!contract) throw new Error('Contract not found')

  const nextVersion = contract.currentVersion + 1

  const version = await prisma.contractVersion.create({
    data: {
      contractId: input.contractId,
      version: nextVersion,
      filledData: input.filledData as never,
      documentUrl: input.documentUrl,
      changeType: input.changeType,
      changeSummary: input.changeSummary || null,
      changedFields: input.changedFields || [],
      previousValues: input.previousValues as never ?? null,
      changedBy: input.changedBy,
    },
  })

  await prisma.contract.update({
    where: { id: input.contractId },
    data: { currentVersion: nextVersion },
  })

  return version
}

// ─── Create v1 snapshot (initial creation) ──────────────────────────────────

export async function createInitialVersion(contractId: string, filledData: Record<string, unknown> | null, documentUrl: string | null, changedBy: string) {
  return prisma.contractVersion.create({
    data: {
      contractId,
      version: 1,
      filledData: filledData as never,
      documentUrl,
      changeType: 'created',
      changeSummary: 'Contract created',
      changedFields: [],
      changedBy,
    },
  })
}

// ─── Get version history for a contract ─────────────────────────────────────

export async function getVersionHistory(contractId: string, profileId: string) {
  // Verify ownership
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, profileId },
    select: { id: true, currentVersion: true },
  })
  if (!contract) return null

  const versions = await prisma.contractVersion.findMany({
    where: { contractId },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      changeType: true,
      changeSummary: true,
      changedFields: true,
      documentUrl: true,
      changedBy: true,
      createdAt: true,
    },
  })

  return { versions, currentVersion: contract.currentVersion }
}

// ─── Get a single version with full data ────────────────────────────────────

export async function getVersion(contractId: string, version: number, profileId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, profileId },
    select: { id: true },
  })
  if (!contract) return null

  return prisma.contractVersion.findUnique({
    where: { contractId_version: { contractId, version } },
  })
}

// ─── Diff two versions ─────────────────────────────────────────────────────

export async function diffVersions(contractId: string, versionA: number, versionB: number, profileId: string): Promise<VersionDiff[] | null> {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, profileId },
    select: { id: true },
  })
  if (!contract) return null

  const [a, b] = await Promise.all([
    prisma.contractVersion.findUnique({
      where: { contractId_version: { contractId, version: versionA } },
      select: { filledData: true },
    }),
    prisma.contractVersion.findUnique({
      where: { contractId_version: { contractId, version: versionB } },
      select: { filledData: true },
    }),
  ])

  if (!a || !b) return null

  const dataA = (a.filledData as Record<string, unknown>) ?? {}
  const dataB = (b.filledData as Record<string, unknown>) ?? {}

  // Collect all keys from both versions
  const allKeys = Array.from(new Set([...Object.keys(dataA), ...Object.keys(dataB)]))
  const diffs: VersionDiff[] = []

  for (const key of allKeys) {
    // Skip internal fields
    if (key.startsWith('_')) continue

    const oldVal = dataA[key]
    const newVal = dataB[key]

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ field: key, oldValue: oldVal ?? null, newValue: newVal ?? null })
    }
  }

  return diffs
}

// ─── Detect changed fields between old and new filledData ───────────────────

export function detectChangedFields(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): { changedFields: string[]; previousValues: Record<string, unknown> } {
  const old = oldData ?? {}
  const updated = newData ?? {}

  const changedFields: string[] = []
  const previousValues: Record<string, unknown> = {}

  const allKeys = Array.from(new Set([...Object.keys(old), ...Object.keys(updated)]))

  for (const key of allKeys) {
    if (key.startsWith('_')) continue
    if (JSON.stringify(old[key]) !== JSON.stringify(updated[key])) {
      changedFields.push(key)
      previousValues[key] = old[key] ?? null
    }
  }

  return { changedFields, previousValues }
}
