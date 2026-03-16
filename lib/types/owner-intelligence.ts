import type { DiscoveryProperty } from './discovery'

export interface OwnerProfile {
  /** Lowercased, suffix-stripped key used for grouping */
  normalizedName: string
  /** Best display name from the raw data (original casing) */
  displayName: string
  /** All properties attributed to this owner */
  properties: DiscoveryProperty[]
  propertyCount: number
  totalValue: number
  avgValue: number
  /** Unique cities this owner holds property in */
  cities: string[]
  /** Unique property types in portfolio */
  propertyTypes: string[]
  /** Heuristic — NOT confirmed. True if entity name or multi-property owner + absentee */
  likelyCashBuyer: boolean
  /** 0-100 heuristic score based on portfolio signals */
  investorScore: number
  /** Most recent purchase across portfolio */
  lastPurchaseDate: string | null
  /** Earliest purchase across portfolio */
  oldestPurchaseDate: string | null
}

export interface OwnerSearchResult {
  owners: OwnerProfile[]
  total: number
}
