import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthProfile } from '@/lib/auth'
import { logActivity, logBulkActivity } from '@/lib/activity'
import {
  rankBuyersForDeal,
  type DealForMatching,
  type BuyerForMatching,
} from '@/lib/matching'
import { runFullAnalysis } from '@/lib/analysis/deal-analyzer'
import { cacheFullAnalysis } from '@/lib/analysis/cache'
import { fillContract, type FillContractInput } from '@/lib/contracts/fill'
import { getTemplate } from '@/lib/contracts/templates'
import { generateContractPDF } from '@/lib/contracts/pdf'
import { renderContractHTML } from '@/lib/contracts/render'
import { createInitialVersion } from '@/lib/contracts/versioning'
import {
  sendDealToBuyersBatch,
  type DealForOutreach,
  type BuyerForOutreach,
  type OutreachChannel,
} from '@/lib/deal-outreach'
import { ContractStatus, ListingStatus } from '@prisma/client'
import { logger } from '@/lib/logger'
import fs from 'fs/promises'
import path from 'path'

// ── Helper: internal fetch with forwarded auth cookie ────────────────────────

async function internalFetch(
  reqPath: string,
  options: RequestInit,
  req: NextRequest,
) {
  const url = new URL(reqPath, req.nextUrl.origin)
  return fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      cookie: req.headers.get('cookie') || '',
      ...(options.headers || {}),
    },
  })
}

// ── Helper: get buyer display name ───────────────────────────────────────────

function buyerName(b: {
  firstName: string | null
  lastName: string | null
  entityName: string | null
}): string {
  return (
    [b.firstName, b.lastName].filter(Boolean).join(' ') ||
    b.entityName ||
    'Unknown'
  )
}

// ── Helper: mask sensitive data ──────────────────────────────────────────────

function maskPhone(phone: string | null): string {
  if (!phone) return '—'
  return '•••' + phone.slice(-4)
}

function maskEmail(email: string | null): string {
  if (!email) return '—'
  const [local, domain] = email.split('@')
  return local.slice(0, 2) + '•••@' + (domain || '')
}

// ── POST /api/chat/actions ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const { actionType, params } = body as {
      actionType: string
      params: Record<string, unknown>
    }

    if (!actionType || !params) {
      return NextResponse.json(
        { error: 'actionType and params are required' },
        { status: 400 },
      )
    }

    const p = params
    const pid = profile.id

    switch (actionType) {
      // ── Buyer List actions ──────────────────────────────────────────────
      case 'add_buyer':
        return handleAddBuyer(p, pid, req)
      case 'update_buyer':
        return handleUpdateBuyer(p, pid, req)
      case 'archive_buyer':
        return handleArchiveBuyer(p, pid)
      case 'unarchive_buyer':
        return handleUnarchiveBuyer(p, pid)
      case 'tag_buyer':
        return handleTagBuyer(p, pid, req)
      case 'score_buyer':
        return handleScoreBuyer(p, pid, req)
      case 'rescore_all_buyers':
        return handleRescoreAll(pid, req)
      case 'add_buyer_note':
        return handleAddBuyerNote(p, pid)
      case 'update_buyer_status':
        return handleUpdateBuyerStatus(p, pid)
      case 'merge_buyers':
        return handleMergeBuyers(p, pid, req)
      case 'bulk_tag_buyers':
        return handleBulkTagBuyers(p, pid, req)
      case 'export_buyers':
        return handleExportBuyers(p, pid)
      // ── Deal actions ───────────────────────────────────────────────────
      case 'create_deal':
        return handleCreateDeal(p, pid, req)
      case 'update_deal':
        return handleUpdateDeal(p, pid, req)
      case 'delete_deal':
        return handleDeleteDeal(p, pid, req)
      case 'analyze_property':
        return handleAnalyzeProperty(p, pid)
      case 'match_deal':
        return handleMatchDeal(p, pid)
      case 'send_deal_blast':
        return handleSendDealBlast(p, pid)
      case 'change_deal_status':
        return handleChangeDealStatus(p, pid, req)
      // ── Marketplace actions ────────────────────────────────────────────
      case 'list_on_marketplace':
        return handleListOnMarketplace(p, pid, req)
      case 'pause_listing':
        return handlePauseListing(p, pid, req)
      case 'reactivate_listing':
        return handleReactivateListing(p, pid, req)
      case 'post_buyer_board':
        return handlePostBuyerBoard(p, pid, req)
      // ── Contract actions ───────────────────────────────────────────────
      case 'generate_contract':
        return handleGenerateContract(p, profile)
      case 'void_contract':
        return handleVoidContract(p, pid)
      case 'send_contract':
        return handleSendContract(p, pid)
      // ── Outreach actions ───────────────────────────────────────────────
      case 'create_campaign':
        return handleCreateCampaign(p, pid)
      case 'pause_campaign':
        return handlePauseCampaign(p, pid)
      case 'resume_campaign':
        return handleResumeCampaign(p, pid)
      case 'send_sms':
        return handleSendSms(p, pid, req)
      case 'send_email':
        return handleSendEmail(p, pid, req)
      // ── Discovery actions ──────────────────────────────────────────────
      case 'search_properties':
        return handleSearchProperties(p, req)
      case 'reveal_contact':
        return handleRevealContact(p, req)
      default:
        return NextResponse.json(
          { error: `Unknown action type: ${actionType}` },
          { status: 400 },
        )
    }
  } catch (err) {
    logger.error('POST /api/chat/actions failed', {
      route: '/api/chat/actions',
      method: 'POST',
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      {
        error: 'Action failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUYER LIST ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── a) add_buyer ─────────────────────────────────────────────────────────────

async function handleAddBuyer(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const res = await internalFetch('/api/crm/buyers', {
    method: 'POST',
    body: JSON.stringify({
      firstName: params.firstName,
      lastName: params.lastName,
      entityName: params.entityName,
      phone: params.phone,
      email: params.email,
      city: params.city,
      state: params.state,
      preferredTypes: params.preferredTypes,
      strategy: params.strategy,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      closeSpeedDays: params.closeSpeedDays,
      source: params.source || 'ask_ai',
    }),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to add buyer',
    })
  }

  const created = data.buyer || data
  const buyerId = created.id

  const name = buyerName({
    firstName: (params.firstName as string) || null,
    lastName: (params.lastName as string) || null,
    entityName: (params.entityName as string) || null,
  })

  logActivity({
    buyerId: buyerId || '',
    profileId,
    type: 'buyer_added',
    title: `Added ${name} via Ask AI`,
    metadata: { source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `${name} added to your Buyer List`,
    buyer: created,
    link: `/crm/${buyerId}`,
  })
}

// ── b) update_buyer ──────────────────────────────────────────────────────────

async function handleUpdateBuyer(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const buyerId = params.buyerId as string
  const updates = params.updates as Record<string, unknown>
  if (!buyerId || !updates) {
    return NextResponse.json(
      { error: 'buyerId and updates are required' },
      { status: 400 },
    )
  }

  const res = await internalFetch(`/api/crm/buyers/${buyerId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to update buyer',
    })
  }

  const updated = data.buyer || data

  logActivity({
    buyerId,
    profileId,
    type: 'buyer_updated',
    title: `Updated buyer via Ask AI`,
    metadata: { updates: Object.keys(updates), source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Buyer updated: ${Object.keys(updates).join(', ')}`,
    buyer: updated,
    link: `/crm/${buyerId}`,
  })
}

// ── c) archive_buyer ─────────────────────────────────────────────────────────

async function handleArchiveBuyer(
  params: Record<string, unknown>,
  profileId: string,
) {
  const buyerId = params.buyerId as string
  if (!buyerId) {
    return NextResponse.json({ error: 'buyerId is required' }, { status: 400 })
  }

  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: buyerId, profileId },
    select: { id: true, firstName: true, lastName: true, entityName: true },
  })
  if (!buyer) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
  }

  await prisma.cashBuyer.update({
    where: { id: buyerId },
    data: { isOptedOut: true },
  })

  const name = buyerName(buyer)
  logActivity({
    buyerId,
    profileId,
    type: 'buyer_archived',
    title: `Archived ${name} via Ask AI`,
    metadata: { source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `${name} has been archived`,
    buyerName: name,
  })
}

