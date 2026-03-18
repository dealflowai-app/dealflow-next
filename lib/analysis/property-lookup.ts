import {
  getRentCastClient,
  RentCastError,
  type RentCastProperty,
  type RentCastComparable,
  type RentCastRentComparable,
  type RentCastValuation,
  type RentCastRentEstimate,
} from '@/lib/rentcast'
import { withRetry } from '@/lib/resilience'
import { logger } from '@/lib/logger'
import { getCachedAnalysis, cacheAnalysis } from './cache'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnalysisInput {
  address: string
  askingPrice?: number
  repairCost?: number
  condition?: string
}

export interface SaleComp {
  address: string
  city: string
  state: string
  zip: string
  price: number | null
  sqft: number | null
  beds: number | null
  baths: number | null
  propertyType: string | null
  saleDate: string | null
  distance: number | null
  correlation: number | null
  pricePerSqft: number | null
}

export interface RentComp {
  address: string
  city: string
  state: string
  zip: string
  rent: number | null
  sqft: number | null
  beds: number | null
  baths: number | null
  propertyType: string | null
  listedDate: string | null
  distance: number | null
  correlation: number | null
}

export interface PropertyAnalysis {
  property: {
    address: string
    city: string
    state: string
    zip: string
    county: string | null
    propertyType: string | null
    beds: number | null
    baths: number | null
    sqft: number | null
    lotSize: number | null
    yearBuilt: number | null
    ownerName: string | null
    ownerOccupied: boolean | null
    assessedValue: number | null
    lastSaleDate: string | null
    lastSalePrice: number | null
    latitude: number | null
    longitude: number | null
  }

  valuation: {
    estimatedValue: number | null
    valueLow: number | null
    valueHigh: number | null
    confidence: 'high' | 'medium' | 'low'
    comparables: SaleComp[]
  }

  rental: {
    estimatedRent: number | null
    rentLow: number | null
    rentHigh: number | null
    comparables: RentComp[]
  }

  meta: {
    analyzedAt: string
    dataSource: 'rentcast' | 'attom'
    apiCallsUsed: number
    cached: boolean
  }
}

// ─── Mapping Helpers ────────────────────────────────────────────────────────

function mapSaleComp(comp: RentCastComparable): SaleComp {
  const pricePerSqft =
    comp.price != null && comp.squareFootage != null && comp.squareFootage > 0
      ? Math.round(comp.price / comp.squareFootage)
      : null

  return {
    address: comp.formattedAddress,
    city: comp.city,
    state: comp.state,
    zip: comp.zipCode,
    price: comp.price,
    sqft: comp.squareFootage,
    beds: comp.bedrooms,
    baths: comp.bathrooms,
    propertyType: comp.propertyType,
    saleDate: comp.listedDate,
    distance: comp.distance,
    correlation: comp.correlation,
    pricePerSqft,
  }
}

function mapRentComp(comp: RentCastRentComparable): RentComp {
  return {
    address: comp.formattedAddress,
    city: comp.city,
    state: comp.state,
    zip: comp.zipCode,
    rent: comp.rent,
    sqft: comp.squareFootage,
    beds: comp.bedrooms,
    baths: comp.bathrooms,
    propertyType: comp.propertyType,
    listedDate: comp.listedDate,
    distance: comp.distance,
    correlation: comp.correlation,
  }
}

function determineConfidence(comps: SaleComp[]): 'high' | 'medium' | 'low' {
  // Count comps within 1 mile and last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const relevantComps = comps.filter((c) => {
    const withinDistance = c.distance == null || c.distance <= 1
    const withinTime =
      c.saleDate == null || new Date(c.saleDate) >= sixMonthsAgo
    return withinDistance && withinTime
  })

  if (relevantComps.length >= 8) return 'high'
  if (relevantComps.length >= 4) return 'medium'
  return 'low'
}

