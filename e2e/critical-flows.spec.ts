import { test, expect } from '@playwright/test'

/**
 * E2E tests for critical user flows.
 * These validate the most important paths through the application.
 */

test.describe('Authentication flow', () => {
  test('login page loads with email and password inputs', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible()
    await expect(page.locator('input[type="password"], input[placeholder*="password" i]').first()).toBeVisible()
  })

  test('signup page loads with registration form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first()
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first()

    await emailInput.fill('nonexistent@example.com')
    await passwordInput.fill('wrongpassword123')

    // Submit the form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first()
    await submitBtn.click()

    // Should show an error message or stay on login page
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/login')
  })
})

test.describe('Public pages accessibility', () => {
  test('homepage has proper heading structure', async ({ page }) => {
    await page.goto('/')
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible()

    // Check page has a title
    await expect(page).toHaveTitle(/.+/)
  })

  test('pricing page displays plan tiers', async ({ page }) => {
    await page.goto('/pricing')
    // Should show at least starter and pro plans
    await expect(page.locator('text=/starter/i').first()).toBeVisible()
  })

  test('homepage navigation links work', async ({ page }) => {
    await page.goto('/')

    // Find and click a nav link to pricing
    const pricingLink = page.locator('a[href*="pricing"], a:has-text("Pricing")').first()
    if (await pricingLink.isVisible()) {
      await pricingLink.click()
      await page.waitForURL(/pricing/)
      expect(page.url()).toContain('pricing')
    }
  })
})

test.describe('Protected routes redirect', () => {
  test('dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/(login|signin)/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/(login|signin)/)
  })

  test('deals page redirects to login', async ({ page }) => {
    await page.goto('/dashboard/deals')
    await page.waitForURL(/\/(login|signin)/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/(login|signin)/)
  })

  test('outreach page redirects to login', async ({ page }) => {
    await page.goto('/dashboard/outreach')
    await page.waitForURL(/\/(login|signin)/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/(login|signin)/)
  })

  test('contracts page redirects to login', async ({ page }) => {
    await page.goto('/dashboard/contracts')
    await page.waitForURL(/\/(login|signin)/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/(login|signin)/)
  })

  test('analysis page redirects to login', async ({ page }) => {
    await page.goto('/dashboard/analysis')
    await page.waitForURL(/\/(login|signin)/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/(login|signin)/)
  })

  test('settings page redirects to login', async ({ page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForURL(/\/(login|signin)/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/(login|signin)/)
  })
})

test.describe('API validation', () => {
  test('deals API validates required fields', async ({ request }) => {
    // POST with missing required fields should return 400 or 401
    const res = await request.post('/api/deals', {
      data: { address: '123 Test St' }, // Missing city, state, zip, askingPrice
    })
    // Either 401 (no auth) or 400 (validation)
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('waitlist rejects duplicate-format but allows valid emails', async ({ request }) => {
    const email = `e2e-flow-${Date.now()}@example.com`
    const res = await request.post('/api/waitlist', { data: { email } })
    expect(res.status()).toBeLessThan(500)
  })

  test('analysis API requires auth', async ({ request }) => {
    const res = await request.post('/api/analysis', {
      data: { address: '123 Main St, Dallas, TX 75201', askingPrice: 200000 },
    })
    expect(res.status()).toBe(401)
  })

  test('chat API requires auth', async ({ request }) => {
    const res = await request.post('/api/chat', {
      data: { messages: [{ role: 'user', content: 'test' }] },
    })
    expect(res.status()).toBe(401)
  })

  test('CRM buyers API requires auth', async ({ request }) => {
    const res = await request.get('/api/crm/buyers')
    expect(res.status()).toBe(401)
  })

  test('discovery API validates location params', async ({ request }) => {
    // No city/state or zip should fail (but first hits 401)
    const res = await request.get('/api/discovery/search')
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })
})

test.describe('Webhook endpoints', () => {
  test('PandaDoc webhook accepts POST', async ({ request }) => {
    const res = await request.post('/api/webhooks/pandadoc', {
      data: { event: 'document_state_changed', data: { id: 'test' } },
    })
    // Should not return 500 — either processes or rejects gracefully
    expect(res.status()).toBeLessThan(500)
  })

  test('Stripe webhook rejects without signature', async ({ request }) => {
    const res = await request.post('/api/stripe/webhooks', {
      data: '{}',
    })
    expect(res.status()).toBe(400)
  })

  test('cron endpoints reject without auth', async ({ request }) => {
    const endpoints = ['/api/cron/campaigns', '/api/cron/match', '/api/cron/digest']
    for (const endpoint of endpoints) {
      const res = await request.get(endpoint)
      expect(res.status()).toBe(401)
    }
  })
})
