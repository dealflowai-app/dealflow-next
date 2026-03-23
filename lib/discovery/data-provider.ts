// ─── Unified Discovery Data Provider ─────────────────────────────────────────
// Uses BatchData as primary, falls back to RentCast.
// All API routes should call getDataProvider() instead of reaching
// for BatchData or RentCast directly.

import { getRentCastClient, type RentCastClient, type RentCastProperty } from '@/lib/rentcast'
import { getBatchDataClient, type BatchDataClient } from '@/lib/batchdata'
import type { BatchDataProperty } from '@/lib/batchdata/types'
import { logger } from '@/lib/logger'
import {
  estimateEquity,
  normalizeOwnerName,
  groupPropertiesByOwner,
} from './owner-intelligence'
import type { DiscoveryProperty } from '@/lib/types/discovery'
import type {
  UnifiedProperty,
  UnifiedPropertyDetail,
  UnifiedBuyer,
  UnifiedOwnerProfile,
  EquityData,
  DistressSignals,
  UnifiedSearchParams,
  UnifiedCashBuyerParams,
  DataSource,
} from './unified-types'

// ── Property type mapping ────────────────────────────────────────────────────

/** Map generic property type strings to RentCast's pipe-separated format */
const RENTCAST_TYPE_MAP: Record<string, string> = {
  SFR: 'Single Family',
  'Single Family': 'Single Family',
  'Multi-Family': 'Multi Family',
  'Multi Family': 'Multi Family',
  Condo: 'Condo/Townhouse',
  Townhouse: 'Condo/Townhouse',
  Land: 'Land',
  Commercial: 'Commercial',
}

// ─── DiscoveryDataProvider ───────────────────────────────────────────────────

export class DiscoveryDataProvider {
  private batchdata: BatchDataClient | null
  private rentcast: RentCastClient

  constructor(
    batchdata: BatchDataClient | null,
    rentcast: RentCastClient,
  ) {
    this.batchdata = batchdata
    this.rentcast = rentcast
  }

  /** Which data source is active for property data */
  get primarySource(): DataSource {
    return this.batchdata ? 'batchdata' : 'rentcast'
  }

  /** True if BatchData is configured and available */
  get hasBatchData(): boolean {
    return this.batchdata !== null
  }

  // ── 1. searchProperties ─────────────────────────────────────────────────

  async searchProperties(params: UnifiedSearchParams): Promise<UnifiedProperty[]> {
    if (this.batchdata) {
      return this.searchViaBatchData(params)
    }
    return this.searchViaRentCast(params)
  }