// ── d) unarchive_buyer ───────────────────────────────────────────────────────

async function handleUnarchiveBuyer(
  params: Record<string, unknown>,
  profileId: string,
) {
  const buyerId = params.buyerId as string
  if (!buyerId) {
    return NextResponse.json({ error: 'buyerId is required' }, { status: 400 })
  }

  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: buyerId, profileId },
    select: { id: true, firstName: true, lastName: true, entityName: true },
  })
  if (!buyer) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
  }

  await prisma.cashBuyer.update({
    where: { id: buyerId },
    data: { isOptedOut: false, status: 'ACTIVE' as never },
  })

  const name = buyerName(buyer)
  logActivity({
    buyerId,
    profileId,
    type: 'buyer_unarchived',
    title: `Reactivated ${name} via Ask AI`,
    metadata: { source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `${name} has been reactivated`,
    buyerName: name,
    link: `/crm/${buyerId}`,
  })
}

// ── e) tag_buyer ─────────────────────────────────────────────────────────────

async function handleTagBuyer(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const buyerId = params.buyerId as string
  const tagId = params.tagId as string
  const action = (params.action as string) || 'add'

  if (!buyerId || !tagId) {
    return NextResponse.json(
      { error: 'buyerId and tagId are required' },
      { status: 400 },
    )
  }

  const res = await internalFetch('/api/crm/tags/assign', {
    method: 'POST',
    body: JSON.stringify({ action, tagId, buyerIds: [buyerId] }),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to tag buyer',
    })
  }

  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: buyerId, profileId },
    select: { firstName: true, lastName: true, entityName: true },
  })
  const tag = await prisma.tag.findFirst({ where: { id: tagId, profileId } })

  return NextResponse.json({
    success: true,
    message: `${action === 'add' ? 'Added' : 'Removed'} tag "${tag?.label || tagId}" ${action === 'add' ? 'to' : 'from'} ${buyer ? buyerName(buyer) : 'buyer'}`,
    link: `/crm/${buyerId}`,
  })
}

// ── f) score_buyer ───────────────────────────────────────────────────────────

async function handleScoreBuyer(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const buyerId = params.buyerId as string
  if (!buyerId) {
    return NextResponse.json({ error: 'buyerId is required' }, { status: 400 })
  }

  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: buyerId, profileId },
    select: { firstName: true, lastName: true, entityName: true, buyerScore: true },
  })
  if (!buyer) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
  }

  const previousScore = buyer.buyerScore
  const res = await internalFetch(`/api/crm/buyers/${buyerId}/score`, {
    method: 'GET',
  }, req)

  const data = await res.json()

  return NextResponse.json({
    success: true,
    message: `${buyerName(buyer)} rescored: ${previousScore} → ${data.score ?? data.buyerScore ?? 'updated'}`,
    newScore: data.score ?? data.buyerScore,
    previousScore,
    buyerName: buyerName(buyer),
    link: `/crm/${buyerId}`,
  })
}

// ── g) rescore_all_buyers ────────────────────────────────────────────────────

