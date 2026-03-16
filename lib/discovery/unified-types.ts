// ─── Unified Discovery Types ─────────────────────────────────────────────────
// Abstraction layer over ATTOM and RentCast data sources.
// Every response carries a `dataSource` field so the UI can show
// "verified" vs "estimated" badges accordingly.

export type DataSource = 'attom' | 'rentcast'

// ── UnifiedProperty (search results) ─────────────────────────────────────────

export interface UnifiedProperty {
  /** Internal ID — attomId (string) or discovery_properties.id */
  id: string
  dataSource: DataSource

  // Address
  addressLine1: string
  city: string
  state: string
  zipCode: string | null
  county: string | null
  latitude: number | null
  longitude: number | null

  // Property characteristics
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSize: number | null
  yearBuilt: number | null

  // Financial
  assessedValue: number | null
  taxAmount: number | null
  lastSaleDate: string | null
  lastSalePrice: number | null

  // Owner
  ownerName: string | null
  ownerOccupied: boolean | null

  // ATTOM-only fields (null when source is RentCast)
  absenteeOwner: boolean | null
  corporateOwner: boolean | null
  propIndicator: number | null   // 10=SFR, 11=Condo, 20=Commercial
}

// ── UnifiedPropertyDetail ────────────────────────────────────────────────────

export interface UnifiedPropertyDetail extends UnifiedProperty {
  // Assessment & tax
  assessment: {
    assessedTotal: number | null
    assessedLand: number | null
    assessedImprovement: number | null
    marketValue: number | null
    taxYear: number | null
    taxAmount: number | null
  } | null

  // Owner details
  owner: {
    name: string | null
    name2: string | null
    corporateIndicator: boolean
    absenteeOwner: boolean
    mailingAddress: string | null
  } | null

  // Last sale
  lastSale: {
    date: string | null
    price: number | null
    pricePerSqft: number | null
    buyerName: string | null
    sellerName: string | null
  } | null

  // Building details
  building: {
    totalSqft: number | null
    livingSqft: number | null
    stories: number | null
    condition: string | null
    garageType: string | null
    garageSpaces: number | null
    basementSqft: number | null
    basementType: string | null
    fireplaceCount: number | null
    yearBuiltEffective: number | null
  } | null

  // Mortgage (ATTOM-only)
  mortgage: {
    totalLienAmount: number | null
    liens: Array<{
      position: number
      amount: number | null
      lenderName: string | null
      interestRate: number | null
      interestRateType: string | null
      term: number | null
      dueDate: string | null
    }>
  } | null

  // Raw features from RentCast (null for ATTOM)
  features: Record<string, unknown> | null
}

// ── UnifiedBuyer (cash buyer search results) ─────────────────────────────────

export interface UnifiedBuyer {
  dataSource: DataSource

  buyerName: string
  buyerFirstName: string | null
  buyerLastName: string | null
  corporateIndicator: boolean

  /** Number of confirmed or inferred cash purchases */
  cashPurchaseCount: number
  totalCashVolume: number
  avgPurchasePrice: number | null
  lastPurchaseDate: string | null
  lastPurchaseAmount: number | null
  lastPurchaseAddress: string | null

  propertyTypes: string[]
  markets: string[]

  /** ATTOM = real transaction data, RentCast = heuristic */
  confidence: 'verified' | 'inferred'
}

// ── UnifiedOwnerProfile ──────────────────────────────────────────────────────

export interface UnifiedOwnerProfile {
  dataSource: DataSource

  ownerName: string
  ownerName2: string | null
  corporateIndicator: boolean
  absenteeOwner: boolean
  mailingAddress: string | null

  ownershipLength: {
    ownedSince: string | null
    yearsOwned: number | null
  }

  portfolio: {
    propertyCount: number
    totalValue: number
    avgValue: number
    cities: string[]
    propertyTypes: string[]
  }

  investorScore: number
  likelyCashBuyer: boolean
}

// ── EquityData ───────────────────────────────────────────────────────────────

export interface EquityData {
  dataSource: DataSource
  source: 'attom' | 'estimated'
  confidence: 'high' | 'low'

  estimatedValue: number | null
  mortgageBalance: number | null
  equity: number | null
  equityPercent: number | null
  ltv: number | null

  /** Breakdown only available from ATTOM */
  avm: {
    low: number | null
    mid: number | null
    high: number | null
    valuationDate: string | null
  } | null
}

// ── DistressSignals ──────────────────────────────────────────────────────────

export interface DistressSignals {
  dataSource: DataSource

  /** Whether real distress data is available (true = ATTOM) */
  available: boolean
  /** If false, UI should show "Upgrade for distress data" */
  upgradeRequired: boolean

  foreclosure: {
    active: boolean
    status: string | null       // NOD, LIS_PENDENS, AUCTION, REO
    filingDate: string | null
    defaultAmount: number | null
    auctionDate: string | null
  } | null

  taxDelinquent: {
    isDelinquent: boolean
    delinquentAmount: number | null
    delinquentYears: number | null
    taxLienAmount: number | null
  } | null

  /** Probate data — not yet available from either provider */
  probate: null
}

// ── Search params (provider-agnostic) ────────────────────────────────────────

export interface UnifiedSearchParams {
  city?: string
  state?: string
  zipCode?: string
  propertyType?: string
  minBeds?: number
  maxBeds?: number
  minBaths?: number
  maxBaths?: number
  minSqft?: number
  maxSqft?: number
  page?: number
  pageSize?: number
}

export interface UnifiedCashBuyerParams {
  city?: string
  state?: string
  zipCode?: string
  minPurchases?: number
  minPrice?: number
  maxPrice?: number
  propertyType?: string
  page?: number
  pageSize?: number
}
