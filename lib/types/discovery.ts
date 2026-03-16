export interface DiscoveryProperty {
  id: string;
  userId: string | null;
  rentcastId: string | null;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  assessedValue: number | null;
  taxAmount: number | null;
  lastSaleDate: string | null;
  lastSalePrice: number | null;
  ownerName: string | null;
  ownerOccupied: boolean | null;
  phone: string | null;
  email: string | null;
  mailingAddress: string | null;
  features: Record<string, unknown> | null;
  rawResponse: Record<string, unknown> | null;
  searchCity: string | null;
  searchZip: string | null;
  cachedAt: string;
  expiresAt: string;
}

export interface DiscoverySearchParams {
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;
  bedroomsMin?: number;
  bedroomsMax?: number;
  bathroomsMin?: number;
  bathroomsMax?: number;
  sqftMin?: number;
  sqftMax?: number;
  limit?: number;
  offset?: number;
}

export interface DiscoverySearchResult {
  properties: DiscoveryProperty[];
  total: number;
  fromCache: boolean;
}
