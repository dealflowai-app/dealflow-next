export interface BrandConfig {
  name: string
  logoUrl: string | null
  primaryColor: string
  accentColor: string
  customDomain: string | null
}

const DEFAULT_BRAND: BrandConfig = {
  name: 'DealFlow AI',
  logoUrl: null,
  primaryColor: '#2563EB',
  accentColor: '#1E40AF',
  customDomain: null,
}

export function getBrandConfig(profile: {
  brandName?: string | null
  brandLogoUrl?: string | null
  brandPrimaryColor?: string | null
  brandAccentColor?: string | null
  customDomain?: string | null
} | null): BrandConfig {
  if (!profile) return DEFAULT_BRAND

  return {
    name: profile.brandName || DEFAULT_BRAND.name,
    logoUrl: profile.brandLogoUrl || DEFAULT_BRAND.logoUrl,
    primaryColor: profile.brandPrimaryColor || DEFAULT_BRAND.primaryColor,
    accentColor: profile.brandAccentColor || DEFAULT_BRAND.accentColor,
    customDomain: profile.customDomain || DEFAULT_BRAND.customDomain,
  }
}

export function brandCssVars(config: BrandConfig): Record<string, string> {
  return {
    '--brand-primary': config.primaryColor,
    '--brand-accent': config.accentColor,
  }
}
