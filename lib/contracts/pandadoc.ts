/**
 * PandaDoc E-Signature Integration
 *
 * Handles document creation, recipient management, and status tracking
 * for contract e-signatures via PandaDoc API v2.
 *
 * Required env vars:
 *   PANDADOC_API_KEY        – API key (Settings → Integrations → API)
 *   PANDADOC_BASE_URL       – API base (https://api.pandadoc.com for production)
 *   PANDADOC_WEBHOOK_KEY    – Shared key for webhook signature verification
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import * as crypto from 'crypto'

// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════

interface PandaDocConfig {
  apiKey: string
  baseUrl: string
  webhookKey: string
}

function getConfig(): PandaDocConfig {
  const apiKey = process.env.PANDADOC_API_KEY
  const baseUrl = process.env.PANDADOC_BASE_URL || 'https://api.pandadoc.com'
  const webhookKey = process.env.PANDADOC_WEBHOOK_KEY || ''

  if (!apiKey) {
    throw new Error('PandaDoc configuration incomplete. Required: PANDADOC_API_KEY')
  }

  return { apiKey, baseUrl, webhookKey }
}

export function isPandaDocConfigured(): boolean {
  try {
    getConfig()
    return true
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════

async function pandadocFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = getConfig()
  const url = `${config.baseUrl}/public/v1${path}`

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `API-Key ${config.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface SignerInfo {
  name: string
  email: string
  role: 'assignor' | 'assignee' | 'seller' | 'buyer' | 'partner_a' | 'partner_b'
  routingOrder?: number
}

export interface DocumentResult {
  documentId: string
  status: string
  sentAt: string
}

export interface SignerStatus {
  name: string
  email: string
  role: string
  status: string  // "sent" | "viewed" | "completed" | "declined"
  signedAt: string | null
  declinedReason: string | null
}

export interface DocumentStatus {
  documentId: string
  status: string
  signers: SignerStatus[]
  completedAt: string | null
}

// ═══════════════════════════════════════════════
// CREATE DOCUMENT & SEND (Send for Signature)
// ═══════════════════════════════════════════════

export async function createDocument(
  contractId: string,
  pdfBuffer: Buffer,
  signers: SignerInfo[],
  documentName: string,
  message?: string,
): Promise<DocumentResult> {
  // Step 1: Create document from PDF upload using multipart form
  const config = getConfig()
  const boundary = `----PandaDoc${Date.now()}`

  const recipients = signers.map((s, i) => ({
    email: s.email,
    first_name: s.name.split(' ')[0] || s.name,
    last_name: s.name.split(' ').slice(1).join(' ') || '',
    role: s.role,
    signing_order: s.routingOrder ?? i + 1,
  }))

  const metadata = JSON.stringify({
    name: documentName,
    recipients,
    parse_form_fields: false,
  })

  // Build multipart body
  const parts: Buffer[] = []
  // JSON metadata part
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="data"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${metadata}\r\n`
  ))
  // PDF file part
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="contract_${contractId}.pdf"\r\n` +
    `Content-Type: application/pdf\r\n\r\n`
  ))
  parts.push(pdfBuffer)
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

  const body = Buffer.concat(parts)

  const createRes = await fetch(`${config.baseUrl}/public/v1/documents`, {
    method: 'POST',
    headers: {
      Authorization: `API-Key ${config.apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`PandaDoc create document failed (${createRes.status}): ${errText}`)
  }

  const doc = await createRes.json()
  const documentId = doc.id

  // Step 2: Wait briefly for document to process, then send
  // PandaDoc needs a moment to process the uploaded PDF
  await new Promise(resolve => setTimeout(resolve, 2000))

  const sendRes = await pandadocFetch(`/documents/${documentId}/send`, {
    method: 'POST',
    body: JSON.stringify({
      message: message || 'Please review and sign this contract.',
      silent: false,
    }),
  })

  if (!sendRes.ok) {
    const errText = await sendRes.text()
    throw new Error(`PandaDoc send document failed (${sendRes.status}): ${errText}`)
  }

  const sentAt = new Date().toISOString()

  // Update contract with PandaDoc document info
  await prisma.contract.update({
    where: { id: contractId },
    data: {
      pandadocDocumentId: documentId,
      pandadocStatus: 'document.sent',
      pandadocSentAt: new Date(),
      signerStatuses: signers.map(s => ({
        name: s.name,
        email: s.email,
        role: s.role,
        status: 'sent',
        signedAt: null,
        declinedReason: null,
      })),
    },
  })

  logger.info('PandaDoc document created and sent', { contractId, documentId })

  return {
    documentId,
    status: 'document.sent',
    sentAt,
  }
}

// ═══════════════════════════════════════════════
// GET DOCUMENT STATUS
// ═══════════════════════════════════════════════

export async function getDocumentStatus(documentId: string): Promise<DocumentStatus> {
  const res = await pandadocFetch(`/documents/${documentId}`)
  if (!res.ok) {
    throw new Error(`PandaDoc get document failed (${res.status})`)
  }
  const doc = await res.json()

  const detailRes = await pandadocFetch(`/documents/${documentId}/details`)
  const details = detailRes.ok ? await detailRes.json() : null

  const signers: SignerStatus[] = (details?.recipients || doc.recipients || []).map((r: Record<string, string>) => ({
    name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email,
    email: r.email,
    role: r.role || 'signer',
    status: r.has_completed ? 'completed' : r.has_viewed ? 'viewed' : 'sent',
    signedAt: r.completed_on || null,
    declinedReason: r.declined_reason || null,
  }))

  return {
    documentId,
    status: doc.status,
    signers,
    completedAt: doc.date_completed || null,
  }
}

// ═══════════════════════════════════════════════
// VOID DOCUMENT
// ═══════════════════════════════════════════════

export async function voidDocument(documentId: string, _reason: string): Promise<void> {
  // PandaDoc uses status change to "document.voided"
  const res = await pandadocFetch(`/documents/${documentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'document.voided' }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`PandaDoc void document failed (${res.status}): ${errText}`)
  }

  logger.info('PandaDoc document voided', { documentId })
}

// ═══════════════════════════════════════════════
// DOWNLOAD SIGNED DOCUMENT
// ═══════════════════════════════════════════════

export async function downloadSignedDocument(documentId: string): Promise<Buffer> {
  const config = getConfig()
  const url = `${config.baseUrl}/public/v1/documents/${documentId}/download`

  const res = await fetch(url, {
    headers: { Authorization: `API-Key ${config.apiKey}` },
  })

  if (!res.ok) {
    throw new Error(`PandaDoc download failed (${res.status})`)
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ═══════════════════════════════════════════════
// WEBHOOK VERIFICATION
// ═══════════════════════════════════════════════

export function verifyWebhookSignature(
  payload: string,
  signature: string,
): boolean {
  const config = getConfig()
  if (!config.webhookKey) {
    logger.warn('PandaDoc webhook key not configured, skipping verification')
    return true // Allow in dev without key
  }

  const hmac = crypto.createHmac('sha256', config.webhookKey)
  hmac.update(payload)
  const computed = hmac.digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature),
  )
}

// ═══════════════════════════════════════════════
// PROCESS WEBHOOK EVENT
// ═══════════════════════════════════════════════

export interface PandaDocWebhookPayload {
  event: string  // "document_state_changed", "recipient_completed", "document_deleted"
  data: {
    id: string          // document ID
    name: string
    status: string      // "document.draft" | "document.sent" | "document.viewed" | "document.waiting_approval" | "document.completed" | "document.voided" | "document.declined"
    date_completed?: string
    date_declined?: string
    recipients: Array<{
      email: string
      first_name: string
      last_name: string
      role: string
      has_completed: boolean
      completed_on?: string
      has_viewed: boolean
      declined_reason?: string
    }>
  }
}

export async function processWebhookEvent(payload: PandaDocWebhookPayload): Promise<{
  contractId: string | null
  action: string
}> {
  const documentId = payload.data?.id
  if (!documentId) {
    return { contractId: null, action: 'ignored_no_document' }
  }

  // Find contract by PandaDoc document ID
  const contract = await prisma.contract.findUnique({
    where: { pandadocDocumentId: documentId },
    include: { deal: true, offer: true },
  })

  if (!contract) {
    logger.warn('PandaDoc webhook for unknown document', { documentId })
    return { contractId: null, action: 'ignored_unknown_document' }
  }

  const docStatus = payload.data.status

  // Update signer statuses from recipients
  const signerStatuses: SignerStatus[] = (payload.data.recipients || []).map(r => ({
    name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email,
    email: r.email,
    role: r.role || 'signer',
    status: r.has_completed ? 'completed' : r.has_viewed ? 'viewed' : 'sent',
    signedAt: r.completed_on || null,
    declinedReason: r.declined_reason || null,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    pandadocStatus: docStatus,
    signerStatuses,
  }

  let action = `status_updated_${docStatus}`

  switch (docStatus) {
    case 'document.completed': {
      updateData.pandadocCompletedAt = payload.data.date_completed ? new Date(payload.data.date_completed) : new Date()
      updateData.buyerSignedAt = new Date()
      updateData.sellerSignedAt = new Date()

      // Auto-transition contract to EXECUTED if currently SENT
      if (contract.status === 'SENT') {
        updateData.status = 'EXECUTED'

        // Update linked offer + deal
        await prisma.$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (contract.offerId) {
            const offer = await tx.offer.findUnique({ where: { id: contract.offerId } })
            if (offer && offer.status !== 'ACCEPTED') {
              await tx.offer.update({
                where: { id: contract.offerId },
                data: { status: 'ACCEPTED', signedAt: new Date() },
              })
            }
          }
          if (contract.deal.status !== 'CLOSED') {
            await tx.deal.update({
              where: { id: contract.dealId },
              data: { status: 'CLOSED', closedAt: new Date() },
            })
          }
        })

        action = 'auto_executed'
      }
      break
    }

    case 'document.declined': {
      updateData.pandadocDeclinedAt = payload.data.date_declined ? new Date(payload.data.date_declined) : new Date()
      const declinedSigner = signerStatuses.find(s => s.declinedReason)
      updateData.pandadocDeclineReason = declinedSigner?.declinedReason || 'Signer declined'
      action = 'declined'
      break
    }

    case 'document.voided': {
      if (contract.status === 'SENT') {
        updateData.status = 'VOIDED'
        updateData.voidedAt = new Date()
        updateData.voidReason = 'Voided via PandaDoc'
      }
      action = 'voided_via_pandadoc'
      break
    }
  }

  await prisma.contract.update({
    where: { id: contract.id },
    data: updateData,
  })

  logger.info('PandaDoc webhook processed', {
    contractId: contract.id,
    documentId,
    status: docStatus,
    action,
  })

  return { contractId: contract.id, action }
}

// ═══════════════════════════════════════════════
// BUILD SIGNERS FROM CONTRACT DATA
// ═══════════════════════════════════════════════

export function buildSignersFromContract(
  contractData: Record<string, string>,
  templateType: string,
): SignerInfo[] {
  const signers: SignerInfo[] = []

  if (templateType === 'JV_AGREEMENT') {
    if (contractData.partyAEmail && contractData.partyAName) {
      signers.push({
        name: contractData.partyAName,
        email: contractData.partyAEmail,
        role: 'partner_a',
        routingOrder: 1,
      })
    }
    if (contractData.partyBEmail && contractData.partyBName) {
      signers.push({
        name: contractData.partyBName,
        email: contractData.partyBEmail,
        role: 'partner_b',
        routingOrder: 2,
      })
    }
  } else if (templateType === 'DOUBLE_CLOSE') {
    if (contractData.wholesalerName) {
      signers.push({
        name: contractData.wholesalerName,
        email: contractData.assignorEmail || contractData.wholesalerEmail || '',
        role: 'seller',
        routingOrder: 1,
      })
    }
    if (contractData.buyerEmail && contractData.buyerName) {
      signers.push({
        name: contractData.buyerName,
        email: contractData.buyerEmail,
        role: 'buyer',
        routingOrder: 2,
      })
    }
  } else {
    // ASSIGNMENT — assignor (wholesaler) and assignee (buyer)
    if (contractData.assignorEmail && contractData.assignorName) {
      signers.push({
        name: contractData.assignorName,
        email: contractData.assignorEmail,
        role: 'assignor',
        routingOrder: 1,
      })
    }
    if (contractData.assigneeEmail && contractData.assigneeName) {
      signers.push({
        name: contractData.assigneeName,
        email: contractData.assigneeEmail,
        role: 'assignee',
        routingOrder: 2,
      })
    }
  }

  return signers.filter(s => s.email) // Only include signers with email addresses
}