  private async searchViaBatchData(params: UnifiedSearchParams): Promise<UnifiedProperty[]> {
    // Build searchCriteria string from city/state/zip
    let searchCriteria: string
    if (params.zipCode) {
      searchCriteria = params.zipCode
    } else if (params.city && params.state) {
      searchCriteria = `${params.city}, ${params.state}`
    } else {
      return []
    }

    const response = await this.batchdata!.searchProperties({
      searchCriteria,
      propertyType: params.propertyType ? mapPropertyTypeForBatchData(params.propertyType) : undefined,
      limit: Math.min(params.pageSize ?? 50, 50),  // Cap at 50 to control costs (~$32 max)
    })

    const rawProperties = response.results?.properties ?? []
    logger.info(`BatchData search returned ${rawProperties.length} results for "${searchCriteria}"`, {
      sampleCities: rawProperties.slice(0, 5).map(p => `${p.address?.city}, ${p.address?.state}`),
    })

    // Filter out results from completely wrong locations (different state).
    // We only filter by state because BatchData may return neighboring cities
    // within the metro area (e.g. searching "Corona, CA" may return "Norco, CA").
    const searchState = params.state?.toUpperCase()
    const properties = rawProperties.filter(p => {
      if (!searchState) return true
      return p.address?.state?.toUpperCase() === searchState
    })

    if (properties.length < rawProperties.length) {
      logger.info(`BatchData: filtered ${rawProperties.length} → ${properties.length} results (removed ${rawProperties.length - properties.length} outside state ${searchState})`)
    }
    if (properties.length === 0 && rawProperties.length > 0) {
      logger.warn(`BatchData: ALL ${rawProperties.length} results were outside state "${searchState}" for search "${searchCriteria}"`)
    }

    return properties.map((p): UnifiedProperty => {
      const addr = p.address
      const beds = p.listing?.bedroomCount ?? null
      const baths = p.listing?.bathroomCount ?? null
      const sqft = p.listing?.totalBuildingAreaSquareFeet ?? p.listing?.livingArea ?? null
      const lotSize = p.listing?.lotSizeSquareFeet ?? null
      const yearBuilt = p.listing?.yearBuilt ?? null
      const propertyType = p.listing?.propertyType ?? null

      // Tax from listing.taxes array (most recent year)
      const mostRecentTax = p.listing?.taxes?.find(t => t.amount != null)
      const taxAmount = mostRecentTax?.amount ?? null

      // Last sale from deedHistory (first entry with a price > 0)
      const lastSale = p.deedHistory?.find(d => d.salePrice != null && d.salePrice > 0)

      return {
        id: p._id,
        dataSource: 'batchdata',
        addressLine1: addr.street,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zip ?? null,
        county: addr.county ?? null,
        latitude: addr.latitude ?? null,
        longitude: addr.longitude ?? null,
        propertyType,
        bedrooms: beds,
        bathrooms: baths,
        sqft,
        lotSize,
        yearBuilt,
        assessedValue: p.valuation?.estimatedValue ?? null,
        taxAmount,
        lastSaleDate: lastSale?.saleDate ?? null,
        lastSalePrice: lastSale?.salePrice ?? null,
        ownerName: p.owner?.fullName ?? null,
        ownerOccupied: p.quickLists?.ownerOccupied ?? null,
        absenteeOwner: p.quickLists?.absenteeOwner ?? false,
        corporateOwner: p.quickLists?.corporateOwned ?? false,
        propIndicator: null,
        // Search already returns Tier 2 data — no separate lookup needed
        enrichmentLevel: 2,
        // Listing data
        listingStatus: p.listing?.status ?? null,
        daysOnMarket: calculateDaysOnMarket(p.listing),
        listPrice: p.listing?.price ?? null,
        originalListPrice: p.listing?.maxListPrice ?? null,
        listingDate: p.listing?.originalListingDate ?? null,
        listingAgent: null,
        // Store the full BatchData object for cache
        _batchdataRaw: p,
      }
    })
  }

  private async searchViaRentCast(params: UnifiedSearchParams): Promise<UnifiedProperty[]> {
    const rcType = params.propertyType ? RENTCAST_TYPE_MAP[params.propertyType] ?? params.propertyType : undefined
    const bedsRange = buildRange(params.minBeds, params.maxBeds)
    const bathsRange = buildRange(params.minBaths, params.maxBaths)
    const sqftRange = buildRange(params.minSqft, params.maxSqft)

    const results = await this.rentcast.searchProperties({
      city: params.city,
      state: params.state,
      zipCode: params.zipCode,
      propertyType: rcType,
      bedrooms: bedsRange,
      bathrooms: bathsRange,
      squareFootage: sqftRange,
      limit: params.pageSize ?? 50,
      offset: params.page ? (params.page - 1) * (params.pageSize ?? 50) : undefined,
    })

    return results.map((p) => mapRentCastToUnified(p))
  }

  // ── 2. getPropertyDetail ────────────────────────────────────────────────

  async getPropertyDetail(address: string): Promise<UnifiedPropertyDetail> {
    return this.getDetailViaRentCast(address)
  }

  private async getDetailViaRentCast(address: string): Promise<UnifiedPropertyDetail> {
    const p = await this.rentcast.getPropertyByAddress(address)
    if (!p) {
      throw new Error(`Property not found: ${address}`)
    }

    const base = mapRentCastToUnified(p)

    return {
      ...base,

      assessment: p.assessedValue != null
        ? {
            assessedTotal: p.assessedValue,
            assessedLand: p.taxAssessment?.[0]?.land ?? null,
            assessedImprovement: p.taxAssessment?.[0]?.improvements ?? null,
            marketValue: null,
            taxYear: p.taxAssessment?.[0]?.year ?? null,
            taxAmount: null,
          }
        : null,

      owner: p.ownerName
        ? {
            name: p.ownerName,
            name2: null,
            corporateIndicator: isEntityName(p.ownerName),
            absenteeOwner: p.ownerOccupied === false,
            mailingAddress: null,
          }
        : null,

      lastSale: p.lastSaleDate || p.lastSalePrice
        ? {
            date: p.lastSaleDate,
            price: p.lastSalePrice,
            pricePerSqft: p.lastSalePrice && p.squareFootage
              ? Math.round(p.lastSalePrice / p.squareFootage)
              : null,
            buyerName: null,
            sellerName: null,
          }
        : null,

      building: null,    // RentCast doesn't provide detailed building data
      mortgage: null,    // RentCast doesn't provide mortgage data
      features: p.features ?? null,
    }
  }

