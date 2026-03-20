import type { DiscoveryProperty } from '@/lib/types/discovery'

const CSV_COLUMNS: { key: string; label: string; format?: (p: DiscoveryProperty) => string }[] = [
  { key: 'addressLine1', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zipCode', label: 'Zip' },
  { key: 'county', label: 'County' },
  { key: 'propertyType', label: 'Property Type' },
  { key: 'bedrooms', label: 'Beds' },
  { key: 'bathrooms', label: 'Baths' },
  { key: 'sqft', label: 'Sq Ft' },
  { key: 'lotSize', label: 'Lot Size' },
  { key: 'yearBuilt', label: 'Year Built' },
  { key: 'assessedValue', label: 'Assessed Value' },
  { key: 'lastSalePrice', label: 'Last Sale Price' },
  { key: 'lastSaleDate', label: 'Last Sale Date' },
  { key: 'ownerName', label: 'Owner Name' },
  { key: 'ownerOccupied', label: 'Owner Occupied', format: (p) => p.ownerOccupied == null ? '' : p.ownerOccupied ? 'Yes' : 'No' },
  { key: 'listingStatus', label: 'Listing Status' },
  { key: 'listPrice', label: 'List Price' },
  { key: 'daysOnMarket', label: 'Days on Market' },
]

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

export function propertiesToCSV(properties: DiscoveryProperty[]): string {
  const header = CSV_COLUMNS.map((c) => escapeCSV(c.label)).join(',')
  const rows = properties.map((p) =>
    CSV_COLUMNS.map((col) => {
      if (col.format) return escapeCSV(col.format(p))
      const val = (p as unknown as Record<string, unknown>)[col.key]
      if (val == null) return ''
      return escapeCSV(String(val))
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
