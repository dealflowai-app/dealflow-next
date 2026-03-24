import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTemplate } from '@/lib/contracts/templates'
import { fillContract, type FillContractInput } from '@/lib/contracts/fill'
import { generateContractPDF } from '@/lib/contracts/pdf'
import { renderContractHTML } from '@/lib/contracts/render'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'

type RouteCtx = { params: Promise<{ id: string }> }

// ─── GET /api/contracts/[id]/pdf ────────────────────────────────────────────
// Download the contract PDF. Generates on-the-fly if none exists yet.

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const contract = await prisma.contract.findFirst({
      where: { id, profileId: profile.id },
      include: { deal: true, offer: true },
    })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    // Try to read existing file
    if (contract.documentUrl) {
      try {
        const buffer = await fs.readFile(contract.documentUrl)
        const isPdf = contract.documentUrl.endsWith('.pdf')
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': isPdf ? 'application/pdf' : 'text/html',
            'Content-Disposition': `attachment; filename="contract-${contract.id}.${isPdf ? 'pdf' : 'html'}"`,
          },
        })
      } catch {
        // File missing — fall through to generate
      }
    }

    // Generate on the fly
    const { buffer, contentType } = await generatePdfFromContract(contract, profile)

    // Save for next time
    const ext = contentType === 'application/pdf' ? 'pdf' : 'html'
    const dir = path.join('/tmp', 'contracts')
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, `${contract.id}.${ext}`)
    await fs.writeFile(filePath, buffer)

    await prisma.contract.update({
      where: { id: contract.id },
      data: { documentUrl: filePath },
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="contract-${contract.id}.${ext}"`,
      },
    })
  } catch (err) {
    logger.error('GET /api/contracts/[id]/pdf error', { route: '/api/contracts/[id]/pdf', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to download contract PDF', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── POST /api/contracts/[id]/pdf (regenerate) ─────────────────────────────
// Regenerate the PDF from current filledData.

export async function POST(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const { id } = await params

    const contract = await prisma.contract.findFirst({
      where: { id, profileId: profile.id },
      include: { deal: true, offer: true },
    })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

    const { buffer, contentType } = await generatePdfFromContract(contract, profile)

    const ext = contentType === 'application/pdf' ? 'pdf' : 'html'
    const dir = path.join('/tmp', 'contracts')
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, `${contract.id}.${ext}`)
    await fs.writeFile(filePath, buffer)

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: { documentUrl: filePath },
      include: {
        deal: { select: { address: true, city: true, state: true, zip: true } },
        offer: { select: { amount: true, status: true } },
      },
    })

    return NextResponse.json({ contract: updated, documentUrl: filePath })
  } catch (err) {
    logger.error('POST /api/contracts/[id]/pdf error', { route: '/api/contracts/[id]/pdf', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(
      { error: 'Failed to regenerate contract PDF', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ─── SHARED HELPER ──────────────────────────────────────────────────────────

interface ContractWithRelations {
  id: string
  status: string
  filledData: unknown
  deal: {
    address: string; city: string; state: string; zip: string
    askingPrice: number; assignFee: number | null; closeByDate: Date | null
    arv: number | null; condition: string | null; propertyType: string
    beds: number | null; baths: number | null; sqft: number | null; yearBuilt: number | null
  }
  offer: {
    amount: number; closeDate: Date | null; terms: string | null; message: string | null
    buyerId: string
  } | null
}

interface ProfileData {
  firstName: string | null; lastName: string | null
  email: string; phone: string | null; company: string | null
}

async function generatePdfFromContract(
  contract: ContractWithRelations,
  profile: ProfileData,
): Promise<{ buffer: Buffer; contentType: string }> {
  const stateId = `${contract.deal.state.toLowerCase()}_assignment_v1`
  const template = getTemplate(stateId) ?? getTemplate('tx_assignment_v1')!

  const buyer = contract.offer?.buyerId
    ? await prisma.cashBuyer.findUnique({ where: { id: contract.offer.buyerId } })
    : null

  const fillInput: FillContractInput = {
    deal: {
      address: contract.deal.address,
      city: contract.deal.city,
      state: contract.deal.state,
      zip: contract.deal.zip,
      askingPrice: contract.deal.askingPrice,
      assignFee: contract.deal.assignFee,
      closeByDate: contract.deal.closeByDate,
      arv: contract.deal.arv,
      condition: contract.deal.condition,
      propertyType: contract.deal.propertyType,
      beds: contract.deal.beds,
      baths: contract.deal.baths,
      sqft: contract.deal.sqft,
      yearBuilt: contract.deal.yearBuilt,
    },
    offer: contract.offer
      ? { amount: contract.offer.amount, closeDate: contract.offer.closeDate, terms: contract.offer.terms, message: contract.offer.message }
      : null,
    buyer: buyer
      ? { firstName: buyer.firstName, lastName: buyer.lastName, entityName: buyer.entityName, phone: buyer.phone, email: buyer.email, address: buyer.address, city: buyer.city, state: buyer.state, zip: buyer.zip }
      : {},
    profile: { firstName: profile.firstName, lastName: profile.lastName, email: profile.email, phone: profile.phone, company: profile.company },
    overrides: (contract.filledData as Record<string, string>) ?? undefined,
  }

  const filled = fillContract(template, fillInput)
  const isDraft = contract.status === 'DRAFT'
  const html = renderContractHTML(filled, { isDraft })
  return generateContractPDF(html)
}