  // ── 2b. enrichProperty (BatchData tiered enrichment) ────────────────

  /**
   * Progressively enrich a property with additional data tiers.
   * Tier 1: Core/Tax ($0.10) — owner, assessed value, tax
   * Tier 2: Full ($0.23) — AVM, distress, mortgage, history
   *
   * Only useful when BatchData is the primary source. Falls back to
   * getPropertyDetail for RentCast.
   */
  async enrichProperty(
    address: { street: string; city: string; state: string; zip: string },
    targetTier: 1 | 2,
  ): Promise<Partial<UnifiedPropertyDetail>> {
    if (!this.batchdata) {
      // Fall back to RentCast detail path
      const lookupKey = `${address.street}, ${address.city}, ${address.state} ${address.zip}`
      return this.getPropertyDetail(lookupKey)
    }

    const response = await this.batchdata.lookupProperty({
      requests: [{ address }],
    })

    const p = response.results?.properties?.[0]
    if (!p) return {}

    const result: Partial<UnifiedPropertyDetail> = {}

    // Lookup returns fully enriched data (same as search)
    const mailingAddr = p.owner?.mailingAddress
    const mailingStr = mailingAddr
      ? `${mailingAddr.street ?? ''}, ${mailingAddr.city ?? ''}, ${mailingAddr.state ?? ''} ${mailingAddr.zip ?? ''}`.trim()
      : null

    result.ownerName = p.owner?.fullName ?? null
    result.assessedValue = p.valuation?.estimatedValue ?? null
    result.ownerOccupied = p.quickLists?.ownerOccupied ?? null
    result.absenteeOwner = p.quickLists?.absenteeOwner ?? null
    result.corporateOwner = p.quickLists?.corporateOwned ?? null
    result.owner = p.owner ? {
      name: p.owner.fullName ?? null,
      name2: null,
      corporateIndicator: p.quickLists?.corporateOwned ?? false,
      absenteeOwner: p.quickLists?.absenteeOwner ?? false,
      mailingAddress: mailingStr,
    } : null
    result.assessment = {
      assessedTotal: p.valuation?.estimatedValue ?? null,
      assessedLand: null,
      assessedImprovement: null,
      marketValue: p.valuation?.estimatedValue ?? null,
      taxYear: null,
      taxAmount: p.listing?.taxes?.find(t => t.amount != null)?.amount ?? null,
    }

    // Last sale from deedHistory
    const lastSaleDeed = p.deedHistory?.find(d => d.salePrice != null && d.salePrice > 0)
    result.lastSaleDate = lastSaleDeed?.saleDate ?? null
    result.lastSalePrice = lastSaleDeed?.salePrice ?? null
    result.lastSale = lastSaleDeed ? {
      date: lastSaleDeed.saleDate ?? null,
      price: lastSaleDeed.salePrice ?? null,
      pricePerSqft: null,
      buyerName: lastSaleDeed.buyers?.[0] ?? null,
      sellerName: lastSaleDeed.sellers?.[0] ?? null,
    } : null

    // Mortgage from openLien
    result.mortgage = p.openLien?.mortgages?.length ? {
      totalLienAmount: p.openLien.totalOpenLienBalance ?? null,
      liens: p.openLien.mortgages.map((m, i) => ({
        position: i + 1,
        amount: m.loanAmount ?? m.currentEstimatedBalance ?? null,
        lenderName: m.lenderName ?? null,
        interestRate: m.currentEstimatedInterestRate ?? null,
        interestRateType: m.financingType ?? null,
        term: m.loanTermMonths ?? null,
        dueDate: m.dueDate ?? null,
      })),
    } : null

    // Listing data (already included in response)
    if (p.listing) {
      result.listingStatus = p.listing.status ?? null
      result.daysOnMarket = calculateDaysOnMarket(p.listing)
      result.listPrice = p.listing.price ?? null
      result.originalListPrice = p.listing.maxListPrice ?? null
      result.priceReduced = p.listing.maxListPrice != null && p.listing.price != null
        ? p.listing.price < p.listing.maxListPrice
        : null
      result.priceReductionAmount = result.priceReduced && p.listing.maxListPrice && p.listing.price
        ? p.listing.maxListPrice - p.listing.price
        : null
      result.listingDate = p.listing.originalListingDate ?? null
      result.listingAgent = null
    }

    // Attach raw BatchData object so callers can store it in cache
    result._batchdataRaw = p

    return result
  }

