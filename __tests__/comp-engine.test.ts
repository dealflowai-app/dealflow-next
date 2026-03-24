import { describe, it, expect } from 'vitest'
import { scoreAndFilterComps, type SubjectProperty, type ScoredComp } from '@/lib/analysis/comp-engine'
import type { SaleComp } from '@/lib/analysis/property-lookup'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function recentDate(monthsAgo: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toISOString().slice(0, 10)
}

function makeComp(overrides: Partial<SaleComp> = {}): SaleComp {
  return {
    address: '123 Test St',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    price: 200_000,
    sqft: 1500,
    beds: 3,
    baths: 2,
    propertyType: 'Single Family',
    saleDate: recentDate(2),
    distance: 0.5,
    correlation: 0.9,
    pricePerSqft: 133,
    ...overrides,
  }
}

const subject: SubjectProperty = {
  sqft: 1500,
  beds: 3,
  baths: 2,
  yearBuilt: 1990,
  propertyType: 'Single Family',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('scoreAndFilterComps', () => {
  it('returns empty array for no comps', () => {
    expect(scoreAndFilterComps(subject, [])).toEqual([])
  })

  it('scores and returns comps sorted by relevanceScore descending', () => {
    const comps = [
      makeComp({ distance: 2.5, price: 180_000 }),
      makeComp({ distance: 0.2, price: 210_000 }),
    ]
    const result = scoreAndFilterComps(subject, comps)

    expect(result.length).toBe(2)
    expect(result[0].relevanceScore).toBeGreaterThanOrEqual(result[1].relevanceScore)
  })

  it('excludes comps with no price', () => {
    const comps = [
      makeComp({ price: null }),
      makeComp({ price: 200_000 }),
    ]
    const result = scoreAndFilterComps(subject, comps)

    const excluded = result.find(c => c.price === null)!
    expect(excluded.excluded).toBe(true)
    expect(excluded.excludeReason).toBe('No sale price')
    expect(excluded.flags).toContain('no_price')
  })

  it('excludes comps with zero price', () => {
    const comps = [makeComp({ price: 0 }), makeComp()]
    const result = scoreAndFilterComps(subject, comps)

    const excluded = result.find(c => c.price === 0)!
    expect(excluded.excluded).toBe(true)
    expect(excluded.flags).toContain('no_price')
  })

  it('excludes stale comps (>18 months)', () => {
    const comps = [
      makeComp({ saleDate: recentDate(24) }),
      makeComp(),
    ]
    const result = scoreAndFilterComps(subject, comps)

    const stale = result.find(c => c.saleDate === comps[0].saleDate)!
    expect(stale.excluded).toBe(true)
    expect(stale.flags).toContain('stale')
  })

  it('excludes comps that are too far (>3mi)', () => {
    const comps = [
      makeComp({ distance: 5 }),
      makeComp(),
    ]
    const result = scoreAndFilterComps(subject, comps)

    const far = result.find(c => c.distance === 5)!
    expect(far.excluded).toBe(true)
    expect(far.flags).toContain('too_far')
  })

  it('excludes comps with different property type', () => {
    const comps = [
      makeComp({ propertyType: 'Commercial' }),
      makeComp(),
    ]
    const result = scoreAndFilterComps(subject, comps)

    const diff = result.find(c => c.propertyType === 'Commercial')!
    expect(diff.excluded).toBe(true)
    expect(diff.flags).toContain('different_type')
  })

  it('detects statistical outliers when 3+ comps present', () => {
    const comps = [
      makeComp({ price: 200_000 }),
      makeComp({ price: 205_000 }),
      makeComp({ price: 195_000 }),
      makeComp({ price: 198_000 }),
      makeComp({ price: 202_000 }),
      makeComp({ price: 2_000_000 }), // extreme outlier — well beyond 2 stddev
    ]
    const result = scoreAndFilterComps(subject, comps)

    const outlier = result.find(c => c.price === 2_000_000)!
    expect(outlier.excluded).toBe(true)
    expect(outlier.flags).toContain('outlier')
  })

  it('does not run outlier detection with fewer than 3 comps', () => {
    const comps = [
      makeComp({ price: 200_000 }),
      makeComp({ price: 1_000_000 }),
    ]
    const result = scoreAndFilterComps(subject, comps)

    // Both should be included since we can't do outlier detection with <3 comps
    const active = result.filter(c => !c.excluded)
    expect(active.length).toBe(2)
  })

  it('calculates sqft price adjustment', () => {
    const smallSubject: SubjectProperty = { ...subject, sqft: 2000 }
    const comps = [makeComp({ sqft: 1500, pricePerSqft: 150, price: 225_000 })]
    const result = scoreAndFilterComps(smallSubject, comps)

    const comp = result[0]
    const sqftAdj = comp.adjustments.find(a => a.factor === 'sqft_difference')
    expect(sqftAdj).toBeDefined()
    expect(sqftAdj!.amount).toBeGreaterThan(0) // subject bigger → positive adjustment
  })

  it('calculates bedroom adjustment', () => {
    const moreBedsSubject: SubjectProperty = { ...subject, beds: 4 }
    const comps = [makeComp({ beds: 3 })]
    const result = scoreAndFilterComps(moreBedsSubject, comps)

    const bedAdj = result[0].adjustments.find(a => a.factor === 'bed_count')
    expect(bedAdj).toBeDefined()
    expect(bedAdj!.amount).toBe(5000) // 1 bed * $5000
  })

  it('calculates bathroom adjustment', () => {
    const fewerBathsSubject: SubjectProperty = { ...subject, baths: 1 }
    const comps = [makeComp({ baths: 2 })]
    const result = scoreAndFilterComps(fewerBathsSubject, comps)

    const bathAdj = result[0].adjustments.find(a => a.factor === 'bath_count')
    expect(bathAdj).toBeDefined()
    expect(bathAdj!.amount).toBe(-3000) // 1 fewer bath * $3000
  })

  it('applies adjustments to adjustedPrice', () => {
    const biggerSubject: SubjectProperty = { ...subject, beds: 5 }
    const comps = [makeComp({ beds: 3, price: 200_000 })]
    const result = scoreAndFilterComps(biggerSubject, comps)

    const comp = result[0]
    const totalAdj = comp.adjustments.reduce((s, a) => s + a.amount, 0)
    expect(comp.adjustedPrice).toBe(200_000 + totalAdj)
  })

  it('normalizes weights across active comps', () => {
    const comps = [
      makeComp({ distance: 0.2 }),
      makeComp({ distance: 1.5 }),
      makeComp({ distance: 2.5 }),
    ]
    const result = scoreAndFilterComps(subject, comps)

    const active = result.filter(c => !c.excluded)
    const totalWeight = active.reduce((s, c) => s + c.weight, 0)
    expect(totalWeight).toBeCloseTo(1, 5)
  })

  it('assigns equal weight when all scores are 0', () => {
    // Force zero scores with null everything
    const nullSubject: SubjectProperty = {
      sqft: null, beds: null, baths: null, yearBuilt: null, propertyType: null,
    }
    const comps = [
      makeComp({ distance: null, saleDate: null, sqft: null, beds: null, baths: null, correlation: 0, propertyType: null }),
      makeComp({ distance: null, saleDate: null, sqft: null, beds: null, baths: null, correlation: 0, propertyType: null }),
    ]
    const result = scoreAndFilterComps(nullSubject, comps)
    const active = result.filter(c => !c.excluded)

    // Even with moderate default scores, weights should be equal
    expect(active[0].weight).toBeCloseTo(active[1].weight, 5)
  })

  it('handles property type normalization: SFR variants', () => {
    const sfrSubject: SubjectProperty = { ...subject, propertyType: 'SFR' }
    const comps = [makeComp({ propertyType: 'Single Family Residential' })]
    const result = scoreAndFilterComps(sfrSubject, comps)

    // Should NOT be excluded — both normalize to 'sfr'
    expect(result[0].excluded).toBe(false)
  })

  it('handles property type normalization: condo/townhouse', () => {
    const condoSubject: SubjectProperty = { ...subject, propertyType: 'Condo' }
    const comps = [makeComp({ propertyType: 'Townhouse' })]
    const result = scoreAndFilterComps(condoSubject, comps)

    expect(result[0].excluded).toBe(false)
  })

  it('scores closer comps higher than distant ones', () => {
    const comps = [
      makeComp({ distance: 0.2, address: 'Close' }),
      makeComp({ distance: 2.8, address: 'Far' }),
    ]
    const result = scoreAndFilterComps(subject, comps)

    const close = result.find(c => c.address === 'Close')!
    const far = result.find(c => c.address === 'Far')!
    expect(close.relevanceScore).toBeGreaterThan(far.relevanceScore)
  })

  it('scores recent comps higher than old ones', () => {
    const comps = [
      makeComp({ saleDate: recentDate(1), address: 'Recent' }),
      makeComp({ saleDate: recentDate(15), address: 'Old' }),
    ]
    const result = scoreAndFilterComps(subject, comps)

    const recent = result.find(c => c.address === 'Recent')!
    const old = result.find(c => c.address === 'Old')!
    expect(recent.relevanceScore).toBeGreaterThan(old.relevanceScore)
  })

  it('caps relevance score at 100', () => {
    // Maximally scoring comp
    const comps = [makeComp({
      distance: 0.1,
      saleDate: recentDate(1),
      sqft: 1500,
      beds: 3,
      baths: 2,
      correlation: 1.0,
    })]
    const result = scoreAndFilterComps(subject, comps)
    expect(result[0].relevanceScore).toBeLessThanOrEqual(100)
  })
})