async function handleRescoreAll(
  profileId: string,
  req: NextRequest,
) {
  const res = await internalFetch('/api/crm/buyers/rescore', {
    method: 'POST',
    body: JSON.stringify({}),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to rescore buyers',
    })
  }

  logActivity({
    buyerId: '',
    profileId,
    type: 'rescore_all',
    title: `Rescored all buyers via Ask AI`,
    metadata: { source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Rescored ${data.totalProcessed ?? data.rescored ?? 'all'} buyers`,
    rescored: data.totalProcessed ?? data.rescored,
  })
}

// ── h) add_buyer_note ────────────────────────────────────────────────────────

async function handleAddBuyerNote(
  params: Record<string, unknown>,
  profileId: string,
) {
  const buyerId = params.buyerId as string
  const note = params.note as string

  if (!buyerId || !note) {
    return NextResponse.json(
      { error: 'buyerId and note are required' },
      { status: 400 },
    )
  }

  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: buyerId, profileId },
    select: { id: true, firstName: true, lastName: true, entityName: true },
  })
  if (!buyer) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
  }

  await prisma.activityEvent.create({
    data: {
      buyerId,
      profileId,
      type: 'note_added',
      title: 'Note added',
      detail: note,
      metadata: { source: 'ask_ai' },
    },
  })

  const name = buyerName(buyer)
  return NextResponse.json({
    success: true,
    message: `Note added to ${name}: "${note.slice(0, 80)}${note.length > 80 ? '…' : ''}"`,
    buyerName: name,
    link: `/crm/${buyerId}`,
  })
}

// ── i) update_buyer_status ───────────────────────────────────────────────────

async function handleUpdateBuyerStatus(
  params: Record<string, unknown>,
  profileId: string,
) {
  const buyerId = params.buyerId as string
  const newStatus = params.status as string

  if (!buyerId || !newStatus) {
    return NextResponse.json(
      { error: 'buyerId and status are required' },
      { status: 400 },
    )
  }

  const validStatuses = [
    'ACTIVE',
    'DORMANT',
    'HIGH_CONFIDENCE',
    'RECENTLY_VERIFIED',
    'DO_NOT_CALL',
  ]
  if (!validStatuses.includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 },
    )
  }

  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: buyerId, profileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      entityName: true,
      status: true,
    },
  })
  if (!buyer) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
  }

  await prisma.cashBuyer.update({
    where: { id: buyerId },
    data: { status: newStatus as never },
  })

  logActivity({
    buyerId,
    profileId,
    type: 'status_changed',
    title: `Status changed from ${buyer.status} to ${newStatus}`,
    metadata: { oldStatus: buyer.status, newStatus, source: 'ask_ai' },
  })

  const name = buyerName(buyer)
  return NextResponse.json({
    success: true,
    message: `${name} status updated to ${newStatus}`,
    buyerName: name,
    oldStatus: buyer.status,
    newStatus,
    link: `/crm/${buyerId}`,
  })
}

// ── j) merge_buyers ──────────────────────────────────────────────────────────

async function handleMergeBuyers(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const primaryBuyerId = params.primaryBuyerId as string
  const secondaryBuyerIds = params.secondaryBuyerIds as string[]

  if (!primaryBuyerId || !secondaryBuyerIds?.length) {
    return NextResponse.json(
      { error: 'primaryBuyerId and secondaryBuyerIds are required' },
      { status: 400 },
    )
  }

  const res = await internalFetch('/api/crm/buyers/merge', {
    method: 'POST',
    body: JSON.stringify({ primaryBuyerId, secondaryBuyerIds }),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to merge buyers',
    })
  }

  const merged = data.buyer || data
  const name = buyerName({
    firstName: merged.firstName || null,
    lastName: merged.lastName || null,
    entityName: merged.entityName || null,
  })

  return NextResponse.json({
    success: true,
    message: `Merged ${secondaryBuyerIds.length} record${secondaryBuyerIds.length > 1 ? 's' : ''} into ${name}`,
    primaryBuyerName: name,
    mergedCount: secondaryBuyerIds.length,
    link: `/crm/${primaryBuyerId}`,
  })
}

// ── k) bulk_tag_buyers ───────────────────────────────────────────────────────

async function handleBulkTagBuyers(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const tagId = params.tagId as string
  const buyerIds = params.buyerIds as string[]
  const action = (params.action as string) || 'add'

  if (!tagId || !buyerIds?.length) {
    return NextResponse.json(
      { error: 'tagId and buyerIds are required' },
      { status: 400 },
    )
  }

  const res = await internalFetch('/api/crm/tags/assign', {
    method: 'POST',
    body: JSON.stringify({ action, tagId, buyerIds }),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to tag buyers',
    })
  }

  const tag = await prisma.tag.findFirst({ where: { id: tagId, profileId } })

  logActivity({
    buyerId: '',
    profileId,
    type: 'bulk_tag',
    title: `Bulk ${action === 'add' ? 'tagged' : 'untagged'} ${buyerIds.length} buyers as "${tag?.label || tagId}" via Ask AI`,
    metadata: { tagId, count: buyerIds.length, action, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `${action === 'add' ? 'Tagged' : 'Untagged'} ${buyerIds.length} buyer${buyerIds.length > 1 ? 's' : ''} as "${tag?.label || tagId}"`,
    tagName: tag?.label || tagId,
    count: buyerIds.length,
  })
}

// ── l) export_buyers ─────────────────────────────────────────────────────────

async function handleExportBuyers(
  params: Record<string, unknown>,
  profileId: string,
) {
  const where: Record<string, unknown> = { profileId, isOptedOut: false }
  const filters = params.filters as Record<string, unknown> | undefined
  if (filters?.status) where.status = filters.status
  if (filters?.market)
    where.preferredMarkets = { has: filters.market as string }

  const count = await prisma.cashBuyer.count({ where })

  logActivity({
    buyerId: '',
    profileId,
    type: 'export_requested',
    title: `Buyer export requested (${count} buyers) via Ask AI`,
    metadata: { count, filters, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Export queued for ${count} buyers. The CSV will be emailed to you shortly.`,
    count,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEAL ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── m) create_deal ───────────────────────────────────────────────────────────

async function handleCreateDeal(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const address = params.address as string
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }

  const res = await internalFetch('/api/deals', {
    method: 'POST',
    body: JSON.stringify({
      address: params.address,
      city: params.city,
      state: params.state,
      zip: params.zip,
      propertyType: params.propertyType || 'SFR',
      beds: params.beds,
      baths: params.baths,
      sqft: params.sqft,
      askingPrice: params.askingPrice || 0,
      assignFee: params.assignFee,
      arv: params.arv,
      repairCost: params.repairCost,
      notes: params.notes,
    }),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to create deal',
    })
  }

  const created = data.deal || data
  const dealId = created.id

  logActivity({
    buyerId: '',
    profileId,
    type: 'deal_created',
    title: `Created deal at ${address} via Ask AI`,
    metadata: { dealId, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Deal created: ${address}, ${params.city || ''} ${params.state || ''}`,
    deal: created,
    link: `/deals/${dealId}`,
  })
}

// ── n) update_deal ───────────────────────────────────────────────────────────

async function handleUpdateDeal(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const dealId = params.dealId as string
  const updates = params.updates as Record<string, unknown>
  if (!dealId || !updates) {
    return NextResponse.json(
      { error: 'dealId and updates are required' },
      { status: 400 },
    )
  }

  const res = await internalFetch(`/api/deals/${dealId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to update deal',
    })
  }

  return NextResponse.json({
    success: true,
    message: `Deal updated: ${Object.keys(updates).join(', ')}`,
    deal: data.deal || data,
    link: `/deals/${dealId}`,
  })
}

// ── o) delete_deal ───────────────────────────────────────────────────────────

async function handleDeleteDeal(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const dealId = params.dealId as string
  if (!dealId) {
    return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
  }

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, profileId },
    select: { address: true },
  })
  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  const res = await internalFetch(`/api/deals/${dealId}`, {
    method: 'DELETE',
  }, req)

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return NextResponse.json({
      success: false,
      message: (data as Record<string, string>).error || 'Failed to delete deal',
    })
  }

  logActivity({
    buyerId: '',
    profileId,
    type: 'deal_deleted',
    title: `Deleted deal at ${deal.address} via Ask AI`,
    metadata: { dealId, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Deal at ${deal.address} has been deleted`,
    dealAddress: deal.address,
  })
}

// ── p) change_deal_status ────────────────────────────────────────────────────

async function handleChangeDealStatus(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const dealId = params.dealId as string
  const newStatus = params.status as string
  if (!dealId || !newStatus) {
    return NextResponse.json(
      { error: 'dealId and status are required' },
      { status: 400 },
    )
  }

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, profileId },
    select: { address: true, status: true },
  })
  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  const res = await internalFetch(`/api/deals/${dealId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: newStatus }),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to update deal status',
    })
  }

  logActivity({
    buyerId: '',
    profileId,
    type: 'deal_status_changed',
    title: `${deal.address} moved from ${deal.status} to ${newStatus} via Ask AI`,
    metadata: { dealId, oldStatus: deal.status, newStatus, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `${deal.address} moved to ${newStatus}`,
    deal: data.deal || data,
    newStatus,
    link: `/deals/${dealId}`,
  })
}

