import { describe, it, expect, vi } from 'vitest'

// Mock NextResponse before importing modules that depend on it
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      body,
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
    }),
  },
}))

import { Validator, sanitizeString, sanitizeHtml } from '@/lib/validation'
import { rateLimitResponse } from '@/lib/rate-limit'

// ─── 1. Validator class ──────────────────────────────────────────────────────

describe('Validator', () => {
  describe('require', () => {
    it('adds error when value is undefined', () => {
      const v = new Validator()
      v.require('field', undefined, 'Field')
      expect(v.isValid()).toBe(false)
      expect(v.getErrors()).toEqual([{ field: 'field', message: 'Field is required' }])
    })

    it('adds error when value is null', () => {
      const v = new Validator()
      v.require('field', null, 'Field')
      expect(v.isValid()).toBe(false)
    })

    it('adds error when value is empty string', () => {
      const v = new Validator()
      v.require('field', '', 'Field')
      expect(v.isValid()).toBe(false)
    })

    it('adds error when value is whitespace-only string', () => {
      const v = new Validator()
      v.require('field', '   ', 'Field')
      expect(v.isValid()).toBe(false)
    })

    it('does NOT add error when value is present', () => {
      const v = new Validator()
      v.require('field', 'value', 'Field')
      expect(v.isValid()).toBe(true)
    })

    it('uses field name as default label', () => {
      const v = new Validator()
      v.require('title', undefined)
      expect(v.getErrors()[0].message).toBe('title is required')
    })
  })

  describe('string', () => {
    it('adds error when string exceeds maxLength', () => {
      const v = new Validator()
      v.string('f', 'hello', { maxLength: 3, label: 'F' })
      expect(v.isValid()).toBe(false)
      expect(v.getErrors()[0].message).toBe('F must be at most 3 characters')
    })

    it('passes when string is within maxLength', () => {
      const v = new Validator()
      v.string('f', 'hi', { maxLength: 3, label: 'F' })
      expect(v.isValid()).toBe(true)
    })

    it('passes when string length equals maxLength exactly', () => {
      const v = new Validator()
      v.string('f', 'abc', { maxLength: 3 })
      expect(v.isValid()).toBe(true)
    })

    it('skips validation when value is undefined (optional)', () => {
      const v = new Validator()
      v.string('f', undefined, { maxLength: 3 })
      expect(v.isValid()).toBe(true)
    })

    it('adds error when value is not a string', () => {
      const v = new Validator()
      v.string('f', 123, { label: 'F' })
      expect(v.isValid()).toBe(false)
      expect(v.getErrors()[0].message).toBe('F must be a string')
    })
  })

  describe('positiveInt', () => {
    it('adds error for negative number', () => {
      const v = new Validator()
      v.positiveInt('f', -1, 'F')
      expect(v.isValid()).toBe(false)
      expect(v.getErrors()[0].message).toBe('F must be a positive number')
    })

    it('adds error for zero', () => {
      const v = new Validator()
      v.positiveInt('f', 0, 'F')
      expect(v.isValid()).toBe(false)
    })

    it('passes for positive integer', () => {
      const v = new Validator()
      v.positiveInt('f', 5, 'F')
      expect(v.isValid()).toBe(true)
    })

    it('skips validation when value is undefined', () => {
      const v = new Validator()
      v.positiveInt('f', undefined, 'F')
      expect(v.isValid()).toBe(true)
    })
  })

  describe('intRange', () => {
    it('adds error when value is above max', () => {
      const v = new Validator()
      v.intRange('f', 10, 1, 5, 'F')
      expect(v.isValid()).toBe(false)
      expect(v.getErrors()[0].message).toBe('F must be between 1 and 5')
    })

    it('adds error when value is below min', () => {
      const v = new Validator()
      v.intRange('f', 0, 1, 5, 'F')
      expect(v.isValid()).toBe(false)
    })

    it('passes when value is within range', () => {
      const v = new Validator()
      v.intRange('f', 3, 1, 5, 'F')
      expect(v.isValid()).toBe(true)
    })

    it('passes when value equals min boundary', () => {
      const v = new Validator()
      v.intRange('f', 1, 1, 5, 'F')
      expect(v.isValid()).toBe(true)
    })

    it('passes when value equals max boundary', () => {
      const v = new Validator()
      v.intRange('f', 5, 1, 5, 'F')
      expect(v.isValid()).toBe(true)
    })
  })

  describe('enumValue', () => {
    it('adds error for invalid enum value', () => {
      const v = new Validator()
      v.enumValue('f', 'X', ['A', 'B'], 'F')
      expect(v.isValid()).toBe(false)
      expect(v.getErrors()[0].message).toBe('F must be one of: A, B')
    })

    it('passes for valid enum value', () => {
      const v = new Validator()
      v.enumValue('f', 'A', ['A', 'B'], 'F')
      expect(v.isValid()).toBe(true)
    })

    it('skips validation when value is undefined', () => {
      const v = new Validator()
      v.enumValue('f', undefined, ['A', 'B'], 'F')
      expect(v.isValid()).toBe(true)
    })
  })

  describe('array', () => {
    it('passes when array is within maxItems', () => {
      const v = new Validator()
      v.array('f', ['a'], { maxItems: 2 })
      expect(v.isValid()).toBe(true)
    })

    it('adds error when array exceeds maxItems', () => {
      const v = new Validator()
      v.array('f', ['a', 'b', 'c'], { maxItems: 2, label: 'Tags' })
      expect(v.isValid()).toBe(false)
      expect(v.getErrors()[0].message).toBe('Tags must have at most 2 items')
    })

    it('adds error when value is not an array', () => {
      const v = new Validator()
      v.array('f', 'not-array', { label: 'Items' })
      expect(v.isValid()).toBe(false)
      expect(v.getErrors()[0].message).toBe('Items must be an array')
    })
  })

  describe('custom', () => {
    it('adds error when condition is false', () => {
      const v = new Validator()
      v.custom('f', false, 'Custom error')
      expect(v.isValid()).toBe(false)
      expect(v.getErrors()[0].message).toBe('Custom error')
    })

    it('does NOT add error when condition is true', () => {
      const v = new Validator()
      v.custom('f', true, 'msg')
      expect(v.isValid()).toBe(true)
    })
  })

  describe('isValid and error accumulation', () => {
    it('returns true when no errors', () => {
      const v = new Validator()
      expect(v.isValid()).toBe(true)
    })

    it('returns false after errors are added', () => {
      const v = new Validator()
      v.require('a', undefined)
      expect(v.isValid()).toBe(false)
    })

    it('accumulates multiple errors from chained calls', () => {
      const v = new Validator()
      v.require('name', undefined, 'Name')
        .require('email', '', 'Email')
        .positiveInt('price', -1, 'Price')

      expect(v.getErrors()).toHaveLength(3)
      expect(v.getErrors()[0].field).toBe('name')
      expect(v.getErrors()[1].field).toBe('email')
      expect(v.getErrors()[2].field).toBe('price')
    })
  })

  describe('toResponse', () => {
    it('returns 400 status with errors object', () => {
      const v = new Validator()
      v.require('title', undefined, 'Title')

      const response = v.toResponse() as unknown as {
        body: { error: string; errors: Array<{ field: string; message: string }> }
        status: number
      }

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
      expect(response.body.errors).toHaveLength(1)
      expect(response.body.errors[0]).toEqual({
        field: 'title',
        message: 'Title is required',
      })
    })
  })
})

