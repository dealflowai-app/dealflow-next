// ─── Unified Discovery Data Provider ─────────────────────────────────────────
// Automatically uses ATTOM when configured, falls back to RentCast.
// All API routes should call getDataProvider() instead of reaching
// for ATTOM or RentCast directly.

import { getAttomClient, type AttomClient } from '@/lib/attom'
import { getRentCastClient, type RentCastClient, type RentCastProperty } from '@/lib/rentcast'
import {
  estimateEquity,
  detectLikelyCashBuyer,
  calculateInvestorScore,
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
  private attom: AttomClient | null
  private rentcast: RentCastClient

  constructor(attom: AttomClient | null, rentcast: RentCastClient) {
    this.attom = attom
    this.rentcast = rentcast
  }

  /** Which data source is active for property data */
  get primarySource(): DataSource {
    return this.attom ? 'attom' : 'rentcast'
  }

  /** True if ATTOM is configured and available */
  get hasAttom(): boolean {
    return this.attom !== null
  }

  // ── 1. searchProperties ─────────────────────────────────────────────────

  async searchProperties(params: UnifiedSearchParams): Promise<UnifiedProperty[]> {
    if (this.attom) {
      return this.searchViaAttom(params)
    }
    return this.searchViaRentCast(params)
  }

  private async searchViaAttom(params: UnifiedSearchParams): Promise<UnifiedProperty[]> {
    const results = await this.attom!.searchProperties({
      city: params.city,
      state: params.state,
      zipCode: params.zipCode,
      propertyType: params.propertyType,
      minBeds: params.minBeds,
      maxBeds: params.maxBeds,
      minBaths: params.minBaths,
      maxBaths: params.maxBaths,
      minSqft: params.minSqft,
      maxSqft: params.maxSqft,
      page: params.page,
      pageSize: params.pageSize,
    })

    return results.map((p): UnifiedProperty => ({
      id: String(p.identifier.attomId),
      dataSource: 'attom',
      addressLine1: p.address.line1,
      city: p.address.locality,
      state: p.address.countrySubd,
      zipCode: p.address.postal1,
      county: null,
      latitude: p.location.latitude,
      longitude: p.location.longitude,
      propertyType: p.summary.propClass ?? p.summary.propertyType ?? null,
      bedrooms: p.building.rooms.beds,
      bathrooms: p.building.rooms.bathsTotal,
      sqft: p.building.size.livingSize ?? p.building.size.bldgSize,
      lotSize: p.lot.lotSize1,
      yearBuilt: p.summary.yearBuilt,
      assessedValue: null, // basic profile doesn't include assessment
      taxAmount: null,
      lastSaleDate: null,
      lastSalePrice: null,
      ownerName: null, // basic profile doesn't include owner
      ownerOccupied: p.summary.absenteeInd === 'N' ? true : p.summary.absenteeInd === 'Y' ? false : null,
      absenteeOwner: p.summary.absenteeInd === 'Y',
      corporateOwner: null,
      propIndicator: p.summary.propIndicator ?? null,
    }))
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

  async getPropertyDetail(id: string): Promise<UnifiedPropertyDetail> {
    if (this.attom) {
      return this.getDetailViaAttom(id)
    }
    return this.getDetailViaRentCast(id)
  }

  private async getDetailViaAttom(attomId: string): Promise<UnifiedPropertyDetail> {
    // Fetch expanded profile and mortgage in parallel
    const [detail, mortgages] = await Promise.all([
      this.attom!.getPropertyDetail(attomId),
      this.attom!.getMortgageData(attomId).catch(() => []),
    ])

    const totalLienAmount = mortgages.reduce((sum, m) => sum + (m.lien.amount ?? 0), 0)

    return {
      id: String(detail.identifier.attomId),
      dataSource: 'attom',
      addressLine1: detail.address.line1,
      city: detail.address.locality,
      state: detail.address.countrySubd,
      zipCode: detail.address.postal1,
      county: null,
      latitude: detail.location.latitude,
      longitude: detail.location.longitude,
      propertyType: detail.summary.propClass ?? detail.summary.propertyType ?? null,
      bedrooms: detail.building.rooms.beds,
      bathrooms: detail.building.rooms.bathsTotal,
      sqft: detail.building.size.livingSize ?? detail.building.size.bldgSize,
      lotSize: detail.lot.lotSize1,
      yearBuilt: detail.summary.yearBuilt,
      assessedValue: detail.assessment?.assessed?.assdTtlValue ?? null,
      taxAmount: detail.assessment?.tax?.taxAmt ?? null,
      lastSaleDate: detail.sale?.amount?.saleRecDate ?? null,
      lastSalePrice: detail.sale?.amount?.saleAmt ?? null,
      ownerName: detail.owner?.owner1?.fullName ?? null,
      ownerOccupied: detail.owner?.absenteeOwnerStatus === 'Owner Occupied'
        ? true
        : detail.owner?.absenteeOwnerStatus === 'Absentee Owner'
          ? false
          : null,
      absenteeOwner: detail.owner?.absenteeOwnerStatus === 'Absentee Owner',
      corporateOwner: detail.owner?.corporateIndicator === 'Y',
      propIndicator: detail.summary.propIndicator ?? null,

      assessment: {
        assessedTotal: detail.assessment?.assessed?.assdTtlValue ?? null,
        assessedLand: detail.assessment?.assessed?.assdLandValue ?? null,
        assessedImprovement: detail.assessment?.assessed?.assdImprValue ?? null,
        marketValue: detail.assessment?.market?.mktTtlValue ?? null,
        taxYear: detail.assessment?.tax?.taxYear ?? null,
        taxAmount: detail.assessment?.tax?.taxAmt ?? null,
      },

      owner: {
        name: detail.owner?.owner1?.fullName ?? null,
        name2: detail.owner?.owner2?.fullName ?? null,
        corporateIndicator: detail.owner?.corporateIndicator === 'Y',
        absenteeOwner: detail.owner?.absenteeOwnerStatus === 'Absentee Owner',
        mailingAddress: detail.owner?.mailingAddressOneLine ?? null,
      },

      lastSale: detail.sale
        ? {
            date: detail.sale.amount?.saleRecDate ?? null,
            price: detail.sale.amount?.saleAmt ?? null,
            pricePerSqft: detail.sale.calculation?.pricePerSizeUnit ?? null,
            buyerName: null, // expandedprofile doesn't include buyer/seller
            sellerName: null,
          }
        : null,

      building: {
        totalSqft: detail.building.size.bldgSize,
        livingSqft: detail.building.size.livingSize,
        stories: detail.building.summary.levels,
        condition: detail.building.construction.condition,
        garageType: detail.building.parking.garageType,
        garageSpaces: detail.building.parking.prkgSpaces,
        basementSqft: detail.building.interior.bsmtSize,
        basementType: detail.building.interior.bsmtType,
        fireplaceCount: detail.building.interior.fplcCount,
        yearBuiltEffective: detail.building.summary.yearBuiltEffective,
      },

      mortgage: mortgages.length > 0
        ? {
            totalLienAmount: totalLienAmount > 0 ? totalLienAmount : null,
            liens: mortgages.map((m) => ({
              position: m.lien.lienPosition ?? 1,
              amount: m.lien.amount,
              lenderName: m.lien.lenderName,
              interestRate: m.lien.interestRate,
              interestRateType: m.lien.interestRateType,
              term: m.lien.term,
              dueDate: m.lien.dueDate,
            })),
          }
        : null,

      features: null,
    }
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

  // ── 3. findCashBuyers ───────────────────────────────────────────────────

  async findCashBuyers(params: UnifiedCashBuyerParams): Promise<UnifiedBuyer[]> {
    if (this.attom) {
      return this.findCashBuyersViaAttom(params)
    }
    return this.findCashBuyersViaRentCast(params)
  }

  private async findCashBuyersViaAttom(params: UnifiedCashBuyerParams): Promise<UnifiedBuyer[]> {
    const results = await this.attom!.searchCashBuyers({
      city: params.city,
      state: params.state,
      zipCode: params.zipCode,
      minPurchases: params.minPurchases,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      propertyType: params.propertyType,
      page: params.page,
      pageSize: params.pageSize,
    })

    return results.map((b): UnifiedBuyer => ({
      dataSource: 'attom',
      buyerName: b.buyerName,
      buyerFirstName: b.buyerFirstName,
      buyerLastName: b.buyerLastName,
      corporateIndicator: b.corporateIndicator,
      cashPurchaseCount: b.cashPurchaseCount,
      totalCashVolume: b.totalCashVolume,
      avgPurchasePrice: b.avgPurchasePrice,
      lastPurchaseDate: b.lastPurchaseDate,
      lastPurchaseAmount: b.lastPurchaseAmount,
      lastPurchaseAddress: b.lastPurchaseAddress,
      propertyTypes: b.propertyTypes,
      markets: b.markets,
      confidence: 'verified',
    }))
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
    if (this.attom) {
      return this.getOwnerViaAttom(ownerName, location)
    }
    return this.getOwnerViaRentCast(ownerName, location)
  }

  private async getOwnerViaAttom(
    ownerName: string,
    location: string,
  ): Promise<UnifiedOwnerProfile> {
    // Search for properties owned by this person in the area
    // ATTOM doesn't have a direct "search by owner" — use property search
    // and filter. For a known attomId, use getOwnerProfile instead.
    const [city, state] = parseLocation(location)

    const properties = await this.attom!.searchProperties({
      city: city ?? undefined,
      state: state ?? undefined,
      pageSize: 100,
    })

    // Filter to matching owner name
    const normalized = normalizeOwnerName(ownerName)
    const owned = properties.filter((p) => {
      // Basic profile doesn't include owner — this is a limitation.
      // In practice, callers would use getOwnerProfile(attomId) for
      // a specific property, then cross-reference.
      return false // Placeholder — real impl would use owner search endpoint
    })

    // Fall back to a single-property profile if we have an attomId
    // This is the more realistic path: UI passes an attomId
    return {
      dataSource: 'attom',
      ownerName,
      ownerName2: null,
      corporateIndicator: isEntityName(ownerName),
      absenteeOwner: false,
      mailingAddress: null,
      ownershipLength: { ownedSince: null, yearsOwned: null },
      portfolio: {
        propertyCount: owned.length,
        totalValue: 0,
        avgValue: 0,
        cities: [],
        propertyTypes: [],
      },
      investorScore: 0,
      likelyCashBuyer: isEntityName(ownerName),
    }
  }

  /**
   * Get ATTOM owner profile by attomId — the preferred path when you
   * already have a property ID from a prior search.
   */
  async getOwnerProfileById(attomId: string): Promise<UnifiedOwnerProfile> {
    if (!this.attom) {
      throw new Error('ATTOM not configured — use getOwnerPortfolio() for RentCast fallback')
    }

    const owner = await this.attom.getOwnerProfile(attomId)

    return {
      dataSource: 'attom',
      ownerName: owner.owner1.fullName ?? '',
      ownerName2: owner.owner2?.fullName ?? null,
      corporateIndicator: owner.corporateIndicator,
      absenteeOwner: owner.absenteeOwner,
      mailingAddress: owner.mailingAddress?.oneLine ?? null,
      ownershipLength: {
        ownedSince: owner.ownershipLength.ownedSince,
        yearsOwned: owner.ownershipLength.yearsOwned,
      },
      portfolio: owner.portfolioSummary
        ? {
            propertyCount: owner.portfolioSummary.totalProperties ?? 0,
            totalValue: owner.portfolioSummary.totalValue ?? 0,
            avgValue: owner.portfolioSummary.totalProperties
              ? Math.round((owner.portfolioSummary.totalValue ?? 0) / owner.portfolioSummary.totalProperties)
              : 0,
            cities: [],
            propertyTypes: owner.portfolioSummary.propertyTypes,
          }
        : { propertyCount: 1, totalValue: 0, avgValue: 0, cities: [], propertyTypes: [] },
      investorScore: 0,
      likelyCashBuyer: owner.corporateIndicator || owner.absenteeOwner,
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

  async getEquityData(propertyId: string): Promise<EquityData> {
    if (this.attom) {
      return this.getEquityViaAttom(propertyId)
    }
    return this.getEquityViaRentCast(propertyId)
  }

  private async getEquityViaAttom(attomId: string): Promise<EquityData> {
    const avm = await this.attom!.getAVM(attomId)

    return {
      dataSource: 'attom',
      source: 'attom',
      confidence: 'high',
      estimatedValue: avm.value.mid,
      mortgageBalance: avm.calculatedEquity?.totalLiens ?? null,
      equity: avm.calculatedEquity?.estimatedEquity ?? null,
      equityPercent: avm.calculatedEquity?.equityPercent ?? null,
      ltv: avm.calculatedEquity?.ltv ?? null,
      avm: {
        low: avm.value.low,
        mid: avm.value.mid,
        high: avm.value.high,
        valuationDate: avm.valuationDate,
      },
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

  async getDistressSignals(propertyId: string): Promise<DistressSignals> {
    if (this.attom) {
      return this.getDistressViaAttom(propertyId)
    }
    return this.getDistressViaRentCast()
  }

  private async getDistressViaAttom(attomId: string): Promise<DistressSignals> {
    // Fetch foreclosure and tax status in parallel
    const [foreclosure, taxStatus] = await Promise.all([
      this.attom!.getForeclosureStatus(attomId),
      this.attom!.getTaxStatus(attomId).catch(() => null),
    ])

    return {
      dataSource: 'attom',
      available: true,
      upgradeRequired: false,

      foreclosure: foreclosure
        ? {
            active: true,
            status: foreclosure.status,
            filingDate: foreclosure.filingDate,
            defaultAmount: foreclosure.amount.defaultAmount,
            auctionDate: foreclosure.auction?.auctionDate ?? null,
          }
        : {
            active: false,
            status: null,
            filingDate: null,
            defaultAmount: null,
            auctionDate: null,
          },

      taxDelinquent: taxStatus
        ? {
            isDelinquent: taxStatus.delinquency.isDelinquent,
            delinquentAmount: taxStatus.delinquency.delinquentAmount,
            delinquentYears: taxStatus.delinquency.delinquentYears,
            taxLienAmount: taxStatus.delinquency.taxLienAmount,
          }
        : null,

      probate: null,
    }
  }

  private async getDistressViaRentCast(): Promise<DistressSignals> {
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
 * Uses ATTOM if ATTOM_API_KEY is set, otherwise falls back to RentCast.
 * This is the single entry point all API routes should use.
 */
export function getDataProvider(): DiscoveryDataProvider {
  if (!_provider) {
    const attom = getAttomClient()
    const rentcast = getRentCastClient()
    _provider = new DiscoveryDataProvider(attom, rentcast)
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

/** Build "min:max" range string for RentCast API params */
function buildRange(min?: number, max?: number): string | undefined {
  if (min == null && max == null) return undefined
  return `${min ?? ''}:${max ?? ''}`
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
