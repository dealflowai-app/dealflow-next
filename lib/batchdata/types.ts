// ─── BatchData API Types ────────────────────────────────────────────────────
// Verified against actual API responses on 2026-03-20.
// DO NOT add speculative fields. Every field here is confirmed.

// ── Request Types ───────────────────────────────────────────────────────────

export interface BatchDataSearchRequest {
  searchCriteria: string      // e.g. "Phoenix, AZ 85016" — this is a STRING, not an object
  propertyType?: string       // "SFR", "Single Family Residential", etc.
  limit?: number              // Number of results to return (IMPORTANT for cost control)
  // Additional filter params may exist — test individually before adding
}

export interface BatchDataLookupRequest {
  requests: Array<{
    address: {
      street: string
      city: string
      state: string
      zip: string
    }
  }>
}

export interface BatchDataSkipTraceRequest {
  requests: Array<{
    address: {
      street: string
      city: string
      state: string
      zip: string
    }
  }>
}

// ── Property Response (from search and lookup) ──────────────────────────────

export interface BatchDataProperty {
  _id: string                 // Unique property ID (hash)

  address: {
    addressValidity?: string  // "Valid"
    houseNumber?: string
    street: string            // Full street: "4529 E Calle Redonda"
    city: string
    county?: string
    state: string
    zip: string
    zipPlus4?: string
    latitude?: number
    longitude?: number
    countyFipsCode?: string
    hash?: string
  }

  // ── Owner ────────────────────────────────────────────────────────────────
  owner: {
    fullName: string          // "Mark W Dofflemyer" or "312 W SHUBERT FTX RESIDENCE TRUST"
    mailingAddress?: {
      addressValidity?: string
      street?: string
      city?: string
      county?: string
      state?: string
      zip?: string
      zipPlus4?: string
      hash?: string
    }
    names?: Array<{
      first?: string
      middle?: string
      last?: string
      full?: string
    }>
  }

  // ── Quick Lists (boolean flags — goldmine for filters) ───────────────────
  quickLists: {
    absenteeOwner: boolean
    absenteeOwnerInState: boolean
    absenteeOwnerOutOfState: boolean
    activeListing: boolean
    activeAuction: boolean
    cashBuyer: boolean
    corporateOwned: boolean
    expiredListing: boolean
    failedListing: boolean
    freeAndClear: boolean
    fixAndFlip: boolean
    forSaleByOwner: boolean
    highEquity: boolean
    inherited: boolean
    involuntaryLien: boolean
    listedBelowMarketPrice: boolean
    lowEquity: boolean
    mailingAddressVacant: boolean
    onMarket: boolean
    outOfStateOwner: boolean
    ownerOccupied: boolean
    pendingListing: boolean
    preforeclosure: boolean
    recentlySold: boolean
    samePropertyAndMailingAddress: boolean
    seniorOwner: boolean
    taxDefault: boolean
    tiredLandlord: boolean
    trustOwned: boolean
    unknownEquity: boolean
    vacant: boolean
    vacantLot: boolean
    hasHoa: boolean
    hasHoaFees: boolean
    canceledListing: boolean
    noticeOfSale: boolean
    noticeOfDefault: boolean
    noticeOfLisPendens: boolean
  }

  // ── Valuation ────────────────────────────────────────────────────────────
  valuation?: {
    estimatedValue: number        // AVM: 396974
    priceRangeMin: number         // 345367
    priceRangeMax: number         // 448580
    standardDeviation: number     // 13
    confidenceScore: number       // 87 (0-100)
    asOfDate: string              // ISO date
    equityCurrentEstimatedBalance: number  // 145388
    ltv: number                   // 63.4
    equityPercent: number         // 36.6
  }

  // ── Listing ──────────────────────────────────────────────────────────────
  listing?: {
    status?: string               // "Off Market", "Active", "Pending"
    statusCategory?: string       // "Failed", "Active", etc.
    price?: number                // Current/last list price
    rental?: boolean
    originalListingDate?: string
    maxListPrice?: number
    maxListPriceDate?: string
    minListPrice?: number
    minListPriceDate?: string
    soldPrice?: number
    soldDate?: string
    failedListingDate?: string
    bedroomCount?: number
    bathroomCount?: number
    totalBuildingAreaSquareFeet?: number
    lotSizeSquareFeet?: number
    propertyType?: string         // "Single Family", "Apartment", etc.
    yearBuilt?: number
    exteriorConstruction?: string
    roofTypes?: string[]
    coolingTypes?: string[]
    heatingTypes?: string[]
    newConstruction?: boolean
    parkingSpaceCount?: number
    fullBathroomCount?: number
    halfBathroomCount?: number
    listingUrl?: string           // Zillow URL
    livingArea?: number
    taxes?: Array<{ amount?: number; year: number }>
    salePriceIsEstimated?: boolean
    statusUpdatedAt?: string
  }

  // ── Foreclosure ──────────────────────────────────────────────────────────
  foreclosure?: {
    statusCode?: string           // "H"
    status?: string               // "Notice of Lis Pendens"
    recordingDate?: string
    filingDate?: string
    caseNumber?: string
    documentNumber?: string
    bookNumber?: string
    pageNumber?: string
    documentTypeCode?: string
    documentType?: string
    defaultDate?: string
    borrowerName?: string
    trusteeName?: string
  }

