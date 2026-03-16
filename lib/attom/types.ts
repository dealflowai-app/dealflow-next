// ─── ATTOM Data API Response Types ──────────────────────────────────────────
// Based on ATTOM's REST API v4 response structures.
// See: https://api.developer.attomdata.com/docs

// ── Shared / Common ─────────────────────────────────────────────────────────

export interface AttomAddress {
  line1: string
  line2: string | null
  locality: string       // city
  countrySubd: string    // state (2-letter)
  postal1: string        // zip
  postal2: string | null // zip+4
  oneLine: string        // full formatted address
}

export interface AttomLocation {
  latitude: number
  longitude: number
  accuracy: string | null
  geoid: string | null
  geoIdV4: {
    CS: string | null    // census tract
    CO: string | null    // county FIPS
    PL: string | null    // place FIPS
    ZI: string | null    // zip code
    ST: string | null    // state FIPS
  } | null
}

export interface AttomLot {
  lotNum: string | null
  lotSize1: number | null   // sqft
  lotSize2: number | null   // acres
  poolType: string | null
}

export interface AttomBuilding {
  size: {
    bldgSize: number | null         // total sqft
    grossSize: number | null
    grossSizeAdjusted: number | null
    livingSize: number | null       // living area sqft
    universalSize: number | null
  }
  rooms: {
    bathsFull: number | null
    bathsHalf: number | null
    bathsTotal: number | null
    beds: number | null
    roomsTotal: number | null
  }
  interior: {
    bsmtSize: number | null
    bsmtType: string | null
    fplcCount: number | null    // fireplace count
    fplcType: string | null
  }
  construction: {
    condition: string | null
    constructionType: string | null
    foundationType: string | null
    frameType: string | null
    roofCover: string | null
    roofShape: string | null
    wallType: string | null
  }
  parking: {
    garageType: string | null
    prkgSize: number | null
    prkgSpaces: number | null
    prkgType: string | null
  }
  summary: {
    archStyle: string | null
    levels: number | null
    storyDesc: string | null
    unitsCount: number | null
    yearBuilt: number | null
    yearBuiltEffective: number | null
    view: string | null
    viewCode: string | null
  }
}

// ── AttomProperty (basic profile) ───────────────────────────────────────────

export interface AttomProperty {
  identifier: {
    Id: number               // ATTOM property ID
    fips: string | null
    apn: string | null       // assessor parcel number
    attomId: number
  }
  lot: AttomLot
  address: AttomAddress
  location: AttomLocation
  summary: {
    absenteeInd: string | null   // "Y" or "N" — owner doesn't live there
    propClass: string | null     // "Single Family Residence", etc.
    propSubType: string | null
    propType: string | null
    propertyType: string | null  // "SFR", "CONDO", etc.
    yearBuilt: number | null
    propLandUse: string | null
    propIndicator: number | null // 10=SFR, 11=Condo, 20=Commercial, etc.
  }
  building: AttomBuilding
  vintage: {
    lastModified: string | null
    pubDate: string | null
  }
}

// ── AttomPropertyDetail (expanded profile) ──────────────────────────────────

export interface AttomPropertyDetail extends AttomProperty {
  assessment: {
    assessed: {
      assdImprValue: number | null
      assdLandValue: number | null
      assdTtlValue: number | null
    }
    market: {
      mktImprValue: number | null
      mktLandValue: number | null
      mktTtlValue: number | null
    }
    tax: {
      taxAmt: number | null
      taxPerSizeUnit: number | null
      taxYear: number | null
    }
    improvementPercent: number | null
  }
  owner: {
    owner1: {
      firstNameAndMi: string | null
      lastName: string | null
      fullName: string | null
    }
    owner2: {
      firstNameAndMi: string | null
      lastName: string | null
      fullName: string | null
    } | null
    absenteeOwnerStatus: string | null // "Absentee Owner", "Owner Occupied"
    corporateIndicator: string | null  // "Y" if corp/LLC owned
    mailingAddressOneLine: string | null
  }
  sale: {
    saleSearchDate: string | null
    saleTransDate: string | null
    transactionIdent: string | null
    amount: {
      saleAmt: number | null
      saleCode: string | null
      saleRecDate: string | null
      saleDisclosureType: number | null
    }
    calculation: {
      pricePerBed: number | null
      pricePerSizeUnit: number | null
    }
  } | null
}

