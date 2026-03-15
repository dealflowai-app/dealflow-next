'use client'

async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || data.error || `Request failed (${res.status})`)
  return data
}

export async function createBuyer(body: Record<string, unknown>) {
  return apiCall('/api/crm/buyers', { method: 'POST', body: JSON.stringify(body) })
}

export async function updateBuyer(id: string, body: Record<string, unknown>) {
  return apiCall(`/api/crm/buyers/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function archiveBuyer(id: string) {
  return apiCall(`/api/crm/buyers/${id}`, { method: 'DELETE' })
}

export async function unarchiveBuyer(id: string) {
  return apiCall(`/api/crm/buyers/${id}`, { method: 'PATCH', body: JSON.stringify({ isOptedOut: false, status: 'ACTIVE' }) })
}

export async function importBuyers(buyers: Record<string, unknown>[]) {
  return apiCall('/api/crm/buyers/import', { method: 'POST', body: JSON.stringify({ buyers }) })
}

export async function bulkAction(action: string, buyerIds: string[]) {
  return apiCall('/api/crm/buyers/bulk', { method: 'POST', body: JSON.stringify({ action, buyerIds }) })
}

export async function rescoreBuyer(id: string) {
  return apiCall(`/api/crm/buyers/${id}/score`, { method: 'POST' })
}

export async function rescoreAll() {
  return apiCall('/api/crm/buyers/rescore', { method: 'POST' })
}

export async function runAutoTags() {
  return apiCall('/api/crm/buyers/auto-tag', { method: 'POST' })
}

export async function assignTag(action: 'add' | 'remove', tagId: string, buyerIds: string[]) {
  return apiCall('/api/crm/tags/assign', {
    method: 'POST',
    body: JSON.stringify({ action, tagId, buyerIds }),
  })
}

export async function checkDuplicates(confidence?: string) {
  const params = new URLSearchParams()
  if (confidence) params.set('confidence', confidence)
  return apiCall(`/api/crm/buyers/duplicates?${params.toString()}`)
}

export async function mergeBuyers(primaryBuyerId: string, secondaryBuyerIds: string[]) {
  return apiCall('/api/crm/buyers/merge', {
    method: 'POST',
    body: JSON.stringify({ primaryBuyerId, secondaryBuyerIds }),
  })
}

export async function createTag(body: { name: string; label: string; color: string; description?: string }) {
  return apiCall('/api/crm/tags', { method: 'POST', body: JSON.stringify(body) })
}