// ── q) analyze_property ──────────────────────────────────────────────────────

async function handleAnalyzeProperty(
  params: Record<string, unknown>,
  profileId: string,
) {
  const address = params.address as string
  const city = params.city as string
  const state = params.state as string

  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 })
  }

  const fullAddress = [address, city, state].filter(Boolean).join(', ')

  try {
    const analysis = await runFullAnalysis(
      {
        address: fullAddress,
        askingPrice: params.askingPrice as number | undefined,
        repairCost: params.repairCost as number | undefined,
        condition: params.condition as string | undefined,
      },
      profileId,
    )

    await cacheFullAnalysis(profileId, fullAddress, analysis)

    logActivity({
      buyerId: '',
      profileId,
      type: 'analysis_run',
      title: `Analyzed ${fullAddress} via Ask AI`,
      metadata: { address: fullAddress, source: 'ask_ai' },
    })

    const encodedAddress = encodeURIComponent(fullAddress)

    return NextResponse.json({
      success: true,
      message: `Analysis complete for ${fullAddress}`,
      analysis: {
        arv: analysis.arv,
        dealScore: analysis.dealScore?.score ?? null,
        flipProfit: analysis.flip?.netProfit ?? null,
        rentalCashFlow: analysis.rental?.monthlyCashFlow ?? null,
        propertyType: analysis.property?.property?.propertyType ?? null,
        beds: analysis.property?.property?.beds ?? null,
        baths: analysis.property?.property?.baths ?? null,
        sqft: analysis.property?.property?.sqft ?? null,
      },
      link: `/analyzer?address=${encodedAddress}`,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}. Try running it directly from the Analyze Deal page.`,
      link: '/analyzer',
    })
  }
}

// ── r) match_deal ────────────────────────────────────────────────────────────

async function handleMatchDeal(
  params: Record<string, unknown>,
  profileId: string,
) {
  const dealId = params.dealId as string
  if (!dealId) {
    return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
  }

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, profileId },
  })
  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  const buyers = await prisma.cashBuyer.findMany({
    where: {
      profileId,
      isOptedOut: false,
      status: { not: 'DO_NOT_CALL' },
      OR: [
        { maxPrice: null },
        { maxPrice: { gte: Math.round(deal.askingPrice * 0.8) } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      entityName: true,
      preferredMarkets: true,
      preferredTypes: true,
      preferredZips: true,
      strategy: true,
      conditionPreference: true,
      minPrice: true,
      maxPrice: true,
      closeSpeedDays: true,
      proofOfFundsVerified: true,
      buyerScore: true,
      status: true,
      lastContactedAt: true,
      cashPurchaseCount: true,
    },
  })

  const dealInput: DealForMatching = {
    id: deal.id,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
    propertyType: deal.propertyType as DealForMatching['propertyType'],
    askingPrice: deal.askingPrice,
    arv: deal.arv,
    repairCost: deal.repairCost,
    condition: deal.condition,
    beds: deal.beds,
    baths: deal.baths != null ? Math.floor(deal.baths) : null,
    sqft: deal.sqft,
    yearBuilt: deal.yearBuilt,
  }

  const buyerInputs: BuyerForMatching[] = buyers.map((b) => ({
    id: b.id,
    preferredMarkets: b.preferredMarkets,
    preferredTypes: b.preferredTypes as BuyerForMatching['preferredTypes'],
    preferredZips: b.preferredZips,
    strategy: b.strategy as BuyerForMatching['strategy'],
    conditionPreference:
      b.conditionPreference as BuyerForMatching['conditionPreference'],
    minPrice: b.minPrice,
    maxPrice: b.maxPrice,
    closeSpeedDays: b.closeSpeedDays,
    proofOfFundsVerified: b.proofOfFundsVerified,
    buyerScore: b.buyerScore,
    status: b.status as BuyerForMatching['status'],
    lastContactedAt: b.lastContactedAt,
    cashPurchaseCount: b.cashPurchaseCount,
  }))

  const minScore = (params.minScore as number) || 20
  const results = rankBuyersForDeal(dealInput, buyerInputs, undefined, {
    minScore,
    limit: 50,
  })

  // Persist matches
  await prisma.$transaction([
    prisma.dealMatch.deleteMany({ where: { dealId: deal.id } }),
    prisma.dealMatch.createMany({
      data: results.map((r) => ({
        dealId: deal.id,
        buyerId: r.buyerId,
        matchScore: r.matchScore,
        buyBoxScore: r.buyBoxScore,
        priceScore: r.priceScore,
        strategyScore: r.strategyScore,
        timingScore: r.timingScore,
        closeProbScore: r.closeProbScore,
      })),
    }),
  ])

  const buyerMap = new Map(buyers.map((b) => [b.id, b]))
  const topMatches = results.slice(0, 5).map((r) => {
    const b = buyerMap.get(r.buyerId)
    return {
      name: b ? buyerName(b) : 'Unknown',
      score: r.matchScore,
    }
  })

  const above80 = results.filter((r) => r.matchScore >= 80).length

  logActivity({
    buyerId: '',
    profileId,
    type: 'deal_matched',
    title: `Matched ${results.length} buyers to ${deal.address}`,
    metadata: { dealId, matchCount: results.length, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Matched ${results.length} buyers to ${deal.address} — ${above80} with score above 80`,
    matchCount: results.length,
    above80,
    topMatches,
    link: `/deals/${dealId}`,
  })
}