// ── AttomTransaction (sale history) ─────────────────────────────────────────

export interface AttomTransaction {
  identifier: {
    attomId: number
    transactionIdent: string | null
  }
  amount: {
    saleAmt: number | null
    saleCode: string | null           // "Full Amount", "Partial", etc.
    saleRecDate: string | null        // ISO date
    saleDisclosureType: number | null
  }
  calculation: {
    pricePerBed: number | null
    pricePerSizeUnit: number | null
  }
  date: {
    saleSearchDate: string | null
    saleTransDate: string | null      // closing date
    recordingDate: string | null
  }
  buyer: {
    buyerName: string | null
    buyerFirstName: string | null
    buyerLastName: string | null
    buyer2Name: string | null
    corporateIndicator: string | null
  }
  seller: {
    sellerName: string | null
    sellerFirstName: string | null
    sellerLastName: string | null
  }
  mortgage: {
    // If no mortgage on the transaction → cash purchase
    amount: number | null
    lenderName: string | null
    interestRateType: string | null  // "Fixed", "Adjustable"
    term: number | null              // months
    dueDate: string | null
  } | null
  propertyType: string | null
  distressedSaleFlag: string | null  // "Y" if REO/foreclosure sale
  cashOrMortgage: 'Cash' | 'Mortgage' | 'Unknown'
}

// ── AttomOwner ──────────────────────────────────────────────────────────────

export interface AttomOwner {
  attomId: number
  owner1: {
    firstName: string | null
    lastName: string | null
    fullName: string | null
  }
  owner2: {
    firstName: string | null
    lastName: string | null
    fullName: string | null
  } | null
  corporateIndicator: boolean
  absenteeOwner: boolean
  mailingAddress: AttomAddress | null
  ownershipLength: {
    ownedSince: string | null        // ISO date
    yearsOwned: number | null
  }
  portfolioSummary: {
    totalProperties: number | null
    totalValue: number | null
    states: string[]
    propertyTypes: string[]
  } | null
}

// ── AttomCashBuyer ──────────────────────────────────────────────────────────

export interface AttomCashBuyer {
  buyerName: string
  buyerFirstName: string | null
  buyerLastName: string | null
  corporateIndicator: boolean
  cashPurchaseCount: number
  totalCashVolume: number        // sum of all cash purchase amounts
  lastPurchaseDate: string | null
  lastPurchaseAmount: number | null
  lastPurchaseAddress: string | null
  avgPurchasePrice: number | null
  propertyTypes: string[]
  markets: string[]              // city/state combinations they buy in
  transactions: AttomTransaction[]
}

// ── AttomMortgage ───────────────────────────────────────────────────────────

export interface AttomMortgage {
  attomId: number
  lien: {
    lienPosition: number | null       // 1=first, 2=second, etc.
    lienType: string | null           // "Conventional", "FHA", "VA", etc.
    amount: number | null
    interestRate: number | null
    interestRateType: string | null   // "Fixed", "Adjustable"
    term: number | null               // months
    dueDate: string | null
    recordingDate: string | null
    lenderName: string | null
    lenderType: string | null
  }
  borrower: {
    name: string | null
    vestingType: string | null
  }
}

// ── AttomForeclosure ────────────────────────────────────────────────────────

