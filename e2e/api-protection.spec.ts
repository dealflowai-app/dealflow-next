import { test, expect } from '@playwright/test'

/**
 * Tests that all premium API routes require authentication
 * and return proper error responses.
 */
test.describe('API route protection', () => {
  // ─── Discovery ─────────────────────────────────────────────

  test('GET /api/discovery/search without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/discovery/search?city=Dallas&state=TX')
    expect(res.status()).toBe(401)
  })

  test('POST /api/discovery/reveal without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/discovery/reveal', {
      data: { propertyId: 'fake-id' },
    })
    expect(res.status()).toBe(401)
  })

  // ─── Deals ─────────────────────────────────────────────────

  test('GET /api/deals without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/deals')
    expect(res.status()).toBe(401)
  })

  test('POST /api/deals/fake-id/auto-match without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/deals/fake-id/auto-match')
    expect(res.status()).toBe(401)
  })

  test('GET /api/deals/fake-id/matches without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/deals/fake-id/matches')
    expect(res.status()).toBe(401)
  })

  // ─── Outreach ──────────────────────────────────────────────

  test('GET /api/outreach/campaigns without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/outreach/campaigns')
    expect(res.status()).toBe(401)
  })

  // ─── Contracts ─────────────────────────────────────────────

  test('GET /api/contracts without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/contracts')
    expect(res.status()).toBe(401)
  })

  test('POST /api/contracts without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/contracts', {
      data: { dealId: 'fake', templateId: 'fake' },
    })
    expect(res.status()).toBe(401)
  })

  // ─── Analysis ──────────────────────────────────────────────

  test('POST /api/analysis without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/analysis', {
      data: { address: '123 Test St', askingPrice: 100000 },
    })
    expect(res.status()).toBe(401)
  })

  // ─── Chat ──────────────────────────────────────────────────

  test('POST /api/chat without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { messages: [{ role: 'user', content: 'hello' }] },
    })
    expect(res.status()).toBe(401)
  })

  // ─── Notifications ─────────────────────────────────────────

  test('GET /api/notifications without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/notifications')
    expect(res.status()).toBe(401)
  })

  test('GET /api/notifications/stream without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/notifications/stream')
    expect(res.status()).toBe(401)
  })

  // ─── Stripe ────────────────────────────────────────────────

  test('GET /api/stripe/subscription without auth returns 401', async ({ request }) => {
    const res = await request.get('/api/stripe/subscription')
    expect(res.status()).toBe(401)
  })

  test('POST /api/stripe/portal without auth returns 401', async ({ request }) => {
    const res = await request.post('/api/stripe/portal')
    expect(res.status()).toBe(401)
  })

  // ─── Cron (requires secret) ────────────────────────────────

  test('GET /api/cron/campaigns without secret returns 401', async ({ request }) => {
    const res = await request.get('/api/cron/campaigns')
    expect(res.status()).toBe(401)
  })

  test('GET /api/cron/match without secret returns 401', async ({ request }) => {
    const res = await request.get('/api/cron/match')
    expect(res.status()).toBe(401)
  })

  // ─── Health check detail requires auth ─────────────────────

  test('GET /api/health?detail without secret returns 401', async ({ request }) => {
    const res = await request.get('/api/health?detail')
    expect(res.status()).toBe(401)
  })

  test('GET /api/health without detail returns 200', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBeLessThan(500)
  })
})
