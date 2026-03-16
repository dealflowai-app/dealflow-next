// ─── CONTRACT AUTO-FILL SERVICE ─────────────────────────────────────────────
// Maps deal, offer, buyer, and profile data onto template fields and
// replaces {{placeholders}} in section text with filled values.

import type { ContractTemplate, ContractSection } from './templates'

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface FillContractInput {
  deal: {
    address: string
    city: string
    state: string
    zip: string
    askingPrice: number
    assignFee?: number | null
    closeByDate?: Date | string | null
    arv?: number | null
    condition?: string | null
    propertyType?: string | null
    beds?: number | null
    baths?: number | null
    sqft?: number | null
    yearBuilt?: number | null
  }
  offer?: {
    amount: number
    closeDate?: Date | string | null
    terms?: string | null
    message?: string | null
  } | null
  buyer: {
    firstName?: string | null
    lastName?: string | null
    entityName?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
  }
  profile: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    phone?: string | null
    company?: string | null
  }
  overrides?: Record<string, string>
}

export interface FilledContract {
  templateId: string
  templateName: string
  filledData: Record<string, string>
  filledSections: ContractSection[]
  missingFields: string[]
}

// ─── FORMATTING HELPERS ─────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US')}`
}

function formatDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return value
}

function buyerDisplayName(buyer: FillContractInput['buyer']): string {
  if (buyer.entityName) return buyer.entityName
  const parts = [buyer.firstName, buyer.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : ''
}

function profileDisplayName(profile: FillContractInput['profile']): string {
  if (profile.company) return profile.company
  const parts = [profile.firstName, profile.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : ''
}

function fullAddress(deal: FillContractInput['deal']): string {
  return `${deal.address}, ${deal.city}, ${deal.state} ${deal.zip}`
}

function buyerFullAddress(buyer: FillContractInput['buyer']): string {
  const parts = [buyer.address, buyer.city, buyer.state, buyer.zip].filter(Boolean)
  return parts.join(', ')
}

// ─── SOURCE RESOLVER ────────────────────────────────────────────────────────
// Resolves a field's `source` string (e.g. "deal.askingPrice") to a value
// from the input data.

function resolveSource(source: string, input: FillContractInput): string | number | Date | null {
  const [root, key] = source.split('.') as [string, string]

  switch (root) {
    case 'deal': {
      if (key === 'fullAddress') return fullAddress(input.deal)
      const val = (input.deal as Record<string, unknown>)[key]
      return val != null ? (val as string | number | Date) : null
    }
    case 'offer': {
      if (!input.offer) return null
      const val = (input.offer as Record<string, unknown>)[key]
      return val != null ? (val as string | number | Date) : null
    }
    case 'buyer': {
      if (key === 'entityName') return buyerDisplayName(input.buyer)
      if (key === 'address') return buyerFullAddress(input.buyer)
      const val = (input.buyer as Record<string, unknown>)[key]
      return val != null ? (val as string | number | Date) : null
    }
    case 'profile': {
      if (key === 'company') return profileDisplayName(input.profile)
      const val = (input.profile as Record<string, unknown>)[key]
      return val != null ? (val as string | number | Date) : null
    }
    default:
      return null
  }
}

// ─── FORMAT BY FIELD TYPE ───────────────────────────────────────────────────

function formatValue(raw: string | number | Date, fieldType: string): string {
  switch (fieldType) {
    case 'currency':
      return typeof raw === 'number' ? formatCurrency(raw) : formatCurrency(Number(raw))
    case 'date':
      return raw instanceof Date || typeof raw === 'string' ? formatDate(raw) : String(raw)
    case 'phone':
      return typeof raw === 'string' ? formatPhone(raw) : String(raw)
    default:
      return String(raw)
  }
}

// ─── COMPUTED FIELDS ────────────────────────────────────────────────────────
// Fields whose values are derived from other filled values.

function computeDerivedFields(
  data: Record<string, string>,
  input: FillContractInput,
): void {
  // totalConsideration = originalPurchasePrice + assignmentFee
  if (!data.totalConsideration) {
    const price = input.offer?.amount ?? input.deal.askingPrice
    const fee = input.deal.assignFee ?? 0
    data.totalConsideration = formatCurrency(price + fee)
  }

  // effectiveDate defaults to today
  if (!data.effectiveDate) {
    data.effectiveDate = formatDate(new Date())
  }
}

// ─── MAIN FILL FUNCTION ────────────────────────────────────────────────────

export function fillContract(
  template: ContractTemplate,
  input: FillContractInput,
): FilledContract {
  const filledData: Record<string, string> = {}
  const missingFields: string[] = []

  // 1. Auto-fill from sources
  for (const field of template.fields) {
    if (field.source) {
      const raw = resolveSource(field.source, input)
      if (raw != null && raw !== '') {
        filledData[field.key] = formatValue(raw, field.type)
      }
    }
  }

  // 2. For offer-dependent fields, fall back to deal values
  if (!filledData.closingDate && input.deal.closeByDate) {
    filledData.closingDate = formatDate(input.deal.closeByDate)
  }

  // 3. Compute derived fields
  computeDerivedFields(filledData, input)

  // 4. Apply manual overrides (highest priority)
  if (input.overrides) {
    for (const [key, value] of Object.entries(input.overrides)) {
      if (value) filledData[key] = value
    }
  }

  // 5. Identify missing required fields
  for (const field of template.fields) {
    if (field.required && !filledData[field.key]) {
      missingFields.push(field.key)
    }
  }

  // 6. Replace placeholders in sections
  const filledSections = template.sections.map((section) => ({
    heading: section.heading,
    body: section.body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      return filledData[key] ?? `[${key}]`
    }),
  }))

  return {
    templateId: template.id,
    templateName: template.name,
    filledData,
    filledSections,
    missingFields,
  }
}