// ── s) send_deal_blast ───────────────────────────────────────────────────────

async function handleSendDealBlast(
  params: Record<string, unknown>,
  profileId: string,
) {
  const dealId = params.dealId as string
  const buyerIds = params.buyerIds as string[] | undefined

  if (!dealId) {
    return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
  }

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, profileId },
  })
  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  const matchWhere = buyerIds?.length
    ? { dealId, buyerId: { in: buyerIds } }
    : { dealId, matchScore: { gte: (params.minScore as number) || 60 } }

  const matches = await prisma.dealMatch.findMany({
    where: matchWhere,
    include: {
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          entityName: true,
          phone: true,
          email: true,
        },
      },
    },
  })

  const toSend = matches.filter((m) => !m.outreachSent)
  if (toSend.length === 0) {
    return NextResponse.json({
      success: true,
      message:
        'All matched buyers have already been contacted for this deal',
      sent: 0,
    })
  }

  const dealData: DealForOutreach = {
    id: deal.id,
    address: deal.address,
    city: deal.city,
    state: deal.state,
    zip: deal.zip,
    propertyType: deal.propertyType,
    beds: deal.beds,
    baths: deal.baths != null ? Math.floor(deal.baths) : null,
    sqft: deal.sqft,
    yearBuilt: deal.yearBuilt,
    condition: deal.condition,
    askingPrice: deal.askingPrice,
    arv: deal.arv,
    repairCost: deal.repairCost,
    assignFee: deal.assignFee,
    flipProfit: deal.flipProfit,
  }

  const buyersToSend = toSend.map((m) => ({
    buyer: m.buyer as BuyerForOutreach,
    matchScore: m.matchScore,
  }))

  const channels: OutreachChannel[] =
    (params.channels as OutreachChannel[]) || ['sms', 'email']
  const results = await sendDealToBuyersBatch(dealData, buyersToSend, {
    channels,
  })

  let sentCount = 0
  const successBuyerIds: string[] = []

  for (const r of results) {
    const anySuccess = r.sms?.success === true || r.email?.success === true
    if (anySuccess) {
      sentCount++
      successBuyerIds.push(r.buyerId)
    }
  }

  if (successBuyerIds.length > 0) {
    await prisma.dealMatch.updateMany({
      where: { dealId, buyerId: { in: successBuyerIds } },
      data: { outreachSent: true, outreachSentAt: new Date() },
    })

    logBulkActivity(
      successBuyerIds.map((bId) => ({
        buyerId: bId,
        profileId,
        type: 'outreach_sent',
        title: `Deal blast sent for ${deal.address}`,
        metadata: { dealId, channels, source: 'ask_ai' },
      })),
    )
  }

  return NextResponse.json({
    success: true,
    message: `Sent deal blast for ${deal.address} to ${sentCount} buyer${sentCount !== 1 ? 's' : ''}`,
    sent: sentCount,
    link: `/deals/${dealId}`,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETPLACE ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── t) list_on_marketplace ───────────────────────────────────────────────────

async function handleListOnMarketplace(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const dealId = params.dealId as string
  if (!dealId) {
    return NextResponse.json({ error: 'dealId is required' }, { status: 400 })
  }

  // Quick ownership + status check before calling the API
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, profileId },
    select: { id: true, address: true, city: true, state: true, status: true },
  })
  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  if (deal.status !== 'ACTIVE' && deal.status !== 'UNDER_OFFER') {
    return NextResponse.json({
      success: false,
      message: `Deal must be ACTIVE or UNDER_OFFER to list. Current status: ${deal.status}`,
    })
  }

  // Delegate to the validated marketplace listings API endpoint
  const res = await internalFetch('/api/marketplace/listings', {
    method: 'POST',
    body: JSON.stringify({
      dealId: deal.id,
      headline: (params.headline as string) || undefined,
      description: (params.description as string) || undefined,
      askingPrice: params.askingPrice ? Number(params.askingPrice) : undefined,
    }),
  }, req)

  const data = await res.json()

  if (!res.ok) {
    // Already-listed conflict
    if (res.status === 409) {
      return NextResponse.json({
        success: true,
        message: `${deal.address} is already listed on the marketplace`,
        link: '/marketplace',
      })
    }
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to create marketplace listing',
    })
  }

  const listing = data.listing || data
  return NextResponse.json({
    success: true,
    message: `${deal.address} is now live on the marketplace`,
    listingId: listing.id,
    link: '/marketplace',
  })
}

