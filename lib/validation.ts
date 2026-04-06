import { NextResponse } from 'next/server'

// ─── String Validators ──────────────────────────────────────────────────────

export function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0
}

export function isStringMaxLength(val: unknown, max: number): boolean {
  return typeof val === 'string' && val.length <= max
}

export function isEmail(val: unknown): boolean {
  if (typeof val !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && val.length <= 254
}

export function isPhone(val: unknown): boolean {
  if (typeof val !== 'string') return false
  // Accept digits, spaces, dashes, parens, dots, plus sign — at least 7 digits
  const digits = val.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15
}

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP',
])

export function isStateCode(val: unknown): boolean {
  return typeof val === 'string' && US_STATES.has(val.toUpperCase())
}

export function isZip(val: unknown): boolean {
  if (typeof val !== 'string') return false
  return /^\d{5}(-\d{4})?$/.test(val)
}

// ─── Number Validators ──────────────────────────────────────────────────────

export function isPositiveInt(val: unknown): val is number {
  if (typeof val === 'number') return Number.isInteger(val) && val > 0
  if (typeof val === 'string') {
    const n = Number(val)
    return Number.isInteger(n) && n > 0
  }
  return false
}

export function isInRange(val: unknown, min: number, max: number): boolean {
  const n = typeof val === 'string' ? Number(val) : val
  return typeof n === 'number' && !isNaN(n) && n >= min && n <= max
}

// ─── Sanitizers ─────────────────────────────────────────────────────────────

export function sanitizeString(val: string): string {
  return val
    .replace(/\0/g, '')           // strip null bytes
    .trim()
    .replace(/\s{2,}/g, ' ')     // collapse multiple whitespace to single space
}

/** Strip all HTML tags and decode common entities */
export function sanitizeHtml(val: string): string {
  return sanitizeString(
    val
      .replace(/<[^>]*>/g, '')              // strip all HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
  )
}

const ALLOWED_TAGS_FORMATTING = new Set(['b', 'i', 'em', 'strong', 'span', 'mark', 'br', 'p'])

/** Strip HTML tags except basic formatting, remove all attributes except class */
export function sanitizeHtmlAllowFormatting(val: string): string {
  return val.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag: string) => {
    const lower = tag.toLowerCase()
    if (!ALLOWED_TAGS_FORMATTING.has(lower)) return ''
    // For allowed tags, strip attributes except class
    const isClosing = match.startsWith('</')
    if (isClosing) return `</${lower}>`
    const classMatch = match.match(/\bclass\s*=\s*"([^"]*)"/)
    return classMatch ? `<${lower} class="${classMatch[1]}">` : `<${lower}>`
  })
}

// ─── Validation Result Builder ──────────────────────────────────────────────

export interface ValidationError {
  field: string
  message: string
}

export class Validator {
  private errors: ValidationError[] = []

  require(field: string, val: unknown, label?: string): this {
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      this.errors.push({ field, message: `${label || field} is required` })
    }
    return this
  }

  string(field: string, val: unknown, opts?: { maxLength?: number; label?: string }): this {
    if (val === undefined || val === null) return this // skip optional
    if (typeof val !== 'string') {
      this.errors.push({ field, message: `${opts?.label || field} must be a string` })
      return this
    }
    if (opts?.maxLength && val.length > opts.maxLength) {
      this.errors.push({ field, message: `${opts?.label || field} must be at most ${opts.maxLength} characters` })
    }
    return this
  }

  email(field: string, val: unknown, label?: string): this {
    if (val === undefined || val === null || val === '') return this
    if (!isEmail(val)) {
      this.errors.push({ field, message: `${label || field} must be a valid email address` })
    }
    return this
  }

  phone(field: string, val: unknown, label?: string): this {
    if (val === undefined || val === null || val === '') return this
    if (!isPhone(val)) {
      this.errors.push({ field, message: `${label || field} must be a valid phone number` })
    }
    return this
  }

  positiveInt(field: string, val: unknown, label?: string): this {
    if (val === undefined || val === null) return this
    if (!isPositiveInt(val)) {
      this.errors.push({ field, message: `${label || field} must be a positive number` })
    }
    return this
  }

  intRange(field: string, val: unknown, min: number, max: number, label?: string): this {
    if (val === undefined || val === null) return this
    if (!isInRange(val, min, max)) {
      this.errors.push({ field, message: `${label || field} must be between ${min} and ${max}` })
    }
    return this
  }

  stateCode(field: string, val: unknown, label?: string): this {
    if (val === undefined || val === null) return this
    if (!isStateCode(val)) {
      this.errors.push({ field, message: `${label || field} must be a valid US state code` })
    }
    return this
  }

  zip(field: string, val: unknown, label?: string): this {
    if (val === undefined || val === null) return this
    if (!isZip(val)) {
      this.errors.push({ field, message: `${label || field} must be a valid ZIP code (e.g. 75001 or 75001-1234)` })
    }
    return this
  }

  enumValue(field: string, val: unknown, allowed: string[], label?: string): this {
    if (val === undefined || val === null) return this
    if (typeof val !== 'string' || !allowed.includes(val)) {
      this.errors.push({ field, message: `${label || field} must be one of: ${allowed.join(', ')}` })
    }
    return this
  }

  array(field: string, val: unknown, opts?: { maxItems?: number; label?: string }): this {
    if (val === undefined || val === null) return this
    if (!Array.isArray(val)) {
      this.errors.push({ field, message: `${opts?.label || field} must be an array` })
      return this
    }
    if (opts?.maxItems && val.length > opts.maxItems) {
      this.errors.push({ field, message: `${opts?.label || field} must have at most ${opts.maxItems} items` })
    }
    return this
  }

  custom(field: string, condition: boolean, message: string): this {
    if (!condition) {
      this.errors.push({ field, message })
    }
    return this
  }

  isValid(): boolean {
    return this.errors.length === 0
  }

  getErrors(): ValidationError[] {
    return this.errors
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      { error: 'Validation failed', errors: this.errors },
      { status: 400 },
    )
  }
}