  // ── 3. findCashBuyers ───────────────────────────────────────────────────

  async findCashBuyers(params: UnifiedCashBuyerParams): Promise<UnifiedBuyer[]> {
    return this.findCashBuyersViaRentCast(params)
  }

  private async findCashBuyersViaRentCast(params: UnifiedCashBuyerParams): Promise<UnifiedBuyer[]> {
    // RentCast doesn't have transaction data — use owner-intelligence
    // heuristics on cached property data. Caller must have cached data
    // from a prior searchProperties call for this to be useful.

    // Search for properties in the area to build our heuristic buyer list
    const properties = await this.rentcast.searchProperties({
      city: params.city,
      state: params.state,
      zipCode: params.zipCode,
      propertyType: params.propertyType
        ? RENTCAST_TYPE_MAP[params.propertyType] ?? params.propertyType
        : undefined,
      limit: 500,
    })

    // Convert to DiscoveryProperty shape for owner-intelligence functions
    const discoveryProps = properties.map((p) => rentCastToDiscoveryProperty(p))

    // Group by owner and filter to likely cash buyers
    const ownerGroups = groupPropertiesByOwner(discoveryProps)
    const minPurchases = params.minPurchases ?? 2

    const buyers: UnifiedBuyer[] = []
    ownerGroups.forEach((owner) => {
      if (!owner.likelyCashBuyer && owner.propertyCount < minPurchases) return

      const location = owner.cities.length > 0
        ? owner.cities.map((c) => `${c}, ${owner.properties[0]?.state ?? ''}`).filter(Boolean)
        : []

      buyers.push({
        dataSource: 'rentcast',
        buyerName: owner.displayName,
        buyerFirstName: null,
        buyerLastName: null,
        corporateIndicator: isEntityName(owner.displayName),
        cashPurchaseCount: owner.propertyCount,
        totalCashVolume: owner.totalValue,
        avgPurchasePrice: owner.avgValue,
        lastPurchaseDate: owner.lastPurchaseDate,
        lastPurchaseAmount: null,
        lastPurchaseAddress: null,
        propertyTypes: owner.propertyTypes,
        markets: location,
        confidence: 'inferred',
      })
    })

    // Sort by property count descending
    buyers.sort((a, b) => b.cashPurchaseCount - a.cashPurchaseCount)

    return buyers
  }

  // ── 4. getOwnerPortfolio ────────────────────────────────────────────────

  async getOwnerPortfolio(
    ownerName: string,
    location: string,
  ): Promise<UnifiedOwnerProfile> {
    if (this.batchdata) {
      return this.getOwnerViaBatchData(ownerName, location)
    }
    return this.getOwnerViaRentCast(ownerName, location)
  }

  private async getOwnerViaBatchData(
    ownerName: string,
    location: string,
  ): Promise<UnifiedOwnerProfile> {
    const [city] = parseLocation(location)

    return {
      dataSource: 'batchdata',
      ownerName,
      ownerName2: null,
      corporateIndicator: isEntityName(ownerName),
      absenteeOwner: false,
      mailingAddress: null,
      ownershipLength: { ownedSince: null, yearsOwned: null },
      portfolio: {
        propertyCount: 0,
        totalValue: 0,
        avgValue: 0,
        cities: city ? [city] : [],
        propertyTypes: [],
      },
      investorScore: 0,
      likelyCashBuyer: isEntityName(ownerName),
    }
  }