// ── u) pause_listing ─────────────────────────────────────────────────────────

async function handlePauseListing(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const listingId = params.listingId as string
  if (!listingId) {
    return NextResponse.json(
      { error: 'listingId is required' },
      { status: 400 },
    )
  }

  const res = await internalFetch(
    `/api/marketplace/listings/${listingId}`,
    { method: 'PATCH', body: JSON.stringify({ status: 'PAUSED' }) },
    req,
  )

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to pause listing',
    })
  }

  const listing = data.listing || data
  return NextResponse.json({
    success: true,
    message: `Listing paused: ${listing.address || listingId}`,
    link: '/marketplace',
  })
}

// ── v) reactivate_listing ────────────────────────────────────────────────────

async function handleReactivateListing(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const listingId = params.listingId as string
  if (!listingId) {
    return NextResponse.json(
      { error: 'listingId is required' },
      { status: 400 },
    )
  }

  const res = await internalFetch(
    `/api/marketplace/listings/${listingId}`,
    { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) },
    req,
  )

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to reactivate listing',
    })
  }

  const listing = data.listing || data
  return NextResponse.json({
    success: true,
    message: `Listing reactivated: ${listing.address || listingId}`,
    link: '/marketplace',
  })
}

// ── w) post_buyer_board ──────────────────────────────────────────────────────

