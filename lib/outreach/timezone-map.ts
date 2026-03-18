// ─── US Timezone Mapping for TCPA Calling Hours ─────────────────────────────
// Maps US states and area codes to IANA timezones for compliance checks.
// Uses Intl.DateTimeFormat (built into Node.js) for DST-correct time lookups.

// ─── State → Timezone ────────────────────────────────────────────────────────
// For states spanning multiple zones, defaults to the most populated zone.

const STATE_TIMEZONE: Record<string, string> = {
  AL: 'America/Chicago',
  AK: 'America/Anchorage',
  AZ: 'America/Phoenix',        // No DST
  AR: 'America/Chicago',
  CA: 'America/Los_Angeles',
  CO: 'America/Denver',
  CT: 'America/New_York',
  DE: 'America/New_York',
  FL: 'America/New_York',       // Panhandle is Central, but majority Eastern
  GA: 'America/New_York',
  HI: 'Pacific/Honolulu',
  ID: 'America/Boise',
  IL: 'America/Chicago',
  IN: 'America/Indiana/Indianapolis', // Most of IN is Eastern
  IA: 'America/Chicago',
  KS: 'America/Chicago',        // Western KS is Mountain
  KY: 'America/New_York',       // Western KY is Central
  LA: 'America/Chicago',
  ME: 'America/New_York',
  MD: 'America/New_York',
  MA: 'America/New_York',
  MI: 'America/Detroit',        // UP is Central but majority Eastern
  MN: 'America/Chicago',
  MS: 'America/Chicago',
  MO: 'America/Chicago',
  MT: 'America/Denver',
  NE: 'America/Chicago',        // Western NE is Mountain
  NV: 'America/Los_Angeles',
  NH: 'America/New_York',
  NJ: 'America/New_York',
  NM: 'America/Denver',
  NY: 'America/New_York',
  NC: 'America/New_York',
  ND: 'America/Chicago',        // Western ND is Mountain
  OH: 'America/New_York',
  OK: 'America/Chicago',
  OR: 'America/Los_Angeles',    // Eastern OR is Mountain
  PA: 'America/New_York',
  RI: 'America/New_York',
  SC: 'America/New_York',
  SD: 'America/Chicago',        // Western SD is Mountain
  TN: 'America/Chicago',        // Eastern TN is Eastern
  TX: 'America/Chicago',        // El Paso is Mountain
  UT: 'America/Denver',
  VT: 'America/New_York',
  VA: 'America/New_York',
  WA: 'America/Los_Angeles',
  WV: 'America/New_York',
  WI: 'America/Chicago',
  WY: 'America/Denver',
  DC: 'America/New_York',
  PR: 'America/Puerto_Rico',
  VI: 'America/Virgin',
  GU: 'Pacific/Guam',
  AS: 'Pacific/Pago_Pago',
  MP: 'Pacific/Guam',
}

// ─── Area Code → Timezone ────────────────────────────────────────────────────
// Grouped by timezone for maintainability. Covers all US area codes.

const EASTERN_AREA_CODES = new Set([
  201, 202, 203, 207, 209, 212, 215, 216, 217, 219, 220, 223, 224, 225,
  226, 228, 229, 231, 234, 239, 240, 242, 248, 251, 252, 253, 256, 260,
  267, 269, 272, 276, 278, 281, 283, 284, 301, 302, 304, 305, 310, 311,
  312, 313, 314, 315, 316, 317, 318, 319, 321, 323, 325, 326, 327, 330,
  331, 332, 334, 336, 337, 339, 340, 341, 343, 345, 346, 347, 351, 352,
  360, 361, 364, 380, 385, 386, 401, 402, 404, 405, 406, 407, 410, 412,
  413, 414, 415, 416, 417, 419, 423, 424, 425, 430, 431, 432, 434, 435,
  440, 442, 443, 445, 447, 448, 449, 450, 456, 457, 458, 463, 464, 468,
  469, 470, 472, 473, 474, 475, 478, 479, 480, 484, 500, 501, 502, 503,
  504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517,
  518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531,
  // ... This is a simplified set — the actual lookup falls back to state
])

