import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getTemplate, listTemplates } from '@/lib/contracts/templates'
import type { ContractTemplate } from '@/lib/contracts/templates'
import { fillContract } from '@/lib/contracts/fill'
import type { FillContractInput } from '@/lib/contracts/fill'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Template Registry
// ═══════════════════════════════════════════════════════════════════════════════

describe('Template Registry', () => {
  describe('getTemplate', () => {
    it('returns TX assignment template with correct shape', () => {
      const tpl = getTemplate('tx_assignment_v1')
      expect(tpl).toBeDefined()
      expect(tpl!.id).toBe('tx_assignment_v1')
      expect(tpl!.name).toBe('Texas Assignment Agreement')
      expect(tpl!.state).toBe('TX')
      expect(tpl!.type).toBe('ASSIGNMENT')
      expect(tpl!.version).toBe('1.0')
      expect(Array.isArray(tpl!.fields)).toBe(true)
      expect(Array.isArray(tpl!.sections)).toBe(true)
      expect(tpl!.fields.length).toBeGreaterThan(0)
      expect(tpl!.sections.length).toBeGreaterThan(0)
    })

    it('returns undefined for nonexistent template', () => {
      expect(getTemplate('nonexistent')).toBeUndefined()
    })
  })

  describe('listTemplates', () => {
    it('returns all 53 templates (51 assignments + 1 double close + 1 JV)', () => {
      const all = listTemplates()
      expect(all).toHaveLength(53)
    })

    it('returns TX templates when filtered by state', () => {
      const tx = listTemplates({ state: 'TX' })
      // TX assignment + TX double close + JV (state=ALL matches every state filter)
      expect(tx.length).toBeGreaterThanOrEqual(2)
      expect(tx.some((t) => t.type === 'ASSIGNMENT' && t.state === 'TX')).toBe(true)
      expect(tx.some((t) => t.type === 'DOUBLE_CLOSE')).toBe(true)
      expect(tx.some((t) => t.type === 'JV_AGREEMENT')).toBe(true)
    })

    it('returns all 51 assignment templates when filtered by type', () => {
      const assignments = listTemplates({ type: 'ASSIGNMENT' })
      expect(assignments).toHaveLength(51)
      assignments.forEach((t) => {
        expect(t.type).toBe('ASSIGNMENT')
      })
    })

    it('returns California assignment template when filtered by state CA', () => {
      const ca = listTemplates({ state: 'CA' })
      expect(ca.some((t) => t.state === 'CA' && t.type === 'ASSIGNMENT')).toBe(true)
      const caAssignment = ca.find((t) => t.state === 'CA')
      expect(caAssignment!.name).toBe('California Assignment Agreement')
    })
  })

  describe('required fields on all templates', () => {
    const requiredFieldKeys = [
      'effectiveDate',
      'propertyAddress',
      'closingDate',
    ]

    it('all assignment templates have effectiveDate, propertyAddress, and closingDate', () => {
      const assignments = listTemplates({ type: 'ASSIGNMENT' })
      for (const tpl of assignments) {
        const fieldKeys = tpl.fields.map((f) => f.key)
        for (const key of requiredFieldKeys) {
          expect(fieldKeys, `${tpl.id} missing ${key}`).toContain(key)
        }
      }
    })

    it('all assignment templates have assignorName and assigneeName', () => {
      const assignments = listTemplates({ type: 'ASSIGNMENT' })
      for (const tpl of assignments) {
        const fieldKeys = tpl.fields.map((f) => f.key)
        expect(fieldKeys, `${tpl.id} missing assignorName`).toContain('assignorName')
        expect(fieldKeys, `${tpl.id} missing assigneeName`).toContain('assigneeName')
      }
    })
  })

  describe('JV agreement template', () => {
    it('has state set to ALL', () => {
      const jv = getTemplate('jv_agreement_v1')
      expect(jv).toBeDefined()
      expect(jv!.state).toBe('ALL')
    })

    it('has type JV_AGREEMENT', () => {
      const jv = getTemplate('jv_agreement_v1')
      expect(jv!.type).toBe('JV_AGREEMENT')
    })
  })

  describe('template field shape', () => {
    it('every field has key, label, type, and required', () => {
      const all = listTemplates()
      for (const tpl of all) {
        for (const field of tpl.fields) {
          expect(field).toHaveProperty('key')
          expect(field).toHaveProperty('label')
          expect(field).toHaveProperty('type')
          expect(field).toHaveProperty('required')
          expect(typeof field.key).toBe('string')
          expect(typeof field.label).toBe('string')
          expect(typeof field.type).toBe('string')
          expect(typeof field.required).toBe('boolean')
        }
      }
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Contract Fill
// ═══════════════════════════════════════════════════════════════════════════════

describe('Contract Fill', () => {
  const baseDeal: FillContractInput['deal'] = {
    address: '123 Main St',
    city: 'Houston',
    state: 'TX',
    zip: '77001',
    askingPrice: 200000,
    assignFee: 15000,
    closeByDate: '2026-06-15',
  }

  const baseInput: FillContractInput = {
    deal: baseDeal,
    offer: {
      amount: 210000,
      closeDate: '2026-07-01',
    },
    buyer: {
      firstName: 'Jane',
      lastName: 'Doe',
      entityName: 'Doe Investments LLC',
      email: 'jane@doe.com',
      phone: '5551234567',
    },
    profile: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@wholesale.com',
      phone: '5559876543',
      company: 'Smith Wholesale LLC',
    },
  }

  function getTxTemplate(): ContractTemplate {
    return getTemplate('tx_assignment_v1')!
  }

  it('fills deal address into propertyAddress field', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    expect(result.filledData.propertyAddress).toBe('123 Main St, Houston, TX 77001')
  })

  it('fills buyer entityName into assigneeName', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    expect(result.filledData.assigneeName).toBe('Doe Investments LLC')
  })

  it('fills profile company into assignorName', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    expect(result.filledData.assignorName).toBe('Smith Wholesale LLC')
  })

  it('computes totalConsideration as askingPrice + assignFee', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    // totalConsideration = offer.amount (210000) + assignFee (15000) = 225000
    expect(result.filledData.totalConsideration).toBe('$225,000')
  })

  it('computes effectiveDate as today when not provided', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    expect(result.filledData.effectiveDate).toBeDefined()
    // Should be a formatted date string (e.g. "March 23, 2026")
    expect(result.filledData.effectiveDate.length).toBeGreaterThan(5)
  })

  it('manual overrides take highest priority', () => {
    const input: FillContractInput = {
      ...baseInput,
      overrides: {
        assignorName: 'Override Corp',
        propertyAddress: '999 Override Blvd, Dallas, TX 75001',
      },
    }
    const result = fillContract(getTxTemplate(), input)
    expect(result.filledData.assignorName).toBe('Override Corp')
    expect(result.filledData.propertyAddress).toBe('999 Override Blvd, Dallas, TX 75001')
  })

  it('reports missing required fields', () => {
    // Provide minimal input so many required fields are missing
    const input: FillContractInput = {
      deal: { address: '1 Test', city: 'X', state: 'TX', zip: '00000', askingPrice: 100000 },
      buyer: {},
      profile: {},
    }
    const result = fillContract(getTxTemplate(), input)
    expect(result.missingFields.length).toBeGreaterThan(0)
    // sellerName has no source and no override, should be missing
    expect(result.missingFields).toContain('sellerName')
    // earnestMoneyAmount has no source, should be missing
    expect(result.missingFields).toContain('earnestMoneyAmount')
  })

  it('replaces {{placeholders}} in section body text', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    // The first section should contain the filled assignorName
    const firstSection = result.filledSections[0]
    expect(firstSection.body).toContain('Smith Wholesale LLC')
    expect(firstSection.body).toContain('Doe Investments LLC')
    expect(firstSection.body).not.toContain('{{assignorName}}')
    expect(firstSection.body).not.toContain('{{assigneeName}}')
  })

  it('missing placeholders become [fieldKey]', () => {
    const input: FillContractInput = {
      deal: { address: '1 Test', city: 'X', state: 'TX', zip: '00000', askingPrice: 100000 },
      buyer: {},
      profile: {},
    }
    const result = fillContract(getTxTemplate(), input)
    // legalDescription is not provided and has no source
    const propertySection = result.filledSections.find((s) => s.heading.includes('Property Description'))
    expect(propertySection).toBeDefined()
    expect(propertySection!.body).toContain('[legalDescription]')
  })

  it('formats currency values with $ and commas', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    expect(result.filledData.originalPurchasePrice).toBe('$200,000')
    expect(result.filledData.assignmentFee).toBe('$15,000')
  })

  it('formats phone numbers as (xxx) xxx-xxxx', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    expect(result.filledData.assigneePhone).toBe('(555) 123-4567')
    expect(result.filledData.assignorPhone).toBe('(555) 987-6543')
  })

  it('falls back to deal.closeByDate when offer has no closeDate', () => {
    const input: FillContractInput = {
      ...baseInput,
      offer: { amount: 210000 }, // no closeDate
    }
    const result = fillContract(getTxTemplate(), input)
    expect(result.filledData.closingDate).toBeDefined()
    // Should have formatted the deal.closeByDate
    expect(result.filledData.closingDate).toContain('2026')
  })

  it('returns correct templateId and templateName', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    expect(result.templateId).toBe('tx_assignment_v1')
    expect(result.templateName).toBe('Texas Assignment Agreement')
  })

  it('filledSections preserves section headings', () => {
    const result = fillContract(getTxTemplate(), baseInput)
    expect(result.filledSections[0].heading).toBe('Assignment of Contract Agreement')
    expect(result.filledSections.some((s) => s.heading === 'Signatures')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PandaDoc Client
// ═══════════════════════════════════════════════════════════════════════════════

// Mock prisma and logger before importing pandadoc module
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('PandaDoc Client', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('isPandaDocConfigured', () => {
    it('returns false when env vars are not set', async () => {
      delete process.env.PANDADOC_API_KEY

      // Re-import to pick up env changes
      const { isPandaDocConfigured } = await import('@/lib/contracts/pandadoc')
      expect(isPandaDocConfigured()).toBe(false)
    })
  })

  describe('buildSignersFromContract', () => {
    let buildSignersFromContract: typeof import('@/lib/contracts/pandadoc').buildSignersFromContract

    beforeEach(async () => {
      const mod = await import('@/lib/contracts/pandadoc')
      buildSignersFromContract = mod.buildSignersFromContract
    })

    it('extracts assignor + assignee for ASSIGNMENT type', () => {
      const data: Record<string, string> = {
        assignorName: 'Smith Wholesale LLC',
        assignorEmail: 'john@wholesale.com',
        assigneeName: 'Doe Investments LLC',
        assigneeEmail: 'jane@doe.com',
      }
      const signers = buildSignersFromContract(data, 'ASSIGNMENT')
      expect(signers).toHaveLength(2)
      expect(signers[0]).toMatchObject({
        name: 'Smith Wholesale LLC',
        email: 'john@wholesale.com',
        role: 'assignor',
        routingOrder: 1,
      })
      expect(signers[1]).toMatchObject({
        name: 'Doe Investments LLC',
        email: 'jane@doe.com',
        role: 'assignee',
        routingOrder: 2,
      })
    })

    it('extracts seller + buyer for DOUBLE_CLOSE type', () => {
      const data: Record<string, string> = {
        wholesalerName: 'Smith Wholesale LLC',
        assignorEmail: 'john@wholesale.com',
        buyerName: 'Doe Investments LLC',
        buyerEmail: 'jane@doe.com',
      }
      const signers = buildSignersFromContract(data, 'DOUBLE_CLOSE')
      expect(signers).toHaveLength(2)
      expect(signers[0]).toMatchObject({
        name: 'Smith Wholesale LLC',
        role: 'seller',
        routingOrder: 1,
      })
      expect(signers[1]).toMatchObject({
        name: 'Doe Investments LLC',
        email: 'jane@doe.com',
        role: 'buyer',
        routingOrder: 2,
      })
    })

    it('extracts partner_a + partner_b for JV_AGREEMENT type', () => {
      const data: Record<string, string> = {
        partyAName: 'Alpha Partners',
        partyAEmail: 'alpha@partners.com',
        partyBName: 'Beta Capital',
        partyBEmail: 'beta@capital.com',
      }
      const signers = buildSignersFromContract(data, 'JV_AGREEMENT')
      expect(signers).toHaveLength(2)
      expect(signers[0]).toMatchObject({
        name: 'Alpha Partners',
        email: 'alpha@partners.com',
        role: 'partner_a',
        routingOrder: 1,
      })
      expect(signers[1]).toMatchObject({
        name: 'Beta Capital',
        email: 'beta@capital.com',
        role: 'partner_b',
        routingOrder: 2,
      })
    })

    it('filters out signers without email', () => {
      const data: Record<string, string> = {
        assignorName: 'Smith Wholesale LLC',
        assignorEmail: 'john@wholesale.com',
        assigneeName: 'Doe Investments LLC',
        // assigneeEmail is missing
      }
      const signers = buildSignersFromContract(data, 'ASSIGNMENT')
      expect(signers).toHaveLength(1)
      expect(signers[0].role).toBe('assignor')
    })

    it('returns empty array with empty data', () => {
      const signers = buildSignersFromContract({}, 'ASSIGNMENT')
      expect(signers).toHaveLength(0)
    })

    it('DOUBLE_CLOSE filters out seller without email', () => {
      const data: Record<string, string> = {
        wholesalerName: 'Smith Wholesale LLC',
        // no email for wholesaler at all
        buyerName: 'Doe Investments LLC',
        buyerEmail: 'jane@doe.com',
      }
      const signers = buildSignersFromContract(data, 'DOUBLE_CLOSE')
      // Seller has empty string email (from fallback chain), gets filtered
      expect(signers.every((s) => s.email !== '')).toBe(true)
    })
  })

  describe('verifyWebhookSignature', () => {
    it('verifies a matching HMAC signature', async () => {
      const crypto = await import('crypto')
      const secret = 'test-webhook-secret-key'

      // Set PandaDoc env vars so getConfig() succeeds
      process.env.PANDADOC_API_KEY = 'test-api-key'
      process.env.PANDADOC_WEBHOOK_KEY = secret

      // Re-import to pick up new env
      vi.resetModules()
      const { verifyWebhookSignature } = await import('@/lib/contracts/pandadoc')

      const payload = '{"event":"document_state_changed","data":{"id":"abc-123"}}'
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(payload)
      const validSignature = hmac.digest('hex')

      expect(verifyWebhookSignature(payload, validSignature)).toBe(true)
    })

    it('rejects a non-matching HMAC signature', async () => {
      const secret = 'test-webhook-secret-key'

      process.env.PANDADOC_API_KEY = 'test-api-key'
      process.env.PANDADOC_WEBHOOK_KEY = secret

      vi.resetModules()
      const { verifyWebhookSignature } = await import('@/lib/contracts/pandadoc')

      const payload = '{"event":"document_state_changed"}'
      const badSignature = 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678'

      expect(verifyWebhookSignature(payload, badSignature)).toBe(false)
    })
  })
})
