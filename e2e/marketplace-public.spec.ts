import { test, expect } from '@playwright/test'

/**
 * Tests the public marketplace API and page.
 * The marketplace listings endpoint is public (no auth required).
 */
test.describe('Marketplace public API', () => {
  test('GET /api/marketplace/listings returns 200', async ({ request }) => {
    const response = await request.get('/api/marketplace/listings')
    expect(response.status()).toBe(200)
  })

  test('GET /api/marketplace/listings returns JSON with listings array', async ({ request }) => {
    const response = await request.get('/api/marketplace/listings')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toHaveProperty('listings')
    expect(Array.isArray(body.listings)).toBe(true)
  })

  test('GET /api/marketplace/listings returns pagination fields', async ({ request }) => {
    const response = await request.get('/api/marketplace/listings')
    const body = await response.json()

    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('limit')
    expect(body).toHaveProperty('offset')
    expect(typeof body.total).toBe('number')
    expect(typeof body.limit).toBe('number')
    expect(typeof body.offset).toBe('number')
  })

  test('GET /api/marketplace/listings respects limit parameter', async ({ request }) => {
    const response = await request.get('/api/marketplace/listings?limit=5')
    const body = await response.json()

    expect(response.status()).toBe(200)
    expect(body.limit).toBe(5)
    expect(body.listings.length).toBeLessThanOrEqual(5)
  })

  test('GET /api/marketplace/listings supports city filter', async ({ request }) => {
    const response = await request.get('/api/marketplace/listings?city=Dallas')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(Array.isArray(body.listings)).toBe(true)
  })

  test('GET /api/marketplace/listings supports sort parameter', async ({ request }) => {
    const response = await request.get('/api/marketplace/listings?sort=price_asc')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(Array.isArray(body.listings)).toBe(true)
  })
})

test.describe('Marketplace page', () => {
  test('visiting /marketplace redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/marketplace')
    await page.waitForURL(/\/login/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})

test.describe('Marketplace POST requires auth', () => {
  test('POST /api/marketplace/listings without auth returns 401', async ({ request }) => {
    const response = await request.post('/api/marketplace/listings', {
      data: { dealId: 'fake-deal-id', headline: 'Test Listing' },
    })
    expect(response.status()).toBe(401)
  })
})