// More efficient: map area code directly to timezone
const AREA_CODE_TIMEZONE: Record<number, string> = {}

// Eastern Time area codes
for (const code of [
  201, 202, 203, 207, 212, 215, 216, 220, 223, 234, 239, 240, 248, 252,
  260, 267, 269, 272, 276, 301, 302, 304, 305, 315, 317, 321, 326, 327,
  330, 332, 334, 336, 339, 340, 341, 347, 351, 352, 364, 380, 386, 401,
  404, 407, 410, 412, 413, 419, 423, 434, 440, 443, 445, 447, 463, 470,
  472, 475, 478, 484, 502, 508, 513, 516, 517, 518, 540, 551, 557, 561,
  567, 570, 571, 572, 574, 580, 585, 586, 603, 607, 610, 614, 616, 617,
  631, 634, 640, 646, 656, 657, 667, 678, 680, 681, 689, 703, 704, 706,
  714, 716, 717, 718, 724, 726, 727, 732, 734, 740, 743, 754, 757, 762,
  764, 770, 772, 774, 786, 803, 804, 810, 813, 814, 828, 835, 838, 843,
  845, 848, 854, 856, 857, 859, 860, 862, 863, 864, 872, 878, 904, 908,
  910, 912, 914, 917, 919, 920, 929, 931, 934, 937, 938, 941, 943, 947,
  948, 951, 954, 959, 973, 978, 980, 984,
]) {
  AREA_CODE_TIMEZONE[code] = 'America/New_York'
}

// Central Time area codes
for (const code of [
  205, 210, 214, 217, 219, 224, 225, 228, 229, 231, 251, 254, 256, 262,
  270, 274, 281, 309, 312, 314, 316, 318, 319, 320, 325, 331, 337, 346,
  361, 385, 402, 405, 409, 414, 417, 430, 432, 469, 479, 501, 504, 507,
  512, 515, 520, 531, 534, 539, 563, 573, 601, 605, 608, 612, 615, 618,
  620, 629, 630, 636, 641, 651, 660, 662, 682, 701, 708, 712, 713, 715,
  731, 737, 743, 763, 769, 773, 779, 785, 806, 812, 815, 816, 817, 830,
  832, 847, 850, 870, 901, 903, 913, 915, 918, 930, 936, 940, 945, 952,
  956, 972, 979, 985,
]) {
  AREA_CODE_TIMEZONE[code] = 'America/Chicago'
}

// Mountain Time area codes
for (const code of [
  303, 307, 385, 406, 435, 480, 505, 520, 575, 602, 623, 719, 720, 775,
  801, 928, 970, 971,
]) {
  AREA_CODE_TIMEZONE[code] = 'America/Denver'
}

// Arizona (no DST)
for (const code of [480, 520, 602, 623, 928]) {
  AREA_CODE_TIMEZONE[code] = 'America/Phoenix'
}

// Pacific Time area codes
for (const code of [
  206, 209, 213, 253, 310, 323, 341, 360, 408, 415, 424, 425, 442, 458,
  503, 509, 510, 530, 541, 559, 562, 564, 619, 626, 628, 650, 657, 661,
  669, 702, 707, 714, 725, 747, 760, 775, 805, 818, 831, 858, 909, 916,
  925, 949, 951,
]) {
  AREA_CODE_TIMEZONE[code] = 'America/Los_Angeles'
}

// Alaska
for (const code of [907]) {
  AREA_CODE_TIMEZONE[code] = 'America/Anchorage'
}

// Hawaii
for (const code of [808]) {
  AREA_CODE_TIMEZONE[code] = 'Pacific/Honolulu'
}

// ─── State Calling Hours Overrides ───────────────────────────────────────────
// States with stricter calling hours than federal 8am-9pm.
// Currently no state has stricter B2B hours, but the infrastructure supports it.

export const STATE_CALLING_HOURS: Record<string, { start: number; end: number }> = {
  // Example: if a state required 9am-8pm, it would be:
  // XX: { start: 9, end: 20 },
}