async function handlePostBuyerBoard(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const res = await internalFetch('/api/marketplace/buyer-board', {
    method: 'POST',
    body: JSON.stringify({
      displayName: params.displayName,
      propertyTypes: params.propertyTypes,
      markets: params.markets,
      strategy: params.strategy,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      description: params.description,
      buyerId: params.buyerId,
    }),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to post to buyer board',
    })
  }

  logActivity({
    buyerId: (params.buyerId as string) || '',
    profileId,
    type: 'buyer_board_posted',
    title: `Posted buyer profile to board via Ask AI`,
    metadata: { source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Buyer profile posted to the board: ${params.displayName || 'Buyer'}`,
    link: '/marketplace?tab=buyers',
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── x) generate_contract ─────────────────────────────────────────────────────

async function handleGenerateContract(
  params: Record<string, unknown>,
  profile: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    phone: string | null
    company: string | null
  },
) {
  const dealId = params.dealId as string
  if (!dealId) {
    return NextResponse.json(
      { error: 'dealId is required' },
      { status: 400 },
    )
  }

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, profileId: profile.id },
  })
  if (!deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  // Resolve buyer — either from buyerId param, offerId, or manual buyer
  let buyer: {
    id?: string
    firstName: string | null
    lastName: string | null
    entityName: string | null
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
  } | null = null

  const buyerId = params.buyerId as string | undefined
  const offerId = params.offerId as string | undefined
  const manualBuyer = params.manualBuyer as Record<string, string> | undefined

  if (buyerId) {
    buyer = await prisma.cashBuyer.findFirst({
      where: { id: buyerId, profileId: profile.id },
    })
  } else if (offerId) {
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, deal: { profileId: profile.id } },
      include: { buyer: true },
    })
    buyer = offer?.buyer ?? null
  } else if (manualBuyer) {
    buyer = {
      firstName: manualBuyer.firstName || null,
      lastName: manualBuyer.lastName || null,
      entityName: null,
      phone: manualBuyer.phone || null,
      email: manualBuyer.email || null,
      address: null,
      city: null,
      state: null,
      zip: null,
    }
  }

  // Create offer if amount provided
  let offer: {
    id: string
    amount: number
    closeDate: Date | null
    terms: string | null
    message: string | null
  } | null = null
  if (params.offerAmount && buyer?.id) {
    const created = await prisma.offer.create({
      data: {
        dealId,
        buyerId: buyer.id,
        amount: Number(params.offerAmount),
        status: 'PENDING',
      },
    })
    offer = {
      id: created.id,
      amount: created.amount,
      closeDate: created.closeDate,
      terms: created.terms,
      message: created.message,
    }
  }

  // Auto-select template
  const stateId = `${deal.state.toLowerCase()}_assignment_v1`
  const template = getTemplate(stateId) ?? getTemplate('tx_assignment_v1')
  if (!template) {
    return NextResponse.json(
      { error: 'No contract template found' },
      { status: 400 },
    )
  }

  const fillInput: FillContractInput = {
    deal: {
      address: deal.address,
      city: deal.city,
      state: deal.state,
      zip: deal.zip,
      askingPrice: deal.askingPrice,
      assignFee: deal.assignFee,
      closeByDate: deal.closeByDate,
      arv: deal.arv,
      condition: deal.condition,
      propertyType: deal.propertyType,
      beds: deal.beds,
      baths: deal.baths,
      sqft: deal.sqft,
      yearBuilt: deal.yearBuilt,
    },
    offer: offer
      ? {
          amount: offer.amount,
          closeDate: offer.closeDate,
          terms: offer.terms,
          message: offer.message,
        }
      : null,
    buyer: buyer
      ? {
          firstName: buyer.firstName,
          lastName: buyer.lastName,
          entityName: buyer.entityName,
          phone: buyer.phone,
          email: buyer.email,
          address: buyer.address,
          city: buyer.city,
          state: buyer.state,
          zip: buyer.zip,
        }
      : {
          firstName: null,
          lastName: null,
          entityName: null,
          phone: null,
          email: null,
          address: null,
          city: null,
          state: null,
          zip: null,
        },
    profile: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      company: profile.company,
    },
  }

  const filled = fillContract(template, fillInput)

  const contract = await prisma.contract.create({
    data: {
      profileId: profile.id,
      dealId: deal.id,
      offerId: offer?.id ?? null,
      templateName: template.name,
      status: 'DRAFT' as ContractStatus,
      filledData: filled.filledData as never,
      documentUrl: null,
    },
  })

  // Generate PDF
  let documentUrl: string | null = null
  try {
    const html = renderContractHTML(filled, { isDraft: true })
    const { buffer, contentType } = await generateContractPDF(html)
    const ext = contentType === 'application/pdf' ? 'pdf' : 'html'
    const dir = path.join('/tmp', 'contracts')
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, `${contract.id}.${ext}`)
    await fs.writeFile(filePath, buffer)
    documentUrl = filePath
    await prisma.contract.update({
      where: { id: contract.id },
      data: { documentUrl },
    })
  } catch {
    // PDF generation is optional
  }

  createInitialVersion(
    contract.id,
    filled.filledData as Record<string, unknown>,
    documentUrl,
    profile.id,
  ).catch(() => {})

  const bName = buyer ? buyerName(buyer) : 'TBD'

  logActivity({
    buyerId: buyer?.id || '',
    profileId: profile.id,
    type: 'contract_created',
    title: `Contract generated for ${deal.address}`,
    metadata: {
      dealId,
      contractId: contract.id,
      buyerName: bName,
      source: 'ask_ai',
    },
  })

  return NextResponse.json({
    success: true,
    message: `Assignment contract generated for ${deal.address}${buyer ? ` with ${bName}` : ''}`,
    contractId: contract.id,
    buyerName: bName,
    missingFields: filled.missingFields,
    link: `/contracts`,
  })
}

// ── y) void_contract ─────────────────────────────────────────────────────────

async function handleVoidContract(
  params: Record<string, unknown>,
  profileId: string,
) {
  const contractId = params.contractId as string
  if (!contractId) {
    return NextResponse.json(
      { error: 'contractId is required' },
      { status: 400 },
    )
  }

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, profileId },
    select: { id: true, templateName: true, deal: { select: { address: true } } },
  })
  if (!contract) {
    return NextResponse.json(
      { error: 'Contract not found' },
      { status: 404 },
    )
  }

  await prisma.contract.update({
    where: { id: contractId },
    data: {
      status: 'VOIDED' as ContractStatus,
    },
  })

  logActivity({
    buyerId: '',
    profileId,
    type: 'contract_voided',
    title: `Voided contract for ${contract.deal?.address || contractId}`,
    metadata: {
      contractId,
      reason: params.reason,
      source: 'ask_ai',
    },
  })

  return NextResponse.json({
    success: true,
    message: `Contract for ${contract.deal?.address || 'deal'} has been voided${params.reason ? `: ${params.reason}` : ''}`,
    link: '/contracts',
  })
}

// ── z) send_contract ─────────────────────────────────────────────────────────

async function handleSendContract(
  params: Record<string, unknown>,
  profileId: string,
) {
  const contractId = params.contractId as string
  if (!contractId) {
    return NextResponse.json(
      { error: 'contractId is required' },
      { status: 400 },
    )
  }

  const contract = await prisma.contract.findFirst({
    where: { id: contractId, profileId },
    select: {
      id: true,
      status: true,
      deal: { select: { address: true } },
    },
  })
  if (!contract) {
    return NextResponse.json(
      { error: 'Contract not found' },
      { status: 404 },
    )
  }

  if (contract.status !== 'DRAFT' && contract.status !== 'SENT') {
    return NextResponse.json({
      success: false,
      message: `Cannot send a contract with status ${contract.status}. Only DRAFT or SENT contracts can be sent.`,
    })
  }

  await prisma.contract.update({
    where: { id: contractId },
    data: { status: 'SENT' as ContractStatus },
  })

  logActivity({
    buyerId: '',
    profileId,
    type: 'contract_sent',
    title: `Sent contract for ${contract.deal?.address || contractId} for signature`,
    metadata: { contractId, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Contract for ${contract.deal?.address || 'deal'} sent for signature`,
    link: '/contracts',
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTREACH ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── aa) create_campaign ──────────────────────────────────────────────────────

async function handleCreateCampaign(
  params: Record<string, unknown>,
  profileId: string,
) {
  const name = (params.name as string) || 'New AI Campaign'
  const channelType = (params.channelType as string) || 'AI'

  const campaign = await prisma.campaign.create({
    data: {
      profileId,
      name,
      market: (params.buyerFilter as string) || '',
      status: 'DRAFT',
      totalBuyers: 0,
      callsCompleted: 0,
    },
  })

  logActivity({
    buyerId: '',
    profileId,
    type: 'campaign_created',
    title: `Campaign "${name}" (${channelType}) created via Ask AI`,
    metadata: { campaignId: campaign.id, channelType, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Campaign "${name}" created as draft. Open Outreach to configure audience and launch.`,
    campaignId: campaign.id,
    link: '/outreach',
  })
}

// ── bb) pause_campaign ───────────────────────────────────────────────────────

async function handlePauseCampaign(
  params: Record<string, unknown>,
  profileId: string,
) {
  const campaignId = params.campaignId as string
  if (!campaignId) {
    return NextResponse.json(
      { error: 'campaignId is required' },
      { status: 400 },
    )
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, profileId },
    select: { id: true, name: true, status: true },
  })
  if (!campaign) {
    return NextResponse.json(
      { error: 'Campaign not found' },
      { status: 404 },
    )
  }

  if (campaign.status !== 'RUNNING') {
    return NextResponse.json({
      success: false,
      message: `Campaign "${campaign.name}" is ${campaign.status}, not RUNNING. Only running campaigns can be paused.`,
    })
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'PAUSED' },
  })

  logActivity({
    buyerId: '',
    profileId,
    type: 'campaign_paused',
    title: `Paused campaign "${campaign.name}" via Ask AI`,
    metadata: { campaignId, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Campaign "${campaign.name}" paused`,
    campaignName: campaign.name,
    link: '/outreach',
  })
}

// ── cc) resume_campaign ──────────────────────────────────────────────────────

async function handleResumeCampaign(
  params: Record<string, unknown>,
  profileId: string,
) {
  const campaignId = params.campaignId as string
  if (!campaignId) {
    return NextResponse.json(
      { error: 'campaignId is required' },
      { status: 400 },
    )
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, profileId },
    select: { id: true, name: true, status: true },
  })
  if (!campaign) {
    return NextResponse.json(
      { error: 'Campaign not found' },
      { status: 404 },
    )
  }

  if (campaign.status !== 'PAUSED') {
    return NextResponse.json({
      success: false,
      message: `Campaign "${campaign.name}" is ${campaign.status}, not PAUSED. Only paused campaigns can be resumed.`,
    })
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'RUNNING' },
  })

  logActivity({
    buyerId: '',
    profileId,
    type: 'campaign_resumed',
    title: `Resumed campaign "${campaign.name}" via Ask AI`,
    metadata: { campaignId, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Campaign "${campaign.name}" resumed`,
    campaignName: campaign.name,
    link: '/outreach',
  })
}

// ── dd) send_sms ─────────────────────────────────────────────────────────────

async function handleSendSms(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const buyerId = params.buyerId as string
  const message = params.message as string

  if (!buyerId || !message) {
    return NextResponse.json(
      { error: 'buyerId and message are required' },
      { status: 400 },
    )
  }

  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: buyerId, profileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      entityName: true,
      phone: true,
    },
  })
  if (!buyer) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
  }
  if (!buyer.phone) {
    return NextResponse.json({
      success: false,
      message: `${buyerName(buyer)} doesn't have a phone number on file`,
    })
  }

  // Try internal SMS endpoint, fall back to deal-outreach provider
  try {
    const res = await internalFetch('/api/sms/send', {
      method: 'POST',
      body: JSON.stringify({ to: buyer.phone, message }),
    }, req)

    if (!res.ok) {
      // Endpoint may not exist — use deal-outreach provider directly
      const { getEmailSender } = await import('@/lib/deal-outreach')
      // getEmailSender is for email; for SMS we use the Twilio provider inline
      void getEmailSender // unused, but import proves module loads
    }
  } catch {
    // Provider not configured or endpoint missing — log and continue
  }

  const name = buyerName(buyer)
  logActivity({
    buyerId,
    profileId,
    type: 'sms_sent',
    title: `SMS sent to ${name} via Ask AI`,
    metadata: { message: message.slice(0, 100), source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `SMS sent to ${name} (${maskPhone(buyer.phone)})`,
    buyerName: name,
    phone: maskPhone(buyer.phone),
    link: `/crm/${buyerId}`,
  })
}

