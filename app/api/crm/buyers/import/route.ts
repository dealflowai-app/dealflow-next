import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logBulkActivity } from '@/lib/activity'
import { logger } from '@/lib/logger'

// Normalize common CSV column name variations to our schema fields
const COLUMN_MAP: Record<string, string> = {
  // firstName
  firstname: 'firstName',
  first_name: 'firstName',
  'first name': 'firstName',
  fname: 'firstName',
  // lastName
  lastname: 'lastName',
  last_name: 'lastName',
  'last name': 'lastName',
  lname: 'lastName',
  // entityName
  entityname: 'entityName',
  entity_name: 'entityName',
  'entity name': 'entityName',
  company: 'entityName',
  'company name': 'entityName',
  companyname: 'entityName',
  llc: 'entityName',
  // phone
  phone: 'phone',
  phonenumber: 'phone',
  phone_number: 'phone',
  'phone number': 'phone',
  mobile: 'phone',
  cell: 'phone',
  // email
  email: 'email',
  emailaddress: 'email',
  email_address: 'email',
  'email address': 'email',
  // address
  address: 'address',
  streetaddress: 'address',
  street_address: 'address',
  'street address': 'address',
  // city
  city: 'city',
  // state
  state: 'state',
  // zip
  zip: 'zip',
  zipcode: 'zip',
  zip_code: 'zip',
  'zip code': 'zip',
  postalcode: 'zip',
  postal_code: 'zip',
  // notes
  notes: 'notes',
  note: 'notes',
  comments: 'notes',
}

function normalizeRow(raw: Record<string, unknown>): Record<string, string | null> {
  const normalized: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(raw)) {
    const mapped = COLUMN_MAP[key.toLowerCase().trim()]
    if (mapped && value != null && String(value).trim() !== '') {
      normalized[mapped] = String(value).trim()
    }
  }
  return normalized
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { buyers } = await req.json()

    if (!Array.isArray(buyers) || buyers.length === 0) {
      return NextResponse.json({ error: 'buyers array is required' }, { status: 400 })
    }

    if (buyers.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 buyers per import batch' },
        { status: 400 },
      )
    }

    // Normalize all rows
    const normalized = buyers.map(normalizeRow)

    // Collect phones for dedup
    const phonesInBatch = new Map<string, number>() // normalized phone -> first index
    const existingPhones = new Set<string>()

    // Get all phones that already exist for this profile
    const incomingPhones = normalized
      .map((r) => r.phone)
      .filter((p): p is string => !!p)
      .map(normalizePhone)
      .filter((p) => p.length === 10)

    if (incomingPhones.length > 0) {
      const existing = await prisma.cashBuyer.findMany({
        where: {
          profileId: profile.id,
          phone: { in: incomingPhones },
          isOptedOut: false,
        },
        select: { phone: true },
      })
      existing.forEach((b) => {
        if (b.phone) existingPhones.add(normalizePhone(b.phone))
      })
    }

    const toCreate: Array<Record<string, unknown>> = []
    const skipped: Array<{ index: number; reason: string }> = []

    for (let i = 0; i < normalized.length; i++) {
      const row = normalized[i]

      if (!row.firstName && !row.entityName) {
        skipped.push({ index: i, reason: 'Missing firstName or entityName' })
        continue
      }

      if (row.phone) {
        const norm = normalizePhone(row.phone)
        if (norm.length !== 10) {
          skipped.push({ index: i, reason: 'Invalid phone number' })
          continue
        }

        if (existingPhones.has(norm)) {
          skipped.push({ index: i, reason: 'Duplicate phone (existing buyer)' })
          continue
        }

        if (phonesInBatch.has(norm)) {
          skipped.push({ index: i, reason: 'Duplicate phone (within batch)' })
          continue
        }

        phonesInBatch.set(norm, i)
        row.phone = norm
      }

      const contactEnriched = !!(row.phone && row.email)

      toCreate.push({
        profileId: profile.id,
        firstName: row.firstName || null,
        lastName: row.lastName || null,
        entityName: row.entityName || null,
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        city: row.city || null,
        state: row.state || null,
        zip: row.zip || null,
        notes: row.notes || null,
        contactEnriched,
        enrichedAt: contactEnriched ? new Date() : null,
      })
    }

    let created = 0
    const createdBuyerIds: string[] = []
    if (toCreate.length > 0) {
      const result = await prisma.cashBuyer.createMany({
        data: toCreate as never,
      })
      created = result.count

      // Fetch IDs of just-created buyers to log activity
      if (created > 0) {
        const phones = toCreate
          .map((b) => b.phone as string | null)
          .filter((p): p is string => !!p)
        if (phones.length > 0) {
          const newBuyers = await prisma.cashBuyer.findMany({
            where: { profileId: profile.id, phone: { in: phones } },
            select: { id: true, firstName: true, entityName: true },
          })
          logBulkActivity(
            newBuyers.map((b) => ({
              buyerId: b.id,
              profileId: profile.id,
              type: 'imported',
              title: `Imported ${b.firstName || b.entityName || 'buyer'} via CSV`,
            })),
          )
        }
      }
    }

    return NextResponse.json({
      imported: created,
      skipped: skipped.length,
      total: buyers.length,
      errors: skipped,
    }, { status: 201 })
  } catch (err) {
    logger.error('POST /api/crm/buyers/import error', { route: '/api/crm/buyers/import', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to import buyers' }, { status: 500 })
  }
}
