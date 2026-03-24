import { describe, it, expect } from 'vitest'
import {
  isNonEmptyString,
  isEmail,
  isPhone,
  isStateCode,
  isZip,
  isPositiveInt,
} from '@/lib/validation'

describe('isNonEmptyString', () => {
  it('returns true for non-empty string', () => {
    expect(isNonEmptyString('hello')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isNonEmptyString('')).toBe(false)
  })

  it('returns false for whitespace-only string', () => {
    expect(isNonEmptyString('   ')).toBe(false)
  })

  it('returns false for non-string types', () => {
    expect(isNonEmptyString(123)).toBe(false)
    expect(isNonEmptyString(null)).toBe(false)
    expect(isNonEmptyString(undefined)).toBe(false)
  })
})

describe('isEmail', () => {
  it('accepts valid emails', () => {
    expect(isEmail('user@example.com')).toBe(true)
    expect(isEmail('test.user+tag@domain.co')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(isEmail('not-an-email')).toBe(false)
    expect(isEmail('@no-user.com')).toBe(false)
    expect(isEmail('user@')).toBe(false)
    expect(isEmail('')).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(isEmail(123)).toBe(false)
    expect(isEmail(null)).toBe(false)
  })
})

describe('isPhone', () => {
  it('accepts valid phone numbers', () => {
    expect(isPhone('5551234567')).toBe(true)
    expect(isPhone('(555) 123-4567')).toBe(true)
    expect(isPhone('+1 555-123-4567')).toBe(true)
  })

  it('rejects too-short numbers', () => {
    expect(isPhone('123')).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(isPhone(5551234567)).toBe(false)
  })
})

describe('isStateCode', () => {
  it('accepts valid state codes', () => {
    expect(isStateCode('TX')).toBe(true)
    expect(isStateCode('CA')).toBe(true)
    expect(isStateCode('DC')).toBe(true)
  })

  it('accepts lowercase (case-insensitive)', () => {
    expect(isStateCode('tx')).toBe(true)
  })

  it('rejects invalid codes', () => {
    expect(isStateCode('XX')).toBe(false)
    expect(isStateCode('Texas')).toBe(false)
    expect(isStateCode('')).toBe(false)
  })
})

describe('isZip', () => {
  it('accepts 5-digit zip', () => {
    expect(isZip('75201')).toBe(true)
  })

  it('accepts ZIP+4', () => {
    expect(isZip('75201-1234')).toBe(true)
  })

  it('rejects invalid formats', () => {
    expect(isZip('1234')).toBe(false)
    expect(isZip('abcde')).toBe(false)
    expect(isZip('75201-12')).toBe(false)
    expect(isZip('')).toBe(false)
  })
})

describe('isPositiveInt', () => {
  it('accepts positive integers', () => {
    expect(isPositiveInt(1)).toBe(true)
    expect(isPositiveInt(100)).toBe(true)
  })

  it('rejects zero and negative', () => {
    expect(isPositiveInt(0)).toBe(false)
    expect(isPositiveInt(-5)).toBe(false)
  })

  it('rejects floats', () => {
    expect(isPositiveInt(1.5)).toBe(false)
  })

  it('accepts numeric strings', () => {
    expect(isPositiveInt('42')).toBe(true)
  })

  it('rejects non-numeric strings', () => {
    expect(isPositiveInt('abc')).toBe(false)
  })
})