function buildPropertySection(
  prop: RentCastProperty | null,
  inputAddress: string,
): PropertyAnalysis['property'] {
  if (!prop) {
    return {
      address: inputAddress,
      city: '',
      state: '',
      zip: '',
      county: null,
      propertyType: null,
      beds: null,
      baths: null,
      sqft: null,
      lotSize: null,
      yearBuilt: null,
      ownerName: null,
      ownerOccupied: null,
      assessedValue: null,
      lastSaleDate: null,
      lastSalePrice: null,
      latitude: null,
      longitude: null,
    }
  }

  return {
    address: prop.formattedAddress,
    city: prop.city,
    state: prop.state,
    zip: prop.zipCode,
    county: prop.county,
    propertyType: prop.propertyType,
    beds: prop.bedrooms,
    baths: prop.bathrooms,
    sqft: prop.squareFootage,
    lotSize: prop.lotSize,
    yearBuilt: prop.yearBuilt,
    ownerName: prop.ownerName,
    ownerOccupied: prop.ownerOccupied,
    assessedValue: prop.assessedValue,
    lastSaleDate: prop.lastSaleDate,
    lastSalePrice: prop.lastSalePrice,
    latitude: prop.latitude,
    longitude: prop.longitude,
  }
}

function buildValuationSection(
  valuation: RentCastValuation | null,
): PropertyAnalysis['valuation'] {
  const comps = valuation?.comparables?.map(mapSaleComp) ?? []
  return {
    estimatedValue: valuation?.value ?? null,
    valueLow: valuation?.valueRangeLow ?? null,
    valueHigh: valuation?.valueRangeHigh ?? null,
    confidence: determineConfidence(comps),
    comparables: comps,
  }
}

function buildRentalSection(
  rental: RentCastRentEstimate | null,
): PropertyAnalysis['rental'] {
  return {
    estimatedRent: rental?.rent ?? null,
    rentLow: rental?.rentRangeLow ?? null,
    rentHigh: rental?.rentRangeHigh ?? null,
    comparables: rental?.comparables?.map(mapRentComp) ?? [],
  }
}

// ─── Main Analysis Function ─────────────────────────────────────────────────

export async function analyzeProperty(
  input: AnalysisInput,
  profileId: string,
): Promise<PropertyAnalysis> {
  const startTime = Date.now()
  const { address } = input

  // 1. Check cache
  const cached = await getCachedAnalysis(profileId, address)
  if (cached) {
    logger.info('Analysis cache hit', { address, profileId })
    return { ...cached, meta: { ...cached.meta, cached: true } }
  }

  // 2. Make three RentCast API calls in parallel
  const client = getRentCastClient()
  const retryOpts = { maxRetries: 1, baseDelayMs: 2000, label: 'rentcast' }

  const [propertyResult, valuationResult, rentalResult] =
    await Promise.allSettled([
      withRetry(() => client.getPropertyByAddress(address), {
        ...retryOpts,
        label: 'rentcast-property',
      }),
      withRetry(() => client.getValueEstimate(address), {
        ...retryOpts,
        label: 'rentcast-valuation',
      }),
      withRetry(() => client.getRentEstimate(address), {
        ...retryOpts,
        label: 'rentcast-rental',
      }),
    ])

  // 3. Extract results (null for failed calls)
  const property =
    propertyResult.status === 'fulfilled' ? propertyResult.value : null
  const valuation =
    valuationResult.status === 'fulfilled' ? valuationResult.value : null
  const rental =
    rentalResult.status === 'fulfilled' ? rentalResult.value : null

  // Track how many API calls actually succeeded
  let apiCallsUsed = 0
  if (propertyResult.status === 'fulfilled') apiCallsUsed++
  if (valuationResult.status === 'fulfilled') apiCallsUsed++
  if (rentalResult.status === 'fulfilled') apiCallsUsed++

  // 4. Assemble the analysis
  const analysis: PropertyAnalysis = {
    property: buildPropertySection(property, address),
    valuation: buildValuationSection(valuation),
    rental: buildRentalSection(rental),
    meta: {
      analyzedAt: new Date().toISOString(),
      dataSource: 'rentcast',
      apiCallsUsed,
      cached: false,
    },
  }

  // 5. Cache the result
  await cacheAnalysis(profileId, address, analysis)

  // 6. Log
  const durationMs = Date.now() - startTime
  logger.info('Property analysis complete', {
    address,
    dataSource: 'rentcast',
    saleComps: analysis.valuation.comparables.length,
    rentComps: analysis.rental.comparables.length,
    apiCallsUsed,
    durationMs,
  })

  return analysis
}

// ─── Re-export for convenience ──────────────────────────────────────────────

export { RentCastError } from '@/lib/rentcast'