  // ── Open Liens ───────────────────────────────────────────────────────────
  openLien?: {
    allLoanTypes?: string[]
    totalOpenLienCount: number
    totalOpenLienBalance?: number
    firstLoanRecordingDate?: string
    lastLoanRecordingDate?: string
    mortgages?: Array<{
      recordingDate?: string
      loanTypeCode?: string
      loanType?: string
      financingTypeCode?: string
      financingType?: string
      dueDate?: string
      loanAmount?: number
      lenderName?: string
      loanTermMonths?: number
      constructionLoan?: boolean
      cashPurchase?: boolean
      standaloneRefi?: string
      equityCreditLine?: boolean
      currentEstimatedBalance?: number
      purposeOfLoan?: string
      currentEstimatedInterestRate?: number
      assignedLenderName?: string
      ltv?: number
      estimatedPaymentAmount?: number
    }>
  }

  // ── Mortgage History ─────────────────────────────────────────────────────
  mortgageHistory?: Array<{
    borrowers?: string[]
    saleDate?: string
    recordingDate?: string
    dueDate?: string
    lenderName?: string
    loanTypeCode?: string
    loanType?: string
    loanAmount?: number
    loanTermMonths?: number
    interestRateTypeCode?: string
    interestRateType?: string
    interestRate?: number
    transactionType?: string
    transactionTypeCode?: string
    documentDate?: string
  }>

  // ── Deed History ─────────────────────────────────────────────────────────
  deedHistory?: Array<{
    buyers?: string[]
    sellers?: string[]
    recordingDate?: string
    saleDate?: string
    documentNumber?: string
    documentDate?: string
    documentTypeCode?: string
    documentType?: string
    salePrice?: number
    resale?: boolean
    newConstruction?: boolean
    interFamily?: boolean
    transactionId?: string
    transactionType?: string
    transactionTypeCode?: string
    mailingAddress?: {
      street?: string
      city?: string
      state?: string
      zip?: string
    }
  }>

  // ── Sale ─────────────────────────────────────────────────────────────────
  sale?: {
    lastSale?: {
      mortgages?: Array<{
        documentNumber?: string
        recordingDate?: string
        loanAmount?: number
        loanTypeCode?: string
        loanType?: string
        financingTypeCode?: string
        financingType?: string
        interestRate?: number
        dueDate?: string | null
        lenderName?: string
        loanTerm?: string
      }>
    }
    priorSale?: {
      mortgages?: Array<Record<string, unknown>>
    }
  }

  // ── Property Owner Profile ───────────────────────────────────────────────
  propertyOwnerProfile?: {
    averageAssessedValue?: number
    averagePurchasePrice?: number
    averageYearBuilt?: number
    propertiesCount: number
    propertiesTotalEquity?: number
    propertiesTotalEstimatedValue?: number
    mortgagesTotalBalance?: number
    mortgagesCount?: number
    mortgagesAverageBalance?: number
    totalPurchasePrice?: number
  }

  // ── Intel ────────────────────────────────────────────────────────────────
  intel?: {
    salePropensity?: number       // 60.4, 98.2
    salePropensityStatus?: string // "Available"
    salePropensityCategory?: string // "Medium", "High"
  }

  // ── Demographics ─────────────────────────────────────────────────────────
  demographics?: {
    age?: number
    householdSize?: number
    income?: number
    netWorth?: number
    discretionaryIncome?: number
    homeownerRenterCode?: string
    homeownerRenter?: string
    genderCode?: string
    gender?: string
    millionaire?: boolean
    religious?: boolean
    individualEducation?: string
    individualOccupation?: string
  }

  // ── Involuntary Liens ────────────────────────────────────────────────────
  involuntaryLien?: {
    liens?: Array<{
      parties?: Array<{ fullName?: string; roleType?: string }>
      bookNumber?: string
      documentNumber?: string
      documentType?: string
      documentTypeCode?: string
      filingDate?: string
      lienType?: string
      lienTypeCode?: string
      pageNumber?: string
      recordingDate?: string
    }>
  }

  // ── IDs ──────────────────────────────────────────────────────────────────
  ids?: {
    apn?: string  // Assessor Parcel Number
  }

  // ── Permit ───────────────────────────────────────────────────────────────
  permit?: Record<string, unknown>
}

// ── Skip Trace Response ─────────────────────────────────────────────────────
// TODO: Verify against actual skip-trace API response (not yet tested)
export interface BatchDataSkipTraceResult {
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
  owner?: {
    name?: string
    resolvedFromEntity?: boolean
  }
  phones?: Array<{
    number?: string
    type?: 'mobile' | 'landline' | 'voip'
    score?: number
    doNotCall?: boolean
    litigator?: boolean
    verified?: boolean
    lastVerified?: string
  }>
  emails?: Array<{
    address?: string
    type?: string
    score?: number
    verified?: boolean
  }>
  mailingAddress?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
}

// ── Owner Profile Response ──────────────────────────────────────────────────
// Note: propertyOwnerProfile is included IN the search/lookup response,
// so a separate endpoint may not be needed.
export interface BatchDataOwnerProfile {
  averageAssessedValue?: number
  averagePurchasePrice?: number
  averageYearBuilt?: number
  propertiesCount: number
  propertiesTotalEquity?: number
  propertiesTotalEstimatedValue?: number
  mortgagesTotalBalance?: number
  mortgagesCount?: number
  mortgagesAverageBalance?: number
  totalPurchasePrice?: number
}

// ── API Response Wrapper ────────────────────────────────────────────────────

export interface BatchDataResponse<T> {
  status: {
    code: number
    text?: string
    message?: string
  }
  results: {
    properties: T[]       // For search: results.properties[]
    meta?: {
      performance?: {
        totalRequestTime?: number
        startTime?: string
        endTime?: string
      }
      results?: {
        resultCount?: number
        resultsFound?: number
      }
      apiVersion?: string
      requestId?: string
    }
  }
}
