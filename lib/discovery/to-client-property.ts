import type { Prisma } from '@prisma/client'
import type { DiscoveryProperty } from '@/lib/types/discovery'

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
  features: Prisma.JsonValue
  rawResponse: Prisma.JsonValue
  searchCity: string | null
  searchZip: string | null
  cachedAt: Date
  expiresAt: Date
}

/** Convert a Prisma DiscoveryProperty row to the client-facing type. */
export function toClientProperty(row: DiscoveryPropertyRow): DiscoveryProperty {
  return {
    id: row.id,
    userId: row.userId,
    rentcastId: row.rentcastId,
    addressLine1: row.addressLine1,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    county: row.county,
    latitude: row.latitude,
    longitude: row.longitude,
    propertyType: row.propertyType,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    sqft: row.sqft,
    lotSize: row.lotSize,
    yearBuilt: row.yearBuilt,
    assessedValue: row.assessedValue,
    taxAmount: row.taxAmount,
    lastSaleDate: row.lastSaleDate?.toISOString() ?? null,
    lastSalePrice: row.lastSalePrice,
    ownerName: row.ownerName,
    ownerOccupied: row.ownerOccupied,
    phone: null,
    email: null,
    mailingAddress: null,
    features: row.features as Record<string, unknown> | null,
    rawResponse: row.rawResponse as Record<string, unknown> | null,
    searchCity: row.searchCity,
    searchZip: row.searchZip,
    cachedAt: row.cachedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }
}
