/**
 * Address Normalization & Matching
 *
 * Normalizes messy street addresses for reliable comparison.
 * Used by the daisy chain detection system.
 */

/* ═══════════════════════════════════════════════
   ABBREVIATION MAPS
   ═══════════════════════════════════════════════ */

// Normalize long forms → standard abbreviations (USPS style)
const STREET_ABBREVS: [RegExp, string][] = [
  [/\bSTREET\b/g, 'ST'],
  [/\bAVENUE\b/g, 'AVE'],
  [/\bBOULEVARD\b/g, 'BLVD'],
  [/\bDRIVE\b/g, 'DR'],
  [/\bLANE\b/g, 'LN'],
  [/\bROAD\b/g, 'RD'],
  [/\bCOURT\b/g, 'CT'],
  [/\bPLACE\b/g, 'PL'],
  [/\bCIRCLE\b/g, 'CIR'],
  [/\bPARKWAY\b/g, 'PKWY'],
  [/\bHIGHWAY\b/g, 'HWY'],
  [/\bTERRACE\b/g, 'TER'],
  [/\bTRAIL\b/g, 'TRL'],
  [/\bSQUARE\b/g, 'SQ'],
  [/\bPOINT\b/g, 'PT'],
  [/\bWAY\b/g, 'WAY'],
  [/\bCROSSING\b/g, 'XING'],
  [/\bEXPRESSWAY\b/g, 'EXPY'],
]

// Directional normalization: long → abbreviation
const DIRECTIONALS: [RegExp, string][] = [
  [/\bNORTH\b/g, 'N'],
  [/\bSOUTH\b/g, 'S'],
  [/\bEAST\b/g, 'E'],
  [/\bWEST\b/g, 'W'],
  [/\bNORTHEAST\b/g, 'NE'],
  [/\bNORTHWEST\b/g, 'NW'],
  [/\bSOUTHEAST\b/g, 'SE'],
  [/\bSOUTHWEST\b/g, 'SW'],
]

// Unit/apartment suffixes to strip
const UNIT_PATTERN = /\b(APT|APARTMENT|UNIT|STE|SUITE|#|BLDG|BUILDING|FL|FLOOR|RM|ROOM)\s*[A-Z0-9#-]*$/i

/* ═══════════════════════════════════════════════
   NORMALIZE ADDRESS
   ═══════════════════════════════════════════════ */

export function normalizeAddress(address: string): string {
  let s = address.toUpperCase().trim()

  // Strip periods (e.g. "St." → "ST")
  s = s.replace(/\./g, '')

  // Strip commas
  s = s.replace(/,/g, '')

  // Strip apartment/unit/suite suffixes
  s = s.replace(UNIT_PATTERN, '')

  // Normalize directionals
  for (const [pattern, abbrev] of DIRECTIONALS) {
    s = s.replace(pattern, abbrev)
  }

  // Normalize street type long forms → abbreviations
  for (const [pattern, abbrev] of STREET_ABBREVS) {
    s = s.replace(pattern, abbrev)
  }

  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim()

  return s
}

/* ═══════════════════════════════════════════════
   NORMALIZE CITY
   ═══════════════════════════════════════════════ */

export function normalizeCity(city: string): string {
  return city.toUpperCase().trim().replace(/\./g, '').replace(/\s+/g, ' ')
}

/* ═══════════════════════════════════════════════
   ADDRESS MATCHING
   ═══════════════════════════════════════════════ */

export type MatchConfidence = 'exact' | 'high' | 'partial'

export interface AddressMatchResult {
  isMatch: boolean
  confidence: MatchConfidence
}

export function addressMatch(
  addr1: string, city1: string, state1: string,
  addr2: string, city2: string, state2: string,
): AddressMatchResult {
  const normAddr1 = normalizeAddress(addr1)
  const normAddr2 = normalizeAddress(addr2)

  if (normAddr1 !== normAddr2) {
    return { isMatch: false, confidence: 'partial' }
  }

  const normState1 = state1.toUpperCase().trim()
  const normState2 = state2.toUpperCase().trim()
  const normCity1 = normalizeCity(city1)
  const normCity2 = normalizeCity(city2)

  // Address matches + city matches + state matches = exact
  if (normCity1 === normCity2 && normState1 === normState2) {
    return { isMatch: true, confidence: 'exact' }
  }

  // Address matches + state matches (city may differ: neighborhoods, suburbs)
  if (normState1 === normState2) {
    return { isMatch: true, confidence: 'high' }
  }

  // Address matches but different state — likely different properties
  return { isMatch: true, confidence: 'partial' }
}
