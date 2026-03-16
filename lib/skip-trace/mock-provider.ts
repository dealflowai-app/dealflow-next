import type {
  SkipTraceProvider,
  SkipTraceLookupParams,
  SkipTraceResult,
} from './index'

/**
 * Mock skip trace provider for development.
 *
 * Returns realistic-looking fake data using reserved 555-01xx numbers
 * and generated email addresses based on the input name.
 */
export class MockSkipTraceProvider implements SkipTraceProvider {
  readonly name = 'mock'

  async lookup(params: SkipTraceLookupParams): Promise<SkipTraceResult> {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300))

    const seed = hashCode(params.address + params.city)
    const nameSlug = buildNameSlug(params)

    return {
      phones: [
        {
          number: `(555) 01${pad(Math.abs(seed) % 100)}`,
          type: 'mobile',
          score: 92,
        },
        {
          number: `(555) 01${pad((Math.abs(seed) + 37) % 100)}`,
          type: 'landline',
          score: 74,
        },
      ],
      emails: [
        {
          address: `${nameSlug}@gmail.com`,
          type: 'personal',
          score: 88,
        },
        ...(params.entityName
          ? [{
              address: `info@${slugify(params.entityName)}.com`,
              type: 'business' as const,
              score: 65,
            }]
          : []),
      ],
      mailingAddress: {
        line1: params.address,
        city: params.city,
        state: params.state,
        zip: params.zip ?? '00000',
      },
      confidence: 85,
      provider: 'mock',
      cachedAt: new Date().toISOString(),
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function buildNameSlug(params: SkipTraceLookupParams): string {
  if (params.firstName && params.lastName) {
    return slugify(`${params.firstName}.${params.lastName}`)
  }
  if (params.entityName) {
    return slugify(params.entityName)
  }
  return 'contact'
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}
