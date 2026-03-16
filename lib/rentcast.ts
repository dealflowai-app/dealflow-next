const RENTCAST_BASE_URL = "https://api.rentcast.io/v1";

// ─── RESPONSE TYPES ─────────────────────────────────────────────────────────

export interface RentCastTaxAssessment {
  year: number;
  value: number;
  land: number;
  improvements: number;
}

export interface RentCastProperty {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  assessedValue: number | null;
  taxAssessment: RentCastTaxAssessment[] | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  ownerName: string | null;
  ownerOccupied: boolean | null;
  features: Record<string, unknown> | null;
}

export interface RentCastComparable {
  formattedAddress: string;
  city: string;
  state: string;
  zipCode: string;
  price: number | null;
  squareFootage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  listedDate: string | null;
  distance: number | null;
  correlation: number | null;
}

export interface RentCastValuation {
  value: number | null;
  valueRangeLow: number | null;
  valueRangeHigh: number | null;
  comparables: RentCastComparable[];
}

export interface RentCastRentComparable {
  formattedAddress: string;
  city: string;
  state: string;
  zipCode: string;
  rent: number | null;
  squareFootage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  listedDate: string | null;
  distance: number | null;
  correlation: number | null;
}

export interface RentCastRentEstimate {
  rent: number | null;
  rentRangeLow: number | null;
  rentRangeHigh: number | null;
  comparables: RentCastRentComparable[];
}

// ─── ERROR ──────────────────────────────────────────────────────────────────

export class RentCastError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RentCastError";
    this.status = status;
  }
}

// ─── SEARCH PARAMS ──────────────────────────────────────────────────────────

export interface SearchPropertiesParams {
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;   // "Single Family|Multi Family" pipe-separated
  bedrooms?: string;       // "2:4" range format
  bathrooms?: string;      // "1:3" range format
  squareFootage?: string;  // "1000:3000" range format
  limit?: number;          // max 500
  offset?: number;
}

// ─── CLIENT ─────────────────────────────────────────────────────────────────

export class RentCastClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${RENTCAST_BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const res = await fetch(url.toString(), {
      headers: { "X-Api-Key": this.apiKey },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "Unknown error");
      console.error(`RentCast API error: ${res.status} ${path} — ${body}`);
      throw new RentCastError(res.status, `RentCast API returned ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async searchProperties(params: SearchPropertiesParams): Promise<RentCastProperty[]> {
    const query: Record<string, string> = {};
    if (params.city) query.city = params.city;
    if (params.state) query.state = params.state;
    if (params.zipCode) query.zipCode = params.zipCode;
    if (params.propertyType) query.propertyType = params.propertyType;
    if (params.bedrooms) query.bedrooms = params.bedrooms;
    if (params.bathrooms) query.bathrooms = params.bathrooms;
    if (params.squareFootage) query.squareFootage = params.squareFootage;
    if (params.limit !== undefined) query.limit = String(Math.min(params.limit, 500));
    if (params.offset !== undefined) query.offset = String(params.offset);

    return this.request<RentCastProperty[]>("/properties", query);
  }

  async getPropertyByAddress(address: string): Promise<RentCastProperty | null> {
    const results = await this.request<RentCastProperty[]>("/properties", {
      address,
      limit: "1",
    });
    return results[0] ?? null;
  }

  async getValueEstimate(address: string): Promise<RentCastValuation> {
    return this.request<RentCastValuation>("/avm/value", { address });
  }

  async getRentEstimate(address: string): Promise<RentCastRentEstimate> {
    return this.request<RentCastRentEstimate>("/avm/rent/long-term", { address });
  }
}

// ─── SINGLETON ──────────────────────────────────────────────────────────────

let _client: RentCastClient | null = null;

export function getRentCastClient(): RentCastClient {
  if (!_client) {
    const key = process.env.RENTCAST_API_KEY;
    if (!key) {
      throw new Error("RENTCAST_API_KEY environment variable is not set");
    }
    _client = new RentCastClient(key);
  }
  return _client;
}
