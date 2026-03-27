/** Shared helpers used by discovery page, map, and detail components */

/** Map RentCast property types to the display labels used by the UI */
const RENTCAST_TYPE_TO_DISPLAY: Record<string, string> = {
  'Single Family': 'SFR',
  'Multi Family': 'Multi-Family',
  Condo: 'Condo',
  Townhouse: 'Condo',
  Land: 'Land',
  Commercial: 'Commercial',
}

export function displayType(rentcastType: string | null): string {
  if (!rentcastType) return 'SFR'
  return RENTCAST_TYPE_TO_DISPLAY[rentcastType] ?? rentcastType
}

export function pinColor(type: string): string {
  switch (type) {
    case 'SFR': return '#2563EB'
    case 'Multi-Family': return '#7C3AED'
    case 'Condo': return '#0891B2'
    case 'Land': return '#059669'
    case 'Commercial': return '#D97706'
    default: return '#6B7280'
  }
}

export function formatCurrency(value: number | null): string {
  if (value == null) return '—'
  return '$' + value.toLocaleString()
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function parseOwnerName(name: string | null): { firstName: string | null; lastName: string | null } {
  if (!name) return { firstName: null, lastName: null }
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function detectEntityType(name: string | null): string | null {
  if (!name) return null
  const upper = name.toUpperCase()
  if (/\bLLC\b|\bLLLP\b/.test(upper)) return 'llc'
  if (/\bCORP\b|\bINC\b|\bLTD\b/.test(upper)) return 'corporation'
  if (/\bTRUST\b|\bTRUSTEE\b|\bESTATE\b/.test(upper)) return 'trust'
  return 'individual'
}

export function isEntity(name: string | null): boolean {
  if (!name) return false
  return /\bLLC\b|\bCORP\b|\bINC\b|\bLTD\b|\bLP\b|\bLLLP\b|\bTRUST\b|\bTRUSTEE\b|\bESTATE\b/i.test(name)
}

export function detectOwnerType(name: string | null): { label: string; color: string } {
  if (!name) return { label: 'Unknown', color: 'text-gray-500 bg-gray-100' }
  const upper = name.toUpperCase()
  if (/\bLLC\b|\bCORP\b|\bINC\b|\bLTD\b|\bLP\b|\bLLLP\b/.test(upper))
    return { label: 'LLC / Corp', color: 'text-violet-700 bg-violet-50' }
  if (/\bTRUST\b|\bTRUSTEE\b|\bESTATE\b/.test(upper))
    return { label: 'Trust / Estate', color: 'text-sky-700 bg-sky-50' }
  if (/\bBANK\b|\bFEDERAL\b|\bNATIONAL\b|\bMORTGAGE\b|\bFANNIE\b|\bFREDDIE\b/.test(upper))
    return { label: 'Bank-Owned', color: 'text-rose-700 bg-rose-50' }
  if (/\bGOVERNMENT\b|\bCOUNTY\b|\bCITY OF\b|\bSTATE OF\b|\bHUD\b/.test(upper))
    return { label: 'Government', color: 'text-orange-700 bg-orange-50' }
  return { label: 'Individual', color: 'text-[#2563EB] bg-[rgba(37,99,235,0.08)]' }
}