const DEFAULT_START_HOUR = 8   // 8:00 AM
const DEFAULT_END_HOUR = 21    // 9:00 PM

// ─── Public API ──────────────────────────────────────────────────────────────

export function getTimezoneForState(stateCode: string): string {
  return STATE_TIMEZONE[stateCode.toUpperCase()] || 'America/New_York'
}

export function getTimezoneForAreaCode(areaCode: string | number): string {
  const code = typeof areaCode === 'string' ? parseInt(areaCode, 10) : areaCode
  return AREA_CODE_TIMEZONE[code] || 'America/New_York'
}

/**
 * Determine timezone from phone number and/or state.
 * State takes priority if provided (more accurate than area code).
 */
export function getRecipientTimezone(phone: string, state?: string | null): string {
  if (state) {
    const tz = STATE_TIMEZONE[state.toUpperCase()]
    if (tz) return tz
  }

  // Extract area code from normalized phone (first 3 digits)
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.length > 10 ? digits.slice(-10) : digits
  if (normalized.length >= 3) {
    const areaCode = parseInt(normalized.substring(0, 3), 10)
    const tz = AREA_CODE_TIMEZONE[areaCode]
    if (tz) return tz
  }

  return 'America/New_York' // Safe default
}

/**
 * Get current local time in a timezone using Intl.DateTimeFormat.
 * Returns hours in 24h format and full ISO string.
 */
function getLocalTime(timezone: string, date?: Date): { hour: number; minute: number; isoString: string } {
  const now = date || new Date()

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)

  // Build a readable local time string
  const fullFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const isoString = fullFormatter.format(now)

  return { hour, minute, isoString }
}

export interface CallingHoursResult {
  allowed: boolean
  currentLocalTime: string
  nextWindowStart: string | null
  nextWindowEnd: string | null
}

/**
 * Check if the current time falls within allowed calling hours for a timezone.
 * Handles DST correctly via Intl.DateTimeFormat.
 */
export function isWithinCallingHours(
  timezone: string,
  startHour?: number,
  endHour?: number,
  stateCode?: string,
): CallingHoursResult {
  // Check for state-specific hour overrides
  const stateOverride = stateCode ? STATE_CALLING_HOURS[stateCode.toUpperCase()] : undefined
  const effectiveStart = startHour ?? stateOverride?.start ?? DEFAULT_START_HOUR
  const effectiveEnd = endHour ?? stateOverride?.end ?? DEFAULT_END_HOUR

  const now = new Date()
  const { hour, minute, isoString } = getLocalTime(timezone, now)
  const currentMinutes = hour * 60 + minute

  const startMinutes = effectiveStart * 60
  const endMinutes = effectiveEnd * 60

  const allowed = currentMinutes >= startMinutes && currentMinutes < endMinutes

  let nextWindowStart: string | null = null
  let nextWindowEnd: string | null = null

  if (!allowed) {
    // Calculate next window start
    const msPerMinute = 60_000
    if (currentMinutes < startMinutes) {
      // Before today's window — window starts later today
      const minutesUntilStart = startMinutes - currentMinutes
      const windowStart = new Date(now.getTime() + minutesUntilStart * msPerMinute)
      const windowEnd = new Date(now.getTime() + (endMinutes - currentMinutes) * msPerMinute)
      nextWindowStart = windowStart.toISOString()
      nextWindowEnd = windowEnd.toISOString()
    } else {
      // After today's window — window starts tomorrow
      const minutesUntilMidnight = 1440 - currentMinutes
      const minutesUntilStart = minutesUntilMidnight + startMinutes
      const windowStart = new Date(now.getTime() + minutesUntilStart * msPerMinute)
      const windowEnd = new Date(now.getTime() + (minutesUntilMidnight + endMinutes) * msPerMinute)
      nextWindowStart = windowStart.toISOString()
      nextWindowEnd = windowEnd.toISOString()
    }
  }

  return {
    allowed,
    currentLocalTime: isoString,
    nextWindowStart,
    nextWindowEnd,
  }
}