  private async getOwnerViaRentCast(
    ownerName: string,
    location: string,
  ): Promise<UnifiedOwnerProfile> {
    // Search the area and filter by owner name
    const [city, state] = parseLocation(location)

    const properties = await this.rentcast.searchProperties({
      city: city ?? undefined,
      state: state ?? undefined,
      limit: 500,
    })

    const discoveryProps = properties.map((p) => rentCastToDiscoveryProperty(p))
    const ownerGroups = groupPropertiesByOwner(discoveryProps)

    // Find the matching owner group
    const normalized = normalizeOwnerName(ownerName)
    const owner = ownerGroups.get(normalized)

    if (!owner) {
      // Return minimal profile
      return {
        dataSource: 'rentcast',
        ownerName,
        ownerName2: null,
        corporateIndicator: isEntityName(ownerName),
        absenteeOwner: false,
        mailingAddress: null,
        ownershipLength: { ownedSince: null, yearsOwned: null },
        portfolio: {
          propertyCount: 0,
          totalValue: 0,
          avgValue: 0,
          cities: [],
          propertyTypes: [],
        },
        investorScore: 0,
        likelyCashBuyer: isEntityName(ownerName),
      }
    }

    // Calculate ownership length from oldest purchase
    let yearsOwned: number | null = null
    let ownedSince: string | null = owner.oldestPurchaseDate
    if (ownedSince) {
      const saleTime = new Date(ownedSince).getTime()
      if (!isNaN(saleTime)) {
        yearsOwned = Math.round(
          ((Date.now() - saleTime) / (365.25 * 24 * 60 * 60 * 1000)) * 10,
        ) / 10
      }
    }

    return {
      dataSource: 'rentcast',
      ownerName: owner.displayName,
      ownerName2: null,
      corporateIndicator: isEntityName(owner.displayName),
      absenteeOwner: owner.properties.some((p) => p.ownerOccupied === false),
      mailingAddress: null,
      ownershipLength: { ownedSince, yearsOwned },
      portfolio: {
        propertyCount: owner.propertyCount,
        totalValue: owner.totalValue,
        avgValue: owner.avgValue,
        cities: owner.cities,
        propertyTypes: owner.propertyTypes,
      },
      investorScore: owner.investorScore,
      likelyCashBuyer: owner.likelyCashBuyer,
    }
  }

  // ── 5. getEquityData ────────────────────────────────────────────────────

  async getEquityData(propertyId: string, cachedRaw?: Record<string, unknown> | null): Promise<EquityData> {
    if (this.batchdata) {
      return this.getEquityViaBatchData(cachedRaw ?? null)
    }
    return this.getEquityViaRentCast(propertyId)
  }

  private getEquityViaBatchData(raw: Record<string, unknown> | null): EquityData {
    if (!raw) {
      return {
        dataSource: 'batchdata',
        source: 'estimated',
        confidence: 'low',
        estimatedValue: null,
        mortgageBalance: null,
        equity: null,
        equityPercent: null,
        ltv: null,
        avm: null,
      }
    }

    // Extract from new BatchData structure stored in rawResponse.batchdata
    const bd = raw.batchdata as BatchDataProperty | undefined
    if (bd) {
      const val = bd.valuation
      return {
        dataSource: 'batchdata',
        source: 'batchdata',
        confidence: val?.confidenceScore != null
          ? (val.confidenceScore >= 80 ? 'high' : 'low')
          : 'low',
        estimatedValue: val?.estimatedValue ?? null,
        mortgageBalance: bd.openLien?.totalOpenLienBalance ?? null,
        equity: val?.equityCurrentEstimatedBalance ?? null,
        equityPercent: val?.equityPercent ? Math.round(val.equityPercent) : null,
        ltv: val?.ltv ? Math.round(val.ltv) : null,
        avm: val ? {
          low: val.priceRangeMin ?? null,
          mid: val.estimatedValue ?? null,
          high: val.priceRangeMax ?? null,
          valuationDate: val.asOfDate ?? null,
        } : null,
      }
    }

    // Fallback for legacy cached data
    const estimatedValue = (raw.estimatedValue as number) ?? null
    return {
      dataSource: 'batchdata',
      source: 'estimated',
      confidence: estimatedValue ? 'high' : 'low',
      estimatedValue,
      mortgageBalance: null,
      equity: null,
      equityPercent: null,
      ltv: null,
      avm: null,
    }
  }