export interface AttomForeclosure {
  attomId: number
  status: 'NOD' | 'LIS_PENDENS' | 'AUCTION' | 'REO' | 'UNKNOWN'
  filingDate: string | null
  recordingDate: string | null
  effectiveDate: string | null
  amount: {
    defaultAmount: number | null
    unpaidBalance: number | null
    judgementAmount: number | null
    startingBid: number | null
  }
  auction: {
    auctionDate: string | null
    auctionTime: string | null
    auctionLocation: string | null
    auctionAddress: string | null
    minBid: number | null
  } | null
  trustee: {
    name: string | null
    phone: string | null
    address: string | null
    saleNumber: string | null
  } | null
  lender: {
    name: string | null
    phone: string | null
  } | null
  borrower: {
    name: string | null
  }
  document: {
    type: string | null           // "NOD", "NTS", "LIS_PENDENS"
    number: string | null
    bookPage: string | null
  }
}

// ── AttomTaxStatus ──────────────────────────────────────────────────────────

export interface AttomTaxStatus {
  attomId: number
  assessment: {
    assessedValue: number | null
    marketValue: number | null
    landValue: number | null
    improvementValue: number | null
    assessmentYear: number | null
  }
  tax: {
    taxYear: number | null
    taxAmount: number | null
    taxRate: number | null         // effective tax rate
    taxExemption: string | null
  }
  delinquency: {
    isDelinquent: boolean
    delinquentAmount: number | null
    delinquentYears: number | null
    taxLienAmount: number | null
    taxLienDate: string | null
  }
  specialAssessments: {
    amount: number | null
    description: string | null
  }[]
}

// ── AttomValuation (AVM) ────────────────────────────────────────────────────

export interface AttomValuation {
  attomId: number
  value: {
    low: number | null
    mid: number | null            // best estimate
    high: number | null
    valuePerSqft: number | null
  }
  confidence: {
    score: number | null          // 0-100
    fsd: number | null            // forecast standard deviation
  }
  assessedValue: number | null
  calculatedEquity: {
    estimatedValue: number | null
    totalLiens: number | null
    estimatedEquity: number | null
    equityPercent: number | null   // 0-100
    ltv: number | null            // loan-to-value ratio
  } | null
  lastSalePrice: number | null
  lastSaleDate: string | null
  valuationDate: string | null
}

// ── AttomComp (comparable sale) ─────────────────────────────────────────────

export interface AttomComp {
  attomId: number
  address: AttomAddress
  location: AttomLocation
  property: {
    propertyType: string | null
    beds: number | null
    baths: number | null
    sqft: number | null
    yearBuilt: number | null
    lotSize: number | null
  }
  sale: {
    saleDate: string | null
    salePrice: number | null
    pricePerSqft: number | null
    saleType: string | null      // "Arm's Length", "REO", etc.
    cashOrMortgage: string | null
    daysOnMarket: number | null
  }
  distance: number | null         // miles from subject property
  similarity: {
    score: number | null          // 0-100 how comparable
    adjustedPrice: number | null  // price adjusted for differences
  }
}

// ── Search params ───────────────────────────────────────────────────────────

export interface AttomPropertySearchParams {
  city?: string
  state?: string
  zipCode?: string
  minBeds?: number
  maxBeds?: number
  minBaths?: number
  maxBaths?: number
  minSqft?: number
  maxSqft?: number
  propertyType?: string
  page?: number
  pageSize?: number
}

export interface AttomCashBuyerSearchParams {
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

export interface AttomCompSearchParams {
  radius?: number      // miles (default 1)
  maxComps?: number    // max results (default 10)
  months?: number      // lookback window (default 6)
}

// ── Errors ──────────────────────────────────────────────────────────────────

export class AttomNotConfiguredError extends Error {
  constructor() {
    super('ATTOM Data API not configured — set ATTOM_API_KEY environment variable')
    this.name = 'AttomNotConfiguredError'
  }
}

export class AttomApiError extends Error {
  status: number
  code: string | null
  endpoint: string

  constructor(message: string, status: number, endpoint: string, code?: string) {
    super(message)
    this.name = 'AttomApiError'
    this.status = status
    this.code = code ?? null
    this.endpoint = endpoint
  }
}