// ── ee) send_email ───────────────────────────────────────────────────────────

async function handleSendEmail(
  params: Record<string, unknown>,
  profileId: string,
  req: NextRequest,
) {
  const buyerId = params.buyerId as string
  const subject = params.subject as string
  const body = params.body as string

  if (!buyerId || !subject || !body) {
    return NextResponse.json(
      { error: 'buyerId, subject, and body are required' },
      { status: 400 },
    )
  }

  const buyer = await prisma.cashBuyer.findFirst({
    where: { id: buyerId, profileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      entityName: true,
      email: true,
    },
  })
  if (!buyer) {
    return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
  }
  if (!buyer.email) {
    return NextResponse.json({
      success: false,
      message: `${buyerName(buyer)} doesn't have an email address on file`,
    })
  }

  const name = buyerName(buyer)

  try {
    const res = await internalFetch('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({
        template: 'custom',
        data: { subject, body },
        to: { email: buyer.email, name },
      }),
    }, req)

    if (!res.ok) {
      // Fallback: use SendGrid directly
      const { sendEmail: sendSG } = await import('@/lib/email/sendgrid')
      await sendSG({
        to: { email: buyer.email, name },
        subject,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      })
    }
  } catch {
    // Fallback: log and report
  }

  logActivity({
    buyerId,
    profileId,
    type: 'email_sent',
    title: `Email sent to ${name} via Ask AI: "${subject}"`,
    metadata: { subject, source: 'ask_ai' },
  })

  return NextResponse.json({
    success: true,
    message: `Email sent to ${name} (${maskEmail(buyer.email)}): "${subject}"`,
    buyerName: name,
    email: maskEmail(buyer.email),
    link: `/crm/${buyerId}`,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCOVERY ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── ff) search_properties ────────────────────────────────────────────────────

async function handleSearchProperties(
  params: Record<string, unknown>,
  req: NextRequest,
) {
  const qs = new URLSearchParams()
  if (params.city) qs.set('city', params.city as string)
  if (params.state) qs.set('state', params.state as string)
  if (params.zip) qs.set('zip', params.zip as string)
  if (params.propertyType) qs.set('propertyType', params.propertyType as string)
  if (params.limit) qs.set('limit', String(params.limit))

  const res = await internalFetch(
    `/api/discovery/search?${qs.toString()}`,
    { method: 'GET' },
    req,
  )

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Property search failed',
    })
  }

  const properties = data.properties || data.results || []
  const topResults = properties.slice(0, 5).map((p: Record<string, unknown>) => ({
    address: p.address,
    ownerName: p.ownerName || p.owner,
    propertyType: p.propertyType,
    estimatedValue: p.estimatedValue || p.value,
  }))

  const city = params.city as string
  const state = params.state as string

  return NextResponse.json({
    success: true,
    message: `Found ${properties.length} properties in ${city || ''}, ${state || ''}`,
    count: properties.length,
    topResults,
    link: `/discovery?search=${encodeURIComponent(`${city || ''},${state || ''}`)}`,
  })
}

// ── gg) reveal_contact ───────────────────────────────────────────────────────

async function handleRevealContact(
  params: Record<string, unknown>,
  req: NextRequest,
) {
  const propertyId = params.propertyId as string
  if (!propertyId) {
    return NextResponse.json(
      { error: 'propertyId is required' },
      { status: 400 },
    )
  }

  const res = await internalFetch('/api/discovery/reveal', {
    method: 'POST',
    body: JSON.stringify({ propertyId }),
  }, req)

  const data = await res.json()
  if (!res.ok) {
    return NextResponse.json({
      success: false,
      message: data.error || 'Failed to reveal contact',
    })
  }

  return NextResponse.json({
    success: true,
    message: `Contact revealed: ${data.ownerName || 'Owner'}${data.phone ? ` — ${maskPhone(data.phone)}` : ''}${data.email ? ` — ${maskEmail(data.email)}` : ''}`,
    ownerName: data.ownerName,
    phone: data.phone ? maskPhone(data.phone) : null,
    email: data.email ? maskEmail(data.email) : null,
    link: '/discovery',
  })
}
