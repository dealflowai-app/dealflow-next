import { test, expect } from '@playwright/test'

/**
 * Tests that key API routes respond with correct status codes.
 * Covers public endpoints, auth-protected endpoints, and cron-secret endpoints.
 */
test.describe('Public API routes', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
  })

  test('GET /api/marketplace/listings returns 200', async ({ request }) => {
    const response = await request.get('/api/marketplace/listings')
    expect(response.status()).toBe(200)
  })
})

test.describe('Auth-protected API routes return 401 without credentials', () => {
  test('POST /api/deals without auth returns 401', async ({ request }) => {
    const response = await request.post('/api/deals', {
      data: {
        address: '123 Test St',
        city: 'Dallas',
        state: 'TX',
        zip: '75201',
        askingPrice: 100000,
      },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/deals without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/deals')
    expect(response.status()).toBe(401)
  })

  test('POST /api/crm/buyers without auth returns 401', async ({ request }) => {
    const response = await request.post('/api/crm/buyers', {
      data: {
        firstName: 'Test',
        lastName: 'Buyer',
        email: 'test@example.com',
      },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/crm/buyers without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/crm/buyers')
    expect(response.status()).toBe(401)
  })

  test('GET /api/feed/posts without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/feed/posts')
    expect(response.status()).toBe(401)
  })

  test('GET /api/outreach/campaigns without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/outreach/campaigns')
    expect(response.status()).toBe(401)
  })

  test('GET /api/contracts without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/contracts')
    expect(response.status()).toBe(401)
  })

  test('GET /api/chat/conversations without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/chat/conversations')
    expect(response.status()).toBe(401)
  })

  test('GET /api/dashboard without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/dashboard')
    expect(response.status()).toBe(401)
  })

  test('GET /api/notifications without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/notifications')
    expect(response.status()).toBe(401)
  })
})

test.describe('Cron-secret-protected routes return 401 without CRON_SECRET', () => {
  test('GET /api/cron/match without CRON_SECRET returns 401', async ({ request }) => {
    const response = await request.get('/api/cron/match')
    expect(response.status()).toBe(401)
  })

  test('GET /api/cron/campaigns without CRON_SECRET returns 401', async ({ request }) => {
    const response = await request.get('/api/cron/campaigns')
    expect(response.status()).toBe(401)
  })

  test('GET /api/cron/digest without CRON_SECRET returns 401', async ({ request }) => {
    const response = await request.get('/api/cron/digest')
    expect(response.status()).toBe(401)
  })

  test('GET /api/health?detail without secret returns 401', async ({ request }) => {
    const response = await request.get('/api/health?detail')
    expect(response.status()).toBe(401)
  })
})
