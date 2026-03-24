import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as crypto from 'crypto'

export interface ApiKeyAuth {
  profileId: string
  keyId: string
  scopes: string[]
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const raw = crypto.randomBytes(32).toString('base64url')
  const key = `dfa_live_${raw}`
  return {
    key,
    keyHash: hashKey(key),
    keyPrefix: key.slice(0, 12),
  }
}

export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyAuth | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer dfa_')) return null

  const key = authHeader.slice(7) // Remove "Bearer "
  const keyHash = hashKey(key)

  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } })
  if (!apiKey || !apiKey.active) return null
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

  // Update last used timestamp (fire-and-forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return {
    profileId: apiKey.profileId,
    keyId: apiKey.id,
    scopes: apiKey.scopes,
  }
}

export function hasScope(auth: ApiKeyAuth, scope: string): boolean {
  return auth.scopes.includes('*') || auth.scopes.includes(scope)
}