  private async getEquityViaRentCast(address: string): Promise<EquityData> {
    // Try to get a value estimate from RentCast, fall back to assessed value
    let estimatedValue: number | null = null

    try {
      const valuation = await this.rentcast.getValueEstimate(address)
      estimatedValue = valuation.value
    } catch {
      // Value estimate not available — will use assessed value below
    }

    // Get the property for assessed value and sale data
    const property = await this.rentcast.getPropertyByAddress(address)
    if (!property) {
      return {
        dataSource: 'rentcast',
        source: 'estimated',
        confidence: 'low',
        estimatedValue: null,
        mortgageBalance: null,
        equity: null,
        equityPercent: null,
        ltv: null,
        avm: null,
      }
    }

    const discoveryProp = rentCastToDiscoveryProperty(property)
    const equityEst = estimateEquity(discoveryProp)

    const value = estimatedValue ?? equityEst.estimatedCurrentValue ?? property.assessedValue
    // No mortgage data from RentCast — equity is estimated purely from value vs purchase price
    const equity = value && equityEst.lastSalePrice
      ? value - equityEst.lastSalePrice
      : null
    const equityPercent = equity && value && value > 0
      ? Math.round((equity / value) * 100)
      : null

    return {
      dataSource: 'rentcast',
      source: 'estimated',
      confidence: 'low',
      estimatedValue: value,
      mortgageBalance: null,
      equity,
      equityPercent,
      ltv: null,
      avm: null,
    }
  }

  // ── 6. getDistressSignals ───────────────────────────────────────────────

  async getDistressSignals(propertyId: string, cachedRaw?: Record<string, unknown> | null): Promise<DistressSignals> {
    if (this.batchdata) {
      return this.getDistressViaBatchData(cachedRaw ?? null)
    }
    return this.getDistressViaRentCast()
  }

  private getDistressViaBatchData(raw: Record<string, unknown> | null): DistressSignals {
    if (!raw) {
      return {
        dataSource: 'batchdata',
        available: false,
        upgradeRequired: false,
        foreclosure: null,
        taxDelinquent: null,
        probate: null,
      }
    }

    // Extract from new BatchData structure stored in rawResponse.batchdata
    const bd = raw.batchdata as BatchDataProperty | undefined
    if (bd) {
      return {
        dataSource: 'batchdata',
        available: true,
        upgradeRequired: false,
        foreclosure: bd.foreclosure?.status ? {
          active: true,
          status: bd.foreclosure.status,
          filingDate: bd.foreclosure.filingDate ?? null,
          defaultAmount: null,
          auctionDate: null,
        } : {
          active: false, status: null, filingDate: null, defaultAmount: null, auctionDate: null,
        },
        taxDelinquent: bd.quickLists?.taxDefault ? {
          isDelinquent: true,
          delinquentAmount: null,
          delinquentYears: null,
          taxLienAmount: null,
        } : null,
        probate: null,
      }
    }

    // Fallback for legacy cached data
    return {
      dataSource: 'batchdata',
      available: true,
      upgradeRequired: false,
      foreclosure: null,
      taxDelinquent: null,
      probate: null,
    }
  }

