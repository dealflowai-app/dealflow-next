'use client'

import { useState, useRef, useCallback } from 'react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export interface GeocodeSuggestion {
  id: string
  text: string        // e.g. "Dallas"
  placeName: string   // e.g. "Dallas, Texas, United States"
  displayText: string // e.g. "Dallas, TX"
}

function abbreviateState(fullName: string): string {
  const map: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
  }
  return map[fullName] ?? fullName
}

function formatDisplay(placeName: string, text: string): string {
  // placeName is like "Dallas, Texas, United States" or "75201, Dallas, Texas, United States"
  const parts = placeName.split(', ')
  if (parts.length >= 3) {
    // For zip codes the first part is the zip
    if (/^\d{5}/.test(parts[0])) {
      return parts[0] // Just return the zip
    }
    // For cities: "City, ST"
    const state = abbreviateState(parts[parts.length - 2])
    return `${text}, ${state}`
  }
  return placeName
}

export function useMapboxGeocode() {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((query: string) => {
    // Clear previous
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)

      try {
        // Use Mapbox Geocoding API v5
        const params = new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          country: 'us',
          types: 'place,postcode',
          limit: '6',
          autocomplete: 'true',
        })

        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?${params}`,
          { signal: controller.signal },
        )

        if (!res.ok) {
          setSuggestions([])
          return
        }

        const data = await res.json()
        const results: GeocodeSuggestion[] = (data.features || []).map(
          (f: { id: string; text: string; place_name: string }) => ({
            id: f.id,
            text: f.text,
            placeName: f.place_name,
            displayText: formatDisplay(f.place_name, f.text),
          }),
        )

        setSuggestions(results)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [])

  const clear = useCallback(() => {
    setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
  }, [])

  return { suggestions, loading, search, clear }
}