// ─── 2. sanitizeString and sanitizeHtml ──────────────────────────────────────

describe('sanitizeString', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello')
  })

  it('collapses multiple spaces into one', () => {
    expect(sanitizeString('hello    world')).toBe('hello world')
  })

  it('strips null bytes', () => {
    expect(sanitizeString('he\0llo')).toBe('hello')
  })

  it('handles already-clean strings', () => {
    expect(sanitizeString('clean string')).toBe('clean string')
  })
})

describe('sanitizeHtml', () => {
  it('strips HTML tags', () => {
    expect(sanitizeHtml('<b>bold</b> text')).toBe('bold text')
  })

  it('strips script tags and their implied content markers', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('alert("xss")')
  })

  it('strips iframe tags', () => {
    expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe('')
  })

  it('strips nested tags', () => {
    expect(sanitizeHtml('<div><p>nested</p></div>')).toBe('nested')
  })

  it('trims and collapses whitespace like sanitizeString', () => {
    expect(sanitizeHtml('  <b>hello</b>   world  ')).toBe('hello world')
  })
})

// ─── 3. Marketplace data transformation patterns ─────────────────────────────

describe('marketplace data transformations', () => {
  const VALID_TAGS = [
    'responsive', 'accurate_description', 'fast_close', 'fair_pricing',
    'good_communication', 'professional', 'reliable', 'transparent',
  ]

  describe('review tag filtering', () => {
    it('filters valid review tags', () => {
      const tags = ['responsive', 'invalid_tag', 'fast_close', '']
      const filtered = tags.filter(t => typeof t === 'string' && VALID_TAGS.includes(t))
      expect(filtered).toEqual(['responsive', 'fast_close'])
    })

    it('returns empty array when no tags are valid', () => {
      const tags = ['bogus', 'fake_tag', '']
      const filtered = tags.filter(t => typeof t === 'string' && VALID_TAGS.includes(t))
      expect(filtered).toEqual([])
    })

    it('keeps all tags when all are valid', () => {
      const tags = ['responsive', 'professional', 'reliable']
      const filtered = tags.filter(t => typeof t === 'string' && VALID_TAGS.includes(t))
      expect(filtered).toEqual(['responsive', 'professional', 'reliable'])
    })

    it('filters out non-string values', () => {
      const tags = ['responsive', 42, null, undefined, 'fast_close'] as unknown as string[]
      const filtered = tags.filter(t => typeof t === 'string' && VALID_TAGS.includes(t))
      expect(filtered).toEqual(['responsive', 'fast_close'])
    })
  })

  describe('seller display name', () => {
    function sellerDisplayName(firstName: string, lastName: string): string {
      const last = lastName?.trim()
      return `${firstName.trim()} ${last ? last.charAt(0).toUpperCase() + '.' : ''}`.trim()
    }

    it('formats first name + last initial', () => {
      expect(sellerDisplayName('John', 'Doe')).toBe('John D.')
    })

    it('handles single-character last name', () => {
      expect(sellerDisplayName('Jane', 'X')).toBe('Jane X.')
    })

    it('handles empty last name', () => {
      expect(sellerDisplayName('Alice', '')).toBe('Alice')
    })

    it('trims whitespace from names', () => {
      expect(sellerDisplayName('  Bob  ', '  Smith  ')).toBe('Bob S.')
    })
  })

  describe('reputation score rounding', () => {
    function roundReputation(avg: number): number {
      return Math.round(avg * 10) / 10
    }

    it('rounds to one decimal place', () => {
      expect(roundReputation(4.567)).toBe(4.6)
    })

    it('keeps clean values unchanged', () => {
      expect(roundReputation(5.0)).toBe(5.0)
    })

    it('rounds down when appropriate', () => {
      expect(roundReputation(3.14)).toBe(3.1)
    })

    it('handles midpoint rounding', () => {
      expect(roundReputation(4.25)).toBe(4.3)
    })

    it('handles zero', () => {
      expect(roundReputation(0)).toBe(0)
    })
  })

  describe('rating distribution calculation', () => {
    function ratingDistribution(ratings: number[]): Record<number, number> {
      const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      for (const r of ratings) {
        if (r >= 1 && r <= 5 && Number.isInteger(r)) {
          dist[r]++
        }
      }
      return dist
    }

    it('counts ratings correctly', () => {
      const ratings = [5, 5, 4, 3, 5, 1]
      expect(ratingDistribution(ratings)).toEqual({ 1: 1, 2: 0, 3: 1, 4: 1, 5: 3 })
    })

    it('returns all zeros for empty array', () => {
      expect(ratingDistribution([])).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
    })

    it('ignores out-of-range values', () => {
      const ratings = [0, 6, -1, 3]
      expect(ratingDistribution(ratings)).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 })
    })
  })
})

// ─── 4. Rate limit response format ──────────────────────────────────────────

describe('rateLimitResponse format', () => {
  it('returns 429 status', () => {
    const resetAt = Date.now() + 30_000
    const response = rateLimitResponse(resetAt) as unknown as {
      body: { error: string; retryAfter: number }
      status: number
      headers: Record<string, string>
    }

    expect(response.status).toBe(429)
  })

  it('includes Retry-After header', () => {
    const resetAt = Date.now() + 60_000
    const response = rateLimitResponse(resetAt) as unknown as {
      body: { error: string; retryAfter: number }
      status: number
      headers: Record<string, string>
    }

    expect(response.headers['Retry-After']).toBeDefined()
    expect(Number(response.headers['Retry-After'])).toBeGreaterThan(0)
  })

  it('includes error message in body', () => {
    const resetAt = Date.now() + 10_000
    const response = rateLimitResponse(resetAt) as unknown as {
      body: { error: string; retryAfter: number }
      status: number
    }

    expect(response.body.error).toBe('Too many requests')
    expect(response.body.retryAfter).toBeGreaterThan(0)
  })
})
