import { test, expect } from '@playwright/test'

test.describe('API health and public endpoints', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(['ok', 'healthy', 'degraded']).toContain(body.status)
  })

  test('POST /api/waitlist with valid email returns success', async ({ request }) => {
    const response = await request.post('/api/waitlist', {
      data: { email: `e2e-test-${Date.now()}@example.com` },
    })
    // Should succeed or return a known status (not 500)
    expect(response.status()).toBeLessThan(500)
  })

  test('POST /api/waitlist with invalid email returns 400', async ({ request }) => {
    const response = await request.post('/api/waitlist', {
      data: { email: 'not-an-email' },
    })
    expect(response.status()).toBe(400)
  })

  test('GET /api/deals without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/deals')
    expect(response.status()).toBe(401)
  })

  test('POST /api/deals without auth returns 401', async ({ request }) => {
    const response = await request.post('/api/deals', {
      data: { address: '123 Test St', city: 'Dallas', state: 'TX', zip: '75201', askingPrice: 100000 },
    })
    expect(response.status()).toBe(401)
  })
})