  private getDistressViaRentCast(): DistressSignals {
    return {
      dataSource: 'rentcast',
      available: false,
      upgradeRequired: true,
      foreclosure: null,
      taxDelinquent: null,
      probate: null,
    }
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _provider: DiscoveryDataProvider | null = null

/**
 * Returns the singleton DiscoveryDataProvider.
 *
 * Priority: BatchData > RentCast.
 * This is the single entry point all API routes should use.
 */
export function getDataProvider(): DiscoveryDataProvider {
  if (!_provider) {
    const batchdata = getBatchDataClient()
    const rentcast = getRentCastClient()
    _provider = new DiscoveryDataProvider(batchdata, rentcast)
  }
  return _provider
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map RentCastProperty to UnifiedProperty */
function mapRentCastToUnified(p: RentCastProperty): UnifiedProperty {
  return {
    id: p.id,
    dataSource: 'rentcast',
    addressLine1: p.addressLine1,
    city: p.city,
    state: p.state,
    zipCode: p.zipCode,
    county: p.county,
    latitude: p.latitude,
    longitude: p.longitude,
    propertyType: p.propertyType,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sqft: p.squareFootage,
    lotSize: p.lotSize,
    yearBuilt: p.yearBuilt,
    assessedValue: p.assessedValue,
    taxAmount: null,
    lastSaleDate: p.lastSaleDate,
    lastSalePrice: p.lastSalePrice,
    ownerName: p.ownerName,
    ownerOccupied: p.ownerOccupied,
    absenteeOwner: p.ownerOccupied === false ? true : null,
    corporateOwner: p.ownerName ? isEntityName(p.ownerName) : null,
    propIndicator: null,
  }
}

/** Convert RentCastProperty → DiscoveryProperty for owner-intelligence functions */
function rentCastToDiscoveryProperty(p: RentCastProperty): DiscoveryProperty {
  return {
    id: p.id,
    userId: null,
    rentcastId: p.id,
    addressLine1: p.addressLine1,
    city: p.city,
    state: p.state,
    zipCode: p.zipCode,
    county: p.county,
    latitude: p.latitude,
    longitude: p.longitude,
    propertyType: p.propertyType,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sqft: p.squareFootage,
    lotSize: p.lotSize,
    yearBuilt: p.yearBuilt,
    assessedValue: p.assessedValue,
    taxAmount: null,
    lastSaleDate: p.lastSaleDate,
    lastSalePrice: p.lastSalePrice,
    ownerName: p.ownerName,
    ownerOccupied: p.ownerOccupied,
    phone: null,
    email: null,
    mailingAddress: null,
    features: p.features ?? null,
    rawResponse: null,
    searchCity: p.city,
    searchZip: p.zipCode,
    cachedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

/** Calculate days on market from listing data */
function calculateDaysOnMarket(listing: BatchDataProperty['listing']): number | null {
  if (!listing?.originalListingDate) return null
  if (listing.status === 'Off Market' || listing.statusCategory === 'Failed') return null
  const listDate = new Date(listing.originalListingDate)
  const now = new Date()
  const diff = Math.floor((now.getTime() - listDate.getTime()) / 86400000)
  return diff >= 0 ? diff : null
}

/** Build "min:max" range string for RentCast API params */
function buildRange(min?: number, max?: number): string | undefined {
  if (min == null && max == null) return undefined
  return `${min ?? ''}:${max ?? ''}`
}

/** Map generic property type to BatchData's expected values */
function mapPropertyTypeForBatchData(type: string): string {
  const map: Record<string, string> = {
    SFR: 'Single Family Residential',
    'Single Family': 'Single Family Residential',
    'Multi-Family': 'Multi-Family',
    'Multi Family': 'Multi-Family',
    Condo: 'Condo',
    Townhouse: 'Townhouse',
    Land: 'Vacant Land',
    Commercial: 'Commercial',
  }
  return map[type] ?? type
}

/** Generate a deterministic ID from an address for deduplication */
function hashAddress(addr: { street?: string; city?: string; state?: string; zip?: string }): string {
  const str = `${addr.street}-${addr.city}-${addr.state}-${addr.zip}`.toLowerCase().replace(/\s+/g, '')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

/** Check if an owner name looks like a business entity */
function isEntityName(name: string): boolean {
  const lower = name.toLowerCase()
  const keywords = [
    'llc', 'inc', 'corp', 'trust', 'holdings', 'capital',
    'properties', 'investments', 'partners', 'lp', 'ventures',
    'realty', 'acquisitions', 'enterprise', 'management', 'fund',
  ]
  return keywords.some((kw) => lower.includes(kw))
}

/** Normalize city name by stripping common suffixes for comparison */
function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .replace(/\b(township|twp|city|village|borough|boro|town|cdp)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse "City, ST" or "City ST" into [city, state] */
function parseLocation(location: string): [string | null, string | null] {
  const parts = location.split(/[,\s]+/).filter(Boolean)
  if (parts.length === 0) return [null, null]
  // Last part is likely state if 2 chars
  const last = parts[parts.length - 1]
  if (last.length === 2) {
    return [parts.slice(0, -1).join(' ') || null, last.toUpperCase()]
  }
  return [location, null]
}
