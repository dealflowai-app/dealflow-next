import type {
  AttomProperty,
  AttomPropertyDetail,
  AttomTransaction,
  AttomOwner,
  AttomCashBuyer,
  AttomMortgage,
  AttomForeclosure,
  AttomTaxStatus,
  AttomValuation,
  AttomComp,
  AttomPropertySearchParams,
  AttomCashBuyerSearchParams,
  AttomCompSearchParams,
} from './types'
import { AttomNotConfiguredError, AttomApiError } from './types'

const BASE_URL = 'https://api.gateway.attomdata.com'

/**
 * Fully-typed ATTOM Data API client.
 *
 * Every method checks that the API key is present, builds the correct
 * ATTOM REST endpoint, and returns typed response data.
 *
 * Set ATTOM_API_KEY in your environment to enable.
 */
export class AttomClient {
  private apiKey: string

  constructor(apiKey: string) {
    if (!apiKey) throw new AttomNotConfiguredError()
    this.apiKey = apiKey
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, BASE_URL)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v)
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        apikey: this.apiKey,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new AttomApiError(
        body?.status?.msg || body?.message || `ATTOM API error (${res.status})`,
        res.status,
        path,
        body?.status?.code?.toString(),
      )
    }

    return res.json() as Promise<T>
  }

  private str(val: string | number | undefined): string | undefined {
    return val !== undefined ? String(val) : undefined
  }

  // ── 1. searchProperties ─────────────────────────────────────────────────

  /**
   * Search for properties by location and criteria.
   * ATTOM endpoint: GET /propertyapi/v1.0.0/property/basicprofile
   */
  async searchProperties(params: AttomPropertySearchParams): Promise<AttomProperty[]> {
    const query: Record<string, string> = {}

    if (params.zipCode) {
      query.postalcode = params.zipCode
    } else {
      if (params.city) query.address1 = params.city
      if (params.state) query.address2 = params.state
    }

    if (params.minBeds) query.minBeds = String(params.minBeds)
    if (params.maxBeds) query.maxBeds = String(params.maxBeds)
    if (params.minBaths) query.minBathsTotal = String(params.minBaths)
    if (params.maxBaths) query.maxBathsTotal = String(params.maxBaths)
    if (params.minSqft) query.minBuildingSqFt = String(params.minSqft)
    if (params.maxSqft) query.maxBuildingSqFt = String(params.maxSqft)
    if (params.propertyType) query.propertytype = params.propertyType

    query.page = String(params.page ?? 1)
    query.pagesize = String(params.pageSize ?? 50)

    const data = await this.request<{ property: AttomProperty[] }>(
      '/propertyapi/v1.0.0/property/basicprofile',
      query,
    )

    return data.property ?? []
  }

  // ── 2. getPropertyDetail ────────────────────────────────────────────────

  /**
   * Get expanded property profile including assessment, owner, and last sale.
   * ATTOM endpoint: GET /propertyapi/v1.0.0/property/expandedprofile
   */
  async getPropertyDetail(attomId: string): Promise<AttomPropertyDetail> {
    const data = await this.request<{ property: AttomPropertyDetail[] }>(
      '/propertyapi/v1.0.0/property/expandedprofile',
      { attomid: attomId },
    )

    if (!data.property?.[0]) {
      throw new AttomApiError('Property not found', 404, 'expandedprofile')
    }

    return data.property[0]
  }

  // ── 3. getTransactionHistory ────────────────────────────────────────────

  /**
   * Get sale history for a property.
   * Classifies each transaction as Cash or Mortgage based on mortgage data.
   * ATTOM endpoint: GET /propertyapi/v1.0.0/saleshistory/detail
   */
  async getTransactionHistory(attomId: string): Promise<AttomTransaction[]> {
    const data = await this.request<{ property: Array<{ saleHistory: unknown[] }> }>(
      '/propertyapi/v1.0.0/saleshistory/detail',
      { attomid: attomId },
    )

    const raw = data.property?.[0]?.saleHistory ?? []

    return raw.map((sale: unknown) => {
      const s = sale as Record<string, unknown>
      const amount = s.amount as Record<string, unknown> | undefined
      const mortgage = s.mortgage as Record<string, unknown> | undefined
      const buyer = s.buyer as Record<string, unknown> | undefined
      const seller = s.seller as Record<string, unknown> | undefined
      const date = s.date as Record<string, unknown> | undefined

      const hasMortgage = mortgage && (mortgage.amount as number | null) && (mortgage.amount as number) > 0

      return {
        identifier: {
          attomId: Number(attomId),
          transactionIdent: (s.transactionIdent as string) ?? null,
        },
        amount: {
          saleAmt: (amount?.saleAmt as number) ?? null,
          saleCode: (amount?.saleCode as string) ?? null,
          saleRecDate: (amount?.saleRecDate as string) ?? null,
          saleDisclosureType: (amount?.saleDisclosureType as number) ?? null,
        },
        calculation: {
          pricePerBed: (s.pricePerBed as number) ?? null,
          pricePerSizeUnit: (s.pricePerSizeUnit as number) ?? null,
        },
        date: {
          saleSearchDate: (date?.saleSearchDate as string) ?? null,
          saleTransDate: (date?.saleTransDate as string) ?? null,
          recordingDate: (date?.recordingDate as string) ?? null,
        },
        buyer: {
          buyerName: (buyer?.buyerName as string) ?? null,
          buyerFirstName: (buyer?.buyerFirstName as string) ?? null,
          buyerLastName: (buyer?.buyerLastName as string) ?? null,
          buyer2Name: (buyer?.buyer2Name as string) ?? null,
          corporateIndicator: (buyer?.corporateIndicator as string) ?? null,
        },
        seller: {
          sellerName: (seller?.sellerName as string) ?? null,
          sellerFirstName: (seller?.sellerFirstName as string) ?? null,
          sellerLastName: (seller?.sellerLastName as string) ?? null,
        },
        mortgage: hasMortgage
          ? {
              amount: (mortgage.amount as number) ?? null,
              lenderName: (mortgage.lenderName as string) ?? null,
              interestRateType: (mortgage.interestRateType as string) ?? null,
              term: (mortgage.term as number) ?? null,
              dueDate: (mortgage.dueDate as string) ?? null,
            }
          : null,
        propertyType: (s.propertyType as string) ?? null,
        distressedSaleFlag: (s.distressedSaleFlag as string) ?? null,
        cashOrMortgage: hasMortgage ? 'Mortgage' : 'Cash',
      } satisfies AttomTransaction
    })
  }

  // ── 4. getOwnerProfile ──────────────────────────────────────────────────

  /**
   * Get owner details including mailing address and portfolio info.
   * Uses expandedprofile data to build the owner profile.
   */
  async getOwnerProfile(attomId: string): Promise<AttomOwner> {
    const detail = await this.getPropertyDetail(attomId)
    const owner = detail.owner
    const sale = detail.sale

    let yearsOwned: number | null = null
    let ownedSince: string | null = null
    if (sale?.amount?.saleRecDate) {
      ownedSince = sale.amount.saleRecDate
      const saleDate = new Date(sale.amount.saleRecDate)
      if (!isNaN(saleDate.getTime())) {
        yearsOwned = Math.round(
          (Date.now() - saleDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10,
        ) / 10
      }
    }

    return {
      attomId: detail.identifier.attomId,
      owner1: {
        firstName: owner?.owner1?.firstNameAndMi ?? null,
        lastName: owner?.owner1?.lastName ?? null,
        fullName: owner?.owner1?.fullName ?? null,
      },
      owner2: owner?.owner2
        ? {
            firstName: owner.owner2.firstNameAndMi ?? null,
            lastName: owner.owner2.lastName ?? null,
            fullName: owner.owner2.fullName ?? null,
          }
        : null,
      corporateIndicator: owner?.corporateIndicator === 'Y',
      absenteeOwner: owner?.absenteeOwnerStatus === 'Absentee Owner',
      mailingAddress: owner?.mailingAddressOneLine
        ? {
            line1: owner.mailingAddressOneLine,
            line2: null,
            locality: '',
            countrySubd: '',
            postal1: '',
            postal2: null,
            oneLine: owner.mailingAddressOneLine,
          }
        : null,
      ownershipLength: {
        ownedSince,
        yearsOwned,
      },
      portfolioSummary: null, // Requires separate batch query
    }
  }

  // ── 5. searchCashBuyers ─────────────────────────────────────────────────

  /**
   * Find cash buyers by searching recent cash transactions in an area.
   * ATTOM endpoint: GET /propertyapi/v1.0.0/sale/snapshot
   * Filtered to saleTransType=Cash
   */
  async searchCashBuyers(params: AttomCashBuyerSearchParams): Promise<AttomCashBuyer[]> {
    const query: Record<string, string> = {
      saletype: 'Cash',
      startsalesearchdate: getMonthsAgoDate(12),
      endsalesearchdate: new Date().toISOString().slice(0, 10),
    }

    if (params.zipCode) {
      query.postalcode = params.zipCode
    } else {
      if (params.city) query.geoid = params.city // ATTOM uses geoid for areas
      if (params.state) query.address2 = params.state
    }

    if (params.minPrice) query.minsaleamt = String(params.minPrice)
    if (params.maxPrice) query.maxsaleamt = String(params.maxPrice)
    if (params.propertyType) query.propertytype = params.propertyType

    query.page = String(params.page ?? 1)
    query.pagesize = String(params.pageSize ?? 100)

    const data = await this.request<{ property: unknown[] }>(
      '/propertyapi/v1.0.0/sale/snapshot',
      query,
    )

    const transactions = data.property ?? []
    const minPurchases = params.minPurchases ?? 1

    // Group by buyer name to identify repeat cash buyers
    const buyerMap = new Map<string, {
      transactions: unknown[]
      totalVolume: number
      lastDate: string | null
      lastAmount: number | null
      lastAddress: string | null
      types: Set<string>
      markets: Set<string>
      buyer: Record<string, unknown>
    }>()

    for (const txn of transactions) {
      const t = txn as Record<string, unknown>
      const sale = t.sale as Record<string, unknown> | undefined
      const amount = sale?.amount as Record<string, unknown> | undefined
      const buyer = sale?.buyer as Record<string, unknown> | undefined
      const address = t.address as Record<string, unknown> | undefined

      const buyerName = (buyer?.buyerName as string) ?? ''
      if (!buyerName) continue

      const key = buyerName.toUpperCase().trim()
      const saleAmt = (amount?.saleAmt as number) ?? 0
      const saleDate = (amount?.saleRecDate as string) ?? null
      const addr = (address?.oneLine as string) ?? null
      const propType = ((t.summary as Record<string, unknown> | undefined)?.propertyType as string) ?? ''
      const city = (address?.locality as string) ?? ''
      const state = (address?.countrySubd as string) ?? ''

      const existing = buyerMap.get(key)
      if (existing) {
        existing.transactions.push(txn)
        existing.totalVolume += saleAmt
        if (saleDate && (!existing.lastDate || saleDate > existing.lastDate)) {
          existing.lastDate = saleDate
          existing.lastAmount = saleAmt
          existing.lastAddress = addr
        }
        if (propType) existing.types.add(propType)
        if (city && state) existing.markets.add(`${city}, ${state}`)
      } else {
        buyerMap.set(key, {
          transactions: [txn],
          totalVolume: saleAmt,
          lastDate: saleDate,
          lastAmount: saleAmt,
          lastAddress: addr,
          types: new Set(propType ? [propType] : []),
          markets: new Set(city && state ? [`${city}, ${state}`] : []),
          buyer: buyer ?? {},
        })
      }
    }

    // Filter to buyers with >= minPurchases and build typed results
    const results: AttomCashBuyer[] = []

    buyerMap.forEach((entry) => {
      if (entry.transactions.length < minPurchases) return

      results.push({
        buyerName: (entry.buyer.buyerName as string) ?? '',
        buyerFirstName: (entry.buyer.buyerFirstName as string) ?? null,
        buyerLastName: (entry.buyer.buyerLastName as string) ?? null,
        corporateIndicator: (entry.buyer.corporateIndicator as string) === 'Y',
        cashPurchaseCount: entry.transactions.length,
        totalCashVolume: entry.totalVolume,
        lastPurchaseDate: entry.lastDate,
        lastPurchaseAmount: entry.lastAmount,
        lastPurchaseAddress: entry.lastAddress,
        avgPurchasePrice: entry.transactions.length > 0
          ? Math.round(entry.totalVolume / entry.transactions.length)
          : null,
        propertyTypes: Array.from(entry.types),
        markets: Array.from(entry.markets),
        transactions: [], // Omit full transactions from summary for performance
      })
    })

    // Sort by purchase count descending
    results.sort((a, b) => b.cashPurchaseCount - a.cashPurchaseCount)

    return results
  }

  // ── 6. getMortgageData ──────────────────────────────────────────────────

  /**
   * Get current mortgage/lien data for a property.
   * ATTOM endpoint: GET /propertyapi/v1.0.0/property/detailmortgage
   */
  async getMortgageData(attomId: string): Promise<AttomMortgage[]> {
    const data = await this.request<{ property: Array<{ mortgage: unknown[] }> }>(
      '/propertyapi/v1.0.0/property/detailmortgage',
      { attomid: attomId },
    )

    const raw = data.property?.[0]?.mortgage ?? []

    return raw.map((m: unknown, idx: number) => {
      const lien = m as Record<string, unknown>
      const amt = lien.amount as Record<string, unknown> | undefined
      const borrowerData = lien.borrower as Record<string, unknown> | undefined

      return {
        attomId: Number(attomId),
        lien: {
          lienPosition: idx + 1,
          lienType: (lien.lienType as string) ?? null,
          amount: (amt?.loanAmount as number) ?? (lien.amount as number) ?? null,
          interestRate: (lien.interestRate as number) ?? null,
          interestRateType: (lien.interestRateType as string) ?? null,
          term: (lien.term as number) ?? null,
          dueDate: (lien.dueDate as string) ?? null,
          recordingDate: (lien.recordingDate as string) ?? null,
          lenderName: (lien.lenderName as string) ?? null,
          lenderType: (lien.lenderType as string) ?? null,
        },
        borrower: {
          name: (borrowerData?.borrowerName as string) ?? null,
          vestingType: (borrowerData?.vestingType as string) ?? null,
        },
      } satisfies AttomMortgage
    })
  }

  // ── 7. getForeclosureStatus ─────────────────────────────────────────────

  /**
   * Check foreclosure/pre-foreclosure status.
   * ATTOM endpoint: GET /propertyapi/v1.0.0/property/preforeclosure
   * Returns null if no foreclosure activity found.
   */
  async getForeclosureStatus(attomId: string): Promise<AttomForeclosure | null> {
    try {
      const data = await this.request<{ property: unknown[] }>(
        '/propertyapi/v1.0.0/property/preforeclosure',
        { attomid: attomId },
      )

      const raw = data.property?.[0] as Record<string, unknown> | undefined
      if (!raw) return null

      const fc = raw.foreclosure as Record<string, unknown> | undefined
      if (!fc) return null

      const auction = fc.auction as Record<string, unknown> | undefined
      const trustee = fc.trustee as Record<string, unknown> | undefined
      const lender = fc.lender as Record<string, unknown> | undefined
      const amount = fc.amount as Record<string, unknown> | undefined
      const document = fc.document as Record<string, unknown> | undefined
      const borrower = fc.borrower as Record<string, unknown> | undefined

      const docType = ((document?.type as string) ?? '').toUpperCase()
      let status: AttomForeclosure['status'] = 'UNKNOWN'
      if (docType.includes('NOD') || docType.includes('DEFAULT')) status = 'NOD'
      else if (docType.includes('LIS') || docType.includes('PENDENS')) status = 'LIS_PENDENS'
      else if (docType.includes('NTS') || docType.includes('SALE') || auction?.auctionDate) status = 'AUCTION'
      else if (docType.includes('REO')) status = 'REO'

      return {
        attomId: Number(attomId),
        status,
        filingDate: (fc.filingDate as string) ?? null,
        recordingDate: (fc.recordingDate as string) ?? null,
        effectiveDate: (fc.effectiveDate as string) ?? null,
        amount: {
          defaultAmount: (amount?.defaultAmount as number) ?? null,
          unpaidBalance: (amount?.unpaidBalance as number) ?? null,
          judgementAmount: (amount?.judgementAmount as number) ?? null,
          startingBid: (amount?.startingBid as number) ?? null,
        },
        auction: auction
          ? {
              auctionDate: (auction.auctionDate as string) ?? null,
              auctionTime: (auction.auctionTime as string) ?? null,
              auctionLocation: (auction.auctionLocation as string) ?? null,
              auctionAddress: (auction.auctionAddress as string) ?? null,
              minBid: (auction.minBid as number) ?? null,
            }
          : null,
        trustee: trustee
          ? {
              name: (trustee.name as string) ?? null,
              phone: (trustee.phone as string) ?? null,
              address: (trustee.address as string) ?? null,
              saleNumber: (trustee.saleNumber as string) ?? null,
            }
          : null,
        lender: lender
          ? {
              name: (lender.name as string) ?? null,
              phone: (lender.phone as string) ?? null,
            }
          : null,
        borrower: {
          name: (borrower?.name as string) ?? null,
        },
        document: {
          type: (document?.type as string) ?? null,
          number: (document?.number as string) ?? null,
          bookPage: (document?.bookPage as string) ?? null,
        },
      }
    } catch (err) {
      // 404 = no foreclosure data → return null
      if (err instanceof AttomApiError && err.status === 404) return null
      throw err
    }
  }

  // ── 8. getTaxStatus ─────────────────────────────────────────────────────

  /**
   * Get tax assessment and delinquency info.
   * ATTOM endpoint: GET /propertyapi/v1.0.0/assessment/detail
   */
  async getTaxStatus(attomId: string): Promise<AttomTaxStatus> {
    const data = await this.request<{ property: unknown[] }>(
      '/propertyapi/v1.0.0/assessment/detail',
      { attomid: attomId },
    )

    const raw = data.property?.[0] as Record<string, unknown> | undefined
    if (!raw) {
      throw new AttomApiError('Property not found', 404, 'assessment/detail')
    }

    const assessment = raw.assessment as Record<string, unknown> | undefined
    const assessed = assessment?.assessed as Record<string, unknown> | undefined
    const market = assessment?.market as Record<string, unknown> | undefined
    const tax = assessment?.tax as Record<string, unknown> | undefined
    const delinquency = raw.delinquency as Record<string, unknown> | undefined

    return {
      attomId: Number(attomId),
      assessment: {
        assessedValue: (assessed?.assdTtlValue as number) ?? null,
        marketValue: (market?.mktTtlValue as number) ?? null,
        landValue: (assessed?.assdLandValue as number) ?? null,
        improvementValue: (assessed?.assdImprValue as number) ?? null,
        assessmentYear: (tax?.taxYear as number) ?? null,
      },
      tax: {
        taxYear: (tax?.taxYear as number) ?? null,
        taxAmount: (tax?.taxAmt as number) ?? null,
        taxRate: (tax?.taxPerSizeUnit as number) ?? null,
        taxExemption: (tax?.taxExemption as string) ?? null,
      },
      delinquency: {
        isDelinquent: ((delinquency?.delinquentAmount as number) ?? 0) > 0,
        delinquentAmount: (delinquency?.delinquentAmount as number) ?? null,
        delinquentYears: (delinquency?.delinquentYears as number) ?? null,
        taxLienAmount: (delinquency?.taxLienAmount as number) ?? null,
        taxLienDate: (delinquency?.taxLienDate as string) ?? null,
      },
      specialAssessments: [],
    }
  }

  // ── 9. getAVM ───────────────────────────────────────────────────────────

  /**
   * Get ATTOM's Automated Valuation Model estimate.
   * Includes equity calculation when mortgage data is available.
   * ATTOM endpoint: GET /propertyapi/v1.0.0/valuation/homeequity
   */
  async getAVM(attomId: string): Promise<AttomValuation> {
    const data = await this.request<{ property: unknown[] }>(
      '/propertyapi/v1.0.0/valuation/homeequity',
      { attomid: attomId },
    )

    const raw = data.property?.[0] as Record<string, unknown> | undefined
    if (!raw) {
      throw new AttomApiError('Property not found', 404, 'valuation/homeequity')
    }

    const avm = raw.avm as Record<string, unknown> | undefined
    const amount = avm?.amount as Record<string, unknown> | undefined
    const equity = raw.equity as Record<string, unknown> | undefined
    const sale = raw.sale as Record<string, unknown> | undefined
    const saleAmount = sale?.amount as Record<string, unknown> | undefined

    const mid = (amount?.value as number) ?? null
    const fsd = (avm?.fsd as number) ?? null
    const low = mid && fsd ? Math.round(mid * (1 - fsd)) : null
    const high = mid && fsd ? Math.round(mid * (1 + fsd)) : null
    const sqft = ((raw.building as Record<string, unknown> | undefined)?.size as Record<string, unknown> | undefined)?.livingSize as number | undefined

    return {
      attomId: Number(attomId),
      value: {
        low,
        mid,
        high,
        valuePerSqft: mid && sqft ? Math.round(mid / sqft) : null,
      },
      confidence: {
        score: (avm?.confidence as number) ?? null,
        fsd,
      },
      assessedValue: (raw.assessment as Record<string, unknown> | undefined)?.assessed
        ? ((raw.assessment as Record<string, unknown>).assessed as Record<string, unknown>)?.assdTtlValue as number ?? null
        : null,
      calculatedEquity: equity
        ? {
            estimatedValue: (equity.estimatedValue as number) ?? mid,
            totalLiens: (equity.totalLiens as number) ?? null,
            estimatedEquity: (equity.estimatedEquity as number) ?? null,
            equityPercent: (equity.equityPercent as number) ?? null,
            ltv: (equity.ltv as number) ?? null,
          }
        : null,
      lastSalePrice: (saleAmount?.saleAmt as number) ?? null,
      lastSaleDate: (saleAmount?.saleRecDate as string) ?? null,
      valuationDate: (avm?.eventDate as string) ?? new Date().toISOString().slice(0, 10),
    }
  }

  // ── 10. getComps ────────────────────────────────────────────────────────

  /**
   * Get comparable sales near a property.
   * ATTOM endpoint: GET /propertyapi/v1.0.0/sale/comparables
   */
  async getComps(
    attomId: string,
    params?: AttomCompSearchParams,
  ): Promise<AttomComp[]> {
    const query: Record<string, string> = {
      attomid: attomId,
      searchradius: this.str(params?.radius ?? 1)!,
      maxcomps: this.str(params?.maxComps ?? 10)!,
      months: this.str(params?.months ?? 6)!,
    }

    const data = await this.request<{ property: unknown[] }>(
      '/propertyapi/v1.0.0/sale/comparables',
      query,
    )

    const raw = data.property ?? []

    return raw.map((item: unknown) => {
      const p = item as Record<string, unknown>
      const address = p.address as Record<string, unknown> | undefined
      const location = p.location as Record<string, unknown> | undefined
      const building = p.building as Record<string, unknown> | undefined
      const rooms = (building?.rooms as Record<string, unknown>) ?? {}
      const size = (building?.size as Record<string, unknown>) ?? {}
      const summary = p.summary as Record<string, unknown> | undefined
      const sale = p.sale as Record<string, unknown> | undefined
      const saleAmount = sale?.amount as Record<string, unknown> | undefined
      const lot = p.lot as Record<string, unknown> | undefined

      const salePrice = (saleAmount?.saleAmt as number) ?? null
      const sqft = (size?.livingSize as number) ?? (size?.bldgSize as number) ?? null

      return {
        attomId: (p.identifier as Record<string, unknown>)?.attomId as number ?? 0,
        address: {
          line1: (address?.line1 as string) ?? '',
          line2: (address?.line2 as string) ?? null,
          locality: (address?.locality as string) ?? '',
          countrySubd: (address?.countrySubd as string) ?? '',
          postal1: (address?.postal1 as string) ?? '',
          postal2: (address?.postal2 as string) ?? null,
          oneLine: (address?.oneLine as string) ?? '',
        },
        location: {
          latitude: (location?.latitude as number) ?? 0,
          longitude: (location?.longitude as number) ?? 0,
          accuracy: (location?.accuracy as string) ?? null,
          geoid: (location?.geoid as string) ?? null,
          geoIdV4: null,
        },
        property: {
          propertyType: (summary?.propertyType as string) ?? null,
          beds: (rooms?.beds as number) ?? null,
          baths: (rooms?.bathsTotal as number) ?? null,
          sqft,
          yearBuilt: (summary?.yearBuilt as number) ?? null,
          lotSize: (lot?.lotSize1 as number) ?? null,
        },
        sale: {
          saleDate: (saleAmount?.saleRecDate as string) ?? null,
          salePrice,
          pricePerSqft: salePrice && sqft ? Math.round(salePrice / sqft) : null,
          saleType: (saleAmount?.saleCode as string) ?? null,
          cashOrMortgage: (sale?.cashOrMortgage as string) ?? null,
          daysOnMarket: (sale?.daysOnMarket as number) ?? null,
        },
        distance: (p.distance as number) ?? null,
        similarity: {
          score: (p.similarityScore as number) ?? null,
          adjustedPrice: (p.adjustedPrice as number) ?? null,
        },
      } satisfies AttomComp
    })
  }
}

// ── Utility ─────────────────────────────────────────────────────────────────

function getMonthsAgoDate(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}
