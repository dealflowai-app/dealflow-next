import type { Prisma } from '@prisma/client'
import type { DiscoveryProperty } from '@/lib/types/discovery'
import type { BatchDataProperty } from '@/lib/batchdata/types'

/** Row shape returned by Prisma for DiscoveryProperty */
export type DiscoveryPropertyRow = {
  id: string
  userId: string | null
  rentcastId: string | null
  addressLine1: string
  city: string
  state: string
  zipCode: string | null
  county: string | null
  latitude: number | null
  longitude: number | null
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSize: number | null
  yearBuilt: number | null
  assessedValue: number | null
  taxAmount: number | null
  lastSaleDate: Date | null
  lastSalePrice: number | null
  ownerName: string | null
  ownerOccupied: boolean | null
  daysOnMarket: number | null
  listingStatus: string | null
  listPrice: number | null
  features: Prisma.JsonValue
  rawResponse: Prisma.JsonValue
  searchCity: string | null
  searchZip: string | null
  cachedAt: Date
  expiresAt: Date
}

/** Convert a Prisma DiscoveryProperty row to the client-facing type. */
export function toClientProperty(row: DiscoveryPropertyRow): DiscoveryProperty {
  const raw = row.rawResponse as Record<string, unknown> | null
  const bd = raw?.batchdata as BatchDataProperty | undefined
  const quickLists = bd?.quickLists

  // Corporate owner detection: use quickLists if available, else fall back to name heuristic
  const isCorporateOwner = quickLists?.corporateOwned
    ?? (() => {
      const ownerLower = (row.ownerName ?? '').toLowerCase()
      return ['llc', 'corp', 'inc', 'trust', 'holdings', 'lp', 'ltd'].some(kw => ownerLower.includes(kw))
    })()

  // Listing data: prefer BatchData raw, fall back to legacy cached shape
  const listing = bd?.listing
  const legacyListing = raw?.listing as Record<string, unknown> | undefined

  const listPrice = listing?.price ?? (legacyListing?.listPrice as number) ?? null
  const maxListPrice = listing?.maxListPrice ?? (legacyListing?.originalListPrice as number) ?? null
  const priceReduced = maxListPrice != null && listPrice != null && listPrice < maxListPrice
  const priceReductionPercent = priceReduced && maxListPrice
    ? Math.round(((maxListPrice - listPrice) / maxListPrice) * 100)
    : null

  // Mailing address from BatchData owner
  const mailingAddr = bd?.owner?.mailingAddress
  const mailingAddressStr = mailingAddr?.street
    ? `${mailingAddr.street}, ${mailingAddr.city ?? ''}, ${mailingAddr.state ?? ''} ${mailingAddr.zip ?? ''}`.trim()
    : null

  return {
    id: row.id,
    userId: row.userId,
    rentcastId: row.rentcastId,
    addressLine1: row.addressLine1,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    county: row.county ?? bd?.address?.county ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    propertyType: row.propertyType,
    bedrooms: row.bedrooms ?? bd?.listing?.bedroomCount ?? null,
    bathrooms: row.bathrooms ?? bd?.listing?.bathroomCount ?? null,
    sqft: row.sqft ?? bd?.listing?.totalBuildingAreaSquareFeet ?? null,
    lotSize: row.lotSize ?? bd?.listing?.lotSizeSquareFeet ?? null,
    yearBuilt: row.yearBuilt ?? bd?.listing?.yearBuilt ?? null,
    assessedValue: row.assessedValue,
    taxAmount: row.taxAmount,
    lastSaleDate: row.lastSaleDate?.toISOString() ?? null,
    lastSalePrice: row.lastSalePrice,
    ownerName: row.ownerName,
    ownerOccupied: row.ownerOccupied,
    phone: null,
    email: null,
    mailingAddress: mailingAddressStr,
    features: row.features as Record<string, unknown> | null,
    rawResponse: raw,
    searchCity: row.searchCity,
    searchZip: row.searchZip,
    cachedAt: row.cachedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),

    // Distress flags from quickLists
    isPreForeclosure: quickLists?.preforeclosure ?? false,
    isTaxDelinquent: quickLists?.taxDefault ?? false,
    equityPercent: bd?.valuation?.equityPercent ? Math.round(bd.valuation.equityPercent) : null,
    isCorporateOwner,

    // Additional quickList flags for UI
    isCashBuyer: quickLists?.cashBuyer ?? false,
    isFreeAndClear: quickLists?.freeAndClear ?? false,
    isVacant: quickLists?.vacant ?? false,
    isTrustOwned: quickLists?.trustOwned ?? false,
    isAbsenteeOwner: quickLists?.absenteeOwner ?? false,
    isHighEquity: quickLists?.highEquity ?? false,
    salePropensity: bd?.intel?.salePropensityCategory ?? null,

    // Listing data
    listingStatus: row.listingStatus ?? listing?.status ?? (legacyListing?.status as string) ?? null,
    daysOnMarket: row.daysOnMarket,
    listPrice,
    priceReduced,
    priceReductionPercent,
  }
}
